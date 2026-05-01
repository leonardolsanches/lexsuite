import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { isAnyLlmConfigured, getLlmStatusMessage, streamAnalysis, getActiveProvider, isAnthropicFallbackAvailable } from "../lib/llm";
import { isOllamaConfigured, getOllamaBaseUrl, listOllamaModels, pingOllama, getOllamaModelParecer, getOllamaModelExtraction } from "../lib/ollama";
import { isAnthropicConfigured, getAnthropicModel, pingAnthropic } from "../lib/anthropic";
import { isDbBridgeConfigured, dbBridgeSearchChunks } from "../lib/embedding";
import { pingDbBridge, getDbBridgeUrl, bridgeQuery, bridgeQueryOne, bridgeExecute } from "../lib/bridge";
import { searchRelevantChunks, buildRagContext } from "../lib/rag";
import { getLocalPrompt } from "../lib/prompts-registry";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/llm-status", async (_req, res): Promise<void> => {
  const activeProvider = getActiveProvider();

  // Anthropic status
  const anthropicConfigured = isAnthropicConfigured();
  const anthropicOnline = anthropicConfigured ? await pingAnthropic() : false;

  // Ollama status
  const ollamaUrl = getOllamaBaseUrl();
  let ollamaOnline = false;
  let ollamaModels: string[] = [];
  if (ollamaUrl) {
    ollamaOnline = await pingOllama(ollamaUrl);
    if (ollamaOnline) ollamaModels = await listOllamaModels(ollamaUrl);
  }

  // RAG / DB Bridge status
  const dbBridgeConfigured = isDbBridgeConfigured();
  const dbBridgeOnline = dbBridgeConfigured ? await pingDbBridge() : false;

  const configured = activeProvider !== null;
  // "online" reflects Ollama (primary). If Ollama is down but Claude fallback
  // is available the analysis still works — the frontend should not alarm.
  const online = activeProvider === "ollama" ? ollamaOnline
    : activeProvider === "anthropic" ? anthropicOnline
    : false;
  const hasFallback = isAnthropicFallbackAvailable() && anthropicConfigured;

  res.json({
    provider: activeProvider ?? "none",
    configured,
    online,
    hasFallback,
    // Anthropic (fallback — hidden from the main status indicator)
    anthropic: {
      configured: anthropicConfigured,
      online: anthropicOnline,
      model: anthropicConfigured ? getAnthropicModel() : null,
    },
    // Ollama
    url: ollamaUrl ? "configured" : null,
    models: ollamaModels,
    modelParecer: getOllamaModelParecer(),
    modelExtracao: getOllamaModelExtraction(),
    // RAG
    rag: {
      configured: dbBridgeConfigured,
      online: dbBridgeOnline,
      url: getDbBridgeUrl() ? "configured" : null,
      embeddingModel: process.env.OLLAMA_MODEL_EMBEDDING ?? "nomic-embed-text",
    },
  });
});

