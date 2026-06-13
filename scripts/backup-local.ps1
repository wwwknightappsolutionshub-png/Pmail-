# Creates a local backup copy + zip (excludes node_modules and heavy build artifacts)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$parent = Split-Path -Parent $root
$source = $root
$copyName = "Hostnet Panel - Local Test"
$dest = Join-Path $parent $copyName
$zipPath = Join-Path $parent "Hostnet Panel-backup.zip"
$excludeDirs = @("node_modules", "dist", ".git")

function Copy-ProjectTree {
    param(
        [string]$From,
        [string]$To
    )

    if (Test-Path $To) {
        Remove-Item $To -Recurse -Force
    }
    New-Item -ItemType Directory -Path $To -Force | Out-Null

    Get-ChildItem -Path $From -Force | ForEach-Object {
        if ($excludeDirs -contains $_.Name) {
            return
        }
        $target = Join-Path $To $_.Name
        if ($_.PSIsContainer) {
            Copy-ProjectTree -From $_.FullName -To $target
        } else {
            Copy-Item -Path $_.FullName -Destination $target -Force
        }
    }
}

Write-Host "Source: $source"
Write-Host "Copy to: $dest"
Write-Host "Zip: $zipPath"

Copy-ProjectTree -From $source -To $dest

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $dest "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Done."
Write-Host "  Folder copy: $dest"
Write-Host "  Zip archive: $zipPath"
