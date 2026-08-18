<?php

namespace App\Http\Controllers;

use App\Models\PlayerStat;
use App\Models\SiteSetting;
use App\Services\GameStateReader;
use App\Services\GameTimeService;
use App\Services\PlayerPositionReader;
use App\Services\PlayerStatsService;
use App\Services\ServerStatusResolver;
use Inertia\Inertia;
use Inertia\Response;

class StatusController extends Controller
{
    public function __construct(
        private readonly ServerStatusResolver $statusResolver,
        private readonly GameStateReader $gameStateReader,
        private readonly PlayerStatsService $playerStats,
        private readonly GameTimeService $gameTime,
        private readonly PlayerPositionReader $positionReader,
    ) {}

    public function __invoke(): Response
    {
        if (! SiteSetting::cached()->show_status) {
            abort(404);
        }

        $resolved = $this->statusResolver->resolve();
        $rawUsernames = $resolved['players'] ?? [];

        $livePositions = $this->positionReader->getLivePositions();
        $liveMap = [];
        if ($livePositions && ! empty($livePositions['players'])) {
            foreach ($livePositions['players'] as $lp) {
                if (! empty($lp['username'])) {
                    $liveMap[$lp['username']] = $lp;
                }
            }
        }

        $onlinePlayersData = [];
        if (! empty($rawUsernames)) {
            $statsRows = PlayerStat::query()
                ->whereIn('username', $rawUsernames)
                ->get()
                ->keyBy('username');

            foreach ($rawUsernames as $username) {
                $stat = $statsRows->get($username);
                $live = $liveMap[$username] ?? null;
                $rank = null;
                if ($stat) {
                    $rank = PlayerStat::query()->where('zombie_kills', '>', $stat->zombie_kills)->count() + 1;
                }
                $profession = (! empty($live['profession']) && $live['profession'] !== 'unemployed')
                    ? $live['profession']
                    : ($stat?->profession ?? $live['profession'] ?? 'unemployed');

                $traits = (! empty($live['traits']))
                    ? $live['traits']
                    : ($stat?->traits ?? []);

                $onlinePlayersData[] = [
                    'username' => $username,
                    'rank' => $rank,
                    'zombie_kills' => $stat?->zombie_kills ?? 0,
                    'hours_survived' => (float) ($stat?->hours_survived ?? 0),
                    'profession' => $profession,
                    'traits' => $traits,
                    'is_dead' => (bool) ($live['is_dead'] ?? $stat?->is_dead ?? false),
                ];
            }
        }

        $server = [
            'online' => $resolved['online'],
            'status' => $resolved['game_status'],
            'player_count' => $resolved['player_count'],
            'players' => $onlinePlayersData,
            'uptime' => $resolved['uptime'],
            'map' => $resolved['map'],
            'max_players' => $resolved['max_players'],
        ];

        $topRankings = [
            'kills' => $this->playerStats->getFullLeaderboard('zombie_kills', 5),
            'survival' => $this->playerStats->getFullLeaderboard('hours_survived', 5),
        ];

        $gameState = $resolved['online'] ? $this->gameStateReader->getGameState() : null;

        return Inertia::render('status', [
            'server' => $server,
            'game_state' => $gameState,
            'server_name' => config('zomboid.server_name', 'ZomboidServer'),
            'top_rankings' => $topRankings,
            'day_length_minutes' => $this->gameTime->realMinutesPerInGameDay(),
        ]);
    }
}
