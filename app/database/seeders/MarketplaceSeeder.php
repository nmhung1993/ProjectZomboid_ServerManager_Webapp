<?php

namespace Database\Seeders;

use App\Models\MarketListing;
use App\Models\User;
use Illuminate\Database\Seeder;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first() ?? User::factory()->create(['username' => 'admin']);

        $sampleListings = [
            [
                'seller_id' => $admin->id,
                'item_id' => 'Base.Katana',
                'item_name' => 'Katana Nhật Cổ',
                'category' => 'weapons',
                'quantity' => 1,
                'listing_type' => 'auction',
                'starting_bid' => 300,
                'current_bid' => 300,
                'buyout_price' => 1200,
                'bid_count' => 0,
                'status' => 'active',
                'expires_at' => now()->addHours(24),
            ],
            [
                'seller_id' => $admin->id,
                'item_id' => 'Base.Sledgehammer',
                'item_name' => 'Búa Tạ Đập Tường (Sledgehammer)',
                'category' => 'tools',
                'quantity' => 1,
                'listing_type' => 'fixed_price',
                'price' => 450,
                'status' => 'active',
                'expires_at' => now()->addDays(3),
            ],
            [
                'seller_id' => $admin->id,
                'item_id' => 'Base.Antibiotics',
                'item_name' => 'Thuốc Kháng Sinh Y Tế',
                'category' => 'medical',
                'quantity' => 5,
                'listing_type' => 'fixed_price',
                'price' => 150,
                'status' => 'active',
                'expires_at' => now()->addDays(2),
            ],
            [
                'seller_id' => $admin->id,
                'item_id' => 'Base.M16Clip',
                'item_name' => 'Hộp tiếp đạn M16 (Full đạn)',
                'category' => 'ammo',
                'quantity' => 2,
                'listing_type' => 'fixed_price',
                'price' => 220,
                'status' => 'active',
                'expires_at' => now()->addDays(2),
            ],
        ];

        foreach ($sampleListings as $l) {
            MarketListing::firstOrCreate(['item_name' => $l['item_name']], $l);
        }
    }
}
