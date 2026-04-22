# Legacy archive note.
# Historical helper for a personal Vercel hobby migration path.
# Kept only so old references fail loudly instead of suggesting stale production steps.

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "This script is deprecated legacy residue." -ForegroundColor Yellow
Write-Host "It documents an old repo-transfer + Vercel-hobby path that is not part of the current project operations." -ForegroundColor Yellow
Write-Host "Use docs/OPERATIONS.md for active release and repo guidance." -ForegroundColor Cyan
exit 1
