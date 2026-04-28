# deploy-to-github.ps1
# Extrai o ZIP do Replit e faz push para o GitHub
# Uso: powershell -ExecutionPolicy Bypass -File ".\deploy-to-github.ps1"
# Requisito: Git instalado (https://git-scm.com)

param(
    [string]$ZipFolder = "D:\2026\Lex Suite",
    [string]$RepoUrl   = "https://github.com/leonardolsanches/lexsuite.git",
    [string]$Branch    = "main",
    [string]$WorkDir   = "$env:TEMP\lexsuite-deploy"
)

function Fail($msg) {
    Write-Host ""
    Write-Host "ERRO: $msg" -ForegroundColor Red
    exit 1
}

# ── 1. Encontrar o ZIP mais recente ──────────────────────────────────────────
Write-Host ""
Write-Host "[1/5] Procurando ZIP em '$ZipFolder'..." -ForegroundColor Cyan

if (-not (Test-Path $ZipFolder)) { Fail "Pasta nao encontrada: $ZipFolder" }

$zip = Get-ChildItem -Path $ZipFolder -Filter "*.zip" |
       Sort-Object LastWriteTime -Descending |
       Select-Object -First 1

if (-not $zip) { Fail "Nenhum arquivo .zip encontrado em '$ZipFolder'" }

Write-Host "  ZIP: $($zip.Name)  ($([math]::Round($zip.Length/1MB,1)) MB)" -ForegroundColor Green

# ── 2. Extrair ZIP ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Extraindo ZIP..." -ForegroundColor Cyan

$extractDir = Join-Path $WorkDir "extracted"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

try {
    Expand-Archive -Path $zip.FullName -DestinationPath $extractDir -Force
} catch {
    Fail "Falha ao extrair ZIP: $_"
}

# Detectar raiz do projeto: se houver exatamente uma subpasta, usa ela
$innerDirs  = Get-ChildItem -Path $extractDir -Directory -Force
$innerFiles = Get-ChildItem -Path $extractDir -File -Force
$sourceRoot = if ($innerDirs.Count -eq 1 -and $innerFiles.Count -eq 0) {
    $innerDirs[0].FullName
} else {
    $extractDir
}

$totalSource = (Get-ChildItem -Path $sourceRoot -Recurse -Force).Count
Write-Host "  Raiz do projeto: $sourceRoot" -ForegroundColor Green
Write-Host "  Itens no ZIP: $totalSource" -ForegroundColor Green

if ($totalSource -eq 0) { Fail "ZIP parece estar vazio apos extracao." }

# ── 3. Clonar repositorio ────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Clonando repositorio..." -ForegroundColor Cyan

$repoDir = Join-Path $WorkDir "repo"
if (Test-Path $repoDir) { Remove-Item $repoDir -Recurse -Force }

$cloneOutput = git clone --branch $Branch $RepoUrl $repoDir 2>&1
if ($LASTEXITCODE -ne 0) { Fail "git clone falhou: $cloneOutput" }

Write-Host "  Repositorio clonado." -ForegroundColor Green

# ── 4. Substituir arquivos com robocopy ───────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Sincronizando arquivos..." -ForegroundColor Cyan

# Remover tudo exceto .git
Get-ChildItem -Path $repoDir -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force

# robocopy copia tudo incluindo arquivos ocultos e subdiretorios
# /E = subdiretorios incluindo vazios | /NFL /NDL /NJH /NJS = silencioso
$roboOut = robocopy $sourceRoot $repoDir /E /NFL /NDL /NJH /NJS /NC /NS /NP 2>&1
# robocopy retorna 0-7 em sucesso (bit flags), apenas >= 8 e erro real
if ($LASTEXITCODE -ge 8) { Fail "Copia de arquivos falhou (robocopy exit $LASTEXITCODE): $roboOut" }

$fileCount = (Get-ChildItem -Path $repoDir -Recurse -Force -File |
              Where-Object { $_.FullName -notlike "*\.git\*" }).Count
Write-Host "  $fileCount arquivos copiados." -ForegroundColor Green

if ($fileCount -eq 0) { Fail "Nenhum arquivo foi copiado para o repositorio." }

# ── 5. Commit e Push ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Fazendo commit e push..." -ForegroundColor Cyan

Set-Location $repoDir

git config user.email "deploy@lexsuite.local" 2>&1 | Out-Null
git config user.name  "Lex Suite Deploy"      2>&1 | Out-Null
git add -A 2>&1 | Out-Null

$status = git status --porcelain 2>&1
if (-not $status) {
    Write-Host ""
    Write-Host "  Nenhuma alteracao detectada. Repositorio ja esta atualizado." -ForegroundColor Yellow
    exit 0
}

Write-Host "  Arquivos alterados: $(($status | Measure-Object).Count)" -ForegroundColor Green

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$commitMsg = "deploy: Replit export $timestamp (ZIP: $($zip.Name))"

$commitOut = git commit -m $commitMsg 2>&1
if ($LASTEXITCODE -ne 0) { Fail "git commit falhou: $commitOut" }

Write-Host "  Commit criado." -ForegroundColor Green

$pushOut = git push origin $Branch 2>&1
if ($LASTEXITCODE -ne 0) { Fail "git push falhou (verifique suas credenciais): $pushOut" }

Write-Host ""
Write-Host "DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "  Commit: $commitMsg" -ForegroundColor Green
Write-Host "  Render iniciara o redeploy automaticamente." -ForegroundColor Green
Write-Host ""
