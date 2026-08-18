<?php

use App\Models\Bounty;
use App\Models\User;
use App\Models\Wallet;
use App\Services\BountyManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->manager = new BountyManager();
});

it('creates a bounty and deducts creator wallet', function () {
    $creator = User::factory()->create();
    $target = User::factory()->create();

    Wallet::create(['user_id' => $creator->id, 'balance' => 500]);

    $bounty = $this->manager->createBounty(
        creator: $creator,
        targetUsername: $target->username,
        amount: 200,
        reason: 'Raided base'
    );

    expect($bounty->target_username)->toBe($target->username)
        ->and($bounty->reward_amount)->toBe(200.0)
        ->and($bounty->status)->toBe('active');

    $creatorWallet = Wallet::where('user_id', $creator->id)->first();
    expect((float) $creatorWallet->balance)->toBe(300.0);
});

it('processes pvp kill and rewards the hunter', function () {
    $creator = User::factory()->create();
    $target = User::factory()->create();
    $hunter = User::factory()->create();

    Wallet::create(['user_id' => $creator->id, 'balance' => 1000]);
    $bounty = $this->manager->createBounty($creator, $target->username, 400);

    $claimedCount = $this->manager->processPvpKill($hunter->username, $target->username);

    expect($claimedCount)->toBe(1);

    $bounty->refresh();
    expect($bounty->status)->toBe('claimed')
        ->and($bounty->hunter_username)->toBe($hunter->username);

    $hunterWallet = Wallet::where('user_id', $hunter->id)->first();
    expect((float) $hunterWallet->balance)->toBe(400.0);
});

it('cancels active bounty and refunds creator wallet', function () {
    $creator = User::factory()->create();
    Wallet::create(['user_id' => $creator->id, 'balance' => 600]);

    $bounty = $this->manager->createBounty($creator, 'some_bandit', 300);

    expect((float) Wallet::where('user_id', $creator->id)->first()->balance)->toBe(300.0);

    $cancelled = $this->manager->cancelBounty($bounty->id, $creator);

    expect($cancelled)->toBeTrue()
        ->and($bounty->fresh()->status)->toBe('cancelled')
        ->and((float) Wallet::where('user_id', $creator->id)->first()->balance)->toBe(600.0);
});
