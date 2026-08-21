<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Faction extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'tag',
        'description',
        'icon',
        'color',
        'leader_id',
        'bank_balance',
        'max_members',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'bank_balance' => 'float',
            'max_members' => 'integer',
        ];
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'leader_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(FactionMember::class);
    }

    public function territories(): HasMany
    {
        return $this->hasMany(FactionTerritory::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(FactionInvitation::class);
    }

    public function hasMember(int $userId): bool
    {
        return $this->members()->where('user_id', $userId)->exists();
    }

    public function isLeader(int $userId): bool
    {
        return $this->leader_id === $userId;
    }

    public function isOfficer(int $userId): bool
    {
        return $this->members()
            ->where('user_id', $userId)
            ->whereIn('role', ['leader', 'officer'])
            ->exists();
    }
}
