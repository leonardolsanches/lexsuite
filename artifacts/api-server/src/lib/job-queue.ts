import {
  localQueryOne,
  setJobRunning,
  setJobDone,
  setJobError,
  setJobCancelled,
  appendJobEvent,
  getNextQueuedJob,
} from "./local-db";
import { runAnalysis, type AnalysisEvent } from "./run-analysis";
import { logger } from "./logger";

type Listener = (event: AnalysisEvent) => void;

class JobQueue {
  private processing = false;
  private listeners = new Map<string, Set<Listener>>();
  private abortControllers = new Map<string, AbortController>();

  /** Subscribe to live events for a job. Returns an unsubscribe function. */
  subscribe(jobId: string, listener: Listener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);
    return () => {
      const set = this.listeners.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(jobId);
      }
    };
  }

  private emit(jobId: string, event: AnalysisEvent) {
    const set = this.listeners.get(jobId);
    if (set) {
      for (const fn of set) {
        try { fn(event); } catch { /* ignore */ }
      }
    }
  }

  /** Signal the queue to start processing. Non-blocking. */
  kick() {
    if (!this.processing) {
      this.processNext().catch((err) => {
        logger.error({ err }, "job-queue: erro inesperado no worker");
        this.processing = false;
      });
    }
  }

  /** Cancel a job — queued jobs are cancelled immediately; running jobs are aborted. */
  async cancel(jobId: string, userId: string): Promise<boolean> {
    const row = await localQueryOne(
      "SELECT id, status, user_id FROM analysis_jobs WHERE id = $1 AND user_id = $2",
      [jobId, userId]
    );
    if (!row) return false;

    const status = row.status as string;

    if (status === "queued") {
      await setJobCancelled(jobId);
      this.emit(jobId, { type: "error", message: "Análise cancelada pelo usuário." });
      return true;
    }

    if (status === "running") {
      const ctrl = this.abortControllers.get(jobId);
      if (ctrl) ctrl.abort("cancelled");
      return true;
    }

    return false;
  }

  private async processNext(): Promise<void> {
    this.processing = true;
    try {
      while (true) {
        const job = await getNextQueuedJob();
        if (!job) break;

        const { id: jobId } = job;
        logger.info({ jobId, workflowKey: job.workflowKey }, "job-queue: iniciando job");

        const ctrl = new AbortController();
        this.abortControllers.set(jobId, ctrl);

        await setJobRunning(jobId);
        this.emit(jobId, { type: "running" });

        let outputHtml = "";
        let failed = false;
        let cancelled = false;

        try {
          outputHtml = await runAnalysis(
            {
              userId: job.userId,
              sessionId: job.sessionId ?? undefined,
              workflowKey: job.workflowKey,
              module: job.module,
              formData: job.payload.formData as Record<string, unknown> | undefined,
              pasteText: job.payload.pasteText as string | undefined,
              observations: job.payload.observations as string | undefined,
              continueFrom: job.payload.continueFrom as string | undefined,
              thinkMode: job.thinkMode,
            },
            (event) => {
              this.emit(jobId, event);
              // Persist progress to DB (best-effort, non-blocking)
              appendJobEvent(jobId, event).catch(() => {});
            },
            ctrl.signal
          );

          cancelled = ctrl.signal.aborted;
        } catch (err: unknown) {
          failed = true;
          const msg = err instanceof Error ? err.message : "Erro interno";
          this.emit(jobId, { type: "error", message: msg });
          await setJobError(jobId, msg).catch(() => {});
          logger.error({ err, jobId }, "job-queue: erro no job");
        } finally {
          this.abortControllers.delete(jobId);
        }

        if (cancelled) {
          await setJobCancelled(jobId).catch(() => {});
        } else if (!failed) {
          await setJobDone(jobId, outputHtml).catch(() => {});
        }

        logger.info({ jobId, cancelled, failed }, "job-queue: job finalizado");
      }
    } finally {
      this.processing = false;
    }
  }
}

export const jobQueue = new JobQueue();
