<?php

namespace Database\Factories;

use App\Models\DeathRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DeathRecord>
 */
class DeathRecordFactory extends Factory
{
    protected $model = DeathRecord::class;

    public function definition(): array
    {
        return [
            'username' => fake()->userName(),
            'user_id' => User::factory(),
            'x' => fake()->randomFloat(2, 10500, 11000),
            'y' => fake()->randomFloat(2, 9500, 10500),
            'z' => 0,
            'cause_of_death' => 'zombie',
            'killer_username' => null,
            'killer_user_id' => null,
            'weight' => 1.0,
        ];
    }
}
