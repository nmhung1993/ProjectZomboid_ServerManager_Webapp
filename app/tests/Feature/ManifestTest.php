<?php

use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Web App Manifest', function () {
    it('returns dynamic webmanifest with default settings', function () {
        $response = $this->get('/manifest.webmanifest');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/manifest+json; charset=utf-8')
            ->assertJson([
                'name' => 'Zomboid Manager',
                'short_name' => 'Zomboid Manager',
                'display' => 'standalone',
                'start_url' => '/',
            ]);
    });

    it('returns custom pwa badge name and updated logo in manifest', function () {
        $settings = SiteSetting::instance();
        $settings->site_name = 'My Apocalypse Server';
        $settings->pwa_badge_name = 'Apocalypse';
        $settings->logo_path = 'site/logo.png';
        $settings->save();
        SiteSetting::bustCache();

        $response = $this->get('/manifest.webmanifest');

        $response->assertOk()
            ->assertJson([
                'name' => 'My Apocalypse Server',
                'short_name' => 'Apocalypse',
                'icons' => [
                    [
                        'src' => '/storage/site/logo.png',
                        'sizes' => '192x192 512x512',
                        'type' => 'image/png',
                        'purpose' => 'any',
                    ],
                    [
                        'src' => '/storage/site/logo.png',
                        'sizes' => '192x192 512x512',
                        'type' => 'image/png',
                        'purpose' => 'maskable',
                    ],
                ],
            ]);
    });

    it('accessible via manifest.json alias route', function () {
        $response = $this->get('/manifest.json');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    });
});
