#Requires -Version 5.1
<#
.SYNOPSIS
    Download full DZI map tiles from map.projectzomboid.com to Windows.
.DESCRIPTION
    Downloads the complete tile pyramid (all zoom levels) to a local folder.
    After download, mount this folder into Docker for offline use.

    Usage:
      .\scripts\download-map-tiles.ps1
      .\scripts\download-map-tiles.ps1 -OutputDir "D:\pz-map-tiles"
      .\scripts\download-map-tiles.ps1 -BaseUrl "https://map.projectzomboid.com/maps/41.78.16/base" -OutputDir ".\map-tiles-b41"
      .\scripts\download-map-tiles.ps1 -Force -Workers 20
.PARAMETER OutputDir
    Output directory (default: .\map-tiles-offline)
.PARAMETER BaseUrl
    Base URL of remote tiles (default: B42 vanilla)
.PARAMETER Workers
    Number of parallel downloads (default: 10)
.PARAMETER Force
    Re-download even if files already exist
.PARAMETER MaxLevel
    Limit max zoom level (default: auto-detect from map_info.json)
.NOTES
    Requires: PowerShell 5.1+, curl (built-in on Windows 10+)
#>

param(
    [string]$OutputDir = '.\map-tiles-offline',
    [string]$BaseUrl = 'https://map.projectzomboid.com/maps/42.20.0/base',
    [string]$Layer = 'layer0',
    [int]$Workers = 10,
    [switch]$Force,
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
        } catch {
            # curl may fail transiently
        }

        if ($i -lt $Retries - 1) {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

# ── Main ─────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '  PZ Map Tiles Downloader (Windows)' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "  Base URL:  $BaseUrl"
Write-Host "  Output:    $OutputDir"
Write-Host "  Workers:   $Workers"
Write-Host "  Force:     $($Force.IsPresent)"
Write-Host ''

# Resolve absolute path
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$layerName = $BaseUrl.TrimEnd('/') -split '/' | Select-Object -Last 1
$basePath = Join-Path $OutputDir "html\map_data\$layerName"

# Step 1: Download metadata
Write-Step 'Step 1/3: Downloading metadata...'

$metadataFiles = @('map_info.json', "$Layer.dzi")
foreach ($file in $metadataFiles) {
    $url = "$BaseUrl/$file"
    $local = Join-Path $basePath $file
    Write-Info "Downloading $file..."
    if (Download-File -Url $url -OutputPath $local) {
        Write-OK $file
    } else {
        Write-Fail $file
        Write-Host 'Cannot download metadata. Check URL and internet connection.' -ForegroundColor Red
        exit 1
    }
}

# Step 2: Parse map_info.json
Write-Step 'Step 2/3: Reading map dimensions...'

$mapInfoPath = Join-Path $basePath 'map_info.json'
$dziPath = Join-Path $basePath "$Layer.dzi"
$mapInfo = Get-Content $mapInfoPath -Raw | ConvertFrom-Json

$width = [int]$mapInfo.w
$height = [int]$mapInfo.h
# B42 uses tile_size=2048, B41 uses 256
$tileSize = if ($mapInfo.tile_size) { [int]$mapInfo.tile_size } else { 2048 }

$computedMaxLevel = [math]::Ceiling([math]::Log([math]::Max($width, $height), 2))
if ($MaxLevel -ge 0 -and $MaxLevel -lt $computedMaxLevel) {
    $actualMaxLevel = $MaxLevel
} else {
    $actualMaxLevel = $computedMaxLevel
}

Write-Host ''
Write-Host "  Map size:     ${width}x${height} px" -ForegroundColor White
Write-Host "  Tile size:    ${tileSize}px" -ForegroundColor White
Write-Host "  Max level:    $actualMaxLevel (native: $computedMaxLevel)" -ForegroundColor White
Write-Host ''

# Step 3: Download all tiles
Write-Step 'Step 3/3: Downloading tiles...'

$totalTiles = 0
$downloaded = 0
$skipped = 0
$failed = 0
$extension = 'jpg'

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

for ($level = 0; $level -le $actualMaxLevel; $level++) {
    $scale = [math]::Pow(2, ($actualMaxLevel - $level))
    $cols = [math]::Ceiling($width / ($tileSize * $scale))
    $rows = [math]::Ceiling($height / ($tileSize * $scale))
    $levelTotal = $cols * $rows
    $totalTiles += $levelTotal

    Write-Host ''
    Write-Host "  Level $level : ${cols}x${rows} = $levelTotal tiles" -ForegroundColor Yellow

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
    $batches = @()
    for ($i = 0; $i -lt $tiles.Count; $i += $Workers) {
        $end = [math]::Min($i + $Workers - 1, $tiles.Count - 1)
        $batch = $tiles[$i..$end]
        $batches += ,$batch
    }

    foreach ($batch in $batches) {
        $jobs = @()

        foreach ($tile in $batch) {
            $x = $tile.x
            $y = $tile.y
            $url = "$BaseUrl/${Layer}_files/$level/${x}_${y}.$extension"
            $local = Join-Path $basePath "${Layer}_files\$level\${x}_${y}.$extension"

            if ((Test-Path $local) -and (-not $Force)) {
                $skipped++
                $levelDone++
                continue
            }

            # Start background job using curl.exe
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
            } else {
                $failed++
            }
            $levelDone++
        }

        # Progress
        $pct = if ($levelActual -gt 0) { [math]::Round($levelDone / $levelActual * 100) } else { 100 }
        Write-Progress -Activity "Level $level" -Status "$levelDone / $levelActual tiles" -PercentComplete $pct
    }

    Write-Progress -Activity "Level $level" -Completed
    Write-Host "    Done: $downloaded downloaded, $skipped skipped, $failed failed" -ForegroundColor Gray
}

