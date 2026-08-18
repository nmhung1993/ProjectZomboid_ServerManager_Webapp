<?php

use App\Services\ConfigStateManager;
use App\Services\ModManager;
use App\Services\ServerIniParser;

beforeEach(function () {
    $this->parser = new ServerIniParser;
    $this->manager = new ModManager($this->parser, new ConfigStateManager);
    $this->tempDir = sys_get_temp_dir().'/pz_test_'.uniqid();
    mkdir($this->tempDir.'/Server', 0777, true);
    $this->iniPath = $this->tempDir.'/Server/ZomboidServer.ini';
    $this->configStatePath = $this->tempDir.'/Server/.config_state';
    copy(dirname(__DIR__).'/fixtures/server.ini', $this->iniPath);
});

afterEach(function () {
    if (file_exists($this->iniPath)) {
        unlink($this->iniPath);
    }
    foreach (['.mod_state', '.mod_state_applied', '.config_state', '.config_state.lock'] as $sidecar) {
        $path = $this->tempDir.'/Server/'.$sidecar;
        if (file_exists($path)) {
            unlink($path);
        }
    }
    if (is_dir($this->tempDir.'/Server')) {
        rmdir($this->tempDir.'/Server');
    }
    if (is_dir($this->tempDir)) {
        rmdir($this->tempDir);
    }
});

it('lists mods from ini file', function () {
    $mods = $this->manager->list($this->iniPath);

    expect($mods)->toHaveCount(2)
        ->and($mods[0]['workshop_id'])->toBe('2561774086')
        ->and($mods[0]['mod_id'])->toBe('SuperSurvivors')
        ->and($mods[1]['workshop_id'])->toBe('2286126274')
        ->and($mods[1]['mod_id'])->toBe('Hydrocraft');
});

it('adds a mod to both lists', function () {
    $this->manager->add($this->iniPath, '1111111111', 'TestMod');

    $mods = $this->manager->list($this->iniPath);

    // Existing fixture (2) + user-added (1) + auto-attached SWTServerAddon (1) = 4
    expect($mods)->toHaveCount(4)
        ->and($mods[2]['workshop_id'])->toBe('1111111111')
        ->and($mods[2]['mod_id'])->toBe('TestMod')
        ->and($mods[3]['mod_id'])->toBe('SWTServerAddon');
});

it('prevents duplicate workshop ids', function () {
    $this->manager->add($this->iniPath, '2561774086', 'SuperSurvivors');

    expect($this->manager->list($this->iniPath))->toHaveCount(2);
});

it('removes a mod from both lists', function () {
    $removed = $this->manager->remove($this->iniPath, '2561774086');

    expect($removed)->toBe(['workshop_id' => '2561774086', 'mod_id' => 'SuperSurvivors']);

    $mods = $this->manager->list($this->iniPath);
    // Hydrocraft survives + auto-attached SWTServerAddon
    expect($mods)->toHaveCount(2)
        ->and($mods[0]['workshop_id'])->toBe('2286126274')
        ->and($mods[1]['mod_id'])->toBe('SWTServerAddon');
});

it('returns null when removing nonexistent mod', function () {
    expect($this->manager->remove($this->iniPath, '0000000000'))->toBeNull();
});

it('reorders mods', function () {
    $this->manager->reorder($this->iniPath, [
        ['workshop_id' => '2286126274', 'mod_id' => 'Hydrocraft'],
        ['workshop_id' => '2561774086', 'mod_id' => 'SuperSurvivors'],
    ]);

    $mods = $this->manager->list($this->iniPath);
    expect($mods[0]['workshop_id'])->toBe('2286126274')
        ->and($mods[1]['workshop_id'])->toBe('2561774086');
});

it('handles empty mod list', function () {
    // Clear mods
    $this->parser->write($this->iniPath, ['Mods' => '', 'WorkshopItems' => '']);

    $mods = $this->manager->list($this->iniPath);

    expect($mods)->toBe([]);
});

it('adds map folder when adding map mod', function () {
    $this->manager->add($this->iniPath, '9999999999', 'MapMod', 'CustomMap');

    $config = $this->parser->read($this->iniPath);

    expect($config['Map'])->toContain('CustomMap');
});

