<?php

use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->admin = User::factory()->admin()->create();
});

it('renders world events portal index', function () {
    WorldEvent::factory()->create([
        'title' => 'Airdrop Test',
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('portal.events.index'));

    $response->assertOk();
});

it('allows admin to spawn airdrop via admin panel', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.events.airdrop'));

    $response->assertRedirect();

    $event = WorldEvent::where('event_type', 'airdrop')->first();
    expect($event)->not->toBeNull()
        ->and($event->status)->toBe('active');
});

it('allows admin to cancel active event', function () {
    $event = WorldEvent::factory()->create(['status' => 'active']);

    $response = $this->actingAs($this->admin)
        ->post(route('admin.events.cancel', $event));

    $response->assertRedirect();

    expect($event->fresh()->status)->toBe('cancelled');
});
