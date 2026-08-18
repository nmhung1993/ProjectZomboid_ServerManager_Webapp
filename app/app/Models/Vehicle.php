<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'sql_id',
        'name',
        'model',
        'owner_username',
        'owner_user_id',
        'x',
        'y',
        'z',
        'engine_condition',
        'fuel_level',
        'battery_charge',
        'is_claimed',
        'last_seen_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sql_id' => 'integer',
            'x' => 'float',
            'y' => 'float',
            'z' => 'integer',
            'engine_condition' => 'float',
            'fuel_level' => 'float',
            'battery_charge' => 'float',
            'is_claimed' => 'boolean',
            'last_seen_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }
}