$stopwatch.Stop()
$elapsed = [math]::Round($stopwatch.Elapsed.TotalMinutes, 1)

Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
Write-Host '  Download Complete!' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
Write-Host ''
Write-Host "  Total tiles:    $totalTiles" -ForegroundColor White
Write-Host "  Downloaded:     $downloaded" -ForegroundColor Green
Write-Host "  Skipped:        $skipped" -ForegroundColor Gray
$failColor = if ($failed -gt 0) { 'Red' } else { 'Gray' }
Write-Host "  Failed:         $failed" -ForegroundColor $failColor
Write-Host "  Time elapsed:   ${elapsed} min" -ForegroundColor White
Write-Host ''
Write-Host "  Output:         $OutputDir" -ForegroundColor Cyan
Write-Host ''

# ── Mount guide ──────────────────────────────────────────────────────

Write-Host '==================================================' -ForegroundColor Yellow
Write-Host '  How to mount into Docker:' -ForegroundColor Yellow
Write-Host '==================================================' -ForegroundColor Yellow
Write-Host ''
Write-Host '  Option 1: Edit docker-compose.yml volumes section:'
Write-Host ''
Write-Host '    volumes:' -ForegroundColor Gray
Write-Host '      map-tiles:' -ForegroundColor Gray
Write-Host '        driver: local' -ForegroundColor Gray
Write-Host '        driver_opts:' -ForegroundColor Gray
Write-Host '          type: none' -ForegroundColor Gray
Write-Host '          o: bind' -ForegroundColor Gray
Write-Host "          device: $OutputDir" -ForegroundColor Cyan
Write-Host ''
Write-Host '  Option 2: Bind mount directly in app service:'
Write-Host ''
Write-Host '    volumes:' -ForegroundColor Gray
Write-Host "      - ${OutputDir}:/map-tiles" -ForegroundColor Cyan
Write-Host ''
Write-Host '  Then restart: docker compose up -d app' -ForegroundColor White
Write-Host '  Map will work completely offline!' -ForegroundColor Green
Write-Host ''