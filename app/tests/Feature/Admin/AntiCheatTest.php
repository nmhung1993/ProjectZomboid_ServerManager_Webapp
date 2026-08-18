<?php

use App\Models\AntiCheatViolation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

it('renders anticheat page for admins', function () {
    $this->withoutExceptionHandling();
    AntiCheatViolation::factory()->count(3)->create();

    $response = $this->actingAs($this->admin)
        ->get(route('admin.anticheat'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/anticheat')
            ->has('violations.data', 3)
            ->has('stats.total')
        );
});

it('resolves an anticheat violation via post endpoint', function () {
    $violation = AntiCheatViolation::factory()->create(['status' => 'flagged']);

    $response = $this->actingAs($this->admin)
        ->postJson(route('admin.anticheat.resolve', $violation), [
            'status' => 'resolved',
            'note' => 'Investigated and cleared',
        ]);

    $response->assertOk()
        ->assertJson([
            'message' => 'Violation status updated.',
        ]);

    expect($violation->fresh()->status)->toBe('resolved')
        ->and($violation->fresh()->resolution_note)->toBe('Investigated and cleared');
});

it('triggers manual sync via post endpoint', function () {
    $response = $this->actingAs($this->admin)
        ->postJson(route('admin.anticheat.sync'));

    $response->assertOk()
        ->assertJsonStructure([
            'message',
            'count',
        ]);
});
