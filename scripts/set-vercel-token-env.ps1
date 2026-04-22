# Legacy helper retained only for historical reference.
# The repository no longer treats Vercel token setup as a canonical deployment step.

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "This script is deprecated." -ForegroundColor Yellow
Write-Host "Vercel token bootstrap is not part of the canonical release path anymore." -ForegroundColor Yellow
Write-Host "" 
Write-Host "If you are troubleshooting preview-only diagnostics, do it manually in the Vercel dashboard." -ForegroundColor Cyan
Write-Host "For normal releases use Firebase deploy flow documented in docs/OPERATIONS.md." -ForegroundColor Cyan
exit 1
