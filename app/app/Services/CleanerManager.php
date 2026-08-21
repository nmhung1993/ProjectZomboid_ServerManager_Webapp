<?php

namespace App\Services;

use App\Models\CleanerLog;
use Illuminate\Support\Facades\Log;

class CleanerManager
{
    private string $commandsPath;
    private string $resultsPath;

    public function __construct(?string $commandsPath = null, ?string $resultsPath = null)
    {
        $this->commandsPath = $commandsPath ?? config('zomboid.lua_bridge.cleaner_commands', '/lua-bridge/cleaner_commands.json');
        $this->resultsPath = $resultsPath ?? config('zomboid.lua_bridge.cleaner_results', '/lua-bridge/cleaner_results.json');
    }

    /**
     * Trigger cleanup for dead zombie bodies.
     */
    public function triggerCleanDeadBodies(string $triggeredBy = 'admin_manual'): CleanerLog
    {
        $log = CleanerLog::create([
            'clean_type' => 'dead_bodies',
            'items_removed' => 0,
            'triggered_by' => $triggeredBy,
            'details' => ['status' => 'queued'],
        ]);

        $this->enqueueCommand(['action' => 'clean_dead_bodies', 'log_id' => $log->id]);

        return $log;
    }

    /**
     * Trigger cleanup for ground junk items.
     */
    public function triggerCleanGroundItems(string $triggeredBy = 'admin_manual', ?array $blacklist = null): CleanerLog
    {
        $defaultBlacklist = [
            'Base.RippedSheets',
            'Base.RippedSheetsDirty',
            'Base.TreeBranch',
            'Base.Twigs',
            'Base.ShatteredGlass',
            'Base.BrokenBottle',
        ];

        $items = $blacklist ?: $defaultBlacklist;

        $log = CleanerLog::create([
            'clean_type' => 'ground_items',
            'items_removed' => 0,
            'triggered_by' => $triggeredBy,
            'details' => ['blacklist' => $items, 'status' => 'queued'],
        ]);

        $this->enqueueCommand([
            'action' => 'clean_ground_items',
            'blacklist' => $items,
            'log_id' => $log->id,
        ]);

        return $log;
    }

    /**
     * Ingest cleaner execution results.
     */
    public function syncCleanerResults(): int
    {
        if (! file_exists($this->resultsPath)) {
            return 0;
        }

        $content = file_get_contents($this->resultsPath);
        if (! $content) {
            return 0;
        }

        $data = json_decode($content, true);
        if (! isset($data['actions_completed']) || ! is_array($data['actions_completed'])) {
            return 0;
        }

        $updated = 0;
        foreach ($data['actions_completed'] as $res) {
            $action = $res['action'] ?? '';
            $removed = (int) ($res['items_removed'] ?? 0);

            $log = CleanerLog::where('clean_type', $action)
                ->where('items_removed', 0)
                ->latest()
                ->first();

            if ($log) {
                $log->update([
                    'items_removed' => $removed,
                    'details' => array_merge($log->details ?? [], ['status' => 'completed']),
                ]);
                $updated++;
            }
        }

        // Clear results
        @unlink($this->resultsPath);

        return $updated;
    }

    private function enqueueCommand(array $action): bool
    {
        try {
            $commands = [];
            if (file_exists($this->commandsPath)) {
                $content = file_get_contents($this->commandsPath);
                $json = json_decode($content, true);
                if (isset($json['actions']) && is_array($json['actions'])) {
                    $commands = $json['actions'];
                }
            }

            $commands[] = $action;

            return JsonFile::writeAtomic($this->commandsPath, ['actions' => $commands]);
        } catch (\Throwable $e) {
            Log::warning('Failed to enqueue cleaner command', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
