<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WorldEvent;
use App\Services\WorldEventManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorldEventAdminController extends Controller
{
    public function __construct(
        private readonly WorldEventManager $eventManager,
    ) {}

    public function index(Request $request): Response
    {
        $this->eventManager->processExpiredEvents();
        $this->eventManager->syncResultsFromBridge();

        $events = WorldEvent::with('lootedByUser:id,username')
            ->orderByDesc('created_at')
            ->paginate(20);

        $stats = [
            'total_events' => WorldEvent::count(),
            'active_events' => WorldEvent::where('status', 'active')->count(),
            'looted_events' => WorldEvent::where('status', 'looted')->count(),
            'total_rewards_paid' => (float) WorldEvent::where('status', 'looted')->sum('reward_coins'),
        ];

        return Inertia::render('admin/events', [
            'events' => $events,
            'stats' => $stats,
        ]);
    }

    public function spawnAirdrop(Request $request): RedirectResponse
    {
        $event = $this->eventManager->spawnRandomAirdrop();

        return back()->with('success', "Đã thả thùng hàng cứu trợ Airdrop thành công tại {$event->location_name}!");
    }

    public function spawnHeliCrash(Request $request): RedirectResponse
    {
        $event = $this->eventManager->spawnHeliCrash();

        return back()->with('success', "Đã kích hoạt hiện trường Trực thăng Rơi tại {$event->location_name}!");
    }

    public function cancel(Request $request, WorldEvent $event): RedirectResponse
    {
        $this->eventManager->cancelEvent($event->id);

        return back()->with('success', 'Đã hủy sự kiện thế giới.');
    }
}
