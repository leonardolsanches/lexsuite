import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-4-5";

export function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = getAnthropicApiKey();
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurado");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT_MODEL;
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
  "Você é um assistente jurídico especializado em direito brasileiro. " +
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