router.post("/analyze", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { sessionId, workflowKey, module, formData, pasteText, observations, continueFrom, thinkMode } = req.body;

  if (!workflowKey || !module) {
    res.status(400).json({ error: "Missing workflowKey or module" });
    return;
  }

  // Open the SSE stream immediately so progress events reach the client
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  /** Emit a named progress step to the client */
  const sendStep = (id: string, label: string, icon: string) => {
    res.write(`data: ${JSON.stringify({ type: "step", id, label, icon })}\n\n`);
  };

  /** Emit a terminal error and close the stream */
  const sendError = (message: string) => {
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  };

  // ── 1. Check LLM availability ─────────────────────────────────────────────
  sendStep("llm", "Verificando motor de linguagem...", "cpu");
  const activeProvider = getActiveProvider();
  if (!activeProvider) {
    sendError("⚙️ Motor de IA não configurado. Adicione ANTHROPIC_API_KEY (Claude) ou OLLAMA_BASE_URL (local).");
    return;
  }
  // For Ollama: fail-open on ping (CF tunnel may be slow but still serve requests)
  if (activeProvider === "ollama") {
    const ollamaUrl = getOllamaBaseUrl()!;
    const ollamaOnline = await pingOllama(ollamaUrl);
    if (!ollamaOnline) {
      logger.warn({ ollamaUrl }, "Ping do Ollama falhou — tentando análise mesmo assim (fail-open)");
    }
  }

  // ── 2. Module access check (fail-open when bridge offline) ────────────────
  sendStep("module", "Verificando acesso ao módulo...", "shield");
  try {
    const activeModules = await bridgeQuery(
      "SELECT module FROM user_modules WHERE user_id = $1",
      [userId]
    );
    const hasModule = activeModules.some(m => m.module === module);
    if (!hasModule && activeModules.length > 0) {
      sendError(`Módulo '${module}' não está ativado para sua conta.`);
      return;
    }
  } catch (err: any) {
    logger.warn({ err }, "DB Bridge indisponível para verificação de módulo — permitindo acesso");
  }

  // ── 3. Prompt lookup — bridge first, local registry as fallback ───────────
  sendStep("prompt", "Carregando instruções do workflow...", "file-text");
  let prompt: { key: unknown; content: unknown; module: unknown } | null = null;
  try {
    prompt = await bridgeQueryOne(
      "SELECT key, content, module FROM prompts WHERE key = $1",
      [workflowKey]
    );
  } catch (err: any) {
    logger.warn({ err, workflowKey }, "DB Bridge indisponível — tentando registro local de prompts");
  }

  // Fallback: use prompts embedded directly in the server
  if (!prompt) {
    const local = getLocalPrompt(workflowKey);
    if (local) {
      prompt = local;
      logger.info({ workflowKey }, "Prompt carregado do registro local (bridge offline)");
    }
  }

  if (!prompt) {
    sendError(`Prompt não encontrado para o workflow '${workflowKey}'. Verifique se o Mini PC está online ou se o workflow está cadastrado.`);
    return;
  }

  // ── 4. Build data payload ─────────────────────────────────────────────────
  let dataSection = "";
  if (pasteText) dataSection = `TEXTO COLADO PELO USUÁRIO:\n${pasteText}\n\n`;
  if (formData && typeof formData === "object") {
    const fields = Object.entries(formData)
      .filter(([_, v]) => v !== "" && v != null)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    if (fields) dataSection += `DADOS DO FORMULÁRIO:\n${fields}\n\n`;
  }
  if (observations) dataSection += `OBSERVAÇÕES ADICIONAIS:\n${observations}\n\n`;

  // ── 5. RAG / document context (optional, fail-open) ───────────────────────
  sendStep("context", "Buscando contexto relevante...", "search");
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
    } else {
      const userDocs = await bridgeQuery(
        "SELECT filename, content FROM documents WHERE user_id = $1 AND module = $2 AND status = 'ready'",
        [userId, module]
      );
      if (userDocs.length > 0) {
        const docsContext = userDocs
          .map(d => `[${d.filename}]: ${String(d.content).slice(0, 2000)}`)
          .join("\n\n");
        ragContext = `BASE DE CONHECIMENTO (documentos indexados):\n${docsContext}\n\n`;
      }
    }
  } catch (err: any) {
    logger.warn({ err }, "DB Bridge indisponível para RAG/docs — prosseguindo sem contexto");
  }

  if (ragContext) dataSection = ragContext + dataSection;

  const fullPrompt = String(prompt.content).replace("{{DADOS}}", dataSection || "(nenhum dado fornecido)");

  // ── 6. Session tracking (optional, fail-open) ─────────────────────────────
  let sessionRecord: { id: number } | null = null;
  if (sessionId) {
    try {
      const s = await bridgeQueryOne(
        "SELECT id FROM sessions WHERE id = $1 AND user_id = $2",
        [sessionId, userId]
      );
      if (s) sessionRecord = { id: s.id as number };
    } catch {
      logger.warn("DB Bridge indisponível — sessão não rastreada");
    }
  }

  if (sessionRecord) {
    try {
      await bridgeExecute(
        "UPDATE sessions SET status = 'running', form_data = $2, updated_at = NOW() WHERE id = $1",
        [sessionRecord.id, formData ? JSON.stringify(formData) : null]
      );
    } catch {
      sessionRecord = null;
    }
  }

  // ── 7. Stream from LLM ────────────────────────────────────────────────────
  const modelLabel = activeProvider === "anthropic"
    ? "Conectando ao Claude (Anthropic)..."
    : "Verificando se modelo está na memória...";
  sendStep("model", modelLabel, "brain");

  let fullOutput = "";

  const onModelStatus = (msg: string) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "step", id: "model", label: msg, icon: "brain" })}\n\n`);
    }
  };

  // Keep-alive heartbeat: prevents proxies/browsers from cutting idle SSE connections
  // (deepseek-r1 can be silent for 30-60s during its chain-of-thought reasoning phase)
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
    }
  }, 15_000);

  // Checkpoint save: persist partial output every 60 s so a browser refresh
  // can recover content generated so far (only useful once text starts flowing,
  // not during the silent <think> phase)
  let lastCheckpointLen = 0;
  const checkpointInterval = sessionRecord
    ? setInterval(async () => {
        if (fullOutput.length > lastCheckpointLen) {
          lastCheckpointLen = fullOutput.length;
          try {
            await bridgeExecute(
              "UPDATE sessions SET output_html = $2, updated_at = NOW() WHERE id = $1",
              [sessionRecord!.id, fullOutput]
            );
          } catch { /* bridge offline — skip checkpoint */ }
        }
      }, 60_000)
    : null;

  try {
    await streamAnalysis(
      fullPrompt,
      res,
      (text) => { fullOutput += text; },
      continueFrom,
      onModelStatus,
      { thinkMode: thinkMode === "fast" ? "fast" : "deep" }
    );

    clearInterval(heartbeatInterval);
    if (checkpointInterval) clearInterval(checkpointInterval);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

    if (sessionRecord) {
      try {
        await bridgeExecute(
          "UPDATE sessions SET status = 'done', output_html = $2, updated_at = NOW() WHERE id = $1",
          [sessionRecord.id, fullOutput]
        );
      } catch { /* bridge offline, skip */ }
    }
  } catch (err: any) {
    clearInterval(heartbeatInterval);
    if (checkpointInterval) clearInterval(checkpointInterval);
    logger.error({ err }, "Erro durante streaming de análise");
    if (sessionRecord) {
      try {
        await bridgeExecute(
          "UPDATE sessions SET status = 'error', updated_at = NOW() WHERE id = $1",
          [sessionRecord.id]
        );
      } catch { /* skip */ }
    }
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message ?? "Falha na análise" })}\n\n`);
      res.end();
    }
  }
});

export default router;
