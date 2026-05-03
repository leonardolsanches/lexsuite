import {
  localQueryOne,
  setJobDone,
  setJobError,
  setJobCancelled,
  appendJobEvent,
  claimNextQueuedJob,
} from "./local-db";
import { runAnalysis, type AnalysisEvent } from "./run-analysis";
import { getActiveProvider } from "./llm";
import { logger } from "./logger";

/** Max parallel jobs per provider */
const CONCURRENCY: Record<string, number> = {
  anthropic: 3,
  ollama: 1,
};
const DEFAULT_CONCURRENCY = 1;

type Listener = (event: AnalysisEvent) => void;

class JobQueue {
  private runningCount = 0;
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

  private get concurrencyLimit(): number {
    const provider = getActiveProvider();
    return provider ? (CONCURRENCY[provider] ?? DEFAULT_CONCURRENCY) : DEFAULT_CONCURRENCY;
  }

  /**
   * Signal the queue to fill available worker slots. Non-blocking.
   * Safe to call multiple times — only spawns up to (limit - running) workers.
   */
  kick() {
    const limit = this.concurrencyLimit;
    const slots = limit - this.runningCount;
    for (let i = 0; i < slots; i++) {
      this.spawnWorker();
    }
  }

  private spawnWorker(): void {
    this.processOne().catch((err) => {
      logger.error({ err }, "job-queue: erro inesperado no worker");
      this.runningCount = Math.max(0, this.runningCount - 1);
      this.kick();
    });
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

  /**
   * Attempts to claim one queued job and run it.
   * If no job is available, returns immediately.
   * On completion, calls kick() to fill the freed slot.
   */
  private async processOne(): Promise<void> {
    const job = await claimNextQueuedJob();
    if (!job) return; // nothing to do

    this.runningCount++;
    const { id: jobId } = job;

    const provider = getActiveProvider() ?? "none";
    logger.info(
      { jobId, workflowKey: job.workflowKey, provider, running: this.runningCount },
      "job-queue: iniciando job"
    );

    const ctrl = new AbortController();
    this.abortControllers.set(jobId, ctrl);

    // Job is already marked 'running' by claimNextQueuedJob — just notify listeners
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
      this.runningCount = Math.max(0, this.runningCount - 1);
      // Always try to pick up the next job when a slot frees up
      this.kick();
    }

    if (cancelled) {
      await setJobCancelled(jobId).catch(() => {});
    } else if (!failed) {
      await setJobDone(jobId, outputHtml).catch(() => {});
    }

    logger.info({ jobId, cancelled, failed, running: this.runningCount }, "job-queue: job finalizado");
  }
}

export const jobQueue = new JobQueue();
