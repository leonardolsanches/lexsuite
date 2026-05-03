import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  createJob,
  getJob,
  getUserJobs,
  type AnalysisJob,
} from "../lib/local-db";
import { jobQueue } from "../lib/job-queue";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function mapJobForClient(job: AnalysisJob) {
  return {
    id: job.id,
    workflowKey: job.workflowKey,
    module: job.module,
    thinkMode: job.thinkMode,
    status: job.status,
    outputHtml: job.outputHtml,
    errorMessage: job.errorMessage,
    progressEvents: job.progressEvents,
    queuedAt: job.queuedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

// ── POST /api/jobs — enqueue a new analysis job ─────────────────────────────
router.post("/jobs", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const {
    sessionId,
    workflowKey,
    module,
    formData,
    pasteText,
    observations,
    continueFrom,
    thinkMode,
  } = req.body;

  if (!workflowKey || !module) {
    res.status(400).json({ error: "workflowKey e module são obrigatórios" });
    return;
  }

  try {
    const jobId = await createJob({
      userId,
      sessionId: sessionId ? Number(sessionId) : undefined,
      workflowKey,
      module,
      payload: { formData, pasteText, observations, continueFrom },
      thinkMode: thinkMode === "fast" ? "fast" : "deep",
    });

    // Kick the worker — non-blocking
    jobQueue.kick();

    logger.info({ jobId, workflowKey, module }, "job enfileirado");
    res.status(202).json({ jobId });
  } catch (err: any) {
    logger.error({ err }, "POST /jobs: erro ao criar job");
    res.status(500).json({ error: err.message ?? "Erro interno" });
  }
});

// ── GET /api/jobs — list user's jobs ────────────────────────────────────────
router.get("/jobs", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const status = req.query.status as string | undefined;
  const module = req.query.module as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 20), 50);

  try {
    const jobs = await getUserJobs(userId, { status, module, limit });
    res.json(jobs.map(mapJobForClient));
  } catch (err: any) {
    logger.error({ err }, "GET /jobs: erro");
    res.status(500).json({ error: err.message ?? "Erro interno" });
  }
});

// ── GET /api/jobs/:id — get single job status + result ─────────────────────
router.get("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const jobId = String(req.params.id);

  try {
    const job = await getJob(jobId, userId);
    if (!job) {
      res.status(404).json({ error: "Job não encontrado" });
      return;
    }
    res.json(mapJobForClient(job));
  } catch (err: any) {
    logger.error({ err, jobId }, "GET /jobs/:id: erro");
    res.status(500).json({ error: err.message ?? "Erro interno" });
  }
});

// ── GET /api/jobs/:id/events — SSE stream for live progress ─────────────────
router.get("/jobs/:id/events", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const jobId = String(req.params.id);

  // Verify ownership
  const job = await getJob(jobId, userId).catch(() => null);
  if (!job) {
    res.status(404).json({ error: "Job não encontrado" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: unknown) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  // If job is already done/error/cancelled, replay stored events and close
  if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
    for (const event of job.progressEvents) {
      send(event);
    }
    if (job.status === "done") {
      // Resend outputHtml as text events aren't stored efficiently — send full output once
      if (job.outputHtml) {
        send({ type: "text", text: job.outputHtml });
      }
      send({ type: "done" });
    } else {
      const msg = job.errorMessage ?? (job.status === "cancelled" ? "Análise cancelada." : "Erro desconhecido");
      send({ type: "error", message: msg });
    }
    res.end();
    return;
  }

  // Job is queued or running — replay stored events then subscribe to live ones
  for (const event of job.progressEvents) {
    send(event);
  }

  // Heartbeat to keep connection alive while queued/waiting
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
    }
  }, 15_000);

  const unsubscribe = jobQueue.subscribe(jobId, (event) => {
    send(event);
    if (event.type === "done" || event.type === "error") {
      clearInterval(heartbeatInterval);
      unsubscribe();
      if (!res.writableEnded) res.end();
    }
  });

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
  });
});

// ── DELETE /api/jobs/:id — cancel a job ─────────────────────────────────────
router.delete("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const jobId = String(req.params.id);

  try {
    const cancelled = await jobQueue.cancel(jobId, userId);
    if (!cancelled) {
      res.status(404).json({ error: "Job não encontrado ou já finalizado" });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err, jobId }, "DELETE /jobs/:id: erro");
    res.status(500).json({ error: err.message ?? "Erro interno" });
  }
});

export default router;
