<?php

namespace App\Services;

use App\Models\Bounty;
use App\Models\GameEvent;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class BountyManager
{
    public function __construct(
        private readonly ?DiscordWebhookService $discord = null,
    ) {}

    /**
     * Place a bounty on a player.
     */
    public function createBounty(User $creator, string $targetUsername, float $amount, ?string $reason = null): Bounty
    {
        $targetUsername = trim($targetUsername);

        if (strcasecmp($creator->username, $targetUsername) === 0) {
            throw new \InvalidArgumentException('Bạn không thể tự đặt tiền truy nã chính mình.');
        }

        if ($amount < 50) {
            throw new \InvalidArgumentException('Số tiền thưởng tối thiểu là 50.');
        }

        return DB::transaction(function () use ($creator, $targetUsername, $amount, $reason) {
            $wallet = Wallet::firstOrCreate(['user_id' => $creator->id], ['balance' => 0]);

            if ($wallet->balance < $amount) {
                throw new \InvalidArgumentException('Số dư trong ví không đủ để đặt lệnh truy nã.');
            }

            $wallet->decrement('balance', $amount);
            $wallet->increment('total_spent', $amount);

            $targetUser = User::where('username', $targetUsername)->first();

            $bounty = Bounty::create([
                'target_username' => $targetUsername,
                'target_user_id' => $targetUser?->id,
                'creator_id' => $creator->id,
                'reward_amount' => $amount,
                'reason' => $reason ?: 'Gây rối trật tự / PK',
                'status' => 'active',
            ]);

            GameEvent::create([
                'event_type' => 'bounty_created',
                'player' => $creator->username,
                'target' => $targetUsername,
                'details' => [
                    'bounty_id' => $bounty->id,
                    'reward' => $amount,
                    'reason' => $reason,
                ],
            ]);

            return $bounty;
        });
    }

    /**
     * Process PvP kill event and reward hunters if target has active bounties.
     */
    public function processPvpKill(string $killerUsername, string $victimUsername): int
    {
        $activeBounties = Bounty::whereRaw('LOWER(target_username) = ?', [strtolower(trim($victimUsername))])
            ->where('status', 'active')
            ->get();

        if ($activeBounties->isEmpty()) {
            return 0;
        }

        $hunterUser = User::where('username', $killerUsername)->first();
        $claimedCount = 0;

        foreach ($activeBounties as $bounty) {
            DB::transaction(function () use ($bounty, $killerUsername, $hunterUser, &$claimedCount) {
                $bounty->update([
                    'status' => 'claimed',
                    'hunter_username' => $killerUsername,
                    'hunter_user_id' => $hunterUser?->id,
                    'claimed_at' => now(),
                ]);

                if ($hunterUser) {
                    $wallet = Wallet::firstOrCreate(['user_id' => $hunterUser->id], ['balance' => 0]);
                    $wallet->increment('balance', $bounty->reward_amount);
                    $wallet->increment('total_earned', $bounty->reward_amount);
                }

                GameEvent::create([
                    'event_type' => 'bounty_claimed',
                    'player' => $killerUsername,
                    'target' => $bounty->target_username,
                    'details' => [
                        'bounty_id' => $bounty->id,
                        'reward' => $bounty->reward_amount,
                    ],
                ]);

                $claimedCount++;
            });
        }

        return $claimedCount;
    }

    /**
     * Cancel an active bounty and refund the creator.
     */
    public function cancelBounty(int $bountyId, User $actor): bool
    {
        $bounty = Bounty::find($bountyId);
        if (! $bounty || $bounty->status !== 'active') {
            return false;
        }

        $isAdmin = in_array($actor->role->value ?? '', ['super_admin', 'admin'], true);
        if ($bounty->creator_id !== $actor->id && ! $isAdmin) {
            throw new \InvalidArgumentException('Bạn không có quyền hủy lệnh truy nã này.');
        }

        return DB::transaction(function () use ($bounty) {
            $bounty->update(['status' => 'cancelled']);

            if ($bounty->creator_id) {
                $wallet = Wallet::firstOrCreate(['user_id' => $bounty->creator_id], ['balance' => 0]);
                $wallet->increment('balance', $bounty->reward_amount);
            }

            return true;
        });
    }
}
