<?php

use App\Models\Faction;
use App\Models\FactionInvitation;
use App\Models\FactionMember;
use App\Models\FactionTerritory;
use App\Models\User;
use App\Models\Wallet;
use App\Services\FactionManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->tempDir = sys_get_temp_dir().'/pz_faction_test_'.uniqid();
    mkdir($this->tempDir, 0777, true);
    $this->configPath = $this->tempDir.'/faction_config.json';
    $this->manager = new FactionManager($this->configPath);
});

afterEach(function () {
    if (file_exists($this->configPath)) {
        @unlink($this->configPath);
    }
    if (is_dir($this->tempDir)) {
        @rmdir($this->tempDir);
    }
});

it('creates a faction with the leader as first member', function () {
    $user = User::factory()->create();

    $faction = $this->manager->createFaction(
        leader: $user,
        name: 'Survivors Alliance',
        tag: 'SA',
        description: 'We survive together',
        color: '#22c55e'
    );

    expect($faction->name)->toBe('Survivors Alliance')
        ->and($faction->tag)->toBe('SA')
        ->and($faction->leader_id)->toBe($user->id);

    expect(FactionMember::count())->toBe(1);
    $member = FactionMember::first();
    expect($member->user_id)->toBe($user->id)
        ->and($member->role)->toBe('leader');

    // Config file should be created
    expect(file_exists($this->configPath))->toBeTrue();
    $config = json_decode(file_get_contents($this->configPath), true);
    expect($config['factions'])->toHaveCount(1)
        ->and($config['factions'][0]['tag'])->toBe('SA');
});

it('deposits funds from wallet into faction bank', function () {
    $user = User::factory()->create();
    $faction = $this->manager->createFaction($user, 'Bandits', 'BND');

    Wallet::create(['user_id' => $user->id, 'balance' => 500]);

    $res = $this->manager->depositBank($faction, $user, 200);

    expect($res)->toBeTrue();
    expect((float) $faction->fresh()->bank_balance)->toBe(200.0)
        ->and((float) Wallet::where('user_id', $user->id)->first()->balance)->toBe(300.0);

    $member = FactionMember::where('faction_id', $faction->id)->where('user_id', $user->id)->first();
    expect((float) $member->contribution_points)->toBe(200.0);
});

it('claims and deletes a faction territory', function () {
    $user = User::factory()->create();
    $faction = $this->manager->createFaction($user, 'Outpost Clan', 'OC');

    $territory = $this->manager->claimTerritory(
        faction: $faction,
        name: 'North Base',
        x1: 5000,
        y1: 6000,
        x2: 5200,
        y2: 6200,
    );

    expect($territory->name)->toBe('North Base')
        ->and($territory->x1)->toBe(5000)
        ->and($territory->x2)->toBe(5200)
        ->and($territory->is_safe_house)->toBeTrue();

    expect(FactionTerritory::count())->toBe(1);

    // Delete territory
    $deleted = $this->manager->deleteTerritory($territory->id);
    expect($deleted)->toBeTrue()
        ->and(FactionTerritory::count())->toBe(0);
});

it('invites a user and processes acceptance', function () {
    $leader = User::factory()->create();
    $recruit = User::factory()->create();

    $faction = $this->manager->createFaction($leader, 'Delta Force', 'DF');

    $invitation = $this->manager->inviteUser($faction, $leader, $recruit);

    expect($invitation->status)->toBe('pending')
        ->and($invitation->user_id)->toBe($recruit->id);

    $accepted = $this->manager->respondToInvitation($invitation, true, $recruit);

    expect($accepted)->toBeTrue();
    expect(FactionMember::where('user_id', $recruit->id)->exists())->toBeTrue()
        ->and($invitation->fresh()->status)->toBe('accepted');
});

it('kicks a member from faction', function () {
    $leader = User::factory()->create();
    $memberUser = User::factory()->create();

    $faction = $this->manager->createFaction($leader, 'Alpha Squad', 'AS');
    $invitation = $this->manager->inviteUser($faction, $leader, $memberUser);
    $this->manager->respondToInvitation($invitation, true, $memberUser);

    expect(FactionMember::count())->toBe(2);

    $kicked = $this->manager->kickMember($faction, $memberUser->id, $leader);
    expect($kicked)->toBeTrue()
        ->and(FactionMember::count())->toBe(1);
});
