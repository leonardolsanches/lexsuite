#!/usr/bin/env python3
"""
deploy-github.py — Envia o projeto Lex Suite para o GitHub
Uso: python deploy-github.py
Requerimentos: Python 3.8+ e Git instalados
"""

import subprocess
import sys
import os
from datetime import datetime


# ── Cores ANSI (funcionam no Windows 10+ e no terminal Python) ─────────────

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


def git(*args, capture=True, check=False):
    """Executa um comando git e retorna (returncode, stdout, stderr)."""
    result = subprocess.run(
        ["git"] + list(args),
        capture_output=capture,
        text=True,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def git_ok(*args):
    """Executa git e imprime saída em tempo real. Retorna True se sucesso."""
    result = subprocess.run(["git"] + list(args))
    return result.returncode == 0


def pause_exit():
    print(gray("\nPressione Enter para fechar..."))
    input()
    sys.exit(1)


def main():
    # Ativar cores ANSI no Windows
    if sys.platform == "win32":
        os.system("")

    print()
    print(magenta("  LEX SUITE — Deploy para GitHub"))
    print(magenta("  ================================"))
    print()

    # ── 1. Verificar Git ────────────────────────────────────────────────────
    step("Verificando instalação do Git...")
    rc, out, _ = git("--version")
    if rc != 0:
        err("Git não encontrado.")
        warn("Baixe em: https://git-scm.com/download/win")
        pause_exit()
    ok(out)

    # ── 2. Verificar pasta do projeto ───────────────────────────────────────
    step("Verificando pasta do projeto...")
    if not os.path.exists("pnpm-workspace.yaml"):
        err("Execute na pasta raiz do projeto (onde está o pnpm-workspace.yaml).")
        warn(f"Pasta atual: {os.getcwd()}")
        pause_exit()
    ok(f"Pasta correta: {os.getcwd()}")

    # ── 3. URL do repositório GitHub ────────────────────────────────────────
    step("Configurando repositório remoto...")
    rc, existing_remote, _ = git("remote", "get-url", "origin")
    repo_url = existing_remote if rc == 0 else ""

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

    # ── 4. Inicializar git ──────────────────────────────────────────────────
    step("Verificando repositório Git local...")
    if not os.path.exists(".git"):
        warn("Nenhum repositório git encontrado. Inicializando...")
        git_ok("init", "-b", "main")
        ok("Repositório inicializado (branch: main)")
    else:
        ok("Repositório git já existe")

    # ── 5. Identidade git ───────────────────────────────────────────────────
    _, git_name, _  = git("config", "user.name")
    _, git_email, _ = git("config", "user.email")

    if not git_name or not git_email:
        step("Configurando identidade Git...")
        if not git_name:
            git_name = input("    Seu nome completo (para os commits): ").strip()
            git("config", "user.name", git_name)
        if not git_email:
            git_email = input("    Seu e-mail GitHub: ").strip()
            git("config", "user.email", git_email)
        ok(f"Identidade: {git_name} <{git_email}>")

    # ── 6. Configurar remote ────────────────────────────────────────────────
    step("Configurando remote origin...")
    rc_remote, _, _ = git("remote")
    _, remotes, _ = git("remote")
    if "origin" in remotes.splitlines():
        git("remote", "set-url", "origin", repo_url)
        ok(f"Remote atualizado: {repo_url}")
    else:
        git("remote", "add", "origin", repo_url)
        ok(f"Remote adicionado: {repo_url}")

    # ── 7. Stage e commit ───────────────────────────────────────────────────
    step("Preparando arquivos para commit...")
    git_ok("add", "--all")
    _, status, _ = git("status", "--short")

    if not status:
        warn("Nenhuma alteração nova para commitar.")
    else:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        commit_msg = f"chore: deploy Lex Suite {ts}"
        print(gray(f"    Mensagem do commit: {commit_msg}"))
        git_ok("commit", "-m", commit_msg)
        ok("Commit criado")

    # ── 8. Branch main ──────────────────────────────────────────────────────
    step("Verificando branch...")
    _, branch, _ = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch != "main":
        warn(f"Branch atual: {branch} — renomeando para main...")
        git_ok("branch", "-M", "main")
    ok("Branch: main")

    # ── 9. Push ─────────────────────────────────────────────────────────────
    step("Enviando para GitHub...")
    print()
    warn("Se pedir senha: use seu Token de Acesso Pessoal (PAT), não a senha do GitHub.")
    warn("Gere um token em: GitHub → Settings → Developer settings → Personal access tokens")
    warn("Escopo necessário: repo")
    print()

    success = git_ok("push", "-u", "origin", "main")

    print()
    if success:
        print(green("  SUCESSO! Projeto enviado para o GitHub."))
        print()
        # Extrair caminho do repo da URL para mostrar link
        import re
        m = re.search(r"github\.com[/:](.+?)(?:\.git)?$", repo_url)
        if m:
            print(cyan(f"  Acesse: https://github.com/{m.group(1)}"))
    else:
        err("Falha no push. Verifique:")
        warn("1. O repositório no GitHub existe e está vazio")
        warn("2. Sua autenticação (usuário + token PAT como senha)")
        warn("3. Permissão de escrita no repositório")

    print()
    print(gray("Pressione Enter para fechar..."))
    input()


if __name__ == "__main__":
    main()
