<?php

namespace Database\Factories;

use App\Models\Faction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Faction>
 */
class FactionFactory extends Factory
{
    protected $model = Faction::class;

    public function definition(): array
    {
        $name = fake()->unique()->company().' Squad';
        $tag = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 4));

        return [
            'name' => $name,
            'tag' => $tag,
            'description' => fake()->sentence(),
            'color' => fake()->hexColor(),
            'leader_id' => User::factory(),
            'bank_balance' => fake()->randomFloat(2, 0, 5000),
            'max_members' => 20,
        ];
    }
}
