import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";
import { getConfig } from "./runtime-config";

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-4-5";

/** Priority: runtime config (DB/memory) → env var */
export function getAnthropicApiKey(): string | null {
  return getConfig("anthropic_api_key", process.env.ANTHROPIC_API_KEY ?? undefined) ?? null;
}

export function isAnthropicConfigured(): boolean {
  return !!getAnthropicApiKey();
}

/** Returns a fresh Anthropic client using the current runtime API key. */
function getClient(): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurado");
  return new Anthropic({ apiKey });
}

export function getAnthropicModel(): string {
  return getConfig("anthropic_model", process.env.ANTHROPIC_MODEL ?? undefined) ?? ANTHROPIC_DEFAULT_MODEL;
}

export async function pingAnthropic(): Promise<boolean> {
  if (!isAnthropicConfigured()) return false;
  try {
    const client = getClient();
    await client.models.retrieve(getAnthropicModel());
    return true;
  } catch {
    return false;
  }
}

const SYSTEM_PT_BR =
  "Você é um advogado especializado em direito brasileiro com expertise em contencioso judicial. " +
  "REGRA ABSOLUTA DE IDIOMA: responda EXCLUSIVAMENTE em português brasileiro (pt-BR). " +
  "Não escreva nenhuma palavra em inglês. Toda a resposta deve ser em português, sem exceção.";

export async function* streamAnthropic(
  prompt: string,
  continueFrom?: string
): AsyncGenerator<string> {
  const client = getClient();
  const model = getAnthropicModel();

  let userContent = prompt;
  if (continueFrom) {
    userContent += `\n\n[RESPOSTA ANTERIOR]:\n${continueFrom}\n\nContinue a análise do ponto onde parou.`;
  }

  logger.info({ model }, "Streaming via Anthropic Claude");

  const stream = client.messages.stream({
    model,
    max_tokens: 8192,
    system: SYSTEM_PT_BR,
    messages: [{ role: "user", content: userContent }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
