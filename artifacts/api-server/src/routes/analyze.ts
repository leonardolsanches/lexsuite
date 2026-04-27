import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { isAnyLlmConfigured, getLlmStatusMessage, streamAnalysis } from "../lib/llm";
import { isOllamaConfigured, getOllamaBaseUrl, listOllamaModels, pingOllama, getOllamaModelParecer, getOllamaModelExtraction } from "../lib/ollama";
import { isDbBridgeConfigured, dbBridgeSearchChunks } from "../lib/embedding";
import { pingDbBridge, getDbBridgeUrl, bridgeQuery, bridgeQueryOne, bridgeExecute } from "../lib/bridge";
import { searchRelevantChunks, buildRagContext } from "../lib/rag";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/llm-status", requireAuth, async (_req, res): Promise<void> => {
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

  if (!isAnyLlmConfigured()) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ type: "error", message: getLlmStatusMessage() })}\n\n`);
    res.end();
    return;
  }

  // Module access check — fail-open when DB Bridge is unavailable
  try {
    const activeModules = await bridgeQuery(
      "SELECT module FROM user_modules WHERE user_id = $1",
      [userId]
    );
    const hasModule = activeModules.some(m => m.module === module);
    if (!hasModule && activeModules.length > 0) {
      res.status(403).json({ error: `Módulo '${module}' não está ativado para sua conta` });
      return;
    }
    // If activeModules is empty it may mean the user record doesn't exist yet — allow
  } catch (bridgeErr: any) {
    logger.warn({ err: bridgeErr }, "DB Bridge indisponível para verificação de módulo — permitindo acesso");
  }

  // Prompt lookup — requires bridge; surface a clear SSE error if unavailable
  let prompt: { key: unknown; content: unknown; module: unknown } | null = null;
  try {
    prompt = await bridgeQueryOne(
      "SELECT key, content, module FROM prompts WHERE key = $1",
      [workflowKey]
    );
  } catch (bridgeErr: any) {
    logger.warn({ err: bridgeErr, workflowKey }, "DB Bridge indisponível — não foi possível carregar o prompt");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({
      type: "error",
      message: "🔌 DB Bridge offline — o Mini PC está desconectado. Ligue o servidor local e aguarde o túnel Cloudflare reconectar para que as análises funcionem."
    })}\n\n`);
    res.end();
    return;
  }

  if (!prompt) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ type: "error", message: `Prompt não encontrado para o workflow '${workflowKey}'.` })}\n\n`);
    res.end();
    return;
  }

  let dataSection = "";
  if (pasteText) {
    dataSection = `TEXTO COLADO PELO USUÁRIO:\n${pasteText}\n\n`;
  }
  if (formData && typeof formData === "object") {
    const fields = Object.entries(formData)
      .filter(([_, v]) => v !== "" && v != null)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    if (fields) {
      dataSection += `DADOS DO FORMULÁRIO:\n${fields}\n\n`;
    }
  }
  if (observations) {
    dataSection += `OBSERVAÇÕES ADICIONAIS:\n${observations}\n\n`;
  }

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
  } catch (ragErr: any) {
    logger.warn({ err: ragErr }, "DB Bridge indisponível para RAG/docs — prosseguindo sem contexto");
  }

  if (ragContext) {
    dataSection = ragContext + dataSection;
  }

  const fullPrompt = String(prompt.content).replace("{{DADOS}}", dataSection || "(nenhum dado fornecido)");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let sessionRecord: { id: number } | null = null;
  if (sessionId) {
    try {
      const s = await bridgeQueryOne(
        "SELECT id FROM sessions WHERE id = $1 AND user_id = $2",
        [sessionId, userId]
      );
      if (s) sessionRecord = { id: s.id as number };
    } catch {
      logger.warn("DB Bridge indisponível — sessão não atualizada");
    }
  }

  if (sessionRecord) {
    try {
      await bridgeExecute(
        "UPDATE sessions SET status = 'running', form_data = $2, updated_at = NOW() WHERE id = $1",
        [sessionRecord.id, formData ? JSON.stringify(formData) : null]
      );
    } catch {
      sessionRecord = null; // skip further session updates
    }
  }

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
      await bridgeExecute(
        "UPDATE sessions SET status = 'done', output_html = $2, updated_at = NOW() WHERE id = $1",
        [sessionRecord.id, fullOutput]
      );
    }
  } catch (err: any) {
    logger.error({ err }, "Erro durante streaming de análise");
    if (sessionRecord) {
      await bridgeExecute(
        "UPDATE sessions SET status = 'error', updated_at = NOW() WHERE id = $1",
        [sessionRecord.id]
      );
    }
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message ?? "Falha na análise" })}\n\n`);
      res.end();
    }
  }
});

export default router;
