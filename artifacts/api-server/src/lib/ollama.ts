export const OLLAMA_DEFAULT_MODEL_EXTRACTION = "qwen2:7b";
export const OLLAMA_DEFAULT_MODEL_PARECER = "deepseek-r1:7b";

export function getOllamaBaseUrl(): string | null {
  return process.env.OLLAMA_BASE_URL ?? null;
}

export function isOllamaConfigured(): boolean {
  return !!process.env.OLLAMA_BASE_URL;
}

export function getOllamaModelParecer(): string {
  return process.env.OLLAMA_MODEL_PARECER ?? OLLAMA_DEFAULT_MODEL_PARECER;
}

export function getOllamaModelExtraction(): string {
  return process.env.OLLAMA_MODEL_EXTRACAO ?? OLLAMA_DEFAULT_MODEL_EXTRACTION;
}

export async function* streamOllama(
  prompt: string,
  model: string,
  baseUrl: string
): AsyncGenerator<string> {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Ollama retornou ${response.status}: ${body}`);
  }

  if (!response.body) throw new Error("Ollama: resposta sem body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (typeof data.response === "string" && data.response) {
          yield data.response;
        }
        if (data.done) return;
      } catch {
      }
    }
  }

  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer);
      if (typeof data.response === "string" && data.response) {
        yield data.response;
      }
    } catch {
    }
  }
}

export async function pingOllama(baseUrl: string): Promise<boolean> {
  try {
    const resp = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const resp = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { models?: Array<{ name: string }> };
    return data.models?.map((m) => m.name) ?? [];
  } catch {
    return [];
  }
}
