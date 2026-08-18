<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModUpdateSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'enabled',
        'check_interval_minutes',
        'notify_discord',
        'auto_restart',
        'restart_delay_minutes',
        'skip_if_scheduled_within_minutes',
        'last_checked_at',
        'known_mod_timestamps',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'check_interval_minutes' => 'integer',
            'notify_discord' => 'boolean',
            'auto_restart' => 'boolean',
            'restart_delay_minutes' => 'integer',
            'skip_if_scheduled_within_minutes' => 'integer',
            'last_checked_at' => 'datetime',
            'known_mod_timestamps' => 'array',
        ];
    }

    /**
     * Get the singleton settings instance, creating one if none exists.
     */
    public static function instance(): static
    {
        return static::query()->firstOrCreate([], [
            'enabled' => true,
            'check_interval_minutes' => 15,
            'notify_discord' => true,
            'auto_restart' => true,
            'restart_delay_minutes' => 5,
            'skip_if_scheduled_within_minutes' => 30,
            'known_mod_timestamps' => [],
        ]);
    }
}
