<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketListing extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'item_id',
        'item_name',
        'category',
        'quantity',
        'listing_type',
        'price',
        'starting_bid',
        'current_bid',
        'highest_bidder_id',
        'buyout_price',
        'bid_count',
        'status',
        'expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'price' => 'float',
            'starting_bid' => 'float',
            'current_bid' => 'float',
            'buyout_price' => 'float',
            'bid_count' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function highestBidder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'highest_bidder_id');
    }

    public function bids(): HasMany
    {
        return $this->hasMany(MarketBid::class, 'listing_id');
    }
}