it('removes map folder when removing map mod', function () {
    // First add a map mod
    $this->manager->add($this->iniPath, '9999999999', 'MapMod', 'CustomMap');

    // Then remove it with map folder
    $this->manager->remove($this->iniPath, '9999999999', 'CustomMap');

    $config = $this->parser->read($this->iniPath);

    expect($config['Map'])->not->toContain('CustomMap');
});

it('writes mod state file when adding a mod', function () {
    $this->manager->add($this->iniPath, '1111111111', 'TestMod');

    $stateFile = $this->tempDir.'/Server/.mod_state';

    expect(file_exists($stateFile))->toBeTrue();

    $content = file_get_contents($stateFile);
    expect($content)->toContain('Mods=SuperSurvivors;Hydrocraft;TestMod;SWTServerAddon')
        ->and($content)->toContain('WorkshopItems=2561774086;2286126274;1111111111;3785748904');
});

it('writes mod state file when removing a mod', function () {
    $this->manager->remove($this->iniPath, '2561774086');

    $stateFile = $this->tempDir.'/Server/.mod_state';

    expect(file_exists($stateFile))->toBeTrue();

    $content = file_get_contents($stateFile);
    expect($content)->toContain('Mods=Hydrocraft;SWTServerAddon')
        ->and($content)->toContain('WorkshopItems=2286126274;3785748904');
});

it('writes mod state file when reordering mods', function () {
    $this->manager->reorder($this->iniPath, [
        ['workshop_id' => '2286126274', 'mod_id' => 'Hydrocraft'],
        ['workshop_id' => '2561774086', 'mod_id' => 'SuperSurvivors'],
    ]);

    $stateFile = $this->tempDir.'/Server/.mod_state';

    expect(file_exists($stateFile))->toBeTrue();

    $content = file_get_contents($stateFile);
    expect($content)->toContain('Mods=Hydrocraft;SuperSurvivors;SWTServerAddon')
        ->and($content)->toContain('WorkshopItems=2286126274;2561774086;3785748904');
});

it('does not write mod state file when adding duplicate mod', function () {
    $stateFile = $this->tempDir.'/Server/.mod_state';
    if (file_exists($stateFile)) {
        unlink($stateFile);
    }

    $this->manager->add($this->iniPath, '2561774086', 'SuperSurvivors');

    expect(file_exists($stateFile))->toBeFalse();
});

it('does not write mod state file when removing nonexistent mod', function () {
    $stateFile = $this->tempDir.'/Server/.mod_state';
    if (file_exists($stateFile)) {
        unlink($stateFile);
    }

    $this->manager->remove($this->iniPath, '0000000000');

    expect(file_exists($stateFile))->toBeFalse();
});

it('flags protected workshop ids', function () {
    expect(ModManager::isProtected('3785748904'))->toBeTrue()
        ->and(ModManager::isProtected('1111111111'))->toBeFalse();
});

it('allows reorder that keeps required mod', function () {
    $this->manager->add($this->iniPath, '3785748904', 'SWTServerAddon');

    $this->manager->reorder($this->iniPath, [
        ['workshop_id' => '3785748904', 'mod_id' => 'SWTServerAddon'],
        ['workshop_id' => '2561774086', 'mod_id' => 'SuperSurvivors'],
        ['workshop_id' => '2286126274', 'mod_id' => 'Hydrocraft'],
    ]);

    $mods = $this->manager->list($this->iniPath);
    expect($mods[0]['workshop_id'])->toBe('3785748904');
});

it('throws RuntimeException when state file directory is not writable', function () {
    chmod($this->tempDir.'/Server', 0555);

    try {
        expect(fn () => $this->manager->add($this->iniPath, '1111111111', 'TestMod'))
            ->toThrow(RuntimeException::class);
    } finally {
        chmod($this->tempDir.'/Server', 0777);
    }
})->skip(getmyuid() === 0, 'chmod restrictions are bypassed by root');

it('lists mods from .mod_state when state file exists, ignoring INI', function () {
    file_put_contents(
        $this->tempDir.'/Server/.mod_state',
        "Mods=StateMod\nWorkshopItems=9999999999\n"
    );

    $mods = $this->manager->list($this->iniPath);

    expect($mods)->toHaveCount(1)
        ->and($mods[0]['mod_id'])->toBe('StateMod')
        ->and($mods[0]['workshop_id'])->toBe('9999999999');
});

