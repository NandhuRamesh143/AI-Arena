import { useEffect, useMemo, useRef, useState } from "react";
import MessageBox from "../components/MessageBox";
import { useWebSocketConnection } from "../hooks/useWebSocket";
import {
  arenaWebSocketUrl,
  askLocalOllama,
  startDebate,
  stopDebate,
} from "../lib/arena";
import type { AgentRole, ArenaMessage, Role, Turn } from "../lib/arena";
import WebThreads from "../components/WebThreads";

interface DebatePageProps {
  role: Role;
}

const roleNames: Record<Role, string> = {
  controller: "Controller",
  qwen: "Qwen",
  gemma: "Gemma",
};

const modelThemes: Record<AgentRole, string> = {
  qwen: "from-[#111111] to-[#332407] border-[#ffdb86]/40",
  gemma: "from-[#f7f7f7] to-[#d9c48b] border-white/80",
};

export default function DebatePage({ role }: DebatePageProps) {
  const ws = useWebSocketConnection(arenaWebSocketUrl(role));
  const messages = ws.messages as ArenaMessage[];
  const snapshot = [...messages].reverse().find((message) => message.type === "snapshot");
  const turns = useMemo(() => collectTurns(messages, snapshot?.history), [messages, snapshot]);
  const status = useMemo(() => arenaStatus(messages, ws.connectionStatus), [messages, ws.connectionStatus]);
  const agents = snapshot?.agents;

  if (role === "controller") {
    return (
      <ControllerDesk
        messages={messages}
        turns={turns}
        status={status}
        connected={ws.isConnected}
      />
    );
  }

  if (role === "gemma") {
    return (
      <GemmaScreen
        role={role}
        messages={messages}
        turns={turns}
        status={status}
        connected={ws.isConnected}
        sendMessage={ws.sendMessage}
        modelName={agents?.[role]?.model}
      />
    );
  }

  return (
    <ModelScreen
      role={role}
      messages={messages}
      turns={turns}
      status={status}
      connected={ws.isConnected}
      sendMessage={ws.sendMessage}
      modelName={agents?.[role]?.model}
    />
  );
}

