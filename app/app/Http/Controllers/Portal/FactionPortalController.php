<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Faction;
use App\Models\FactionInvitation;
use App\Models\FactionMember;
use App\Models\FactionTerritory;
use App\Models\User;
use App\Models\Wallet;
use App\Services\FactionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FactionPortalController extends Controller
{
    public function __construct(
        private readonly FactionManager $factionManager,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $myMember = FactionMember::with('faction.members', 'faction.territories')
            ->where('user_id', $user->id)
            ->first();

        $myFaction = $myMember?->faction;

        $factions = Faction::withCount('members')
            ->with(['leader:id,username'])
            ->orderByDesc('bank_balance')
            ->get()
            ->map(fn (Faction $f) => [
                'id' => $f->id,
                'name' => $f->name,
                'tag' => $f->tag,
                'description' => $f->description,
                'color' => $f->color,
                'leader' => $f->leader?->username,
                'members_count' => $f->members_count,
                'max_members' => $f->max_members,
                'bank_balance' => $f->bank_balance,
                'territories_count' => $f->territories()->count(),
                'created_at' => $f->created_at->toISOString(),
            ]);

        // User invitations & requests
        $myInvitations = FactionInvitation::with('faction')
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->get();

        $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);

        return Inertia::render('portal/factions/index', [
            'my_faction' => $myFaction ? [
                'id' => $myFaction->id,
                'name' => $myFaction->name,
                'tag' => $myFaction->tag,
                'description' => $myFaction->description,
                'color' => $myFaction->color,
                'role' => $myMember->role,
                'bank_balance' => $myFaction->bank_balance,
                'members_count' => $myFaction->members->count(),
                'territories_count' => $myFaction->territories->count(),
            ] : null,
            'factions' => $factions,
            'my_invitations' => $myInvitations,
            'wallet_balance' => (float) $wallet->balance,
        ]);
    }

    public function show(Request $request, Faction $faction): Response
    {
        $user = $request->user();
        $myMember = FactionMember::where('faction_id', $faction->id)
            ->where('user_id', $user->id)
            ->first();

        $members = $faction->members()
            ->with('user:id,username,created_at')
            ->orderByRaw("CASE role WHEN 'leader' THEN 1 WHEN 'officer' THEN 2 ELSE 3 END")
            ->get()
            ->map(fn (FactionMember $m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'username' => $m->username,
                'role' => $m->role,
                'contribution_points' => (float) $m->contribution_points,
                'joined_at' => $m->joined_at?->toISOString(),
            ]);

        $territories = $faction->territories()->get();

        $isOfficer = $myMember && in_array($myMember->role, ['leader', 'officer'], true);
        $isLeader = $myMember && $myMember->role === 'leader';

        $pendingRequests = [];
        if ($isOfficer) {
            $pendingRequests = FactionInvitation::with('user:id,username')
                ->where('faction_id', $faction->id)
                ->where('type', 'request')
                ->where('status', 'pending')
                ->get();
        }

        $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);

        return Inertia::render('portal/factions/show', [
            'faction' => [
                'id' => $faction->id,
                'name' => $faction->name,
                'tag' => $faction->tag,
                'description' => $faction->description,
                'color' => $faction->color,
                'leader_id' => $faction->leader_id,
                'bank_balance' => (float) $faction->bank_balance,
                'max_members' => $faction->max_members,
                'created_at' => $faction->created_at->toISOString(),
            ],
            'members' => $members,
            'territories' => $territories,
            'my_role' => $myMember?->role,
            'is_officer' => $isOfficer,
            'is_leader' => $isLeader,
            'pending_requests' => $pendingRequests,
            'wallet_balance' => (float) $wallet->balance,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:50', 'unique:factions,name'],
            'tag' => ['required', 'string', 'min:2', 'max:8', 'regex:/^[A-Za-z0-9]+$/', 'unique:factions,tag'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
        ]);

        try {
            $faction = $this->factionManager->createFaction(
                leader: $request->user(),
                name: $validated['name'],
                tag: $validated['tag'],
                description: $validated['description'] ?? null,
                color: $validated['color'] ?? '#3b82f6',
            );

            return redirect()->route('portal.factions.show', $faction)
                ->with('success', 'Đã thành lập Bang hội thành công!');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function deposit(Request $request, Faction $faction): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        try {
            $this->factionManager->depositBank($faction, $request->user(), (float) $validated['amount']);

            return back()->with('success', 'Đã nạp tiền vào quỹ bang thành công!');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function claimTerritory(Request $request, Faction $faction): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'x1' => ['required', 'integer'],
            'y1' => ['required', 'integer'],
            'x2' => ['required', 'integer'],
            'y2' => ['required', 'integer'],
            'z' => ['nullable', 'integer'],
            'color' => ['nullable', 'string'],
        ]);

        if (! $faction->isOfficer($request->user()->id)) {
            return back()->withErrors(['error' => 'Chỉ Ban quản trị bang mới có quyền claim lãnh địa.']);
        }

        $this->factionManager->claimTerritory(
            faction: $faction,
            name: $validated['name'],
            x1: (int) $validated['x1'],
            y1: (int) $validated['y1'],
            x2: (int) $validated['x2'],
            y2: (int) $validated['y2'],
            z: (int) ($validated['z'] ?? 0),
            color: $validated['color'] ?? null,
        );

        return back()->with('success', 'Đã thiết lập căn cứ lãnh địa thành công!');
    }

    public function deleteTerritory(Request $request, Faction $faction, FactionTerritory $territory): RedirectResponse
    {
        if (! $faction->isOfficer($request->user()->id)) {
            return back()->withErrors(['error' => 'Không có quyền xóa lãnh địa.']);
        }

        if ($territory->faction_id !== $faction->id) {
            return back()->withErrors(['error' => 'Lãnh địa không thuộc bang này.']);
        }

        $this->factionManager->deleteTerritory($territory->id);

        return back()->with('success', 'Đã xóa lãnh địa căn cứ.');
    }

    public function requestJoin(Request $request, Faction $faction): RedirectResponse
    {
        try {
            $this->factionManager->requestToJoin($faction, $request->user());

            return back()->with('success', 'Đã gửi yêu cầu gia nhập bang hội!');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function invite(Request $request, Faction $faction): RedirectResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'exists:users,username'],
        ]);

        $targetUser = User::where('username', $validated['username'])->firstOrFail();

        try {
            $this->factionManager->inviteUser($faction, $request->user(), $targetUser);

            return back()->with('success', "Đã gửi lời mời tới người chơi {$targetUser->username}!");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function respondInvitation(Request $request, FactionInvitation $invitation): RedirectResponse
    {
        $validated = $request->validate([
            'accept' => ['required', 'boolean'],
        ]);

        try {
            $this->factionManager->respondToInvitation($invitation, (bool) $validated['accept'], $request->user());

            $msg = $validated['accept'] ? 'Đã đồng ý gia nhập bang hội!' : 'Đã từ chối lời mời/yêu cầu.';

            return back()->with('success', $msg);
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function kick(Request $request, Faction $faction, int $userId): RedirectResponse
    {
        try {
            $this->factionManager->kickMember($faction, $userId, $request->user());

            return back()->with('success', 'Đã xóa thành viên khỏi bang.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function setRole(Request $request, Faction $faction, int $userId): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:officer,member'],
        ]);

        try {
            $this->factionManager->setRole($faction, $userId, $validated['role'], $request->user());

            return back()->with('success', 'Đã cập nhật chức vụ thành viên!');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function leave(Request $request, Faction $faction): RedirectResponse
    {
        try {
            $this->factionManager->leaveFaction($faction, $request->user());

            return redirect()->route('portal.factions.index')->with('success', 'Bạn đã rời khỏi bang hội.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function disband(Request $request, Faction $faction): RedirectResponse
    {
        try {
            $this->factionManager->disbandFaction($faction, $request->user());

            return redirect()->route('portal.factions.index')->with('success', 'Đã giải tán bang hội.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
