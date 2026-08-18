<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bounty extends Model
{
    use HasFactory;

    protected $fillable = [
        'target_username',
        'target_user_id',
        'creator_id',
        'reward_amount',
        'reason',
        'status', // active, claimed, cancelled, expired
        'hunter_username',
        'hunter_user_id',
        'claimed_at',
        'expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reward_amount' => 'float',
            'claimed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function hunterUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hunter_user_id');
    }
}
