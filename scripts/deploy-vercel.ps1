# Legacy helper retained only to prevent accidental use.
# Production deploys for this project go through Firebase Hosting + Cloud Functions.
# Vercel is preview-only diagnostics unless operations docs explicitly say otherwise.

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "This script is deprecated." -ForegroundColor Yellow
Write-Host "Do not use Vercel as a production deploy path for this project." -ForegroundColor Yellow
Write-Host "" 
Write-Host "Use one of these commands instead:" -ForegroundColor Cyan
Write-Host "  firebase deploy --only hosting" -ForegroundColor White
Write-Host "  firebase deploy --only functions:<name>" -ForegroundColor White
Write-Host "" 
Write-Host "Canonical docs: docs/OPERATIONS.md" -ForegroundColor Cyan
exit 1
