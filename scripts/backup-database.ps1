# PostgreSQL backup for Hostnet Panel production (Windows / dev)
# Usage: .\scripts\backup-database.ps1 [-OutputDir backups]
param(
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $OutputDir) { $OutputDir = Join-Path $Root "backups" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim().Trim('"'), "Process")
    }
  }
}

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is not set"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $OutputDir "hostnet-panel-$stamp.sql"
Write-Host "Writing backup to $outFile (requires pg_dump on PATH)"
& pg_dump $env:DATABASE_URL | Out-File -Encoding utf8 $outFile
Write-Host "Backup complete"
