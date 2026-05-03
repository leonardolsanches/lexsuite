import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";
import { getOllamaBaseUrl, warmupOllama } from "./lib/ollama";
import { loadConfigFromDb } from "./lib/runtime-config";
import { ensureJobsTable } from "./lib/local-db";
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

  // Load operator config (API keys, model overrides) from DB before anything else
  loadConfigFromDb().catch((err) => {
    logger.warn({ err }, "loadConfigFromDb falhou — usando apenas variáveis de ambiente");
  });

  seedDatabase().catch((err) => {
    logger.error({ err }, "Seed falhou — servidor continua no ar");
  });

  // Initialize job queue table and resume any pending jobs
  ensureJobsTable()
    .then(() => {
      jobQueue.kick();
      logger.info("job-queue: inicializado e pronto");
    })
    .catch((err) => {
      logger.error({ err }, "job-queue: falha na inicialização — análises via fila indisponíveis");
    });

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
