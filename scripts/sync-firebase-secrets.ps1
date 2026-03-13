param(
    [string]$ProjectId = "hairchainger-main-876665-176e8",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $idx = $trimmed.IndexOf("=")
        if ($idx -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $idx).Trim()
        $value = $trimmed.Substring($idx + 1).Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $values[$key] = $value
    }

    return $values
}

function Set-FirebaseSecret {
    param(
        [string]$ProjectId,
        [string]$SecretName,
        [string]$SecretValue,
        [bool]$DryRunMode
    )

    if ($DryRunMode) {
        Write-Host "[dry-run] would set $SecretName"
        return
    }

    $tmpFile = [System.IO.Path]::GetTempFileName()
    try {
        Set-Content -Path $tmpFile -Value $SecretValue -NoNewline
        firebase functions:secrets:set $SecretName --project $ProjectId --data-file $tmpFile | Out-Host
    }
    finally {
        Remove-Item $tmpFile -ErrorAction SilentlyContinue
    }
}

$root = Split-Path -Parent $PSScriptRoot
$envValues = @{}

foreach ($pair in (Read-EnvFile (Join-Path $root ".env")).GetEnumerator()) {
    $envValues[$pair.Key] = $pair.Value
}
foreach ($pair in (Read-EnvFile (Join-Path $root ".env.local")).GetEnumerator()) {
    $envValues[$pair.Key] = $pair.Value
}

$mappings = @(
    @{ Source = "VERCEL_OIDC_TOKEN"; Target = "VERCEL_OIDC_TOKEN" },
    @{ Source = "VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN"; Target = "APP_CHECK_DEBUG_TOKEN" },
    @{ Source = "TWILIO_ACCOUNT_SID"; Target = "TWILIO_ACCOUNT_SID" },
    @{ Source = "TWILIO_AUTH_TOKEN"; Target = "TWILIO_AUTH_TOKEN" },
    @{ Source = "TWILIO_FROM_NUMBER"; Target = "TWILIO_FROM_NUMBER" },
    @{ Source = "SENTRY_DSN"; Target = "SENTRY_DSN" }
)

$uploaded = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]
$failed = New-Object System.Collections.Generic.List[string]

foreach ($mapping in $mappings) {
    $source = $mapping.Source
    $target = $mapping.Target
    $value = $envValues[$source]

    if ([string]::IsNullOrWhiteSpace($value)) {
        $skipped.Add("$source -> $target")
        continue
    }

    try {
        Set-FirebaseSecret -ProjectId $ProjectId -SecretName $target -SecretValue $value -DryRunMode $DryRun.IsPresent
        $uploaded.Add("$source -> $target")
    }
    catch {
        $failed.Add("$source -> $target :: $($_.Exception.Message)")
    }
}

Write-Host ""
Write-Host "Uploaded:"
if ($uploaded.Count -eq 0) {
    Write-Host "  (none)"
} else {
    $uploaded | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Skipped:"
if ($skipped.Count -eq 0) {
    Write-Host "  (none)"
} else {
    $skipped | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Failed:"
if ($failed.Count -eq 0) {
    Write-Host "  (none)"
} else {
    $failed | ForEach-Object { Write-Host "  $_" }
}
