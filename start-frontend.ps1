$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path 'node_modules')) {
  Write-Host 'node_modules não encontrado; executando npm install...'
  npm install
}

npm run dev
