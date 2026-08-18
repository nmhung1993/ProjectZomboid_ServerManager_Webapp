<?php

namespace App\Console\Commands;

use App\Services\AntiCheatManager;
use Illuminate\Console\Command;

class SyncAntiCheatViolations extends Command
{
    protected $signature = 'zomboid:sync-anticheat';

    protected $description = 'Import anticheat violations from game server Lua bridge into database';

    public function handle(AntiCheatManager $manager): int
    {
        $count = $manager->importViolations();

        if ($count > 0) {
            $this->info("Imported {$count} new anticheat violation(s).");
        } else {
            $this->info('No new anticheat violations found.');
        }

        return self::SUCCESS;
    }
}
