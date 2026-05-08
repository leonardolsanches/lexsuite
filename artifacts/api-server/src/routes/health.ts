import { Router, type IRouter } from "express";
import { getDbBridgeUrl, pingDbBridge } from "../lib/bridge";
import { localQuery } from "../lib/local-db";

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
    local_workflows_count: null,
    error: null,
  };

  try {
    result.ping = await pingDbBridge();
  } catch (e) {
    result.ping = false;
    result.error = `ping: ${e instanceof Error ? e.message : String(e)}`;
  }

  try {
    const rows = await localQuery("SELECT COUNT(*)::int AS n FROM workflows");
    result.local_workflows_count = rows[0]?.n ?? 0;
  } catch (e) {
    result.error = `workflows: ${e instanceof Error ? e.message : String(e)}`;
  }

  res.json(result);
});

export default router;
