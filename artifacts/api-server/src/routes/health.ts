import { Router, type IRouter } from "express";
import { getDbBridgeUrl, pingDbBridge, bridgeQuery } from "../lib/bridge";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/debug", async (_req, res) => {
  const url = getDbBridgeUrl();
  const maskedUrl = url
    ? url.slice(0, 12) + "..." + url.slice(-10)
    : null;

  const result: Record<string, unknown> = {
    db_bridge_url_set: !!url,
    db_bridge_url_masked: maskedUrl,
    ping: null,
    select_1: null,
    workflows_count: null,
    error: null,
  };

  try {
    result.ping = await pingDbBridge();
  } catch (e) {
    result.ping = false;
    result.error = `ping: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (result.ping) {
    try {
      const rows = await bridgeQuery("SELECT 1 AS ok");
      result.select_1 = rows[0]?.ok ?? null;
    } catch (e) {
      result.error = `select_1: ${e instanceof Error ? e.message : String(e)}`;
    }

    try {
      const rows = await bridgeQuery("SELECT COUNT(*)::int AS n FROM workflows");
      result.workflows_count = rows[0]?.n ?? null;
    } catch (e) {
      result.error = `workflows: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  res.json(result);
});

export default router;
