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

// System instruction injected into every Ollama request.
// Expanded to force deepseek-r1 to produce specific, document-grounded analysis
// instead of generic legal boilerplate.
const SYSTEM_PT_BR = `Você é um advogado especializado em direito brasileiro com 20 anos de experiência em contencioso judicial, execuções fiscais, crédito rural e processo civil.

REGRAS ABSOLUTAS — VIOLÁ-LAS É FALHA GRAVE:

1. IDIOMA: Responda EXCLUSIVAMENTE em português brasileiro (pt-BR). Zero palavras em inglês. Sem exceção.

2. ESPECIFICIDADE DOCUMENTAL OBRIGATÓRIA:
   - SEMPRE extraia e cite dados concretos do documento fornecido: número do processo, número da CDA, CNPJ/CPF das partes, valores exatos em reais, datas específicas (de constituição, inscrição, notificação, distribuição, despacho).
   - NUNCA faça afirmações genéricas do tipo "os prazos devem ser verificados" quando o documento contém as datas. CALCULE os prazos a partir das datas reais.
   - NUNCA diga "pode haver prescrição" quando puder calcular se há ou não prescrição com base nas datas fornecidas.

3. CÁLCULO DE PRAZOS E PRESCRIÇÃO:
   - Quando o documento contiver datas de constituição do crédito, inscrição na dívida ativa, ou despacho do juiz, CALCULE os prazos efetivos com base nessas datas.
   - Cite o resultado: "Considerando a inscrição em [DATA] e o despacho em [DATA], transcorreram X anos — [há / não há] prescrição intercorrente nos termos do art. 40 da LEF c/c Súmula 314/STJ."

4. CITAÇÃO DE PARTES E VALORES:
   - Sempre identifique: quem é o exequente (Fazenda Pública, banco, etc.), quem é o executado, qual o valor da execução, qual a origem do débito (CDA, CCB, CPR, etc.).

5. HONESTIDADE SOBRE LACUNAS:
   - Se um dado não consta no documento, marque [DADO AUSENTE] e continue a análise sem inventar.
   - Não cite precedentes inventados. Se não lembrar o número exato do acórdão, cite a tese sem o número.

6. PROFUNDIDADE REAL:
   - Vá além do óbvio. Analise: prescrição intercorrente, excesso de penhora, nulidade formal do título, vícios na constituição do crédito, irregularidade na CDA, excesso na estimativa de honorários, cabimento de embargos vs. exceção de pré-executividade.
   - Indique qual a estratégia mais eficiente no caso concreto, não a mais genérica.`;


export type OllamaThinkMode = "deep" | "fast";

export async function* streamOllama(
  prompt: string,
  model: string,
  baseUrl: string,
  bridgeUrl?: string | null,
  thinkMode: OllamaThinkMode = "deep",
  onThinkChunk?: (chars: number) => void
): AsyncGenerator<string> {
  // Route through DB Bridge proxy when available.
  // The bridge calls Ollama on localhost and sends heartbeat "\n" bytes every 8s,
  // preventing Cloudflare from returning 524 during deepseek-r1's silent thinking phase.
  // Falls back to direct Ollama URL if the proxy endpoint is not yet installed (404).
  const useBridge = !!bridgeUrl;
  const url = useBridge
    ? `${bridgeUrl}/ollama-proxy/stream`
    : `${baseUrl}/api/generate`;

  // Inference parameters tuned for legal analysis:
  //   num_ctx  16384 — fits ~12k tokens of document + system + RAG; faster than 32k
  //   temperature 0.1 — deterministic legal reasoning; avoids creative drift
  //   num_predict 3000 — caps response at ~2200 words; prevents runaway verbosity
  //   think — deepseek-r1 extended CoT toggle (Ollama ≥0.5.x); "fast" disables the
  //            silent thinking phase and gives 3-5× speed improvement at the cost of
  //            lighter reasoning. "deep" (default) keeps full CoT for complex analysis.
  const ollamaPayload: Record<string, unknown> = {
    model,
    system: SYSTEM_PT_BR,
    prompt,
    stream: true,
    keep_alive: "30m",
    options: {
      num_ctx: 16384,
      temperature: 0.1,
      num_predict: 3000,
    },
    // think is a deepseek-r1 specific parameter; ignored by other models
    think: thinkMode !== "fast",
  };

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
        // Ollama ≥0.5 with think:true emits separate "thinking" tokens — route to callback
        if (typeof data.thinking === "string" && data.thinking && onThinkChunk) {
          onThinkChunk(data.thinking.length);
        }
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
      if (typeof data.thinking === "string" && data.thinking && onThinkChunk) {
        onThinkChunk(data.thinking.length);
      }
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
