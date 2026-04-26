import { Router, type IRouter } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.userId, userId));
  res.json(docs.map(d => ({
    id: d.id,
    userId: d.userId,
    filename: d.filename,
    module: d.module,
    status: d.status,
    chunkCount: d.chunkCount,
    createdAt: d.createdAt.toISOString(),
  })));
});

router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { filename, content, module } = req.body;

  if (!filename || content == null || !module) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const CHUNK_SIZE = 1000;
  const chunkCount = Math.ceil(content.length / CHUNK_SIZE);

  const [doc] = await db.insert(documentsTable).values({
    userId,
    filename,
    content,
    module,
    status: "ready",
    chunkCount,
  }).returning();

  res.status(201).json({
    id: doc.id,
    userId: doc.userId,
    filename: doc.filename,
    module: doc.module,
    status: doc.status,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
  });
});

router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }

  const [deleted] = await db.delete(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
