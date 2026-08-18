<?php

use App\Jobs\RestartGameServer;
use App\Models\AutoRestartSetting;
use App\Models\ModUpdateSetting;
use App\Models\ScheduledRestartTime;
use App\Services\DockerManager;
use App\Services\ModManager;
use App\Services\SteamWorkshopClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    Cache::flush();
    Queue::fake();

    ModUpdateSetting::query()->delete();
    AutoRestartSetting::query()->delete();
    ScheduledRestartTime::query()->delete();

    $this->docker = Mockery::mock(DockerManager::class);
    $this->docker->shouldReceive('getContainerStatus')->andReturn([
        'exists' => true,
        'running' => true,
        'status' => 'running',
    ])->byDefault();
    $this->app->instance(DockerManager::class, $this->docker);

    $this->modManager = Mockery::mock(ModManager::class);
    $this->modManager->shouldReceive('list')->andReturn([
        ['mod_id' => 'SWTServerAddon', 'workshop_id' => '3785748904'],
    ])->byDefault();
    $this->modManager->shouldReceive('getInstalledWorkshopTimestamps')->andReturn([
        '3785748904' => 1787060000,
    ])->byDefault();
    $this->app->instance(ModManager::class, $this->modManager);

    $this->steam = Mockery::mock(SteamWorkshopClient::class);
    $this->steam->shouldReceive('getBulkDetails')->andReturn([
        '3785748904' => [
            'workshop_id' => '3785748904',
            'title' => 'SWTServerAddon',
            'time_updated' => 1787069192,
        ],
    ])->byDefault();
    $this->app->instance(SteamWorkshopClient::class, $this->steam);
});

it('skips checking when mod update checker is disabled', function () {
    ModUpdateSetting::factory()->disabled()->create();

    $this->artisan('zomboid:check-mod-updates')
        ->expectsOutput('Mod update checking is disabled.')
        ->assertSuccessful();

    Queue::assertNothingPushed();
});

it('skips checking when game server is offline', function () {
    ModUpdateSetting::factory()->create();

    $this->docker->shouldReceive('getContainerStatus')->andReturn(['running' => false]);

    $this->artisan('zomboid:check-mod-updates')
        ->expectsOutput('Game server is offline, skipping mod update check.')
        ->assertSuccessful();

    Queue::assertNothingPushed();
});

it('reports all mods up to date when server installed version matches steam', function () {
    ModUpdateSetting::factory()->create();

    $this->modManager->shouldReceive('getInstalledWorkshopTimestamps')->andReturn([
        '3785748904' => 1787069192,
    ]);

    $this->artisan('zomboid:check-mod-updates')
        ->expectsOutput('All mods are up to date with the game server installed versions.')
        ->assertSuccessful();

    Queue::assertNothingPushed();
});

it('detects mod update comparing against server docker installed timestamps and schedules restart', function () {
    $setting = ModUpdateSetting::factory()->create([
        'restart_delay_minutes' => 5,
        'auto_restart' => true,
    ]);

    $this->artisan('zomboid:check-mod-updates')
        ->expectsOutput('Detected updates for 1 mod(s): SWTServerAddon')
        ->expectsOutput('Scheduled server restart in 5 minute(s).')
        ->assertSuccessful();

    Queue::assertPushed(RestartGameServer::class);
});

it('skips restart when scheduled auto-restart is within 30 minutes', function () {
    ModUpdateSetting::factory()->create([
        'restart_delay_minutes' => 5,
        'skip_if_scheduled_within_minutes' => 30,
        'auto_restart' => true,
    ]);

    // Setup upcoming scheduled restart in 15 minutes
    $autoRestart = AutoRestartSetting::factory()->enabled()->create(['timezone' => 'UTC']);
    $upcomingTime = now('UTC')->addMinutes(15)->format('H:i');
    ScheduledRestartTime::factory()->create([
        'time' => $upcomingTime,
        'enabled' => true,
    ]);

    $this->artisan('zomboid:check-mod-updates')
        ->expectsOutput('Detected updates for 1 mod(s): SWTServerAddon')
        ->assertSuccessful();

    // Restart should NOT be dispatched because scheduled restart is within 30 mins
    Queue::assertNotPushed(RestartGameServer::class);
});
