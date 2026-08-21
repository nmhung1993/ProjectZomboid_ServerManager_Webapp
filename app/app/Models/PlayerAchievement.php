<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerAchievement extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'achievement_id',
        'progress',
        'is_completed',
        'is_reward_claimed',
        'completed_at',
        'claimed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'progress' => 'integer',
            'is_completed' => 'boolean',
            'is_reward_claimed' => 'boolean',
            'completed_at' => 'datetime',
            'claimed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function achievement(): BelongsTo
    {
        return $this->belongsTo(Achievement::class, 'achievement_id');
    }
}
