<?php

namespace App\Http\Controllers;

use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;

class ManifestController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $settings = SiteSetting::cached();

        $name = $settings->site_name ?: config('app.name', 'Zomboid Server Manager');
        $shortName = $settings->pwaBadgeName();
        $iconUrl = $settings->pwaIconUrl();

        // Determine icon mime type based on extension
        $mimeType = 'image/png';
        if (str_ends_with(strtolower($iconUrl), '.svg')) {
            $mimeType = 'image/svg+xml';
        } elseif (str_ends_with(strtolower($iconUrl), '.jpg') || str_ends_with(strtolower($iconUrl), '.jpeg')) {
            $mimeType = 'image/jpeg';
        } elseif (str_ends_with(strtolower($iconUrl), '.webp')) {
            $mimeType = 'image/webp';
        } elseif (str_ends_with(strtolower($iconUrl), '.ico')) {
            $mimeType = 'image/x-icon';
        }

        $themeColor = $settings->theme_colors['primary'] ?? '#161c24';

        $manifest = [
            'name' => $name,
            'short_name' => $shortName,
            'description' => $settings->hero_description ?: 'Project Zomboid Server Management & Community Portal',
            'start_url' => '/',
            'display' => 'standalone',
            'background_color' => '#161c24',
            'theme_color' => $themeColor,
            'orientation' => 'any',
            'icons' => [
                [
                    'src' => $iconUrl,
                    'sizes' => '192x192 512x512',
                    'type' => $mimeType,
                    'purpose' => 'any',
                ],
                [
                    'src' => $iconUrl,
                    'sizes' => '192x192 512x512',
                    'type' => $mimeType,
                    'purpose' => 'maskable',
                ],
            ],
        ];

        return response()->json($manifest, 200, [
            'Content-Type' => 'application/manifest+json; charset=utf-8',
            'Cache-Control' => 'public, max-age=60',
        ]);
    }
}