function ControllerDesk({
  messages,
  turns,
  status,
  connected,
}: {
  messages: ArenaMessage[];
  turns: Turn[];
  status: string;
  connected: boolean;
}) {
  const [topic, setTopic] = useState("");
  const [rounds, setRounds] = useState(3);
  const [firstSpeaker, setFirstSpeaker] = useState<AgentRole>("qwen");
  const [error, setError] = useState("");
  const presence = useMemo(() => collectPresence(messages), [messages]);
  const running = isDebateRunning(messages);
  const serverTtsBackend = [...messages].reverse().find((message) => message.type === "snapshot")?.tts_backend;
  useControllerSpeech(turns, messages, Boolean(serverTtsBackend));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      await startDebate({
        topic: topic.trim(),
        rounds,
        first_speaker: firstSpeaker,
      });
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start the debate.");
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[380px_1fr]">
        <aside className="border border-white/10 bg-black/70 p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#ffdb86]">AI Arena</p>
              <h1 className="mt-2 text-3xl font-bold">Controller</h1>
            </div>
            <ConnectionPill connected={connected} />
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="text-sm text-white/70">Topic</span>
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                required
                rows={5}
                className="mt-2 w-full resize-none border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#ffdb86]"
                placeholder="Should AI replace traditional exams?"
              />
            </label>

            <label className="block">
              <span className="text-sm text-white/70">Rounds</span>
              <input
                type="number"
                min={1}
                max={10}
                value={rounds}
                onChange={(event) => setRounds(Number(event.target.value))}
                className="mt-2 w-full border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#ffdb86]"
              />
            </label>

            <div>
              <span className="text-sm text-white/70">First speaker</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["qwen", "gemma"] as AgentRole[]).map((agent) => (
                  <button
                    key={agent}
                    type="button"
                    onClick={() => setFirstSpeaker(agent)}
                    className={`border px-4 py-3 font-semibold ${
                      firstSpeaker === agent
                        ? "border-[#ffdb86] bg-[#ffdb86] text-black"
                        : "border-white/15 bg-white/10 text-white"
                    }`}
                  >
                    {roleNames[agent]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={!connected || running}
                className="bg-[#ffdb86] px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start
              </button>
              <button
                type="button"
                onClick={() => stopDebate()}
                className="border border-white/15 px-4 py-3 font-bold text-white"
              >
                Stop
              </button>
            </div>
          </form>

          {error && <p className="mt-4 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

          <div className="mt-8 space-y-3">
            <h2 className="text-sm uppercase tracking-[0.25em] text-white/50">Screens</h2>
            {(["controller", "qwen", "gemma"] as Role[]).map((screen) => (
              <div key={screen} className="flex items-center justify-between border border-white/10 px-3 py-2">
                <span>{roleNames[screen]}</span>
                <span className="text-sm text-white/60">{presence[screen] || 0} online</span>
              </div>
            ))}
          </div>
        </aside>

        <ArenaTranscript status={status} turns={turns} activeRole={activeRole(messages)} />
      </section>
    </main>
  );
}

function ModelScreen({
  role,
  messages,
  turns,
  status,
  connected,
  sendMessage,
  modelName,
}: {
  role: AgentRole;
  messages: ArenaMessage[];
  turns: Turn[];
  status: string;
  connected: boolean;
  sendMessage: (message: ArenaMessage) => void;
  modelName?: string;
}) {
  const [localStatus, setLocalStatus] = useState("Waiting for a prompt");
  const handledPrompt = useRef("");
  const latestPrompt = [...messages].reverse().find(
    (message) => message.type === "prompt" && message.role === role
  );

  useEffect(() => {
    if (!latestPrompt?.prompt || !latestPrompt.system || !latestPrompt.model) {
      return;
    }

    const promptKey = `${latestPrompt.round}:${latestPrompt.prompt}`;
    if (handledPrompt.current === promptKey) {
      return;
    }

    handledPrompt.current = promptKey;
    setLocalStatus(`Generating with ${latestPrompt.model}`);

    askLocalOllama(latestPrompt.model, latestPrompt.system, latestPrompt.prompt)
      .then((content) => {
        sendMessage({ type: "model_response", content });
        setLocalStatus("Response sent to controller");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not reach local Ollama.";
        sendMessage({ type: "model_error", message });
        setLocalStatus(message);
      });
  }, [latestPrompt, role, sendMessage]);

  return (
    <main className={`min-h-screen bg-gradient-to-br ${modelThemes[role]} text-white`}>
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="mb-5 flex items-center justify-between border-b border-white/15 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#ffdb86]">Arena Node</p>
            <h1 className={`mt-2 text-5xl font-black ${role === "gemma" ? "text-black" : "text-white"}`}>
              {roleNames[role]}
            </h1>
            <p className={role === "gemma" ? "text-black/70" : "text-white/70"}>
              {modelName || "Model"} on this laptop
            </p>
          </div>
          <ConnectionPill connected={connected} />
        </header>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <StatusPanel title="Arena" value={status} dark={role === "gemma"} />
          <StatusPanel title="Local Ollama" value={localStatus} dark={role === "gemma"} />
        </div>

        <ArenaTranscript status={status} turns={turns} activeRole={activeRole(messages)} focusRole={role} />
      </section>
    </main>
  );
}

function GemmaScreen({
  role,
  messages,
  turns,
  status,
  connected,
  sendMessage,
  modelName,
}: {
  role: AgentRole;
  messages: ArenaMessage[];
  turns: Turn[];
  status: string;
  connected: boolean;
  sendMessage: (message: ArenaMessage) => void;
  modelName?: string;
}) {
  const [localStatus, setLocalStatus] = useState("Waiting for a prompt");
  const handledPrompt = useRef("");
  const latestPrompt = [...messages].reverse().find(
    (message) => message.type === "prompt" && message.role === role
  );

  useEffect(() => {
    if (!latestPrompt?.prompt || !latestPrompt.system || !latestPrompt.model) {
      return;
    }

    const promptKey = `${latestPrompt.round}:${latestPrompt.prompt}`;
    if (handledPrompt.current === promptKey) {
      return;
    }

    handledPrompt.current = promptKey;
    setLocalStatus(`Generating with ${latestPrompt.model}`);

    askLocalOllama(latestPrompt.model, latestPrompt.system, latestPrompt.prompt)
      .then((content) => {
        sendMessage({ type: "model_response", content });
        setLocalStatus("Response sent to controller");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not reach local Ollama.";
        sendMessage({ type: "model_error", message });
        setLocalStatus(message);
      });
  }, [latestPrompt, role, sendMessage]);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <WebThreads
          color1="#FFFFFF"
          color2="#B78000"
          color3="#121212"
          speed={0.2}
          threadCount={6}
          frequency={5.0}
          spread={0.18}
          taper={1.0}
          position={0.5}
          fanMode="center"
          glow={0.02}
          falloff={0.6}
          thickness={1.1}
          brightness={0.6}
          opacity={1.0}
          mirror={true}
          shimmer={false}
          grain={true}
        />
      </div>
      <div className="absolute inset-0 bg-black/50 pointer-events-none z-10" />

      <section className="relative z-20 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="mb-5 flex items-center justify-between border-b border-white/20 pb-5 bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-white/10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#ffdb86]">Arena Node</p>
            <h1 className="mt-2 text-5xl font-black text-white tracking-widest drop-shadow-md">
              {roleNames[role]}
            </h1>
            <p className="text-white/70">
              {modelName || "Model"} on this laptop
            </p>
          </div>
          <ConnectionPill connected={connected} />
        </header>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <StatusPanel title="Arena" value={status} dark={false} />
          <StatusPanel title="Local Ollama" value={localStatus} dark={false} />
        </div>

        <div className="backdrop-blur-md bg-black/60 p-4 border border-white/10 rounded-xl">
          <ArenaTranscript status={status} turns={turns} activeRole={activeRole(messages)} focusRole={role} />
        </div>
      </section>
    </main>
  );
}

function ArenaTranscript({
  status,
  turns,
  activeRole,
  focusRole,
}: {
  status: string;
  turns: Turn[];
  activeRole?: string;
  focusRole?: AgentRole;
}) {
  return (
    <section className="flex min-h-[500px] flex-col border border-white/10 bg-black/65">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">Live transcript</p>
          <h2 className="text-xl font-semibold text-white">{status}</h2>
        </div>
        {activeRole && <span className="bg-[#ffdb86] px-3 py-1 text-sm font-bold text-black">{roleNames[activeRole as Role]} active</span>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {turns.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center text-center text-white/50">
            Waiting for the controller to start the debate.
          </div>
        ) : (
          turns.map((turn, index) => (
            <MessageBox
              key={`${turn.role}-${index}`}
              name={turn.name}
              message={turn.content}
              isSelf={focusRole ? turn.role === focusRole : turn.role === "qwen"}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span className={`px-3 py-1 text-sm font-bold ${connected ? "bg-green-500 text-black" : "bg-red-500 text-white"}`}>
      {connected ? "Connected" : "Offline"}
    </span>
  );
}

function StatusPanel({ title, value, dark = false }: { title: string; value: string; dark?: boolean }) {
  return (
    <div className={`border p-4 ${dark ? "border-black/20 bg-black/10 text-black" : "border-white/10 bg-black/50 text-white"}`}>
      <p className="text-xs uppercase tracking-[0.25em] opacity-60">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function useControllerSpeech(turns: Turn[], messages: ArenaMessage[], hasServerTts: boolean) {
  const spokenTurns = useRef(0);
  const initialized = useRef(false);
  const spokenErrors = useRef(new Set<string>());

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    if (!initialized.current) {
      spokenTurns.current = turns.length;
      initialized.current = true;
      return;
    }

    if (hasServerTts) {
      return;
    }

    const newTurns = turns.slice(spokenTurns.current);
    spokenTurns.current = turns.length;

    for (const turn of newTurns) {
      speakTurn(turn);
    }
  }, [turns, hasServerTts]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const latest = [...messages].reverse()[0];
    if (latest && latest.type === "stopped") {
      window.speechSynthesis.cancel();
    }

    const ttsErrors = messages.filter((message) => message.type === "tts_error" && typeof message.content === "string");
    for (const message of ttsErrors) {
      const key = `${message.role}:${message.content}`;
      if (!spokenErrors.current.has(key)) {
        spokenErrors.current.add(key);
        speakTurn({
          role: message.role === "gemma" ? "gemma" : "qwen",
          name: roleNames[message.role as Role] || "Speaker",
          content: message.content || "",
        });
      }
    }
  }, [messages]);
}

function speakTurn(turn: Turn) {
  const utterance = new SpeechSynthesisUtterance(`${turn.name}. ${turn.content}`);
  utterance.rate = 1;
  utterance.pitch = turn.role === "gemma" ? 1.08 : 0.92;
  window.speechSynthesis.speak(utterance);
}

function collectTurns(messages: ArenaMessage[], snapshotHistory?: Turn[]) {
  const byMessage = messages
    .filter((message) => message.type === "turn" && message.turn)
    .map((message) => message.turn as Turn);

  if (byMessage.length > 0) {
    return byMessage;
  }

  return snapshotHistory || [];
}

function collectPresence(messages: ArenaMessage[]) {
  const snapshot = [...messages].reverse().find((message) => message.type === "snapshot");

  return messages.reduce<Record<Role, number>>(
    (presence, message) => {
      if (message.type === "presence" && typeof message.role === "string" && typeof message.count === "number") {
        presence[message.role as Role] = message.count;
      }
      return presence;
    },
    {
      controller: snapshot?.presence?.controller || 0,
      qwen: snapshot?.presence?.qwen || 0,
      gemma: snapshot?.presence?.gemma || 0,
    }
  );
}

function activeRole(messages: ArenaMessage[]) {
  const latest = [...messages].reverse().find((message) =>
    ["agent_thinking", "tts_speaking", "turn", "tts_finished", "debate_finished", "stopped", "error"].includes(message.type)
  );

  return ["agent_thinking", "tts_speaking"].includes(latest?.type || "") ? latest?.role : undefined;
}

function arenaStatus(messages: ArenaMessage[], connectionStatus: string) {
  const latest = [...messages].reverse().find((message) =>
    ["debate_started", "agent_thinking", "tts_speaking", "tts_finished", "tts_error", "debate_finished", "stopped", "error"].includes(message.type)
  );

  if (!latest) {
    return `WebSocket ${connectionStatus}`;
  }

  if (latest.type === "debate_started") return "Debate started";
  if (latest.type === "agent_thinking" && latest.role) return `${roleNames[latest.role as Role]} is generating`;
  if (latest.type === "tts_speaking" && latest.role) return `${roleNames[latest.role as Role]} is speaking`;
  if (latest.type === "tts_finished") return "Speech finished";
  if (latest.type === "tts_error") return latest.message || "TTS skipped";
  if (latest.type === "debate_finished") return "Debate finished";
  if (latest.type === "stopped") return "Debate stopped";
  if (latest.type === "error") return latest.message || "Arena error";

  return connectionStatus;
}

function isDebateRunning(messages: ArenaMessage[]) {
  const latest = [...messages].reverse().find((message) =>
    ["debate_started", "debate_finished", "stopped", "error"].includes(message.type)
  );

  return latest?.type === "debate_started";
}
