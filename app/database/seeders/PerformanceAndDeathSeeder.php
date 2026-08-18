<?php

namespace Database\Seeders;

use App\Models\DeathRecord;
use App\Models\ServerPerformanceLog;
use App\Models\User;
use Illuminate\Database\Seeder;

class PerformanceAndDeathSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first() ?? User::factory()->create(['username' => 'admin']);

        if (DeathRecord::count() === 0) {
            $sampleDeaths = [
                ['username' => 'Survivor_John', 'x' => 10620.0, 'y' => 9910.0, 'z' => 0, 'cause_of_death' => 'zombie', 'weight' => 1.0],
                ['username' => 'Survivor_Mike', 'x' => 10640.0, 'y' => 9930.0, 'z' => 0, 'cause_of_death' => 'zombie', 'weight' => 1.0],
                ['username' => 'Survivor_Sarah', 'x' => 10680.0, 'y' => 9980.0, 'z' => 0, 'cause_of_death' => 'pvp', 'killer_username' => 'Bandit_Leader', 'weight' => 2.0],
                ['username' => 'Sniper_Ghost', 'x' => 11950.0, 'y' => 6950.0, 'z' => 0, 'cause_of_death' => 'pvp', 'killer_username' => 'Shadow_Hunter', 'weight' => 2.0],
                ['username' => 'Noob_Player', 'x' => 12050.0, 'y' => 7020.0, 'z' => 0, 'cause_of_death' => 'zombie', 'weight' => 1.0],
                ['username' => 'Farmer_Joe', 'x' => 8120.0, 'y' => 11580.0, 'z' => 0, 'cause_of_death' => 'bleeding', 'weight' => 1.0],
            ];

            foreach ($sampleDeaths as $d) {
                DeathRecord::create($d);
            }
        }

        if (ServerPerformanceLog::count() === 0) {
            for ($i = 12; $i >= 0; $i--) {
                ServerPerformanceLog::create([
                    'tps' => rand(570, 600) / 10.0,
                    'tick_time_ms' => rand(160, 180) / 10.0,
                    'loaded_squares' => rand(400, 600),
                    'active_zombies' => rand(250, 450),
                    'dead_bodies' => rand(40, 150),
                    'online_players' => rand(3, 10),
                    'memory_used_mb' => rand(2200, 3100),
                    'memory_max_mb' => 8192.0,
                    'recorded_at' => now()->subHours($i * 2),
                ]);
            }
        }
    }
}
