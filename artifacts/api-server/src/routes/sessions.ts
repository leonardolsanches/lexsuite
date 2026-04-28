import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { bridgeQuery, bridgeQueryOne, bridgeExecute, toIso, type Row } from "../lib/bridge";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function mapSession(s: Row) {
  return {
    id: s.id,
    userId: s.user_id,
    workflowKey: s.workflow_key,
    module: s.module,
    label: s.label,
    mode: s.mode,
    status: s.status,
    outputHtml: s.output_html ?? null,
    formData: s.form_data ?? null,
    createdAt: toIso(s.created_at),
    updatedAt: toIso(s.updated_at),
  };
}

router.get("/sessions", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const module = req.query.module as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  try {
    const sessions = module
      ? await bridgeQuery(
          "SELECT * FROM sessions WHERE user_id = $1 AND module = $2 ORDER BY created_at DESC LIMIT $3",
          [userId, module, limit]
        )
      : await bridgeQuery(
          "SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
          [userId, limit]
        );
    res.json(sessions.map(mapSession));
  } catch (err) {
    logger.warn({ err }, "GET /sessions: DB Bridge indisponível");
    res.json([]);
  }
});

router.post("/sessions", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { workflowKey, module, label, mode, formData } = req.body;

  if (!workflowKey || !module || !label || !mode) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const session = await bridgeQueryOne(
      `INSERT INTO sessions (user_id, workflow_key, module, label, mode, form_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'idle')
       RETURNING *`,
      [userId, workflowKey, module, label, mode, formData ?? null]
    );

    if (!session) {
      res.status(500).json({ error: "Falha ao criar sessão" });
      return;
    }

    res.status(201).json(mapSession(session));
  } catch (err: any) {
    logger.warn({ err }, "POST /sessions: DB Bridge indisponível ou sem permissão");
    res.status(503).json({ error: "Banco de dados de sessões indisponível. Verifique as permissões do DB Bridge." });
  }
});

router.get("/sessions/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const all = await bridgeQuery(
      "SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    const thisMonth = all.filter(s => new Date(s.created_at as string) >= startOfMonth).length;
    const executioCount = all.filter(s => s.module === "executio").length;
    const ruralCount = all.filter(s => s.module === "rural").length;
    const recent = all.slice(0, 5);
    res.json({
      totalSessions: all.length,
      sessionsByModule: { executio: executioCount, rural: ruralCount },
      recentSessions: recent.map(mapSession),
      sessionsThisMonth: thisMonth,
    });
  } catch (err) {
    logger.warn({ err }, "GET /sessions/stats: DB Bridge indisponível");
    res.json({
      totalSessions: 0,
      sessionsByModule: { executio: 0, rural: 0 },
      recentSessions: [],
      sessionsThisMonth: 0,
    });
  }
});

router.get("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  try {
    const session = await bridgeQueryOne(
      "SELECT * FROM sessions WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(mapSession(session));
  } catch (err) {
    logger.warn({ err }, "GET /sessions/:id: DB Bridge indisponível");
    res.status(503).json({ error: "Banco de dados de sessões indisponível" });
  }
});

router.patch("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const { label, status, outputHtml, formData } = req.body;

  try {
    const session = await bridgeQueryOne(
      `UPDATE sessions SET
         label = COALESCE($3, label),
         status = COALESCE($4, status),
         output_html = COALESCE($5, output_html),
         form_data = COALESCE($6, form_data),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, label ?? null, status ?? null, outputHtml ?? null, formData ?? null]
    );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(mapSession(session));
  } catch (err) {
    logger.warn({ err }, "PATCH /sessions/:id: DB Bridge indisponível");
    res.status(503).json({ error: "Banco de dados de sessões indisponível" });
  }
});

router.delete("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  try {
    const { rowCount } = await bridgeExecute(
      "DELETE FROM sessions WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    logger.warn({ err }, "DELETE /sessions/:id: DB Bridge indisponível");
    res.status(503).json({ error: "Banco de dados de sessões indisponível" });
  }
});

export default router;