it('returns empty list when .mod_state has empty mod values', function () {
    file_put_contents(
        $this->tempDir.'/Server/.mod_state',
        "Mods=\nWorkshopItems=\n"
    );

    expect($this->manager->list($this->iniPath))->toBe([]);
});

it('falls back to INI when .mod_state is malformed', function () {
    file_put_contents(
        $this->tempDir.'/Server/.mod_state',
        'garbage content with no recognizable lines'
    );

    $mods = $this->manager->list($this->iniPath);

    expect($mods)->toHaveCount(2)
        ->and($mods[0]['mod_id'])->toBe('SuperSurvivors');
});

it('falls back to INI when .mod_state is missing WorkshopItems line', function () {
    file_put_contents(
        $this->tempDir.'/Server/.mod_state',
        "Mods=StateMod\n"
    );

    $mods = $this->manager->list($this->iniPath);

    expect($mods)->toHaveCount(2)
        ->and($mods[0]['mod_id'])->toBe('SuperSurvivors');
});

it('returns state-file mods even when INI was clobbered to empty', function () {
    $this->manager->add($this->iniPath, '1111111111', 'TestMod');
    $this->parser->write($this->iniPath, ['Mods' => '', 'WorkshopItems' => '']);

    $mods = $this->manager->list($this->iniPath);

    // 2 fixture + 1 added + auto SWTServerAddon
    expect($mods)->toHaveCount(4)
        ->and(collect($mods)->pluck('mod_id')->all())->toContain('TestMod')
        ->and(collect($mods)->pluck('mod_id')->all())->toContain('SWTServerAddon');
});

it('preserves mods from .mod_state when the INI was pruned by PZ on shutdown', function () {
    // Simulate PZ rewriting the INI with empty Mods= after a shutdown, while
    // .mod_state (web-UI source of truth) still reflects the user's choices.
    file_put_contents(
        $this->tempDir.'/Server/.mod_state',
        "Mods=Hydrocraft;SWTServerAddon\nWorkshopItems=2286126274;3785748904\n"
    );
    $this->parser->write($this->iniPath, ['Mods' => '', 'WorkshopItems' => '']);

    $this->manager->add($this->iniPath, '4242424242', 'NewMod');

    $stateContent = file_get_contents($this->tempDir.'/Server/.mod_state');
    expect($stateContent)
        ->toContain('Mods=Hydrocraft;SWTServerAddon;NewMod')
        ->and($stateContent)->toContain('WorkshopItems=2286126274;3785748904;4242424242');
});

it('re-attaches the protected SWTServerAddon mod when add() runs without it', function () {
    $this->parser->write($this->iniPath, ['Mods' => '', 'WorkshopItems' => '']);

    $this->manager->add($this->iniPath, '4242424242', 'SoloMod');

    $stateContent = file_get_contents($this->tempDir.'/Server/.mod_state');
    expect($stateContent)
        ->toContain('Mods=SoloMod;SWTServerAddon')
        ->and($stateContent)->toContain('WorkshopItems=4242424242;3785748904');
});

it('does not duplicate SWTServerAddon when reorder already contains it', function () {
    // Regression: PHP coerces numeric-string array keys (PROTECTED_MODS) to int,
    // and a naive in_array(..., $workshopIds, true) treats int 3785748904 and
    // "3785748904" as different — appending a duplicate every reorder call.
    $this->manager->reorder($this->iniPath, [
        ['workshop_id' => '3785748904', 'mod_id' => 'SWTServerAddon'],
        ['workshop_id' => '2561774086', 'mod_id' => 'SuperSurvivors'],
        ['workshop_id' => '2286126274', 'mod_id' => 'Hydrocraft'],
    ]);

    $stateContent = file_get_contents($this->tempDir.'/Server/.mod_state');
    expect(substr_count($stateContent, 'SWTServerAddon'))->toBe(1)
        ->and(substr_count($stateContent, '3785748904'))->toBe(1);
});

it('rolls back the INI when state file write fails', function () {
    $iniBefore = file_get_contents($this->iniPath);
    chmod($this->tempDir.'/Server', 0555);

    try {
        try {
            $this->manager->add($this->iniPath, '1111111111', 'TestMod');
        } catch (RuntimeException) {
            // expected
        }
    } finally {
        chmod($this->tempDir.'/Server', 0777);
    }

    expect(file_get_contents($this->iniPath))->toBe($iniBefore);
})->skip(getmyuid() === 0, 'chmod restrictions are bypassed by root');

