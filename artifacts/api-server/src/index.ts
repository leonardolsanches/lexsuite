import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";
import { getOllamaBaseUrl, warmupOllama } from "./lib/ollama";
import { loadConfigFromDb } from "./lib/runtime-config";
import { ensureJobsTable, ensureAppTables, loadLocalDbConfig } from "./lib/local-db";
import { setDbBridgeUrl } from "./lib/bridge";
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

  // Load locally-persisted config (db_bridge_url override, etc.) from local PostgreSQL
  loadLocalDbConfig()
    .then((cfg) => {
      const savedDbBridgeUrl = cfg.get("db_bridge_url");
      if (savedDbBridgeUrl) {
        setDbBridgeUrl(savedDbBridgeUrl);
        logger.info("startup: DB_BRIDGE_URL carregado do banco local");
      }
    })
    .catch((err) => {
      logger.warn({ err }, "loadLocalDbConfig falhou — usando variável de ambiente para DB_BRIDGE_URL");
    });

  // Ensure all local PostgreSQL tables exist (users, sessions, workflows, prompts, jobs)
  ensureAppTables()
    .then(() => ensureJobsTable())
    .then(async () => {
      // Seed workflows and prompts into local PostgreSQL (idempotent)
      await seedDatabase().catch((err) => {
        logger.error({ err }, "Seed falhou — servidor continua no ar");
      });
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
