import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";
import { getOllamaBaseUrl, warmupOllama } from "./lib/ollama";
import { loadConfigFromDb } from "./lib/runtime-config";
import { ensureJobsTable, ensureAppTables } from "./lib/local-db";
import { jobQueue } from "./lib/job-queue";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Phase 1: ensure local DB tables exist
  await ensureAppTables().catch((err) => {
    logger.error({ err }, "ensureAppTables falhou — servidor pode ter problemas");
  });

  // Phase 2: load all operator config from local PostgreSQL
  // (API keys, model overrides, DB Bridge URL — all local now, no bridge needed)
  await loadConfigFromDb().catch((err) => {
    logger.warn({ err }, "loadConfigFromDb falhou — usando apenas variáveis de ambiente");
  });

  // Phase 3: ensure jobs table, seed data, start job queue
  ensureJobsTable()
    .then(async () => {
      await seedDatabase().catch((err) => {
        logger.error({ err }, "Seed falhou — servidor continua no ar");
      });
      jobQueue.kick();
      logger.info("job-queue: inicializado e pronto");
    })
    .catch((err) => {
      logger.error({ err }, "job-queue: falha na inicialização — análises via fila indisponíveis");
    });

  // Phase 4: warm up Ollama models in background (non-blocking)
  const ollamaBaseUrl = getOllamaBaseUrl();
  if (ollamaBaseUrl) {
    logger.info("Iniciando warm-up dos modelos Ollama em background...");
    warmupOllama(ollamaBaseUrl).then(() => {
      logger.info("Warm-up dos modelos Ollama concluído");
    }).catch((err) => {
      logger.warn({ err }, "Warm-up Ollama falhou — servidor continua no ar");
    });
  }
});
