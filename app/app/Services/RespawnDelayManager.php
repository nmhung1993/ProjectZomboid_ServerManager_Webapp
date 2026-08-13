<?php

namespace App\Services;

class RespawnDelayManager
{
    private string $configPath;

    private string $deathsPath;

    private string $resetsPath;

    public function __construct(
        ?string $configPath = null,
        ?string $deathsPath = null,
        ?string $resetsPath = null,
    ) {
        $this->configPath = $configPath ?? config('zomboid.lua_bridge.respawn_config');
        $this->deathsPath = $deathsPath ?? config('zomboid.lua_bridge.respawn_deaths');
        $this->resetsPath = $resetsPath ?? config('zomboid.lua_bridge.respawn_resets');
    }

    /**
     * Get the current respawn delay configuration.
     *
     * @return array{enabled: bool, delay_minutes: int}
     */
    public function getConfig(): array
    {
        $data = JsonFile::read($this->configPath, []);

        return [
            'enabled' => (bool) ($data['enabled'] ?? false),
            'delay_minutes' => (int) ($data['delay_minutes'] ?? 60),
        ];
    }

    /**
     * Update the respawn delay configuration.
     */
    public function updateConfig(bool $enabled, int $delayMinutes): bool
    {
        return JsonFile::writeAtomic($this->configPath, [
            'enabled' => $enabled,
            'delay_minutes' => $delayMinutes,
        ]);
    }

    /**
     * Get players with active cooldowns and their remaining time.
     *
     * @return array<string, array{death_time: int, remaining_seconds: int, remaining_minutes: int}>
     */
    public function getActiveCooldowns(): array
    {
        $config = $this->getConfig();
        if (! $config['enabled']) {
            return [];
        }

        $deaths = JsonFile::read($this->deathsPath, ['deaths' => []]);
        $deathRecords = $deaths['deaths'] ?? [];

        $now = time();
        $delaySeconds = $config['delay_minutes'] * 60;
        $cooldowns = [];

        foreach ($deathRecords as $username => $deathTime) {
            $elapsed = $now - (int) $deathTime;
            $remaining = $delaySeconds - $elapsed;

            if ($remaining > 0) {
                $cooldowns[$username] = [
                    'death_time' => (int) $deathTime,
                    'remaining_seconds' => $remaining,
                    'remaining_minutes' => (int) ceil($remaining / 60),
                ];
            }
        }

        return $cooldowns;
    }

    /**
     * Reset a player's respawn timer by adding to the resets file.
     */
    public function resetPlayer(string $username): bool
    {
        $data = JsonFile::read($this->resetsPath, ['resets' => []]);
        $resets = $data['resets'] ?? [];

        if (! in_array($username, $resets)) {
            $resets[] = $username;
        }

        return JsonFile::writeAtomic($this->resetsPath, ['resets' => $resets]);
    }
}
