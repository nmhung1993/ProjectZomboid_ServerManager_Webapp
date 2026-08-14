<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\OnlinePlayersReader;
use App\Services\ServerPlayerStatsService;
use Inertia\Inertia;
use Inertia\Response;

class ServerPlayerStatsController extends Controller
{
    private const PERIODS = ['hour', 'day', 'week', 'month', 'year'];

    private const BUCKETS = [
        'hour' => 24,
        'day' => 30,
        'week' => 12,
        'month' => 12,
        'year' => 10,
    ];

    public function __construct(
        private readonly ServerPlayerStatsService $stats,
        private readonly OnlinePlayersReader $onlinePlayers,
    ) {}

    public function index(): Response
    {
        return Inertia::render('admin/server-player-stats', [
            'stats' => $this->payload(),
        ]);
    }

    /**
     * Build the full payload for the page / endpoint.
     */
    private function payload(): array
    {
        $online = 0;
        try {
            $online = count($this->onlinePlayers->getOnlineUsernames());
        } catch (\Throwable) {
            $online = 0;
        }

        $series = [];
        foreach (self::PERIODS as $period) {
            $series[$period] = $this->stats->aggregate($period, self::BUCKETS[$period]);
        }

        return [
            'current_online' => $online,
            'peak' => [
                'hour' => $this->stats->peakOnline('hour'),
                'day' => $this->stats->peakOnline('day'),
                'week' => $this->stats->peakOnline('week'),
                'month' => $this->stats->peakOnline('month'),
                'year' => $this->stats->peakOnline('year'),
            ],
            'total_hours_played' => $this->stats->totalHoursPlayed(),
            'series' => $series,
        ];
    }
}