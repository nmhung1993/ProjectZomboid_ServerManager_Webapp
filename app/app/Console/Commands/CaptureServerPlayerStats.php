<?php

namespace App\Console\Commands;

use App\Services\ServerPlayerStatsService;
use Illuminate\Console\Command;

class CaptureServerPlayerStats extends Command
{
    protected $signature = 'zomboid:capture-server-player-stats';

    protected $description = 'Capture current online player count and total play hours into a stats snapshot';

    public function handle(ServerPlayerStatsService $service): int
    {
        $snapshot = $service->capture();

        if ($snapshot === null) {
            $this->warn('Skipped capture: online player list could not be resolved.');

            return self::SUCCESS;
        }

        $this->info("Captured snapshot #{$snapshot->getKey()} (players: {$snapshot->player_count}, hours: {$snapshot->total_hours_survived}).");

        return self::SUCCESS;
    }
}