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

# Caracteres invalidos no Windows para nomes de arquivo/pasta
$invalidChars = [System.IO.Path]::GetInvalidFileNameChars() + [System.IO.Path]::GetInvalidPathChars() | Select-Object -Unique
$invalidPattern = ($invalidChars | ForEach-Object { [regex]::Escape($_) }) -join '|'

function SanitizePath($path) {
    # Preservar separadores de pasta, sanitizar apenas cada segmento
    $parts = $path -split '[/\\]'
    $safe  = $parts | ForEach-Object { $_ -replace $invalidPattern, '_' }
    return $safe -join '\'
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

# ── 2. Extrair ZIP (com sanitizacao de nomes invalidos no Windows) ────────────
Write-Host ""
Write-Host "[2/5] Extraindo ZIP..." -ForegroundColor Cyan

Add-Type -AssemblyName System.IO.Compression.FileSystem

$extractDir = Join-Path $WorkDir "extracted"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

try {
    $zipArchive = [System.IO.Compression.ZipFile]::OpenRead($zip.FullName)
    $total = $zipArchive.Entries.Count
    $extracted = 0
    $skipped = 0

    foreach ($entry in $zipArchive.Entries) {
        $safeName = SanitizePath $entry.FullName
        $destPath = Join-Path $extractDir $safeName

        if ($entry.Name -eq '') {
            # E uma pasta
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        } else {
            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            try {
                $stream = $entry.Open()
                $outStream = [System.IO.File]::Create($destPath)
                $stream.CopyTo($outStream)
                $outStream.Close()
                $stream.Close()
                $extracted++
            } catch {
                $skipped++
            }
        }
    }
    $zipArchive.Dispose()
    Write-Host "  Extraidos: $extracted arquivos ($skipped ignorados de $total entradas)" -ForegroundColor Green
} catch {
    Fail "Falha ao abrir ZIP: $_"
}

# Detectar raiz do projeto: se houver exatamente uma subpasta e zero arquivos na raiz
$innerDirs  = Get-ChildItem -Path $extractDir -Directory
$innerFiles = Get-ChildItem -Path $extractDir -File
$sourceRoot = if ($innerDirs.Count -eq 1 -and $innerFiles.Count -eq 0) {
    $innerDirs[0].FullName
} else {
    $extractDir
}

$totalSource = (Get-ChildItem -Path $sourceRoot -Recurse -Force).Count
Write-Host "  Raiz do projeto: $sourceRoot ($totalSource itens)" -ForegroundColor Green

if ($totalSource -eq 0) { Fail "Nenhum arquivo encontrado apos extracao." }

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

Get-ChildItem -Path $repoDir -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force

$roboOut = robocopy $sourceRoot $repoDir /E /NFL /NDL /NJH /NJS /NC /NS /NP 2>&1
if ($LASTEXITCODE -ge 8) { Fail "Copia de arquivos falhou (robocopy exit $LASTEXITCODE): $roboOut" }

$fileCount = (Get-ChildItem -Path $repoDir -Recurse -Force -File |
              Where-Object { $_.FullName -notlike "*\.git\*" }).Count
Write-Host "  $fileCount arquivos copiados para o repositorio." -ForegroundColor Green

if ($fileCount -eq 0) { Fail "Nenhum arquivo foi copiado." }

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

Write-Host "  Alteracoes detectadas: $(($status | Measure-Object).Count) arquivo(s)" -ForegroundColor Green

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
