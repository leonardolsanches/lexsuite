import { Router, type IRouter } from "express";
import { createRequire } from "node:module";
import multer from "multer";
import { requireAuth } from "../lib/auth";
import { isDbBridgeConfigured, dbBridgeDeleteDocumentChunks } from "../lib/embedding";
import { pingDbBridge, getDbBridgeUrl, bridgeQuery, bridgeQueryOne, bridgeExecute, toIso, type Row } from "../lib/bridge";
import { indexDocument } from "../lib/rag";
import { logger } from "../lib/logger";

const _require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = _require("pdf-parse");
const mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } = _require("mammoth");

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "text/plain" ||
      file.originalname.endsWith(".pdf") ||
      file.originalname.endsWith(".docx") ||
      file.originalname.endsWith(".txt");
    ok ? cb(null, true) : cb(new Error("Tipo de arquivo não suportado. Use PDF, DOCX ou TXT."));
  },
});

async function extractText(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
  if (mimetype === "application/pdf" || originalname.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalname.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return buffer.toString("utf-8");
}

function mapDoc(d: Row) {
  return {
    id: d.id,
    userId: d.user_id,
    filename: d.filename,
    module: d.module,
    status: d.status,
    chunkCount: d.chunk_count ?? 0,
    createdAt: toIso(d.created_at),
  };
}

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const docs = await bridgeQuery(
    "SELECT id, user_id, filename, module, status, chunk_count, created_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  res.json(docs.map(mapDoc));
});

router.post("/documents/upload", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }

  const { module: modulo, caso_id } = req.body as { module?: string; caso_id?: string };
  if (!modulo || !["executio", "rural"].includes(modulo)) {
    res.status(400).json({ error: "Campo 'module' inválido. Use 'executio' ou 'rural'" });
    return;
  }

  let extractedText: string;
  try {
    extractedText = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
  } catch (err: any) {
    logger.error({ err }, "Falha na extração de texto");
    res.status(422).json({ error: `Falha ao extrair texto: ${err.message}` });
    return;
  }

  if (extractedText.trim().length < 10) {
    res.status(422).json({ error: "O arquivo não contém texto extraível" });
    return;
  }

  const doc = await bridgeQueryOne(
    `INSERT INTO documents (user_id, filename, content, module, status, chunk_count)
     VALUES ($1, $2, $3, $4, 'indexing', 0)
     RETURNING id, user_id, filename, module, status, chunk_count, created_at`,
    [userId, req.file.originalname, extractedText.slice(0, 50_000), modulo]
  );

  if (!doc) {
    res.status(500).json({ error: "Falha ao salvar documento" });
    return;
  }

  res.status(202).json({
    ...mapDoc(doc),
    message: "Arquivo recebido. Indexação em andamento...",
  });

  setImmediate(async () => {
    try {
      const casoId = caso_id?.trim() || null;
      let indexed = 0;
      if (isDbBridgeConfigured()) {
        indexed = await indexDocument(doc.id as number, casoId, extractedText, modulo);
      }
      const chunkCount = indexed > 0 ? indexed : Math.ceil(extractedText.length / 2000);
      await bridgeExecute(
        "UPDATE documents SET status = 'ready', chunk_count = $2 WHERE id = $1",
        [doc.id, chunkCount]
      );
      logger.info({ docId: doc.id, indexed }, "Documento indexado com sucesso");
    } catch (err) {
      logger.error({ err, docId: doc.id }, "Falha na indexação RAG");
      await bridgeExecute("UPDATE documents SET status = 'error' WHERE id = $1", [doc.id]).catch(() => {});
    }
  });
});

router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { filename, content, module: modulo, caso_id } = req.body;

  if (!filename || content == null || !modulo) {
    res.status(400).json({ error: "Campos obrigatórios: filename, content, module" });
    return;
  }

  const text = String(content).slice(0, 50_000);
  const doc = await bridgeQueryOne(
    `INSERT INTO documents (user_id, filename, content, module, status, chunk_count)
     VALUES ($1, $2, $3, $4, 'indexing', 0)
     RETURNING id, user_id, filename, module, status, chunk_count, created_at`,
    [userId, filename, text, modulo]
  );

  if (!doc) {
    res.status(500).json({ error: "Falha ao salvar documento" });
    return;
  }

  res.status(201).json({
    ...mapDoc(doc),
    message: "Texto recebido. Indexação em andamento...",
  });

  setImmediate(async () => {
    try {
      const casoId = caso_id?.trim() || null;
      let indexed = 0;
      if (isDbBridgeConfigured()) {
        indexed = await indexDocument(doc.id as number, casoId, text, modulo);
      }
      const chunkCount = indexed > 0 ? indexed : Math.ceil(text.length / 2000);
      await bridgeExecute(
        "UPDATE documents SET status = 'ready', chunk_count = $2 WHERE id = $1",
        [doc.id, chunkCount]
      );
    } catch (err) {
      logger.error({ err, docId: doc.id }, "Falha na indexação RAG (texto)");
      await bridgeExecute("UPDATE documents SET status = 'error' WHERE id = $1", [doc.id]).catch(() => {});
    }
  });
});

router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "ID de documento inválido" });
    return;
  }

  const { rowCount } = await bridgeExecute(
    "DELETE FROM documents WHERE id = $1 AND user_id = $2",
    [id, userId]
  );

  if (rowCount === 0) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  if (isDbBridgeConfigured()) {
    await dbBridgeDeleteDocumentChunks(id);
  }

  res.sendStatus(204);
});

router.get("/rag-status", requireAuth, async (_req, res): Promise<void> => {
  const configured = isDbBridgeConfigured();
  const online = configured ? await pingDbBridge() : false;
  res.json({
    configured,
    online,
    url: getDbBridgeUrl() ? "configured" : null,
    embeddingModel: process.env.OLLAMA_MODEL_EMBEDDING ?? "nomic-embed-text",
  });
});

export default router;
