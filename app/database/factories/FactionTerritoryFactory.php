<?php

namespace Database\Factories;

use App\Models\Faction;
use App\Models\FactionTerritory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FactionTerritory>
 */
class FactionTerritoryFactory extends Factory
{
    protected $model = FactionTerritory::class;

    public function definition(): array
    {
        $x1 = fake()->numberBetween(3000, 12000);
        $y1 = fake()->numberBetween(3000, 12000);

        return [
            'faction_id' => Faction::factory(),
            'name' => fake()->word().' Outpost',
            'x1' => $x1,
            'y1' => $y1,
            'x2' => $x1 + 100,
            'y2' => $y1 + 100,
            'z' => 0,
            'color' => '#3b82f6',
            'is_safe_house' => true,
        ];
    }
}
