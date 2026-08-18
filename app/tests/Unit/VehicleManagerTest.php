<?php

use App\Models\User;
use App\Models\Vehicle;
use App\Services\VehicleManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->vehiclesFile = sys_get_temp_dir() . '/test_vehicles_' . uniqid() . '.json';
    $this->commandsFile = sys_get_temp_dir() . '/test_veh_cmds_' . uniqid() . '.json';
    $this->manager = new VehicleManager($this->vehiclesFile, $this->commandsFile);
});

afterEach(function () {
    @unlink($this->vehiclesFile);
    @unlink($this->commandsFile);
});

it('syncs vehicles from exported JSON and links to users', function () {
    $user = User::factory()->create(['username' => 'survivor_dan']);

    $mockData = [
        'timestamp' => time(),
        'count' => 2,
        'vehicles' => [
            [
                'sql_id' => 101,
                'name' => 'Chevalier Nyala',
                'model' => 'Base.CarLuxury',
                'owner' => 'survivor_dan',
                'is_claimed' => true,
                'x' => 7000.5,
                'y' => 8000.2,
                'z' => 0,
                'engine_condition' => 85.0,
                'fuel_level' => 70.0,
                'battery_charge' => 95.0,
            ],
            [
                'sql_id' => 102,
                'name' => 'Franklin Valuline',
                'model' => 'Base.Van',
                'owner' => null,
                'is_claimed' => false,
                'x' => 7100.0,
                'y' => 8200.0,
                'z' => 0,
                'engine_condition' => 15.0,
                'fuel_level' => 10.0,
                'battery_charge' => 30.0,
            ],
        ],
    ];

    file_put_contents($this->vehiclesFile, json_encode($mockData));

    $count = $this->manager->syncVehiclesFromJson();

    expect($count)->toBe(2);

    $v1 = Vehicle::where('sql_id', 101)->first();
    expect($v1)->not->toBeNull()
        ->and($v1->owner_username)->toBe('survivor_dan')
        ->and($v1->owner_user_id)->toBe($user->id)
        ->and($v1->is_claimed)->toBeTrue();
});

it('repairs vehicle and enqueues command', function () {
    $vehicle = Vehicle::factory()->create([
        'sql_id' => 205,
        'engine_condition' => 20,
        'fuel_level' => 5,
    ]);

    $res = $this->manager->repairVehicle(205);

    expect($res)->toBeTrue();

    $vehicle->refresh();
    expect((float) $vehicle->engine_condition)->toBe(100.0)
        ->and((float) $vehicle->fuel_level)->toBe(100.0);

    $cmds = json_decode(file_get_contents($this->commandsFile), true);
    expect($cmds['actions'])->toHaveCount(1)
        ->and($cmds['actions'][0]['action'])->toBe('repair')
        ->and($cmds['actions'][0]['sql_id'])->toBe(205);
});

it('unclaims vehicle and enqueues unclaim command', function () {
    $user = User::factory()->create();
    $vehicle = Vehicle::factory()->create([
        'sql_id' => 309,
        'is_claimed' => true,
        'owner_username' => $user->username,
        'owner_user_id' => $user->id,
    ]);

    $res = $this->manager->unclaimVehicle(309);

    expect($res)->toBeTrue();

    $vehicle->refresh();
    expect($vehicle->is_claimed)->toBeFalse()
        ->and($vehicle->owner_username)->toBeNull();
});
