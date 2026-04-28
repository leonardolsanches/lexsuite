# deploy-to-github.ps1
# Extrai o ZIP do Replit e faz push para o GitHub
# Uso: .\deploy-to-github.ps1
# Requisito: Git instalado no Windows (https://git-scm.com)

param(
    [string]$ZipFolder  = "D:\2026\Lex Suite",
    [string]$RepoUrl    = "https://github.com/leonardolsanches/lexsuite.git",
    [string]$Branch     = "main",
    [string]$WorkDir    = "$env:TEMP\lexsuite-deploy"
)

$ErrorActionPreference = "Stop"

# ── 1. Encontrar o ZIP mais recente na pasta ──────────────────────────────────
Write-Host "`n[1/5] Procurando ZIP em '$ZipFolder'..." -ForegroundColor Cyan

if (-not (Test-Path $ZipFolder)) {
    Write-Error "Pasta nao encontrada: $ZipFolder"
    exit 1
}

$zip = Get-ChildItem -Path $ZipFolder -Filter "*.zip" |
       Sort-Object LastWriteTime -Descending |
       Select-Object -First 1

if (-not $zip) {
    Write-Error "Nenhum arquivo .zip encontrado em '$ZipFolder'"
    exit 1
}

Write-Host "  ZIP encontrado: $($zip.Name) ($([math]::Round($zip.Length/1MB,1)) MB)" -ForegroundColor Green

# ── 2. Extrair ZIP ────────────────────────────────────────────────────────────
Write-Host "`n[2/5] Extraindo ZIP..." -ForegroundColor Cyan

$extractDir = Join-Path $WorkDir "extracted"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

Expand-Archive -Path $zip.FullName -DestinationPath $extractDir -Force

# Replit coloca tudo dentro de uma subpasta — detectar automaticamente
$innerDirs = Get-ChildItem -Path $extractDir -Directory
$sourceRoot = if ($innerDirs.Count -eq 1) { $innerDirs[0].FullName } else { $extractDir }
Write-Host "  Raiz do projeto: $sourceRoot" -ForegroundColor Green

# ── 3. Clonar ou atualizar repositorio ───────────────────────────────────────
Write-Host "`n[3/5] Preparando repositorio Git..." -ForegroundColor Cyan

$repoDir = Join-Path $WorkDir "repo"

if (Test-Path (Join-Path $repoDir ".git")) {
    Write-Host "  Repositorio ja existe — fazendo fetch..." -ForegroundColor Yellow
    Set-Location $repoDir
    git fetch origin 2>&1 | Out-Null
    git checkout $Branch 2>&1 | Out-Null
    git reset --hard "origin/$Branch" 2>&1 | Out-Null
} else {
    Write-Host "  Clonando $RepoUrl..." -ForegroundColor Yellow
    if (Test-Path $repoDir) { Remove-Item $repoDir -Recurse -Force }
    git clone --branch $Branch $RepoUrl $repoDir
    Set-Location $repoDir
}

Write-Host "  Repositorio pronto." -ForegroundColor Green

# ── 4. Copiar arquivos extraidos para o repositorio ──────────────────────────
Write-Host "`n[4/5] Sincronizando arquivos..." -ForegroundColor Cyan

# Preservar pasta .git do clone
$gitDir = Join-Path $repoDir ".git"
$tempGit = Join-Path $WorkDir ".git_backup"
if (Test-Path $tempGit) { Remove-Item $tempGit -Recurse -Force }
Copy-Item -Path $gitDir -Destination $tempGit -Recurse

# Limpar repositorio e copiar novo conteudo
Get-ChildItem -Path $repoDir -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force

Copy-Item -Path "$sourceRoot\*" -Destination $repoDir -Recurse -Force

# Restaurar .git
if (Test-Path $gitDir) { Remove-Item $gitDir -Recurse -Force }
Copy-Item -Path $tempGit -Destination $gitDir -Recurse

Set-Location $repoDir

$fileCount = (Get-ChildItem -Path $repoDir -Recurse -File |
              Where-Object { $_.FullName -notlike "*\.git\*" }).Count
Write-Host "  $fileCount arquivos copiados." -ForegroundColor Green

# ── 5. Commit e Push ──────────────────────────────────────────────────────────
Write-Host "`n[5/5] Fazendo commit e push..." -ForegroundColor Cyan

git add -A

$status = git status --porcelain
if (-not $status) {
    Write-Host "  Nenhuma alteracao detectada — nada a commitar." -ForegroundColor Yellow
    exit 0
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$commitMsg = "deploy: Replit export $timestamp (ZIP: $($zip.Name))"

git commit -m $commitMsg
git push origin $Branch

Write-Host "`n✅ Push concluido com sucesso!" -ForegroundColor Green
Write-Host "   Commit: $commitMsg" -ForegroundColor Green
Write-Host "   Render vai iniciar o redeploy automaticamente.`n" -ForegroundColor Green
