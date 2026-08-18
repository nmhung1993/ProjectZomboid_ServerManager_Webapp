<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bounty;
use App\Models\PlayerQuest;
use App\Models\Quest;
use App\Services\BountyManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QuestAdminController extends Controller
{
    public function __construct(
        private readonly BountyManager $bountyManager,
    ) {}

    public function index(Request $request): Response
    {
        $quests = Quest::withCount('playerQuests')
            ->orderByDesc('created_at')
            ->get();

        $bounties = Bounty::with('creator:id,username')
            ->orderByDesc('created_at')
            ->paginate(20);

        $stats = [
            'total_quests' => Quest::count(),
            'active_quests' => Quest::where('is_active', true)->count(),
            'total_completions' => PlayerQuest::where('is_completed', true)->count(),
            'active_bounties' => Bounty::where('status', 'active')->count(),
            'total_bounty_pool' => (float) Bounty::where('status', 'active')->sum('reward_amount'),
        ];

        return Inertia::render('admin/quests', [
            'quests' => $quests,
            'bounties' => $bounties,
            'stats' => $stats,
        ]);
    }

    public function storeQuest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'type' => ['required', 'string', 'in:daily,weekly,achievement,custom'],
            'category' => ['required', 'string', 'in:zombie_kills,survival_hours,pvp_kills,custom'],
            'target_count' => ['required', 'integer', 'min:1'],
            'reward_coins' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        Quest::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'category' => $validated['category'],
            'target_count' => (int) $validated['target_count'],
            'reward_coins' => (float) $validated['reward_coins'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', 'Đã tạo nhiệm vụ mới thành công!');
    }

    public function destroyQuest(Request $request, Quest $quest): RedirectResponse
    {
        $quest->delete();

        return back()->with('success', 'Đã xóa nhiệm vụ.');
    }

    public function cancelBounty(Request $request, Bounty $bounty): RedirectResponse
    {
        $this->bountyManager->cancelBounty($bounty->id, $request->user());

        return back()->with('success', 'Đã hủy lệnh truy nã và hoàn tiền.');
    }
}
