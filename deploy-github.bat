@echo off
:: Lançador para deploy-github.ps1
:: Clique duas vezes para executar, ou arraste para o terminal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-github.ps1"
