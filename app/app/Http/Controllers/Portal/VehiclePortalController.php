<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Services\VehicleManager;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VehiclePortalController extends Controller
{
    public function __construct(
        private readonly VehicleManager $vehicleManager,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $this->vehicleManager->syncVehiclesFromJson();

        $vehicles = Vehicle::where('owner_username', $user->username)
            ->orWhere('owner_user_id', $user->id)
            ->orderByDesc('last_seen_at')
            ->get()
            ->map(fn (Vehicle $v) => [
                'id' => $v->id,
                'sql_id' => $v->sql_id,
                'name' => $v->name,
                'model' => $v->model,
                'x' => $v->x,
                'y' => $v->y,
                'z' => $v->z,
                'engine_condition' => (float) $v->engine_condition,
                'fuel_level' => (float) $v->fuel_level,
                'battery_charge' => (float) $v->battery_charge,
                'last_seen_at' => $v->last_seen_at?->toISOString(),
            ]);

        return Inertia::render('portal/vehicles/index', [
            'vehicles' => $vehicles,
        ]);
    }
}
