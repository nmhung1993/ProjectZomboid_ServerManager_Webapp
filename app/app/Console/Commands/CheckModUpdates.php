<?php

namespace App\Console\Commands;

use App\Jobs\RestartGameServer;
use App\Jobs\SendServerWarning;
use App\Models\AutoRestartSetting;
use App\Models\ModUpdateSetting;
use App\Services\AuditLogger;
use App\Services\DockerManager;
use App\Services\ModManager;
use App\Services\SteamWorkshopClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CheckModUpdates extends Command
{
    protected $signature = 'zomboid:check-mod-updates {--force : Force check even if disabled or server offline}';

    protected $description = 'Compare installed game server mod versions against Steam Workshop and schedule restart if needed';

    public function handle(
        ModManager $modManager,
        SteamWorkshopClient $workshopClient,
        DockerManager $docker,
    ): int {
        $settings = ModUpdateSetting::instance();
        $isForced = (bool) $this->option('force');

        if (! $settings->enabled && ! $isForced) {
            $this->info('Mod update checking is disabled.');
            return self::SUCCESS;
        }

        $iniPath = config('zomboid.paths.server_ini');
        $mods = $modManager->list($iniPath);
        $workshopIds = array_values(array_filter(array_column($mods, 'workshop_id')));

        if (empty($workshopIds)) {
            $this->info('No workshop mods configured.');
            return self::SUCCESS;
        }

        // Check if server is running
        $status = $docker->getContainerStatus();
        if (! $status['running'] && ! $isForced) {
            $this->info('Game server is offline, skipping mod update check.');
            return self::SUCCESS;
        }

        // Read installed mod timestamps directly from the game server's appworkshop_108600.acf
        $installedTimestamps = $modManager->getInstalledWorkshopTimestamps();
        $fallbackTimestamps = $settings->known_mod_timestamps ?? [];

        // Fetch current details from Steam Workshop API in bulk
        $steamMods = $workshopClient->getBulkDetails($workshopIds);
        if (empty($steamMods)) {
            $this->info('Could not retrieve mod details from Steam Workshop.');
            return self::SUCCESS;
        }

        $outdatedMods = [];
        $recordedTimestamps = $installedTimestamps;

        foreach ($workshopIds as $wId) {
            if (! isset($steamMods[$wId])) {
                continue;
            }

            $steamItem = $steamMods[$wId];
            $steamUpdatedTime = (int) ($steamItem['time_updated'] ?? 0);
            if ($steamUpdatedTime <= 0) {
                continue;
            }

            // The installed timestamp on the game server (or fallback known timestamp)
            $serverInstalledTime = $installedTimestamps[$wId] ?? ($fallbackTimestamps[$wId] ?? 0);

            if ($serverInstalledTime > 0 && $steamUpdatedTime > $serverInstalledTime) {
                $outdatedMods[] = [
                    'workshop_id' => $wId,
                    'title' => $steamItem['title'] ?: "Workshop #{$wId}",
                    'installed_time' => $serverInstalledTime,
                    'steam_time' => $steamUpdatedTime,
                ];
            }

            if (! isset($recordedTimestamps[$wId])) {
                $recordedTimestamps[$wId] = $serverInstalledTime > 0 ? $serverInstalledTime : $steamUpdatedTime;
            }
        }

        $settings->known_mod_timestamps = $recordedTimestamps;
        $settings->last_checked_at = now();
        $settings->save();

        if (empty($outdatedMods)) {
            $this->info('All mods are up to date with the game server installed versions.');
            return self::SUCCESS;
        }

        $modTitles = array_column($outdatedMods, 'title');
        $modTitlesStr = implode(', ', $modTitles);
        $this->info('Detected updates for ' . count($outdatedMods) . " mod(s): {$modTitlesStr}");

        // Check if restart should be skipped because of upcoming scheduled auto-restart
        $skipDueToAutoRestart = false;
        $autoRestart = AutoRestartSetting::instance();
        if ($autoRestart->enabled) {
            $nextScheduled = $autoRestart->getNextRestartTime();
            if ($nextScheduled !== null) {
                $minsUntilScheduled = (int) now()->diffInMinutes($nextScheduled, false);
                if ($minsUntilScheduled >= 0 && $minsUntilScheduled <= $settings->skip_if_scheduled_within_minutes) {
                    $skipDueToAutoRestart = true;
                    Log::info("Mod update check: upcoming auto-restart is in {$minsUntilScheduled}m (<= threshold {$settings->skip_if_scheduled_within_minutes}m). Skipping mod update restart.");
                }
            }
        }

        // Check if a restart is already in progress / pending
        $isPendingRestart = Cache::has('server.pending_action:restart')
            || Cache::has('server.auto_restart.pending')
            || Cache::has('server.mod_update.pending');

        // Phase 1: Notify Discord if enabled
        if ($settings->notify_discord) {
            // Check if we already notified for these exact versions to avoid 15m repeated spam
            $unnotifiedCount = 0;
            foreach ($outdatedMods as $om) {
                $cacheKey = "mod_update.notified:{$om['workshop_id']}:{$om['steam_time']}";
                if (! Cache::has($cacheKey)) {
                    $unnotifiedCount++;
                    Cache::put($cacheKey, true, 86400); // 24h
                }
            }

            if ($unnotifiedCount > 0) {
                $restartNotice = '';
                if ($settings->auto_restart && ! $skipDueToAutoRestart && ! $isPendingRestart) {
                    $restartNotice = " — Máy chủ sẽ tự động khởi động lại sau {$settings->restart_delay_minutes} phút để áp dụng.";
                } elseif ($skipDueToAutoRestart) {
                    $restartNotice = ' — Sắp đến lịch khởi động lại định kỳ (trong vòng 30 phút), sẽ áp dụng cùng lần khởi động kế tiếp.';
                }

                AuditLogger::record(
                    actor: 'system',
                    action: 'mod.update.detected',
                    target: config('zomboid.docker.container_name'),
                    details: [
                        'mods' => $modTitles,
                        'count' => count($outdatedMods),
                        'message' => "Phát hiện bản cập nhật mới cho " . count($outdatedMods) . " mod ({$modTitlesStr}){$restartNotice}",
                    ],
                );
            }
        }

        // Phase 2: Schedule restart after delay (default 5 minutes)
        if ($settings->auto_restart && ! $skipDueToAutoRestart && ! $isPendingRestart) {
            $countdown = $settings->restart_delay_minutes * 60;

            Cache::put('server.pending_action:restart', true, $countdown + 300);
            Cache::put('server.mod_update.pending', true, $countdown + 300);

            RestartGameServer::dispatch('127.0.0.1')
                ->delay(now()->addSeconds($countdown));

            if ($countdown > 0) {
                $warningMsg = "Server restart in {$settings->restart_delay_minutes}m (Mod update: {$modTitlesStr})";
                SendServerWarning::dispatchCountdownWarnings(
                    $countdown,
                    $warningMsg,
                    'server.pending_action:restart',
                );
            }

            AuditLogger::record(
                actor: 'system',
                action: 'mod.update.restart_scheduled',
                target: config('zomboid.docker.container_name'),
                details: [
                    'countdown' => $countdown,
                    'delay_minutes' => $settings->restart_delay_minutes,
                    'mods' => $modTitles,
                    'message' => "Lên lịch khởi động lại sau {$settings->restart_delay_minutes} phút do mod cập nhật ({$modTitlesStr}).",
                ],
            );

            $this->info("Scheduled server restart in {$settings->restart_delay_minutes} minute(s).");
        }

        return self::SUCCESS;
    }
}
