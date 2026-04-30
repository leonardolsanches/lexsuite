# =============================================================================
# deploy-github.ps1 — Envia o projeto Lex Suite para o GitHub
# Uso: clique com botão direito → "Executar com PowerShell"
#      ou no terminal: powershell -ExecutionPolicy Bypass -File deploy-github.ps1
# =============================================================================

$Host.UI.RawUI.WindowTitle = "Lex Suite — Deploy GitHub"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    AV  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    ERR $msg" -ForegroundColor Red }
function Pause-Exit {
    Write-Host "`nPressione qualquer tecla para fechar..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "  LEX SUITE — Deploy para GitHub" -ForegroundColor Magenta
Write-Host "  ================================" -ForegroundColor Magenta
Write-Host ""

# 1. Verificar se git está instalado
Write-Step "Verificando instalação do Git..."
try {
    $gitVer = git --version 2>&1
    Write-OK $gitVer
} catch {
    Write-Err "Git não encontrado. Baixe em: https://git-scm.com/download/win"
    Pause-Exit
}

# 2. Verificar pasta correta (deve ter pnpm-workspace.yaml)
Write-Step "Verificando pasta do projeto..."
if (-not (Test-Path "pnpm-workspace.yaml")) {
    Write-Err "Execute este script na pasta raiz do projeto (onde está o pnpm-workspace.yaml)."
    Write-Warn "Pasta atual: $(Get-Location)"
    Pause-Exit
}
Write-OK "Pasta correta: $(Get-Location)"

# 3. Obter URL do repositório GitHub
Write-Step "Configurando repositório remoto..."

$existingRemote = ""
try { $existingRemote = git remote get-url origin 2>$null } catch {}

if ($existingRemote -ne "") {
    Write-OK "Remote já configurado: $existingRemote"
    $trocar = Read-Host "    Deseja usar outra URL? (s/N)"
    if ($trocar -ieq "s") { $existingRemote = "" }
}

if ($existingRemote -eq "") {
    Write-Host ""
    Write-Host "    Crie um repositório vazio no GitHub e cole a URL abaixo." -ForegroundColor Gray
    Write-Host "    Exemplo: https://github.com/seu-usuario/lex-suite.git" -ForegroundColor Gray
    Write-Host ""
    $repoUrl = Read-Host "    URL do repositório GitHub"
    if ($repoUrl -eq "") {
        Write-Err "URL não fornecida. Abortando."
        Pause-Exit
    }
}

# 4. Inicializar git se necessário
Write-Step "Verificando repositório Git local..."
if (-not (Test-Path ".git")) {
    Write-Warn "Nenhum repositório git encontrado. Inicializando..."
    git init -b main
    Write-OK "Repositório inicializado (branch: main)"
} else {
    Write-OK "Repositório git já existe"
}

# 5. Configurar identidade git se necessário
$gitName  = git config user.name  2>$null
$gitEmail = git config user.email 2>$null

if (-not $gitName -or -not $gitEmail) {
    Write-Step "Configurando identidade Git..."
    if (-not $gitName) {
        $gitName = Read-Host "    Seu nome completo (para os commits)"
        git config user.name $gitName
    }
    if (-not $gitEmail) {
        $gitEmail = Read-Host "    Seu e-mail GitHub"
        git config user.email $gitEmail
    }
    Write-OK "Identidade configurada: $gitName <$gitEmail>"
}

# 6. Configurar remote
Write-Step "Configurando remote origin..."
if ($existingRemote -eq "" -and $repoUrl -ne "") {
    $hasOrigin = git remote 2>$null | Where-Object { $_ -eq "origin" }
    if ($hasOrigin) {
        git remote set-url origin $repoUrl
        Write-OK "Remote atualizado: $repoUrl"
    } else {
        git remote add origin $repoUrl
        Write-OK "Remote adicionado: $repoUrl"
    }
}

# 7. Stage e commit
Write-Step "Preparando arquivos para commit..."
git add --all
$status = git status --short
if ($status -eq "") {
    Write-Warn "Nenhuma alteração nova para commitar."
} else {
    $commitMsg = "chore: deploy Lex Suite $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    Write-Host "    Mensagem do commit: $commitMsg" -ForegroundColor Gray
    git commit -m $commitMsg
    Write-OK "Commit criado"
}

# 8. Garantir branch main
Write-Step "Verificando branch..."
$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
if ($currentBranch -ne "main") {
    Write-Warn "Branch atual: $currentBranch — renomeando para main..."
    git branch -M main
}
Write-OK "Branch: main"

# 9. Push
Write-Step "Enviando para GitHub..."
Write-Warn "Se solicitado usuario/senha: use seu token de acesso pessoal (PAT) como senha."
Write-Warn "Acesse: https://github.com/settings/tokens para gerar um token (scope: repo)"
Write-Host ""

git push -u origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  SUCESSO! Projeto enviado para o GitHub." -ForegroundColor Green
    Write-Host ""
    $remoteUrl = git remote get-url origin 2>$null
    if ($remoteUrl -match "github\.com[/:](.+?)(?:\.git)?$") {
        $repoPath = $Matches[1]
        Write-Host "  Acesse: https://github.com/$repoPath" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Err "Falha no push. Verifique:"
    Write-Warn "1. O repositorio no GitHub existe e esta vazio"
    Write-Warn "2. Sua autenticacao (usuario + token PAT)"
    Write-Warn "3. Permissao de escrita no repositorio"
}

Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
