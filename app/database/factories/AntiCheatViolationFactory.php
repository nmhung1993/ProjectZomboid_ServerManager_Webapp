<?php

namespace Database\Factories;

use App\Models\AntiCheatViolation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AntiCheatViolation>
 */
class AntiCheatViolationFactory extends Factory
{
    protected $model = AntiCheatViolation::class;

    public function definition(): array
    {
        $cheats = fake()->randomElements(['godmode', 'noclip', 'invisible', 'unlimited_ammo', 'build_cheat'], 2);

        return [
            'username' => fake()->userName(),
            'access_level' => 'none',
            'cheats' => $cheats,
            'cheat_string' => implode(', ', $cheats),
            'x' => fake()->numberBetween(3000, 14000),
            'y' => fake()->numberBetween(3000, 14000),
            'z' => 0,
            'status' => 'flagged',
            'occurred_at' => now(),
        ];
    }
}
