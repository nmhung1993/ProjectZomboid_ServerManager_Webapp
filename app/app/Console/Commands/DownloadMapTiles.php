<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Process\Process;

class DownloadMapTiles extends Command
{
    /** @var string */
    protected $signature = 'zomboid:download-map-tiles
        {--url= : Base URL template for remote tiles (default: map.projectzomboid.com B42)}
        {--workers=10 : Number of parallel download workers}
        {--force : Re-download even if tiles already exist}';

    /** @var string */
    protected $description = 'Download full DZI map tile pyramid from remote (e.g. map.projectzomboid.com) to local storage';

    private string $tilesPath;
    private string $basePath;
    private string $remoteBase;
    private string $extension = 'jpg';

    public function handle(): int
    {
        $this->tilesPath = config('zomboid.map.tiles_path');
        $this->basePath = $this->tilesPath.'/html/map_data/base';

        // Resolve remote URL template
        $urlTemplate = $this->option('url')
            ?: 'https://map.projectzomboid.com/maps/42.20.0/base/layer0_files/{z}/{x}_{y}.jpg';

        // Extract base URL (everything before layer0_files)
        $parts = explode('layer0_files/', $urlTemplate, 2);
        if (count($parts) !== 2) {
            $this->error('Invalid URL template. Must contain "layer0_files/{z}/{x}_{y}.ext".');

            return self::FAILURE;
        }
        $this->remoteBase = rtrim($parts[0], '/');

        // Detect extension from URL
        if (preg_match('/\.(jpg|jpeg|webp|png)$/i', $urlTemplate, $m)) {
            $this->extension = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
        }

        $this->info("Remote base: {$this->remoteBase}");
        $this->info("Extension: {$this->extension}");
        $this->info("Local path: {$this->basePath}");

        // Step 1: Download metadata files
        $this->info('Step 1/3: Downloading metadata...');
        if (! $this->downloadMetadata()) {
            $this->error('Failed to download metadata files.');

            return self::FAILURE;
        }

        // Step 2: Parse map_info.json to determine tile grid
        $this->info('Step 2/3: Calculating tile grid...');
        $mapInfo = $this->readMapInfo();
        if ($mapInfo === null) {
            $this->error('Failed to read map_info.json.');

            return self::FAILURE;
        }

        $maxLevel = (int) ceil(log(max($mapInfo['w'], $mapInfo['h']), 2));
        $tileSize = $mapInfo['tile_size'] ?? 256;

        $this->info("Map size: {$mapInfo['w']}x{$mapInfo['h']} px");
        $this->info("Max zoom level: {$maxLevel}");
        $this->info("Tile size: {$tileSize}px");

        // Step 3: Download all tiles
        $this->info('Step 3/3: Downloading tiles...');
        $totalTiles = 0;
        $downloadedTiles = 0;
        $skippedTiles = 0;

        for ($level = 0; $level <= $maxLevel; $level++) {
            $scale = 2 ** ($maxLevel - $level);
            $cols = (int) ceil($mapInfo['w'] / ($tileSize * $scale));
            $rows = (int) ceil($mapInfo['h'] / ($tileSize * $scale));

            $this->info("Level {$level}: {$cols}x{$rows} = ".($cols * $rows).' tiles');

            $tiles = [];
            for ($y = 0; $y < $rows; $y++) {
                for ($x = 0; $x < $cols; $x++) {
                    $tiles[] = ['x' => $x, 'y' => $y, 'level' => $level];
                }
            }
            $totalTiles += count($tiles);

            // Download in parallel batches
            $workers = (int) $this->option('workers');
            $batches = array_chunk($tiles, $workers);

            $bar = $this->output->createProgressBar(count($tiles));
            $bar->setFormat("Level {$level}: %current%/%max% [%bar%] %percent%%");

            foreach ($batches as $batch) {
                $results = $this->downloadBatch($batch, $mapInfo, $tileSize, $maxLevel);
                foreach ($results as $result) {
                    if ($result === 'downloaded') {
                        $downloadedTiles++;
                    } elseif ($result === 'skipped') {
                        $skippedTiles++;
                    }
                    $bar->advance();
                }
            }

            $bar->finish();
            $this->newLine();
        }

        $this->info("Done! Total: {$totalTiles} tiles ({$downloadedTiles} downloaded, {$skippedTiles} skipped)");
        $this->info("Map tiles saved to: {$this->basePath}");

        return self::SUCCESS;
    }

    /**
     * Download map_info.json and layer0.dzi from remote.
     */
    private function downloadMetadata(): bool
    {
        $metadataFiles = [
            'map_info.json',
            'layer0.dzi',
        ];

        foreach ($metadataFiles as $file) {
            $remoteUrl = $this->remoteBase.'/'.$file;
            $localPath = $this->basePath.'/'.$file;

            if (is_file($localPath) && ! $this->option('force')) {
                $this->line("  {$file} already exists, skipping.");
                continue;
            }

            $this->line("  Downloading {$file}...");

            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer' => 'https://map.projectzomboid.com/',
                ])->timeout(30)->get($remoteUrl);

