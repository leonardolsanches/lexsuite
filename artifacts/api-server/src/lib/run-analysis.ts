import { getActiveProvider } from "./llm";
import { getOllamaBaseUrl, isOllamaConfigured, pingOllama } from "./ollama";
import { isDbBridgeConfigured } from "./bridge";
import { localQuery, localQueryOne, localExecute } from "./local-db";
import { searchRelevantChunks, buildRagContext } from "./rag";
import { getLocalPrompt } from "./prompts-registry";
import { streamAnalysis } from "./llm";
import { logger } from "./logger";

export interface AnalysisParams {
  userId: string;
  sessionId?: number;
  workflowKey: string;
  module: string;
  formData?: Record<string, unknown>;
  pasteText?: string;
  observations?: string;
  continueFrom?: string;
  thinkMode?: "fast" | "deep";
  /** Optional Ollama model override (uses server default if omitted). */
  model?: string;
}

export type AnalysisEvent =
  | { type: "step"; id: string; label: string; icon: string }
  | { type: "text"; text: string }
  | { type: "ping" }
  | { type: "running" }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * Thrown when the analysis failed AND the error event was already forwarded
 * to the client via `onEvent`. `job-queue.ts` uses this to skip the duplicate
 * error emit while still marking the job as `error` in the DB.
 */
export class AnalysisReportedError extends Error {
  readonly reportedMessage: string;
  constructor(reportedMessage: string, cause?: unknown) {
    super(reportedMessage);
    this.name = "AnalysisReportedError";
    this.reportedMessage = reportedMessage;
    if (cause) this.cause = cause;
  }
}

/** Translates raw network/Node errors to user-friendly Portuguese messages. */
function toUserMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/ECONNRESET|terminated/i.test(raw)) {
    return "Conexão com o Mini PC foi interrompida. O túnel Cloudflare pode ter caído. Aguarde alguns segundos e tente novamente.";
  }
  if (/ETIMEDOUT|timed? ?out/i.test(raw)) {
    return "Tempo limite de conexão esgotado. O Mini PC pode estar sobrecarregado ou offline. Tente novamente em instantes.";
  }
  if (/ECONNREFUSED/i.test(raw)) {
    return "Não foi possível conectar ao Mini PC. Verifique se o Ollama está rodando e o túnel Cloudflare está ativo.";
  }
  if (/ENOTFOUND|getaddrinfo/i.test(raw)) {
    return "Endereço do Mini PC não encontrado. Verifique a URL do Ollama nas configurações.";
  }
  return raw || "Falha inesperada durante a análise.";
}

/**
 * Full analysis pipeline — module check, prompt, RAG, LLM streaming.
 * Emits typed events via `onEvent`. Returns total output text.
 * Pass an AbortSignal to support cancellation.
 */
