<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorldEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_type',
        'title',
        'description',
        'location_name',
        'x',
        'y',
        'z',
        'radius',
        'loot_items',
        'reward_coins',
        'status',
        'looted_by_username',
        'looted_by_user_id',
        'expires_at',
        'looted_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'x' => 'float',
            'y' => 'float',
            'z' => 'integer',
            'radius' => 'integer',
            'loot_items' => 'array',
            'reward_coins' => 'float',
            'expires_at' => 'datetime',
            'looted_at' => 'datetime',
        ];
    }

    public function lootedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'looted_by_user_id');
    }
}
