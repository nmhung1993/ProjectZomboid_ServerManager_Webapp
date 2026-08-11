<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\MapConfigBuilder;
use App\Services\OnlinePlayersReader;
use App\Services\PlayerPositionReader;
use App\Services\PlayersDbReader;
use App\Services\SafeZoneManager;
use App\Services\ServerStatusResolver;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Process\Process;

class PlayerMapController extends Controller
{
    public function __construct(
        private readonly PlayersDbReader $playersDb,
        private readonly PlayerPositionReader $positionReader,
        private readonly OnlinePlayersReader $onlinePlayers,
        private readonly ServerStatusResolver $statusResolver,
        private readonly MapConfigBuilder $mapConfigBuilder,
        private readonly SafeZoneManager $safeZoneManager,
    ) {}

    public function __invoke(): InertiaResponse
    {
        $resolved = $this->statusResolver->resolve();
        $dbPlayers = $this->playersDb->getAllPlayerPositions();
        $liveData = $this->positionReader->getLivePositions();

        // Use OnlinePlayersReader for reliable online detection (log → RCON → Lua)
        $onlineUsernames = $this->onlinePlayers->getOnlineUsernames();

        $livePositions = [];

        if ($liveData !== null && ! empty($liveData['players'])) {
            foreach ($liveData['players'] as $player) {
                $username = $player['username'] ?? '';
                $livePositions[$username] = $player;
            }
        }

        $markers = [];

        foreach ($dbPlayers as $player) {
            $username = $player['username'];
            $isOnline = in_array($username, $onlineUsernames);

            if ($isOnline && isset($livePositions[$username])) {
                $live = $livePositions[$username];
                $isDead = $live['is_dead'] ?? $player['is_dead'];

                $markers[] = [
                    'username' => $username,
                    'name' => $player['name'],
                    'x' => (float) $live['x'],
                    'y' => (float) $live['y'],
                    'z' => (int) ($live['z'] ?? 0),
                    'status' => $isDead ? 'dead' : 'online',
                    'is_online' => true,
                ];
            } elseif ($isOnline) {
                $markers[] = [
                    'username' => $username,
                    'name' => $player['name'],
                    'x' => $player['x'],
                    'y' => $player['y'],
                    'z' => $player['z'],
                    'status' => $player['is_dead'] ? 'dead' : 'online',
                    'is_online' => true,
                ];
            } else {
                $markers[] = [
                    'username' => $username,
                    'name' => $player['name'],
                    'x' => $player['x'],
                    'y' => $player['y'],
                    'z' => $player['z'],
                    'status' => $player['is_dead'] ? 'dead' : 'offline',
                    'is_online' => false,
                ];
            }
        }

        // Add any online players not in the DB (new connections or DB unavailable)
        foreach ($onlineUsernames as $username) {
            $alreadyAdded = collect($markers)->contains('username', $username);
            if (! $alreadyAdded) {
                $live = $livePositions[$username] ?? null;
                $markers[] = [
                    'username' => $username,
                    'name' => $live['name'] ?? $username,
                    'x' => $live ? (float) $live['x'] : 0.0,
                    'y' => $live ? (float) $live['y'] : 0.0,
                    'z' => $live ? (int) ($live['z'] ?? 0) : 0,
                    'status' => ($live && ($live['is_dead'] ?? false)) ? 'dead' : 'online',
                    'is_online' => true,
                ];
            }
        }

        $mapConfig = $this->mapConfigBuilder->build();
        $safeZoneConfig = $this->safeZoneManager->getConfig();

        return Inertia::render('admin/player-map', [
            'markers' => $markers,
            'onlineCount' => $resolved['player_count'],
            'serverStatus' => $resolved['game_status'],
            'mapConfig' => $mapConfig,
            'hasTiles' => $mapConfig['tileUrl'] !== null,
            'tileProgress' => null,
            'tilesGenerating' => false,
            'safeZones' => $safeZoneConfig['enabled'] ? $safeZoneConfig['zones'] : [],
        ]);
    }

