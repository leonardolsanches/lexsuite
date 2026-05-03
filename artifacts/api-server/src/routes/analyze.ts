import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { isAnyLlmConfigured, getLlmStatusMessage, getActiveProvider, isAnthropicFallbackAvailable } from "../lib/llm";
import { isOllamaConfigured, getOllamaBaseUrl, listOllamaModels, pingOllama, getOllamaModelParecer, getOllamaModelExtraction } from "../lib/ollama";
import { isAnthropicConfigured, getAnthropicModel, pingAnthropic } from "../lib/anthropic";
import { isDbBridgeConfigured } from "../lib/embedding";
import { pingDbBridge, getDbBridgeUrl } from "../lib/bridge";
import { runAnalysis } from "../lib/run-analysis";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/llm-status", async (_req, res): Promise<void> => {
  const activeProvider = getActiveProvider();

  const anthropicConfigured = isAnthropicConfigured();
  const anthropicOnline = anthropicConfigured ? await pingAnthropic() : false;

  const ollamaUrl = getOllamaBaseUrl();
  let ollamaOnline = false;
  let ollamaModels: string[] = [];
  if (ollamaUrl) {
    ollamaOnline = await pingOllama(ollamaUrl);
    if (ollamaOnline) ollamaModels = await listOllamaModels(ollamaUrl);
  }

  const dbBridgeConfigured = isDbBridgeConfigured();
  const dbBridgeOnline = dbBridgeConfigured ? await pingDbBridge() : false;

  const configured = activeProvider !== null;
  const online = activeProvider === "ollama" ? ollamaOnline
    : activeProvider === "anthropic" ? anthropicOnline
    : false;
  const hasFallback = isAnthropicFallbackAvailable() && anthropicConfigured;

  res.json({
    provider: activeProvider ?? "none",
    configured,
    online,
    hasFallback,
    anthropic: {
      configured: anthropicConfigured,
      online: anthropicOnline,
      model: anthropicConfigured ? getAnthropicModel() : null,
    },
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

// Legacy SSE endpoint — still supported for backward compatibility.
// New clients should use POST /api/jobs instead.
router.post("/analyze", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { sessionId, workflowKey, module, formData, pasteText, observations, continueFrom, thinkMode } = req.body;

  if (!workflowKey || !module) {
    res.status(400).json({ error: "Missing workflowKey or module" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const ctrl = new AbortController();
  req.on("close", () => ctrl.abort("client_closed"));

  // Keep-alive heartbeat
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
    }
  }, 15_000);

  try {
    await runAnalysis(
      {
        userId,
        sessionId: sessionId ? Number(sessionId) : undefined,
        workflowKey,
        module,
        formData,
        pasteText,
        observations,
        continueFrom,
        thinkMode: thinkMode === "fast" ? "fast" : "deep",
      },
      (event) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      },
      ctrl.signal
    );

    clearInterval(heartbeatInterval);
    if (!res.writableEnded) res.end();
  } catch (err: any) {
    clearInterval(heartbeatInterval);
    logger.error({ err }, "Erro durante streaming de análise (legacy SSE)");
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message ?? "Falha na análise" })}\n\n`);
      res.end();
    }
  }
});

export default router;
