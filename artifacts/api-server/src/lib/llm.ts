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

  let fullPrompt = prompt;
  if (continueFrom) {
    fullPrompt += `\n\n[RESPOSTA ANTERIOR]:\n${continueFrom}\n\nContinue a análise do ponto onde parou.`;
  }

  for await (const text of streamOllama(fullPrompt, model, baseUrl, getDbBridgeUrl())) {
    onChunk(text);
    res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
  }
}
