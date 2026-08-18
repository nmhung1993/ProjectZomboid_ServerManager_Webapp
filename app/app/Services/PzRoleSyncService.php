<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PzRoleSyncService
{
    public function __construct(
        private readonly RconClient $rcon,
    ) {}

    /**
     * Synchronize a player's role across:
     * 1. Project Zomboid SQLite database (whitelist table: role column).
     * 2. PostgreSQL users table (role column).
     * 3. Live in-game session via RCON (setaccesslevel command).
     */
    public function sync(string $username, string $accessLevel): void
    {
        $username = RconSanitizer::playerName($username);
        $level = RconSanitizer::accessLevel($accessLevel);
        $sqliteRoleId = UserRole::pzAccessLevelToSqliteRole($level);

        // 1. Update Project Zomboid SQLite whitelist table
        try {
            DB::connection('pz_sqlite')
                ->table('whitelist')
                ->where('username', $username)
                ->update(['role' => $sqliteRoleId]);
        } catch (\Throwable $e) {
            Log::warning('PzRoleSyncService: Failed to update PZ SQLite whitelist role', [
                'username' => $username,
                'level' => $level,
                'sqliteRoleId' => $sqliteRoleId,
                'error' => $e->getMessage(),
            ]);
        }

        // 2. Update PostgreSQL users table
        try {
            $user = User::query()->where('username', $username)->first();
            if ($user !== null && $user->role !== UserRole::SuperAdmin) {
                $newRole = UserRole::fromPzAccessLevel($level);
                if ($user->role !== $newRole) {
                    $user->update(['role' => $newRole]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('PzRoleSyncService: Failed to update PostgreSQL user role', [
                'username' => $username,
                'level' => $level,
                'error' => $e->getMessage(),
            ]);
        }

        // 3. Send RCON command for live session
        try {
            $this->rcon->connect();
            $this->rcon->command("setaccesslevel \"{$username}\" \"{$level}\"");
        } catch (\Throwable $e) {
            Log::info("PzRoleSyncService: RCON setaccesslevel was not executed (Server offline or player disconnected). SQLite role was synchronized: {$e->getMessage()}");
        }
    }
}
