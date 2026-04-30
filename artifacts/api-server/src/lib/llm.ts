import type { Response } from "express";
import {
  ensureModelLoaded,
  getOllamaBaseUrl,
  getOllamaModelParecer,
  isOllamaConfigured,
  streamOllama,
} from "./ollama";
import { getDbBridgeUrl } from "./bridge";
import { logger } from "./logger";

export function isAnyLlmConfigured(): boolean {
  return isOllamaConfigured();
}

export function getLlmStatusMessage(): string {
  if (!isOllamaConfigured()) {
    return "Motor local não configurado. Adicione a URL do túnel Cloudflare em OLLAMA_BASE_URL para ativar o processamento.";
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
  if (!isOllamaConfigured()) {
    throw new Error("OLLAMA_BASE_URL não configurado.");
  }

  const baseUrl = getOllamaBaseUrl()!;
  const model = getOllamaModelParecer();

  logger.info({ model, baseUrl }, "Streaming via Ollama local");

  // Ensure model is in memory before streaming (handles cold-start gracefully)
  await ensureModelLoaded(baseUrl, model, onStatus);

  // Prepend language instruction to every prompt.
  // deepseek-r1 tends to respond in English without an explicit directive.
  const langPrefix =
    "INSTRUÇÃO OBRIGATÓRIA DE IDIOMA: Responda EXCLUSIVAMENTE em português brasileiro (pt-BR). " +
    "Não escreva nenhuma palavra em inglês. Toda a sua resposta deve ser em português, sem exceção.\n\n";

  let fullPrompt = langPrefix + prompt;
  if (continueFrom) {
    fullPrompt += `\n\n[RESPOSTA ANTERIOR]:\n${continueFrom}\n\nContinue a análise do ponto onde parou.`;
  }

  // deepseek-r1 prefixes its response with a <think>...</think> reasoning block
  // (often in English). Strip it entirely — only forward content after </think>.
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
        // No think block — flush buffer and pass through
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
