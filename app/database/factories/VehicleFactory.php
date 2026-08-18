<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vehicle>
 */
class VehicleFactory extends Factory
{
    protected $model = Vehicle::class;

    public function definition(): array
    {
        $models = [
            'Base.CarNormal' => 'Chevalier Dart',
            'Base.PickUpTruck' => 'Franklin Valuline',
            'Base.OffRoad' => 'Dash Rancher',
            'Base.CarLuxury' => 'Mercer Lang 4000',
            'Base.Van' => 'Chevalier Step Van',
        ];

        $modelKey = fake()->randomElement(array_keys($models));
        $name = $models[$modelKey];

        return [
            'sql_id' => fake()->unique()->numberBetween(100, 99999),
            'name' => $name,
            'model' => $modelKey,
            'owner_username' => fake()->userName(),
            'owner_user_id' => User::factory(),
            'x' => fake()->randomFloat(1, 5000, 12000),
            'y' => fake()->randomFloat(1, 5000, 12000),
            'z' => 0,
            'engine_condition' => fake()->randomFloat(1, 40, 100),
            'fuel_level' => fake()->randomFloat(1, 10, 100),
            'battery_charge' => fake()->randomFloat(1, 50, 100),
            'is_claimed' => true,
            'last_seen_at' => now(),
        ];
    }
}
