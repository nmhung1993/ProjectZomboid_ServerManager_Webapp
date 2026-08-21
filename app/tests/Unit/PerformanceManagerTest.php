<?php

use App\Models\ServerPerformanceLog;
use App\Services\JsonFile;
use App\Services\PerformanceManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->perfFile = sys_get_temp_dir() . '/test_perf_' . uniqid() . '.json';
    $this->manager = new PerformanceManager($this->perfFile);
});

afterEach(function () {
    @unlink($this->perfFile);
});

it('syncs performance metrics snapshot from JSON', function () {
    JsonFile::writeAtomic($this->perfFile, [
        'tps' => 59.8,
        'tick_time_ms' => 16.7,
        'loaded_squares' => 450,
        'active_zombies' => 320,
        'dead_bodies' => 85,
        'online_players' => 8,
        'memory_used_mb' => 2400.0,
        'memory_max_mb' => 8192.0,
    ]);

    $log = $this->manager->syncPerformanceSnapshot();

    expect($log)->not->toBeNull()
        ->and($log->tps)->toBe(59.8)
        ->and($log->active_zombies)->toBe(320)
        ->and($log->online_players)->toBe(8);
});

it('calculates health score rating and memory usage percent', function () {
    ServerPerformanceLog::create([
        'tps' => 58.5,
        'tick_time_ms' => 17.1,
        'loaded_squares' => 500,
        'active_zombies' => 400,
        'dead_bodies' => 120,
        'online_players' => 6,
        'memory_used_mb' => 3000.0,
        'memory_max_mb' => 8000.0,
        'recorded_at' => now(),
    ]);

    $summary = $this->manager->getHealthSummary();

    expect($summary['status'])->toBe('excellent')
        ->and($summary['score'])->toBeGreaterThanOrEqual(90)
        ->and($summary['latest']['memory_percent'])->toBe(37.5);
});
