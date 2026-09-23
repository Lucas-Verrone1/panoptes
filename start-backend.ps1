$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root 'backend'
Set-Location $Backend

if (-not (Test-Path '.\.venv\Scripts\python.exe')) {
  throw 'Ambiente .venv não encontrado. Execute .\setup-local.ps1 primeiro.'
}
if (-not (Test-Path '.env')) {
  throw 'backend/.env não encontrado. Copie .env.example para .env e preencha as chaves.'
}

& '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port 8000
