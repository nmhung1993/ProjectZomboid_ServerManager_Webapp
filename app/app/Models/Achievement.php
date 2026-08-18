<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Achievement extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'title',
        'description',
        'category',
        'icon',
        'metric_type',
        'target_value',
        'reward_coins',
        'reward_title',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_value' => 'integer',
            'reward_coins' => 'float',
        ];
    }

    public function playerAchievements(): HasMany
    {
        return $this->hasMany(PlayerAchievement::class, 'achievement_id');
    }
}
