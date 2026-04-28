#!/bin/bash
# Adiciona o endpoint /ollama-proxy/stream ao DB Bridge no Mini PC
# Resolve o erro Cloudflare 524 durante geracao do deepseek-r1:32b
# Uso: bash instalar-bridge-endpoint.sh

set -e

BRIDGE_FILE="/home/leonardo/db_bridge.py"
VENV="/home/leonardo/lexbridge"

echo ""
echo "[1/4] Instalando dependencia httpx..."
source "$VENV/bin/activate"
pip install httpx --quiet
echo "  httpx instalado."

echo ""
echo "[2/4] Verificando se endpoint ja existe..."
if grep -q "ollama-proxy/stream" "$BRIDGE_FILE"; then
    echo "  Endpoint ja existe no bridge. Pulando insercao."
else
    echo "  Adicionando endpoint ao bridge..."
    cat >> "$BRIDGE_FILE" << 'PYTHON_ENDPOINT'

# ── Ollama Proxy com Heartbeat ─────────────────────────────────────────────────
# Envia heartbeats a cada 8s para evitar Cloudflare 524 durante o thinking
# do deepseek-r1:32b (que pode ficar em silencio por 30-60s)
import httpx
import asyncio
from starlette.responses import StreamingResponse as StarletteStreaming

@app.post("/ollama-proxy/stream")
async def ollama_proxy_stream(request: Request):
    body = await request.body()

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    "http://localhost:11434/api/generate",
                    content=body,
                    headers={"Content-Type": "application/json"}
                ) as resp:
                    last_chunk = asyncio.get_event_loop().time()
                    async for chunk in resp.aiter_bytes():
                        yield chunk
                        last_chunk = asyncio.get_event_loop().time()
                    # Heartbeat: se ficou mais de 8s sem dados, envia \n
                    now = asyncio.get_event_loop().time()
                    if now - last_chunk > 8:
                        yield b"\n"
        except Exception as e:
            yield f'{{"error": "{str(e)}"}}\n'.encode()

    return StarletteStreaming(generate(), media_type="application/x-ndjson")
PYTHON_ENDPOINT
    echo "  Endpoint adicionado."
fi

echo ""
echo "[3/4] Verificando imports necessarios no topo do arquivo..."
if ! grep -q "from starlette.responses import StreamingResponse" "$BRIDGE_FILE"; then
    # Adicionar import no topo apos a primeira linha de import existente
    sed -i '/^from fastapi/a from starlette.responses import StreamingResponse as StarletteStreaming' "$BRIDGE_FILE"
    echo "  Import StreamingResponse adicionado."
else
    echo "  Import ja existe."
fi

echo ""
echo "[4/4] Reiniciando servico lexbridge..."
sudo systemctl restart lexbridge.service
sleep 3
STATUS=$(sudo systemctl is-active lexbridge.service)
if [ "$STATUS" = "active" ]; then
    echo "  lexbridge reiniciado com sucesso."
    echo ""
    echo "INSTALACAO CONCLUIDA! Testando endpoint..."
    curl -s -o /dev/null -w "  Status HTTP: %{http_code}\n" \
        -X POST http://localhost:8765/ollama-proxy/stream \
        -H "Content-Type: application/json" \
        -d '{"model":"deepseek-r1:32b","prompt":".","stream":true,"num_predict":1}'
else
    echo "  ATENCAO: servico nao iniciou corretamente."
    echo "  Verifique com: sudo journalctl -u lexbridge -n 30"
fi
