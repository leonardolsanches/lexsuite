import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, userModulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { isOllamaConfigured, getOllamaBaseUrl, getOllamaModelParecer } from "../lib/ollama";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId!;
  const userEmail = (auth as any)?.sessionClaims?.email as string | undefined
    ?? (auth as any)?.sessionClaims?.primaryEmail as string | undefined
    ?? `${userId}@unknown.com`;
  const userName = (auth as any)?.sessionClaims?.firstName as string | undefined;

  const user = await getOrCreateUser(userId, userEmail, userName ?? null);
  const modules = await db.select().from(userModulesTable).where(eq(userModulesTable.userId, userId));

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    activeModules: modules.map(m => m.module),
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/modules", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const modules = await db.select().from(userModulesTable).where(eq(userModulesTable.userId, userId));
  res.json(modules.map(m => ({
    id: m.id,
    userId: m.userId,
    module: m.module,
    activatedAt: m.activatedAt.toISOString(),
  })));
});

router.post("/modules/:module/activate", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const module = req.params.module as string;
  if (!["executio", "rural"].includes(module)) {
    res.status(400).json({ error: "Invalid module" });
    return;
  }
  const existing = await db.select().from(userModulesTable)
    .where(eq(userModulesTable.userId, userId))
    .limit(20);
  const already = existing.find(m => m.module === module);
  if (already) {
    res.json({ id: already.id, userId: already.userId, module: already.module, activatedAt: already.activatedAt.toISOString() });
    return;
  }
  const [newModule] = await db.insert(userModulesTable).values({ userId, module: module as "executio" | "rural" }).returning();
  res.status(201).json({ id: newModule.id, userId: newModule.userId, module: newModule.module, activatedAt: newModule.activatedAt.toISOString() });
});

router.get("/api-config", requireAuth, async (_req, res): Promise<void> => {
  res.json({
    llmConfigured: isOllamaConfigured(),
    llmProvider: "ollama",
    llmModel: getOllamaModelParecer(),
    llmUrl: getOllamaBaseUrl() ? "configured" : null,
    availableModules: ["executio", "rural"],
    maxSessionsPerUser: 8,
  });
});

export default router;
