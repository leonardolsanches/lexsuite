#!/usr/bin/env python3
"""
deploy-github.py — Envia o projeto Lex Suite para o GitHub
Uso: python deploy-github.py

Fluxo:
  1. Detecta o ZIP baixado do Replit na pasta atual (ou pede o caminho)
  2. Extrai o ZIP automaticamente
  3. Faz commit e push para o GitHub

O token é lido de (em ordem de prioridade):
  1. Variável de ambiente GITHUB_PERSONAL_ACCESS_TOKEN
  2. Arquivo .env.deploy na mesma pasta que este script
     (formato: GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...)

O arquivo .env.deploy está no .gitignore e nunca é commitado.
"""

import subprocess
import sys
import os
import re
import zipfile
import shutil
from datetime import datetime
from pathlib import Path


# ── Cores ANSI ──────────────────────────────────────────────────────────────

def cyan(s):    return f"\033[96m{s}\033[0m"
def green(s):   return f"\033[92m{s}\033[0m"
def yellow(s):  return f"\033[93m{s}\033[0m"
def red(s):     return f"\033[91m{s}\033[0m"
def magenta(s): return f"\033[95m{s}\033[0m"
def gray(s):    return f"\033[90m{s}\033[0m"
def bold(s):    return f"\033[1m{s}\033[0m"

def step(msg):  print(f"\n{cyan('==>')} {msg}")
def ok(msg):    print(f"    {green('OK')}  {msg}")
def warn(msg):  print(f"    {yellow('AV')}  {msg}")
def err(msg):   print(f"    {red('ERR')} {msg}")
def info(msg):  print(f"    {gray('...')} {msg}")


# ── Helpers git ──────────────────────────────────────────────────────────────

def git(*args):
    result = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def git_live(*args):
    return subprocess.run(["git"] + list(args)).returncode == 0


# ── Token ────────────────────────────────────────────────────────────────────

PLACEHOLDER = "ghp_SeuTokenAqui"


def load_token(script_dir: Path):
    # 1. Variável de ambiente
    token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "").strip()
    if token and token != PLACEHOLDER:
        return token

    # 2. Arquivo .env.deploy — lê com utf-8-sig para ignorar BOM do PowerShell/Notepad
    for base in [script_dir, Path.cwd()]:
        env_file = base / ".env.deploy"
        if env_file.exists():
            try:
                text = env_file.read_text(encoding="utf-8-sig")
            except Exception:
                text = env_file.read_text(encoding="utf-8", errors="replace")
            for line in text.splitlines():
                line = line.strip()
                if line.startswith("GITHUB_PERSONAL_ACCESS_TOKEN="):
                    t = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if t and t != PLACEHOLDER:
                        return t

    return None


def create_env_deploy_template(script_dir: Path):
    env_file = script_dir / ".env.deploy"
    if not env_file.exists():
        env_file.write_text(
            "# Token de acesso pessoal do GitHub (nunca commitar este arquivo)\n"
            "# Gere em: GitHub > Settings > Developer settings > Personal access tokens > Classic\n"
            "# Scope necessário: repo\n"
            "GITHUB_PERSONAL_ACCESS_TOKEN=\n",
            encoding="utf-8",
        )
        return env_file
    return env_file


def inject_token_in_url(url: str, token: str) -> str:
    url = re.sub(r"https?://(?:[^@]+@)?", "", url)
    return f"https://oauth2:{token}@{url}"


# ── ZIP ───────────────────────────────────────────────────────────────────────

MARKER = "pnpm-workspace.yaml"


