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
        $mapInfoPath = config('zomboid.map.tiles_path').'/html/map_data/base/map_info.json';
        $tileVersion = is_file($mapInfoPath) ? filemtime($mapInfoPath) : 'missing';
        // Keep tiles on the same origin so localhost, LAN IP, and HTTPS all work.
        $tileUrl = '/admin/map-tiles/{z}/{x}_{y}?v='.$tileVersion;
        $minZoom = (int) config('zomboid.map.min_zoom');
        $maxZoom = (int) config('zomboid.map.max_zoom');
        $defaultZoom = (int) config('zomboid.map.default_zoom');

        if ($localDzi) {
            // The generated pyramid is authoritative. Do not expose zoom
            // levels below its bounds or above its native resolution.
            $nativeMaxZoom = $localDzi['maxNativeZoom'];
            $localMinZoom = 0;
            $localMaxZoom = min($maxZoom, $nativeMaxZoom);
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
     * Get DZI config from locally generated tiles, or null if not available.
     *
     * @return array{width: int, height: int, x0: float, y0: float, sqr: float, maxNativeZoom: int, isometric: bool}|null
     */
    private function getLocalDziConfig(): ?array
    {
        $dziPath = config('zomboid.map.tiles_path').'/html/map_data/base/layer0_files';

        if (! is_dir($dziPath.'/0')) {
            return null;
        }

        $webp = glob($dziPath.'/0/*.webp');
        $jpg = glob($dziPath.'/0/*.jpg');

        if (empty($webp) && empty($jpg)) {
            return null;
        }

        $infoPath = config('zomboid.map.tiles_path').'/html/map_data/base/map_info.json';

        if (! is_file($infoPath)) {
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
