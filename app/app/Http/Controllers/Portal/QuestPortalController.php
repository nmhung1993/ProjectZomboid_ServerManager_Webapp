<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Bounty;
use App\Models\Quest;
use App\Models\Wallet;
use App\Services\BountyManager;
use App\Services\QuestManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QuestPortalController extends Controller
{
    public function __construct(
        private readonly QuestManager $questManager,
        private readonly BountyManager $bountyManager,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $playerQuests = $this->questManager->syncAndGetPlayerQuests($user);

        $activeBounties = Bounty::with('creator:id,username')
            ->where('status', 'active')
            ->orderByDesc('reward_amount')
            ->get()
            ->map(fn (Bounty $b) => [
                'id' => $b->id,
                'target_username' => $b->target_username,
                'creator' => $b->creator?->username ?? 'Server / Admin',
                'is_mine' => $b->creator_id === $user->id,
                'reward_amount' => (float) $b->reward_amount,
                'reason' => $b->reason,
                'created_at' => $b->created_at->toISOString(),
            ]);

        $claimedBounties = Bounty::where('status', 'claimed')
            ->orderByDesc('claimed_at')
            ->take(15)
            ->get()
            ->map(fn (Bounty $b) => [
                'id' => $b->id,
                'target_username' => $b->target_username,
                'hunter_username' => $b->hunter_username,
                'reward_amount' => (float) $b->reward_amount,
                'claimed_at' => $b->claimed_at?->toISOString(),
            ]);

        $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);

        return Inertia::render('portal/quests/index', [
            'quests' => $playerQuests,
            'active_bounties' => $activeBounties,
            'claimed_bounties' => $claimedBounties,
            'wallet_balance' => (float) $wallet->balance,
        ]);
    }

    public function claimReward(Request $request, Quest $quest): RedirectResponse
    {
        try {
            $this->questManager->claimReward($request->user(), $quest->id);

            return back()->with('success', "Đã nhận {$quest->reward_coins} coins phần thưởng nhiệm vụ!");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function storeBounty(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'target_username' => ['required', 'string', 'min:2', 'max:50'],
            'reward_amount' => ['required', 'numeric', 'min:50'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $this->bountyManager->createBounty(
                creator: $request->user(),
                targetUsername: $validated['target_username'],
                amount: (float) $validated['reward_amount'],
                reason: $validated['reason'] ?? null,
            );

            return back()->with('success', "Đã phát lệnh truy nã người chơi {$validated['target_username']}!");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function cancelBounty(Request $request, Bounty $bounty): RedirectResponse
    {
        try {
            $this->bountyManager->cancelBounty($bounty->id, $request->user());

            return back()->with('success', 'Đã hủy lệnh truy nã và hoàn tiền về ví.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
