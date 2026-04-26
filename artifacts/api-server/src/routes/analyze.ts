import { Router, type IRouter } from "express";
import { db, sessionsTable, promptsTable, workflowsTable, documentsTable, userModulesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getAnthropicClient, isAnthropicConfigured, DEFAULT_MODEL, MAX_TOKENS } from "../lib/anthropic";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/analyze", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { sessionId, workflowKey, module, formData, pasteText, observations, continueFrom } = req.body;

  if (!workflowKey || !module) {
    res.status(400).json({ error: "Missing workflowKey or module" });
    return;
  }

  if (!isAnthropicConfigured()) {
    res.status(503).json({ error: "Anthropic API not configured. Set ANTHROPIC_API_KEY environment variable." });
    return;
  }

  const activeModules = await db.select().from(userModulesTable)
    .where(eq(userModulesTable.userId, userId));
  const hasModule = activeModules.some(m => m.module === module);
  if (!hasModule) {
    res.status(403).json({ error: `Module '${module}' is not activated for your account` });
    return;
  }

  const [prompt] = await db.select().from(promptsTable)
    .where(eq(promptsTable.key, workflowKey))
    .limit(1);

  const [workflow] = await db.select().from(workflowsTable)
    .where(eq(workflowsTable.key, workflowKey))
    .limit(1);

  if (!prompt) {
    res.status(404).json({ error: "Prompt not found for workflow" });
    return;
  }

  const userDocs = await db.select().from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.module, module), eq(documentsTable.status, "ready")));

  let dataSection = "";
  if (pasteText) {
    dataSection = `TEXTO COLADO PELO USUÁRIO:\n${pasteText}\n\n`;
  }
  if (formData && typeof formData === "object") {
    const fields = Object.entries(formData)
      .filter(([_, v]) => v !== "" && v != null)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    if (fields) {
      dataSection += `DADOS DO FORMULÁRIO:\n${fields}\n\n`;
    }
  }
  if (observations) {
    dataSection += `OBSERVAÇÕES ADICIONAIS:\n${observations}\n\n`;
  }
  if (userDocs.length > 0) {
    const docsContext = userDocs.map(d => `[${d.filename}]: ${d.content.slice(0, 2000)}`).join("\n\n");
    dataSection += `BASE DE CONHECIMENTO (documentos indexados):\n${docsContext}\n\n`;
  }

  const fullPrompt = prompt.content.replace("{{DADOS}}", dataSection || "(nenhum dado fornecido)");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let sessionRecord: { id: number } | undefined;
  if (sessionId) {
    const [s] = await db.select().from(sessionsTable)
      .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
      .limit(1);
    sessionRecord = s;
  }

  if (sessionRecord) {
    await db.update(sessionsTable).set({ status: "running", formData: formData ? JSON.stringify(formData) : null }).where(eq(sessionsTable.id, sessionRecord.id));
  }

  let fullOutput = "";

  try {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: fullPrompt }
    ];
    if (continueFrom) {
      messages.push({ role: "assistant", content: continueFrom });
      messages.push({ role: "user", content: "Continue a análise do ponto onde parou." });
    }

    const anthropic = getAnthropicClient();
    const stream = anthropic.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        const text = chunk.delta.text;
        fullOutput += text;
        res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

    if (sessionRecord) {
      await db.update(sessionsTable).set({
        status: "done",
        outputHtml: fullOutput,
      }).where(eq(sessionsTable.id, sessionRecord.id));
    }
  } catch (err: any) {
    logger.error({ err }, "Error during analysis stream");
    if (sessionRecord) {
      await db.update(sessionsTable).set({ status: "error" }).where(eq(sessionsTable.id, sessionRecord.id));
    }
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message ?? "Analysis failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