it('marks all mods stopped when server is not running', function () {
    $result = $this->manager->listWithStatus($this->iniPath, serverRunning: false);

    expect($result['server_running'])->toBeFalse()
        ->and($result['pending_restart'])->toBeFalse()
        ->and(collect($result['mods'])->pluck('status')->all())
        ->each->toBe('stopped');
});

it('marks mods active when state matches applied snapshot', function () {
    $this->manager->add($this->iniPath, '1111111111', 'TestMod');

    // Include the auto-attached SWTServerAddon in the applied snapshot so the
    // user intent matches what the server last loaded.
    file_put_contents(
        $this->tempDir.'/Server/.mod_state_applied',
        "Mods=SuperSurvivors;Hydrocraft;TestMod;SWTServerAddon\nWorkshopItems=2561774086;2286126274;1111111111;3785748904\n"
    );

    $result = $this->manager->listWithStatus($this->iniPath, serverRunning: true);

    expect($result['pending_restart'])->toBeFalse()
        ->and(collect($result['mods'])->pluck('status')->all())
        ->each->toBe('active');
});

it('marks newly added mod as pending_restart when applied snapshot is older', function () {
    file_put_contents(
        $this->tempDir.'/Server/.mod_state_applied',
        "Mods=SuperSurvivors;Hydrocraft\nWorkshopItems=2561774086;2286126274\n"
    );

    $this->manager->add($this->iniPath, '1111111111', 'NewMod');

    $result = $this->manager->listWithStatus($this->iniPath, serverRunning: true);

    expect($result['pending_restart'])->toBeTrue();

    $byId = collect($result['mods'])->keyBy('workshop_id');
    expect($byId['2561774086']['status'])->toBe('active')
        ->and($byId['2286126274']['status'])->toBe('active')
        ->and($byId['1111111111']['status'])->toBe('pending_restart');
});

it('flags pending_restart when a mod was removed since last server start', function () {
    file_put_contents(
        $this->tempDir.'/Server/.mod_state_applied',
        "Mods=SuperSurvivors;Hydrocraft\nWorkshopItems=2561774086;2286126274\n"
    );

    $this->manager->remove($this->iniPath, '2286126274');

    $result = $this->manager->listWithStatus($this->iniPath, serverRunning: true);

    // After remove() the auto-attached SWTServerAddon (3785748904) is in user intent
    // but not in .mod_state_applied — so it's correctly flagged pending_restart.
    expect($result['pending_restart'])->toBeTrue();

    $byId = collect($result['mods'])->keyBy('workshop_id');
    expect($byId['2561774086']['status'])->toBe('active')
        ->and($byId['3785748904']['status'])->toBe('pending_restart');
});

it('falls back to active when applied snapshot is missing on running server', function () {
    $result = $this->manager->listWithStatus($this->iniPath, serverRunning: true);

    expect($result['pending_restart'])->toBeFalse()
        ->and($result['applied_snapshot_present'])->toBeFalse()
        ->and(collect($result['mods'])->pluck('status')->all())
        ->each->toBe('active');
});

it('persists Map to .config_state when adding a map mod', function () {
    $this->manager->add($this->iniPath, '9999999999', 'MapMod', 'CustomMap');

    expect(file_exists($this->configStatePath))->toBeTrue();
    expect(file_get_contents($this->configStatePath))->toContain('Map=')
        ->and(file_get_contents($this->configStatePath))->toContain('CustomMap');
});

it('persists Map to .config_state when removing a map mod', function () {
    $this->manager->add($this->iniPath, '9999999999', 'MapMod', 'CustomMap');
    $this->manager->remove($this->iniPath, '9999999999', 'CustomMap');

    expect(file_get_contents($this->configStatePath))->not->toContain('CustomMap');
});

it('does not touch .config_state when adding a mod without a map folder', function () {
    $this->manager->add($this->iniPath, '1111111111', 'TestMod');

    expect(file_exists($this->configStatePath))->toBeFalse();
});

