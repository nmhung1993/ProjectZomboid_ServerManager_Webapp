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

    /**
     * Synchronize all Web accounts and their roles to Project Zomboid SQLite database (and RCON if online).
     *
     * @return array{total_users: int, created_in_pz: int, updated_in_pz: int, errors: int}
     */
    public function syncAllWebToGame(): array
    {
        $users = User::query()->get();
        $world = config('zomboid.server_name', 'ZomboidServer');

        $createdInPz = 0;
        $updatedInPz = 0;
        $errors = 0;

        $rconConnected = false;
        try {
            $this->rcon->connect();
            $rconConnected = true;
        } catch (\Throwable $e) {
            Log::info("PzRoleSyncService: RCON unavailable for bulk sync, proceeding with database sync: {$e->getMessage()}");
        }

        foreach ($users as $user) {
            $username = $user->username;
            if (empty($username)) {
                continue;
            }

            $sanitizedUsername = RconSanitizer::playerName($username);
            $roleEnum = $user->role ?? UserRole::Player;
            $sqliteRoleId = UserRole::roleToSqliteRole($roleEnum);
            $pzAccessLevel = UserRole::roleToPzAccessLevel($roleEnum);

            try {
                $existingWhitelist = DB::connection('pz_sqlite')
                    ->table('whitelist')
                    ->where('username', $sanitizedUsername)
                    ->first();

                if ($existingWhitelist) {
                    // Update role in SQLite whitelist
                    DB::connection('pz_sqlite')
                        ->table('whitelist')
                        ->where('username', $sanitizedUsername)
                        ->update(['role' => $sqliteRoleId]);
                    $updatedInPz++;
                } else {
                    // Create in PZ whitelist with default temporary hash
                    $dummyHash = PzAccountAuthenticator::hashForPz(bin2hex(random_bytes(16)));
                    DB::connection('pz_sqlite')
                        ->table('whitelist')
                        ->insert([
                            'username' => $sanitizedUsername,
                            'password' => $dummyHash,
                            'world' => $world,
                            'role' => $sqliteRoleId,
                            'authType' => 1,
                        ]);
                    $createdInPz++;
                }

                // If RCON is connected, try to set accesslevel on live server
                if ($rconConnected && $pzAccessLevel !== 'none') {
                    try {
                        $this->rcon->command("setaccesslevel \"{$sanitizedUsername}\" \"{$pzAccessLevel}\"");
                    } catch (\Throwable) {
                        // ignore live session errors for offline players
                    }
                }
            } catch (\Throwable $e) {
                $errors++;
                Log::warning("PzRoleSyncService: Failed to sync user {$sanitizedUsername} to PZ game server", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'total_users' => $users->count(),
            'created_in_pz' => $createdInPz,
            'updated_in_pz' => $updatedInPz,
            'errors' => $errors,
        ];
    }
}
