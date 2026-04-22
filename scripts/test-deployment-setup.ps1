# Legacy helper retained only to prevent outdated Vercel deployment assumptions.

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "This script is deprecated." -ForegroundColor Yellow
Write-Host "It validates an old Vercel-centric deployment model that is no longer canonical for this repository." -ForegroundColor Yellow
Write-Host "" 
Write-Host "Current source of truth:" -ForegroundColor Cyan
Write-Host "  - Firebase Hosting + Cloud Functions = production" -ForegroundColor White
Write-Host "  - Vercel = preview-only diagnostics, if kept at all" -ForegroundColor White
Write-Host "" 
Write-Host "See docs/OPERATIONS.md for the active release model." -ForegroundColor Cyan
exit 1
