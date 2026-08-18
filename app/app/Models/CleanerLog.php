<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CleanerLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'clean_type',
        'items_removed',
        'triggered_by',
        'details',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'items_removed' => 'integer',
            'details' => 'array',
        ];
    }
}