export async function runAnalysis(
  params: AnalysisParams,
  onEvent: (event: AnalysisEvent) => void,
  signal?: AbortSignal
): Promise<string> {
  const {
    userId,
    sessionId,
    workflowKey,
    module,
    formData,
    pasteText,
    observations,
    continueFrom,
    thinkMode,
    model,
  } = params;

  const sendStep = (id: string, label: string, icon: string) =>
    onEvent({ type: "step", id, label, icon });

  const sendError = (message: string) => onEvent({ type: "error", message });

  // ── 1. Check LLM availability ──────────────────────────────────────────────
  sendStep("llm", "Verificando motor de linguagem...", "cpu");
  if (signal?.aborted) { sendError("Análise cancelada."); return ""; }

  const activeProvider = getActiveProvider();
  if (!activeProvider) {
    sendError("⚙️ Motor de IA não configurado. Adicione ANTHROPIC_API_KEY (Claude) ou OLLAMA_BASE_URL (local).");
    return "";
  }
  if (activeProvider === "ollama") {
    const ollamaUrl = getOllamaBaseUrl()!;
    const ollamaOnline = await pingOllama(ollamaUrl);
    if (!ollamaOnline) {
      logger.warn({ ollamaUrl }, "Ping do Ollama falhou — tentando análise mesmo assim (fail-open)");
    }
  }

  // ── 2. Module access check ─────────────────────────────────────────────────
  sendStep("module", "Verificando acesso ao módulo...", "shield");
  if (signal?.aborted) { sendError("Análise cancelada."); return ""; }

  try {
    const activeModules = await localQuery(
      "SELECT module FROM user_modules WHERE user_id = $1",
      [userId]
    );
    const hasModule = activeModules.some(m => m.module === module);
    if (!hasModule && activeModules.length > 0) {
      sendError(`Módulo '${module}' não está ativado para sua conta.`);
      return "";
    }
  } catch (err: unknown) {
    logger.warn({ err }, "Erro ao verificar módulos — permitindo acesso");
  }

  // ── 3. Prompt lookup ───────────────────────────────────────────────────────
  sendStep("prompt", "Carregando instruções do workflow...", "file-text");
  if (signal?.aborted) { sendError("Análise cancelada."); return ""; }

  let prompt: { key: unknown; content: unknown; module: unknown } | null = null;
  try {
    prompt = await localQueryOne(
      "SELECT key, content, module FROM prompts WHERE key = $1",
      [workflowKey]
    );
  } catch (err: unknown) {
    logger.warn({ err, workflowKey }, "Banco local indisponível — tentando registro local de prompts");
  }

  if (!prompt) {
    const local = getLocalPrompt(workflowKey);
    if (local) {
      prompt = local;
      logger.info({ workflowKey }, "Prompt carregado do registro local (fallback)");
    }
  }

  if (!prompt) {
    sendError(`Prompt não encontrado para o workflow '${workflowKey}'. Verifique se o banco foi inicializado corretamente.`);
    return "";
  }

  // ── 4. Build data payload ──────────────────────────────────────────────────
  let dataSection = "";
  if (pasteText) dataSection = `TEXTO COLADO PELO USUÁRIO:\n${pasteText}\n\n`;
  if (formData && typeof formData === "object") {
    const fields = Object.entries(formData)
      .filter(([, v]) => v !== "" && v != null)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    if (fields) dataSection += `DADOS DO FORMULÁRIO:\n${fields}\n\n`;
  }
  if (observations) dataSection += `OBSERVAÇÕES ADICIONAIS:\n${observations}\n\n`;

  // ── 5. RAG / document context (DB Bridge — Mini PC only) ───────────────────
  sendStep("context", "Buscando contexto relevante...", "search");
  if (signal?.aborted) { sendError("Análise cancelada."); return ""; }

  let ragContext = "";
  try {
    if (isDbBridgeConfigured()) {
      const queryText = [pasteText, observations, dataSection].filter(Boolean).join(" ").slice(0, 1000);
      if (queryText.trim().length > 20) {
        const chunks = await searchRelevantChunks(queryText, module, 5);
        if (chunks.length > 0) {
          ragContext = buildRagContext(chunks);
          logger.info({ chunkCount: chunks.length, module }, "RAG: contexto recuperado");
        }
      }
    }
  } catch (err: unknown) {
    logger.warn({ err }, "DB Bridge indisponível para RAG — prosseguindo sem contexto");
  }

  if (ragContext) dataSection = ragContext + dataSection;
  const fullPrompt = String(prompt.content).replace("{{DADOS}}", dataSection || "(nenhum dado fornecido)");

  // ── 6. Session tracking (local PostgreSQL) ─────────────────────────────────
  let sessionRecord: { id: number } | null = null;
  if (sessionId) {
    try {
      const s = await localQueryOne(
        "SELECT id FROM sessions WHERE id = $1 AND user_id = $2",
        [sessionId, userId]
      );
      if (s) sessionRecord = { id: s.id as number };
    } catch {
      logger.warn("Erro ao buscar sessão no banco local");
    }
  }
  if (sessionRecord) {
    try {
      await localExecute(
        "UPDATE sessions SET status = 'running', form_data = $2::jsonb, updated_at = NOW() WHERE id = $1",
        [sessionRecord.id, formData ? JSON.stringify(formData) : null]
      );
    } catch {
      sessionRecord = null;
    }
  }

  // ── 7. Stream from LLM ─────────────────────────────────────────────────────
  const modelLabel = activeProvider === "anthropic"
    ? "Conectando ao Claude (Anthropic)..."
    : "Verificando se modelo está na memória...";
  sendStep("model", modelLabel, "brain");

  let fullOutput = "";

  const onStatus = (msg: string) => {
    onEvent({ type: "step", id: "model", label: msg, icon: "brain" });
  };

  const writeEvent = (sseData: string) => {
    if (signal?.aborted) return;
    const lines = sseData.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as AnalysisEvent;
        onEvent(parsed);
      } catch {
        // ignore parse errors
      }
    }
  };

  // Checkpoint: persist partial output to session every 60s
  let lastCheckpointLen = 0;
  const checkpointInterval = sessionRecord
    ? setInterval(async () => {
        if (fullOutput.length > lastCheckpointLen) {
          lastCheckpointLen = fullOutput.length;
          try {
            await localExecute(
              "UPDATE sessions SET output_html = $2, updated_at = NOW() WHERE id = $1",
              [sessionRecord!.id, fullOutput]
            );
          } catch { /* non-fatal */ }
        }
      }, 60_000)
    : null;

  try {
    if (signal?.aborted) {
      sendError("Análise cancelada.");
      return "";
    }

    await streamAnalysis(
      fullPrompt,
      writeEvent,
      (text) => { fullOutput += text; },
      continueFrom,
      onStatus,
      { thinkMode: thinkMode === "fast" ? "fast" : "deep", modelOverride: model },
      signal
    );

    if (checkpointInterval) clearInterval(checkpointInterval);

    if (!signal?.aborted) {
      onEvent({ type: "done" });
      if (sessionRecord) {
        try {
          await localExecute(
            "UPDATE sessions SET status = 'done', output_html = $2, updated_at = NOW() WHERE id = $1",
            [sessionRecord.id, fullOutput]
          );
        } catch { /* skip */ }
      }
    }
  } catch (err: unknown) {
    if (checkpointInterval) clearInterval(checkpointInterval);
    const userMsg = toUserMessage(err);
    logger.error({ err }, "Erro durante análise");
    if (sessionRecord) {
      try {
        await localExecute(
          "UPDATE sessions SET status = 'error', updated_at = NOW() WHERE id = $1",
          [sessionRecord.id]
        );
      } catch { /* skip */ }
    }
    sendError(userMsg);
    throw new AnalysisReportedError(userMsg, err);
  }

  return fullOutput;
}
