$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root 'backend'

Write-Host '== PANOPTES: preparando ambiente local ==' -ForegroundColor Cyan

foreach ($cmd in @('python','node','npm','docker')) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Comando '$cmd' não encontrado. Instale/configure antes de continuar."
  }
}

Write-Host "Python: $(python --version)"
Write-Host "Node: $(node --version)"
Write-Host "npm: $(npm --version)"
Write-Host "Docker: $(docker --version)"

Set-Location $Backend
if (-not (Test-Path '.\.venv\Scripts\python.exe')) {
  Write-Host 'Criando ambiente virtual Python...'
  python -m venv .venv
}

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
& '.\.venv\Scripts\python.exe' -m pip install --upgrade pip
& '.\.venv\Scripts\python.exe' -m pip install -r requirements.txt
& '.\.venv\Scripts\python.exe' -m playwright install chromium

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Warning 'backend/.env foi criado a partir do exemplo. Preencha Supabase, Gemini e o secret do n8n antes de iniciar.'
}

Set-Location $Root
if (-not (Test-Path '.env.local')) {
  Copy-Item '.env.example' '.env.local'
  Write-Host '.env.local criado para o frontend.'
}

Write-Host 'Instalando dependências do frontend...'
npm install

Write-Host ''
Write-Host 'Ambiente preparado.' -ForegroundColor Green
Write-Host 'Banco novo: rode backend/sql/schema.sql e depois backend/sql/migrations/002_ingestion.sql.'
Write-Host 'Banco existente anterior ao Zendesk: rode também backend/sql/migrations/003_zendesk.sql.'
Write-Host 'Depois use start-backend.ps1 e start-frontend.ps1 em terminais separados.'
