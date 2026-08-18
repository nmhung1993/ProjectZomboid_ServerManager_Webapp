<?php

namespace App\Services;

use App\Models\Faction;
use App\Models\FactionInvitation;
use App\Models\FactionMember;
use App\Models\FactionTerritory;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FactionManager
{
    private string $configPath;

    public function __construct(?string $configPath = null)
    {
        $this->configPath = $configPath ?? config('zomboid.lua_bridge.faction_config', '/lua-bridge/faction_config.json');
    }

    /**
     * Create a new faction.
     */
    public function createFaction(User $leader, string $name, string $tag, ?string $description = null, ?string $color = '#3b82f6'): Faction
    {
        // Check if user already is in a faction
        $existing = FactionMember::where('user_id', $leader->id)->first();
        if ($existing) {
            throw new \InvalidArgumentException('Bạn đã là thành viên của một Bang hội khác.');
        }

        return DB::transaction(function () use ($leader, $name, $tag, $description, $color) {
            $faction = Faction::create([
                'name' => trim($name),
                'tag' => strtoupper(trim($tag)),
                'description' => $description,
                'color' => $color ?: '#3b82f6',
                'leader_id' => $leader->id,
                'bank_balance' => 0,
                'max_members' => 20,
            ]);

            FactionMember::create([
                'faction_id' => $faction->id,
                'user_id' => $leader->id,
                'username' => $leader->username,
                'role' => 'leader',
                'contribution_points' => 0,
                'joined_at' => now(),
            ]);

            $this->exportFactionConfig();

            return $faction;
        });
    }

    /**
     * Deposit wallet funds into faction bank.
     */
    public function depositBank(Faction $faction, User $user, float $amount): bool
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Số tiền nạp phải lớn hơn 0.');
        }

        $member = FactionMember::where('faction_id', $faction->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $member) {
            throw new \InvalidArgumentException('Bạn không phải thành viên của bang hội này.');
        }

        return DB::transaction(function () use ($faction, $user, $member, $amount) {
            $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);

            if ($wallet->balance < $amount) {
                throw new \InvalidArgumentException('Số dư ví không đủ để nạp vào quỹ bang.');
            }

            $wallet->decrement('balance', $amount);
            $wallet->increment('total_spent', $amount);

            $faction->increment('bank_balance', $amount);
            $member->increment('contribution_points', $amount);

            return true;
        });
    }

    /**
     * Claim territory for a faction.
     */
    public function claimTerritory(
        Faction $faction,
        string $name,
        int $x1,
        int $y1,
        int $x2,
        int $y2,
        int $z = 0,
        ?string $color = null,
        bool $isSafeHouse = true
    ): FactionTerritory {
        $minX = min($x1, $x2);
        $maxX = max($x1, $x2);
        $minY = min($y1, $y2);
        $maxY = max($y1, $y2);

        $territory = FactionTerritory::create([
            'faction_id' => $faction->id,
            'name' => $name,
            'x1' => $minX,
            'y1' => $minY,
            'x2' => $maxX,
            'y2' => $maxY,
            'z' => $z,
            'color' => $color ?: $faction->color,
            'is_safe_house' => $isSafeHouse,
        ]);

        $this->exportFactionConfig();

        return $territory;
    }

    /**
     * Delete a faction territory.
     */
    public function deleteTerritory(int $territoryId): bool
    {
        $territory = FactionTerritory::find($territoryId);
        if (! $territory) {
            return false;
        }

        $territory->delete();
        $this->exportFactionConfig();

        return true;
    }

    /**
     * Invite a user to a faction.
     */
    public function inviteUser(Faction $faction, User $inviter, User $target): FactionInvitation
    {
        if (! $faction->isOfficer($inviter->id)) {
            throw new \InvalidArgumentException('Chỉ Chủ bang hoặc Phó bang mới có quyền mời thành viên.');
        }

        $targetInFaction = FactionMember::where('user_id', $target->id)->exists();
        if ($targetInFaction) {
            throw new \InvalidArgumentException('Người chơi này đã tham gia một bang hội khác.');
        }

        $pending = FactionInvitation::where('faction_id', $faction->id)
            ->where('user_id', $target->id)
            ->where('status', 'pending')
            ->first();

        if ($pending) {
            throw new \InvalidArgumentException('Đã có lời mời hoặc yêu cầu đang chờ xử lý.');
        }

        return FactionInvitation::create([
            'faction_id' => $faction->id,
            'user_id' => $target->id,
            'type' => 'invitation',
            'status' => 'pending',
            'created_by' => $inviter->username,
        ]);
    }

    /**
     * User requests to join a faction.
     */
    public function requestToJoin(Faction $faction, User $user): FactionInvitation
    {
        $targetInFaction = FactionMember::where('user_id', $user->id)->exists();
        if ($targetInFaction) {
            throw new \InvalidArgumentException('Bạn đã tham gia một bang hội khác.');
        }

        if ($faction->members()->count() >= $faction->max_members) {
            throw new \InvalidArgumentException('Bang hội đã đạt tối đa số lượng thành viên.');
        }

        $pending = FactionInvitation::where('faction_id', $faction->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($pending) {
            throw new \InvalidArgumentException('Yêu cầu gia nhập của bạn đang chờ phê duyệt.');
        }

        return FactionInvitation::create([
            'faction_id' => $faction->id,
            'user_id' => $user->id,
            'type' => 'request',
            'status' => 'pending',
            'created_by' => $user->username,
        ]);
    }

    /**
     * Respond to an invitation or join request.
     */
    public function respondToInvitation(FactionInvitation $invitation, bool $accept, ?User $actor = null): bool
    {
        if ($invitation->status !== 'pending') {
            return false;
        }

        $faction = $invitation->faction;
        $targetUser = $invitation->user;

        if ($accept) {
            if ($faction->members()->count() >= $faction->max_members) {
                throw new \InvalidArgumentException('Bang hội đã đầy thành viên.');
            }

            // Check again if user is in another faction
            if (FactionMember::where('user_id', $targetUser->id)->exists()) {
                $invitation->update(['status' => 'cancelled']);
                throw new \InvalidArgumentException('Người chơi đã ở trong một bang hội khác.');
            }

            DB::transaction(function () use ($invitation, $faction, $targetUser) {
                $invitation->update(['status' => 'accepted']);

                FactionMember::create([
                    'faction_id' => $faction->id,
                    'user_id' => $targetUser->id,
                    'username' => $targetUser->username,
                    'role' => 'member',
                    'contribution_points' => 0,
                    'joined_at' => now(),
                ]);

                // Cancel all other pending invitations for this user
                FactionInvitation::where('user_id', $targetUser->id)
                    ->where('id', '!=', $invitation->id)
                    ->where('status', 'pending')
                    ->update(['status' => 'cancelled']);
            });

            $this->exportFactionConfig();

            return true;
        } else {
            $invitation->update(['status' => 'rejected']);

            return true;
        }
    }

    /**
     * Kick a member from a faction.
     */
    public function kickMember(Faction $faction, int $targetUserId, User $actor): bool
    {
        if (! $faction->isOfficer($actor->id)) {
            throw new \InvalidArgumentException('Bạn không có quyền kick thành viên.');
        }

        $targetMember = FactionMember::where('faction_id', $faction->id)
            ->where('user_id', $targetUserId)
            ->first();

        if (! $targetMember) {
            return false;
        }

        if ($targetMember->role === 'leader') {
            throw new \InvalidArgumentException('Không thể kick Chủ bang.');
        }

        if ($targetMember->role === 'officer' && ! $faction->isLeader($actor->id)) {
            throw new \InvalidArgumentException('Chỉ Chủ bang mới có quyền kick Phó bang.');
        }

        $targetMember->delete();
        $this->exportFactionConfig();

        return true;
    }

    /**
     * Set a member's role (officer, member).
     */
    public function setRole(Faction $faction, int $targetUserId, string $newRole, User $actor): bool
    {
        if (! $faction->isLeader($actor->id)) {
            throw new \InvalidArgumentException('Chỉ Chủ bang mới có quyền phong chức.');
        }

        if (! in_array($newRole, ['officer', 'member'], true)) {
            throw new \InvalidArgumentException('Quyền hạn không hợp lệ.');
        }

        $targetMember = FactionMember::where('faction_id', $faction->id)
            ->where('user_id', $targetUserId)
            ->first();

        if (! $targetMember || $targetMember->role === 'leader') {
            return false;
        }

        $targetMember->update(['role' => $newRole]);

        return true;
    }

    /**
     * Leave a faction.
     */
    public function leaveFaction(Faction $faction, User $user): bool
    {
        $member = FactionMember::where('faction_id', $faction->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $member) {
            return false;
        }

        if ($member->role === 'leader') {
            throw new \InvalidArgumentException('Chủ bang không thể rời bang. Hãy chuyển chức Chủ bang hoặc giải tán bang.');
        }

        $member->delete();
        $this->exportFactionConfig();

        return true;
    }

    /**
     * Disband a faction.
     */
    public function disbandFaction(Faction $faction, User $actor): bool
    {
        if (! $faction->isLeader($actor->id) && $actor->role->value !== 'super_admin' && $actor->role->value !== 'admin') {
            throw new \InvalidArgumentException('Chỉ Chủ bang hoặc Quản trị viên mới có quyền giải tán bang.');
        }

        $faction->delete();
        $this->exportFactionConfig();

        return true;
    }

    /**
     * Export all factions and territories to JSON file for Lua bridge.
     */
    public function exportFactionConfig(): bool
    {
        try {
            $factions = Faction::with(['members', 'territories'])->get();

            $exportList = [];
            $allTerritories = [];

            foreach ($factions as $f) {
                $membersList = $f->members->pluck('username')->all();

                $exportList[] = [
                    'id' => $f->id,
                    'name' => $f->name,
                    'tag' => $f->tag,
                    'color' => $f->color,
                    'members' => $membersList,
                ];

                foreach ($f->territories as $t) {
                    $allTerritories[] = [
                        'id' => $t->id,
                        'faction_id' => $f->id,
                        'faction_name' => $f->name,
                        'faction_tag' => $f->tag,
                        'name' => $t->name,
                        'x1' => $t->x1,
                        'y1' => $t->y1,
                        'x2' => $t->x2,
                        'y2' => $t->y2,
                        'z' => $t->z,
                        'color' => $t->color ?: $f->color,
                        'is_safe_house' => $t->is_safe_house,
                    ];
                }
            }

            $payload = [
                'updated_at' => time(),
                'factions' => $exportList,
                'territories' => $allTerritories,
            ];

            return JsonFile::writeAtomic($this->configPath, $payload);
        } catch (\Throwable $e) {
            Log::warning('Failed to export faction config to Lua bridge', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
