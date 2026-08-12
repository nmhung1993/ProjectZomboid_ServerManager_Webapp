#Requires -Version 5.1
<#
.SYNOPSIS
    Merge active mod map tiles into vanilla map based on server.ini Map= config.
.DESCRIPTION
    Reads the game server's server.ini to get the active Map= list,
    then overlays only those mod tiles onto the vanilla base map.
    Mods are overlaid in the order specified in Map= (later mods overwrite earlier).

    Usage:
      .\scripts\merge-mod-tiles.ps1
      .\scripts\merge-mod-tiles.ps1 -ServerIni ".\game-server\server.ini" -Force
      .\scripts\merge-mod-tiles.ps1 -MapList "RavenCreek;Grapeseed;Chinatown" -Force
.PARAMETER ServerIni
    Path to server.ini (default: auto-detect from game-server/ or zomboid-data volume)
.PARAMETER MapList
    Override: semicolon-separated map list (e.g. "Muldraugh, KY;RavenCreek;Grapeseed")
.PARAMETER VanillaDir
    Directory containing vanilla B42 map tiles (default: .\map-vanilla-tiles-offline-top)
.PARAMETER ModDir
    Directory containing mod map tiles (default: .\map-mod-tiles-offline-top)
.PARAMETER OutputDir
    Output directory for merged tiles (default: .\map-tiles-merged)
.PARAMETER ConfigFile
    Mod map config with map_name → CDN key mapping (default: .\scripts\maps-b42-custom.txt)
.PARAMETER Force
    Overwrite existing output
.NOTES
    Requires: PowerShell 5.1+
#>

param(
    [string]$ServerIni = '',
    [string]$MapList = '',
    [string]$VanillaDir = '.\map-vanilla-tiles-offline-top',
    [string]$ModDir = '.\map-mod-tiles-offline-top',
    [string]$OutputDir = '.\map-tiles-merged',
    [string]$ConfigFile = 'maps-b42-custom.txt',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# ── Helpers ──────────────────────────────────────────────────────────

function Write-Step { param([string]$M) Write-Host "  $M" -ForegroundColor Cyan }
function Write-OK { param([string]$M) Write-Host "    [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) Write-Host "    [FAIL] $M" -ForegroundColor Red }
function Write-Info { param([string]$M) Write-Host "    [INFO] $M" -ForegroundColor Gray }
function Write-Warn { param([string]$M) Write-Host "    [WARN] $M" -ForegroundColor Yellow }

# ── Vanilla map names (B42) ──────────────────────────────────────────

$VanillaMaps = @(
    'Muldraugh, KY',
    'West Point, KY',
    'Riverside, KY',
    'Rosewood, KY',
    'Louisville, KY',
    'March Ridge, KY',
    'Valley Station, KY',
    'Dixie, KY',
    'Ekron, KY',
    'Irvington, KY',
    'Brandenburg, KY',
    'Echo Creek, KY'
)

# ── Parse server.ini Map= line ───────────────────────────────────────

function Get-MapListFromIni {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    $lines = Get-Content $Path
    foreach ($line in $lines) {
        if ($line -match '^\s*Map\s*=\s*(.+)$') {
            $mapLine = $Matches[1].Trim()
            return $mapLine -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        }
    }
    return $null
}

# ── Parse mod config: map_name → CDN key ─────────────────────────────

function Get-MapNameToKeyMapping {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return @{} }
    $lines = [System.IO.File]::ReadAllLines($Path)
    $mapping = @{}
    $currentKey = $null
    $currentMapName = $null

    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }

        if ($line -match '^(\S+):$') {
            if ($currentKey -and $currentMapName) {
                $mapping[$currentMapName] = $currentKey
            }
            $currentKey = $Matches[1]
            $currentMapName = $null
            continue
        }

        if ($currentKey) {
            if ($line -match '^\s+map_name:\s*(.+)$') {
                $currentMapName = $Matches[1].Trim()
            }
        }
    }

    if ($currentKey -and $currentMapName) {
        $mapping[$currentMapName] = $currentKey
    }

    # Also map key → key (fallback)
    foreach ($key in $mapping.Keys) {
        if (-not $mapping.ContainsKey($mapping[$key])) {
            $mapping[$mapping[$key]] = $mapping[$key]
        }
    }

    return $mapping
}

