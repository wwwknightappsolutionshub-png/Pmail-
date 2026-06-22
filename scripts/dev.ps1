# Start hmail API + web without concurrently (Windows-friendly)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Preparing SQLite database (demo tenant)..."
Push-Location "$root\apps\hmail-api"
npx dotenv-cli -e ../../.env -- npx tsx scripts/prisma-cli.ts db push --schema prisma/schema.sqlite.prisma --skip-generate | Out-Null
npx dotenv-cli -e ../../.env -- npx tsx prisma/seed.ts
Pop-Location

Write-Host "Starting hmail-api on http://localhost:4000"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd '$root\apps\hmail-api'; npx dotenv-cli -e ../../.env -- npx tsx watch src/index.ts"
) | Out-Null

Start-Sleep -Seconds 2

Write-Host "Starting hmail-web on http://localhost:5173"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd '$root\apps\hmail-web'; npx vite"
) | Out-Null

Start-Sleep -Seconds 2

Write-Host "Starting hostnet-web on http://localhost:5174"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd '$root\apps\hostnet-web'; npx vite"
) | Out-Null

Start-Sleep -Seconds 2
Start-Process "http://localhost:5174"

Write-Host ""
Write-Host "Landing:  http://localhost:5174"
Write-Host "Panel:    http://localhost:5174/panel/login (demo@hostnet.local / panel123)"
Write-Host "hmail:    http://localhost:5173/login"
Write-Host "Tester:   http://localhost:5173/login/pmail-tester (pmailtester@gmail.com / mailtester1234)"
Write-Host "Admin:    http://localhost:5174/admin/login (admin@hostnet.local / changeme123)"
Write-Host "Sign in to hmail with your Hostinger mailbox email + password."
