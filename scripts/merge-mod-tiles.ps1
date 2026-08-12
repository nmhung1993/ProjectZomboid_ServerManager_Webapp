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
    Directory containing vanilla B42 map tiles (default: .\map-tiles-offline-top)
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
    [string]$VanillaDir = '.\map-tiles-offline-top',
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
            elseif ($line -match '^\s+display_name:\s*(.+)$') {
                # Some servers use the human-facing B42 map label in Map=.
                # Treat it as an alias for the same downloaded CDN key.
                $displayName = $Matches[1].Trim()
                $mapping[$displayName] = $currentKey
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

    # Known B42 map-folder aliases used by popular workshop packs. The CDN
    # manifest stores compact keys while the game/server.ini can use labels.
    $aliases = @{
        'EchoCreek' = 'EchoCreekMB'
        'EchoCreek MilitaryBase回音河 军事基地' = 'EchoCreekMB'
        'Fort Benning B42' = 'FortBenning'
        'Fort Waterfront B42' = 'FortWaterfront'
    }
    foreach ($alias in $aliases.Keys) {
        if ($mapping.ContainsKey($aliases[$alias])) {
            $mapping[$alias] = $mapping[$aliases[$alias]]
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
$ScriptDir = [System.IO.Path]::GetDirectoryName($MyInvocation.MyCommand.Path)
$ProjectRoot = [System.IO.Path]::GetDirectoryName($ScriptDir)

if (-not [System.IO.Path]::IsPathRooted($VanillaDir)) { $VanillaDir = [System.IO.Path]::Combine($ProjectRoot, $VanillaDir) }
if (-not [System.IO.Path]::IsPathRooted($ModDir)) { $ModDir = [System.IO.Path]::Combine($ProjectRoot, $ModDir) }
if (-not [System.IO.Path]::IsPathRooted($OutputDir)) { $OutputDir = [System.IO.Path]::Combine($ProjectRoot, $OutputDir) }
if (-not [System.IO.Path]::IsPathRooted($ConfigFile)) { $ConfigFile = [System.IO.Path]::Combine($ScriptDir, $ConfigFile) }
if ($ServerIni -and -not [System.IO.Path]::IsPathRooted($ServerIni)) { $ServerIni = [System.IO.Path]::Combine($ProjectRoot, $ServerIni) }

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
    # Try reading from Docker container first
    Write-Info "Trying to read Map= from game server container..."
    $containerName = if ($env:GAME_SERVER_CONTAINER_NAME) { $env:GAME_SERVER_CONTAINER_NAME } else { 'pz-game-server' }
    
    # Check if container is running
    $containerRunning = docker ps --format '{{.Names}}' 2>$null | Select-String -Pattern "^$containerName$" -Quiet
    if ($containerRunning) {
        # Try multiple possible server.ini paths
        $iniPaths = @(
            '/home/steam/Zomboid/Server/servertest.ini',
            '/home/steam/Zomboid/Server/ZomboidServer.ini'
        )
        foreach ($iniPath in $iniPaths) {
            $iniContent = docker exec $containerName cat $iniPath 2>$null
            if ($LASTEXITCODE -eq 0 -and $iniContent) {
                foreach ($line in ($iniContent -split '\n')) {
                    if ($line -match '^\s*Map\s*=\s*(.+)$') {
                        $mapLine = $Matches[1].Trim()
                        $activeMaps = $mapLine -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
                        Write-Info "Read from Docker container ($iniPath): $($activeMaps -join '; ')"
                        break
                    }
                }
                if ($activeMaps) { break }
            }
        }
    }
    else {
        Write-Info "Container '$containerName' is not running, skipping Docker check."
    }
    
    # Fallback: try local files
    if (-not $activeMaps) {
        $possiblePaths = @(
            [System.IO.Path]::Combine($ProjectRoot, 'game-server\server.ini'),
            [System.IO.Path]::Combine($ProjectRoot, 'zomboid-data\Server\servertest.ini')
        )
        foreach ($p in $possiblePaths) {
            if (Test-Path $p) {
                Write-Info "Auto-detected server.ini: $p"
                $activeMaps = Get-MapListFromIni -Path $p
                if ($activeMaps) { break }
            }
        }
    }
}

if (-not $activeMaps -or $activeMaps.Count -eq 0) {
    Write-Warn "No server.ini found and no MapList provided."
    Write-Info "Falling back to merge ALL available mod maps."
    
    # Build MapList from all available mod tiles
    $modMapsBase = Join-Path $ModDir 'html\map_data\mod_maps'
    if (Test-Path $modMapsBase) {
        $allModKeys = Get-ChildItem -Path $modMapsBase -Directory | ForEach-Object { $_.Name }
        # Use key as map_name (most mods use same name)
        $activeMaps = @('Muldraugh, KY') + $allModKeys
        Write-Info "Generated MapList: $($activeMaps -join '; ')"
    }
    else {
        Write-Fail "No mod maps found at: $modMapsBase"
        Write-Host '  Run: .\make.ps1 download-mod-maps  first.' -ForegroundColor Yellow
        exit 1
    }
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

# The compositor swaps only map_data after a successful staging build, so it
# is safe to refresh an existing merged map without deleting its live tiles.

# The CDN vanilla pyramid (1024px JPG) and mod pyramids (256px WebP) do not
# share tile coordinates. Run the Pillow compositor inside the app container,
# which maps both source folders read-only and writes only the derived volume.
if (-not $hasVanilla) {
    Write-Fail 'Vanilla tiles are required to build a merged map.'
    exit 1
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Fail 'Docker CLI is required to run the map tile compositor.'
    exit 1
}

$image = 'zomboid_server_manager_docker-app'
docker image inspect $image 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "App image '$image' not found. Run .\make.ps1 build first."
    exit 1
}

$compositor = Join-Path $ProjectRoot 'app\scripts\composite-offline-map-tiles.py'
$dockerArgs = @(
    'run', '--rm', '--entrypoint', 'python3',
    '--mount', "type=bind,src=$VanillaDir,dst=/map-tiles-vanilla,readonly",
    '--mount', "type=bind,src=$ModDir,dst=/map-tiles-mods,readonly",
    '--mount', "type=bind,src=$OutputDir,dst=/map-tiles",
    '--mount', "type=bind,src=$compositor,dst=/composite-offline-map-tiles.py,readonly",
    $image, '/composite-offline-map-tiles.py', '--vanilla', '/map-tiles-vanilla', '--mods', '/map-tiles-mods', '--output', '/map-tiles'
)

# Map= is ordered bottom-to-top by PZ. Apply it left-to-right so later entries
# remain visible at overlaps, exactly matching the active server configuration.
foreach ($mod in $modMapsToMerge) {
    $dockerArgs += @('--mod', $mod.CdnKey)
}

Write-Info "Compositing $($modMapsToMerge.Count) active mod map(s) into vanilla..."
& docker @dockerArgs
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Tile compositor failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-OK 'Merged pyramid written to map-tiles-merged'

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
