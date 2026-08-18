<?php

use App\Models\Faction;
use App\Models\FactionMember;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('creates a faction via portal', function () {
    $response = $this->actingAs($this->user)
        ->post(route('portal.factions.store'), [
            'name' => 'Rosewood Guards',
            'tag' => 'RWG',
            'description' => 'Defenders of Rosewood',
            'color' => '#10b981',
        ]);

    $faction = Faction::where('tag', 'RWG')->first();
    expect($faction)->not->toBeNull()
        ->and($faction->name)->toBe('Rosewood Guards')
        ->and($faction->leader_id)->toBe($this->user->id);

    $response->assertRedirect(route('portal.factions.show', $faction));
});

it('deposits into faction bank via portal', function () {
    $faction = Faction::factory()->create(['leader_id' => $this->user->id, 'bank_balance' => 0]);
    FactionMember::create([
        'faction_id' => $faction->id,
        'user_id' => $this->user->id,
        'username' => $this->user->username,
        'role' => 'leader',
    ]);

    Wallet::create(['user_id' => $this->user->id, 'balance' => 1000]);

    $response = $this->actingAs($this->user)
        ->post(route('portal.factions.deposit', $faction), [
            'amount' => 350,
        ]);

    $response->assertRedirect();
    expect((float) $faction->fresh()->bank_balance)->toBe(350.0);
});

it('claims a territory via portal', function () {
    $faction = Faction::factory()->create(['leader_id' => $this->user->id]);
    FactionMember::create([
        'faction_id' => $faction->id,
        'user_id' => $this->user->id,
        'username' => $this->user->username,
        'role' => 'leader',
    ]);

    $response = $this->actingAs($this->user)
        ->post(route('portal.factions.claim', $faction), [
            'name' => 'Main Bunker',
            'x1' => 8000,
            'y1' => 7000,
            'x2' => 8150,
            'y2' => 7150,
        ]);

    $response->assertRedirect();
    expect($faction->territories()->count())->toBe(1);
});
