# Legacy archive note.
# Historical helper for bootstrapping a personal Vercel hobby repo.
# Kept only so accidental invocation does not imply current source of truth.

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "This script is deprecated legacy residue." -ForegroundColor Yellow
Write-Host "Personal-repo + Vercel-hobby bootstrap is not part of the active operating model for this project." -ForegroundColor Yellow
Write-Host "Use docs/OPERATIONS.md for current repository and release guidance." -ForegroundColor Cyan
exit 1
