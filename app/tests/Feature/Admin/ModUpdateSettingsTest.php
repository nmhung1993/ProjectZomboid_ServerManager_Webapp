<?php

use App\Models\ModUpdateSetting;
use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->admin()->create());
});

it('updates mod update settings via PATCH endpoint', function () {
    $setting = ModUpdateSetting::instance();

    $response = $this->patchJson(route('admin.mods.update-settings'), [
        'enabled' => true,
        'check_interval_minutes' => 30,
        'notify_discord' => false,
        'auto_restart' => true,
        'restart_delay_minutes' => 10,
        'skip_if_scheduled_within_minutes' => 45,
    ]);

    $response->assertOk()
        ->assertJson([
            'message' => 'Mod update settings saved successfully',
            'settings' => [
                'check_interval_minutes' => 30,
                'notify_discord' => false,
                'restart_delay_minutes' => 10,
                'skip_if_scheduled_within_minutes' => 45,
            ],
        ]);

    expect($setting->fresh()->check_interval_minutes)->toBe(30)
        ->and($setting->fresh()->notify_discord)->toBeFalse()
        ->and($setting->fresh()->restart_delay_minutes)->toBe(10)
        ->and($setting->fresh()->skip_if_scheduled_within_minutes)->toBe(45);
});

it('triggers manual mod update check via POST endpoint', function () {
    $response = $this->postJson(route('admin.mods.check-updates'));

    $response->assertOk()
        ->assertJsonStructure([
            'message',
            'output',
            'settings',
        ]);
});
