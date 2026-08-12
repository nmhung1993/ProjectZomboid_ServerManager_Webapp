<?php
$file = '/opt/pzmap2dzi/conf/mod/maps-b42-custom.txt';
echo "File exists: " . (file_exists($file) ? 'yes' : 'no') . "\n";
echo "Size: " . filesize($file) . "\n";
$content = file_get_contents($file);
echo "Content length: " . strlen($content) . "\n";
echo "First 200 chars:\n" . substr($content, 0, 200) . "\n";

// Parse it
$lines = explode("\n", $content);
$currentKey = null;
$currentMapName = null;
$mapping = [];

foreach ($lines as $line) {
    $line = rtrim($line, "\r");
    $trimmed = trim($line);
    if ($trimmed === '' || str_starts_with($trimmed, '#')) continue;
    if (preg_match('/^(\S+):$/', $trimmed, $m)) {
        if ($currentKey !== null && $currentMapName !== null) {
            $mapping[$currentMapName] = $currentKey;
        }
        $currentKey = $m[1];
        $currentMapName = null;
        continue;
    }
    if ($currentKey !== null && preg_match('/^\s+map_name:\s*(.+)$/', $trimmed, $m)) {
        $currentMapName = trim($m[1]);
    }
}
if ($currentKey !== null && $currentMapName !== null) {
    $mapping[$currentMapName] = $currentKey;
}

echo "\nMapping:\n";
print_r($mapping);

// Check server.ini
$ini = (new App\Services\ServerIniParser)->read('/pz-data/Server/SeedervnCommunity.ini');
$mapLine = $ini['Map'] ?? '';
echo "\nMap line: " . $mapLine . "\n";
$activeMaps = array_map('trim', explode(';', $mapLine));
echo "Active maps:\n";
print_r($activeMaps);

// Check which match
foreach ($activeMaps as $mapName) {
    if (isset($mapping[$mapName])) {
        echo "MATCH: $mapName => {$mapping[$mapName]}\n";
    } else {
        echo "NO MATCH: $mapName\n";
    }
}