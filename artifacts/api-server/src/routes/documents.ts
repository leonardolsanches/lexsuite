import { Router, type IRouter } from "express";
import { createRequire } from "node:module";
import multer from "multer";
import { eq, and } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { isDbBridgeConfigured, dbBridgeDeleteDocumentChunks, pingDbBridge, getDbBridgeUrl } from "../lib/embedding";
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
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".pdf") || file.originalname.endsWith(".docx") || file.originalname.endsWith(".txt")) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não suportado. Use PDF, DOCX ou TXT."));
    }
  },
});

async function extractText(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
  const isPdf = mimetype === "application/pdf" || originalname.endsWith(".pdf");
  const isDocx = mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || originalname.endsWith(".docx");
  const isTxt = mimetype === "text/plain" || originalname.endsWith(".txt");

  if (isPdf) {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (isTxt) {
    return buffer.toString("utf-8");
  }
  throw new Error("Formato não reconhecido");
}

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.userId, userId));
  res.json(docs.map(d => ({
    id: d.id,
    userId: d.userId,
    filename: d.filename,
    module: d.module,
    status: d.status,
    chunkCount: d.chunkCount,
    createdAt: d.createdAt.toISOString(),
  })));
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

  const [doc] = await db.insert(documentsTable).values({
    userId,
    filename: req.file.originalname,
    content: extractedText.slice(0, 50_000),
    module: modulo,
    status: "indexing",
    chunkCount: 0,
  }).returning();

  res.status(202).json({
    id: doc.id,
    filename: doc.filename,
    module: doc.module,
    status: doc.status,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
    message: "Arquivo recebido. Indexação em andamento...",
  });

  setImmediate(async () => {
    try {
      const casoId = caso_id?.trim() || null;
      let indexed = 0;

      if (isDbBridgeConfigured()) {
        indexed = await indexDocument(doc.id, casoId, extractedText, modulo);
      }

      const chunkCount = indexed > 0 ? indexed : Math.ceil(extractedText.length / 2000);
      await db.update(documentsTable).set({
        status: "ready",
        chunkCount,
      }).where(eq(documentsTable.id, doc.id));

      logger.info({ docId: doc.id, indexed }, "Documento indexado com sucesso");
    } catch (err) {
      logger.error({ err, docId: doc.id }, "Falha na indexação RAG do documento");
      await db.update(documentsTable).set({ status: "error" }).where(eq(documentsTable.id, doc.id)).catch(() => {});
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

  const [doc] = await db.insert(documentsTable).values({
    userId,
    filename,
    content: String(content).slice(0, 50_000),
    module: modulo,
    status: "indexing",
    chunkCount: 0,
  }).returning();

  res.status(201).json({
    id: doc.id,
    filename: doc.filename,
    module: doc.module,
    status: doc.status,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt.toISOString(),
    message: "Texto recebido. Indexação em andamento...",
  });

  setImmediate(async () => {
    try {
      const casoId = caso_id?.trim() || null;
      let indexed = 0;

      if (isDbBridgeConfigured()) {
        indexed = await indexDocument(doc.id, casoId, String(content), modulo);
      }

      const chunkCount = indexed > 0 ? indexed : Math.ceil(String(content).length / 2000);
      await db.update(documentsTable).set({ status: "ready", chunkCount }).where(eq(documentsTable.id, doc.id));
    } catch (err) {
      logger.error({ err, docId: doc.id }, "Falha na indexação RAG do documento (texto)");
      await db.update(documentsTable).set({ status: "error" }).where(eq(documentsTable.id, doc.id)).catch(() => {});
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

  const [deleted] = await db.delete(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)))
    .returning();

  if (!deleted) {
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
