<?php

use App\Models\ServerPerformanceLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

it('renders performance monitor page for admin', function () {
    ServerPerformanceLog::create([
        'tps' => 60.0,
        'tick_time_ms' => 16.6,
        'loaded_squares' => 400,
        'active_zombies' => 250,
        'dead_bodies' => 50,
        'online_players' => 4,
        'memory_used_mb' => 2100.0,
        'memory_max_mb' => 8192.0,
        'recorded_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->get(route('admin.performance'));

    $response->assertOk();
});
