<?php

use App\Models\AuditLog;
use App\Models\User;
use App\Services\ServerIniParser;
use App\Services\SteamWorkshopClient;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->tempDir = sys_get_temp_dir().'/pz_mod_crud_test_'.uniqid();
    mkdir($this->tempDir.'/Server', 0777, true);
    $this->iniPath = $this->tempDir.'/Server/ZomboidServer.ini';
    copy(base_path('tests/fixtures/server.ini'), $this->iniPath);
    config(['zomboid.paths.server_ini' => $this->iniPath]);
});

afterEach(function () {
    @unlink($this->tempDir.'/Server/.mod_state');
    @unlink($this->tempDir.'/Server/.mod_state_applied');
    @unlink($this->tempDir.'/Server/.mod_mapping.json');
    @unlink($this->iniPath);
    @unlink($this->tempDir.'/Server/.config_state');
    @unlink($this->tempDir.'/Server/.config_state.lock');
    @rmdir($this->tempDir.'/Server');
    @rmdir($this->tempDir);
});

it('adds a mod with multiple mod_ids', function () {
    $response = $this->actingAs($this->admin)->postJson('/admin/mods', [
        'workshop_id' => '1234567890',
        'mod_ids' => ['ModPartA', 'ModPartB'],
        'map_folder' => 'CustomMap',
    ]);

    $response->assertCreated()
        ->assertJson(['restart_required' => true]);

    $ini = (new ServerIniParser)->read($this->iniPath);
    expect($ini['WorkshopItems'])->toContain('1234567890');
    expect($ini['Mods'])->toContain('ModPartA');
    expect($ini['Mods'])->toContain('ModPartB');
    expect($ini['Map'])->toContain('CustomMap');
});

it('adds a mod with single mod_id', function () {
    $response = $this->actingAs($this->admin)->postJson('/admin/mods', [
        'workshop_id' => '9988776655',
        'mod_id' => 'SingleMod',
    ]);

    $response->assertCreated();
    $ini = (new ServerIniParser)->read($this->iniPath);
    expect($ini['WorkshopItems'])->toContain('9988776655');
    expect($ini['Mods'])->toContain('SingleMod');
});

it('auto-resolves mod_ids from steam workshop if mod_ids are omitted', function () {
    $client = Mockery::mock(SteamWorkshopClient::class);
    $client->shouldReceive('getDetails')
        ->with('5555555555')
        ->andReturn([
            'workshop_id' => '5555555555',
            'title' => 'Steam Mod Title',
            'description' => 'Test',
            'preview_url' => null,
            'mod_ids' => ['DiscoveredMod1', 'DiscoveredMod2'],
            'map_folders' => ['DiscoveredMap'],
        ]);
    app()->instance(SteamWorkshopClient::class, $client);

    $response = $this->actingAs($this->admin)->postJson('/admin/mods', [
        'workshop_id' => '5555555555',
    ]);

    $response->assertCreated();
    $ini = (new ServerIniParser)->read($this->iniPath);
    expect($ini['WorkshopItems'])->toContain('5555555555');
    expect($ini['Mods'])->toContain('DiscoveredMod1');
    expect($ini['Mods'])->toContain('DiscoveredMod2');
});

it('updates an existing mod with new mod_ids', function () {
    // Add first
    $this->actingAs($this->admin)->postJson('/admin/mods', [
        'workshop_id' => '1234567890',
        'mod_ids' => ['InitialMod'],
    ])->assertCreated();

    // Update
    $response = $this->actingAs($this->admin)->putJson('/admin/mods/1234567890', [
        'mod_ids' => ['UpdatedMod1', 'UpdatedMod2'],
    ]);

    $response->assertOk();
    $ini = (new ServerIniParser)->read($this->iniPath);
    expect($ini['Mods'])->toContain('UpdatedMod1');
    expect($ini['Mods'])->toContain('UpdatedMod2');
    expect($ini['Mods'])->not->toContain('InitialMod');
});

it('reorders mods with mixed mod_id and mod_ids', function () {
    $response = $this->actingAs($this->admin)->putJson('/admin/mods/order', [
        'mods' => [
            ['workshop_id' => '2561774086', 'mod_id' => 'SuperSurvivors'],
            ['workshop_id' => '2688809268', 'mod_ids' => ['Hydrocraft']],
            ['workshop_id' => '3426177408', 'mod_id' => 'ZomboidManager'],
        ],
    ]);

    $response->assertOk()
        ->assertJson(['restart_required' => true]);
});

it('removes a mod', function () {
    $this->actingAs($this->admin)->postJson('/admin/mods', [
        'workshop_id' => '7777777777',
        'mod_id' => 'ModToDelete',
    ])->assertCreated();

    $response = $this->actingAs($this->admin)->deleteJson('/admin/mods/7777777777');
    $response->assertOk();

    $ini = (new ServerIniParser)->read($this->iniPath);
    expect($ini['WorkshopItems'])->not->toContain('7777777777');
    expect($ini['Mods'])->not->toContain('ModToDelete');
});
