<?php

namespace App\Services;

class MapConfigBuilder
{
    /**
     * Build map configuration.
     *
     * @return array{tileUrl: string|null, tileSize: int, minZoom: int, maxZoom: int, defaultZoom: int, center: array{x: int, y: int}, dzi: array|null}
     */
    public function build(): array
    {
        $localDzi = $this->getLocalDziConfig();
        $subdir = $this->resolveMapBaseSubdir();
        $mapInfoPath = config('zomboid.map.tiles_path').'/html/map_data/'.$subdir.'/map_info.json';
        $tileVersion = is_file($mapInfoPath) ? filemtime($mapInfoPath) : 'missing';
        // Keep tiles on the same origin so localhost, LAN IP, and HTTPS all work.
        $tileUrl = '/admin/map-tiles/{z}/{x}_{y}?v='.$tileVersion;
        $minZoom = (int) config('zomboid.map.min_zoom');
        $maxZoom = (int) config('zomboid.map.max_zoom');
        $defaultZoom = (int) config('zomboid.map.default_zoom');

        if ($localDzi) {
            // The generated pyramid is authoritative. Do not expose zoom
            // levels below its bounds or above its native resolution.
            $localMinZoom = 0;
            $localMaxZoom = $maxZoom;
            $localTileSize = (int) config('zomboid.map.tile_size');
            if (! $localDzi['isometric']) {
                $localTileSize *= max(1, (int) round($localDzi['sqr']));
            }

            return [
                'tileUrl' => $tileUrl,
                'tileSize' => $localTileSize,
                'minZoom' => $localMinZoom,
                'maxZoom' => $localMaxZoom,
                'defaultZoom' => max($localMinZoom, min($defaultZoom, $localMaxZoom)),
                'center' => [
                    'x' => config('zomboid.map.center_x'),
                    'y' => config('zomboid.map.center_y'),
                ],
                'dzi' => $localDzi,
            ];
        }

        return [
            'tileUrl' => null,
            'tileSize' => config('zomboid.map.tile_size'),
            'minZoom' => $minZoom,
            'maxZoom' => $maxZoom,
            'defaultZoom' => max($minZoom, min($defaultZoom, $maxZoom)),
            'center' => [
                'x' => config('zomboid.map.center_x'),
                'y' => config('zomboid.map.center_y'),
            ],
            'dzi' => null,
        ];
    }

    /**
     * Resolve the map data base subdirectory that actually holds tiles.
     *
     * gen-map renders top-view as base_top then renames it to base (see
     * GenerateMapTiles), while the offline CDN merge writes base_top. Prefer
     * base when present, otherwise fall back to base_top.
     */
    public function resolveMapBaseSubdir(): string
    {
        $tilesPath = config('zomboid.map.tiles_path');

        if (is_file($tilesPath.'/html/map_data/base/map_info.json')) {
            return 'base';
        }

        return 'base_top';
    }

    /**
     * Get DZI config from locally generated tiles, or null if not available.
     *
     * @return array{width: int, height: int, x0: float, y0: float, sqr: float, maxNativeZoom: int, isometric: bool}|null
     */
    private function getLocalDziConfig(): ?array
    {
        $subdir = $this->resolveMapBaseSubdir();
        $dziPath = config('zomboid.map.tiles_path').'/html/map_data/'.$subdir.'/layer0_files';

        $infoPath = config('zomboid.map.tiles_path').'/html/map_data/'.$subdir.'/map_info.json';

        if (! is_file($infoPath)) {
            return null;
        }

        // Some pyramids omit level 0 (the single overview tile) and only
        // contain tiles from level 1 upward. Scan every numeric level
        // directory instead of hard-requiring layer0_files/0.
        $hasTiles = false;
        $levelDirs = is_dir($dziPath) ? glob($dziPath.'/*', GLOB_ONLYDIR) : [];

        foreach ($levelDirs as $levelDir) {
            if (! is_numeric(basename((string) $levelDir))) {
                continue;
            }

            $webp = glob($levelDir.'/*.webp');
            $jpg = glob($levelDir.'/*.jpg');

            if (! empty($webp) || ! empty($jpg)) {
                $hasTiles = true;
                break;
            }
        }

        if (! $hasTiles) {
            return null;
        }

        $mapInfo = json_decode(file_get_contents($infoPath), true);

        $skip = (int) ($mapInfo['skip'] ?? 0);
        $levelScale = 2 ** $skip;
        $w = (int) $mapInfo['w'];
        $h = (int) $mapInfo['h'];
        $rawSqr = (float) ($mapInfo['sqr'] ?? 1);

        return [
            'width' => $w,
            'height' => $h,
            'x0' => (float) ($mapInfo['x0'] ?? 0) / $levelScale,
            'y0' => (float) ($mapInfo['y0'] ?? 0) / $levelScale,
            'sqr' => $rawSqr / $levelScale,
            'maxNativeZoom' => (int) ceil(log(max($w, $h), 2)),
            // Top-view supersampling uses sqr=4; isometric maps use the
            // much larger native square size (typically 128).
            'isometric' => $rawSqr >= 16,
        ];
    }
}
