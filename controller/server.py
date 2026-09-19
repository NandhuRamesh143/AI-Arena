import asyncio
import importlib
import os
import re
import ssl
from pathlib import Path
from typing import Any

# Bypass SSL verification for HuggingFace model downloads on strict/older systems
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["HF_HUB_DISABLE_SSL_VERIFICATION"] = "1"
ssl._create_default_https_context = ssl._create_unverified_context

import httpx
_original_httpx_init = httpx.Client.__init__
def _patched_httpx_init(self, *args, **kwargs):
    kwargs["verify"] = False
    _original_httpx_init(self, *args, **kwargs)
httpx.Client.__init__ = _patched_httpx_init

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


ROOT = Path(__file__).resolve().parents[1]
DISPLAY_DIST = ROOT / "display" / "dist"
TTS_BACKEND = os.getenv("AI_ARENA_TTS_BACKEND", "kokoro").lower()
TTS_ENABLED = os.getenv("AI_ARENA_TTS", "1") != "0"
TTS_VOICES = {
    "qwen": os.getenv("AI_ARENA_QWEN_VOICE", "am_adam"),
    "gemma": os.getenv("AI_ARENA_GEMMA_VOICE", "af_heart"),
}

AGENTS = {
    "qwen": {
        "label": "Qwen",
        "model": os.getenv("AI_ARENA_QWEN_MODEL", "qwen3.5:2b"),
        "stance": "for",
    },
    "gemma": {
        "label": "Gemma",
        "model": os.getenv("AI_ARENA_GEMMA_MODEL", "gemma2:2b"),
        "stance": "against",
    },
}


class DebateStart(BaseModel):
    topic: str
    rounds: int = 3
    first_speaker: str = "qwen"


