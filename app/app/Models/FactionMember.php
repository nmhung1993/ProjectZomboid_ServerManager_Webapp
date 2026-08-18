<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FactionMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'faction_id',
        'user_id',
        'username',
        'role',
        'contribution_points',
        'joined_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'contribution_points' => 'float',
            'joined_at' => 'datetime',
        ];
    }

    public function faction(): BelongsTo
    {
        return $this->belongsTo(Faction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
