import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";
import { getOllamaBaseUrl, warmupOllama } from "./lib/ollama";

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

  seedDatabase().catch((err) => {
    logger.error({ err }, "Seed falhou — servidor continua no ar");
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
