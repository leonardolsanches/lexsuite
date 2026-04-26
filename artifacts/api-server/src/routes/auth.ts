import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { isOllamaConfigured, getOllamaBaseUrl, getOllamaModelParecer } from "../lib/ollama";
import { bridgeQuery, bridgeQueryOne, bridgeExecute, toIso } from "../lib/bridge";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId!;
  const userEmail =
    (auth as any)?.sessionClaims?.email as string | undefined ??
    (auth as any)?.sessionClaims?.primaryEmail as string | undefined ??
    `${userId}@unknown.com`;
  const userName = (auth as any)?.sessionClaims?.firstName as string | undefined;

  const user = await getOrCreateUser(userId, userEmail, userName ?? null);
  const modules = await bridgeQuery(
    "SELECT id, user_id, module, activated_at FROM user_modules WHERE user_id = $1",
    [userId]
  );

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    activeModules: modules.map(m => m.module),
    createdAt: toIso(user.created_at),
  });
});

router.get("/modules", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const modules = await bridgeQuery(
    "SELECT id, user_id, module, activated_at FROM user_modules WHERE user_id = $1",
    [userId]
  );
  res.json(modules.map(m => ({
    id: m.id,
    userId: m.user_id,
    module: m.module,
    activatedAt: toIso(m.activated_at),
  })));
});

router.post("/modules/:module/activate", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const module = req.params.module as string;

  if (!["executio", "rural"].includes(module)) {
    res.status(400).json({ error: "Invalid module" });
    return;
  }

  const existing = await bridgeQueryOne(
    "SELECT id, user_id, module, activated_at FROM user_modules WHERE user_id = $1 AND module = $2",
    [userId, module]
  );

  if (existing) {
    res.json({ id: existing.id, userId: existing.user_id, module: existing.module, activatedAt: toIso(existing.activated_at) });
    return;
  }

  const newModule = await bridgeQueryOne(
    "INSERT INTO user_modules (user_id, module) VALUES ($1, $2) RETURNING id, user_id, module, activated_at",
    [userId, module]
  );

  if (!newModule) {
    res.status(500).json({ error: "Falha ao ativar módulo" });
    return;
  }

  res.status(201).json({
    id: newModule.id,
    userId: newModule.user_id,
    module: newModule.module,
    activatedAt: toIso(newModule.activated_at),
  });
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
