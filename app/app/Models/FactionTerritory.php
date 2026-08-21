<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FactionTerritory extends Model
{
    use HasFactory;

    protected $fillable = [
        'faction_id',
        'name',
        'x1',
        'y1',
        'x2',
        'y2',
        'z',
        'color',
        'is_safe_house',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'x1' => 'integer',
            'y1' => 'integer',
            'x2' => 'integer',
            'y2' => 'integer',
            'z' => 'integer',
            'is_safe_house' => 'boolean',
        ];
    }

    public function faction(): BelongsTo
    {
        return $this->belongsTo(Faction::class);
    }
}
