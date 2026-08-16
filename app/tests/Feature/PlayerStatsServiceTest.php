<?php

use App\Models\GameEvent;
use App\Models\PlayerStat;
use App\Models\User;
use App\Models\Wallet;
use App\Services\PlayerStatsService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->tempDir = sys_get_temp_dir().'/player_stats_test_'.uniqid();
    mkdir($this->tempDir, 0755, true);
    $this->filePath = $this->tempDir.'/player_stats.json';
});

afterEach(function () {
    if (file_exists($this->filePath)) {
        unlink($this->filePath);
    }
    if (is_dir($this->tempDir)) {
        rmdir($this->tempDir);
    }
});

test('sync returns 0 when file does not exist', function () {
    $service = new PlayerStatsService($this->filePath);

    expect($service->sync())->toBe(0);
});

test('sync returns 0 for empty players array', function () {
    file_put_contents($this->filePath, json_encode([
        'timestamp' => '2026-02-27T14:30:00',
        'player_count' => 0,
        'players' => [],
    ]));

    $service = new PlayerStatsService($this->filePath);

    expect($service->sync())->toBe(0);
});

test('resetRankings clears ranking data but keeps users and wallets', function () {
    file_put_contents($this->filePath, '{"players":[]}');
    $user = User::factory()->create();
    $wallet = Wallet::factory()->create([
        'user_id' => $user->id,
        'balance' => 100,
        'total_earned' => 150,
        'total_spent' => 50,
    ]);

    PlayerStat::query()->create([
        'username' => 'Alice',
        'zombie_kills' => 42,
        'hours_survived' => 10,
    ]);
    GameEvent::query()->create([
        'event_type' => 'death',
        'player' => 'Alice',
    ]);

    $service = new PlayerStatsService($this->filePath);
    $service->resetRankings();

    expect(PlayerStat::query()->count())->toBe(0)
        ->and(GameEvent::query()->count())->toBe(0)
        ->and(User::query()->whereKey($user->id)->exists())->toBeTrue()
        ->and(file_exists($this->filePath))->toBeFalse();

    $wallet = $wallet->fresh();
    expect($wallet)->not->toBeNull()
        ->and((float) $wallet->balance)->toBe(0.0)
        ->and((float) $wallet->total_earned)->toBe(0.0)
        ->and((float) $wallet->total_spent)->toBe(0.0);
});

test('sync creates new player stat records', function () {
    $data = [
        'timestamp' => '2026-02-27T14:30:00',
        'player_count' => 2,
        'players' => [
            [
                'username' => 'Alice',
                'zombie_kills' => 42,
                'hours_survived' => 15.5,
                'profession' => 'Lumberjack',
                'skills' => ['Axe' => 3, 'Carpentry' => 2],
                'is_dead' => false,
            ],
            [
                'username' => 'Bob',
                'zombie_kills' => 100,
                'hours_survived' => 30.2,
                'profession' => 'FireOfficer',
                'skills' => ['Axe' => 5],
                'is_dead' => false,
            ],
        ],
    ];

    file_put_contents($this->filePath, json_encode($data));

    $service = new PlayerStatsService($this->filePath);
    $count = $service->sync();

    expect($count)->toBe(2);
    expect(PlayerStat::count())->toBe(2);

    $alice = PlayerStat::find('Alice');
    expect($alice)->not->toBeNull()
        ->and($alice->zombie_kills)->toBe(42)
        ->and($alice->hours_survived)->toBe(15.5)
        ->and($alice->profession)->toBe('Lumberjack')
        ->and($alice->skills)->toBe(['Axe' => 3, 'Carpentry' => 2]);
});

test('sync updates existing player stat records', function () {
    PlayerStat::query()->create([
        'username' => 'Alice',
        'zombie_kills' => 10,
        'hours_survived' => 5.0,
        'profession' => 'Lumberjack',
    ]);

    $data = [
        'timestamp' => '2026-02-27T14:30:00',
        'player_count' => 1,
        'players' => [
            [
                'username' => 'Alice',
                'zombie_kills' => 50,
                'hours_survived' => 20.0,
                'profession' => 'Lumberjack',
                'skills' => ['Axe' => 5],
                'is_dead' => false,
            ],
        ],
    ];

    file_put_contents($this->filePath, json_encode($data));

    $service = new PlayerStatsService($this->filePath);
    $count = $service->sync();

    expect($count)->toBe(1);

    $alice = PlayerStat::find('Alice');
    expect($alice->zombie_kills)->toBe(50)
        ->and($alice->hours_survived)->toBe(20.0);
});

test('sync skips unknown username entries', function () {
    $data = [
        'timestamp' => '2026-02-27T14:30:00',
        'player_count' => 1,
        'players' => [
            [
                'username' => 'unknown',
                'zombie_kills' => 5,
                'hours_survived' => 1.0,
            ],
        ],
    ];

    file_put_contents($this->filePath, json_encode($data));

    $service = new PlayerStatsService($this->filePath);
    $count = $service->sync();

    expect($count)->toBe(0);
    expect(PlayerStat::count())->toBe(0);
});

test('sync returns 0 for malformed JSON', function () {
    file_put_contents($this->filePath, 'not valid json');

    $service = new PlayerStatsService($this->filePath);

    expect($service->sync())->toBe(0);
});

test('getLeaderboard returns top players by zombie kills', function () {
    PlayerStat::query()->create(['username' => 'Alice', 'zombie_kills' => 50, 'hours_survived' => 10]);
    PlayerStat::query()->create(['username' => 'Bob', 'zombie_kills' => 100, 'hours_survived' => 20]);
    PlayerStat::query()->create(['username' => 'Charlie', 'zombie_kills' => 75, 'hours_survived' => 15]);

    $service = new PlayerStatsService($this->filePath);
    $leaderboard = $service->getLeaderboard('zombie_kills', 2);

    expect($leaderboard)->toHaveCount(2)
        ->and($leaderboard[0]['username'])->toBe('Bob')
        ->and($leaderboard[1]['username'])->toBe('Charlie');
});

test('getLeaderboard returns top players by hours survived', function () {
    PlayerStat::query()->create(['username' => 'Alice', 'zombie_kills' => 50, 'hours_survived' => 30.5]);
    PlayerStat::query()->create(['username' => 'Bob', 'zombie_kills' => 100, 'hours_survived' => 20.0]);

    $service = new PlayerStatsService($this->filePath);
    $leaderboard = $service->getLeaderboard('hours_survived', 10);

    expect($leaderboard)->toHaveCount(2)
        ->and($leaderboard[0]['username'])->toBe('Alice');
});
