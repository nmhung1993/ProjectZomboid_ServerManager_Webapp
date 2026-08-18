<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServerPerformanceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'tps',
        'tick_time_ms',
        'loaded_squares',
        'active_zombies',
        'dead_bodies',
        'online_players',
        'memory_used_mb',
        'memory_max_mb',
        'recorded_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tps' => 'float',
            'tick_time_ms' => 'float',
            'loaded_squares' => 'integer',
            'active_zombies' => 'integer',
            'dead_bodies' => 'integer',
            'online_players' => 'integer',
            'memory_used_mb' => 'float',
            'memory_max_mb' => 'float',
            'recorded_at' => 'datetime',
        ];
    }
}
