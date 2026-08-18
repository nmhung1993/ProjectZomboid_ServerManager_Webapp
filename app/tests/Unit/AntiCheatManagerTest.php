<?php

use App\Models\AntiCheatViolation;
use App\Models\GameEvent;
use App\Services\AntiCheatManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->tempDir = sys_get_temp_dir().'/pz_anticheat_test_'.uniqid();
    mkdir($this->tempDir, 0777, true);
    $this->violationsPath = $this->tempDir.'/anticheat_violations.json';
    $this->manager = new AntiCheatManager($this->violationsPath);
});

afterEach(function () {
    if (file_exists($this->violationsPath)) {
        @unlink($this->violationsPath);
    }
    if (is_dir($this->tempDir)) {
        @rmdir($this->tempDir);
    }
});

it('imports anticheat violations from json and creates game events', function () {
    $now = time();
    $data = [
        'violations' => [
            [
                'username' => 'cheater123',
                'access_level' => 'none',
                'cheats' => ['godmode', 'noclip'],
                'cheat_string' => 'godmode, noclip',
                'x' => 10500,
                'y' => 9800,
                'z' => 0,
                'occurred_at' => $now,
            ],
        ],
    ];

    file_put_contents($this->violationsPath, json_encode($data));

    $count = $this->manager->importViolations();

    expect($count)->toBe(1);
    expect(AntiCheatViolation::count())->toBe(1);

    $violation = AntiCheatViolation::first();
    expect($violation->username)->toBe('cheater123')
        ->and($violation->cheats)->toBe(['godmode', 'noclip'])
        ->and($violation->status)->toBe('flagged')
        ->and($violation->x)->toBe(10500);

    // Verify GameEvent was created
    expect(GameEvent::where('event_type', 'anticheat_violation')->count())->toBe(1);
    $event = GameEvent::where('event_type', 'anticheat_violation')->first();
    expect($event->player)->toBe('cheater123')
        ->and($event->x)->toBe(10500)
        ->and($event->details['cheats'])->toBe(['godmode', 'noclip']);

    // File should be cleared after import
    $remaining = json_decode(file_get_contents($this->violationsPath), true);
    expect($remaining['violations'])->toBe([]);
});

it('resolves an anticheat violation', function () {
    $violation = AntiCheatViolation::factory()->create(['status' => 'flagged']);

    $resolved = $this->manager->resolveViolation(
        id: $violation->id,
        status: 'punished',
        note: 'Player banned for 7 days',
        resolvedBy: 'superadmin',
    );

    expect($resolved)->not->toBeNull()
        ->and($resolved->status)->toBe('punished')
        ->and($resolved->resolved_by)->toBe('superadmin')
        ->and($resolved->resolution_note)->toBe('Player banned for 7 days');
});
