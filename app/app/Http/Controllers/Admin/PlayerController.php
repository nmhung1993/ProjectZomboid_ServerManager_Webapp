<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminSetPasswordRequest;
use App\Http\Requests\Admin\BanPlayerRequest;
use App\Http\Requests\Admin\KickPlayerRequest;
use App\Http\Requests\Admin\SetAccessLevelRequest;
use App\Models\PlayerStat;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\GameTimeService;
use App\Services\OnlinePlayersReader;
use App\Services\PlayerPositionReader;
use App\Services\PzPasswordSyncService;
use App\Services\PzRoleSyncService;
use App\Services\RconClient;
use App\Services\RconSanitizer;
use App\Services\RespawnDelayManager;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class PlayerController extends Controller
{
    public function __construct(
        private readonly RconClient $rcon,
        private readonly AuditLogger $auditLogger,
        private readonly OnlinePlayersReader $onlinePlayers,
        private readonly RespawnDelayManager $respawnDelay,
        private readonly PzPasswordSyncService $pzPasswordSync,
        private readonly PzRoleSyncService $pzRoleSync,
        private readonly PlayerPositionReader $positionReader,
        private readonly GameTimeService $gameTime,
    ) {}

    public function index(): Response
    {
        $onlineNames = $this->onlinePlayers->getOnlineUsernames();
        $livePositions = $this->positionReader->getLivePositions();
        $liveMap = [];
        if ($livePositions && ! empty($livePositions['players'])) {
            foreach ($livePositions['players'] as $lp) {
                if (! empty($lp['username'])) {
                    $liveMap[$lp['username']] = $lp;
                }
            }
        }

        $statsMap = PlayerStat::query()
            ->get()
            ->keyBy('username');

        $registeredUsernames = [];

        $players = User::query()
            ->select('id', 'username', 'role', 'steam_id', 'created_at')
            ->orderBy('username')
            ->get()
            ->map(function (User $user) use ($onlineNames, $statsMap, $liveMap, &$registeredUsernames) {
                $registeredUsernames[] = $user->username;
                $stats = $statsMap->get($user->username);
                $live = $liveMap[$user->username] ?? null;

                return [
                    'id' => $user->id,
                    'username' => $user->username,
                    'role' => $user->role->value,
                    'steam_id' => $user->steam_id,
                    'isOnline' => in_array($user->username, $onlineNames),
                    'createdAt' => $user->created_at->toISOString(),
                    'stats' => ($stats || $live) ? [
                        'zombie_kills' => $stats->zombie_kills ?? 0,
                        'hours_survived' => (float) ($stats->hours_survived ?? 0),
                        'profession' => $live['profession'] ?? $stats->profession ?? 'unemployed',
                        'skills' => $stats->skills ?? [],
                        'traits' => $live['traits'] ?? $stats->traits ?? [],
                        'is_dead' => (bool) ($live['is_dead'] ?? $stats->is_dead ?? false),
                    ] : null,
                    'live' => $live ? [
                        'x' => $live['x'] ?? null,
                        'y' => $live['y'] ?? null,
                        'z' => $live['z'] ?? null,
                        'is_ghost' => (bool) ($live['is_ghost'] ?? false),
                    ] : null,
                ];
            })
            ->toArray();

        // Add online-only unregistered players as pseudo-entries
        foreach ($onlineNames as $name) {
            if (! in_array($name, $registeredUsernames)) {
                $stats = $statsMap->get($name);
                $live = $liveMap[$name] ?? null;

                $players[] = [
                    'id' => null,
                    'username' => $name,
                    'role' => 'player',
                    'steam_id' => null,
                    'isOnline' => true,
                    'createdAt' => null,
                    'stats' => ($stats || $live) ? [
                        'zombie_kills' => $stats->zombie_kills ?? 0,
                        'hours_survived' => (float) ($stats->hours_survived ?? 0),
                        'profession' => $live['profession'] ?? $stats->profession ?? 'unemployed',
                        'skills' => $stats->skills ?? [],
                        'traits' => $live['traits'] ?? $stats->traits ?? [],
                        'is_dead' => (bool) ($live['is_dead'] ?? $stats->is_dead ?? false),
                    ] : null,
                    'live' => $live ? [
                        'x' => $live['x'] ?? null,
                        'y' => $live['y'] ?? null,
                        'z' => $live['z'] ?? null,
                        'is_ghost' => (bool) ($live['is_ghost'] ?? false),
                    ] : null,
                ];
            }
        }

        return Inertia::render('admin/players', [
            'players' => $players,
            'respawn_cooldowns' => $this->respawnDelay->getActiveCooldowns(),
            'respawn_config' => $this->respawnDelay->getConfig(),
            'day_length_minutes' => $this->gameTime->realMinutesPerInGameDay(),
        ]);
    }

    public function kick(KickPlayerRequest $request, string $name): JsonResponse
    {
        $name = RconSanitizer::playerName($name);
        $reason = RconSanitizer::message($request->validated('reason', ''));

        try {
            $this->rcon->connect();
            $command = $reason !== '' ? "kickuser \"{$name}\" -r \"{$reason}\"" : "kickuser \"{$name}\"";
            $response = $this->rcon->command($command);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed: '.$e->getMessage()], 503);
        }

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'player.kick',
            target: $name,
            details: ['reason' => $reason, 'rcon_response' => $response, 'command' => $command],
            ip: $request->ip(),
        );

        return response()->json(['message' => "Kicked {$name}", 'rcon_response' => $response, 'command' => $command]);
    }

    public function ban(BanPlayerRequest $request, string $name): JsonResponse
    {
        $name = RconSanitizer::playerName($name);
        $reason = RconSanitizer::message($request->validated('reason', ''));
        $ipBan = $request->validated('ip_ban', false);

        try {
            $this->rcon->connect();
            $this->rcon->command("banuser \"{$name}\"");
            if ($ipBan) {
                $this->rcon->command("banid \"{$name}\"");
            }
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed: '.$e->getMessage()], 503);
        }

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'player.ban',
            target: $name,
            details: ['reason' => $reason, 'ip_ban' => $ipBan],
            ip: $request->ip(),
        );

        return response()->json(['message' => "Banned {$name}"]);
    }

    public function setAccessLevel(SetAccessLevelRequest $request, string $name): JsonResponse
    {
        $name = RconSanitizer::playerName($name);
        $level = RconSanitizer::accessLevel($request->validated('level'));

        $this->pzRoleSync->sync($name, $level);

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'player.setaccess',
            target: $name,
            details: ['level' => $level],
            ip: $request->ip(),
        );

        return response()->json(['message' => "Set {$name} access to {$level}"]);
    }

    public function setPassword(AdminSetPasswordRequest $request, string $name): JsonResponse
    {
        $user = User::where('username', $name)->first();

        if (! $user) {
            return response()->json(['error' => "User {$name} not found"], 404);
        }

        $user->update(['password' => $request->password]);

        $this->pzPasswordSync->sync($name, $request->password);

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'player.setpassword',
            target: $name,
            details: [],
            ip: $request->ip(),
        );

        return response()->json(['message' => "Password set for {$name}"]);
    }
}
