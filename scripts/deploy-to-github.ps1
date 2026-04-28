# deploy-to-github.ps1
# Extrai o ZIP do Replit e faz push para o GitHub
# Uso: .\deploy-to-github.ps1
# Uso com bypass: powershell -ExecutionPolicy Bypass -File ".\deploy-to-github.ps1"
# Requisito: Git instalado (https://git-scm.com)

param(
    [string]$ZipFolder = "D:\2026\Lex Suite",
    [string]$RepoUrl   = "https://github.com/leonardolsanches/lexsuite.git",
    [string]$Branch    = "main",
    [string]$WorkDir   = "$env:TEMP\lexsuite-deploy"
)

function Fail($msg) {
    Write-Host "`n❌ ERRO: $msg" -ForegroundColor Red
    exit 1
}

# ── 1. Encontrar o ZIP mais recente ──────────────────────────────────────────
Write-Host "`n[1/5] Procurando ZIP em '$ZipFolder'..." -ForegroundColor Cyan

if (-not (Test-Path $ZipFolder)) { Fail "Pasta nao encontrada: $ZipFolder" }

$zip = Get-ChildItem -Path $ZipFolder -Filter "*.zip" |
       Sort-Object LastWriteTime -Descending |
       Select-Object -First 1

if (-not $zip) { Fail "Nenhum arquivo .zip encontrado em '$ZipFolder'" }

Write-Host "  ZIP: $($zip.Name)  ($([math]::Round($zip.Length/1MB,1)) MB)" -ForegroundColor Green

# ── 2. Extrair ZIP ────────────────────────────────────────────────────────────
Write-Host "`n[2/5] Extraindo ZIP..." -ForegroundColor Cyan

$extractDir = Join-Path $WorkDir "extracted"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

try {
    Expand-Archive -Path $zip.FullName -DestinationPath $extractDir -Force
} catch {
    Fail "Falha ao extrair ZIP: $_"
}

# Replit coloca tudo dentro de uma subpasta — detectar automaticamente
$innerDirs = Get-ChildItem -Path $extractDir -Directory
$sourceRoot = if ($innerDirs.Count -eq 1) { $innerDirs[0].FullName } else { $extractDir }
Write-Host "  Raiz do projeto: $sourceRoot" -ForegroundColor Green

# ── 3. Clonar repositorio sempre do zero ─────────────────────────────────────
Write-Host "`n[3/5] Clonando repositorio..." -ForegroundColor Cyan

$repoDir = Join-Path $WorkDir "repo"
if (Test-Path $repoDir) { Remove-Item $repoDir -Recurse -Force }

$cloneOutput = git clone --branch $Branch $RepoUrl $repoDir 2>&1
if ($LASTEXITCODE -ne 0) { Fail "git clone falhou:`n$cloneOutput" }

Write-Host "  Repositorio clonado." -ForegroundColor Green

# ── 4. Substituir arquivos pelo conteudo do ZIP ───────────────────────────────
Write-Host "`n[4/5] Sincronizando arquivos..." -ForegroundColor Cyan

# Remover tudo exceto .git
Get-ChildItem -Path $repoDir -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force

# Copiar conteudo extraido
Copy-Item -Path "$sourceRoot\*" -Destination $repoDir -Recurse -Force

$fileCount = (Get-ChildItem -Path $repoDir -Recurse -File |
              Where-Object { $_.FullName -notlike "*\.git\*" }).Count
Write-Host "  $fileCount arquivos copiados." -ForegroundColor Green

# ── 5. Commit e Push ──────────────────────────────────────────────────────────
Write-Host "`n[5/5] Fazendo commit e push..." -ForegroundColor Cyan

Set-Location $repoDir

git config user.email "deploy@lexsuite.local" 2>&1 | Out-Null
git config user.name  "Lex Suite Deploy"      2>&1 | Out-Null

git add -A 2>&1 | Out-Null

$status = git status --porcelain 2>&1
if (-not $status) {
    Write-Host "`n  Nenhuma alteracao detectada — repositorio ja esta atualizado." -ForegroundColor Yellow
    exit 0
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$commitMsg = "deploy: Replit export $timestamp (ZIP: $($zip.Name))"

$commitOut = git commit -m $commitMsg 2>&1
if ($LASTEXITCODE -ne 0) { Fail "git commit falhou:`n$commitOut" }

$pushOut = git push origin $Branch 2>&1
if ($LASTEXITCODE -ne 0) { Fail "git push falhou (verifique suas credenciais):`n$pushOut" }

Write-Host "`n✅ Deploy concluido!" -ForegroundColor Green
Write-Host "   Commit: $commitMsg" -ForegroundColor Green
Write-Host "   Render iniciara o redeploy automaticamente.`n" -ForegroundColor Green
