<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\PlayerAchievement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AchievementAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $achievements = Achievement::withCount([
            'playerAchievements as total_unlocked' => fn ($q) => $q->where('is_completed', true),
        ])->get();

        $stats = [
            'total_achievements' => Achievement::count(),
            'total_unlocked_count' => PlayerAchievement::where('is_completed', true)->count(),
            'total_rewards_claimed' => PlayerAchievement::where('is_reward_claimed', true)->count(),
        ];

        return Inertia::render('admin/achievements', [
            'achievements' => $achievements,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:combat,pvp,survival,economy,exploration'],
            'metric_type' => ['required', 'string', 'in:zombie_kills,pvp_kills,survived_hours,total_coins,completed_quests,claimed_vehicles'],
            'target_value' => ['required', 'integer', 'min:1'],
            'reward_coins' => ['required', 'numeric', 'min:0'],
            'reward_title' => ['nullable', 'string', 'max:50'],
        ]);

        $validated['slug'] = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $validated['title'])) . '_' . uniqid();

        Achievement::create($validated);

        return back()->with('success', 'Đã tạo thành tích mới thành công!');
    }

    public function destroy(Request $request, Achievement $achievement): RedirectResponse
    {
        $achievement->delete();

        return back()->with('success', 'Đã xóa thành tích.');
    }
}
