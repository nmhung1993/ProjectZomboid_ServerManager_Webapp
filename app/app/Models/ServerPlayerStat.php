<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServerPlayerStat extends Model
{
    protected $fillable = [
        'recorded_at',
        'player_count',
        'total_hours_survived',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
            'player_count' => 'integer',
            'total_hours_survived' => 'float',
        ];
    }
}