<?php

namespace App\Services;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Log;

class VehicleManager
{
    private string $vehiclesPath;
    private string $commandsPath;

    public function __construct(?string $vehiclesPath = null, ?string $commandsPath = null)
    {
        $this->vehiclesPath = $vehiclesPath ?? config('zomboid.lua_bridge.vehicles', '/lua-bridge/vehicles.json');
        $this->commandsPath = $commandsPath ?? config('zomboid.lua_bridge.vehicle_commands', '/lua-bridge/vehicle_commands.json');
    }

    /**
     * Ingest vehicles exported from Lua bridge into DB.
     */
    public function syncVehiclesFromJson(): int
    {
        if (! file_exists($this->vehiclesPath)) {
            return 0;
        }

        $content = file_get_contents($this->vehiclesPath);
        if (! $content) {
            return 0;
        }

        $data = json_decode($content, true);
        if (! isset($data['vehicles']) || ! is_array($data['vehicles'])) {
            return 0;
        }

        $count = 0;
        foreach ($data['vehicles'] as $v) {
            $sqlId = (int) ($v['sql_id'] ?? 0);
            if ($sqlId <= 0) {
                continue;
            }

            $ownerUsername = ! empty($v['owner']) ? trim($v['owner']) : null;
            $ownerUser = $ownerUsername ? User::where('username', $ownerUsername)->first() : null;

            Vehicle::updateOrCreate(
                ['sql_id' => $sqlId],
                [
                    'name' => $v['name'] ?? 'Vehicle',
                    'model' => $v['model'] ?? null,
                    'owner_username' => $ownerUsername,
                    'owner_user_id' => $ownerUser?->id,
                    'x' => (float) ($v['x'] ?? 0),
                    'y' => (float) ($v['y'] ?? 0),
                    'z' => (int) ($v['z'] ?? 0),
                    'engine_condition' => (float) ($v['engine_condition'] ?? 100),
                    'fuel_level' => (float) ($v['fuel_level'] ?? 100),
                    'battery_charge' => (float) ($v['battery_charge'] ?? 100),
                    'is_claimed' => (bool) ($v['is_claimed'] ?? false),
                    'last_seen_at' => now(),
                ]
            );

            $count++;
        }

        return $count;
    }

    /**
     * Enqueue repair command.
     */
    public function repairVehicle(int $sqlId): bool
    {
        $vehicle = Vehicle::where('sql_id', $sqlId)->first();
        if ($vehicle) {
            $vehicle->update(['engine_condition' => 100, 'fuel_level' => 100, 'battery_charge' => 100]);
        }

        return $this->enqueueCommand(['action' => 'repair', 'sql_id' => $sqlId]);
    }

    /**
     * Enqueue unclaim command.
     */
    public function unclaimVehicle(int $sqlId): bool
    {
        $vehicle = Vehicle::where('sql_id', $sqlId)->first();
        if ($vehicle) {
            $vehicle->update(['is_claimed' => false, 'owner_username' => null, 'owner_user_id' => null]);
        }

        return $this->enqueueCommand(['action' => 'unclaim', 'sql_id' => $sqlId]);
    }

    /**
     * Delete vehicle record and enqueue unclaim.
     */
    public function deleteVehicle(int $sqlId): bool
    {
        Vehicle::where('sql_id', $sqlId)->delete();

        return $this->enqueueCommand(['action' => 'unclaim', 'sql_id' => $sqlId]);
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
            Log::warning('Failed to enqueue vehicle command', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
