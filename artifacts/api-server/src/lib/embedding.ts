import { getOllamaBaseUrl, OLLAMA_DEFAULT_MODEL_EMBEDDING } from "./ollama";
import { logger } from "./logger";

export function getEmbeddingModel(): string {
  return process.env.OLLAMA_MODEL_EMBEDDING ?? OLLAMA_DEFAULT_MODEL_EMBEDDING;
}

export function getDbBridgeUrl(): string | null {
  return process.env.DB_BRIDGE_URL ?? null;
}

export function isDbBridgeConfigured(): boolean {
  return !!process.env.DB_BRIDGE_URL;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const baseUrl = getOllamaBaseUrl();
  if (!baseUrl) throw new Error("OLLAMA_BASE_URL não configurado");

  const model = getEmbeddingModel();
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Ollama embeddings retornou ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error("Ollama retornou embedding inválido");
  }
  return data.embedding;
}

export interface ChunkInsertPayload {
  document_id: number;
  caso_id: string | null;
  chunk_index: number;
  texto: string;
  embedding: number[];
  modulo: string;
}

export interface ChunkSearchResult {
  id: number;
  document_id: number;
  caso_id: string | null;
  chunk_index: number;
  texto: string;
  modulo: string;
  similaridade: number;
}

export async function dbBridgeInsertChunk(payload: ChunkInsertPayload): Promise<void> {
  const url = getDbBridgeUrl();
  if (!url) throw new Error("DB_BRIDGE_URL não configurado");

  const response = await fetch(`${url}/chunks/insert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`DB Bridge insert retornou ${response.status}: ${body}`);
  }
}

export async function dbBridgeSearchChunks(
  embedding: number[],
  modulo: string,
  limit = 5
): Promise<ChunkSearchResult[]> {
  const url = getDbBridgeUrl();
  if (!url) throw new Error("DB_BRIDGE_URL não configurado");

  const response = await fetch(`${url}/chunks/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embedding, modulo, limit }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`DB Bridge search retornou ${response.status}: ${body}`);
  }

  return (await response.json()) as ChunkSearchResult[];
}

export async function dbBridgeDeleteDocumentChunks(documentId: number): Promise<void> {
  const url = getDbBridgeUrl();
  if (!url) return;

  await fetch(`${url}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sql: "DELETE FROM document_chunks WHERE document_id = $1",
      params: [documentId],
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((err) => logger.warn({ err }, "DB Bridge: falha ao deletar chunks"));
}

export async function pingDbBridge(): Promise<boolean> {
  const url = getDbBridgeUrl();
  if (!url) return false;
  try {
    const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5_000) });
    return resp.ok;
  } catch {
    return false;
  }
}
