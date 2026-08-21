<?php

use App\Models\DeathRecord;
use App\Models\User;
use App\Services\DeathHeatmapManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->manager = new DeathHeatmapManager();
});

it('records player death and applies higher weight for pvp', function () {
    $victim = User::factory()->create(['username' => 'victim_steve']);
    $killer = User::factory()->create(['username' => 'killer_alex']);

    $pveDeath = $this->manager->recordDeath(
        username: 'victim_steve',
        x: 10650,
        y: 9900,
        cause: 'zombie'
    );

    expect($pveDeath->weight)->toBe(1.0)
        ->and($pveDeath->user_id)->toBe($victim->id);

    $pvpDeath = $this->manager->recordDeath(
        username: 'victim_steve',
        x: 10700,
        y: 9950,
        cause: 'pvp',
        killerUsername: 'killer_alex'
    );

    expect($pvpDeath->weight)->toBe(2.0)
        ->and($pvpDeath->killer_user_id)->toBe($killer->id);
});

it('retrieves filtered heatmap points', function () {
    $this->manager->recordDeath(username: 'bob', x: 10600, y: 9800, cause: 'zombie');
    $this->manager->recordDeath(username: 'alice', x: 10620, y: 9820, cause: 'pvp', killerUsername: 'charlie');

    $allPoints = $this->manager->getHeatmapPoints(timeRange: 'all', type: 'all');
    expect(count($allPoints))->toBe(2);

    $pvpPoints = $this->manager->getHeatmapPoints(timeRange: 'all', type: 'pvp');
    expect(count($pvpPoints))->toBe(1)
        ->and($pvpPoints[0]['username'])->toBe('alice');
});

it('calculates danger hotspots correctly', function () {
    // 3 deaths in Muldraugh (x: ~10600, y: ~10000)
    $this->manager->recordDeath(username: 'p1', x: 10600, y: 10000);
    $this->manager->recordDeath(username: 'p2', x: 10650, y: 10050);
    $this->manager->recordDeath(username: 'p3', x: 10700, y: 10100);

    // 1 death in Rosewood (x: ~8100, y: ~11500)
    $this->manager->recordDeath(username: 'p4', x: 8100, y: 11500);

    $hotspots = $this->manager->getDangerHotspots(limit: 3);

    expect($hotspots[0]['name'])->toBe('Muldraugh')
        ->and($hotspots[0]['total_deaths'])->toBe(3);
});
