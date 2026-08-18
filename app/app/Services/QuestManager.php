<?php

namespace App\Services;

use App\Models\PlayerQuest;
use App\Models\PlayerStat;
use App\Models\Quest;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

class QuestManager
{
    /**
     * Ensure all active quests are assigned to the user and progress is updated.
     */
    public function syncAndGetPlayerQuests(User $user): array
    {
        $activeQuests = Quest::where('is_active', true)->get();

        foreach ($activeQuests as $quest) {
            PlayerQuest::firstOrCreate([
                'quest_id' => $quest->id,
                'user_id' => $user->id,
            ], [
                'username' => $user->username,
                'current_progress' => 0,
                'is_completed' => false,
            ]);
        }

        $this->updateProgressForUser($user);

        return PlayerQuest::with('quest')
            ->where('user_id', $user->id)
            ->whereHas('quest', fn ($q) => $q->where('is_active', true))
            ->get()
            ->map(fn (PlayerQuest $pq) => [
                'id' => $pq->id,
                'quest_id' => $pq->quest_id,
                'title' => $pq->quest->title,
                'description' => $pq->quest->description,
                'type' => $pq->quest->type,
                'category' => $pq->quest->category,
                'target_count' => $pq->quest->target_count,
                'current_progress' => $pq->current_progress,
                'progress_percent' => min(100, (int) round(($pq->current_progress / max(1, $pq->quest->target_count)) * 100)),
                'reward_coins' => (float) $pq->quest->reward_coins,
                'reward_items' => $pq->quest->reward_items,
                'is_completed' => $pq->is_completed,
                'reward_claimed' => $pq->reward_claimed,
            ])
            ->all();
    }

    /**
     * Update quest progress based on player stats snapshot.
     */
    public function updateProgressForUser(User $user): void
    {
        $stats = PlayerStat::where('username', $user->username)->first();

        $playerQuests = PlayerQuest::with('quest')
            ->where('user_id', $user->id)
            ->where('is_completed', false)
            ->get();

        foreach ($playerQuests as $pq) {
            $quest = $pq->quest;
            if (! $quest || ! $quest->is_active) {
                continue;
            }

            $current = match ($quest->category) {
                'zombie_kills' => (int) ($stats->zombie_kills ?? 0),
                'survival_hours' => (int) ($stats->hours_survived ?? 0),
                'pvp_kills' => (int) ($stats->pvp_kills ?? 0),
                default => $pq->current_progress,
            };

            $isCompleted = $current >= $quest->target_count;

            $pq->update([
                'current_progress' => min($current, $quest->target_count),
                'is_completed' => $isCompleted,
                'completed_at' => $isCompleted ? now() : null,
            ]);
        }
    }

    /**
     * Claim quest reward for user.
     */
    public function claimReward(User $user, int $questId): bool
    {
        $pq = PlayerQuest::with('quest')
            ->where('user_id', $user->id)
            ->where('quest_id', $questId)
            ->where('is_completed', true)
            ->where('reward_claimed', false)
            ->first();

        if (! $pq) {
            throw new \InvalidArgumentException('Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng rồi.');
        }

        return DB::transaction(function () use ($user, $pq) {
            $pq->update([
                'reward_claimed' => true,
                'claimed_at' => now(),
            ]);

            $rewardCoins = (float) $pq->quest->reward_coins;
            if ($rewardCoins > 0) {
                $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);
                $wallet->increment('balance', $rewardCoins);
                $wallet->increment('total_earned', $rewardCoins);
            }

            return true;
        });
    }
}
