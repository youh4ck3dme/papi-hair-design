# ==============================================================
# Nimble Agenda (PAPI HAIR DESIGN) – Príprava prostredia
# ==============================================================
# Spustenie: .\setup.ps1   alebo   npm run setup
# Požiadavky: Node.js 20.19+
# Repo používa npm. Viac: docs/DEVELOPMENT-SETUP.md
# ==============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "`n[Nimble Agenda] Pripravujem prostredie...`n" -ForegroundColor Cyan

# 1. Kontrola Node.js (min. 20.19)
$nodeVersion = $null
try {
    $nodeVersion = (node -v 2>$null) -replace 'v', ''
} catch {}
if (-not $nodeVersion) {
    Write-Host "CHYBA: Node.js nie je nainstalovany alebo nie je v PATH." -ForegroundColor Red
    Write-Host "Nainstaluj Node.js 20.19+ z https://nodejs.org alebo pouzi nvm / fnm.`n" -ForegroundColor Yellow
    exit 1
}
$minimumNodeVersion = [version]"20.19.0"
$currentNodeVersion = [version]$nodeVersion
if ($currentNodeVersion -lt $minimumNodeVersion) {
    Write-Host "CHYBA: Potrebujes Node.js 20.19.0 alebo novsi (aktualne: $nodeVersion)." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green

# 2. Inštalácia závislostí (npm)
$workspaces = @(
    @{ Path = $ProjectRoot; Label = "root app" },
    @{ Path = (Join-Path $ProjectRoot "functions"); Label = "firebase functions" },
    @{ Path = (Join-Path $ProjectRoot "booking-papihairdesign-sk"); Label = "nested next app" }
)

foreach ($workspace in $workspaces) {
    if (-not (Test-Path (Join-Path $workspace.Path "package.json"))) {
        continue
    }

    Push-Location $workspace.Path
    try {
        Write-Host "`nInštalujem závislosti pre $($workspace.Label)..." -ForegroundColor Cyan
        npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Host "CHYBA: Inštalácia závislostí zlyhala pre $($workspace.Label)." -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
}
Write-Host "[OK] Závislosti nainštalované`n" -ForegroundColor Green

# 3. .env – skopíruj z .env.example ak .env neexistuje
$envExample = Join-Path $ProjectRoot ".env.example"
$envFile   = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "[OK] Vytvoreny .env z .env.example – doplň Firebase hodnoty." -ForegroundColor Yellow
} elseif (Test-Path $envFile) {
    Write-Host "[OK] .env uz existuje." -ForegroundColor Green
} else {
    Write-Host "[!] Subor .env.example nebol najdeny. Premenne prostredia nastav manualne." -ForegroundColor Yellow
}

Write-Host "`nProstredie je pripravene.`n" -ForegroundColor Green
Write-Host "Dalsie kroky:" -ForegroundColor Cyan
Write-Host "  1. Uprav .env (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, atď.)" -ForegroundColor White
Write-Host "  2. Spust dev server:  npm run dev" -ForegroundColor White
Write-Host "  3. Aplikacia:        http://localhost:5678" -ForegroundColor White
Write-Host "  4. Overenie:         npm run verify:workspace" -ForegroundColor White
Write-Host "  Doc: docs/DEVELOPMENT-SETUP.md (priprava na vyvoj)`n" -ForegroundColor Gray
