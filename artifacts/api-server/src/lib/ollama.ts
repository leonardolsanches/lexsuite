import { logger } from "./logger";

export const OLLAMA_DEFAULT_MODEL_EXTRACTION = "qwen2:7b";
export const OLLAMA_DEFAULT_MODEL_PARECER = "deepseek-r1:7b";
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
    return;
  }

  logger.info({ model }, "Modelo frio — iniciando carregamento via trigger");
  onStatus?.(`Carregando modelo ${model} na memória (aguarde até 5 minutos)...`);

  // Fire-and-forget load trigger. Cloudflare will kill it after 100 s but
  // Ollama keeps working. We do NOT await this.
  fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: ".", stream: false, keep_alive: "30m", num_predict: 0 }),
    signal: AbortSignal.timeout(110_000),
  }).catch(() => { /* expected 524/timeout — Ollama continues in background */ });

  // Poll /api/ps until model appears (max 8 minutes)
  const deadline = Date.now() + 8 * 60_000;
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
    const msg = `Aguardando modelo carregar... ${elapsed}s`;
    onStatus?.(msg);
    logger.debug({ model, elapsed }, "Modelo ainda carregando");

    // Re-trigger every ~90 s in case the previous load was aborted
    if (dots % 18 === 0) {
      fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: ".", stream: false, keep_alive: "30m", num_predict: 0 }),
        signal: AbortSignal.timeout(110_000),
      }).catch(() => {});
    }
  }

  throw new Error(
    `Modelo ${model} não carregou após 8 minutos. Verifique se o Ollama está rodando no Mini PC e o túnel Cloudflare está ativo.`
  );
}

export async function* streamOllama(
  prompt: string,
  model: string,
  baseUrl: string
): AsyncGenerator<string> {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true, keep_alive: "30m" }),
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
