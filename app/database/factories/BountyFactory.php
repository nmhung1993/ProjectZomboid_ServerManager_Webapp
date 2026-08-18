<?php

namespace Database\Factories;

use App\Models\Bounty;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bounty>
 */
class BountyFactory extends Factory
{
    protected $model = Bounty::class;

    public function definition(): array
    {
        return [
            'target_username' => fake()->userName(),
            'creator_id' => User::factory(),
            'reward_amount' => fake()->randomFloat(2, 200, 2000),
            'reason' => 'Đột kích căn cứ và cướp tài sản',
            'status' => 'active',
        ];
    }
}
