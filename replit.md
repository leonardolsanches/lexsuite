# Workspace — Lex Suite

## Overview

Plataforma jurídica modular para advogados brasileiros. Dois módulos: Lex Rural (tema dourado) e Lex Executio (tema azul). Interface em português.

pnpm workspace monorepo usando TypeScript. Cada pacote gerencia suas próprias dependências.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **API**: Express 5 + Drizzle ORM + PostgreSQL (Replit)
- **Autenticação**: Clerk
- **Frontend**: React + Vite + Wouter + TanStack Query
- **LLM primário**: Claude (Anthropic) via `ANTHROPIC_API_KEY` ou modal de admin; fallback Ollama local
- **RAG**: `nomic-embed-text` via Ollama → `document_chunks` (pgvector) no DB Bridge
- **Build**: esbuild

## Motor de IA — Ollama Local

O sistema usa **exclusivamente** modelos locais via Ollama, acessados por túneis Cloudflare.

| Variável | Descrição |
|----------|-----------|
| `OLLAMA_BASE_URL` | URL do túnel Cloudflare para Ollama |
| `OLLAMA_MODEL_PARECER` | Modelo para pareceres (padrão: `deepseek-r1:7b`) |
| `OLLAMA_MODEL_EXTRACAO` | Modelo para extração (padrão: `qwen2:7b`) |
| `LEX_MODO_LLM` | Sempre `local` — sem fallback cloud |
| `DB_BRIDGE_URL` | URL do túnel para DB Bridge (FastAPI local) |

⚠️ As URLs do trycloudflare.com mudam a cada reinicialização — atualizar os Secrets quando reiniciar o Mini PC.

## Arquivos LLM

- `artifacts/api-server/src/lib/ollama.ts` — cliente Ollama com streaming SSE
- `artifacts/api-server/src/lib/llm.ts` — orquestrador (só modo local)
- `artifacts/api-server/src/routes/analyze.ts` — rota SSE `/api/analyze`
- `artifacts/api-server/src/routes/analyze.ts` → `GET /api/llm-status` — status da conexão Ollama

## RAG — Base de Conhecimento Jurídico

Flywheel de jurisprudência: análises concluídas podem ser indexadas na base vetorial e reutilizadas como contexto em análises futuras similares.

**Fluxo:**
1. Análise conclui → botão **"Salvar na Base"** aparece na toolbar
2. Backend cria registro em `documents` (source='analysis') + fragmenta + embeda via `nomic-embed-text`
3. Fragmentos vão para `document_chunks` (mesma tabela dos documentos enviados)
4. Análises futuras buscam chunks similares via pgvector → contexto enriquecido automaticamente

**Rotas:**
- `POST /api/knowledge/save-analysis` — salva parecer na base
- `GET /api/knowledge` — lista pareceres salvos por usuário
- `DELETE /api/knowledge/:id` — remove entrada e seus chunks

**Arquivos:**
- `artifacts/api-server/src/routes/knowledge.ts` — rotas knowledge
- `artifacts/api-server/src/lib/rag.ts` — `searchRelevantChunks`, `buildRagContext` (distingue pareceres de documentos)
- `artifacts/api-server/src/lib/embedding.ts` — geração de embeddings + operações no DB Bridge

**Requisito:** OLLAMA_BASE_URL configurado (nomic-embed-text roda localmente); Claude pode ser o provider de análise mas embeddings são sempre locais.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
