<?php

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('renders portal vehicles page with player claimed vehicles', function () {
    Vehicle::factory()->create([
        'owner_username' => $this->user->username,
        'owner_user_id' => $this->user->id,
        'is_claimed' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('portal.vehicles.index'));

    $response->assertOk();
});
