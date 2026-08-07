<?php

use App\Services\SafeZoneManager;
use ErrorException;
use ReflectionMethod;

// Suppress PHP 8.3 warnings from the legacy import style in this test file.
if (! class_exists('PHPUnit\\Framework\\TestCase')) {
    error_reporting(E_ALL & ~E_WARNING);
}

beforeEach(function () {
    $this->tempDir = sys_get_temp_dir().'/pz_safezone_test_'.getmypid();
    mkdir($this->tempDir, 0755, true);

    $this->configPath = $this->tempDir.'/safezone_config.json';
    $this->violationsPath = $this->tempDir.'/safezone_violations.json';

    $this->manager = new SafeZoneManager($this->configPath, $this->violationsPath);
});

afterEach(function () {
    $files = glob($this->tempDir.'/*') ?: [];
    array_map(fn ($f) => is_file($f) && unlink($f), $files);
    if (is_dir($this->tempDir)) {
        rmdir($this->tempDir);
    }
});

it('returns default config when file is missing', function () {
    $config = $this->manager->getConfig();

    expect($config['enabled'])->toBeFalse()
        ->and($config['zones'])->toBe([]);
});

it('writes and reads config atomically', function () {
    $this->manager->updateConfig(true);

    $config = $this->manager->getConfig();

    expect($config['enabled'])->toBeTrue();
});

it('adds a zone to config', function () {
    $zone = [
        'id' => 'spawn_sz',
        'name' => 'Spawn Zone',
        'x1' => 10000,
        'y1' => 10000,
        'x2' => 10100,
        'y2' => 10100,
    ];

    $this->manager->addZone($zone);

    $config = $this->manager->getConfig();

    expect($config['zones'])->toHaveCount(1)
        ->and($config['zones'][0]['id'])->toBe('spawn_sz')
        ->and($config['zones'][0]['name'])->toBe('Spawn Zone');
});

it('removes a zone by ID', function () {
    $this->manager->addZone(['id' => 'zone_a', 'name' => 'Zone A', 'x1' => 0, 'y1' => 0, 'x2' => 10, 'y2' => 10]);
    $this->manager->addZone(['id' => 'zone_b', 'name' => 'Zone B', 'x1' => 20, 'y1' => 20, 'x2' => 30, 'y2' => 30]);

    $this->manager->removeZone('zone_a');

    $config = $this->manager->getConfig();

    expect($config['zones'])->toHaveCount(1)
        ->and($config['zones'][0]['id'])->toBe('zone_b');
});

it('returns zero when no violations file exists', function () {
    $count = $this->manager->importViolations();

    expect($count)->toBe(0);
});

it('returns false instead of throwing when atomic write cannot be completed', function () {
    $method = new ReflectionMethod(SafeZoneManager::class, 'writeJsonFileAtomic');
    $method->setAccessible(true);

    $path = $this->tempDir.'/blocked/safezone_config.json';
    file_put_contents($this->tempDir.'/blocked', 'not-a-directory');

    set_error_handler(function (int $severity, string $message): never {
        throw new ErrorException($message, 0, $severity);
    });

    try {
        $result = $method->invoke($this->manager, $path, ['enabled' => true]);

        expect($result)->toBeFalse();
    } finally {
        restore_error_handler();
    }
});

it('preserves zones when toggling enabled', function () {
    $this->manager->addZone(['id' => 'zone_a', 'name' => 'Zone A', 'x1' => 0, 'y1' => 0, 'x2' => 10, 'y2' => 10]);
    $this->manager->updateConfig(true);

    $config = $this->manager->getConfig();

    expect($config['enabled'])->toBeTrue()
        ->and($config['zones'])->toHaveCount(1);
});
