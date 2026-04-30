#!/usr/bin/env python3
"""
deploy-github.py — Envia o projeto Lex Suite para o GitHub
Uso: python deploy-github.py

O token é lido de (em ordem de prioridade):
  1. Variável de ambiente GITHUB_PERSONAL_ACCESS_TOKEN
  2. Arquivo .env.deploy na mesma pasta (formato: GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...)

O arquivo .env.deploy está no .gitignore e nunca é commitado.
"""

import subprocess
import sys
import os
import re
from datetime import datetime
from pathlib import Path


# ── Cores ANSI ──────────────────────────────────────────────────────────────

def cyan(s):    return f"\033[96m{s}\033[0m"
def green(s):   return f"\033[92m{s}\033[0m"
def yellow(s):  return f"\033[93m{s}\033[0m"
def red(s):     return f"\033[91m{s}\033[0m"
def magenta(s): return f"\033[95m{s}\033[0m"
def gray(s):    return f"\033[90m{s}\033[0m"

def step(msg):  print(f"\n{cyan('==>')} {msg}")
def ok(msg):    print(f"    {green('OK')}  {msg}")
def warn(msg):  print(f"    {yellow('AV')}  {msg}")
def err(msg):   print(f"    {red('ERR')} {msg}")


# ── Helpers git ──────────────────────────────────────────────────────────────

def git(*args, capture=True):
    result = subprocess.run(["git"] + list(args), capture_output=capture, text=True)
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def git_live(*args):
    """Executa git com saída em tempo real. Retorna True se sucesso."""
    return subprocess.run(["git"] + list(args)).returncode == 0


# ── Carregar token ───────────────────────────────────────────────────────────

def load_token():
    """Busca GITHUB_PERSONAL_ACCESS_TOKEN: env var → .env.deploy → None."""
    # 1. Variável de ambiente
    token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "").strip()
    if token:
        return token

    # 2. Arquivo .env.deploy
    env_file = Path(__file__).parent / ".env.deploy"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GITHUB_PERSONAL_ACCESS_TOKEN="):
                token = line.split("=", 1)[1].strip().strip('"').strip("'")
                if token:
                    return token

    return None


def create_env_deploy_template():
    """Cria .env.deploy vazio com instruções se não existir."""
    env_file = Path(__file__).parent / ".env.deploy"
    if not env_file.exists():
        env_file.write_text(
            "# Token de acesso pessoal do GitHub (nunca commitar este arquivo)\n"
            "# Gere em: GitHub → Settings → Developer settings → Personal access tokens → Classic\n"
            "# Scope necessário: repo\n"
            "GITHUB_PERSONAL_ACCESS_TOKEN=\n",
            encoding="utf-8",
        )
        return True
    return False


def inject_token_in_url(url: str, token: str, username: str = "oauth2") -> str:
    """Insere o token na URL: https://TOKEN@github.com/..."""
    url = re.sub(r"https?://(?:[^@]+@)?", "", url)  # remove credencial antiga
    return f"https://{username}:{token}@{url}"


def pause_exit():
    print(gray("\nPressione Enter para fechar..."))
    input()
    sys.exit(1)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    if sys.platform == "win32":
        os.system("")   # ativa ANSI no terminal Windows

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

    # 2. Pasta correta?
    step("Verificando pasta do projeto...")
    if not Path("pnpm-workspace.yaml").exists():
        err("Execute na pasta raiz do projeto (onde está o pnpm-workspace.yaml).")
        warn(f"Pasta atual: {os.getcwd()}")
        pause_exit()
    ok(f"Pasta correta: {os.getcwd()}")

    # 3. Token
    step("Carregando token de acesso GitHub...")
    token = load_token()
    if token:
        masked = token[:6] + "..." + token[-4:] if len(token) > 10 else "***"
        ok(f"Token encontrado: {masked}")
    else:
        created = create_env_deploy_template()
        env_path = Path(__file__).parent / ".env.deploy"
        warn("Token não encontrado.")
        if created:
            warn(f"Arquivo criado: {env_path}")
        warn("Preencha GITHUB_PERSONAL_ACCESS_TOKEN no arquivo .env.deploy e execute novamente.")
        warn("Ou defina a variável de ambiente GITHUB_PERSONAL_ACCESS_TOKEN antes de rodar.")
        print()
        warn("Gere um token em: GitHub → Settings → Developer settings")
        warn("                 → Personal access tokens → Classic → scope: repo")
        pause_exit()

    # 4. URL do repositório
    step("Configurando repositório remoto...")
    rc, existing_remote, _ = git("remote", "get-url", "origin")
    # Remove token antigo da URL para comparar
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

    # 8. Stage e commit
    step("Preparando arquivos para commit...")
    git_live("add", "--all")
    _, status, _ = git("status", "--short")
    if not status:
        warn("Nenhuma alteração nova para commitar.")
    else:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        commit_msg = f"chore: deploy Lex Suite {ts}"
        print(gray(f"    Mensagem: {commit_msg}"))
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

    if success:
        print(green("  SUCESSO! Projeto enviado para o GitHub."))
        m = re.search(r"github\.com[/:](.+?)(?:\.git)?$", repo_url)
        if m:
            print(cyan(f"  Acesse: https://github.com/{m.group(1)}"))
    else:
        err("Falha no push. Verifique:")
        warn("1. O repositório no GitHub existe e está vazio (sem commits)")
        warn("2. O token tem permissão de escrita (scope: repo)")
        warn("3. O token não está expirado")

    print()
    print(gray("Pressione Enter para fechar..."))
    input()


if __name__ == "__main__":
    main()