def find_zips(folder: Path) -> list[Path]:
    """Retorna ZIPs na pasta, mais recente primeiro."""
    zips = sorted(folder.glob("*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    return zips


def zip_contains_marker(zf: zipfile.ZipFile) -> bool:
    """Verifica se o ZIP contém pnpm-workspace.yaml (em qualquer nível)."""
    return any(MARKER in name for name in zf.namelist())


def extract_zip(zip_path: Path, dest: Path) -> Path:
    """
    Extrai o ZIP em dest/ com barra de progresso.
    Retorna o caminho da raiz do projeto.
    """
    tmp = dest / f"_zip_extract_{zip_path.stem}"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        entries = zf.infolist()
        total = len(entries)
        bar_width = 40

        print(f"    {'Arquivos':10}  {'Progresso'}")
        for i, entry in enumerate(entries, 1):
            zf.extract(entry, tmp)

            # Barra de progresso
            pct = i / total
            filled = int(bar_width * pct)
            bar = "█" * filled + "░" * (bar_width - filled)
            label = entry.filename[-38:] if len(entry.filename) > 38 else entry.filename
            print(f"\r    {i:4}/{total:<4}  [{bar}] {pct:5.1%}  {label:<40}", end="", flush=True)

        print()  # nova linha após concluir

    # Encontra a raiz do projeto dentro do extraído
    project_root = _find_project_root(tmp)
    if project_root is None:
        subdirs = [p for p in tmp.iterdir() if p.is_dir()]
        project_root = subdirs[0] if subdirs else tmp

    info("Movendo arquivos para a pasta de destino...")
    _merge_into(project_root, dest)
    shutil.rmtree(tmp)

    return dest


def _find_project_root(base: Path) -> Path | None:
    """Procura recursivamente por pnpm-workspace.yaml."""
    if (base / MARKER).exists():
        return base
    for child in sorted(base.iterdir()):
        if child.is_dir():
            found = _find_project_root(child)
            if found:
                return found
    return None


def _merge_into(src: Path, dst: Path):
    """Copia src/* → dst/, sobrescrevendo arquivos existentes."""
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        dest_item = dst / item.name
        if item.is_dir():
            if dest_item.exists():
                shutil.rmtree(dest_item)
            shutil.copytree(item, dest_item)
        else:
            shutil.copy2(item, dest_item)


def locate_project(script_dir: Path) -> Path:
    """
    Encontra ou extrai a raiz do projeto. Retorna o Path da raiz.
    Estratégia:
      1. Já existe pnpm-workspace.yaml aqui? → usa direto
      2. Existe em subpasta? → usa subpasta
      3. Existe ZIP do Replit aqui? → extrai e usa
      4. Pede ao usuário o caminho do ZIP
    """
    cwd = Path.cwd()

    # 1. Raiz na pasta atual
    if (cwd / MARKER).exists():
        return cwd

    # 2. Raiz em subpasta imediata
    for sub in sorted(cwd.iterdir()):
        if sub.is_dir() and (sub / MARKER).exists():
            return sub

    # 3. Busca ZIP na pasta atual
    step("Projeto não encontrado. Procurando ZIP do Replit...")
    zips = find_zips(cwd)
    # Filtra ZIPs que parecem ser do Replit (contêm o marker)
    replit_zips = []
    for z in zips:
        try:
            with zipfile.ZipFile(z) as zf:
                if zip_contains_marker(zf):
                    replit_zips.append(z)
        except Exception:
            pass

    if not replit_zips and zips:
        # Tem ZIPs mas nenhum tem o marker — oferece o mais recente
        replit_zips = [zips[0]]

    zip_path = None
    if replit_zips:
        zip_path = replit_zips[0]
        info(f"ZIP encontrado: {zip_path.name}")
        usar = input(f"    Extrair este arquivo? (S/n): ").strip().lower()
        if usar == "n":
            zip_path = None

    if zip_path is None:
        print()
        print(gray("    Baixe o ZIP do Replit: menu ⋯ → Download as ZIP"))
        print(gray(f"    Depois coloque o ZIP em: {cwd}"))
        print()
        caminho = input("    Ou cole o caminho completo do ZIP: ").strip().strip('"')
        if not caminho:
            return cwd  # fallback: usa pasta atual e deixa git reclamar
        zip_path = Path(caminho)
        if not zip_path.exists():
            err(f"Arquivo não encontrado: {zip_path}")
            return cwd

    # Extrai
    info(f"Extraindo {zip_path.name} → {cwd} ...")
    project_root = extract_zip(zip_path, cwd)
    ok(f"ZIP extraído com sucesso")

    # Renomeia o ZIP para não reprocessar da próxima vez
    done_path = zip_path.with_suffix(".zip.done")
    try:
        zip_path.rename(done_path)
        info(f"ZIP renomeado para: {done_path.name}  (não será reprocessado)")
    except Exception:
        pass

    return project_root


# ── Pause / exit ─────────────────────────────────────────────────────────────

def pause_exit():
    print(gray("\nPressione Enter para fechar..."))
    input()
    sys.exit(1)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    if sys.platform == "win32":
        os.system("")   # ativa ANSI no terminal Windows

    script_dir = Path(__file__).parent.resolve()

    print()
    print(magenta("  LEX SUITE — Deploy para GitHub"))
    print(magenta("  ================================"))
    print()

    # 1. Git instalado?
    step("Verificando instalação do Git...")
    rc, out, _ = git("--version")
    if rc != 0:
        err("Git não encontrado. Baixe em: https://git-scm.com/download/win")
        pause_exit()
    ok(out)

    # 2. Localizar / extrair projeto
    step("Localizando projeto...")
    project_root = locate_project(script_dir)
    os.chdir(project_root)
    ok(f"Pasta do projeto: {project_root}")

    # 3. Token
    step("Carregando token de acesso GitHub...")
    token = load_token(script_dir)
    if token:
        masked = token[:6] + "..." + token[-4:] if len(token) > 10 else "***"
        ok(f"Token encontrado: {masked}")
    else:
        env_file = create_env_deploy_template(script_dir)
        warn("Token não encontrado no .env.deploy nem na variável de ambiente.")
        print()
        print(gray("    Como gerar o token:"))
        print(gray("    GitHub → Settings → Developer settings"))
        print(gray("    → Personal access tokens → Classic → New token → scope: repo"))
        print()
        token = input("    Cole seu token GitHub agora (ghp_...): ").strip()
        if not token or token == PLACEHOLDER or not token.startswith("ghp_"):
            err("Token inválido. Abortando.")
            pause_exit()
        # Salva no .env.deploy para próximas execuções
        env_file.write_text(
            f"GITHUB_PERSONAL_ACCESS_TOKEN={token}\n",
            encoding="utf-8",
        )
        ok(f"Token salvo em: {env_file}")
        masked = token[:6] + "..." + token[-4:]
        ok(f"Token: {masked}")

    # 4. URL do repositório
    step("Configurando repositório remoto...")
    rc, existing_remote, _ = git("remote", "get-url", "origin")
    clean_existing = re.sub(r"https?://[^@]+@", "https://", existing_remote) if rc == 0 else ""
    repo_url = clean_existing

    if repo_url:
        ok(f"Remote já configurado: {repo_url}")
        trocar = input("    Deseja usar outra URL? (s/N): ").strip().lower()
        if trocar == "s":
            repo_url = ""

    if not repo_url:
        print()
        print(gray("    Crie um repositório VAZIO no GitHub (sem README) e cole a URL abaixo."))
        print(gray("    Exemplo: https://github.com/seu-usuario/lex-suite.git"))
        print()
        repo_url = input("    URL do repositório GitHub: ").strip()
        if not repo_url:
            err("URL não fornecida. Abortando.")
            pause_exit()

    # 5. Init git se necessário
    step("Verificando repositório Git local...")
    if not Path(".git").exists():
        warn("Nenhum repositório git. Inicializando...")
        git_live("init", "-b", "main")
        ok("Repositório inicializado (branch: main)")
    else:
        ok("Repositório git já existe")

    # 6. Identidade git
    _, git_name, _  = git("config", "user.name")
    _, git_email, _ = git("config", "user.email")
    if not git_name or not git_email:
        step("Configurando identidade Git...")
        if not git_name:
            git_name = input("    Seu nome completo: ").strip()
            git("config", "user.name", git_name)
        if not git_email:
            git_email = input("    Seu e-mail GitHub: ").strip()
            git("config", "user.email", git_email)
        ok(f"Identidade: {git_name} <{git_email}>")

    # 7. Configurar remote com token embutido na URL
    step("Configurando remote origin (com autenticação)...")
    auth_url = inject_token_in_url(repo_url, token)
    _, remotes, _ = git("remote")
    if "origin" in remotes.splitlines():
        git("remote", "set-url", "origin", auth_url)
    else:
        git("remote", "add", "origin", auth_url)
    ok(f"Remote configurado: {repo_url}  (token injetado na URL)")

    # 8. Exclusões locais (.git/info/exclude — nunca commitado)
    step("Configurando exclusões locais...")
    exclude_path = Path(".git") / "info" / "exclude"
    exclude_path.parent.mkdir(parents=True, exist_ok=True)
    local_excludes = [
        "# Arquivos locais — gerado por deploy-github.py",
        "*.exe",           # instaladores
        "*.zip",           # ZIPs do Replit
        "*.zip.done",      # ZIPs já processados
        "*.pptx",          # apresentações locais
        "*.ogg",           # áudios
        "*.mp3",
        "*.mp4",           # vídeos
        "*.opus",
        "*.pdf",           # PDFs locais (fora de artifacts/)
        "Troubleshooting/",
        "*.html",          # HTMLs locais avulsos
        "*.env",           # arquivos de env locais
        ".env.deploy",
        "deploy-to-github.ps1",
        "cli_*.zip",
    ]
    existing = exclude_path.read_text(encoding="utf-8") if exclude_path.exists() else ""
    marker = "# Arquivos locais — gerado por deploy-github.py"
    if marker not in existing:
        with exclude_path.open("a", encoding="utf-8") as f:
            f.write("\n" + "\n".join(local_excludes) + "\n")
        ok("Exclusões locais configuradas (.git/info/exclude)")
    else:
        ok("Exclusões locais já configuradas")

    # 9. Remove do tracking arquivos locais que não devem ir ao GitHub
    step("Removendo arquivos locais do tracking git...")
    SKIP_EXTS = {".exe", ".zip", ".pptx", ".ogg", ".mp3", ".mp4", ".opus", ".pdf", ".env", ".ps1"}
    SKIP_SUFFIXES = (".zip.done", ".done")
    SKIP_DIRS = {"Troubleshooting"}
    SKIP_NAMES = {".env.deploy", "deploy-to-github.ps1"}

    _, tracked_raw, _ = git("ls-files")
    to_untrack = []
    for fpath in tracked_raw.splitlines():
        p = Path(fpath)
        if (
            p.suffix.lower() in SKIP_EXTS
            or any(fpath.endswith(s) for s in SKIP_SUFFIXES)
            or p.name in SKIP_NAMES
            or any(part in SKIP_DIRS for part in p.parts)
        ):
            to_untrack.append(fpath)

    if to_untrack:
        for fpath in to_untrack:
            git("rm", "--cached", "-q", "--", fpath)
        ok(f"{len(to_untrack)} arquivo(s) local(is) removido(s) do tracking")
    else:
        ok("Nenhum arquivo local no tracking")

    # 10. Stage e commit
    step("Preparando arquivos para commit...")
    git_live("add", "--all")
    _, status, _ = git("status", "--short")
    if not status:
        warn("Nenhuma alteração nova para commitar.")
    else:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        commit_msg = f"chore: deploy Lex Suite {ts}"
        info(f"Mensagem: {commit_msg}")
        git_live("commit", "-m", commit_msg)
        ok("Commit criado")

    # 9. Branch main
    step("Verificando branch...")
    _, branch, _ = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch != "main":
        warn(f"Branch atual: {branch} — renomeando para main...")
        git_live("branch", "-M", "main")
    ok("Branch: main")

    # 10. Push
    step("Enviando para GitHub...")
    print()
    success = git_live("push", "-u", "origin", "main")
    print()

    if not success:
        # Repositório remoto já tem conteúdo sem histórico em comum → force push
        warn("Push normal falhou (repositório remoto não está vazio).")
        warn("O Replit é a fonte da verdade — será feito force push.")
        warn("O conteúdo atual do GitHub será SUBSTITUÍDO pelo projeto do Replit.")
        print()
        confirmar = input("    Confirmar? (s/N): ").strip().lower()
        if confirmar == "s":
            print()
            success = git_live("push", "-u", "--force", "origin", "main")
            print()
        else:
            err("Abortado pelo usuário.")

    if success:
        print(green("  SUCESSO! Projeto enviado para o GitHub."))
        m = re.search(r"github\.com[/:](.+?)(?:\.git)?$", repo_url)
        if m:
            print(cyan(f"  Acesse: https://github.com/{m.group(1)}"))
    else:
        err("Falha no push. Verifique:")
        warn("1. O token tem permissão de escrita (scope: repo)")
        warn("2. O token não está expirado")
        warn("3. O nome do repositório está correto")

    print()
    print(gray("Pressione Enter para fechar..."))
    input()


if __name__ == "__main__":
    main()
