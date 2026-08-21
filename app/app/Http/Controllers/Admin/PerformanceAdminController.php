<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DeathHeatmapManager;
use App\Services\PerformanceManager;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PerformanceAdminController extends Controller
{
    public function __construct(
        private readonly PerformanceManager $performanceManager,
        private readonly DeathHeatmapManager $heatmapManager,
    ) {}

    public function index(Request $request): Response
    {
        $this->performanceManager->syncPerformanceSnapshot();

        $health = $this->performanceManager->getHealthSummary();
        $history = $this->performanceManager->getPerformanceHistory(hours: 24);
        $hotspots = $this->heatmapManager->getDangerHotspots(limit: 5);

        return Inertia::render('admin/performance', [
            'health' => $health,
            'history' => $history,
            'hotspots' => $hotspots,
        ]);
    }
}
