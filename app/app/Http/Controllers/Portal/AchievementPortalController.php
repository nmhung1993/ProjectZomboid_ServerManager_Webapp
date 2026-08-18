<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\PlayerAchievement;
use App\Models\Wallet;
use App\Services\AchievementManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AchievementPortalController extends Controller
{
    public function __construct(
        private readonly AchievementManager $achievementManager,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $this->achievementManager->syncPlayerAchievements($user);

        $achievements = Achievement::all()->map(function (Achievement $ach) use ($user) {
            $pa = PlayerAchievement::where('user_id', $user->id)
                ->where('achievement_id', $ach->id)
                ->first();

            $progress = $pa?->progress ?? 0;
            $isCompleted = $pa?->is_completed ?? false;
            $isClaimed = $pa?->is_reward_claimed ?? false;
            $percent = $ach->target_value > 0 ? min(100, round(($progress / $ach->target_value) * 100)) : 0;

            return [
                'id' => $ach->id,
                'slug' => $ach->slug,
                'title' => $ach->title,
                'description' => $ach->description,
                'category' => $ach->category,
                'icon' => $ach->icon,
                'metric_type' => $ach->metric_type,
                'target_value' => $ach->target_value,
                'reward_coins' => (float) $ach->reward_coins,
                'reward_title' => $ach->reward_title,
                'progress' => $progress,
                'percent' => $percent,
                'is_completed' => $isCompleted,
                'is_reward_claimed' => $isClaimed,
                'completed_at' => $pa?->completed_at?->toISOString(),
            ];
        });

        $unlockedTitles = $this->achievementManager->getUserUnlockedTitles($user);
        $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);

        return Inertia::render('portal/achievements/index', [
            'achievements' => $achievements,
            'unlocked_titles' => $unlockedTitles,
            'active_title' => $user->active_title,
            'wallet_balance' => (float) $wallet->balance,
        ]);
    }

    public function claim(Request $request, Achievement $achievement): RedirectResponse
    {
        try {
            $this->achievementManager->claimReward($request->user(), $achievement->id);

            return back()->with('success', "Đã nhận thưởng thành công: +{$achievement->reward_coins} Coins!");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function equip(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:50'],
        ]);

        try {
            $this->achievementManager->equipTitle($request->user(), $validated['title'] ?? null);

            return back()->with('success', ! empty($validated['title']) ? "Đã trang bị danh hiệu {$validated['title']}!" : 'Đã gỡ danh hiệu.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
