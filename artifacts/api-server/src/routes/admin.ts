import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { getConfig, setConfig, deleteConfig, isAdminUser, loadConfigFromDb } from "../lib/runtime-config";
import { isAnthropicConfigured, getAnthropicModel, pingAnthropic } from "../lib/anthropic";
import { isOllamaConfigured, getOllamaBaseUrl, getOllamaModelParecer, pingOllama } from "../lib/ollama";
import { getActiveProvider } from "../lib/llm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** GET /api/admin/llm-config — returns current LLM config (API key masked) */
router.get("/llm-config", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }

  const rawKey = getConfig("anthropic_api_key", process.env.ANTHROPIC_API_KEY ?? undefined);
  const keyIsSet = !!rawKey;
  const keyPreview = rawKey
    ? rawKey.slice(0, 8) + "..." + rawKey.slice(-4)
    : null;
  const keySource = rawKey
    ? (getConfig("anthropic_api_key") ? "database" : "env")
    : "none";

  const ollamaUrl = getOllamaBaseUrl();
  // Show partial URL for display (hide sensitive tunnel tokens if any)
  const ollamaUrlPreview = ollamaUrl
    ? (ollamaUrl.length > 40 ? ollamaUrl.slice(0, 35) + "..." : ollamaUrl)
    : null;

  res.json({
    provider: getActiveProvider() ?? "none",
    anthropic: {
      configured: keyIsSet,
      keyPreview,
      keySource,
      model: getConfig("anthropic_model", process.env.ANTHROPIC_MODEL ?? undefined) ?? "claude-opus-4-5",
    },
    ollama: {
      configured: isOllamaConfigured(),
      url: ollamaUrlPreview,
      urlSource: ollamaUrl
        ? (getConfig("ollama_base_url") ? "database" : "env")
        : "none",
      model: getOllamaModelParecer(),
    },
  });
});

/** PUT /api/admin/llm-config — set API key and/or model */
router.put("/llm-config", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }

  const { anthropicApiKey, anthropicModel, ollamaBaseUrl } = req.body as {
    anthropicApiKey?: string;
    anthropicModel?: string;
    ollamaBaseUrl?: string;
  };

  if (anthropicApiKey !== undefined) {
    if (anthropicApiKey === "") {
      await deleteConfig("anthropic_api_key");
      logger.info({ userId }, "admin: ANTHROPIC_API_KEY removida");
    } else {
      if (!anthropicApiKey.startsWith("sk-ant-")) {
        res.status(400).json({ error: "Chave inválida — deve começar com sk-ant-" });
        return;
      }
      await setConfig("anthropic_api_key", anthropicApiKey);
      logger.info({ userId }, "admin: ANTHROPIC_API_KEY atualizada");
    }
  }

  if (anthropicModel !== undefined && anthropicModel !== "") {
    await setConfig("anthropic_model", anthropicModel);
    logger.info({ userId, model: anthropicModel }, "admin: ANTHROPIC_MODEL atualizado");
  }

  if (ollamaBaseUrl !== undefined) {
    if (ollamaBaseUrl === "") {
      await deleteConfig("ollama_base_url");
      logger.info({ userId }, "admin: OLLAMA_BASE_URL removida (usa env var)");
    } else {
      if (!ollamaBaseUrl.startsWith("http")) {
        res.status(400).json({ error: "URL inválida — deve começar com http:// ou https://" });
        return;
      }
      await setConfig("ollama_base_url", ollamaBaseUrl.trim().replace(/\/$/, ""));
      logger.info({ userId }, "admin: OLLAMA_BASE_URL atualizada");
    }
  }

  // Ping the updated config to confirm it works
  let pingOk: boolean | null = null;
  if (isAnthropicConfigured()) {
    pingOk = await pingAnthropic();
  }

  const rawKey = getConfig("anthropic_api_key", process.env.ANTHROPIC_API_KEY ?? undefined);
  const newOllamaUrl = getOllamaBaseUrl();
  res.json({
    ok: true,
    provider: getActiveProvider() ?? "none",
    pingOk,
    keyPreview: rawKey
      ? rawKey.slice(0, 8) + "..." + rawKey.slice(-4)
      : null,
    model: getConfig("anthropic_model", process.env.ANTHROPIC_MODEL ?? undefined) ?? "claude-opus-4-5",
    ollama: {
      configured: !!newOllamaUrl,
      urlSource: newOllamaUrl ? (getConfig("ollama_base_url") ? "database" : "env") : "none",
    },
  });
});

/** POST /api/admin/llm-ping — test connectivity to active provider */
router.post("/llm-ping", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }

  const provider = getActiveProvider();
  let online = false;

  if (provider === "anthropic") {
    online = await pingAnthropic();
  } else if (provider === "ollama") {
    const url = getOllamaBaseUrl()!;
    online = await pingOllama(url);
  }

  res.json({ provider: provider ?? "none", online });
});

export default router;
