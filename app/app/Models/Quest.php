<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quest extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'type', // daily, weekly, achievement, custom
        'category', // zombie_kills, survival_hours, pvp_kills, custom
        'target_count',
        'target_item',
        'reward_coins',
        'reward_items',
        'is_active',
        'starts_at',
        'expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_count' => 'integer',
            'reward_coins' => 'float',
            'reward_items' => 'array',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function playerQuests(): HasMany
    {
        return $this->hasMany(PlayerQuest::class);
    }
}
