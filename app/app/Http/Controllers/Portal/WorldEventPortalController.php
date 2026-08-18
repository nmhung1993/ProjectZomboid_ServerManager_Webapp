<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\WorldEvent;
use App\Services\WorldEventManager;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorldEventPortalController extends Controller
{
    public function __construct(
        private readonly WorldEventManager $eventManager,
    ) {}

    public function index(Request $request): Response
    {
        $this->eventManager->processExpiredEvents();
        $this->eventManager->syncResultsFromBridge();

        $activeEvents = WorldEvent::where('status', 'active')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (WorldEvent $e) => [
                'id' => $e->id,
                'event_type' => $e->event_type,
                'title' => $e->title,
                'description' => $e->description,
                'location_name' => $e->location_name,
                'x' => $e->x,
                'y' => $e->y,
                'z' => $e->z,
                'radius' => $e->radius,
                'loot_items' => $e->loot_items ?? [],
                'reward_coins' => (float) $e->reward_coins,
                'expires_at' => $e->expires_at?->toISOString(),
                'created_at' => $e->created_at->toISOString(),
            ]);

        $recentLooted = WorldEvent::where('status', 'looted')
            ->orderByDesc('looted_at')
            ->limit(10)
            ->get()
            ->map(fn (WorldEvent $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'event_type' => $e->event_type,
                'looted_by_username' => $e->looted_by_username,
                'reward_coins' => (float) $e->reward_coins,
                'looted_at' => $e->looted_at?->toISOString(),
            ]);

        return Inertia::render('portal/events/index', [
            'active_events' => $activeEvents,
            'recent_looted' => $recentLooted,
        ]);
    }
}