                if ($response->successful()) {
                    if (! is_dir(dirname($localPath))) {
                        mkdir(dirname($localPath), 0755, true);
                    }
                    file_put_contents($localPath, $response->body());
                    $this->line("  ✓ {$file}");
                } else {
                    // Try curl fallback
                    $body = $this->curlDownload($remoteUrl);
                    if ($body === null) {
                        $this->error("  ✗ {$file} (HTTP {$response->status()})");

                        return false;
                    }
                    if (! is_dir(dirname($localPath))) {
                        mkdir(dirname($localPath), 0755, true);
                    }
                    file_put_contents($localPath, $body);
                    $this->line("  ✓ {$file} (via curl)");
                }
            } catch (\Throwable $e) {
                // Try curl fallback
                $body = $this->curlDownload($remoteUrl);
                if ($body === null) {
                    $this->error("  ✗ {$file}: {$e->getMessage()}");

                    return false;
                }
                if (! is_dir(dirname($localPath))) {
                    mkdir(dirname($localPath), 0755, true);
                }
                file_put_contents($localPath, $body);
                $this->line("  ✓ {$file} (via curl)");
            }
        }

        return true;
    }

    /**
     * Read and parse the downloaded map_info.json.
     *
     * @return array{w: int, h: int, tile_size: int}|null
     */
    private function readMapInfo(): ?array
    {
        $infoPath = $this->basePath.'/map_info.json';

        if (! is_file($infoPath)) {
            return null;
        }

        $json = json_decode(file_get_contents($infoPath), true);
        if (! is_array($json)) {
            return null;
        }

        return [
            'w' => (int) ($json['w'] ?? 0),
            'h' => (int) ($json['h'] ?? 0),
            'tile_size' => (int) ($json['tile_size'] ?? 256),
        ];
    }

    /**
     * Download a batch of tiles in parallel using curl multi-handle style.
     *
     * @param array<int, array{x: int, y: int, level: int}> $tiles
     * @param array{w: int, h: int, tile_size: int} $mapInfo
     * @return array<int, string>
     */
    private function downloadBatch(array $tiles, array $mapInfo, int $tileSize, int $maxLevel): array
    {
        $results = [];
        $maxConcurrent = min(count($tiles), (int) $this->option('workers'));
        $chunks = array_chunk($tiles, max(1, (int) ceil(count($tiles) / $maxConcurrent)));

        foreach ($chunks as $chunk) {
            $processes = [];

            foreach ($chunk as $tile) {
                $x = $tile['x'];
                $y = $tile['y'];
                $level = $tile['level'];

                $localPath = $this->basePath.'/layer0_files/'.$level.'/'.$x.'_'.$y.'.'.$this->extension;

                if (is_file($localPath) && ! $this->option('force')) {
                    $results[] = 'skipped';
                    continue;
                }

                // Only download tiles that should exist (within map bounds at this level)
                $scale = 2 ** ($maxLevel - $level);
                $effectiveWidth = (int) ceil($mapInfo['w'] / $scale);
                $effectiveHeight = (int) ceil($mapInfo['h'] / $scale);

                if ($x * $tileSize >= $effectiveWidth || $y * $tileSize >= $effectiveHeight) {
                    $results[] = 'skipped';
                    continue;
                }

                $remoteUrl = $this->remoteBase.'/layer0_files/'.$level.'/'.$x.'_'.$y.'.'.$this->extension;

                if (! is_dir(dirname($localPath))) {
                    mkdir(dirname($localPath), 0755, true);
                }

                $processes[] = [
                    'url' => $remoteUrl,
                    'path' => $localPath,
                    'key' => count($results),
                ];
                $results[] = 'pending';
            }

            if (empty($processes)) {
                continue;
            }

            // Use parallel curl processes for speed
            $this->downloadParallel($processes, $results);
        }

        return $results;
    }

    /**
     * Download multiple files in parallel using background curl processes.
     *
     * @param array<int, array{url: string, path: string, key: int}> $processes
     * @param array<int, string> &$results
     */
    private function downloadParallel(array $processes, array &$results): void
    {
        $handles = [];
        $files = [];

        // Build multi-handle curl command using a shell script approach
        // Spawn background curl processes and wait for all
        $pids = [];

        foreach ($processes as $proc) {
            $pid = pcntl_fork();

            if ($pid === -1) {
                // Fork failed, fall back to sequential
                $this->downloadSequential($processes, $results);

                return;
            }

            if ($pid === 0) {
                // Child process
                $exitCode = $this->downloadSingleFile($proc['url'], $proc['path']);
                exit($exitCode ? 1 : 0);
            }

            // Parent
            $pids[] = $pid;
        }

        // Wait for all children
        foreach ($pids as $index => $pid) {
            $status = 0;
            pcntl_waitpid($pid, $status);
            $proc = $processes[$index];
            $results[$proc['key']] = pcntl_wifexited($status) && pcntl_wexitstatus($status) === 0
                ? 'downloaded'
                : 'skipped';
        }
    }

    /**
     * Download a single file using curl.
     */
    private function downloadSingleFile(string $url, string $path): bool
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            CURLOPT_REFERER => 'https://map.projectzomboid.com/',
            CURLOPT_FAILONERROR => true,
        ]);

        $data = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($data === false || $httpCode !== 200) {
            return false;
        }

        if (strlen($data) < 100) {
            // Too small to be a real tile
            return false;
        }

        return file_put_contents($path, $data) !== false;
    }

    /**
     * Fallback sequential download when pcntl_fork is unavailable.
     *
     * @param array<int, array{url: string, path: string, key: int}> $processes
     * @param array<int, string> &$results
     */
    private function downloadSequential(array $processes, array &$results): void
    {
        foreach ($processes as $proc) {
            $success = $this->downloadSingleFile($proc['url'], $proc['path']);
            $results[$proc['key']] = $success ? 'downloaded' : 'skipped';
        }
    }

    /**
     * Download a URL using curl command-line (fallback).
     */
    private function curlDownload(string $url): ?string
    {
        $process = new Process([
            'curl',
            '-sS',
            '-L',
            '-A',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            '-e',
            'https://map.projectzomboid.com/',
            '--max-time',
            '30',
            $url,
        ]);

        $process->setTimeout(35);
        $process->run();

        if (! $process->isSuccessful()) {
            return null;
        }

        $body = $process->getOutput();

        return $body !== '' ? $body : null;
    }
}