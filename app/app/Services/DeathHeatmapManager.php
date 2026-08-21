<?php

namespace App\Services;

use App\Models\DeathRecord;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DeathHeatmapManager
{
    /**
     * Record a player death event.
     */
    public function recordDeath(
        string $username,
        float $x,
        float $y,
        int $z = 0,
        string $cause = 'zombie',
        ?string $killerUsername = null
    ): DeathRecord {
        $user = User::whereRaw('LOWER(username) = ?', [strtolower($username)])->first();
        $killerUser = $killerUsername
            ? User::whereRaw('LOWER(username) = ?', [strtolower($killerUsername)])->first()
            : null;

        $weight = ($cause === 'pvp' || $killerUsername !== null) ? 2.0 : 1.0;

        return DeathRecord::create([
            'username' => $username,
            'user_id' => $user?->id,
            'x' => $x,
            'y' => $y,
            'z' => $z,
            'cause_of_death' => $cause,
            'killer_username' => $killerUsername,
            'killer_user_id' => $killerUser?->id,
            'weight' => $weight,
        ]);
    }

    /**
     * Get heatmap points filtered by time range and type.
     */
    public function getHeatmapPoints(string $timeRange = 'all', string $type = 'all'): array
    {
        $query = DeathRecord::query();

        if ($timeRange === '24h') {
            $query->where('created_at', '>=', now()->subDay());
        } elseif ($timeRange === '7d') {
            $query->where('created_at', '>=', now()->subDays(7));
        } elseif ($timeRange === '30d') {
            $query->where('created_at', '>=', now()->subDays(30));
        }

        if ($type === 'pvp') {
            $query->where('cause_of_death', 'pvp')->orWhereNotNull('killer_username');
        } elseif ($type === 'pve') {
            $query->where('cause_of_death', '!=', 'pvp')->whereNull('killer_username');
        }

        return $query->get()->map(fn (DeathRecord $d) => [
            'id' => $d->id,
            'x' => $d->x,
            'y' => $d->y,
            'weight' => $d->weight,
            'cause' => $d->cause_of_death,
            'username' => $d->username,
            'killer' => $d->killer_username,
            'time' => $d->created_at->toISOString(),
        ])->all();
    }

    /**
     * Get top danger hotspots (clustered areas with high death count).
     */
    public function getDangerHotspots(int $limit = 5): array
    {
        $towns = [
            ['name' => 'Muldraugh', 'min_x' => 10400, 'max_x' => 11000, 'min_y' => 9600, 'max_y' => 10600],
            ['name' => 'West Point', 'min_x' => 11600, 'max_x' => 12400, 'min_y' => 6600, 'max_y' => 7400],
            ['name' => 'Rosewood', 'min_x' => 7800, 'max_x' => 8500, 'min_y' => 11300, 'max_y' => 12000],
            ['name' => 'Riverside', 'min_x' => 6100, 'max_x' => 6900, 'min_y' => 5000, 'max_y' => 5700],
            ['name' => 'March Ridge', 'min_x' => 9800, 'max_x' => 10400, 'min_y' => 12400, 'max_y' => 13100],
            ['name' => 'Louisville', 'min_x' => 12000, 'max_x' => 14000, 'min_y' => 1000, 'max_y' => 4500],
        ];

        $results = [];
        foreach ($towns as $town) {
            $count = DeathRecord::whereBetween('x', [$town['min_x'], $town['max_x']])
                ->whereBetween('y', [$town['min_y'], $town['max_y']])
                ->count();

            $pvpCount = DeathRecord::whereBetween('x', [$town['min_x'], $town['max_x']])
                ->whereBetween('y', [$town['min_y'], $town['max_y']])
                ->where(fn ($q) => $q->where('cause_of_death', 'pvp')->orWhereNotNull('killer_username'))
                ->count();

            $results[] = [
                'name' => $town['name'],
                'total_deaths' => $count,
                'pvp_deaths' => $pvpCount,
                'center_x' => ($town['min_x'] + $town['max_x']) / 2,
                'center_y' => ($town['min_y'] + $town['max_y']) / 2,
            ];
        }

        usort($results, fn ($a, $b) => $b['total_deaths'] <=> $a['total_deaths']);

        return array_slice($results, 0, $limit);
    }
}
