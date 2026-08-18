<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WorldEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WorldEventManager
{
    private string $eventsPath;
    private string $resultsPath;

    public const LOCATIONS = [
        ['name' => 'Muldraugh Highway', 'min_x' => 10600, 'max_x' => 10800, 'min_y' => 9800, 'max_y' => 10400],
        ['name' => 'West Point Downtown', 'min_x' => 11800, 'max_x' => 12200, 'min_y' => 6800, 'max_y' => 7200],
        ['name' => 'Rosewood Outskirts', 'min_x' => 8000, 'max_x' => 8300, 'min_y' => 11500, 'max_y' => 11800],
        ['name' => 'Riverside Marina', 'min_x' => 6300, 'max_x' => 6700, 'min_y' => 5200, 'max_y' => 5500],
        ['name' => 'March Ridge Dormitories', 'min_x' => 10000, 'max_x' => 10200, 'min_y' => 12600, 'max_y' => 12900],
        ['name' => 'Louisville Checkpoint', 'min_x' => 12500, 'max_x' => 12800, 'min_y' => 4100, 'max_y' => 4400],
    ];

    public function __construct(
        ?string $eventsPath = null,
        ?string $resultsPath = null,
    ) {
        $this->eventsPath = $eventsPath ?? config('zomboid.lua_bridge.world_events', '/lua-bridge/world_events.json');
        $this->resultsPath = $resultsPath ?? config('zomboid.lua_bridge.event_results', '/lua-bridge/event_results.json');
    }

    /**
     * Spawn a random Airdrop event.
     */
    public function spawnRandomAirdrop(int $durationHours = 2): WorldEvent
    {
        $loc = self::LOCATIONS[array_rand(self::LOCATIONS)];
        $x = rand($loc['min_x'], $loc['max_x']);
        $y = rand($loc['min_y'], $loc['max_y']);

        $lootPool = [
            ['item_id' => 'Base.Axe', 'count' => 1],
            ['item_id' => 'Base.Shotgun', 'count' => 1],
            ['item_id' => 'Base.ShotgunShellsBox', 'count' => 3],
            ['item_id' => 'Base.Antibiotics', 'count' => 2],
            ['item_id' => 'Base.FirstAidKit', 'count' => 1],
            ['item_id' => 'Base.MRE', 'count' => 4],
        ];

        shuffle($lootPool);
        $selectedLoot = array_slice($lootPool, 0, 4);

        $event = WorldEvent::create([
            'event_type' => 'airdrop',
            'title' => "Thùng Viện Trợ Cứu Trợ - {$loc['name']}",
            'description' => "Một máy bay vận tải vừa thả một thùng hàng quân sự tại tọa độ [X: {$x}, Y: {$y}] ({$loc['name']}). Hãy nhanh chóng đến chiếm đoạt!",
            'location_name' => $loc['name'],
            'x' => $x,
            'y' => $y,
            'z' => 0,
            'radius' => 35,
            'loot_items' => $selectedLoot,
            'reward_coins' => 250.0,
            'status' => 'active',
            'expires_at' => now()->addHours($durationHours),
        ]);

        $this->syncEventsBridge();

        return $event;
    }

    /**
     * Spawn a Helicopter Crash Site.
     */
    public function spawnHeliCrash(int $durationHours = 3): WorldEvent
    {
        $loc = self::LOCATIONS[array_rand(self::LOCATIONS)];
        $x = rand($loc['min_x'], $loc['max_x']);
        $y = rand($loc['min_y'], $loc['max_y']);

        $lootItems = [
            ['item_id' => 'Base.M16', 'count' => 1],
            ['item_id' => 'Base.556Box', 'count' => 4],
            ['item_id' => 'Base.MilitaryBackpack', 'count' => 1],
            ['item_id' => 'Base.Hat_Army', 'count' => 1],
            ['item_id' => 'Base.Vest_BulletArmy', 'count' => 1],
        ];

        $event = WorldEvent::create([
            'event_type' => 'heli_crash',
            'title' => "Hiện Trường Trực Thăng Rơi - {$loc['name']}",
            'description' => "Một trực thăng trinh sát quân sự bị rơi tại [X: {$x}, Y: {$y}]. Nhiều vũ khí hạng nặng và quân trang đặc nhiệm đang bị đàn xác sống vây quanh!",
            'location_name' => $loc['name'],
            'x' => $x,
            'y' => $y,
            'z' => 0,
            'radius' => 45,
            'loot_items' => $lootItems,
            'reward_coins' => 500.0,
            'status' => 'active',
            'expires_at' => now()->addHours($durationHours),
        ]);

        $this->syncEventsBridge();

        return $event;
    }

    /**
     * Mark an event as looted by a player and credit bounty reward.
     */
    public function markEventLooted(int $eventId, string $username): bool
    {
        return DB::transaction(function () use ($eventId, $username) {
            $event = WorldEvent::where('id', $eventId)->lockForUpdate()->first();
            if (! $event || $event->status !== 'active') {
                return false;
            }

            $user = User::whereRaw('LOWER(username) = ?', [strtolower($username)])->first();

            $event->update([
                'status' => 'looted',
                'looted_by_username' => $username,
                'looted_by_user_id' => $user?->id,
                'looted_at' => now(),
            ]);

            if ($user && $event->reward_coins > 0) {
                $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);
                $wallet->increment('balance', (float) $event->reward_coins);
                $wallet->increment('total_earned', (float) $event->reward_coins);
            }

            $this->syncEventsBridge();

            return true;
        });
    }

    /**
     * Cancel an active event.
     */
    public function cancelEvent(int $eventId): bool
    {
        $event = WorldEvent::find($eventId);
        if (! $event || $event->status !== 'active') {
            return false;
        }

        $event->update(['status' => 'cancelled']);
        $this->syncEventsBridge();

        return true;
    }

    /**
     * Process expired world events.
     */
    public function processExpiredEvents(): int
    {
        $count = WorldEvent::where('status', 'active')
            ->where('expires_at', '<=', now())
            ->update(['status' => 'expired']);

        if ($count > 0) {
            $this->syncEventsBridge();
        }

        return $count;
    }

    /**
     * Sync active events to Lua bridge JSON.
     */
    public function syncEventsBridge(): bool
    {
        try {
            $activeEvents = WorldEvent::where('status', 'active')
                ->get()
                ->map(fn (WorldEvent $e) => [
                    'id' => $e->id,
                    'event_type' => $e->event_type,
                    'title' => $e->title,
                    'location_name' => $e->location_name,
                    'x' => $e->x,
                    'y' => $e->y,
                    'z' => $e->z,
                    'radius' => $e->radius,
                    'loot_items' => $e->loot_items ?? [],
                ])
                ->values()
                ->all();

            return JsonFile::writeAtomic($this->eventsPath, [
                'timestamp' => time(),
                'events' => $activeEvents,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to write world_events.json', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Sync results exported from game server (e.g. when player looted a crate).
     */
    public function syncResultsFromBridge(): int
    {
        $data = JsonFile::read($this->resultsPath, []);
        if (! $data || empty($data['looted_events'])) {
            return 0;
        }

        $processed = 0;
        foreach ($data['looted_events'] as $item) {
            $eventId = $item['id'] ?? null;
            $username = $item['looted_by'] ?? null;

            if ($eventId && $username) {
                if ($this->markEventLooted($eventId, $username)) {
                    $processed++;
                }
            }
        }

        if ($processed > 0) {
            JsonFile::writeAtomic($this->resultsPath, ['looted_events' => []]);
        }

        return $processed;
    }
}
