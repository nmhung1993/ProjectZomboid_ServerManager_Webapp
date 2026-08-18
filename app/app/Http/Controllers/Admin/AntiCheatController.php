<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AntiCheatViolation;
use App\Services\AntiCheatManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AntiCheatController extends Controller
{
    public function __construct(
        private readonly AntiCheatManager $antiCheatManager,
    ) {}

    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $player = $request->query('player');

        $query = AntiCheatViolation::query()->latest('occurred_at');

        if ($status && in_array($status, ['flagged', 'resolved', 'dismissed', 'punished'], true)) {
            $query->where('status', $status);
        }

        if ($player) {
            $query->where('username', 'like', "%{$player}%");
        }

        $violations = $query->paginate(20)->withQueryString();

        $stats = [
            'total' => AntiCheatViolation::count(),
            'flagged' => AntiCheatViolation::where('status', 'flagged')->count(),
            'today' => AntiCheatViolation::where('occurred_at', '>=', now()->startOfDay())->count(),
        ];

        return Inertia::render('admin/anticheat', [
            'violations' => $violations,
            'stats' => $stats,
            'filters' => [
                'status' => $status,
                'player' => $player,
            ],
        ]);
    }

    public function sync(): JsonResponse
    {
        $count = $this->antiCheatManager->importViolations();

        return response()->json([
            'message' => "Synced {$count} new anticheat violation(s).",
            'count' => $count,
        ]);
    }

    public function resolve(Request $request, AntiCheatViolation $violation): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:resolved,dismissed,punished'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $resolved = $this->antiCheatManager->resolveViolation(
            id: $violation->id,
            status: $validated['status'],
            note: $validated['note'] ?? null,
            resolvedBy: $request->user()?->username ?? 'admin',
        );

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Violation status updated.',
                'violation' => $resolved,
            ]);
        }

        return back()->with('success', 'Violation status updated.');
    }
}
