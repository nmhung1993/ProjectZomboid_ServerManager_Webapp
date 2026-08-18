<?php

use App\Models\Achievement;
use App\Models\PlayerAchievement;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AchievementManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->manager = new AchievementManager();
    $this->user = User::factory()->create(['username' => 'test_player_' . uniqid()]);
});

it('syncs player achievements and marks completed when target is met', function () {
    $ach = Achievement::create([
        'slug' => 'test_zombie_10',
        'title' => 'Tập Sự Diệt Quái',
        'description' => 'Diệt 10 zombie',
        'category' => 'combat',
        'icon' => 'Crosshair',
        'metric_type' => 'zombie_kills',
        'target_value' => 10,
        'reward_coins' => 50,
        'reward_title' => '[Diệt Quái]',
    ]);

    \App\Models\PlayerStat::create([
        'username' => $this->user->username,
        'zombie_kills' => 15,
        'hours_survived' => 10,
    ]);

    $this->manager->syncPlayerAchievements($this->user);

    $pa = PlayerAchievement::where('user_id', $this->user->id)
        ->where('achievement_id', $ach->id)
        ->first();

    expect($pa)->not->toBeNull()
        ->and($pa->is_completed)->toBeTrue()
        ->and($pa->progress)->toBe(10);
});

it('claims reward and deposits coins to wallet', function () {
    $ach = Achievement::create([
        'slug' => 'test_claim_ach',
        'title' => 'Thử Thách',
        'description' => 'Test',
        'category' => 'combat',
        'icon' => 'Crosshair',
        'metric_type' => 'zombie_kills',
        'target_value' => 5,
        'reward_coins' => 100,
        'reward_title' => '[Cao Thủ]',
    ]);

    $pa = PlayerAchievement::create([
        'user_id' => $this->user->id,
        'achievement_id' => $ach->id,
        'progress' => 5,
        'is_completed' => true,
        'is_reward_claimed' => false,
    ]);

    $this->manager->claimReward($this->user, $ach->id);

    expect($pa->fresh()->is_reward_claimed)->toBeTrue();
    $wallet = Wallet::where('user_id', $this->user->id)->first();
    expect((float) $wallet->balance)->toBe(100.0);
});

it('allows equipping only unlocked titles', function () {
    $ach = Achievement::create([
        'slug' => 'test_title_ach',
        'title' => 'Thợ Săn Rồng',
        'description' => 'Test',
        'category' => 'combat',
        'icon' => 'Crosshair',
        'metric_type' => 'zombie_kills',
        'target_value' => 5,
        'reward_coins' => 50,
        'reward_title' => '[Thợ Săn Rồng]',
    ]);

    PlayerAchievement::create([
        'user_id' => $this->user->id,
        'achievement_id' => $ach->id,
        'progress' => 5,
        'is_completed' => true,
        'is_reward_claimed' => false,
    ]);

    $this->manager->equipTitle($this->user, '[Thợ Săn Rồng]');
    expect($this->user->fresh()->active_title)->toBe('[Thợ Săn Rồng]');

    // Unequip
    $this->manager->equipTitle($this->user, null);
    expect($this->user->fresh()->active_title)->toBeNull();
});
