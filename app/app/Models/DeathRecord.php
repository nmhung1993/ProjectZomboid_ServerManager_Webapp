<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeathRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'username',
        'user_id',
        'x',
        'y',
        'z',
        'cause_of_death',
        'killer_username',
        'killer_user_id',
        'weight',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'x' => 'float',
            'y' => 'float',
            'z' => 'integer',
            'weight' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function killerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'killer_user_id');
    }
}
