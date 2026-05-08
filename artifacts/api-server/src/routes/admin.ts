import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { getConfig, setConfig, deleteConfig, isAdminUser, loadConfigFromDb } from "../lib/runtime-config";
import { isAnthropicConfigured, getAnthropicModel, pingAnthropic } from "../lib/anthropic";
import { isOllamaConfigured, getOllamaBaseUrl, getOllamaModelParecer, pingOllama } from "../lib/ollama";
import { getActiveProvider } from "../lib/llm";
import { getDbBridgeUrl, isDbBridgeConfigured, pingDbBridge, setDbBridgeUrl } from "../lib/bridge";
import { saveLocalDbConfig, deleteLocalDbConfig } from "../lib/local-db";
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
  const ollamaUrlPreview = ollamaUrl
    ? (ollamaUrl.length > 40 ? ollamaUrl.slice(0, 35) + "..." : ollamaUrl)
    : null;

  const dbBridgeUrl = getDbBridgeUrl();
  const dbBridgeUrlPreview = dbBridgeUrl
    ? (dbBridgeUrl.length > 40 ? dbBridgeUrl.slice(0, 35) + "..." : dbBridgeUrl)
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
    dbBridge: {
      configured: isDbBridgeConfigured(),
      url: dbBridgeUrlPreview,
      urlSource: dbBridgeUrl
        ? (process.env.DB_BRIDGE_URL && !getDbBridgeUrl()?.includes("trycloudflare") ? "env" : "database")
        : "none",
    },
  });
});

/** PUT /api/admin/llm-config — set API key and/or model and/or tunnel URLs */
router.put("/llm-config", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }

  const { anthropicApiKey, anthropicModel, ollamaBaseUrl, dbBridgeUrl } = req.body as {
    anthropicApiKey?: string;
    anthropicModel?: string;
    ollamaBaseUrl?: string;
    dbBridgeUrl?: string;
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
        res.status(400).json({ error: "URL Ollama inválida — deve começar com http:// ou https://" });
        return;
      }
      await setConfig("ollama_base_url", ollamaBaseUrl.trim().replace(/\/$/, ""));
      logger.info({ userId }, "admin: OLLAMA_BASE_URL atualizada");
    }
  }

  if (dbBridgeUrl !== undefined) {
    if (dbBridgeUrl === "") {
      setDbBridgeUrl("");
      await deleteLocalDbConfig("db_bridge_url").catch(() => {});
      logger.info({ userId }, "admin: DB_BRIDGE_URL removida (usa env var)");
    } else {
      if (!dbBridgeUrl.startsWith("http")) {
        res.status(400).json({ error: "URL DB Bridge inválida — deve começar com http:// ou https://" });
        return;
      }
      const clean = dbBridgeUrl.trim().replace(/\/+$/, "");
      setDbBridgeUrl(clean);
      await saveLocalDbConfig("db_bridge_url", clean).catch(() => {});
      logger.info({ userId }, "admin: DB_BRIDGE_URL atualizada");
    }
  }

  // Ping the updated config to confirm it works
  let pingOk: boolean | null = null;
  if (isAnthropicConfigured()) {
    pingOk = await pingAnthropic();
  }

  const rawKey = getConfig("anthropic_api_key", process.env.ANTHROPIC_API_KEY ?? undefined);
  const newOllamaUrl = getOllamaBaseUrl();
  const newDbBridgeUrl = getDbBridgeUrl();

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
    dbBridge: {
      configured: !!newDbBridgeUrl,
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

/** POST /api/admin/ping-ollama — test Ollama connectivity independently */
router.post("/ping-ollama", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }
  const url = getOllamaBaseUrl();
  if (!url) {
    res.json({ online: false, reason: "URL não configurada" });
    return;
  }
  const online = await pingOllama(url);
  res.json({ online, url: url.slice(0, 40) });
});

/** POST /api/admin/ping-db-bridge — test DB Bridge connectivity independently */
router.post("/ping-db-bridge", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "Acesso restrito a administradores." });
    return;
  }
  const url = getDbBridgeUrl();
  if (!url) {
    res.json({ online: false, reason: "URL não configurada" });
    return;
  }
  const online = await pingDbBridge();
  res.json({ online, url: url.slice(0, 40) });
});

export default router;