class Arena:
    def __init__(self) -> None:
        self.clients: dict[str, set[WebSocket]] = {
            "controller": set(),
            "qwen": set(),
            "gemma": set(),
        }
        self.history: list[dict[str, str]] = []
        self.topic = ""
        self.running = False
        self.pending: dict[str, asyncio.Future[str]] = {}
        self.debate_task: asyncio.Task[None] | None = None
        self.tts = load_tts_backend()

    async def connect(self, role: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.clients.setdefault(role, set()).add(websocket)
        await websocket.send_json(
            {
                "type": "snapshot",
                "topic": self.topic,
                "running": self.running,
                "history": self.history,
                "agents": AGENTS,
                "tts_backend": self.tts.name if self.tts else None,
                "presence": self.presence_counts(),
            }
        )
        await self.broadcast(
            {
                "type": "presence",
                "role": role,
                "count": len(self.clients.get(role, set())),
            }
        )

    async def disconnect(self, role: str, websocket: WebSocket) -> None:
        self.clients.get(role, set()).discard(websocket)
        await self.broadcast(
            {
                "type": "presence",
                "role": role,
                "count": len(self.clients.get(role, set())),
            }
        )

    def presence_counts(self) -> dict[str, int]:
        return {role: len(sockets) for role, sockets in self.clients.items()}

    async def broadcast(self, payload: dict[str, Any]) -> None:
        for sockets in list(self.clients.values()):
            for websocket in list(sockets):
                try:
                    await websocket.send_json(payload)
                except Exception:
                    for group in self.clients.values():
                        group.discard(websocket)

    async def send_to_role(self, role: str, payload: dict[str, Any]) -> None:
        sockets = self.clients.get(role, set())
        if not sockets:
            raise RuntimeError(f"{role} page is not connected.")

        for websocket in list(sockets):
            await websocket.send_json(payload)

    async def receive_model_response(self, role: str, text: str) -> None:
        import re
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
        future = self.pending.get(role)
        if future and not future.done():
            future.set_result(text)

    async def start(self, config: DebateStart) -> None:
        if self.running:
            raise RuntimeError("A debate is already running.")

        if config.first_speaker not in AGENTS:
            raise RuntimeError("First speaker must be qwen or gemma.")

        self.topic = config.topic.strip()
        self.history = []
        self.running = True
        self.debate_task = asyncio.create_task(self._run(config))

    async def stop(self) -> None:
        if self.debate_task:
            self.debate_task.cancel()
            self.debate_task = None
        for future in self.pending.values():
            if not future.done():
                future.cancel()
        self.pending.clear()
        self.running = False
        if self.tts and self.tts.stop:
            self.tts.stop()
        await self.broadcast({"type": "stopped"})

    async def _run(self, config: DebateStart) -> None:
        try:
            await self.broadcast(
                {
                    "type": "debate_started",
                    "topic": self.topic,
                    "rounds": config.rounds,
                    "first_speaker": config.first_speaker,
                }
            )

            order = [config.first_speaker, "gemma" if config.first_speaker == "qwen" else "qwen"]

            for round_number in range(1, config.rounds + 1):
                for role in order:
                    text = await self._ask_agent(role, round_number, config.rounds)
                    turn = {
                        "role": role,
                        "name": AGENTS[role]["label"],
                        "content": text,
                    }
                    self.history.append(turn)
                    await self.broadcast({"type": "turn", "turn": turn, "history": self.history})
                    await self._speak(role, text)

            await self.broadcast({"type": "debate_finished", "history": self.history})
        except asyncio.CancelledError:
            raise
        except Exception as error:
            await self.broadcast({"type": "error", "message": str(error)})
        finally:
            self.pending.clear()
            self.running = False

    async def _ask_agent(self, role: str, round_number: int, total_rounds: int) -> str:
        if role in self.pending and not self.pending[role].done():
            raise RuntimeError(f"{role} already has a pending prompt.")

        prompt = make_prompt(role, self.topic, self.history, round_number)
        future: asyncio.Future[str] = asyncio.get_running_loop().create_future()
        self.pending[role] = future

        await self.broadcast(
            {
                "type": "agent_thinking",
                "role": role,
                "round": round_number,
                "total_rounds": total_rounds,
            }
        )
        await self.send_to_role(
            role,
            {
                "type": "prompt",
                "role": role,
                "model": AGENTS[role]["model"],
                "system": system_prompt(role, self.topic),
                "prompt": prompt,
                "round": round_number,
            },
        )

        try:
            return await asyncio.wait_for(future, timeout=int(os.getenv("AI_ARENA_MODEL_TIMEOUT", "240")))
        finally:
            self.pending.pop(role, None)

    async def _speak(self, role: str, text: str) -> None:
        if not self.tts:
            return

        try:
            await self.broadcast(
                {
                    "type": "tts_speaking",
                    "role": role,
                    "backend": self.tts.name,
                }
            )
            await asyncio.to_thread(self.tts.load)
            for chunk in speech_chunks(text, keep_tags=False):
                self.tts.queue(chunk, TTS_VOICES.get(role))
            await asyncio.to_thread(self.tts.wait)
            await self.broadcast({"type": "tts_finished", "role": role, "backend": self.tts.name})
        except Exception as error:
            await self.broadcast(
                {
                    "type": "tts_error",
                    "role": role,
                    "content": text,
                    "message": f"TTS skipped: {error}",
                }
            )


def debate_history(history: list[dict[str, str]]) -> str:
    return "\n\n".join(f"{turn['name']}: {turn['content']}" for turn in history)


def parse_topic_stance(role: str, topic: str) -> str:
    topic_lower = topic.lower()
    if " vs " in topic_lower:
        parts = re.split(r"(?i)\s+vs\s+", topic)
        if len(parts) >= 2:
            side_a, side_b = parts[0].strip(), parts[1].strip()
            if role == "qwen":
                return f"for '{side_a}' and fiercely against '{side_b}'"
            else:
                return f"for '{side_b}' and fiercely against '{side_a}'"
    return f"{AGENTS[role]['stance']} the topic"


def make_prompt(role: str, topic: str, history: list[dict[str, str]], round_number: int) -> str:
    stance = parse_topic_stance(role, topic)
    transcript = debate_history(history) or "No arguments yet."

    if round_number == 1 and not history:
        task = f"Give your opening argument {stance}."
    else:
        opponent = "Gemma" if role == "qwen" else "Qwen"
        task = f"Respond directly to {opponent}'s latest argument while arguing {stance}."

    return (
        f"Debate topic: {topic}\n\n"
        f"Debate so far:\n{transcript}\n\n"
        f"What you need to do: {task}\n"
        "CRITICAL: Keep your response to EXACTLY 1 sentence. Do not repeat earlier points."
    )


def system_prompt(role: str, topic: str) -> str:
    label = AGENTS[role]["label"]
    stance = parse_topic_stance(role, topic)
    opponent = "Gemma" if role == "qwen" else "Qwen"
    
    prompt = (
        f"You are {label} in a public AI debate. Argue {stance}.\n"
        f"Directly challenge {opponent}'s claims, but STAY STRICTLY FOCUSED ON THE TOPIC: '{topic}'.\n"
        "Do not deviate or go off on tangents. Relate every point back to the core debate topic.\n"
        "Be highly entertaining, spirited, and theatrically overconfident.\n"
        f"Playfully roast {opponent} with absurd comparisons and escalating sarcasm.\n"
        "A little bit of edgy language is fine.\n"
        "Argue on facts, but keep arguments short and punchy.\n"
    )
    
    prompt += "ABSOLUTELY NO EMOJIS, UNICODE SYMBOLS, OR ASTERISKS. DO NOT USE EMOJIS.\n"
        
    prompt += (
        "Keep your response to exactly 1 short sentence.\n"
        "Do not act like a helpful assistant.\n"
        "Winning matters less than making the audience laugh, gasp, or shout."
    )
    
    return prompt


def speech_chunks(text: str, keep_tags: bool = False) -> list[str]:
    if not keep_tags:
        sanitized = re.sub(r"\[[^\]]+\]", "", text)
    else:
        sanitized = text
    sanitized = sanitized.replace("*", "")
    parts = re.split(r"(?<=[.!?])\s+", sanitized)
    return [part.strip() for part in parts if part.strip()]


class TTSBackend:
    def __init__(self, name: str, module: Any) -> None:
        self.name = name
        self.load = module.load_tts
        self.queue = module.queue_text
        self.wait = module.wait_for_speech
        self.stop = getattr(module, "stop_tts", None)


def import_tts_module(module_name: str) -> Any:
    if __package__:
        return importlib.import_module(f".{module_name}", package=__package__)

    return importlib.import_module(module_name)


def load_named_tts_backend(backend_name: str) -> TTSBackend | None:
    backend_modules = {
        "kokoro": "tts",
    }
    module_name = backend_modules.get(backend_name)
    if not module_name:
        print(f"Unknown TTS backend '{backend_name}'. Use kokoro or off.")
        return None

    try:
        module = import_tts_module(module_name)
        print(f"TTS backend selected: {backend_name}")
        return TTSBackend(backend_name, module)
    except Exception as error:  # pragma: no cover - dependency availability varies by laptop
        print(f"TTS backend '{backend_name}' unavailable: {error}")
        return None


def load_tts_backend() -> TTSBackend | None:
    if not TTS_ENABLED or TTS_BACKEND == "off":
        print("TTS disabled by AI_ARENA_TTS.")
        return None

    preferred = ["kokoro"] if TTS_BACKEND == "auto" else [TTS_BACKEND]

    for backend_name in preferred:
        backend = load_named_tts_backend(backend_name)
        if backend:
            return backend

    print("TTS disabled: no backend could be loaded.")
    return None


arena = Arena()
app = FastAPI(title="AI Arena Controller")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/start")
async def start_debate(config: DebateStart) -> dict[str, str]:
    await arena.start(config)
    return {"status": "started"}


@app.post("/api/stop")
async def stop_debate() -> dict[str, str]:
    await arena.stop()
    return {"status": "stopped"}


@app.websocket("/ws/{role}")
async def websocket_endpoint(websocket: WebSocket, role: str) -> None:
    if role not in arena.clients:
        await websocket.close(code=1008)
        return

    await arena.connect(role, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "model_response":
                await arena.receive_model_response(role, str(message.get("content", "")))
            elif message.get("type") == "model_error":
                await arena.broadcast(
                    {
                        "type": "error",
                        "message": f"{AGENTS[role]['label']}: {message.get('message', 'model error')}",
                    }
                )
                await arena.receive_model_response(role, "I could not generate a response.")
    except WebSocketDisconnect:
        await arena.disconnect(role, websocket)


if DISPLAY_DIST.exists():
    app.mount("/assets", StaticFiles(directory=DISPLAY_DIST / "assets"), name="assets")


@app.get("/{path:path}")
async def serve_display(path: str) -> FileResponse:
    requested_file = DISPLAY_DIST / path
    if requested_file.exists() and requested_file.is_file():
        return FileResponse(requested_file)

    index_file = DISPLAY_DIST / "index.html"
    if not index_file.exists():
        raise RuntimeError("Build the display app first with: cd display && npm run build")
    return FileResponse(index_file)
