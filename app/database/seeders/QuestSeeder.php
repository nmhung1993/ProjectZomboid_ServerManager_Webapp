<?php

namespace Database\Seeders;

use App\Models\Quest;
use Illuminate\Database\Seeder;

class QuestSeeder extends Seeder
{
    public function run(): void
    {
        $starterQuests = [
            [
                'title' => 'Thợ săn Zombie Rosewood',
                'description' => 'Tiêu diệt 50 xác sống lang thang để bảo vệ cư dân khu vực.',
                'type' => 'daily',
                'category' => 'zombie_kills',
                'target_count' => 50,
                'reward_coins' => 150,
                'is_active' => true,
            ],
            [
                'title' => 'Bậc thầy Sinh tồn Muldraugh',
                'description' => 'Sống sót bền bỉ liên tục 48 giờ trong thế giới tận thế.',
                'type' => 'daily',
                'category' => 'survival_hours',
                'target_count' => 48,
                'reward_coins' => 200,
                'is_active' => true,
            ],
            [
                'title' => 'Chiến binh Diệt Quỷ',
                'description' => 'Tiêu diệt 200 xác sống trong tuần để nhận khoản tiền thưởng lớn.',
                'type' => 'weekly',
                'category' => 'zombie_kills',
                'target_count' => 200,
                'reward_coins' => 500,
                'is_active' => true,
            ],
            [
                'title' => 'Vệ binh Công lý',
                'description' => 'Hạ gục 2 người chơi mang danh hiệu sát nhân PK.',
                'type' => 'achievement',
                'category' => 'pvp_kills',
                'target_count' => 2,
                'reward_coins' => 1000,
                'is_active' => true,
            ],
        ];

        foreach ($starterQuests as $q) {
            Quest::firstOrCreate(['title' => $q['title']], $q);
        }
    }
}
