<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FactionInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'faction_id',
        'user_id',
        'type', // invitation, request
        'status', // pending, accepted, rejected, cancelled
        'created_by',
    ];

    public function faction(): BelongsTo
    {
        return $this->belongsTo(Faction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
