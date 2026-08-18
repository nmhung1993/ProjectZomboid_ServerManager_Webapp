<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerQuest extends Model
{
    use HasFactory;

    protected $fillable = [
        'quest_id',
        'user_id',
        'username',
        'current_progress',
        'is_completed',
        'completed_at',
        'reward_claimed',
        'claimed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'current_progress' => 'integer',
            'is_completed' => 'boolean',
            'completed_at' => 'datetime',
            'reward_claimed' => 'boolean',
            'claimed_at' => 'datetime',
        ];
    }

    public function quest(): BelongsTo
    {
        return $this->belongsTo(Quest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