# ── Main ─────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '  PZ B42 Map Tile Merger (Server Config Aware)' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ''

# Resolve paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

if (-not [System.IO.Path]::IsPathRooted($VanillaDir)) { $VanillaDir = Join-Path $ProjectRoot $VanillaDir }
if (-not [System.IO.Path]::IsPathRooted($ModDir)) { $ModDir = Join-Path $ProjectRoot $ModDir }
if (-not [System.IO.Path]::IsPathRooted($OutputDir)) { $OutputDir = Join-Path $ProjectRoot $OutputDir }
if (-not [System.IO.Path]::IsPathRooted($ConfigFile)) { $ConfigFile = Join-Path $ScriptDir $ConfigFile }
if ($ServerIni -and -not [System.IO.Path]::IsPathRooted($ServerIni)) { $ServerIni = Join-Path $ProjectRoot $ServerIni }

$VanillaDir = [System.IO.Path]::GetFullPath($VanillaDir)
$ModDir = [System.IO.Path]::GetFullPath($ModDir)
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$ConfigFile = [System.IO.Path]::GetFullPath($ConfigFile)
if ($ServerIni) { $ServerIni = [System.IO.Path]::GetFullPath($ServerIni) }

# Step 1: Get active map list
Write-Step 'Step 1/4: Reading active map list...'

$activeMaps = @()

if ($MapList) {
    Write-Info "Using provided MapList: $MapList"
    $activeMaps = $MapList -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
}
elseif ($ServerIni) {
    Write-Info "Reading server.ini: $ServerIni"
    $activeMaps = Get-MapListFromIni -Path $ServerIni
}
else {
    # Auto-detect server.ini
    $possiblePaths = @(
        Join-Path $ProjectRoot 'game-server\server.ini',
        Join-Path $ProjectRoot 'zomboid-data\Server\servertest.ini',
        Join-Path $ProjectRoot 'zomboid-data\Server\servertest_SandboxVars.lua'
    )
    foreach ($p in $possiblePaths) {
        if (Test-Path $p) {
            Write-Info "Auto-detected server.ini: $p"
            $activeMaps = Get-MapListFromIni -Path $p
            if ($activeMaps) { break }
        }
    }
}

if (-not $activeMaps -or $activeMaps.Count -eq 0) {
    Write-Fail "No active maps found. Provide -ServerIni or -MapList."
    Write-Host '  Example: .\scripts\merge-mod-tiles.ps1 -MapList "Muldraugh, KY;RavenCreek;Grapeseed"' -ForegroundColor Yellow
    exit 1
}

Write-OK "Active maps: $($activeMaps -join ', ')"

# Step 2: Classify vanilla vs mod maps
Write-Step 'Step 2/4: Classifying maps...'
$mapNameToKey = Get-MapNameToKeyMapping -Path $ConfigFile
Write-Info "Loaded $($mapNameToKey.Count) map_name → key mappings"

$vanillaActive = @()
$modMapsToMerge = @()

foreach ($map in $activeMaps) {
    if ($map -in $VanillaMaps) {
        $vanillaActive += $map
        Write-Info "  Vanilla: $map"
    }
    else {
        $cdnKey = $mapNameToKey[$map]
        if ($cdnKey) {
            $modMapsToMerge += @{ MapName = $map; CdnKey = $cdnKey }
            Write-Info "  Mod: $map → $cdnKey"
        }
        else {
            Write-Warn "  Unknown map (no CDN key): $map"
        }
    }
}

Write-OK "Vanilla: $($vanillaActive.Count), Mods to merge: $($modMapsToMerge.Count)"

if ($modMapsToMerge.Count -eq 0) {
    Write-Host 'No mod maps to merge. Output will be vanilla only.' -ForegroundColor Yellow
}

# Step 3: Check vanilla tiles exist
Write-Step 'Step 3/4: Checking vanilla map tiles...'
$vanillaMapData = Join-Path $VanillaDir 'html\map_data'
$vanillaBase = Join-Path $vanillaMapData 'base'
$hasVanilla = Test-Path $vanillaBase

