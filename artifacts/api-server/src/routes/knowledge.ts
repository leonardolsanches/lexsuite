/**
 * knowledge.ts — Routes for saving completed analyses to the RAG knowledge base.
 *
 * When a lawyer saves a completed parecer, this route:
 *  1. Creates a synthetic document row in `documents` (filename prefixed with [Parecer])
 *  2. Chunks the analysis text and generates embeddings via Ollama
 *  3. Stores chunks in `document_chunks` (same table used by uploaded documents)
 *
 * Future analyses automatically benefit from these chunks via the existing RAG
 * search pipeline in rag.ts — no further changes needed there.
 *
 * The `source` column is added lazily on first request if missing (ALTER TABLE … ADD IF NOT EXISTS).
 */

import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { indexDocument } from "../lib/rag";
import { isDbBridgeConfigured } from "../lib/embedding";
import { getOllamaBaseUrl } from "../lib/ollama";
import { bridgeExecute, bridgeQuery, bridgeQueryOne, toIso, type Row } from "../lib/bridge";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Ensure extra columns exist in the documents table (idempotent). */
async function ensureColumns(): Promise<void> {
  try {
    await bridgeExecute(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS source VARCHAR(32) DEFAULT 'upload'`
    );
    await bridgeExecute(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS workflow_key VARCHAR(128)`
    );
    await bridgeExecute(
      `ALTER TABLE documents ADD COLUMN IF NOT EXISTS session_id VARCHAR(128)`
    );
  } catch (err) {
    logger.warn({ err }, "knowledge: falha ao adicionar colunas extras (pode ser falta de permissão)");
  }
}

let columnsEnsured = false;
async function lazyEnsureColumns() {
  if (columnsEnsured) return;
  await ensureColumns();
  columnsEnsured = true;
}

/** Strip Markdown/HTML to clean plain text for embedding. */
function toPlainText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{1,3}([^*]*)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]*)_{1,3}/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapEntry(d: Row) {
  return {
    id: Number(d.id),
    label: String(d.filename ?? "").replace(/^\[Parecer\] /, ""),
    module: d.module,
    workflowKey: d.workflow_key ?? null,
    sessionId: d.session_id ?? null,
    chunkCount: Number(d.chunk_count ?? 0),
    status: d.status,
    createdAt: toIso(d.created_at),
  };
}

/**
 * POST /api/knowledge/save-analysis
 * Body: { label, workflowKey, module, outputText, sessionId? }
 */
router.post("/save-analysis", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const {
    label,
    workflowKey,
    module: modulo,
    outputText,
    sessionId,
  } = req.body as {
    label?: string;
    workflowKey?: string;
    module?: string;
    outputText?: string;
    sessionId?: string;
  };

  if (!modulo || !outputText || outputText.trim().length < 100) {
    res.status(400).json({
      error: "Campos obrigatórios: module, outputText (mínimo 100 caracteres).",
    });
    return;
  }

  if (!isDbBridgeConfigured()) {
    res.status(503).json({ error: "DB Bridge não configurado — RAG indisponível." });
    return;
  }

  if (!getOllamaBaseUrl()) {
    res.status(503).json({
      error:
        "O RAG requer Ollama local para gerar embeddings (nomic-embed-text). " +
        "Configure OLLAMA_BASE_URL para usar esta funcionalidade.",
    });
    return;
  }

  await lazyEnsureColumns();

  const docLabel = (label ?? "Análise").slice(0, 200);
  const filename = `[Parecer] ${docLabel}`;

  try {
    // 1. Create synthetic document row — fail gracefully on duplicate via ON CONFLICT filename+user_id
    let docRow = await bridgeQueryOne<Row>(
      `INSERT INTO documents (user_id, filename, module, status, chunk_count, workflow_key, session_id, source)
       VALUES ($1, $2, $3, 'indexing', 0, $4, $5, 'analysis')
       RETURNING id`,
      [userId, filename, modulo, workflowKey ?? null, sessionId ?? null]
    );

    if (!docRow) {
      // Duplicate filename — reuse existing entry, reset status
      docRow = await bridgeQueryOne<Row>(
        "SELECT id FROM documents WHERE user_id = $1 AND filename = $2 AND module = $3 AND source = 'analysis' LIMIT 1",
        [userId, filename, modulo]
      );
      if (!docRow) throw new Error("Falha ao criar ou recuperar registro de documento.");

      // Clear old chunks and re-index
      await bridgeExecute("DELETE FROM document_chunks WHERE document_id = $1", [docRow.id]);
      await bridgeExecute(
        "UPDATE documents SET status = 'indexing', chunk_count = 0 WHERE id = $1",
        [docRow.id]
      );
    }

    const documentId = Number(docRow.id);

    // 2. Chunk + embed + store
    const plainText = toPlainText(outputText);
    const casoId = label ? label.slice(0, 100) : `análise-${documentId}`;

    logger.info({ documentId, modulo, chars: plainText.length }, "knowledge: indexando análise");

    const chunksIndexed = await indexDocument(documentId, casoId, plainText, modulo);

    // 3. Mark indexed
    await bridgeExecute(
      "UPDATE documents SET status = 'indexed', chunk_count = $2 WHERE id = $1",
      [documentId, chunksIndexed]
    );

    logger.info({ documentId, chunksIndexed }, "knowledge: análise indexada com sucesso");

    res.json({ ok: true, documentId, chunksIndexed });
  } catch (err: any) {
    logger.error({ err }, "knowledge: falha ao indexar análise");
    res.status(500).json({
      error: err?.message?.slice(0, 300) ?? "Erro ao salvar análise na base de conhecimento.",
    });
  }
});

/** GET /api/knowledge — list saved analyses for the current user */
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const modulo = typeof req.query.module === "string" ? req.query.module : null;
  const limit = Math.min(100, Number(req.query.limit ?? 50));

  await lazyEnsureColumns();

  const rows = await bridgeQuery<Row>(
    `SELECT id, filename, module, status, chunk_count, workflow_key, session_id, created_at
     FROM documents
     WHERE user_id = $1
       AND source = 'analysis'
       ${modulo ? "AND module = $3" : ""}
     ORDER BY created_at DESC
     LIMIT $2`,
    modulo ? [userId, limit, modulo] : [userId, limit]
  ).catch(() => [] as Row[]);

  res.json(rows.map(mapEntry));
});

/** DELETE /api/knowledge/:id — remove a saved analysis and its chunks */
router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const documentId = Number(req.params.id);
  if (!documentId || isNaN(documentId)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const doc = await bridgeQueryOne<Row>(
    "SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND source = 'analysis'",
    [documentId, userId]
  ).catch(() => null);

  if (!doc) {
    res.status(404).json({ error: "Entrada não encontrada ou sem permissão." });
    return;
  }

  await bridgeExecute("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);
  await bridgeExecute("DELETE FROM documents WHERE id = $1", [documentId]);

  res.json({ ok: true });
});

export default router;
