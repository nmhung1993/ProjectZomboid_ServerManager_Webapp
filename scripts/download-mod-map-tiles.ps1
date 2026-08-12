#Requires -Version 5.1
<#
.SYNOPSIS
    Download all B42 mod map DZI tiles from map.projectzomboid.com.
.DESCRIPTION
    Reads the pzmap2dzi mod map config (maps-b42-custom.txt), checks which
    mods are available on map.projectzomboid.com, and downloads the complete
    tile pyramid for each available mod.

    Usage:
      .\scripts\download-mod-map-tiles.ps1
      .\scripts\download-mod-map-tiles.ps1 -OutputDir "D:\pz-map-tiles"
      .\scripts\download-mod-map-tiles.ps1 -Force -Workers 20
      .\scripts\download-mod-map-tiles.ps1 -ModKeys "EchoCreekMB,FORTREDSTONE"
.PARAMETER OutputDir
    Output directory (default: .\map-tiles-offline)
.PARAMETER Workers
    Number of parallel downloads (default: 10)
.PARAMETER Force
    Re-download even if files already exist
.PARAMETER ModKeys
    Comma-separated list of specific mod keys to download (default: all from config)
.PARAMETER ConfigFile
    Path to pzmap2dzi mod map config file (default: .\scripts\maps-b42-custom.txt)
