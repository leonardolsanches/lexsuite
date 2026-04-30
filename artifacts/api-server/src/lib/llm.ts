import type { Response } from "express";
import {
  ensureModelLoaded,
  getOllamaBaseUrl,
  getOllamaModelParecer,
  isOllamaConfigured,
  streamOllama,
} from "./ollama";
import {
  isAnthropicConfigured,
  streamAnthropic,
} from "./anthropic";
import { getDbBridgeUrl } from "./bridge";
import { logger } from "./logger";

export type LlmProvider = "anthropic" | "ollama";

/** Claude takes priority when ANTHROPIC_API_KEY is set; otherwise Ollama. */
export function getActiveProvider(): LlmProvider | null {
  if (isAnthropicConfigured()) return "anthropic";
  if (isOllamaConfigured()) return "ollama";
  return null;
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

export async function streamAnalysis(
  prompt: string,
  res: Response,
  onChunk: (text: string) => void,
  continueFrom?: string,
  onStatus?: (msg: string) => void
): Promise<void> {
  const provider = getActiveProvider();

  if (!provider) {
    throw new Error("Nenhum motor de IA configurado (ANTHROPIC_API_KEY ou OLLAMA_BASE_URL).");
  }

  // ── Claude ────────────────────────────────────────────────────────────────
  if (provider === "anthropic") {
    logger.info("Streaming via Claude (Anthropic)");
    onStatus?.("Conectando ao Claude...");

    for await (const text of streamAnthropic(prompt, continueFrom)) {
      onChunk(text);
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    }
    return;
  }

  // ── Ollama (local) ────────────────────────────────────────────────────────
  const baseUrl = getOllamaBaseUrl()!;
  const model = getOllamaModelParecer();

  logger.info({ model, baseUrl }, "Streaming via Ollama local");

  await ensureModelLoaded(baseUrl, model, onStatus);

  const langPrefix =
    "INSTRUÇÃO OBRIGATÓRIA DE IDIOMA: Responda EXCLUSIVAMENTE em português brasileiro (pt-BR). " +
    "Não escreva nenhuma palavra em inglês. Toda a sua resposta deve ser em português, sem exceção.\n\n";

  let fullPrompt = langPrefix + prompt;
  if (continueFrom) {
    fullPrompt += `\n\n[RESPOSTA ANTERIOR]:\n${continueFrom}\n\nContinue a análise do ponto onde parou.`;
  }

  // Strip deepseek-r1 <think>...</think> reasoning block
  let thinkPhase: "checking" | "stripping" | "passthrough" = "checking";
  let thinkBuffer = "";

  for await (const text of streamOllama(fullPrompt, model, baseUrl, getDbBridgeUrl())) {
    if (thinkPhase === "passthrough") {
      onChunk(text);
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
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
        res.write(`data: ${JSON.stringify({ type: "text", text: thinkBuffer })}\n\n`);
        thinkBuffer = "";
      }
    }

    if (thinkPhase === "stripping") {
      const closeIdx = thinkBuffer.indexOf("</think>");
      if (closeIdx !== -1) {
        thinkPhase = "passthrough";
        const afterThink = thinkBuffer.slice(closeIdx + "</think>".length).replace(/^\n+/, "");
        thinkBuffer = "";
        if (afterThink) {
          onChunk(afterThink);
          res.write(`data: ${JSON.stringify({ type: "text", text: afterThink })}\n\n`);
        }
      }
    }
  }
}
