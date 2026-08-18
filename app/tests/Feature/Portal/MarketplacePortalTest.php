<?php

use App\Models\MarketListing;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('renders marketplace portal index', function () {
    MarketListing::factory()->create([
        'item_name' => 'Sledgehammer',
        'item_id' => 'Base.Sledgehammer',
        'listing_type' => 'fixed_price',
        'price' => 300,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('portal.market.index'));

    $response->assertOk();
});

it('creates fixed price listing via portal', function () {
    $response = $this->actingAs($this->user)
        ->post(route('portal.market.store'), [
            'listing_type' => 'fixed_price',
            'item_id' => 'Base.Crowbar',
            'item_name' => 'Xà beng',
            'category' => 'tools',
            'quantity' => 1,
            'price' => 120,
            'duration_hours' => 24,
        ]);

    $response->assertRedirect();

    $listing = MarketListing::where('item_id', 'Base.Crowbar')->first();
    expect($listing)->not->toBeNull()
        ->and($listing->seller_id)->toBe($this->user->id)
        ->and((float) $listing->price)->toBe(120.0);
});

it('buys fixed item via portal', function () {
    $seller = User::factory()->create([
        'username' => 'seller_' . uniqid(),
        'email' => 'seller_' . uniqid() . '@example.com',
    ]);
    $listing = MarketListing::factory()->create([
        'seller_id' => $seller->id,
        'price' => 100,
        'status' => 'active',
        'listing_type' => 'fixed_price',
    ]);

    Wallet::create(['user_id' => $this->user->id, 'balance' => 250]);

    $response = $this->actingAs($this->user)
        ->post(route('portal.market.buy', $listing));

    $response->assertRedirect();

    expect((float) Wallet::where('user_id', $this->user->id)->first()->balance)->toBe(150.0)
        ->and($listing->fresh()->status)->toBe('sold');
});
