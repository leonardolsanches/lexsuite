import { Router, type IRouter } from "express";
import { db, workflowsTable, promptsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/workflows", requireAuth, async (req, res): Promise<void> => {
  const module = req.query.module as string | undefined;
  let query = db.select().from(workflowsTable).orderBy(workflowsTable.sortOrder);
  const workflows = await (module
    ? db.select().from(workflowsTable).where(eq(workflowsTable.module, module)).orderBy(workflowsTable.sortOrder)
    : db.select().from(workflowsTable).orderBy(workflowsTable.sortOrder));
  res.json(workflows.map(w => ({
    id: w.id,
    key: w.key,
    name: w.name,
    subtitle: w.subtitle,
    module: w.module,
    category: w.category,
    promptKey: w.promptKey,
    fields: w.fields,
    sortOrder: w.sortOrder,
  })));
});

router.get("/prompts/:key", requireAuth, async (req, res): Promise<void> => {
  const key = req.params.key as string;
  const [prompt] = await db.select().from(promptsTable).where(eq(promptsTable.key, key)).limit(1);
  if (!prompt) {
    res.status(404).json({ error: "Prompt not found" });
    return;
  }
  res.json({ key: prompt.key, content: prompt.content, module: prompt.module });
});

export default router;
