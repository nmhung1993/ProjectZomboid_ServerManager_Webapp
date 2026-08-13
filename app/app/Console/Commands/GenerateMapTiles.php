<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class GenerateMapTiles extends Command
{
    /** @var string */
    protected $signature = 'zomboid:generate-map-tiles
        {--force : Regenerate tiles even if they already exist}
        {--map= : Specific map name to generate (default: all)}
        {--workers= : Number of render workers (default: auto-detect CPU cores)}';

    /** @var string */
    protected $description = 'Generate DZI map tiles from PZ game data using pzmap2dzi';

    public function handle(): int
    {
        $tilesPath = config('zomboid.map.tiles_path');
        $serverPath = config('zomboid.game_server_path');

        if (! is_dir($serverPath)) {
            $this->error("Game server path does not exist: {$serverPath}");

            return self::FAILURE;
        }

        if (! is_dir($serverPath.'/media')) {
            $this->error("Game server files not ready yet (no media/ directory in {$serverPath})");

            return self::FAILURE;
        }

        // Check Python3 availability
        exec('python3 --version 2>&1', $output, $exitCode);
        if ($exitCode !== 0) {
            $this->error('Python3 is required but not found.');

            return self::FAILURE;
        }

        $this->info('Python3 found: '.($output[0] ?? 'unknown version'));

        // Check for pzmap2dzi
        $pzmap2dziPath = $this->findPzmap2dzi();
        if ($pzmap2dziPath === null) {
            $this->error('pzmap2dzi not found.');

            return self::FAILURE;
        }

        $this->info("Using pzmap2dzi: {$pzmap2dziPath}");

        // Recent pzmap2dzi builds still resolve the legacy default.txt name.
        $this->ensureDefaultMapConfig($pzmap2dziPath);

        $hasTexturePacks = is_dir($serverPath.'/media/texturepacks');

        $confDir = dirname($pzmap2dziPath).'/conf';
        $modMaps = $this->resolveModMaps($confDir, $serverPath);

        if (! $this->option('force') && $this->hasGeneratedTiles($tilesPath)) {
            $this->warn('Tiles already exist. Use --force to regenerate.');

            return self::SUCCESS;
        }

        if ($this->option('force')) {
            // Delete the entire map_data tree so pzmap2dzi does a full
            // fresh render. Partial deletes can leave stale metadata
            // that causes "No such file or directory" errors when mod
            // maps add cells at zoom levels the vanilla map lacks.
            File::deleteDirectory($tilesPath.'/html/map_data');
        }

        // Create output directory
        if (! is_dir($tilesPath)) {
            mkdir($tilesPath, 0755, true);
        }

        // Generate pzmap2dzi config
        $confPath = $this->generateConfig($serverPath, $tilesPath, $modMaps);
        $this->info("Generated config: {$confPath}");

        // Step 1: Unpack textures
        $this->info('Step 1/2: Unpacking textures...');
        if (! $this->runPzmap($pzmap2dziPath, $confPath, 'unpack')) {
            return self::FAILURE;
        }

        // Step 2: Render map tiles
        $this->info('Step 2/2: Rendering map tiles...');
        $renderCommand = $hasTexturePacks ? 'render base' : 'render base_top';
        if (! $hasTexturePacks) {
            $this->warn('No texturepacks found; generating a top-view cartographic map.');
        }

        if (! $this->runPzmap($pzmap2dziPath, $confPath, $renderCommand)) {
            return self::FAILURE;
        }

        if (! $hasTexturePacks) {
            $topViewPath = $tilesPath.'/html/map_data/base_top';
            $basePath = $tilesPath.'/html/map_data/base';
            if (is_dir($topViewPath)) {
                // Remove any stale base directory first (e.g. from a previous run)
                if (is_dir($basePath)) {
                    File::deleteDirectory($basePath);
                }
                rename($topViewPath, $basePath);
            }
        }

        if (! empty($modMaps) && ! $this->mergeModTiles($tilesPath, $modMaps, $renderCommand)) {
            return self::FAILURE;
        }

        $this->info('Map tiles generated successfully at: '.$tilesPath);

        return self::SUCCESS;
    }

    private function runPzmap(string $pzmap2dziPath, string $confPath, string $subcommand): bool
    {
        $pzmap2dziDir = dirname($pzmap2dziPath);
        $logFile = storage_path('logs/pzmap2dzi.log');
        $command = sprintf(
            'cd %s && python3 %s -c %s %s > %s 2>&1',
            escapeshellarg($pzmap2dziDir),
            escapeshellarg($pzmap2dziPath),
            escapeshellarg($confPath),
            $subcommand,
            escapeshellarg($logFile),
        );

        $this->line("Running: {$command}");
        $this->line("Output logged to: {$logFile}");

        $result = 0;
        exec($command, $output, $result);

        if ($result !== 0) {
            $this->error("pzmap2dzi '{$subcommand}' failed with exit code: {$result}");
            if (is_file($logFile)) {
                // Show last 20 lines of the log for debugging
                $lines = file($logFile);
                $tail = array_slice($lines, -20);
                $this->error(implode('', $tail));
            }

            return false;
        }

        $this->info("Completed: {$subcommand}");

        return true;
    }

    /**
     * @param string[] $modMaps
     */
    private function generateConfig(string $serverPath, string $tilesPath, array $modMaps): string
    {
        $mapOption = $this->option('map') ?: 'default';
        $workerCount = (int) ($this->option('workers') ?: $this->detectCpuCores());

        $this->info("Using {$workerCount} render workers");

        $pzmap2dziPath = $this->findPzmap2dzi();
        $confDir = dirname($pzmap2dziPath).'/conf';

        $mapConfLines = "    - vanilla.txt";
        $modRootLine = '';
        $modMapsYaml = '';

        if (! empty($modMaps)) {
            $mapConfLines .= "\n    - mod/";
            $modRootLine = "mod_root: |-\n    {$serverPath}/steamapps/workshop/content/108600";
            $modMapsYaml = "mod_maps:";
            foreach ($modMaps as $modMap) {
                $modMapsYaml .= "\n    - {$modMap}";
            }
        }

        $config = "pz_root: |-\n".
            "    {$serverPath}\n".
            "\n".
            "output_root: |-\n".
            "    {$tilesPath}\n".
            "\n".
            "output_entry: default\n".
            "output_route: map_data/\n".
            "\n".
            "map_conf_default: default_b42.txt\n".
            "map_conf:\n".
            "{$mapConfLines}\n".
            "{$modRootLine}\n".
            "base_map: {$mapOption}\n".
            "{$modMapsYaml}\n".
            "\n".
            "render_conf:\n".
            "    verbose: true\n".
            "    profile: false\n".
            "    worker_count: {$workerCount}\n".
            "    break_key: ''\n".
            "    tile_size: 256\n".
            "    tile_align_levels: 3\n".
            "    # Render the complete native-resolution pyramid so max zoom does\n".
            "    # not upscale a low-resolution preview.\n".
            "    layer_range: [0, 1]\n".
            "    omit_levels: 0\n".
            "    image_fmt: jpg\n".
            "    image_fmt_base_layer0: jpg\n".
            "    image_save_options: {}\n".
            "    enable_cache: false\n".
            "    cache_limit_mb: 0\n".
            "    # Four pixels per PZ square produces native detail through zoom 17.\n".
            "    top_view_square_size: 4\n".
            "    top_view_color_mode: carto-zed\n".
            "    use_mark: false\n".
            "    plants_conf:\n".
            "        snow: false\n".
            "        large_bush: false\n".
            "        flower: false\n".
            "        season: summer2\n".
            "        tree_size: 2\n".
            "        jumbo_tree_size: 4\n".
            "        jumbo_tree_type: 0\n".
            "        no_ground_cover: false\n".
            "        unify_tree_type: -1\n";

        // Config must live in pzmap2dzi/conf/ so relative map_conf paths resolve
        $confPath = $confDir.'/generated.yaml';
        file_put_contents($confPath, $config);

        return $confPath;
    }

    /**
     * Copy every mod's native tiles into the vanilla DZI and rebuild only the
     * affected parent tiles. This leaves the map viewer with one coherent tile
     * pyramid while preserving the Map= ordering as overlay priority.
     *
     * @param string[] $modMaps
     */
    private function mergeModTiles(string $tilesPath, array $modMaps, string $renderCommand): bool
    {
        $basePath = $tilesPath.'/html/map_data/base';
        $modRenderName = $renderCommand === 'render base_top' ? 'base_top' : 'base';
        $scriptPath = base_path('scripts/composite-map-tiles.py');

        if (! is_file($scriptPath)) {
            $this->error("Map tile compositor not found: {$scriptPath}");

            return false;
        }

        $command = ['python3', $scriptPath, '--base', $basePath];
        foreach ($modMaps as $modMap) {
            $modPath = $tilesPath.'/html/map_data/mod_maps/'.$modMap.'/'.$modRenderName;
            if (is_dir($modPath)) {
                $command[] = '--mod';
                $command[] = $modPath;
            }
        }

        if (count($command) === 4) {
            return true;
        }

        $this->info('Merging mod map tiles into the base map...');
        $process = new Process($command);
        $process->setTimeout(600);
        $process->run(function (string $type, string $output): void {
            $this->output->write($output);
        });

        if (! $process->isSuccessful()) {
            $this->error('Could not merge mod map tiles: '.$process->getErrorOutput());

            return false;
        }

        return true;
    }

    /**
     * Resolve mod map names from the server.ini Map= line.
     *
     * Reads the active map list, parses vanilla.txt and mod/maps-*.txt to
     * classify each map, and returns the list of mod map names (as defined
     * in pzmap2dzi's mod map config files) that should be rendered.
     *
     * @return string[]
     */
    private function resolveModMaps(string $confDir, string $serverPath): array
    {
        $iniPath = config('zomboid.paths.server_ini');
        if (! is_file($iniPath)) {
            $this->warn('server.ini not found, skipping mod map detection.');

            return [];
        }

        $ini = (new \App\Services\ServerIniParser)->read($iniPath);
        $mapLine = $ini['Map'] ?? '';

        if ($mapLine === '') {
            return [];
        }

        // PZ uses semicolons as list separators in Map=
        $activeMaps = array_map('trim', explode(';', $mapLine));
        $activeMaps = array_filter($activeMaps, fn ($m) => $m !== '');

        if (empty($activeMaps)) {
            return [];
        }

        // Parse vanilla.txt to get vanilla map names
        $vanillaNames = $this->parseVanillaMapNames($confDir.'/vanilla.txt');

        // Parse mod/maps-*.txt to build mod map name → pzmap2dzi key mapping
        $modMapKeys = $this->parseModMapKeys($confDir.'/mod');

        // Auto-discover mod maps from workshop directories for any active
        // maps not found in existing mod definition files.
        $discoveredKeys = $this->discoverModMapKeys($serverPath, $activeMaps, $vanillaNames, $modMapKeys);
        $modMapKeys = array_merge($modMapKeys, $discoveredKeys);

        $modMaps = [];
        foreach ($activeMaps as $mapName) {
            // Skip vanilla maps (they're covered by base_map)
            if (in_array($mapName, $vanillaNames, true)) {
                continue;
            }

            // Look up the pzmap2dzi key for this mod map
            $key = $modMapKeys[$mapName] ?? null;
            if ($key !== null) {
                $modMaps[] = $key;
                $this->info("Detected mod map: {$mapName} → {$key}");
            } else {
                $this->warn("Mod map '{$mapName}' not found in pzmap2dzi mod definitions — skipping.");
            }
        }

        return $modMaps;
    }

    /**
     * Discover mod map keys by scanning workshop directories.
     *
     * For any active map not found in existing mod definition files,
     * scans the Steam workshop content directory to find matching
     * installed mods and returns their pzmap2dzi keys.
     *
     * @param array<string, string> $existingKeys
     * @return array<string, string>
     */
    private function discoverModMapKeys(string $serverPath, array $activeMaps, array $vanillaNames, array $existingKeys): array
    {
        $workshopBase = $serverPath.'/steamapps/workshop/content/108600';
        if (! is_dir($workshopBase)) {
            return [];
        }

        $discovered = [];
        $defEntries = [];

        foreach ($activeMaps as $mapName) {
            if (in_array($mapName, $vanillaNames, true)) {
                continue;
            }
            if (isset($existingKeys[$mapName])) {
                continue; // Already defined
            }

            // Scan workshop directories for this map
            $workshopDirs = glob($workshopBase.'/*', GLOB_ONLYDIR);
            foreach ($workshopDirs as $wsDir) {
                $steamId = basename($wsDir);
                $modDirs = glob($wsDir.'/mods/*', GLOB_ONLYDIR);
                foreach ($modDirs as $modDir) {
                    $modName = basename($modDir);
                    $mapDir = $modDir.'/common/media/maps/'.$mapName;
                    if (is_dir($mapDir)) {
                        $key = $this->sanitizeModMapKey($mapName);
                        $discovered[$mapName] = $key;
                        $defEntries[] = [
                            'key' => $key,
                            'map_name' => $mapName,
                            'mod_name' => $modName,
                            'steam_id' => $steamId,
                        ];
                        $this->info("Discovered mod map: {$mapName} → {$key} (workshop {$steamId})");
                        break 2; // Found match, move to next map
                    }
                }
            }
        }

        // Write discovered definitions to a file so pzmap2dzi can read them
        if (! empty($defEntries)) {
            $pzmap2dziPath = $this->findPzmap2dzi();
            $modConfDir = dirname($pzmap2dziPath).'/conf/mod';
            $autoDefPath = $modConfDir.'/maps-auto-generated.txt';
            $yaml = '';
            foreach ($defEntries as $entry) {
                $yaml .= "{$entry['key']}:\n";
                $yaml .= "  display_name: {$entry['map_name']}\n";
                $yaml .= "  map_name: {$entry['map_name']}\n";
                $yaml .= "  mod_name: {$entry['mod_name']}\n";
                $yaml .= "  steam_id: '{$entry['steam_id']}'\n";
                $yaml .= "  texture: false\n\n";
            }
            file_put_contents($autoDefPath, $yaml);
            $this->info("Wrote auto-generated mod definitions to: {$autoDefPath}");
        }

        return $discovered;
    }

    /**
     * Sanitize a map name into a valid pzmap2dzi config key.
     */
    private function sanitizeModMapKey(string $mapName): string
    {
        // Replace spaces and special chars with nothing, keep alphanumeric
        return preg_replace('/[^a-zA-Z0-9]/', '', $mapName);
    }

    /**
     * Parse vanilla.txt to extract vanilla map names.
     *
     * @return string[]
     */
    private function parseVanillaMapNames(string $vanillaPath): array
    {
        if (! is_file($vanillaPath)) {
            return [];
        }

        $content = file_get_contents($vanillaPath);
        if ($content === false) {
            return [];
        }

        $names = [];
        // The default map is defined under "default:" with map_path containing the map name
        // Other maps are defined as top-level keys
        $lines = explode("\n", $content);
        $currentSection = null;

        foreach ($lines as $line) {
            $line = rtrim($line, "\r");
            $trimmed = trim($line);

            // Skip comments and empty lines
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            // Check for section header (top-level key ending with :)
            if (preg_match('/^(\S+):$/', $trimmed, $m)) {
                $currentSection = $m[1];
                continue;
            }

            // Extract map_name from map_path line
            if ($currentSection !== null && preg_match('/map_path:\s*[\'"]?.*\/maps\/(.+?)[\'"]?\s*$/', $trimmed, $m)) {
                $names[] = $m[1];
            }
        }

        // Also add the default map name
        $names[] = 'Muldraugh, KY';

        return array_unique($names);
    }

    /**
     * Parse mod/maps-*.txt files to build a mapping of map_name → pzmap2dzi key.
     *
     * @return array<string, string>
     */
    private function parseModMapKeys(string $modDir): array
    {
        if (! is_dir($modDir)) {
            return [];
        }

        $mapFiles = glob($modDir.'/maps-*.txt');
        if (empty($mapFiles)) {
            return [];
        }

        $mapping = [];

        foreach ($mapFiles as $file) {
            $content = file_get_contents($file);
            if ($content === false) {
                continue;
            }

            // Parse YAML-like structure: each mod map is a top-level key
            // with map_name and mod_name sub-keys
            $lines = explode("\n", $content);
            $currentKey = null;
            $currentMapName = null;

            foreach ($lines as $line) {
                $line = rtrim($line, "\r");
                $trimmed = trim($line);

                if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                    continue;
                }

                // Top-level key (no indentation, ends with :)
                if (preg_match('/^(\S+):$/', $trimmed, $m)) {
                    // Save previous entry
                    if ($currentKey !== null && $currentMapName !== null) {
                        $mapping[$currentMapName] = $currentKey;
                    }
                    $currentKey = $m[1];
                    $currentMapName = null;
                    continue;
                }

                // Indented key: map_name or mod_name
                if ($currentKey !== null && preg_match('/^\s+map_name:\s*(.+)$/', $trimmed, $m)) {
                    $currentMapName = trim($m[1]);
                }
            }

            // Save last entry
            if ($currentKey !== null && $currentMapName !== null) {
                $mapping[$currentMapName] = $currentKey;
            }
        }

        return $mapping;
    }

    private function ensureDefaultMapConfig(string $pzmap2dziPath): void
    {
        $confDir = dirname($pzmap2dziPath).'/conf';
        $legacyPath = $confDir.'/default.txt';

        if (is_file($legacyPath)) {
            return;
        }

        $sourcePath = $confDir.'/default_b42.txt';
        if (is_file($sourcePath)) {
            copy($sourcePath, $legacyPath);
        }
    }

    private function hasGeneratedTiles(string $tilesPath): bool
    {
        $levelZeroPath = $tilesPath.'/html/map_data/base/layer0_files/0';

        return ! empty(glob($levelZeroPath.'/*.jpg'))
            || ! empty(glob($levelZeroPath.'/*.webp'));
    }

    private function detectCpuCores(): int
    {
        $cores = 4;

        if (is_readable('/proc/cpuinfo')) {
            $cpuinfo = file_get_contents('/proc/cpuinfo');
            $cores = substr_count($cpuinfo, 'processor');
        }

        return max(1, $cores);
    }

    private function findPzmap2dzi(): ?string
    {
        // Docker image — installed via Dockerfile
        $dockerPath = '/opt/pzmap2dzi/main.py';
        if (is_file($dockerPath)) {
            return $dockerPath;
        }

        // Check if pzmap2dzi is in PATH
        exec('which pzmap2dzi 2>/dev/null', $output, $exitCode);
        if ($exitCode === 0 && ! empty($output[0])) {
            return $output[0];
        }

        // Check common pip install location
        $pipPath = getenv('HOME').'/.local/bin/pzmap2dzi';
        if (is_file($pipPath)) {
            return $pipPath;
        }

        // Check local copy in project
        $localPath = base_path('tools/pzmap2dzi/main.py');
        if (is_file($localPath)) {
            return $localPath;
        }

        return null;
    }
}
