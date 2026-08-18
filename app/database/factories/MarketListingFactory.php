<?php

namespace Database\Factories;

use App\Models\MarketListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MarketListing>
 */
class MarketListingFactory extends Factory
{
    protected $model = MarketListing::class;

    public function definition(): array
    {
        return [
            'seller_id' => User::factory(),
            'item_id' => 'Base.Axe',
            'item_name' => 'Fire Axe',
            'category' => 'weapons',
            'quantity' => 1,
            'listing_type' => 'fixed_price',
            'price' => 150.0,
            'starting_bid' => null,
            'current_bid' => null,
            'highest_bidder_id' => null,
            'buyout_price' => null,
            'bid_count' => 0,
            'status' => 'active',
            'expires_at' => now()->addDays(2),
        ];
    }
}
