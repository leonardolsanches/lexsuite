import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { isAnyLlmConfigured, getLlmStatusMessage, streamAnalysis } from "../lib/llm";
import { isOllamaConfigured, getOllamaBaseUrl, listOllamaModels, pingOllama, getOllamaModelParecer, getOllamaModelExtraction } from "../lib/ollama";
import { isDbBridgeConfigured, dbBridgeSearchChunks } from "../lib/embedding";
import { pingDbBridge, getDbBridgeUrl, bridgeQuery, bridgeQueryOne, bridgeExecute } from "../lib/bridge";
import { searchRelevantChunks, buildRagContext } from "../lib/rag";
import { getLocalPrompt } from "../lib/prompts-registry";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/llm-status", async (_req, res): Promise<void> => {
  const ollamaUrl = getOllamaBaseUrl();
  let ollamaOnline = false;
  let ollamaModels: string[] = [];

  if (ollamaUrl) {
    ollamaOnline = await pingOllama(ollamaUrl);
    if (ollamaOnline) {
      ollamaModels = await listOllamaModels(ollamaUrl);
    }
  }

  const dbBridgeConfigured = isDbBridgeConfigured();
  const dbBridgeOnline = dbBridgeConfigured ? await pingDbBridge() : false;

  res.json({
    provider: "ollama",
    configured: isOllamaConfigured(),
    online: ollamaOnline,
    url: ollamaUrl ? "configured" : null,
    models: ollamaModels,
    modelParecer: getOllamaModelParecer(),
    modelExtracao: getOllamaModelExtraction(),
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
  const { sessionId, workflowKey, module, formData, pasteText, observations, continueFrom } = req.body;

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

  // ── 1. Check LLM availability — actually ping Ollama ─────────────────────
  sendStep("llm", "Verificando motor de linguagem...", "cpu");
  if (!isAnyLlmConfigured()) {
    sendError("⚙️ Motor de IA não configurado. Adicione a URL do Ollama em OLLAMA_BASE_URL.");
    return;
  }
  const ollamaUrl = getOllamaBaseUrl()!;
  const ollamaOnline = await pingOllama(ollamaUrl);
  if (!ollamaOnline) {
    sendError(
      "🔌 Motor de IA offline\n\n" +
      "O servidor Ollama não está respondendo no endereço configurado.\n\n" +
      "Para usar o sistema:\n" +
      "1. Ligue o Mini PC\n" +
      "2. Aguarde o túnel Cloudflare reconectar\n" +
      "3. Tente novamente\n\n" +
      `URL configurada: ${ollamaUrl.replace(/https?:\/\//, '').split('/')[0]}`
    );
    return;
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
  sendStep("model", "Aguardando resposta do modelo...", "brain");

  let fullOutput = "";

  try {
    await streamAnalysis(
      fullPrompt,
      res,
      (text) => { fullOutput += text; },
      continueFrom
    );

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
