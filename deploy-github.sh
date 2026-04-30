#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Lex Suite — Deploy para GitHub
#  Execute no Replit Shell:  bash deploy-github.sh
# ─────────────────────────────────────────────────────────────

set -e

REPO="https://github.com/leonardolsanches/lexsuite.git"
BRANCH="main"

echo ""
echo "  LEX SUITE — Deploy para GitHub"
echo "  ================================"
echo ""

# Verificar token
if [ -z "$GH_DEPLOY_TOKEN" ]; then
  echo "  ERRO: secret GH_DEPLOY_TOKEN não encontrado."
  echo "        Adicione-o em Secrets no Replit e reinicie o shell."
  exit 1
fi

echo "  Token: ${GH_DEPLOY_TOKEN:0:4}...${GH_DEPLOY_TOKEN: -4}  OK"
echo "  Repositório: $REPO"
echo "  Branch: $BRANCH"
echo ""

# Mostrar o último commit que será enviado
COMMIT_MSG=$(git --no-optional-locks log -1 --pretty=format:"%h — %s (%cr)")
echo "  Último commit: $COMMIT_MSG"
echo ""

echo "  Enviando para GitHub..."
git --no-optional-locks push --force \
  "https://${GH_DEPLOY_TOKEN}@github.com/leonardolsanches/lexsuite.git" \
  "${BRANCH}:${BRANCH}" 2>&1 | sed "s/ghp_[A-Za-z0-9]*/REDACTED/g"

echo ""
echo "  SUCESSO! Código atualizado em:"
echo "  https://github.com/leonardolsanches/lexsuite"
echo ""