if ($hasVanilla) {
    Write-OK "Vanilla tiles found"
}
else {
    Write-Warn "Vanilla tiles not found at: $vanillaBase"
    Write-Info "Will merge mod tiles only (no vanilla base)."
    Write-Info "Run: .\make.ps1 download-map  to download vanilla tiles."
}

# Step 4: Build merged output
Write-Step 'Step 4/4: Building merged output...'

$outputMapData = Join-Path $OutputDir 'html\map_data'

if (Test-Path $outputMapData) {
    if ($Force) {
        Write-Info "Removing existing output..."
        Remove-Item -Recurse -Force $outputMapData
    }
    else {
        Write-Warn "Output already exists. Use -Force to overwrite."
        exit 0
    }
}

# Copy vanilla base tiles (if available)
if ($hasVanilla) {
    Write-Info "Copying vanilla base tiles..."
    $outputBase = Join-Path $outputMapData 'base'
    Copy-Item -Recurse -Force $vanillaBase $outputBase
    Write-OK "Vanilla base copied"
}
else {
    Write-Info "Skipping vanilla base (not available)"
    $outputBase = Join-Path $outputMapData 'base'
}

# Overlay mod tiles in REVERSE Map= order.
# In PZ, Map= leftmost = bottom layer, rightmost = top layer.
# When merging tiles, we overlay rightmost first, then work leftwards,
# so mods closer to vanilla (left side) end up on top and are not hidden.
if ($modMapsToMerge.Count -gt 0) {
    $reversedMods = @($modMapsToMerge[$($modMapsToMerge.Count - 1)..0])
    Write-Info "Overlaying $($reversedMods.Count) mod maps (reverse Map= order)..."

    $totalOverlaid = 0
    $modsProcessed = 0

    foreach ($mod in $reversedMods) {
        $modKey = $mod.CdnKey
        $modTileDir = Join-Path (Join-Path (Join-Path $ModDir 'html\map_data\mod_maps') $modKey) 'base_top'

        if (-not (Test-Path $modTileDir)) {
            Write-Warn "$modKey ($($mod.MapName)) - tiles not found, skipping"
            continue
        }

        $modFilesDir = Join-Path $modTileDir 'layer0_files'
        if (-not (Test-Path $modFilesDir)) {
            Write-Warn "$modKey - no layer0_files, skipping"
            continue
        }

        Write-Info "  Overlaying $modKey ($($mod.MapName))..."

        $tileCount = 0
        $tileFiles = Get-ChildItem -Path $modFilesDir -Recurse -File -Filter '*.webp'

        foreach ($tile in $tileFiles) {
            $relativePath = $tile.FullName.Substring($modFilesDir.Length + 1)
            $destPath = [System.IO.Path]::Combine($outputBase, 'layer0_files', $relativePath)

            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }

            Copy-Item -Force $tile.FullName $destPath
            $tileCount++
        }

        Write-OK "  $modKey - $tileCount tiles overlaid"
        $totalOverlaid += $tileCount
        $modsProcessed++
    }

    Write-OK "Total: $totalOverlaid tiles from $modsProcessed mods"
}

# Summary
Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
Write-Host '  Merge Complete!' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
Write-Host ''
Write-Host "  Active maps:     $($activeMaps -join '; ')" -ForegroundColor White
Write-Host "  Vanilla maps:    $($vanillaActive.Count)" -ForegroundColor White
Write-Host "  Mod maps merged: $($modMapsToMerge.Count)" -ForegroundColor White
Write-Host ''
Write-Host "  Output:          $OutputDir" -ForegroundColor Cyan
Write-Host ''

# Mount guide
Write-Host '==================================================' -ForegroundColor Yellow
Write-Host '  How to mount into Docker:' -ForegroundColor Yellow
Write-Host '==================================================' -ForegroundColor Yellow
Write-Host ''
Write-Host '  Add to docker-compose.yml app service volumes:' -ForegroundColor Gray
Write-Host "    - ${OutputDir}:/map-tiles" -ForegroundColor Cyan
Write-Host ''
Write-Host '  Then restart: docker compose up -d app' -ForegroundColor White
Write-Host '  Map will show only active mods from server config!' -ForegroundColor Green
Write-Host ''