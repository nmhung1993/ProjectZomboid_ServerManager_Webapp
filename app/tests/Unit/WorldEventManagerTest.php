<?php

use App\Models\User;
use App\Models\Wallet;
use App\Models\WorldEvent;
use App\Services\JsonFile;
use App\Services\WorldEventManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->eventsFile = sys_get_temp_dir() . '/test_events_' . uniqid() . '.json';
    $this->resultsFile = sys_get_temp_dir() . '/test_results_' . uniqid() . '.json';
    $this->manager = new WorldEventManager($this->eventsFile, $this->resultsFile);
});

afterEach(function () {
    @unlink($this->eventsFile);
    @unlink($this->resultsFile);
});

it('spawns a random airdrop and syncs to JSON bridge', function () {
    $event = $this->manager->spawnRandomAirdrop(durationHours: 2);

    expect($event->event_type)->toBe('airdrop')
        ->and($event->status)->toBe('active')
        ->and($event->reward_coins)->toBe(250.0)
        ->and(count($event->loot_items))->toBeGreaterThan(0);

    $jsonData = JsonFile::read($this->eventsFile, []);
    expect($jsonData)->not->toBeNull()
        ->and(count($jsonData['events']))->toBe(1)
        ->and($jsonData['events'][0]['id'])->toBe($event->id);
});

it('spawns a helicopter crash site with military loot', function () {
    $event = $this->manager->spawnHeliCrash(durationHours: 3);

    expect($event->event_type)->toBe('heli_crash')
        ->and($event->status)->toBe('active')
        ->and($event->reward_coins)->toBe(500.0);
});

it('marks event as looted and awards player wallet coins', function () {
    $user = User::factory()->create(['username' => 'survivor_bob']);
    $event = $this->manager->spawnRandomAirdrop();

    $success = $this->manager->markEventLooted($event->id, 'survivor_bob');

    expect($success)->toBeTrue()
        ->and($event->fresh()->status)->toBe('looted')
        ->and($event->fresh()->looted_by_username)->toBe('survivor_bob')
        ->and($event->fresh()->looted_by_user_id)->toBe($user->id);

    $wallet = Wallet::where('user_id', $user->id)->first();
    expect((float) $wallet->balance)->toBe(250.0);
});

it('processes expired world events', function () {
    $event = $this->manager->spawnRandomAirdrop();
    $event->update(['expires_at' => now()->subMinutes(5)]);

    $expiredCount = $this->manager->processExpiredEvents();

    expect($expiredCount)->toBe(1)
        ->and($event->fresh()->status)->toBe('expired');
});

it('syncs looted events from results JSON bridge', function () {
    $user = User::factory()->create(['username' => 'alice_hero']);
    $event = $this->manager->spawnRandomAirdrop();

    JsonFile::writeAtomic($this->resultsFile, [
        'looted_events' => [
            ['id' => $event->id, 'looted_by' => 'alice_hero'],
        ],
    ]);

    $processed = $this->manager->syncResultsFromBridge();

    expect($processed)->toBe(1)
        ->and($event->fresh()->status)->toBe('looted');

    $wallet = Wallet::where('user_id', $user->id)->first();
    expect((float) $wallet->balance)->toBe(250.0);
});
