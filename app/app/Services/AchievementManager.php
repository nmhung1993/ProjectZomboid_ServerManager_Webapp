<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\PlayerAchievement;
use App\Models\PlayerQuest;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AchievementManager
{
    /**
     * Sync and calculate achievements for a user.
     */
    public function syncPlayerAchievements(User $user): void
    {
        $achievements = Achievement::all();
        if ($achievements->isEmpty()) {
            return;
        }

        // Gather user metrics
        $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);
        $totalEarnedCoins = (int) ($wallet->total_earned ?? 0);
        $completedQuests = PlayerQuest::where('user_id', $user->id)->where('reward_claimed', true)->count();
        $claimedVehicles = Vehicle::where('owner_user_id', $user->id)->orWhere('owner_username', $user->username)->count();

        // Get player stats from PlayerStat model or default
        $player = \App\Models\PlayerStat::whereRaw('LOWER(username) = ?', [strtolower($user->username)])->first();
        $zombieKills = $player?->zombie_kills ?? 0;
        $survivedHours = (int) ($player?->hours_survived ?? 0);
        $pvpKills = \App\Models\DeathRecord::where('killer_username', $user->username)->count();

        foreach ($achievements as $ach) {
            $metricValue = match ($ach->metric_type) {
                'zombie_kills' => $zombieKills,
                'pvp_kills' => $pvpKills,
                'survived_hours' => $survivedHours,
                'total_coins' => $totalEarnedCoins,
                'completed_quests' => $completedQuests,
                'claimed_vehicles' => $claimedVehicles,
                default => 0,
            };

            $pa = PlayerAchievement::firstOrCreate([
                'user_id' => $user->id,
                'achievement_id' => $ach->id,
            ], [
                'progress' => 0,
                'is_completed' => false,
                'is_reward_claimed' => false,
            ]);

            $progress = min($ach->target_value, $metricValue);
            $isCompleted = ($metricValue >= $ach->target_value);

            $updates = ['progress' => $progress];
            if ($isCompleted && ! $pa->is_completed) {
                $updates['is_completed'] = true;
                $updates['completed_at'] = now();
            }

            $pa->update($updates);
        }
    }

    /**
     * Claim reward for a completed achievement.
     */
    public function claimReward(User $user, int $achievementId): PlayerAchievement
    {
        return DB::transaction(function () use ($user, $achievementId) {
            $pa = PlayerAchievement::with('achievement')
                ->where('user_id', $user->id)
                ->where('achievement_id', $achievementId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $pa->is_completed) {
                throw new InvalidArgumentException('Thành tích này chưa hoàn thành.');
            }

            if ($pa->is_reward_claimed) {
                throw new InvalidArgumentException('Phần thưởng này đã được nhận trước đó.');
            }

            $rewardCoins = (float) $pa->achievement->reward_coins;
            if ($rewardCoins > 0) {
                $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);
                $wallet->increment('balance', $rewardCoins);
                $wallet->increment('total_earned', $rewardCoins);
            }

            $pa->update([
                'is_reward_claimed' => true,
                'claimed_at' => now(),
            ]);

            return $pa;
        });
    }

    /**
     * Equip or unequip an unlocked title.
     */
    public function equipTitle(User $user, ?string $title): User
    {
        if ($title !== null && trim($title) !== '') {
            $unlocked = $this->getUserUnlockedTitles($user);
            if (! in_array($title, $unlocked, true)) {
                throw new InvalidArgumentException('Bạn chưa mở khóa danh hiệu này.');
            }
            $user->update(['active_title' => $title]);
        } else {
            $user->update(['active_title' => null]);
        }

        return $user->fresh();
    }

    /**
     * Get list of titles unlocked by a user.
     */
    public function getUserUnlockedTitles(User $user): array
    {
        return PlayerAchievement::where('user_id', $user->id)
            ->where('is_completed', true)
            ->with('achievement:id,reward_title')
            ->get()
            ->pluck('achievement.reward_title')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
