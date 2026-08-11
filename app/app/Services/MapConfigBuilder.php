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
        $tileUrl = url('/admin/map-tiles/{z}/{x}_{y}?v=42.20.0');
        $minZoom = (int) config('zomboid.map.min_zoom');
        $maxZoom = (int) config('zomboid.map.max_zoom');
        $defaultZoom = (int) config('zomboid.map.default_zoom');

        if ($localDzi) {
            return [
                'tileUrl' => $tileUrl,
                'tileSize' => config('zomboid.map.tile_size'),
                'minZoom' => $minZoom,
                'maxZoom' => $maxZoom,
                'defaultZoom' => max($minZoom, min($defaultZoom, $maxZoom)),
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
     * @return array{width: int, height: int, x0: int, y0: int, sqr: int, maxNativeZoom: int, isometric: bool}|null
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
        $w = (int) $mapInfo['w'] * $levelScale;
        $h = (int) $mapInfo['h'] * $levelScale;
        $sqr = (int) ($mapInfo['sqr'] ?? 1);

        return [
            'width' => $w,
            'height' => $h,
            'x0' => (int) ($mapInfo['x0'] ?? 0),
            'y0' => (int) ($mapInfo['y0'] ?? 0),
            'sqr' => $sqr,
            'maxNativeZoom' => (int) ceil(log(max($w, $h), 2)),
            'isometric' => $sqr > 2,
        ];
    }
}
