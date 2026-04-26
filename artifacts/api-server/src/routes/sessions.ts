import { Router, type IRouter } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq, and, desc, count, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/sessions", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const module = req.query.module as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);

  const sessions = await (module
    ? db.select().from(sessionsTable)
        .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.module, module)))
        .orderBy(desc(sessionsTable.createdAt)).limit(limit)
    : db.select().from(sessionsTable)
        .where(eq(sessionsTable.userId, userId))
        .orderBy(desc(sessionsTable.createdAt)).limit(limit));

  res.json(sessions.map(s => ({
    id: s.id,
    userId: s.userId,
    workflowKey: s.workflowKey,
    module: s.module,
    label: s.label,
    mode: s.mode,
    status: s.status,
    outputHtml: s.outputHtml,
    formData: s.formData,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
});

router.post("/sessions", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { workflowKey, module, label, mode, formData } = req.body;

  if (!workflowKey || !module || !label || !mode) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [session] = await db.insert(sessionsTable).values({
    userId,
    workflowKey,
    module,
    label,
    mode,
    formData: formData ?? null,
    status: "idle",
  }).returning();

  res.status(201).json({
    id: session.id,
    userId: session.userId,
    workflowKey: session.workflowKey,
    module: session.module,
    label: session.label,
    mode: session.mode,
    status: session.status,
    outputHtml: session.outputHtml,
    formData: session.formData,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });
});

router.get("/sessions/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const all = await db.select().from(sessionsTable).where(eq(sessionsTable.userId, userId));
  const thisMonth = all.filter(s => s.createdAt >= startOfMonth).length;
  const executioCount = all.filter(s => s.module === "executio").length;
  const ruralCount = all.filter(s => s.module === "rural").length;
  const recent = all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);

  res.json({
    totalSessions: all.length,
    sessionsByModule: { executio: executioCount, rural: ruralCount },
    recentSessions: recent.map(s => ({
      id: s.id,
      userId: s.userId,
      workflowKey: s.workflowKey,
      module: s.module,
      label: s.label,
      mode: s.mode,
      status: s.status,
      outputHtml: s.outputHtml,
      formData: s.formData,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    sessionsThisMonth: thisMonth,
  });
});

router.get("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db.select().from(sessionsTable)
    .where(and(eq(sessionsTable.id, id), eq(sessionsTable.userId, userId)))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({
    id: session.id,
    userId: session.userId,
    workflowKey: session.workflowKey,
    module: session.module,
    label: session.label,
    mode: session.mode,
    status: session.status,
    outputHtml: session.outputHtml,
    formData: session.formData,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });
});

router.delete("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [deleted] = await db.delete(sessionsTable)
    .where(and(eq(sessionsTable.id, id), eq(sessionsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
