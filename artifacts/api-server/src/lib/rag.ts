import { logger } from "./logger";
import {
  generateEmbedding,
  dbBridgeInsertChunk,
  dbBridgeSearchChunks,
  isDbBridgeConfigured,
  getEmbeddingModel,
  type ChunkSearchResult,
} from "./embedding";
import { getOllamaBaseUrl, ensureModelLoaded } from "./ollama";

const CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 200;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (normalized.length <= CHUNK_CHARS) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = start + CHUNK_CHARS;

    if (end < normalized.length) {
      const breakpoints = ["\n\n", "\n", ". ", " "];
      for (const bp of breakpoints) {
        const pos = normalized.lastIndexOf(bp, end);
        if (pos > start + CHUNK_CHARS / 2) {
          end = pos + bp.length;
          break;
        }
      }
    } else {
      end = normalized.length;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);

    start = Math.max(start + 1, end - OVERLAP_CHARS);
  }

  return chunks;
}

export async function indexDocument(
  documentId: number,
  casoId: string | null,
  text: string,
  modulo: string
): Promise<number> {
  const chunks = chunkText(text);
  logger.info({ documentId, chunks: chunks.length }, "Iniciando indexação RAG");

  // Ensure embedding model is loaded before processing chunks
  const ollamaBaseUrl = getOllamaBaseUrl();
  if (ollamaBaseUrl) {
    try {
      await ensureModelLoaded(ollamaBaseUrl, getEmbeddingModel());
    } catch (err) {
      logger.warn({ err }, "Embedding model não carregou — indexação pode falhar");
    }
  }

  let indexed = 0;
  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await generateEmbedding(chunks[i]);
      await dbBridgeInsertChunk({
        document_id: documentId,
        caso_id: casoId,
        chunk_index: i,
        texto: chunks[i],
        embedding,
        modulo,
      });
      indexed++;
    } catch (err) {
      logger.error({ err, chunkIndex: i, documentId }, "Falha ao indexar chunk");
    }
  }

  logger.info({ documentId, indexed, total: chunks.length }, "Indexação RAG concluída");
  return indexed;
}

export async function searchRelevantChunks(
  queryText: string,
  modulo: string,
  limit = 5
): Promise<ChunkSearchResult[]> {
  if (!isDbBridgeConfigured()) return [];
  try {
    const embedding = await generateEmbedding(queryText);
    return await dbBridgeSearchChunks(embedding, modulo, limit);
  } catch (err) {
    logger.warn({ err }, "RAG search falhou — continuando sem contexto");
    return [];
  }
}

export function buildRagContext(chunks: ChunkSearchResult[]): string {
  if (chunks.length === 0) return "";

  const sections = chunks.map((c, i) => {
    // Chunks saved from previous analyses have caso_id set to the analysis label.
    // Distinguish them clearly so the model knows the type of source.
    const isParecer = c.caso_id && !c.caso_id.startsWith("análise-") && isNaN(Number(c.caso_id));
    const label = isParecer
      ? `Parecer anterior — ${c.caso_id}`
      : c.caso_id
      ? `Caso: ${c.caso_id}`
      : `Documento #${c.document_id}`;

    const sim = c.similaridade != null ? ` (similaridade: ${(c.similaridade * 100).toFixed(0)}%)` : "";
    return `[Fonte ${i + 1} — ${label}${sim}]\n${c.texto}`;
  });

  return (
    `CONTEXTO RECUPERADO DA BASE DE CONHECIMENTO (RAG):\n` +
    `Use este contexto para embasar a análise, citar precedentes e validar teses similares.\n` +
    `${"─".repeat(60)}\n` +
    `${sections.join("\n\n")}\n` +
    `${"─".repeat(60)}\n\n`
  );
}
