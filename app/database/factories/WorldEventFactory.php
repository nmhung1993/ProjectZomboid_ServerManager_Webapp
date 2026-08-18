<?php

namespace Database\Factories;

use App\Models\WorldEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorldEvent>
 */
class WorldEventFactory extends Factory
{
    protected $model = WorldEvent::class;

    public function definition(): array
    {
        return [
            'event_type' => 'airdrop',
            'title' => 'Thùng Viện Trợ Quân Sự',
            'description' => 'Một thùng tiếp tế quân đội chứa vũ khí và đạn dược đã được thả xuống.',
            'location_name' => 'Muldraugh',
            'x' => 10600.0,
            'y' => 9800.0,
            'z' => 0,
            'radius' => 30,
            'loot_items' => [
                ['item_id' => 'Base.Axe', 'count' => 1],
                ['item_id' => 'Base.Shotgun', 'count' => 1],
                ['item_id' => 'Base.ShotgunShellsBox', 'count' => 3],
            ],
            'reward_coins' => 150.0,
            'status' => 'active',
            'expires_at' => now()->addHours(2),
        ];
    }
}
