<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Faction;
use App\Models\FactionTerritory;
use App\Services\FactionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FactionAdminController extends Controller
{
    public function __construct(
        private readonly FactionManager $factionManager,
    ) {}

    public function index(Request $request): Response
    {
        $factions = Faction::with(['leader:id,username', 'members', 'territories'])
            ->withCount('members')
            ->orderByDesc('created_at')
            ->paginate(20);

        $stats = [
            'total_factions' => Faction::count(),
            'total_territories' => FactionTerritory::count(),
            'total_bank' => (float) Faction::sum('bank_balance'),
        ];

        return Inertia::render('admin/factions', [
            'factions' => $factions,
            'stats' => $stats,
        ]);
    }

    public function updateBank(Request $request, Faction $faction): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'bank_balance' => ['required', 'numeric', 'min:0'],
        ]);

        $faction->update(['bank_balance' => (float) $validated['bank_balance']]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Cập nhật quỹ bang thành công.']);
        }

        return back()->with('success', 'Cập nhật quỹ bang thành công.');
    }

    public function destroy(Request $request, Faction $faction): RedirectResponse
    {
        $this->factionManager->disbandFaction($faction, $request->user());

        return back()->with('success', "Đã giải tán bang hội {$faction->name}.");
    }

    public function sync(Request $request): RedirectResponse|JsonResponse
    {
        $this->factionManager->exportFactionConfig();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['message' => 'Đã xuất đồng bộ cấu hình bang hội sang game server.']);
        }

        return back()->with('success', 'Đã xuất đồng bộ cấu hình bang hội sang game server.');
    }
}
