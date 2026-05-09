#!/usr/bin/env python3
"""
db-bridge.py — Proxy local com heartbeat para túnel Cloudflare.

Mantém a conexão Cloudflare viva durante a fase silenciosa do deepseek-r1
enviando '\n' a cada 8s enquanto o Ollama processa (prefill/thinking).

Uso:
    pip install fastapi uvicorn httpx
    python3 db-bridge.py

Porta padrão: 8000
"""
import asyncio
import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse

OLLAMA_URL = "http://localhost:11434"
PORT = 8000
HEARTBEAT_INTERVAL = 8.0  # segundos entre '\n' heartbeats

app = FastAPI()


@app.get("/health")
async def health():
    return {"ok": True, "service": "db-bridge"}


@app.post("/ollama-proxy/stream")
async def ollama_proxy_stream(request: Request):
    """
    Faz proxy do /api/generate do Ollama com heartbeats periódicos.
    O heartbeat '\n' mantém o túnel Cloudflare ativo durante o silêncio
    do prefill e da fase de raciocínio do deepseek-r1.
    """
    body = await request.body()
    chunk_queue: asyncio.Queue[bytes | None] = asyncio.Queue()

    async def fetch_from_ollama():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/generate",
                    content=body,
                    headers={"Content-Type": "application/json"},
                ) as resp:
                    async for chunk in resp.aiter_bytes():
                        await chunk_queue.put(chunk)
        except Exception as e:
            error_json = f'{{"error": "{str(e)}"}}\n'.encode()
            await chunk_queue.put(error_json)
        finally:
            await chunk_queue.put(None)

    async def generate():
        task = asyncio.create_task(fetch_from_ollama())
        try:
            while True:
                try:
                    chunk = await asyncio.wait_for(
                        chunk_queue.get(), timeout=HEARTBEAT_INTERVAL
                    )
                    if chunk is None:
                        break
                    yield chunk
                except asyncio.TimeoutError:
                    yield b"\n"
        finally:
            task.cancel()

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    print(f"DB Bridge rodando na porta {PORT}")
    print(f"Proxiando Ollama em {OLLAMA_URL}")
    print(f"Heartbeat a cada {HEARTBEAT_INTERVAL}s")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
