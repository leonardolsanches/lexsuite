import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { bridgeQuery, bridgeQueryOne } from "../lib/bridge";

const router: IRouter = Router();

router.get("/workflows", requireAuth, async (req, res): Promise<void> => {
  const module = req.query.module as string | undefined;

  const workflows = module
    ? await bridgeQuery(
        "SELECT * FROM workflows WHERE module = $1 ORDER BY sort_order",
        [module]
      )
    : await bridgeQuery("SELECT * FROM workflows ORDER BY sort_order");

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
});

router.get("/prompts/:key", requireAuth, async (req, res): Promise<void> => {
  const key = req.params.key as string;

  const prompt = await bridgeQueryOne(
    "SELECT * FROM prompts WHERE key = $1",
    [key]
  );

  if (!prompt) {
    res.status(404).json({ error: "Prompt not found" });
    return;
  }

  res.json({ key: prompt.key, content: prompt.content, module: prompt.module });
});

export default router;
