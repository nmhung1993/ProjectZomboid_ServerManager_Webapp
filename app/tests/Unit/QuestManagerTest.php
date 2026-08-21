<?php

use App\Models\PlayerQuest;
use App\Models\PlayerStat;
use App\Models\Quest;
use App\Models\User;
use App\Models\Wallet;
use App\Services\QuestManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->manager = new QuestManager();
});

it('syncs active quests and updates progress from player stats', function () {
    $user = User::factory()->create();

    $quest = Quest::factory()->create([
        'title' => 'Zombie Exterminator',
        'category' => 'zombie_kills',
        'target_count' => 50,
        'reward_coins' => 200,
        'is_active' => true,
    ]);

    PlayerStat::create([
        'username' => $user->username,
        'zombie_kills' => 60,
        'hours_survived' => 10,
    ]);

    $quests = $this->manager->syncAndGetPlayerQuests($user);

    expect($quests)->toHaveCount(1)
        ->and($quests[0]['is_completed'])->toBeTrue()
        ->and($quests[0]['current_progress'])->toBe(50)
        ->and($quests[0]['reward_claimed'])->toBeFalse();
});

it('claims completed quest reward into user wallet', function () {
    $user = User::factory()->create();

    $quest = Quest::factory()->create([
        'title' => 'Rosewood Scout',
        'category' => 'survival_hours',
        'target_count' => 24,
        'reward_coins' => 300,
        'is_active' => true,
    ]);

    PlayerStat::create([
        'username' => $user->username,
        'hours_survived' => 48,
    ]);

    $this->manager->syncAndGetPlayerQuests($user);

    $claimed = $this->manager->claimReward($user, $quest->id);

    expect($claimed)->toBeTrue();

    $wallet = Wallet::where('user_id', $user->id)->first();
    expect((float) $wallet->balance)->toBe(300.0);

    $pq = PlayerQuest::where('user_id', $user->id)->where('quest_id', $quest->id)->first();
    expect($pq->reward_claimed)->toBeTrue();
});
