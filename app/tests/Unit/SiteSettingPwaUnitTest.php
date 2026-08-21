<?php

use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    SiteSetting::bustCache();
});

it('defaults pwaBadgeName to site_name when pwa_badge_name is null or empty', function () {
    $settings = SiteSetting::factory()->create([
        'site_name' => 'Default Zomboid Server',
        'pwa_badge_name' => null,
    ]);

    expect($settings->pwaBadgeName())->toBe('Default Zomboid Server');

    $settings->pwa_badge_name = '';
    expect($settings->pwaBadgeName())->toBe('Default Zomboid Server');
});

it('returns custom pwaBadgeName when set', function () {
    $settings = SiteSetting::factory()->create([
        'site_name' => 'Full Long Zomboid Server Name',
        'pwa_badge_name' => 'PZ Admin',
    ]);

    expect($settings->pwaBadgeName())->toBe('PZ Admin');
});

it('resolves pwaIconUrl with priority order logo -> favicon -> apple-touch-icon fallback', function () {
    $settings = SiteSetting::factory()->create([
        'logo_path' => null,
        'favicon_path' => null,
    ]);

    expect($settings->pwaIconUrl())->toBe('/apple-touch-icon.png');

    $settings->favicon_path = 'site/favicon.png';
    expect($settings->pwaIconUrl())->toBe('/storage/site/favicon.png');

    $settings->logo_path = 'site/logo.png';
    expect($settings->pwaIconUrl())->toBe('/storage/site/logo.png');
});
