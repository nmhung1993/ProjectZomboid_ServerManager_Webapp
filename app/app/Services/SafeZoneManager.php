<?php

namespace App\Services;

use App\Models\PvpViolation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SafeZoneManager
{
    private string $configPath;

    private string $violationsPath;

    public function __construct(
        ?string $configPath = null,
        ?string $violationsPath = null,
    ) {
        $this->configPath = $this->resolveConfigPath($configPath, 'zomboid.lua_bridge.safezone_config');
        $this->violationsPath = $this->resolveConfigPath($violationsPath, 'zomboid.lua_bridge.safezone_violations');
    }

    /**
     * Get the current safe zone configuration.
     *
     * @return array{enabled: bool, zones: array<int, array{id: string, name: string, x1: int, y1: int, x2: int, y2: int}>}
     */
    public function getConfig(): array
    {
        $data = JsonFile::read($this->configPath, []);

        return [
            'enabled' => (bool) ($data['enabled'] ?? false),
            'zones' => $data['zones'] ?? [],
        ];
    }

    /**
     * Update the enabled flag for safe zones.
     */
    public function updateConfig(bool $enabled): bool
    {
        $config = $this->getConfig();
        $config['enabled'] = $enabled;

        return JsonFile::writeAtomic($this->configPath, $config);
    }

    /**
     * Add a new safe zone.
     *
     * @param  array{id: string, name: string, x1: int, y1: int, x2: int, y2: int}  $zone
     */
    public function addZone(array $zone): bool
    {
        $config = $this->getConfig();
        $config['zones'][] = $zone;

        return JsonFile::writeAtomic($this->configPath, $config);
    }

    /**
     * Remove a zone by its ID.
     */
    public function removeZone(string $zoneId): bool
    {
        $config = $this->getConfig();
        $config['zones'] = array_values(array_filter(
            $config['zones'],
            fn (array $zone) => ($zone['id'] ?? '') !== $zoneId,
        ));

        return JsonFile::writeAtomic($this->configPath, $config);
    }

    /**
     * Import violations from the Lua JSON file into the database.
     *
     * @return int Number of violations imported
     */
    public function importViolations(): int
    {
        try {
            $this->deduplicateViolations();

            $data = JsonFile::read($this->violationsPath, ['violations' => []]);
            $violations = $data['violations'] ?? [];

            if (empty($violations)) {
                return 0;
            }

            $count = 0;
            foreach ($violations as $v) {
                $occurredAt = isset($v['occurred_at'])
                    ? Carbon::createFromTimestamp($v['occurred_at'])
                    : now();

                $attributes = [
                    'attacker' => $v['attacker'] ?? 'unknown',
                    'victim' => $v['victim'] ?? 'unknown',
                    'zone_id' => $v['zone_id'] ?? '',
                    'zone_name' => $v['zone_name'] ?? 'unknown',
                    'attacker_x' => $v['attacker_x'] ?? null,
                    'attacker_y' => $v['attacker_y'] ?? null,
                    'strike_number' => (int) ($v['strike_number'] ?? 0),
                    'status' => 'pending',
                    'occurred_at' => $occurredAt,
                ];

                $existing = PvpViolation::query()
                    ->where('attacker', $attributes['attacker'])
                    ->where('victim', $attributes['victim'])
                    ->where('zone_id', $attributes['zone_id'])
                    ->where('zone_name', $attributes['zone_name'])
                    ->where('strike_number', $attributes['strike_number'])
                    ->where('occurred_at', $occurredAt)
                    ->first();

                if ($existing) {
                    continue;
                }

                PvpViolation::create($attributes);
                $count++;
            }

            // Clear the violations file after import
            JsonFile::writeAtomic($this->violationsPath, ['violations' => []]);

            return $count;
        } catch (\Throwable $e) {
            Log::warning('Failed to import safe zone violations.', ['exception' => $e->getMessage()]);

            return 0;
        }
    }

    /**
     * Remove duplicate violation rows so each real violation is shown once.
     */
    public function deduplicateViolations(): int
    {
        $rows = PvpViolation::query()
            ->select(['id', 'attacker', 'victim', 'zone_id', 'zone_name', 'strike_number', 'occurred_at'])
            ->orderBy('occurred_at')
            ->get();

        $seen = [];
        $toDelete = [];

        foreach ($rows as $row) {
            $fingerprint = implode('|', [
                (string) $row->attacker,
                (string) $row->victim,
                (string) $row->zone_id,
                (string) $row->zone_name,
                (string) $row->strike_number,
                (string) $row->occurred_at,
            ]);

            if (isset($seen[$fingerprint])) {
                $toDelete[] = $row->id;
                continue;
            }

            $seen[$fingerprint] = $row->id;
        }

        if ($toDelete === []) {
            return 0;
        }

        PvpViolation::query()->whereIn('id', $toDelete)->delete();

        return count($toDelete);
    }

    /**
     * Resolve a violation (dismiss or action).
     */
    public function resolveViolation(int $id, string $status, ?string $note, string $resolvedBy): ?PvpViolation
    {
        $violation = PvpViolation::find($id);
        if (! $violation) {
            return null;
        }

        $violation->update([
            'status' => $status,
            'resolution_note' => $note,
            'resolved_by' => $resolvedBy,
            'resolved_at' => now(),
        ]);

        return $violation;
    }

    /**
     * Read and decode a JSON file, returning default on failure.
     */
    private function resolveConfigPath(?string $path, string $fallbackKey): string
    {
        if ($path !== null && $path !== '') {
            return $path;
        }

        if (function_exists('app')) {
            $container = app();
            if ($container instanceof \Illuminate\Contracts\Container\Container && $container->bound('config')) {
                $value = $container->make('config')->get($fallbackKey);
                if (is_string($value) && $value !== '') {
                    return $value;
                }
            }
        }

        return match ($fallbackKey) {
            'zomboid.lua_bridge.safezone_config' => '/tmp/safezone_config.json',
            'zomboid.lua_bridge.safezone_violations' => '/tmp/safezone_violations.json',
            default => '/tmp/default.json',
        };
    }
}
