import { logger } from "./logger";

export const OLLAMA_DEFAULT_MODEL_EXTRACTION = "qwen2:7b";
export const OLLAMA_DEFAULT_MODEL_PARECER = "deepseek-r1:32b";
export const OLLAMA_DEFAULT_MODEL_EMBEDDING = "nomic-embed-text";

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

/**
 * Checks /api/ps to see which models are currently loaded in Ollama memory.
 * This endpoint responds instantly (no timeout risk).
 */
async function getLoadedModels(baseUrl: string): Promise<string[]> {
  try {
    const resp = await fetch(`${baseUrl}/api/ps`, { signal: AbortSignal.timeout(8_000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { models?: Array<{ name: string; model: string }> };
    return (data.models ?? []).map((m) => m.name ?? m.model).filter(Boolean);
  } catch {
    return [];
  }
}

function modelNamesMatch(loaded: string, requested: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/:latest$/, "").trim();
  return norm(loaded) === norm(requested) || loaded.startsWith(requested) || requested.startsWith(loaded);
}

/**
 * Ensures a model is loaded in Ollama memory before we attempt streaming.
 *
 * Strategy when the model is cold:
 *  1. Fire a "num_predict: 0" load request — Cloudflare will kill it after ~100 s,
 *     but Ollama CONTINUES loading the model in the background.
 *  2. Poll /api/ps every 5 s until the model appears (or we time out after 8 min).
 *  3. Send SSE heartbeat messages via `onStatus` so the browser connection stays alive.
 *
 * When the model is already warm this resolves in <1 s.
 */
export async function ensureModelLoaded(
  baseUrl: string,
  model: string,
  onStatus?: (msg: string) => void
): Promise<void> {
  const loaded = await getLoadedModels(baseUrl);
  if (loaded.some((n) => modelNamesMatch(n, model))) {
    logger.info({ model }, "Modelo já está na memória");
    onStatus?.(`Modelo na memória ✓`);
    return;
  }

  logger.info({ model }, "Modelo frio — iniciando carregamento via trigger");
  onStatus?.(`Modelo em espera (dormindo) — iniciando carregamento...`);

  // Fire-and-forget load trigger. Cloudflare kills it after 100 s but
  // Ollama continues loading in the background. We do NOT await this.
  const triggerLoad = () => {
    fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: ".", stream: false, keep_alive: "30m", num_predict: 0 }),
      signal: AbortSignal.timeout(110_000),
    }).catch(() => { /* expected 524/timeout — Ollama continues in background */ });
  };
  triggerLoad();

  // Poll /api/ps every 5 s until model appears (max 15 minutes for large models like 32b)
  const deadline = Date.now() + 15 * 60_000;
  let dots = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5_000));
    dots++;

    const running = await getLoadedModels(baseUrl);
    if (running.some((n) => modelNamesMatch(n, model))) {
      logger.info({ model, waitSec: dots * 5 }, "Modelo carregado na memória");
      onStatus?.(`Modelo ${model} pronto!`);
      return;
    }

    const elapsed = Math.round(dots * 5);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m${secs}s` : `${secs}s`;
    onStatus?.(`Aguardando modelo carregar... ${timeStr}`);
    logger.debug({ model, elapsed }, "Modelo ainda carregando");

    // Re-trigger every 90 s in case the previous load was aborted by Cloudflare
    if (dots % 18 === 0) triggerLoad();
  }

  throw new Error(
    `Modelo ${model} não carregou após 15 minutos. Verifique se o Ollama está rodando no Mini PC e o túnel Cloudflare está ativo.`
  );
}

export async function* streamOllama(
  prompt: string,
  model: string,
  baseUrl: string,
  bridgeUrl?: string | null
): AsyncGenerator<string> {
  // Route through DB Bridge proxy when available.
  // The bridge calls Ollama on localhost and sends heartbeat "\n" bytes every 8s,
  // preventing Cloudflare from returning 524 during deepseek-r1's silent thinking phase.
  // Falls back to direct Ollama URL if the proxy endpoint is not yet installed (404).
  const useBridge = !!bridgeUrl;
  const url = useBridge
    ? `${bridgeUrl}/ollama-proxy/stream`
    : `${baseUrl}/api/generate`;

  // num_ctx: 16384 ensures the full prompt (system instructions + data + RAG) is never
  // silently truncated by the model. deepseek-r1 default is 4096 which cuts long prompts.
  const ollamaPayload = { model, prompt, stream: true, keep_alive: "30m", num_ctx: 16384 };

  let response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ollamaPayload),
  });

  // If bridge proxy not yet installed, fall back to direct Ollama URL
  if (useBridge && response.status === 404) {
    logger.warn("Bridge proxy /ollama-proxy/stream não encontrado — usando Ollama direto");
    response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ollamaPayload),
    });
  }

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
    const resp = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(15_000) });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Pre-loads Ollama models into GPU/RAM at server startup.
 * Uses ensureModelLoaded so it handles the Cloudflare 100 s timeout gracefully.
 */
export async function warmupOllama(baseUrl: string): Promise<void> {
  const models = [
    process.env.OLLAMA_MODEL_PARECER ?? OLLAMA_DEFAULT_MODEL_PARECER,
    process.env.OLLAMA_MODEL_EXTRACAO ?? OLLAMA_DEFAULT_MODEL_EXTRACTION,
    process.env.OLLAMA_MODEL_EMBEDDING ?? OLLAMA_DEFAULT_MODEL_EMBEDDING,
  ];

  for (const model of models) {
    try {
      await ensureModelLoaded(baseUrl, model);
    } catch (err) {
      logger.warn({ err, model }, "Warm-up: modelo não carregou — servidor continua no ar");
    }
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
