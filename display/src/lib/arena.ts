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

export async function askLocalOllama(
  model: string, 
  system: string, 
  prompt: string,
  onChunk?: (text: string) => void
) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      options: {
        num_predict: 150,
        repeat_penalty: 1.2,
        temperature: 0.8
      },
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

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  let fullContent = "";
  let buffer = "";
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          fullContent += data.message.content;
          
          let displayContent = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, "");
          displayContent = displayContent.replace(/<think>[\s\S]*?$/gi, ""); // Hide incomplete block
          
          if (onChunk) onChunk(displayContent.trim());
        }
      } catch (e) {
        console.error("Error parsing Ollama chunk", e);
      }
    }
  }

  return fullContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
