<?php

namespace Database\Factories;

use App\Models\Achievement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Achievement>
 */
class AchievementFactory extends Factory
{
    protected $model = Achievement::class;

    public function definition(): array
    {
        return [
            'slug' => 'zombie_slayer_' . uniqid(),
            'title' => 'Sát Thủ Zombie',
            'description' => 'Tiêu diệt 100 con zombie trong game.',
            'category' => 'combat',
            'icon' => 'Crosshair',
            'metric_type' => 'zombie_kills',
            'target_value' => 100,
            'reward_coins' => 150.0,
            'reward_title' => '[Sát Thủ Zombie]',
        ];
    }
}
