import {
  ensureModelLoaded,
  getOllamaBaseUrl,
  getOllamaModelParecer,
  isOllamaConfigured,
  streamOllama,
  type OllamaThinkMode,
} from "./ollama";
import {
  isAnthropicConfigured,
  streamAnthropic,
} from "./anthropic";
import { getDbBridgeUrl } from "./bridge";
import { logger } from "./logger";

export type LlmProvider = "anthropic" | "ollama";
export type { OllamaThinkMode };

/** Ollama is primary; Anthropic is the silent fallback. */
export function getActiveProvider(): LlmProvider | null {
  if (isOllamaConfigured()) return "ollama";
  if (isAnthropicConfigured()) return "anthropic";
  return null;
}

/** True if Anthropic is available to use as a fallback when Ollama is down. */
export function isAnthropicFallbackAvailable(): boolean {
  return isOllamaConfigured() && isAnthropicConfigured();
}

export function isAnyLlmConfigured(): boolean {
  return getActiveProvider() !== null;
}

export function getLlmStatusMessage(): string {
  if (!isAnyLlmConfigured()) {
    return "Nenhum motor de IA configurado. Adicione ANTHROPIC_API_KEY (Claude) ou OLLAMA_BASE_URL (local).";
  }
  return "";
}

function buildDateContext(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const year = now.toLocaleDateString("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" });
  return (
    `[CONTEXTO TEMPORAL — USE PARA TODOS OS CÁLCULOS DE PRAZO]\n` +
    `Data de hoje: ${dateStr} (fuso horário: Brasília/BRT).\n` +
    `Ano corrente: ${year}.\n` +
    `Use esta data como referência para calcular prescrição intercorrente (art. 40 LEF), ` +
    `prazos processuais, decadência e qualquer outro prazo mencionado nos documentos abaixo.\n` +
    `Exemplo: se a CDA foi inscrita em 15/03/2018 e hoje é ${dateStr}, ` +
    `transcorreram ${now.getFullYear() - 2018} anos desde a inscrição.\n\n`
  );
}

export interface StreamAnalysisOptions {
  thinkMode?: OllamaThinkMode;
}

/**
 * Streams an LLM analysis.
 *
 * @param prompt        Full prompt text
 * @param writeEvent    Callback receiving raw SSE data strings (e.g. `data: {...}\n\n`)
 * @param onChunk       Callback receiving plain text chunks (for accumulating output)
 * @param continueFrom  Optional previous output to continue from
 * @param onStatus      Optional callback for status messages (shown as "model" step updates)
 * @param options       { thinkMode }
 * @param signal        Optional AbortSignal for cancellation
 */
export async function streamAnalysis(
  prompt: string,
  writeEvent: (sseData: string) => void,
  onChunk: (text: string) => void,
  continueFrom?: string,
  onStatus?: (msg: string) => void,
  options: StreamAnalysisOptions = {},
  signal?: AbortSignal
): Promise<void> {
  const provider = getActiveProvider();

  if (!provider) {
    throw new Error("Nenhum motor de IA configurado (ANTHROPIC_API_KEY ou OLLAMA_BASE_URL).");
  }

  const promptWithDate = buildDateContext() + prompt;

  // ── Anthropic-only path ───────────────────────────────────────────────────
  if (provider === "anthropic") {
    logger.info("Streaming via Claude (Anthropic) — Ollama não configurado");
    onStatus?.("Conectando ao Claude...");
    for await (const text of streamAnthropic(promptWithDate, continueFrom)) {
      if (signal?.aborted) return;
      onChunk(text);
      writeEvent(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    }
    return;
  }

  // ── Ollama (primário) com fallback para Claude ────────────────────────────
  const baseUrl = getOllamaBaseUrl()!;
  const model = getOllamaModelParecer();
  const thinkMode = options.thinkMode ?? "deep";

  logger.info({ model, baseUrl, thinkMode }, "Streaming via Ollama local");

  try {
    await ensureModelLoaded(baseUrl, model, onStatus);
    if (signal?.aborted) return;

    let fullPrompt = promptWithDate;
    if (continueFrom) {
      fullPrompt += `\n\n[RESPOSTA ANTERIOR]:\n${continueFrom}\n\nContinue a análise do ponto onde parou.`;
    }

    let thinkCharTotal = 0;
    let lastStatusAt = 0;
    const PROGRESS_INTERVAL = 800;

    function emitThinkProgress(addedChars: number) {
      thinkCharTotal += addedChars;
      const approxTokens = Math.round(thinkCharTotal / 4);
      if (thinkCharTotal - lastStatusAt >= PROGRESS_INTERVAL) {
        lastStatusAt = thinkCharTotal;
        onStatus?.(
          `Raciocínio jurídico em andamento... ~${approxTokens.toLocaleString("pt-BR")} tokens`
        );
      }
    }

    let thinkPhase: "checking" | "stripping" | "passthrough" = "checking";
    let thinkBuffer = "";

    for await (const text of streamOllama(fullPrompt, model, baseUrl, getDbBridgeUrl(), thinkMode, (chars) => emitThinkProgress(chars))) {
      if (signal?.aborted) return;

      if (thinkPhase === "passthrough") {
        onChunk(text);
        writeEvent(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
        continue;
      }

      thinkBuffer += text;

      if (thinkPhase === "checking") {
        const trimmed = thinkBuffer.trimStart();
        if (trimmed.startsWith("<think>")) {
          thinkPhase = "stripping";
        } else if (trimmed.length > 40 || !trimmed.startsWith("<")) {
          thinkPhase = "passthrough";
          onChunk(thinkBuffer);
          writeEvent(`data: ${JSON.stringify({ type: "text", text: thinkBuffer })}\n\n`);
          thinkBuffer = "";
        }
      }

      if (thinkPhase === "stripping") {
        emitThinkProgress(text.length);
        const closeIdx = thinkBuffer.indexOf("</think>");
        if (closeIdx !== -1) {
          thinkPhase = "passthrough";
          const afterThink = thinkBuffer.slice(closeIdx + "</think>".length).replace(/^\n+/, "");
          thinkBuffer = "";
          if (afterThink) {
            onChunk(afterThink);
            writeEvent(`data: ${JSON.stringify({ type: "text", text: afterThink })}\n\n`);
          }
        }
      }
    }
  } catch (ollamaErr) {
    if (signal?.aborted) return;
    if (isAnthropicConfigured()) {
      logger.warn({ err: ollamaErr }, "Ollama falhou — usando Claude como fallback");
      onStatus?.("Mini PC indisponível — usando Claude como alternativa...");
      for await (const text of streamAnthropic(promptWithDate, continueFrom)) {
        if (signal?.aborted) return;
        onChunk(text);
        writeEvent(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
      }
    } else {
      throw ollamaErr;
    }
  }
}
