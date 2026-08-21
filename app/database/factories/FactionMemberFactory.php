<?php

namespace Database\Factories;

use App\Models\Faction;
use App\Models\FactionMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FactionMember>
 */
class FactionMemberFactory extends Factory
{
    protected $model = FactionMember::class;

    public function definition(): array
    {
        $user = User::factory()->create();

        return [
            'faction_id' => Faction::factory(),
            'user_id' => $user->id,
            'username' => $user->username,
            'role' => 'member',
            'contribution_points' => fake()->randomFloat(2, 0, 500),
            'joined_at' => now(),
        ];
    }
}
