export type Role = "controller" | "qwen" | "gemma";
export type AgentRole = "qwen" | "gemma";

export interface AgentInfo {
  label: string;
  model: string;
  stance: "for" | "against";
}

export interface Turn {
  role: AgentRole;
  name: string;
  content: string;
}

export interface ArenaMessage {
  type: string;
  [key: string]: unknown;
  topic?: string;
  running?: boolean;
  history?: Turn[];
  agents?: Record<AgentRole, AgentInfo>;
  tts_backend?: string | null;
  presence?: Record<Role, number>;
  role?: AgentRole | Role;
  count?: number;
  turn?: Turn;
  model?: string;
  system?: string;
  prompt?: string;
  content?: string;
  round?: number;
  total_rounds?: number;
  message?: string;
}

export interface DebateStartPayload {
  topic: string;
  rounds: number;
  first_speaker: AgentRole;
}

export function arenaWebSocketUrl(role: Role) {
  const override = import.meta.env.VITE_ARENA_WS_URL as string | undefined;
  if (override) {
    return `${override.replace(/\/$/, "")}/${role}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/${role}`;
}

export async function startDebate(payload: DebateStartPayload) {
  const response = await fetch("/api/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Could not start the debate.");
  }
}

export async function stopDebate() {
  await fetch("/api/stop", { method: "POST" });
}

export async function askLocalOllama(model: string, system: string, prompt: string) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Ollama returned HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.message?.content?.trim() || "";
}
