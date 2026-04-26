import type { Response } from "express";
import { getAnthropicClient, DEFAULT_MODEL, MAX_TOKENS } from "./anthropic";
import {
  getOllamaBaseUrl,
  getOllamaModelParecer,
  isOllamaConfigured,
  streamOllama,
} from "./ollama";
import { logger } from "./logger";

export type LlmMode = "local" | "cloud" | "hibrido";

export function getLlmMode(): LlmMode {
  const raw = (process.env.LEX_MODO_LLM ?? "cloud").toLowerCase();
  if (raw === "local") return "local";
  if (raw === "hibrido") return "hibrido";
  return "cloud";
}

export function isAnyLlmConfigured(): boolean {
  const mode = getLlmMode();
  if (mode === "local") return isOllamaConfigured();
  if (mode === "cloud") return !!process.env.ANTHROPIC_API_KEY;
  return isOllamaConfigured() || !!process.env.ANTHROPIC_API_KEY;
}

export function getLlmStatusMessage(): string {
  const mode = getLlmMode();
  if (mode === "local" && !isOllamaConfigured()) {
    return "Motor local não configurado. Configure OLLAMA_BASE_URL para ativar o processamento local.";
  }
  if (mode === "cloud" && !process.env.ANTHROPIC_API_KEY) {
    return "Motor de IA não configurado. Configure ANTHROPIC_API_KEY ou conecte um modelo local para ativar o processamento.";
  }
  if (mode === "hibrido" && !isOllamaConfigured() && !process.env.ANTHROPIC_API_KEY) {
    return "Nenhum motor de IA configurado. Configure OLLAMA_BASE_URL ou ANTHROPIC_API_KEY.";
  }
  return "";
}

export async function streamAnalysis(
  prompt: string,
  res: Response,
  onChunk: (text: string) => void,
  continueFrom?: string
): Promise<void> {
  const mode = getLlmMode();

  if (mode === "local" || (mode === "hibrido" && isOllamaConfigured())) {
    const baseUrl = getOllamaBaseUrl()!;
    const model = getOllamaModelParecer();
    logger.info({ model, baseUrl, mode }, "Streaming via Ollama");

    let fullPrompt = prompt;
    if (continueFrom) {
      fullPrompt += `\n\n[RESPOSTA ANTERIOR]:\n${continueFrom}\n\nContinue a análise do ponto onde parou.`;
    }

    for await (const text of streamOllama(fullPrompt, model, baseUrl)) {
      onChunk(text);
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    }
    return;
  }

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: prompt },
  ];
  if (continueFrom) {
    messages.push({ role: "assistant", content: continueFrom });
    messages.push({ role: "user", content: "Continue a análise do ponto onde parou." });
  }

  logger.info({ model: DEFAULT_MODEL, mode }, "Streaming via Anthropic");
  const anthropic = getAnthropicClient();
  const stream = anthropic.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    messages,
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      const text = chunk.delta.text;
      onChunk(text);
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    }
  }
}
