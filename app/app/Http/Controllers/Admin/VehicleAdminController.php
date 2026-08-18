<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Services\VehicleManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VehicleAdminController extends Controller
{
    public function __construct(
        private readonly VehicleManager $vehicleManager,
    ) {}

    public function index(Request $request): Response
    {
        $this->vehicleManager->syncVehiclesFromJson();

        $query = Vehicle::query()->orderByDesc('last_seen_at');

        $filter = $request->query('filter');
        if ($filter === 'claimed') {
            $query->where('is_claimed', true);
        } elseif ($filter === 'unclaimed') {
            $query->where('is_claimed', false);
        } elseif ($filter === 'broken') {
            $query->where('engine_condition', '<', 30);
        }

        $vehicles = $query->paginate(25)->withQueryString();

        $stats = [
            'total_vehicles' => Vehicle::count(),
            'claimed_vehicles' => Vehicle::where('is_claimed', true)->count(),
            'broken_vehicles' => Vehicle::where('engine_condition', '<', 30)->count(),
        ];

        return Inertia::render('admin/vehicles', [
            'vehicles' => $vehicles,
            'stats' => $stats,
            'currentFilter' => $filter ?? 'all',
        ]);
    }

    public function repair(Request $request, Vehicle $vehicle): RedirectResponse|JsonResponse
    {
        $this->vehicleManager->repairVehicle($vehicle->sql_id);

        if ($request->wantsJson()) {
            return response()->json(['message' => "Đã gửi lệnh sửa xe #{$vehicle->sql_id} 100%."]);
        }

        return back()->with('success', "Đã gửi lệnh sửa chữa xe #{$vehicle->sql_id} thành công!");
    }

    public function unclaim(Request $request, Vehicle $vehicle): RedirectResponse|JsonResponse
    {
        $this->vehicleManager->unclaimVehicle($vehicle->sql_id);

        if ($request->wantsJson()) {
            return response()->json(['message' => "Đã gỡ quyền sở hữu xe #{$vehicle->sql_id}."]);
        }

        return back()->with('success', "Đã gỡ quyền sở hữu của xe #{$vehicle->sql_id}.");
    }

    public function destroy(Request $request, Vehicle $vehicle): RedirectResponse|JsonResponse
    {
        $this->vehicleManager->deleteVehicle($vehicle->sql_id);

        if ($request->wantsJson()) {
            return response()->json(['message' => "Đã xóa xe #{$vehicle->sql_id}."]);
        }

        return back()->with('success', "Đã xóa dữ liệu xe #{$vehicle->sql_id}.");
    }

    public function cleanupBroken(): RedirectResponse
    {
        $broken = Vehicle::where('engine_condition', '<=', 5)->get();
        foreach ($broken as $v) {
            $this->vehicleManager->deleteVehicle($v->sql_id);
        }

        return back()->with('success', "Đã dọn dẹp {$broken->count()} xe hỏng nát (0%).");
    }
}
