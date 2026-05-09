import { Router, type IRouter } from "express";
import { setDbBridgeUrl } from "../lib/bridge";
import { setConfig } from "../lib/runtime-config";
import { saveLocalDbConfig } from "../lib/local-db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * POST /api/tunnel-update
 *
 * Called by the Mini PC startup script whenever Cloudflare tunnels restart
 * and URLs change. Protected by TUNNEL_SECRET env var.
 *
 * Body: { secret, ollamaBaseUrl?, dbBridgeUrl? }
 */
router.post("/tunnel-update", async (req, res): Promise<void> => {
  const secret = process.env.TUNNEL_SECRET;

  if (!secret) {
    res.status(503).json({ error: "TUNNEL_SECRET não configurado no servidor." });
    return;
  }

  const { secret: provided, ollamaBaseUrl, dbBridgeUrl } = req.body as {
    secret?: string;
    ollamaBaseUrl?: string;
    dbBridgeUrl?: string;
  };

  if (provided !== secret) {
    res.status(401).json({ error: "Token inválido." });
    return;
  }

  const updated: string[] = [];

  if (ollamaBaseUrl && ollamaBaseUrl.startsWith("http")) {
    const clean = ollamaBaseUrl.trim().replace(/\/+$/, "");
    await setConfig("ollama_base_url", clean);
    updated.push("ollama_base_url");
    logger.info({ url: clean.slice(0, 40) }, "tunnel-update: OLLAMA_BASE_URL atualizado");
  }

  if (dbBridgeUrl && dbBridgeUrl.startsWith("http")) {
    const clean = dbBridgeUrl.trim().replace(/\/+$/, "");
    setDbBridgeUrl(clean);
    await saveLocalDbConfig("db_bridge_url", clean);
    updated.push("db_bridge_url");
    logger.info({ url: clean.slice(0, 40) }, "tunnel-update: DB_BRIDGE_URL atualizado");
  }

  res.json({ ok: true, updated });
});

export default router;