it('bulk imports independent Mods and WorkshopItems lists, merging into existing', function () {
    // A real pack has more mods than workshop items (one item can provide many mods).
    $summary = $this->manager->bulkImport(
        $this->iniPath,
        ['1111111111', '2222222222'],
        ['ModA', 'ModB', 'ModC'],
    );

    expect($summary['workshop_added'])->toBe(2)
        ->and($summary['mods_added'])->toBe(3);

    $config = $this->parser->read($this->iniPath);
    expect($config['Mods'])->toBe('SuperSurvivors;Hydrocraft;ModA;ModB;ModC;SWTServerAddon')
        ->and($config['WorkshopItems'])->toBe('2561774086;2286126274;1111111111;2222222222;3785748904');
});

it('bulk import merges each list independently and skips duplicates', function () {
    $summary = $this->manager->bulkImport(
        $this->iniPath,
        ['2561774086', '3333333333'],   // first already present
        ['SuperSurvivors', 'FreshMod'],  // first already present
    );

    expect($summary['workshop_added'])->toBe(1)
        ->and($summary['mods_added'])->toBe(1);

    $config = $this->parser->read($this->iniPath);
    expect(substr_count($config['WorkshopItems'], '2561774086'))->toBe(1)
        ->and(substr_count($config['Mods'], 'SuperSurvivors'))->toBe(1);
});

it('bulk import accepts mod IDs with spaces, brackets, ampersands and slashes', function () {
    // Regression: real B42 packs use mod IDs like these.
    $this->manager->bulkImport(
        $this->iniPath,
        [],
        ['[B42] Tatrapan', 'FWOBenchPress&Treadmill', '1299328280/ToadTraits'],
    );

    $mods = $this->parser->read($this->iniPath)['Mods'];
    expect($mods)->toContain('[B42] Tatrapan')
        ->and($mods)->toContain('FWOBenchPress&Treadmill')
        ->and($mods)->toContain('1299328280/ToadTraits');
});

it('bulk import writes .mod_state and re-attaches SWTServerAddon', function () {
    $this->manager->bulkImport($this->iniPath, ['1111111111'], ['ModA']);

    $state = file_get_contents($this->tempDir.'/Server/.mod_state');
    expect($state)->toContain('Mods=SuperSurvivors;Hydrocraft;ModA;SWTServerAddon')
        ->and($state)->toContain('WorkshopItems=2561774086;2286126274;1111111111;3785748904');
});

it('bulk import prepends new map folders before the vanilla map and persists them', function () {
    $summary = $this->manager->bulkImport(
        $this->iniPath,
        ['1111111111'],
        ['ModA'],
        ['BigMap', 'Muldraugh, KY'],
    );

    expect($summary['maps_added'])->toBe(1);

    // Mod maps must sit ahead of the vanilla base map in Map=.
    expect($this->parser->read($this->iniPath)['Map'])->toBe('BigMap;Muldraugh, KY');
    expect(file_get_contents($this->configStatePath))->toContain('Map=BigMap;Muldraugh, KY');
});

it('bulk import with only already-present mods and no maps writes nothing new', function () {
    unlink($this->tempDir.'/Server/.mod_state');

    $summary = $this->manager->bulkImport(
        $this->iniPath,
        ['2561774086'],
        ['SuperSurvivors', 'Hydrocraft'],
    );

    expect($summary['workshop_added'])->toBe(0)
        ->and($summary['mods_added'])->toBe(0)
        ->and(file_exists($this->tempDir.'/Server/.mod_state'))->toBeFalse();
});

it('adds multiple mod IDs for one workshop ID', function () {
    $this->manager->add($this->iniPath, '5555555555', ['VehicleCore', 'VehicleTuning', 'VehicleArmor']);

    $mods = $this->manager->list($this->iniPath);

    $addedMod = collect($mods)->firstWhere('workshop_id', '5555555555');
    expect($addedMod)->not->toBeNull()
        ->and($addedMod['mod_ids'])->toBe(['VehicleCore', 'VehicleTuning', 'VehicleArmor'])
        ->and($addedMod['mod_id'])->toBe('VehicleCore; VehicleTuning; VehicleArmor');

    $config = $this->parser->read($this->iniPath);
    expect($config['Mods'])->toContain('VehicleCore')
        ->and($config['Mods'])->toContain('VehicleTuning')
        ->and($config['Mods'])->toContain('VehicleArmor')
        ->and($config['WorkshopItems'])->toContain('5555555555');
});

