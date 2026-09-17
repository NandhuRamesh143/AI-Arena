# AI Arena

AI Arena is a three-laptop debate setup for two local Ollama models and one central controller.

## Machine Layout

- Laptop 1: runs Ollama with Qwen and opens the Qwen screen.
- Laptop 2: runs the AI Arena web server, controller screen, and Chatterbox Turbo audio.
- Laptop 3: runs Ollama with Gemma and opens the Gemma screen.

The model laptops do not need inbound ports. Their browser pages call their own local Ollama at `http://localhost:11434`, then send the answer back to the central controller over WebSocket.

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd display
npm ci
npm run build
cd ..
```

## Run The Controller Laptop

```bash
source .venv/bin/activate
uvicorn controller.server:app --host 0.0.0.0 --port 8000
```

Open this on the controller laptop:

```text
http://localhost:8000/controller
```

Find the controller laptop LAN IP with `ip addr` or `hostname -I`. The other laptops should use that IP.

## Run The Qwen Laptop

Start Ollama with browser access enabled:

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Make sure the model exists:

```bash
ollama pull qwen3.5:2b
```

Open:

```text
http://CONTROLLER_LAPTOP_IP:8000/qwen
```

## Run The Gemma Laptop

Start Ollama with browser access enabled:

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Make sure the model exists:

```bash
ollama pull gemma2:2b
```

Open:

```text
http://CONTROLLER_LAPTOP_IP:8000/gemma
```

## Start A Debate

On the controller page:

1. Enter the topic.
2. Choose rounds.
3. Choose who speaks first.
4. Press Start.

The controller sends prompts to the Qwen/Gemma pages, waits for responses, speaks each response on the controller laptop, then moves to the next speaker when server-side TTS is available. If the Python TTS backend is not installed, the controller browser uses built-in speech synthesis as a fallback.

## TTS

By default the server tries Kokoro. If Kokoro is not installed, the controller page falls back to browser speech synthesis:

```bash
uvicorn controller.server:app --host 0.0.0.0 --port 8000
```

You can force a backend or turn server-side TTS off:

```bash
AI_ARENA_TTS_BACKEND=auto uvicorn controller.server:app --host 0.0.0.0 --port 8000
AI_ARENA_TTS_BACKEND=kokoro uvicorn controller.server:app --host 0.0.0.0 --port 8000
AI_ARENA_TTS_BACKEND=chatterbox uvicorn controller.server:app --host 0.0.0.0 --port 8000
AI_ARENA_TTS=0 uvicorn controller.server:app --host 0.0.0.0 --port 8000
```

Server-side Kokoro currently needs Python 3.10-3.12. On newer Python versions, use the browser fallback or force Chatterbox after installing its dependencies and model cache.

Kokoro voices can be changed with:

```bash
AI_ARENA_QWEN_VOICE=am_adam AI_ARENA_GEMMA_VOICE=af_heart uvicorn controller.server:app --host 0.0.0.0 --port 8000
```

## Model Names

Override default model names on the controller server with environment variables:

```bash
AI_ARENA_QWEN_MODEL="qwen3.5:2b" AI_ARENA_GEMMA_MODEL="gemma2:2b" uvicorn controller.server:app --host 0.0.0.0 --port 8000
```

The defaults are:

- Qwen: `qwen3.5:2b`
- Gemma: `gemma2:2b`
