<?php

use App\Models\CleanerLog;
use App\Services\CleanerManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->commandsFile = sys_get_temp_dir() . '/test_clean_cmds_' . uniqid() . '.json';
    $this->resultsFile = sys_get_temp_dir() . '/test_clean_res_' . uniqid() . '.json';
    $this->manager = new CleanerManager($this->commandsFile, $this->resultsFile);
});

afterEach(function () {
    @unlink($this->commandsFile);
    @unlink($this->resultsFile);
});

it('enqueues dead bodies cleaner command and creates log', function () {
    $log = $this->manager->triggerCleanDeadBodies(triggeredBy: 'admin_manual');

    expect($log)->toBeInstanceOf(CleanerLog::class)
        ->and($log->clean_type)->toBe('dead_bodies')
        ->and($log->triggered_by)->toBe('admin_manual');

    $cmds = json_decode(file_get_contents($this->commandsFile), true);
    expect($cmds['actions'])->toHaveCount(1)
        ->and($cmds['actions'][0]['action'])->toBe('clean_dead_bodies');
});

it('enqueues ground items cleaner command with custom blacklist', function () {
    $blacklist = ['Base.RippedSheets', 'Base.Twigs'];
    $log = $this->manager->triggerCleanGroundItems(triggeredBy: 'scheduler', blacklist: $blacklist);

    expect($log->clean_type)->toBe('ground_items');

    $cmds = json_decode(file_get_contents($this->commandsFile), true);
    expect($cmds['actions'][0]['blacklist'])->toBe($blacklist);
});

it('syncs cleaner results from results JSON file', function () {
    $log = CleanerLog::create([
        'clean_type' => 'dead_bodies',
        'items_removed' => 0,
        'triggered_by' => 'admin_manual',
    ]);

    $resultsData = [
        'timestamp' => time(),
        'actions_completed' => [
            [
                'action' => 'dead_bodies',
                'items_removed' => 45,
            ],
        ],
    ];

    file_put_contents($this->resultsFile, json_encode($resultsData));

    $updated = $this->manager->syncCleanerResults();

    expect($updated)->toBe(1);

    $log->refresh();
    expect($log->items_removed)->toBe(45)
        ->and($log->details['status'])->toBe('completed');
});
