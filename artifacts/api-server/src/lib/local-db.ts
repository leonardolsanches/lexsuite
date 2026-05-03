import pg from "pg";
import { logger } from "./logger";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "local-db: pool error inesperado");
});

export async function localQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function localQueryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await localQuery<T>(sql, params);
  return rows[0] ?? null;
}

export async function localExecute(
  sql: string,
  params: unknown[] = []
): Promise<{ rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

export type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface AnalysisJob {
  id: string;
  userId: string;
  sessionId: number | null;
  workflowKey: string;
  module: string;
  payload: Record<string, unknown>;
  thinkMode: "fast" | "deep";
  status: JobStatus;
  outputHtml: string | null;
  errorMessage: string | null;
  progressEvents: unknown[];
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function ensureJobsTable(): Promise<void> {
  await localExecute(`
    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      session_id INTEGER,
      workflow_key TEXT NOT NULL,
      module TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      think_mode TEXT NOT NULL DEFAULT 'deep',
      status TEXT NOT NULL DEFAULT 'queued',
      output_html TEXT,
      error_message TEXT,
      progress_events JSONB NOT NULL DEFAULT '[]',
      queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ
    )
  `);

  await localExecute(`
    CREATE INDEX IF NOT EXISTS analysis_jobs_user_id_idx ON analysis_jobs (user_id)
  `);
  await localExecute(`
    CREATE INDEX IF NOT EXISTS analysis_jobs_status_idx ON analysis_jobs (status)
  `);

  // On restart: first expire jobs that were stuck running for more than 2 hours
  // (these were genuinely stuck, not just interrupted by a normal restart)
  const stuckExpired = await localExecute(
    `UPDATE analysis_jobs
     SET status = 'error',
         error_message = 'Job travado: análise em execução há mais de 2 horas.',
         finished_at = NOW()
     WHERE status = 'running'
       AND started_at < NOW() - INTERVAL '2 hours'`
  );
  if (stuckExpired.rowCount > 0) {
    logger.warn(
      { count: stuckExpired.rowCount },
      "job-queue: jobs travados há >2h — marcados como 'error'"
    );
  }

  // Reset remaining running jobs (recently started, interrupted by this restart)
  // back to 'queued' so they are automatically retried by kick()
  const requeued = await localExecute(
    `UPDATE analysis_jobs
     SET status = 'queued', started_at = NULL
     WHERE status = 'running'`
  );
  if (requeued.rowCount > 0) {
    logger.warn(
      { count: requeued.rowCount },
      "job-queue: jobs em 'running' na inicialização — resetados para 'queued'"
    );
  }

  // Auto-expire jobs stuck as queued for more than 24 hours
  await localExecute(
    `UPDATE analysis_jobs SET status = 'error', error_message = 'Job expirado (>24h na fila)', finished_at = NOW()
     WHERE status = 'queued' AND queued_at < NOW() - INTERVAL '24 hours'`
  );

  logger.info("local-db: tabela analysis_jobs pronta");
}

export async function createJob(params: {
  userId: string;
  sessionId?: number;
  workflowKey: string;
  module: string;
  payload: Record<string, unknown>;
  thinkMode: "fast" | "deep";
}): Promise<string> {
  const row = await localQueryOne<{ id: string }>(
    `INSERT INTO analysis_jobs (user_id, session_id, workflow_key, module, payload, think_mode)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      params.userId,
      params.sessionId ?? null,
      params.workflowKey,
      params.module,
      JSON.stringify(params.payload),
      params.thinkMode,
    ]
  );
  return row!.id;
}

export async function getJob(jobId: string, userId: string): Promise<AnalysisJob | null> {
  const row = await localQueryOne(
    `SELECT * FROM analysis_jobs WHERE id = $1 AND user_id = $2`,
    [jobId, userId]
  );
  if (!row) return null;
  return mapJob(row);
}

export async function getUserJobs(
  userId: string,
  opts: { status?: string; module?: string; limit?: number } = {}
): Promise<AnalysisJob[]> {
  const conditions: string[] = ["user_id = $1"];
  const params: unknown[] = [userId];
  let idx = 2;

  if (opts.status) {
    const statuses = opts.status.split(",").map(s => s.trim());
    conditions.push(`status = ANY($${idx++})`);
    params.push(statuses);
  }
  if (opts.module) {
    conditions.push(`module = $${idx++}`);
    params.push(opts.module);
  }

  const limit = opts.limit ?? 20;
  params.push(limit);

  const rows = await localQuery(
    `SELECT * FROM analysis_jobs WHERE ${conditions.join(" AND ")}
     ORDER BY queued_at DESC LIMIT $${idx}`,
    params
  );
  return rows.map(mapJob);
}

export async function setJobRunning(jobId: string): Promise<void> {
  await localExecute(
    `UPDATE analysis_jobs SET status = 'running', started_at = NOW() WHERE id = $1`,
    [jobId]
  );
}

export async function appendJobEvent(jobId: string, event: unknown): Promise<void> {
  await localExecute(
    `UPDATE analysis_jobs
     SET progress_events = progress_events || $2::jsonb
     WHERE id = $1`,
    [jobId, JSON.stringify([event])]
  );
}

export async function setJobDone(jobId: string, outputHtml: string): Promise<void> {
  await localExecute(
    `UPDATE analysis_jobs
     SET status = 'done', output_html = $2, finished_at = NOW()
     WHERE id = $1`,
    [jobId, outputHtml]
  );
}

export async function setJobError(jobId: string, message: string): Promise<void> {
  await localExecute(
    `UPDATE analysis_jobs
     SET status = 'error', error_message = $2, finished_at = NOW()
     WHERE id = $1`,
    [jobId, message]
  );
}

export async function setJobCancelled(jobId: string): Promise<void> {
  await localExecute(
    `UPDATE analysis_jobs
     SET status = 'cancelled', finished_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
}

export async function getNextQueuedJob(): Promise<AnalysisJob | null> {
  const row = await localQueryOne(
    `SELECT * FROM analysis_jobs WHERE status = 'queued' ORDER BY queued_at ASC LIMIT 1`
  );
  if (!row) return null;
  return mapJob(row);
}

/**
 * Atomically claims the next queued job and marks it as 'running'.
 * Uses FOR UPDATE SKIP LOCKED so concurrent workers never claim the same job.
 * Returns null if no queued job is available.
 */
export async function claimNextQueuedJob(): Promise<AnalysisJob | null> {
  const rows = await localQuery(
    `WITH next_job AS (
       SELECT id FROM analysis_jobs
       WHERE status = 'queued'
       ORDER BY queued_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE analysis_jobs
     SET status = 'running', started_at = NOW()
     FROM next_job
     WHERE analysis_jobs.id = next_job.id
     RETURNING analysis_jobs.*`
  );
  if (!rows[0]) return null;
  return mapJob(rows[0]);
}

/**
 * Returns the 1-based position of a queued job in the queue.
 * Position 1 = next to run. Returns null if job is not queued.
 */
export async function getJobQueuePosition(jobId: string): Promise<number | null> {
  const row = await localQueryOne<{ position: string }>(
    `SELECT COUNT(*)::int AS position
     FROM analysis_jobs
     WHERE status = 'queued'
       AND queued_at <= (SELECT queued_at FROM analysis_jobs WHERE id = $1)`,
    [jobId]
  );
  if (!row) return null;
  const pos = Number(row.position);
  return pos > 0 ? pos : null;
}

function mapJob(row: Record<string, unknown>): AnalysisJob {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    sessionId: row.session_id as number | null,
    workflowKey: row.workflow_key as string,
    module: row.module as string,
    payload: (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as Record<string, unknown>,
    thinkMode: (row.think_mode as "fast" | "deep") ?? "deep",
    status: row.status as JobStatus,
    outputHtml: row.output_html as string | null,
    errorMessage: row.error_message as string | null,
    progressEvents: (typeof row.progress_events === "string" ? JSON.parse(row.progress_events) : (row.progress_events ?? [])) as unknown[],
    queuedAt: String(row.queued_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
  };
}
