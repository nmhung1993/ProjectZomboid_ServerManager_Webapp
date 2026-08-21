<?php

use App\Models\Achievement;
use App\Models\PlayerAchievement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['username' => 'portal_user_' . uniqid(), 'email' => 'portal_' . uniqid() . '@example.com']);
});

it('renders achievements portal index', function () {
    Achievement::create([
        'slug' => 'test_ach_portal',
        'title' => 'Khởi Đầu Mới',
        'description' => 'Mô tả',
        'category' => 'survival',
        'icon' => 'Clock',
        'metric_type' => 'survived_hours',
        'target_value' => 24,
        'reward_coins' => 50,
        'reward_title' => '[Tân Binh]',
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('portal.achievements.index'));

    $response->assertOk();
});

it('claims reward via portal', function () {
    $ach = Achievement::create([
        'slug' => 'test_claim_portal',
        'title' => 'Nhiệm Vụ Test',
        'description' => 'Mô tả',
        'category' => 'survival',
        'icon' => 'Clock',
        'metric_type' => 'survived_hours',
        'target_value' => 1,
        'reward_coins' => 75,
        'reward_title' => '[Chiến Thần]',
    ]);

    PlayerAchievement::create([
        'user_id' => $this->user->id,
        'achievement_id' => $ach->id,
        'progress' => 1,
        'is_completed' => true,
        'is_reward_claimed' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('portal.achievements.claim', $ach));

    $response->assertRedirect();
});
