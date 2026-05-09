#!/usr/bin/env bash
set -euo pipefail

OLLAMA_PORT=11434
DB_BRIDGE_PORT=8000
DB_BRIDGE_SCRIPT="$HOME/db-bridge.py"

REPLIT_URL="https://ff4eff08-0cd7-4a83-9524-6ebc1805359a-00-m3nscpx49vhe.picard.replit.dev"
TUNNEL_SECRET="2f2863a238676eff8d17d11e8f76186d009eec6bf7ba9ffd"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

if ! command -v cloudflared &>/dev/null; then
  echo "ERRO: cloudflared não encontrado."
  exit 1
fi

TMPDIR_TUNNELS=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$TMPDIR_TUNNELS"' EXIT

# ── Inicia DB Bridge se o script existir ──────────────────────
if [[ -f "$DB_BRIDGE_SCRIPT" ]]; then
  log "Iniciando DB Bridge (porta $DB_BRIDGE_PORT)..."
  python3 "$DB_BRIDGE_SCRIPT" > "$TMPDIR_TUNNELS/bridge-app.log" 2>&1 &
  BRIDGE_PID=$!

  # Aguarda o DB Bridge estar pronto (máx 15s)
  elapsed=0
  while [[ $elapsed -lt 15 ]]; do
    if curl -s "http://localhost:$DB_BRIDGE_PORT/health" &>/dev/null; then
      log "DB Bridge pronto!"
      break
    fi
    sleep 1
    ((elapsed++)) || true
  done

  if ! curl -s "http://localhost:$DB_BRIDGE_PORT/health" &>/dev/null; then
    log "AVISO: DB Bridge não respondeu em 15s — continuando sem ele"
  fi
else
  log "AVISO: $DB_BRIDGE_SCRIPT não encontrado — sem heartbeat proxy"
  log "       Execute o passo de instalação do DB Bridge primeiro."
fi

extract_url() {
  local logfile="$1"
  local elapsed=0
  while [[ $elapsed -lt 40 ]]; do
    local url
    url=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' "$logfile" 2>/dev/null | head -1 || true)
    if [[ -n "$url" ]]; then echo "$url"; return 0; fi
    sleep 1
    ((elapsed++)) || true
  done
  echo ""
}

# ── Inicia túneis Cloudflare ──────────────────────────────────
log "Iniciando túnel Ollama (porta $OLLAMA_PORT)..."
cloudflared tunnel --url "http://localhost:$OLLAMA_PORT" \
  --no-autoupdate 2>&1 | tee "$TMPDIR_TUNNELS/ollama.log" &

log "Iniciando túnel DB Bridge (porta $DB_BRIDGE_PORT)..."
cloudflared tunnel --url "http://localhost:$DB_BRIDGE_PORT" \
  --no-autoupdate 2>&1 | tee "$TMPDIR_TUNNELS/cf-bridge.log" &

log "Aguardando URLs dos túneis (máx 40s)..."
OLLAMA_URL=$(extract_url "$TMPDIR_TUNNELS/ollama.log")
DB_BRIDGE_URL=$(extract_url "$TMPDIR_TUNNELS/cf-bridge.log")

log "Ollama URL:    ${OLLAMA_URL:-'(não detectada)'}"
log "DB Bridge URL: ${DB_BRIDGE_URL:-'(não detectada)'}"

# ── Notifica o servidor Replit ────────────────────────────────
if [[ -n "$OLLAMA_URL" || -n "$DB_BRIDGE_URL" ]]; then
  log "Notificando servidor Replit..."
  PAYLOAD="{\"secret\":\"$TUNNEL_SECRET\""
  [[ -n "$OLLAMA_URL" ]]    && PAYLOAD+=",\"ollamaBaseUrl\":\"$OLLAMA_URL\""
  [[ -n "$DB_BRIDGE_URL" ]] && PAYLOAD+=",\"dbBridgeUrl\":\"$DB_BRIDGE_URL\""
  PAYLOAD+="}"
  RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$REPLIT_URL/api/tunnel-update")
  log "Resposta: $RESPONSE"
fi

log "Tudo ativo. Ctrl+C para encerrar."
wait
