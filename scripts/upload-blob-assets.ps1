param(
    [string]$Prefix = "momo-nav",
    [string]$RwToken = $env:BLOB_READ_WRITE_TOKEN
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    throw "Vercel CLI not found. Install it first: npm i -g vercel"
}

if (-not $RwToken) {
    throw "Missing token. Set BLOB_READ_WRITE_TOKEN first, or pass -RwToken '<token>'."
}

function Join-BlobPath {
    param(
        [string]$PrefixValue,
        [string]$RelativePath
    )

    $cleanPath = $RelativePath.TrimStart('/').Replace('\', '/')
    $prefixRaw = if ($null -eq $PrefixValue) { '' } else { [string]$PrefixValue }
    $cleanPrefix = $prefixRaw.Trim().Trim('/')

    if ([string]::IsNullOrEmpty($cleanPrefix)) {
        return $cleanPath
    }

    return "$cleanPrefix/$cleanPath"
}

function Get-TargetLabel {
    param([string]$PrefixValue)

    $prefixRaw = if ($null -eq $PrefixValue) { '' } else { [string]$PrefixValue }
    $cleanPrefix = $prefixRaw.Trim().Trim('/')
    if ([string]::IsNullOrEmpty($cleanPrefix)) {
        return 'root'
    }

    return "$cleanPrefix/"
}

function Test-IsRemoteOrInlinePath {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $true
    }

    $trimmed = $Value.Trim()
    return (
        $trimmed -match '^(?i:https?:\/\/)' -or
        $trimmed.StartsWith('//') -or
        $trimmed.StartsWith('data:')
    )
}

function ConvertTo-RelativeAssetPath {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $normalized = $Value.Trim().Replace('\', '/')
    $normalized = $normalized.TrimStart('/')

    if ($normalized.StartsWith('./')) {
        $normalized = $normalized.Substring(2)
    }

    if ([string]::IsNullOrWhiteSpace($normalized)) {
        return $null
    }

    if ($normalized -match '(^|/)\.\.(/|$)') {
        return $null
    }

    # Skip icon class names like "imn-chatgpt"; keep only likely file paths.
    if (-not ($normalized -match '\.(svg|png|jpe?g|webp|gif|ico|bmp|avif|tiff?)$')) {
        return $null
    }

    return $normalized
}

function Invoke-BlobPut {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Token
    )

    & vercel blob put "$LocalPath" `
        --pathname "$RemotePath" `
        --force `
        --rw-token "$Token" | Out-Host

    if ($LASTEXITCODE -ne 0) {
        throw "Upload failed: $LocalPath -> $RemotePath (exit code $LASTEXITCODE)"
    }
}

function Get-ReferencedAssetPaths {
    param([object]$NavData)

    $collected = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

    $categories = @($NavData.categories)
    foreach ($category in $categories) {
        if (-not ($category.PSObject.Properties.Name -contains 'items')) {
            continue
        }

        $entries = @($category.items)
        foreach ($entry in $entries) {
            if ($null -eq $entry -or -not ($entry.PSObject.Properties.Name -contains 'icon')) {
                continue
            }

            $icon = $entry.icon
            if (-not ($icon -is [string])) {
                continue
            }

            if (Test-IsRemoteOrInlinePath -Value $icon) {
                continue
            }

            $normalized = ConvertTo-RelativeAssetPath -Value $icon
            if ($normalized) { [void]$collected.Add($normalized) }
        }
    }

    return @($collected)
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$jsonPath = Join-Path $root "momo-nav.json"

if (-not (Test-Path -LiteralPath $jsonPath)) {
    throw "File not found: $jsonPath"
}

$jsonText = Get-Content -LiteralPath $jsonPath -Raw
$convertFromJsonHasDepth = (Get-Command ConvertFrom-Json).Parameters.ContainsKey('Depth')
if ($convertFromJsonHasDepth) {
    $navData = $jsonText | ConvertFrom-Json -Depth 100
} else {
    $navData = $jsonText | ConvertFrom-Json
}
$referencedAssets = Get-ReferencedAssetPaths -NavData $navData

$navRemotePath = Join-BlobPath -PrefixValue $Prefix -RelativePath "momo-nav.json"

Write-Host "Uploading momo-nav.json ..."
Invoke-BlobPut -LocalPath "$jsonPath" -RemotePath "$navRemotePath" -Token "$RwToken"

$uploaded = 0
$missing = New-Object System.Collections.Generic.List[string]

foreach ($assetPath in $referencedAssets) {
    $localPath = Join-Path $root $assetPath
    if (-not (Test-Path -LiteralPath $localPath)) {
        [void]$missing.Add($assetPath)
        continue
    }

    $remotePath = Join-BlobPath -PrefixValue $Prefix -RelativePath $assetPath

    Write-Host "Uploading $assetPath ..."
    Invoke-BlobPut -LocalPath "$localPath" -RemotePath "$remotePath" -Token "$RwToken"

    $uploaded++
}

Write-Host ""
$targetLabel = Get-TargetLabel -PrefixValue $Prefix
Write-Host "Done. Uploaded 1 json + $uploaded referenced assets to '$targetLabel'."

if ($missing.Count -gt 0) {
    Write-Warning "Some referenced files were not found locally ($($missing.Count)):"
    $missing | Select-Object -First 10 | ForEach-Object { Write-Warning " - $_" }
    if ($missing.Count -gt 10) {
        Write-Warning " ... and $($missing.Count - 10) more."
    }
}
