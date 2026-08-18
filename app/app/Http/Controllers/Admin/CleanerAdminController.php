<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CleanerLog;
use App\Services\CleanerManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CleanerAdminController extends Controller
{
    public function __construct(
        private readonly CleanerManager $cleanerManager,
    ) {}

    public function index(Request $request): Response
    {
        $this->cleanerManager->syncCleanerResults();

        $logs = CleanerLog::orderByDesc('created_at')->paginate(20);

        $stats = [
            'total_cleanups' => CleanerLog::count(),
            'total_bodies_removed' => CleanerLog::where('clean_type', 'dead_bodies')->sum('items_removed'),
            'total_items_removed' => CleanerLog::where('clean_type', 'ground_items')->sum('items_removed'),
        ];

        return Inertia::render('admin/cleaner', [
            'logs' => $logs,
            'stats' => $stats,
        ]);
    }

    public function cleanBodies(Request $request): RedirectResponse
    {
        $this->cleanerManager->triggerCleanDeadBodies(triggeredBy: 'admin_manual');

        return back()->with('success', 'Đã gửi lệnh dọn dẹp xác Zombie trên các khu vực đang nạp!');
    }

    public function cleanItems(Request $request): RedirectResponse
    {
        $this->cleanerManager->triggerCleanGroundItems(triggeredBy: 'admin_manual');

        return back()->with('success', 'Đã gửi lệnh dọn dẹp rác vật phẩm rơi vãi trên mặt đất!');
    }
}
