<?php

namespace Database\Factories;

use App\Models\Quest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quest>
 */
class QuestFactory extends Factory
{
    protected $model = Quest::class;

    public function definition(): array
    {
        return [
            'title' => 'Săn lùng Zombie tại '.fake()->city(),
            'description' => fake()->sentence(),
            'type' => fake()->randomElement(['daily', 'weekly', 'achievement']),
            'category' => 'zombie_kills',
            'target_count' => fake()->numberBetween(25, 100),
            'reward_coins' => fake()->randomFloat(2, 50, 500),
            'reward_items' => null,
            'is_active' => true,
        ];
    }
}
