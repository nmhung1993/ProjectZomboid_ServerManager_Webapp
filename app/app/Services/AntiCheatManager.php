<?php

namespace App\Services;

use App\Models\AntiCheatViolation;
use App\Models\GameEvent;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AntiCheatManager
{
    private string $violationsPath;

    public function __construct(?string $violationsPath = null)
    {
        $this->violationsPath = $violationsPath ?? config('zomboid.lua_bridge.anticheat_violations', '/lua-bridge/anticheat_violations.json');
    }

    /**
     * Import violations from the Lua JSON file into the database and GameEvents.
     *
     * @return int Number of new violations imported
     */
    public function importViolations(): int
    {
        try {
            $data = JsonFile::read($this->violationsPath, ['violations' => []]);
            $violations = $data['violations'] ?? [];

            if (empty($violations)) {
                return 0;
            }

            $count = 0;
            foreach ($violations as $v) {
                $username = $v['username'] ?? 'unknown';
                $cheats = $v['cheats'] ?? [];
                $cheatString = $v['cheat_string'] ?? implode(', ', $cheats);
                $accessLevel = $v['access_level'] ?? 'none';
                $x = isset($v['x']) ? (int) $v['x'] : null;
                $y = isset($v['y']) ? (int) $v['y'] : null;
                $z = isset($v['z']) ? (int) $v['z'] : 0;
                $occurredAt = isset($v['occurred_at'])
                    ? Carbon::createFromTimestamp($v['occurred_at'])
                    : now();

                $exists = AntiCheatViolation::query()
                    ->where('username', $username)
                    ->where('cheat_string', $cheatString)
                    ->where('occurred_at', $occurredAt)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $record = AntiCheatViolation::create([
                    'username' => $username,
                    'access_level' => $accessLevel,
                    'cheats' => $cheats,
                    'cheat_string' => $cheatString,
                    'x' => $x,
                    'y' => $y,
                    'z' => $z,
                    'status' => 'flagged',
                    'occurred_at' => $occurredAt,
                ]);

                // Create a GameEvent so it appears on the Live Map & Moderation timeline
                GameEvent::create([
                    'event_type' => 'anticheat_violation',
                    'player' => $username,
                    'target' => null,
                    'details' => [
                        'cheats' => $cheats,
                        'cheat_string' => $cheatString,
                        'access_level' => $accessLevel,
                        'violation_id' => $record->id,
                    ],
                    'x' => $x,
                    'y' => $y,
                    'game_time' => $occurredAt,
                ]);

                // Record Audit Log (which will trigger Discord alert if configured)
                AuditLogger::record(
                    actor: 'system',
                    action: 'anticheat.violation',
                    target: $username,
                    details: [
                        'username' => $username,
                        'cheats' => $cheats,
                        'cheat_string' => $cheatString,
                        'access_level' => $accessLevel,
                        'x' => $x,
                        'y' => $y,
                        'message' => "Phát hiện người chơi '{$username}' (role: {$accessLevel}) sử dụng tính năng gian lận / admin: [{$cheatString}] tại tọa độ ({$x}, {$y})",
                    ],
                );

                $count++;
            }

            // Clear the violations file after import
            JsonFile::writeAtomic($this->violationsPath, ['violations' => []]);

            return $count;
        } catch (\Throwable $e) {
            Log::warning('Failed to import anticheat violations.', ['exception' => $e->getMessage()]);

            return 0;
        }
    }

    /**
     * Resolve or dismiss an anticheat violation.
     */
    public function resolveViolation(int $id, string $status, ?string $note, string $resolvedBy): ?AntiCheatViolation
    {
        $violation = AntiCheatViolation::find($id);
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
}
