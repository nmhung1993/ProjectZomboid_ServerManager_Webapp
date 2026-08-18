<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketBid extends Model
{
    use HasFactory;

    protected $fillable = [
        'listing_id',
        'bidder_id',
        'amount',
        'is_winning',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'is_winning' => 'boolean',
        ];
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(MarketListing::class, 'listing_id');
    }

    public function bidder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'bidder_id');
    }
}
