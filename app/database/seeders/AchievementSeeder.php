<?php

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // Combat (Diệt Zombie)
            [
                'slug' => 'zombie_kills_100',
                'title' => 'Thợ Săn Tập Sự',
                'description' => 'Tiêu diệt 100 con zombie trong khu vực Knox.',
                'category' => 'combat',
                'icon' => 'Crosshair',
                'metric_type' => 'zombie_kills',
                'target_value' => 100,
                'reward_coins' => 50.0,
                'reward_title' => '[Tập Sự]',
            ],
            [
                'slug' => 'zombie_kills_500',
                'title' => 'Kẻ Diệt Xác Sống',
                'description' => 'Tiêu diệt 500 con zombie trong game.',
                'category' => 'combat',
                'icon' => 'Crosshair',
                'metric_type' => 'zombie_kills',
                'target_value' => 500,
                'reward_coins' => 150.0,
                'reward_title' => '[Diệt Xác Sống]',
            ],
            [
                'slug' => 'zombie_kills_1000',
                'title' => 'Sát Thủ Zombie',
                'description' => 'Tiêu diệt 1,000 con zombie trên toàn bản đồ.',
                'category' => 'combat',
                'icon' => 'Crosshair',
                'metric_type' => 'zombie_kills',
                'target_value' => 1000,
                'reward_coins' => 300.0,
                'reward_title' => '[Sát Thủ Zombie]',
            ],
            [
                'slug' => 'zombie_kills_5000',
                'title' => 'Huyền Thoại Knox',
                'description' => 'Tiêu diệt 5,000 con zombie — nỗi khiếp sợ của mọi bầy đàn xác sống!',
                'category' => 'combat',
                'icon' => 'Flame',
                'metric_type' => 'zombie_kills',
                'target_value' => 5000,
                'reward_coins' => 1000.0,
                'reward_title' => '[Huyền Thoại Knox]',
            ],

            // PvP Sinh Tử
            [
                'slug' => 'pvp_kills_1',
                'title' => 'Chiến Binh Đầu Tiên',
                'description' => 'Hạ gục thành công 1 người chơi trong trận quyết đấu PvP.',
                'category' => 'pvp',
                'icon' => 'Swords',
                'metric_type' => 'pvp_kills',
                'target_value' => 1,
                'reward_coins' => 100.0,
                'reward_title' => '[Chiến Binh]',
            ],
            [
                'slug' => 'pvp_kills_5',
                'title' => 'Sát Thủ Máu Lạnh',
                'description' => 'Hạ gục 5 người chơi trong các trận giao tranh PvP.',
                'category' => 'pvp',
                'icon' => 'Swords',
                'metric_type' => 'pvp_kills',
                'target_value' => 5,
                'reward_coins' => 350.0,
                'reward_title' => '[Sát Thủ]',
            ],
            [
                'slug' => 'pvp_kills_10',
                'title' => 'Thần Chết PvP',
                'description' => 'Hạ gục 10 người chơi — kẻ thống trị các cuộc giao chiến!',
                'category' => 'pvp',
                'icon' => 'Skull',
                'metric_type' => 'pvp_kills',
                'target_value' => 10,
                'reward_coins' => 700.0,
                'reward_title' => '[Thần Chết PvP]',
            ],

            // Survival (Sinh Tồn)
            [
                'slug' => 'survive_hours_24',
                'title' => 'Ngày Đầu Sinh Tồn',
                'description' => 'Sống sót qua 24 giờ đầu tiên trong đại dịch.',
                'category' => 'survival',
                'icon' => 'Clock',
                'metric_type' => 'survived_hours',
                'target_value' => 24,
                'reward_coins' => 50.0,
                'reward_title' => '[Kẻ Sống Sót]',
            ],
            [
                'slug' => 'survive_hours_168',
                'title' => 'Tuần Lễ Gian Khổ',
                'description' => 'Sống sót liên tục 7 ngày (168 giờ trong game).',
                'category' => 'survival',
                'icon' => 'Shield',
                'metric_type' => 'survived_hours',
                'target_value' => 168,
                'reward_coins' => 250.0,
                'reward_title' => '[Sinh Tồn Kiên Cường]',
            ],
            [
                'slug' => 'survive_hours_720',
                'title' => 'Bất Tử Trong Đại Dịch',
                'description' => 'Sống sót qua 1 tháng (720 giờ trong game).',
                'category' => 'survival',
                'icon' => 'Crown',
                'metric_type' => 'survived_hours',
                'target_value' => 720,
                'reward_coins' => 800.0,
                'reward_title' => '[Bất Tử]',
            ],

            // Economy & Quests
            [
                'slug' => 'coins_earned_500',
                'title' => 'Thương Nhân Nhỏ',
                'description' => 'Tích lũy tổng cộng 500 Coins trong ví.',
                'category' => 'economy',
                'icon' => 'Coins',
                'metric_type' => 'total_coins',
                'target_value' => 500,
                'reward_coins' => 100.0,
                'reward_title' => '[Thương Nhân]',
            ],
            [
                'slug' => 'coins_earned_2000',
                'title' => 'Đại Gia Knox County',
                'description' => 'Tích lũy tổng cộng 2,000 Coins trong ví.',
                'category' => 'economy',
                'icon' => 'Coins',
                'metric_type' => 'total_coins',
                'target_value' => 2000,
                'reward_coins' => 500.0,
                'reward_title' => '[Đại Gia Knox]',
            ],
            [
                'slug' => 'completed_quests_5',
                'title' => 'Thợ Săn Tiền Thưởng',
                'description' => 'Hoàn thành 5 nhiệm vụ hàng ngày/tuần.',
                'category' => 'exploration',
                'icon' => 'Target',
                'metric_type' => 'completed_quests',
                'target_value' => 5,
                'reward_coins' => 150.0,
                'reward_title' => '[Thợ Săn Tiền Thưởng]',
            ],
            [
                'slug' => 'claimed_vehicles_2',
                'title' => 'Bậc Thầy Tay Lái',
                'description' => 'Sở hữu và đăng ký quyền sở hữu 2 phương tiện xe.',
                'category' => 'exploration',
                'icon' => 'Car',
                'metric_type' => 'claimed_vehicles',
                'target_value' => 2,
                'reward_coins' => 200.0,
                'reward_title' => '[Tay Lái Huyền Thoại]',
            ],
        ];

        foreach ($defaults as $ach) {
            Achievement::updateOrCreate(['slug' => $ach['slug']], $ach);
        }
    }
}
