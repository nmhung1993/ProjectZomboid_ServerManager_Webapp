<?php

use App\Models\Bounty;
use App\Models\PlayerQuest;
use App\Models\PlayerStat;
use App\Models\Quest;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('renders quests portal and claims reward', function () {
    $quest = Quest::factory()->create([
        'category' => 'zombie_kills',
        'target_count' => 10,
        'reward_coins' => 150,
        'is_active' => true,
    ]);

    PlayerStat::create([
        'username' => $this->user->username,
        'zombie_kills' => 20,
    ]);

    $this->withoutExceptionHandling();
    $response = $this->actingAs($this->user)
        ->get(route('portal.quests.index'));

    $response->assertOk();

    // Claim reward
    $claimResponse = $this->actingAs($this->user)
        ->post(route('portal.quests.claim', $quest));

    $claimResponse->assertRedirect();
    expect((float) Wallet::where('user_id', $this->user->id)->first()->balance)->toBe(150.0);
});

it('places a bounty via portal', function () {
    Wallet::create(['user_id' => $this->user->id, 'balance' => 800]);

    $response = $this->actingAs($this->user)
        ->post(route('portal.quests.bounties.store'), [
            'target_username' => 'wanted_player_99',
            'reward_amount' => 300,
            'reason' => 'Killed me near gas station',
        ]);

    $response->assertRedirect();

    $bounty = Bounty::where('target_username', 'wanted_player_99')->first();
    expect($bounty)->not->toBeNull()
        ->and((float) $bounty->reward_amount)->toBe(300.0)
        ->and((float) Wallet::where('user_id', $this->user->id)->first()->balance)->toBe(500.0);
});
