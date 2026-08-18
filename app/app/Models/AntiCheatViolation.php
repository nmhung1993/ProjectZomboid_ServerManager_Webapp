<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AntiCheatViolation extends Model
{
    use HasFactory;

    protected $fillable = [
        'username',
        'access_level',
        'cheats',
        'cheat_string',
        'x',
        'y',
        'z',
        'status',
        'resolved_by',
        'resolution_note',
        'resolved_at',
        'occurred_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cheats' => 'array',
            'resolved_at' => 'datetime',
            'occurred_at' => 'datetime',
        ];
    }
}
