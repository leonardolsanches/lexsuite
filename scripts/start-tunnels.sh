#!/usr/bin/env bash
# ============================================================
#  start-tunnels.sh — Inicia túneis Cloudflare e notifica
#  o servidor Replit automaticamente com as novas URLs.
#
#  Uso:
#    chmod +x start-tunnels.sh
#    ./start-tunnels.sh
#
#  Configure as variáveis abaixo antes de usar.
# ============================================================

set -euo pipefail

# ── Configuração ─────────────────────────────────────────────
OLLAMA_PORT=11434          # Porta local do Ollama
DB_BRIDGE_PORT=8000        # Porta local do DB Bridge (FastAPI)

REPLIT_URL="https://ff4eff08-0cd7-4a83-9524-6ebc1805359a-00-m3nscpx49vhe.picard.replit.dev"
TUNNEL_SECRET="2f2863a238676eff8d17d11e8f76186d009eec6bf7ba9ffd"
# ─────────────────────────────────────────────────────────────

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# Verifica dependências
if ! command -v cloudflared &>/dev/null; then
  echo "ERRO: cloudflared não encontrado. Instale com:"
  echo "  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared"
  exit 1
fi

# Cria diretório temporário para logs dos túneis
TMPDIR_TUNNELS=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$TMPDIR_TUNNELS"' EXIT

extract_url() {
  local logfile="$1"
  local timeout=30
  local elapsed=0
  while [[ $elapsed -lt $timeout ]]; do
    local url
    url=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' "$logfile" 2>/dev/null | head -1 || true)
    if [[ -n "$url" ]]; then
      echo "$url"
      return 0
    fi
    sleep 1
    ((elapsed++)) || true
  done
  echo ""
}

# ── Inicia túnel Ollama ───────────────────────────────────────
log "Iniciando túnel Ollama (porta $OLLAMA_PORT)..."
cloudflared tunnel --url "http://localhost:$OLLAMA_PORT" \
  --no-autoupdate 2>&1 | tee "$TMPDIR_TUNNELS/ollama.log" &

# ── Inicia túnel DB Bridge ────────────────────────────────────
log "Iniciando túnel DB Bridge (porta $DB_BRIDGE_PORT)..."
cloudflared tunnel --url "http://localhost:$DB_BRIDGE_PORT" \
  --no-autoupdate 2>&1 | tee "$TMPDIR_TUNNELS/bridge.log" &

# ── Aguarda URLs dos túneis ───────────────────────────────────
log "Aguardando URLs dos túneis (máx 30s)..."

OLLAMA_URL=$(extract_url "$TMPDIR_TUNNELS/ollama.log")
DB_BRIDGE_URL=$(extract_url "$TMPDIR_TUNNELS/bridge.log")

if [[ -z "$OLLAMA_URL" ]]; then
  log "AVISO: não foi possível capturar URL do Ollama — verifique o cloudflared"
fi
if [[ -z "$DB_BRIDGE_URL" ]]; then
  log "AVISO: não foi possível capturar URL do DB Bridge — verifique o cloudflared"
fi

log "Ollama URL:    ${OLLAMA_URL:-'(não detectada)'}"
log "DB Bridge URL: ${DB_BRIDGE_URL:-'(não detectada)'}"

# ── Notifica o servidor Replit ────────────────────────────────
if [[ -n "$OLLAMA_URL" || -n "$DB_BRIDGE_URL" ]]; then
  log "Notificando servidor Replit..."

  PAYLOAD="{\"secret\":\"$TUNNEL_SECRET\""
  [[ -n "$OLLAMA_URL" ]]    && PAYLOAD+=",\"ollamaBaseUrl\":\"$OLLAMA_URL\""
  [[ -n "$DB_BRIDGE_URL" ]] && PAYLOAD+=",\"dbBridgeUrl\":\"$DB_BRIDGE_URL\""
  PAYLOAD+="}"

  RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$REPLIT_URL/api/tunnel-update" 2>&1)

  log "Resposta do servidor: $RESPONSE"
else
  log "Nenhuma URL detectada — servidor Replit não foi notificado."
fi

# ── Mantém os túneis rodando ──────────────────────────────────
log "Túneis ativos. Pressione Ctrl+C para encerrar."
wait