    /**
     * Serve a map tile from the configured tiles path.
     */
    public function tile(string $level, string $tile): BinaryFileResponse|Response
    {
        $tilesPath = config('zomboid.map.tiles_path');
        $dziPath = $tilesPath.'/html/map_data/base/layer0_files';

        // Try webp first, then jpg
        $baseTile = pathinfo($tile, PATHINFO_FILENAME);
        $filePath = null;
        $contentType = 'image/webp';

        foreach (['webp', 'jpg'] as $ext) {
            $candidate = $dziPath.'/'.$level.'/'.$baseTile.'.'.$ext;
            if (is_file($candidate)) {
                $filePath = $candidate;
                $contentType = $ext === 'jpg' ? 'image/jpeg' : 'image/webp';
                break;
            }
        }

        if ($filePath === null) {
            $proxiedTile = $this->proxyRemoteTile($level, $baseTile);

            if ($proxiedTile !== null) {
                return $proxiedTile;
            }

            return $this->missingTileResponse();
        }

        // Prevent path traversal
        $realTilesPath = realpath($tilesPath);
        $realFilePath = realpath($filePath);

        if ($realTilesPath === false || $realFilePath === false || ! str_starts_with($realFilePath, $realTilesPath)) {
            return response('Not found', 404);
        }

        return response()->file($realFilePath, [
            'Cache-Control' => 'public, max-age=86400',
            'Content-Type' => $contentType,
        ]);
    }

    private function proxyRemoteTile(string $level, string $baseTile): ?Response
    {
        $proxyUrl = (string) config('zomboid.map.proxy_url', '');

        if ($proxyUrl === '') {
            return null;
        }

        $parts = explode('_', $baseTile, 2);

        if (count($parts) !== 2) {
            return null;
        }

        $remoteUrl = strtr($proxyUrl, [
            '{z}' => $level,
            '{x}' => $parts[0],
            '{y}' => $parts[1],
        ]);

        try {
            $remoteResponse = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer' => 'https://map.projectzomboid.com/',
                'Accept' => 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            ])->timeout(10)->retry(2, 250)->get($remoteUrl);

            if ($remoteResponse->successful()) {
                $contentType = strtolower((string) $remoteResponse->header('Content-Type', ''));

                if (str_starts_with($contentType, 'image/')) {
                    return response($remoteResponse->body(), 200, [
                        'Content-Type' => $contentType,
                        'Cache-Control' => 'public, max-age=86400',
                    ]);
                }
            }
        } catch (\Throwable) {
            // Fall through to the curl fallback below.
        }

        $fallbackTile = $this->fetchRemoteTileWithCurl($remoteUrl);

        if ($fallbackTile === null) {
            return null;
        }

        return response($fallbackTile['body'], 200, [
            'Content-Type' => $fallbackTile['contentType'],
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    private function missingTileResponse(): Response
    {
        // Transparent 1x1 PNG avoids broken-image placeholders in Leaflet.
        return response(base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'no-store, max-age=0',
        ]);
    }

    /**
     * Fetch a remote tile through curl when the framework HTTP client is blocked.
     *
     * @return array{contentType: string, body: string}|null
     */
    private function fetchRemoteTileWithCurl(string $remoteUrl): ?array
    {
        $headersFile = tempnam(sys_get_temp_dir(), 'pzmap_headers_');
        $bodyFile = tempnam(sys_get_temp_dir(), 'pzmap_body_');

        if ($headersFile === false || $bodyFile === false) {
            if ($headersFile !== false) {
                @unlink($headersFile);
            }
            if ($bodyFile !== false) {
                @unlink($bodyFile);
            }

            return null;
        }

        $process = new Process([
            '/usr/bin/curl',
            '-sS',
            '-L',
            '-A',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            '-e',
            'https://map.projectzomboid.com/',
            '-D',
            $headersFile,
            '-o',
            $bodyFile,
            $remoteUrl,
        ]);

        $process->setTimeout(15);
        $process->run();

        $headers = is_file($headersFile) ? file_get_contents($headersFile) : false;
        $body = is_file($bodyFile) ? file_get_contents($bodyFile) : false;

        @unlink($headersFile);
        @unlink($bodyFile);

        if (! $process->isSuccessful() || $headers === false || $body === false || $body === '') {
            return null;
        }

        if (! preg_match('/^Content-Type:\s*([^\r\n]+)/im', $headers, $matches)) {
            return null;
        }

        $contentType = strtolower(trim($matches[1]));

        if (! str_starts_with($contentType, 'image/')) {
            return null;
        }

        return [
            'contentType' => $contentType,
            'body' => $body,
        ];
    }
}
