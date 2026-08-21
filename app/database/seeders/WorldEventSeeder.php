<?php

namespace Database\Seeders;

use App\Models\WorldEvent;
use Illuminate\Database\Seeder;

class WorldEventSeeder extends Seeder
{
    public function run(): void
    {
        if (WorldEvent::where('status', 'active')->count() === 0) {
            WorldEvent::create([
                'event_type' => 'airdrop',
                'title' => 'Thùng Viện Trợ Cứu Trợ Quân Sự',
                'description' => 'Một thùng hàng cứu trợ quân sự vừa được thả xuống khu vực ngoại ô Muldraugh. Bên trong chứa rìu cứu hỏa, shotgun và đạn dược.',
                'location_name' => 'Muldraugh Highway',
                'x' => 10650.0,
                'y' => 9920.0,
                'z' => 0,
                'radius' => 35,
                'loot_items' => [
                    ['item_id' => 'Base.Axe', 'count' => 1],
                    ['item_id' => 'Base.Shotgun', 'count' => 1],
                    ['item_id' => 'Base.ShotgunShellsBox', 'count' => 3],
                    ['item_id' => 'Base.Antibiotics', 'count' => 2],
                ],
                'reward_coins' => 250.0,
                'status' => 'active',
                'expires_at' => now()->addHours(6),
            ]);

            WorldEvent::create([
                'event_type' => 'heli_crash',
                'title' => 'Hiện Trường Trực Thăng Quân Sự Rơi',
                'description' => 'Một trực thăng trinh sát đặc nhiệm bị rơi tại Rosewood Outskirts. Đàn xác sống quân đội đang vây quanh thùng trang bị đặc nhiệm!',
                'location_name' => 'Rosewood Outskirts',
                'x' => 8150.0,
                'y' => 11620.0,
                'z' => 0,
                'radius' => 45,
                'loot_items' => [
                    ['item_id' => 'Base.M16', 'count' => 1],
                    ['item_id' => 'Base.556Box', 'count' => 4],
                    ['item_id' => 'Base.MilitaryBackpack', 'count' => 1],
                    ['item_id' => 'Base.Vest_BulletArmy', 'count' => 1],
                ],
                'reward_coins' => 500.0,
                'status' => 'active',
                'expires_at' => now()->addHours(8),
            ]);
        }
    }
}