it('updates mod IDs for an existing workshop ID', function () {
    $this->manager->add($this->iniPath, '5555555555', ['VehicleCore', 'VehicleTuning']);

    $this->manager->update($this->iniPath, '5555555555', ['VehicleCore', 'VehicleArmor']);

    $mods = $this->manager->list($this->iniPath);
    $updatedMod = collect($mods)->firstWhere('workshop_id', '5555555555');
    expect($updatedMod)->not->toBeNull()
        ->and($updatedMod['mod_ids'])->toBe(['VehicleCore', 'VehicleArmor']);

    $config = $this->parser->read($this->iniPath);
    expect($config['Mods'])->not->toContain('VehicleTuning')
        ->and($config['Mods'])->toContain('VehicleArmor');
});

it('removes all associated mod IDs when removing a workshop item', function () {
    $this->manager->add($this->iniPath, '5555555555', ['VehicleCore', 'VehicleTuning', 'VehicleArmor']);

    $this->manager->remove($this->iniPath, '5555555555');

    $mods = $this->manager->list($this->iniPath);
    expect(collect($mods)->firstWhere('workshop_id', '5555555555'))->toBeNull();

    $config = $this->parser->read($this->iniPath);
    expect($config['Mods'])->not->toContain('VehicleCore')
        ->and($config['Mods'])->not->toContain('VehicleTuning')
        ->and($config['Mods'])->not->toContain('VehicleArmor')
        ->and($config['WorkshopItems'])->not->toContain('5555555555');
});

it('does not misalign subsequent unmapped workshop items when earlier items have multiple mod IDs', function () {
    // Write an INI file with 3 workshop items:
    // W1 has 1 mod (M1)
    // W2 has 2 mods (M2_a, M2_b) -> mapped in mapping JSON
    // W3 has 1 mod (M3) -> not in mapping JSON
    $this->parser->write($this->iniPath, [
        'WorkshopItems' => '111;222;333;3785748904',
        'Mods' => 'Mod1;Mod2_A;Mod2_B;Mod3;SWTServerAddon',
    ]);

    $mappingFile = $this->tempDir.'/Server/.mod_mapping.json';
    file_put_contents($mappingFile, json_encode([
        '222' => ['Mod2_A', 'Mod2_B'],
    ]));

    $mods = $this->manager->list($this->iniPath);

    expect(count($mods))->toBe(4); // Exactly 4 rows, no orphan row

    $w1 = collect($mods)->firstWhere('workshop_id', '111');
    expect($w1['mod_id'])->toBe('Mod1');

    $w2 = collect($mods)->firstWhere('workshop_id', '222');
    expect($w2['mod_ids'])->toBe(['Mod2_A', 'Mod2_B']);

    $w3 = collect($mods)->firstWhere('workshop_id', '333');
    expect($w3['mod_id'])->toBe('Mod3');
    expect($w3['workshop_id'])->toBe('333');

    $standalone = collect($mods)->firstWhere('workshop_id', '');
    expect($standalone)->toBeNull();
});

it('parses installed workshop timestamps from appworkshop acf file', function () {
    $acfContent = <<<VDF
"AppWorkshop"
{
	"appid"		"108600"
	"WorkshopItemsInstalled"
	{
		"3785620377"
		{
			"size"		"192373"
			"timeupdated"		"1787041664"
			"manifest"		"8033202405367379429"
		}
		"3785748904"
		{
			"size"		"88483"
			"timeupdated"		"1787072224"
			"manifest"		"8871823418421442721"
		}
	}
	"WorkshopItemDetails"
	{
		"3785620377"
		{
			"manifest"		"8033202405367379429"
			"timeupdated"		"1787041664"
		}
	}
}
VDF;

    $acfPath = $this->tempDir.'/appworkshop_108600.acf';
    file_put_contents($acfPath, $acfContent);

    $timestamps = $this->manager->getInstalledWorkshopTimestamps($acfPath);

    expect($timestamps)->toBe([
        '3785620377' => 1787041664,
        '3785748904' => 1787072224,
    ]);
});

it('returns empty array when appworkshop acf file is missing or unreadable', function () {
    $timestamps = $this->manager->getInstalledWorkshopTimestamps('/non/existent/path/appworkshop.acf');
    expect($timestamps)->toBe([]);
});