.PARAMETER BaseUrl
    Base URL for map tiles (default: https://map.projectzomboid.com/maps/42.20.0)
.PARAMETER MaxLevel
    Limit max zoom level (default: auto-detect from DZI)
.NOTES
    Requires: PowerShell 5.1+, curl.exe (built-in on Windows 10+)
#>

param(
    [string]$OutputDir = '.\map-tiles-offline',
    [int]$Workers = 10,
    [switch]$Force,
    [string]$ModKeys = '',
    [string]$ConfigFile = 'maps-b42-custom.txt',
    [string]$BaseUrl = 'https://map.projectzomboid.com/maps/42.20.0',
    [int]$MaxLevel = -1
)

$ErrorActionPreference = 'Stop'

# ── Helpers ──────────────────────────────────────────────────────────

function Write-Step {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Cyan
}

function Write-OK {
    param([string]$Message)
    Write-Host "    [OK] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "    [FAIL] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "    [INFO] $Message" -ForegroundColor Gray
}

function Write-Warn {
    param([string]$Message)
    Write-Host "    [WARN] $Message" -ForegroundColor Yellow
}

# ── Download single file using curl.exe ──────────────────────────────

function Download-File {
    param(
        [string]$Url,
        [string]$OutputPath,
        [int]$Retries = 3
    )

    if ((Test-Path $OutputPath) -and (-not $Force)) {
        return $true
    }

    $dir = Split-Path $OutputPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    for ($i = 0; $i -lt $Retries; $i++) {
        try {
            $result = & curl.exe -sS -L -f `
                -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' `
                -e 'https://map.projectzomboid.com/' `
                --max-time 30 `
                -o $OutputPath `
                $Url 2>&1

            if ($LASTEXITCODE -eq 0 -and (Test-Path $OutputPath) -and (Get-Item $OutputPath).Length -gt 100) {
                return $true
            }
        }
        catch {
            # curl may fail transiently
        }

        if ($i -lt $Retries - 1) {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

# ── Check if a URL exists (HEAD request) ─────────────────────────────

function Test-UrlExists {
    param([string]$Url)

    # Use -w '%{http_code}' to get HTTP status, don't use -f (which fails on 404)
    $httpCode = & curl.exe -sS -L `
        -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' `
        -e 'https://map.projectzomboid.com/' `
        --max-time 15 `
        -o NUL `
        -w '%{http_code}' `
        $Url 2>&1

    # 200 = exists, anything else (404, 403, etc) = not available
    return ($httpCode -eq '200')
}

# ── Parse DZI XML to get dimensions ──────────────────────────────────

function Get-DziDimensions {
    param([string]$DziContent)

    if ($DziContent -match '<Size\s+Width="(\d+)"\s+Height="(\d+)"') {
        return @{
            Width  = [int]$Matches[1]
            Height = [int]$Matches[2]
        }
    }

    # Try alternate format (no quotes)
    if ($DziContent -match '<Size\s+Width=(\d+)\s+Height=(\d+)') {
        return @{
            Width  = [int]$Matches[1]
            Height = [int]$Matches[2]
        }
    }

    return $null
}

# ── Parse mod map config file ────────────────────────────────────────

function Get-ModMapKeys {
    param(
        [string]$ConfigPath,
        [string]$FilterKeys
    )

    if (-not (Test-Path $ConfigPath)) {
        Write-Fail "Config file not found: $ConfigPath"
        return @()
    }

    $lines = [System.IO.File]::ReadAllLines($ConfigPath)

    $mods = @()
    $currentKey = $null
    $currentMapName = $null
    $currentDisplayName = $null
    $currentSteamId = $null
    $keyCount = 0

    foreach ($line in $lines) {
        $trimmed = $line.Trim()

        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) {
            continue
        }

        # Top-level key (no leading whitespace in original line)
        if ($line -match '^(\S+):$') {
            # Save previous entry (use key as map_name fallback)
            if ($null -ne $currentKey) {
                if ($null -eq $currentMapName) { $currentMapName = $currentKey }
                $mods += @{
                    Key         = $currentKey
                    MapName     = $currentMapName
                    DisplayName = if ($currentDisplayName) { $currentDisplayName } else { $currentMapName }
                    SteamId     = $currentSteamId
                }
                $keyCount++
            }
            $currentKey = $Matches[1]
            $currentMapName = $null
            $currentDisplayName = $null
            $currentSteamId = $null
            continue
        }

        if ($null -ne $currentKey) {
            # Use original $line for indented key matching (not trimmed)
            if ($line -match '^\s+map_name:\s*(.+)$') {
                $currentMapName = $Matches[1].Trim()
            }
            elseif ($line -match '^\s+display_name:\s*(.+)$') {
                $currentDisplayName = $Matches[1].Trim().Trim('"')
            }
            elseif ($line -match "^\s+steam_id:\s*'?(\d+)'?") {
                $currentSteamId = $Matches[1]
            }
        }
    }

    # Save last entry (use key as map_name fallback)
    if ($null -ne $currentKey) {
        if ($null -eq $currentMapName) { $currentMapName = $currentKey }
        $mods += @{
            Key         = $currentKey
            MapName     = $currentMapName
            DisplayName = if ($currentDisplayName) { $currentDisplayName } else { $currentMapName }
            SteamId     = $currentSteamId
        }
        $keyCount++
    }

    Write-Info "Parsed $keyCount mod keys from config"

    # Filter if specific keys requested
    if ($FilterKeys) {
        $filterList = $FilterKeys -split ',' | ForEach-Object { $_.Trim() }
        $mods = $mods | Where-Object { $filterList -contains $_.Key }
    }

    return $mods
}

# ── Download tiles for a single mod ──────────────────────────────────

function Download-ModTiles {
    param(
        [string]$ModKey,
        [string]$ModDisplayName,
        [string]$ModBaseUrl,
        [string]$ModOutputBase,
        [string]$Layer,
        [string]$Extension
    )

    Write-Host ''
    Write-Host "  ── $ModDisplayName ($ModKey) ──" -ForegroundColor Yellow

    # Step 1: Download DZI metadata + map_info.json
    $dziUrl = "$ModBaseUrl/$Layer.dzi"
    $dziLocal = Join-Path $ModOutputBase "$Layer.dzi"
    $mapInfoUrl = "$ModBaseUrl/map_info.json"
    $mapInfoLocal = Join-Path $ModOutputBase "map_info.json"

    Write-Info "Fetching DZI metadata..."
    if (-not (Download-File -Url $dziUrl -OutputPath $dziLocal)) {
        Write-Fail "Cannot download DZI for $ModKey"
        return $false
    }

    Write-Info "Fetching map_info.json..."
    if (-not (Download-File -Url $mapInfoUrl -OutputPath $mapInfoLocal)) {
        Write-Warn "Cannot download map_info.json for $ModKey (will use DZI dimensions only)"
    }

    $dziContent = Get-Content $dziLocal -Raw
    $dimensions = Get-DziDimensions -DziContent $dziContent

    if (-not $dimensions) {
        Write-Fail "Cannot parse DZI dimensions for $ModKey"
        Write-Info "DZI content: $($dziContent.Substring(0, [Math]::Min(200, $dziContent.Length)))"
        return $false
    }

    $width = $dimensions.Width
    $height = $dimensions.Height
    $tileSize = 256  # B42 mod maps use 256px tiles

    $computedMaxLevel = [math]::Ceiling([math]::Log([math]::Max($width, $height), 2))
    if ($MaxLevel -ge 0 -and $MaxLevel -lt $computedMaxLevel) {
        $actualMaxLevel = $MaxLevel
    }
    else {
        $actualMaxLevel = $computedMaxLevel
    }

    Write-Host "    Size: ${width}x${height}px, Max level: $actualMaxLevel" -ForegroundColor White

    # Step 2: Download all tiles
    $totalTiles = 0
    $downloaded = 0
    $skipped = 0
    $failed = 0

    for ($level = 0; $level -le $actualMaxLevel; $level++) {
        $scale = [math]::Pow(2, ($actualMaxLevel - $level))
        $cols = [math]::Ceiling($width / ($tileSize * $scale))
        $rows = [math]::Ceiling($height / ($tileSize * $scale))
        $levelTotal = $cols * $rows
        $totalTiles += $levelTotal

        Write-Host "    Level $level : ${cols}x${rows} = $levelTotal tiles" -ForegroundColor DarkYellow

        # Build tile list
        $tiles = @()
        for ($y = 0; $y -lt $rows; $y++) {
            for ($x = 0; $x -lt $cols; $x++) {
                $effW = [math]::Ceiling($width / $scale)
                $effH = [math]::Ceiling($height / $scale)
                if ($x * $tileSize -ge $effW -or $y * $tileSize -ge $effH) {
                    $skipped++
                    continue
                }
                $tiles += @{ x = $x; y = $y }
            }
        }

        $levelActual = $tiles.Count
        $levelDone = 0

        # Process in parallel batches
        for ($i = 0; $i -lt $tiles.Count; $i += $Workers) {
            $end = [math]::Min($i + $Workers - 1, $tiles.Count - 1)
            $batch = $tiles[$i..$end]
            $jobs = @()

            foreach ($tile in $batch) {
                $x = $tile.x
                $y = $tile.y
                $url = "$ModBaseUrl/${Layer}_files/$level/${x}_${y}.$Extension"
                $local = Join-Path $ModOutputBase "${Layer}_files\$level\${x}_${y}.$Extension"

                if ((Test-Path $local) -and (-not $Force)) {
                    $skipped++
                    $levelDone++
                    continue
                }

                $job = Start-Job -ScriptBlock {
                    param($u, $p)
                    $dir = Split-Path $p -Parent
                    if (-not (Test-Path $dir)) {
                        New-Item -ItemType Directory -Path $dir -Force | Out-Null
                    }
                    & curl.exe -sS -L -f `
                        -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' `
                        -e 'https://map.projectzomboid.com/' `
                        --max-time 30 `
                        -o $p `
                        $u 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0 -and (Test-Path $p) -and (Get-Item $p).Length -gt 100) {
                        return 'ok'
                    }
                    return 'fail'
                } -ArgumentList $url, $local

                $jobs += @{ job = $job; tile = $tile }
            }

            # Wait for all jobs in batch
            foreach ($j in $jobs) {
                Wait-Job -Job $j.job | Out-Null
                $result = Receive-Job -Job $j.job
                Remove-Job -Job $j.job -Force
                if ($result -contains 'ok' -or $result -eq 'ok') {
                    $downloaded++
                }
                else {
                    $failed++
                }
                $levelDone++
            }

            $pct = if ($levelActual -gt 0) { [math]::Min(100, [math]::Round($levelDone / $levelActual * 100)) } else { 100 }
            Write-Progress -Activity "$ModKey Level $level" -Status "$levelDone / $levelActual tiles" -PercentComplete $pct
        }

        Write-Progress -Activity "$ModKey Level $level" -Completed
    }

    Write-Host "    Result: $downloaded downloaded, $skipped skipped, $failed failed" -ForegroundColor Gray

    return ($failed -eq 0)
}

# ── Main ─────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '  PZ B42 Mod Map Tiles Downloader' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "  Base URL:   $BaseUrl"
Write-Host "  Output:     $OutputDir"
Write-Host "  Config:     $ConfigFile"
Write-Host "  Workers:    $Workers"
Write-Host "  Force:      $($Force.IsPresent)"
Write-Host ''

# Resolve absolute paths
# $PSScriptRoot is the directory containing this script (scripts/)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
    $OutputDir = Join-Path $ProjectRoot $OutputDir
}
if (-not [System.IO.Path]::IsPathRooted($ConfigFile)) {
    $ConfigFile = Join-Path $PSScriptRoot $ConfigFile
}
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$ConfigFile = [System.IO.Path]::GetFullPath($ConfigFile)

# Parse mod list
Write-Step 'Step 1/4: Parsing mod map config...'
$mods = Get-ModMapKeys -ConfigPath $ConfigFile -FilterKeys $ModKeys
Write-OK "Found $($mods.Count) mod maps in config"

if ($mods.Count -eq 0) {
    Write-Host 'No mod maps to download. Exiting.' -ForegroundColor Yellow
    exit 0
}

# Step 2: Check which mods are available online
Write-Step 'Step 2/4: Checking mod availability on map.projectzomboid.com...'

$availableMods = @()
$unavailableMods = @()

foreach ($mod in $mods) {
    # URL-encode the mod key (some keys contain [ ] which break curl)
    $encodedKey = [uri]::EscapeDataString($mod.Key)
    $modBaseUrl = "$BaseUrl/mod_maps/$encodedKey/base_top"
    $dziUrl = "$modBaseUrl/layer0.dzi"

    Write-Info "Checking $($mod.Key) ($($mod.DisplayName))..."
    if (Test-UrlExists -Url $dziUrl) {
        Write-OK "$($mod.Key) - AVAILABLE"
        $availableMods += $mod
    }
    else {
        Write-Warn "$($mod.Key) - NOT AVAILABLE (404)"
        $unavailableMods += $mod
    }
}

Write-Host ''
Write-Host "  Available:   $($availableMods.Count) mods" -ForegroundColor Green
Write-Host "  Unavailable: $($unavailableMods.Count) mods" -ForegroundColor Yellow
Write-Host ''

if ($availableMods.Count -eq 0) {
    Write-Host 'No mod maps available for download. Exiting.' -ForegroundColor Yellow
    exit 0
}

# Step 3: Download tiles for each available mod
Write-Step "Step 3/4: Downloading tiles for $($availableMods.Count) mods..."

$modOutputBase = Join-Path $OutputDir 'html\map_data\mod_maps'
$successCount = 0
$failCount = 0
$totalModTiles = 0
$totalModDownloaded = 0
$totalModFailed = 0

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($mod in $availableMods) {
    $encodedKey = [uri]::EscapeDataString($mod.Key)
    $modBaseUrl = "$BaseUrl/mod_maps/$encodedKey/base_top"
    $modOutputPath = Join-Path $modOutputBase "$($mod.Key)\base_top"

    $result = Download-ModTiles `
        -ModKey $mod.Key `
        -ModDisplayName $mod.DisplayName `
        -ModBaseUrl $modBaseUrl `
        -ModOutputBase $modOutputPath `
        -Layer 'layer0' `
        -Extension 'webp'

    if ($result) {
        $successCount++
    }
    else {
        $failCount++
    }
}

$stopwatch.Stop()
$elapsed = [math]::Round($stopwatch.Elapsed.TotalMinutes, 1)

# Step 4: Summary
Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
Write-Host '  Download Complete!' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
Write-Host ''
Write-Host "  Mods processed:  $($availableMods.Count)" -ForegroundColor White
Write-Host "  Successful:      $successCount" -ForegroundColor Green
$failColor = if ($failCount -gt 0) { 'Red' } else { 'Gray' }
Write-Host "  Failed:          $failCount" -ForegroundColor $failColor
Write-Host "  Unavailable:     $($unavailableMods.Count)" -ForegroundColor Yellow
Write-Host "  Time elapsed:    ${elapsed} min" -ForegroundColor White
Write-Host ''
Write-Host "  Output:          $OutputDir" -ForegroundColor Cyan
Write-Host ''

if ($unavailableMods.Count -gt 0) {
    Write-Host '==================================================' -ForegroundColor Yellow
    Write-Host '  Mods NOT available on map.projectzomboid.com:' -ForegroundColor Yellow
    Write-Host '==================================================' -ForegroundColor Yellow
    Write-Host ''
    foreach ($mod in $unavailableMods) {
        Write-Host "    $($mod.Key)  (steam_id: $($mod.SteamId))  - $($mod.DisplayName)" -ForegroundColor Gray
    }
    Write-Host ''
    Write-Host '  These mods need to be rendered locally using pzmap2dzi.' -ForegroundColor Yellow
    Write-Host '  Run: php artisan zomboid:generate-map-tiles --force' -ForegroundColor White
    Write-Host ''
}

# ── Mount guide ──────────────────────────────────────────────────────

Write-Host '==================================================' -ForegroundColor Yellow
Write-Host '  How to mount into Docker:' -ForegroundColor Yellow
Write-Host '==================================================' -ForegroundColor Yellow
Write-Host ''
Write-Host '  Add to docker-compose.yml app service volumes:' -ForegroundColor Gray
Write-Host "    - ${OutputDir}:/map-tiles" -ForegroundColor Cyan
Write-Host ''
Write-Host '  Then restart: docker compose up -d app' -ForegroundColor White
Write-Host '  Mod maps will work completely offline!' -ForegroundColor Green
Write-Host ''