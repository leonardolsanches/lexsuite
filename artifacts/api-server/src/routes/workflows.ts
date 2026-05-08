import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { localQuery, localQueryOne } from "../lib/local-db";

const router: IRouter = Router();

router.get("/workflows", requireAuth, async (req, res, next): Promise<void> => {
  const module = req.query.module as string | undefined;
  try {
    const workflows = module
      ? await localQuery(
          "SELECT * FROM workflows WHERE module = $1 ORDER BY sort_order",
          [module]
        )
      : await localQuery("SELECT * FROM workflows ORDER BY sort_order");

    res.json(workflows.map(w => ({
      id: w.id,
      key: w.key,
      name: w.name,
      subtitle: w.subtitle,
      module: w.module,
      category: w.category ?? null,
      promptKey: w.prompt_key,
      fields: w.fields,
      sortOrder: w.sort_order,
    })));
  } catch (err) {
    req.log.error({ err }, "GET /api/workflows falhou");
    next(err);
  }
});

router.get("/prompts/:key", requireAuth, async (req, res, next): Promise<void> => {
  const key = req.params.key as string;
  try {
    const prompt = await localQueryOne(
      "SELECT * FROM prompts WHERE key = $1",
      [key]
    );

    if (!prompt) {
      res.status(404).json({ error: "Prompt not found" });
      return;
    }

    res.json({ key: prompt.key, content: prompt.content, module: prompt.module });
  } catch (err) {
    req.log.error({ err }, "GET /api/prompts/:key falhou");
    next(err);
  }
});

export default router;
