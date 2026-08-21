<?php

use App\Models\MarketDelivery;
use App\Models\MarketListing;
use App\Models\User;
use App\Models\Wallet;
use App\Services\MarketplaceManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->deliveriesFile = sys_get_temp_dir() . '/test_deliv_' . uniqid() . '.json';
    $this->manager = new MarketplaceManager($this->deliveriesFile);
});

afterEach(function () {
    @unlink($this->deliveriesFile);
});

it('creates fixed price listing and allows another player to buy it', function () {
    $seller = User::factory()->create();
    $buyer = User::factory()->create();

    Wallet::create(['user_id' => $buyer->id, 'balance' => 300]);
    Wallet::create(['user_id' => $seller->id, 'balance' => 0]);

    $listing = $this->manager->createFixedListing(
        seller: $seller,
        itemId: 'Base.Katana',
        itemName: 'Katana Nhật',
        category: 'weapons',
        quantity: 1,
        price: 200
    );

    expect($listing->status)->toBe('active')
        ->and($listing->price)->toBe(200.0);

    $delivery = $this->manager->buyFixedListing($buyer, $listing->id);

    expect($delivery)->toBeInstanceOf(MarketDelivery::class)
        ->and($delivery->user_id)->toBe($buyer->id)
        ->and($delivery->item_id)->toBe('Base.Katana')
        ->and($delivery->status)->toBe('pending');

    $buyerWallet = Wallet::where('user_id', $buyer->id)->first();
    expect((float) $buyerWallet->balance)->toBe(100.0);

    $sellerWallet = Wallet::where('user_id', $seller->id)->first();
    // 200 * 0.95 = 190
    expect((float) $sellerWallet->balance)->toBe(190.0);

    expect($listing->fresh()->status)->toBe('sold');
});

it('handles auction bidding and refunds outbid players', function () {
    $seller = User::factory()->create();
    $bidder1 = User::factory()->create();
    $bidder2 = User::factory()->create();

    Wallet::create(['user_id' => $bidder1->id, 'balance' => 500]);
    Wallet::create(['user_id' => $bidder2->id, 'balance' => 500]);

    $auction = $this->manager->createAuctionListing(
        seller: $seller,
        itemId: 'Base.Shotgun',
        itemName: 'JS-2000 Shotgun',
        category: 'weapons',
        quantity: 1,
        startingBid: 100,
        buyoutPrice: 1000
    );

    // Bidder 1 bids 120
    $this->manager->placeBid($bidder1, $auction->id, 120);

    expect((float) Wallet::where('user_id', $bidder1->id)->first()->balance)->toBe(380.0)
        ->and((float) $auction->fresh()->current_bid)->toBe(120.0)
        ->and($auction->fresh()->highest_bidder_id)->toBe($bidder1->id);

    // Bidder 2 outbids with 150 -> Bidder 1 must get refunded 120
    $this->manager->placeBid($bidder2, $auction->id, 150);

    expect((float) Wallet::where('user_id', $bidder1->id)->first()->balance)->toBe(500.0) // Refunded!
        ->and((float) Wallet::where('user_id', $bidder2->id)->first()->balance)->toBe(350.0)
        ->and((float) $auction->fresh()->current_bid)->toBe(150.0)
        ->and($auction->fresh()->highest_bidder_id)->toBe($bidder2->id);
});

it('triggers buyout when bid meets or exceeds buyout price', function () {
    $seller = User::factory()->create();
    $buyer = User::factory()->create();

    Wallet::create(['user_id' => $buyer->id, 'balance' => 800]);

    $auction = $this->manager->createAuctionListing(
        seller: $seller,
        itemId: 'Base.M16',
        itemName: 'M16 Assault Rifle',
        category: 'weapons',
        quantity: 1,
        startingBid: 200,
        buyoutPrice: 600
    );

    $res = $this->manager->placeBid($buyer, $auction->id, 600);

    expect($res)->toBeInstanceOf(MarketDelivery::class)
        ->and($auction->fresh()->status)->toBe('sold')
        ->and((float) Wallet::where('user_id', $buyer->id)->first()->balance)->toBe(200.0);
});

it('processes expired auctions and awards the highest bidder', function () {
    $seller = User::factory()->create();
    $winner = User::factory()->create();

    Wallet::create(['user_id' => $winner->id, 'balance' => 400]);

    $auction = $this->manager->createAuctionListing(
        seller: $seller,
        itemId: 'Base.MilitaryBackpack',
        itemName: 'Large Backpack',
        category: 'misc',
        quantity: 1,
        startingBid: 100
    );

    $this->manager->placeBid($winner, $auction->id, 150);

    // Fast-forward expiration
    $auction->update(['expires_at' => now()->subMinutes(10)]);

    $processed = $this->manager->processExpiredAuctions();

    expect($processed)->toBe(1)
        ->and($auction->fresh()->status)->toBe('sold');

    $delivery = MarketDelivery::where('user_id', $winner->id)->first();
    expect($delivery)->not->toBeNull()
        ->and($delivery->item_id)->toBe('Base.MilitaryBackpack');

    // Seller gets 150 * 0.95 = 142.5
    expect((float) Wallet::where('user_id', $seller->id)->first()->balance)->toBe(142.5);
});
