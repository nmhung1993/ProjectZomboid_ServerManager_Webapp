<?php

namespace App\Services;

use App\Models\PlayerStat;
use App\Models\ServerPlayerStat;
use Carbon\CarbonInterface;

class ServerPlayerStatsService
{
    public function __construct(
        private readonly OnlinePlayersReader $onlinePlayers,
    ) {}

    /**
     * Capture the current server state into a snapshot row.
     */
    public function capture(): ?ServerPlayerStat
    {
        $count = null;
        try {
            $count = count($this->onlinePlayers->getOnlineUsernames());
        } catch (\Throwable) {
            $count = null;
        }

        if ($count === null) {
            return null;
        }

        return ServerPlayerStat::query()->create([
            'recorded_at' => now(),
            'player_count' => $count,
            'total_hours_survived' => (float) PlayerStat::query()->sum('hours_survived'),
        ]);
    }

    /**
     * Aggregate snapshots into buckets for one chart series.
     *
     * @param  'hour'|'day'|'week'|'month'|'year'  $period
     * @return array<int, array{label: string, player_count: int, total_hours_survived: float}>
     */
    public function aggregate(string $period, int $buckets = 24): array
    {
        $start = match ($period) {
            'hour' => now()->subHours($buckets),
            'day' => now()->subDays($buckets),
            'week' => now()->subWeeks($buckets),
            'month' => now()->subMonths($buckets),
            'year' => now()->subYears($buckets),
            default => now()->subDays($buckets),
        };

        $rows = ServerPlayerStat::query()
            ->where('recorded_at', '>=', $start)
            ->orderBy('recorded_at')
            ->get(['recorded_at', 'player_count', 'total_hours_survived']);

        if ($rows->isEmpty()) {
            return [];
        }

        return $rows
            ->groupBy(fn (ServerPlayerStat $row) => $this->bucketKey($row->recorded_at, $period))
            ->map(function ($group) {
                return [
                    'player_count' => (int) $group->max('player_count'),
                    'total_hours_survived' => round((float) $group->last()->total_hours_survived, 2),
                ];
            })
            ->map(fn (array $data, string $label) => [
                'label' => $label,
                'player_count' => $data['player_count'],
                'total_hours_survived' => $data['total_hours_survived'],
            ])
            ->values()
            ->all();
    }

    /**
     * Compute the period-key for bucketing.
     */
    private function bucketKey(CarbonInterface $date, string $period): string
    {
        return match ($period) {
            'hour' => $date->format('Y-m-d H:00'),
            'day' => $date->format('Y-m-d'),
            'week' => $date->format('o-\WW'),
            'month' => $date->format('Y-m'),
            'year' => $date->format('Y'),
            default => $date->format('Y-m-d'),
        };
    }

    /**
     * Get the peak online count for a given period.
     */
    public function peakOnline(string $period): int
    {
        $start = match ($period) {
            'hour' => now()->subHour(),
            'day' => now()->subDay(),
            'week' => now()->subWeek(),
            'month' => now()->subMonth(),
            'year' => now()->subYear(),
            default => now()->subDay(),
        };

        return (int) ServerPlayerStat::query()
            ->where('recorded_at', '>=', $start)
            ->max('player_count');
    }

    /**
     * Total accumulated play hours (survived) across all players.
     */
    public function totalHoursPlayed(): float
    {
        return round((float) PlayerStat::query()->sum('hours_survived'), 2);
    }
}