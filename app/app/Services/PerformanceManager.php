<?php

namespace App\Services;

use App\Models\ServerPerformanceLog;
use Illuminate\Support\Facades\Log;

class PerformanceManager
{
    private string $perfPath;

    public function __construct(?string $perfPath = null)
    {
        $this->perfPath = $perfPath ?? config('zomboid.lua_bridge.performance_metrics', '/lua-bridge/performance_metrics.json');
    }

    /**
     * Sync latest performance snapshot from Lua bridge to database.
     */
    public function syncPerformanceSnapshot(): ?ServerPerformanceLog
    {
        $data = JsonFile::read($this->perfPath, []);
        if (! $data || empty($data['tps'])) {
            return null;
        }

        try {
            return ServerPerformanceLog::create([
                'tps' => (float) ($data['tps'] ?? 60.0),
                'tick_time_ms' => (float) ($data['tick_time_ms'] ?? 16.6),
                'loaded_squares' => (int) ($data['loaded_squares'] ?? 0),
                'active_zombies' => (int) ($data['active_zombies'] ?? 0),
                'dead_bodies' => (int) ($data['dead_bodies'] ?? 0),
                'online_players' => (int) ($data['online_players'] ?? 0),
                'memory_used_mb' => (float) ($data['memory_used_mb'] ?? 0),
                'memory_max_mb' => (float) ($data['memory_max_mb'] ?? 0),
                'recorded_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to save performance log', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Get health summary rating and metrics.
     */
    public function getHealthSummary(): array
    {
        $latest = ServerPerformanceLog::latest('recorded_at')->first();

        $tps = $latest ? (float) $latest->tps : 60.0;
        $tickTime = $latest ? (float) $latest->tick_time_ms : 16.6;
        $activeZombies = $latest ? (int) $latest->active_zombies : 0;
        $deadBodies = $latest ? (int) $latest->dead_bodies : 0;
        $memoryUsed = $latest ? (float) $latest->memory_used_mb : 0;
        $memoryMax = $latest ? (float) $latest->memory_max_mb : 0;
        $memoryPercent = $memoryMax > 0 ? round(($memoryUsed / $memoryMax) * 100, 1) : 0;

        // Health Score calculation (0 - 100)
        $score = 100;
        if ($tps < 50) {
            $score -= (50 - $tps) * 2;
        }
        if ($tickTime > 30) {
            $score -= ($tickTime - 30);
        }
        if ($memoryPercent > 80) {
            $score -= ($memoryPercent - 80);
        }
        if ($deadBodies > 1500) {
            $score -= 15;
        }

        $score = max(10, min(100, (int) round($score)));

        $status = 'excellent';
        if ($score < 50) {
            $status = 'critical';
        } elseif ($score < 75) {
            $status = 'warning';
        } elseif ($score < 90) {
            $status = 'good';
        }

        return [
            'score' => $score,
            'status' => $status,
            'latest' => [
                'tps' => $tps,
                'tick_time_ms' => $tickTime,
                'active_zombies' => $activeZombies,
                'dead_bodies' => $deadBodies,
                'online_players' => $latest ? $latest->online_players : 0,
                'memory_used_mb' => $memoryUsed,
                'memory_max_mb' => $memoryMax,
                'memory_percent' => $memoryPercent,
                'recorded_at' => $latest?->recorded_at?->toISOString() ?? now()->toISOString(),
            ],
        ];
    }

    /**
     * Get performance historical metrics for charts.
     */
    public function getPerformanceHistory(int $hours = 24): array
    {
        return ServerPerformanceLog::where('recorded_at', '>=', now()->subHours($hours))
            ->orderBy('recorded_at')
            ->limit(100)
            ->get()
            ->map(fn (ServerPerformanceLog $l) => [
                'time' => $l->recorded_at->format('H:i'),
                'tps' => (float) $l->tps,
                'tick_time_ms' => (float) $l->tick_time_ms,
                'active_zombies' => $l->active_zombies,
                'dead_bodies' => $l->dead_bodies,
                'online_players' => $l->online_players,
                'memory_used_mb' => (float) $l->memory_used_mb,
            ])
            ->all();
    }
}
