<?php

namespace App\Services;

class ModManager
{
    /**
     * Mods that must remain installed for the manager to work, keyed by
     * Workshop ID with the corresponding `mod_id` as the value. The
     * proprietary ZomboidManager mod provides the Lua bridge used by
     * inventory, delivery, and player-position features — removing it
     * breaks core functionality, so the API/UI refuse to remove these
     * and write paths re-attach them automatically if they go missing.
     */
    public const PROTECTED_MODS = [
        '3785748904' => 'SWTServerAddon',
    ];

    public function __construct(
        private readonly ServerIniParser $iniParser,
        private readonly ConfigStateManager $configState,
    ) {}

    public static function isProtected(string $workshopId): bool
    {
        return array_key_exists($workshopId, self::PROTECTED_MODS);
    }

    /**
     * Get the current mod list.
     *
     * Prefers `.mod_state` (the user's intended list, written by add/remove/reorder)
     * over the live INI, because PZ rewrites the INI on shutdown/startup and may
     * leave stale or empty Mods= entries between container restarts. Falls back to
     * the INI when the state file is missing or malformed.
     *
     * @return array<int, array{workshop_id: string, mod_id: string, mod_ids: list<string>, position: int}>
     */
    public function list(string $iniPath): array
    {
        $state = $this->parseStateFile(dirname($iniPath).'/.mod_state');

        if ($state !== null) {
            $workshopIds = $this->splitList($state['WorkshopItems']);
            $modIds = $this->splitList($state['Mods']);
        } else {
            $config = $this->iniParser->read($iniPath);
            $workshopIds = $this->splitList($config['WorkshopItems'] ?? '');
            $modIds = $this->splitList($config['Mods'] ?? '');
        }

        $mapping = $this->readMapping($iniPath);
        $mappingUpdated = false;
        $mods = [];
        $claimedModIds = [];

        // 1. Process workshop IDs in order
        foreach ($workshopIds as $workshopId) {
            $wModIds = [];
            if (isset($mapping[$workshopId])) {
                // Keep only mapped mod IDs that actually exist in the current $modIds list
                $wModIds = array_values(array_filter(
                    $mapping[$workshopId],
                    fn ($m) => in_array($m, $modIds, true) && ! in_array($m, $claimedModIds, true)
                ));
            }

            if (empty($wModIds)) {
                if (self::isProtected($workshopId)) {
                    $protectedId = self::PROTECTED_MODS[$workshopId];
                    if (in_array($protectedId, $modIds, true) && ! in_array($protectedId, $claimedModIds, true)) {
                        $wModIds = [$protectedId];
                    }
                } else {
                    // Find the next unassigned mod ID from $modIds
                    foreach ($modIds as $candidate) {
                        if (! in_array($candidate, $claimedModIds, true)) {
                            $wModIds = [$candidate];
                            $mapping[$workshopId] = [$candidate];
                            $mappingUpdated = true;
                            break;
                        }
                    }
                }
            }

            foreach ($wModIds as $m) {
                $claimedModIds[] = $m;
            }

            $mods[] = [
                'workshop_id' => $workshopId,
                'mod_id' => implode('; ', $wModIds),
                'mod_ids' => $wModIds,
                'position' => count($mods),
            ];
        }

        // 2. Add any truly standalone mod IDs that were not mapped to any workshop item
        foreach ($modIds as $modId) {
            if (! in_array($modId, $claimedModIds, true)) {
                $mods[] = [
                    'workshop_id' => '',
                    'mod_id' => $modId,
                    'mod_ids' => [$modId],
                    'position' => count($mods),
                ];
                $claimedModIds[] = $modId;
            }
        }

        if ($mappingUpdated) {
            $this->writeMapping($iniPath, $mapping);
        }

        return $mods;
    }

    /**
     * Get the mod list with per-mod load status.
     *
     * Compares `.mod_state` (user intent) against `.mod_state_applied` (the
     * snapshot configure-server.sh wrote when PZ last started) to decide whether
     * each mod is actively running, awaiting a restart, or whether the server is
     * stopped.
     *
     * Statuses:
     *  - 'stopped'         — game server is not running; load state unknown
     *  - 'pending_restart' — mod is in user intent but not in the running config
     *  - 'active'          — mod is in user intent and was applied at last start
     *
     * When `.mod_state_applied` is missing (legacy containers from before this
     * file was written), every mod returned by `list()` is treated as 'active' if
     * the server is running — we can't know what changed since startup without
     * the snapshot.
     *
     * @return array{
     *     mods: array<int, array{workshop_id: string, mod_id: string, mod_ids: list<string>, position: int, status: string}>,
     *     pending_restart: bool,
     *     server_running: bool,
     *     applied_snapshot_present: bool,
     * }
     */
    public function listWithStatus(string $iniPath, bool $serverRunning): array
    {
        $mods = $this->list($iniPath);
        $applied = $this->parseStateFile(dirname($iniPath).'/.mod_state_applied');
        $appliedWorkshopIds = $applied !== null
            ? $this->splitList($applied['WorkshopItems'])
            : null;
        $appliedModIds = $applied !== null
            ? $this->splitList($applied['Mods'])
            : null;

        $pendingRestart = false;

        foreach ($mods as $i => $mod) {
            if (! $serverRunning) {
                $status = 'stopped';
            } elseif ($applied === null) {
                $status = 'active';
            } elseif ($mod['workshop_id'] !== '') {
                // If mod has a workshop ID, check if workshop ID and all its mod IDs are applied
                $workshopApplied = $appliedWorkshopIds !== null && in_array($mod['workshop_id'], $appliedWorkshopIds, true);
                $modsApplied = true;
                if ($appliedModIds !== null && ! empty($mod['mod_ids'])) {
                    foreach ($mod['mod_ids'] as $mid) {
                        if (! in_array($mid, $appliedModIds, true)) {
                            $modsApplied = false;
                            break;
                        }
                    }
                }
                $status = ($workshopApplied && $modsApplied) ? 'active' : 'pending_restart';
            } else {
                // Standalone mod without workshop ID
                $status = ($appliedModIds !== null && in_array($mod['mod_id'], $appliedModIds, true))
                    ? 'active'
                    : 'pending_restart';
            }

            if ($status === 'pending_restart') {
                $pendingRestart = true;
            }

            $mods[$i]['status'] = $status;
        }

        if ($serverRunning && $applied !== null) {
            $intentWorkshopIds = array_filter(array_column($mods, 'workshop_id'));
            $removedSinceStart = array_diff($appliedWorkshopIds, $intentWorkshopIds);
            // Ignore legacy / obsolete manager workshop IDs (e.g. 3685323705) during migration
            $removedSinceStart = array_filter($removedSinceStart, fn ($wid) => $wid !== '3685323705' && $wid !== '');
            if (! empty($removedSinceStart)) {
                $pendingRestart = true;
            }
        }

        return [
            'mods' => $mods,
            'pending_restart' => $pendingRestart,
            'server_running' => $serverRunning,
            'applied_snapshot_present' => $applied !== null,
        ];
    }

    /**
     * Parse `.mod_state` into its Mods/WorkshopItems values.
     *
     * Returns null when the file is absent, unreadable, or missing either expected
     * line — partial state is rejected so a corrupted file falls back to the INI
     * via the caller, rather than half-trusting it.
     *
     * @return array{Mods: string, WorkshopItems: string}|null
     */
    private function parseStateFile(string $stateFile): ?array
    {
        if (! is_readable($stateFile)) {
            return null;
        }

        $contents = @file_get_contents($stateFile);

        if ($contents === false) {
            return null;
        }

        if (! preg_match('/^Mods=(.*)$/m', $contents, $modsMatch)
            || ! preg_match('/^WorkshopItems=(.*)$/m', $contents, $workshopMatch)) {
            return null;
        }

        return [
            'Mods' => trim($modsMatch[1]),
            'WorkshopItems' => trim($workshopMatch[1]),
        ];
    }

    /**
     * Read the mod mapping JSON file.
     *
     * @return array<string, list<string>>
     */
    private function readMapping(string $iniPath): array
    {
        $mappingFile = dirname($iniPath).'/.mod_mapping.json';
        if (! is_readable($mappingFile)) {
            return [];
        }

        $contents = @file_get_contents($mappingFile);
        if ($contents === false) {
            return [];
        }

        $data = json_decode($contents, true);
        if (! is_array($data)) {
            return [];
        }

        $result = [];
        foreach ($data as $key => $values) {
            if (is_array($values)) {
                $result[(string) $key] = array_values(array_filter(
                    array_map('trim', $values),
                    fn ($v) => $v !== ''
                ));
            } elseif (is_string($values) && trim($values) !== '') {
                $result[(string) $key] = [trim($values)];
            }
        }

        return $result;
    }

    /**
     * Write the mod mapping JSON file.
     *
     * @param array<string, list<string>> $mapping
     */
    private function writeMapping(string $iniPath, array $mapping): void
    {
        $mappingFile = dirname($iniPath).'/.mod_mapping.json';
        $json = json_encode($mapping, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($json !== false) {
            @file_put_contents($mappingFile, $json);
        }
    }

    /**
     * Add a mod to both WorkshopItems and Mods lines.
     *
     * @param string|list<string> $modId
     */
    public function add(string $iniPath, string $workshopId, string|array $modId, ?string $mapFolder = null): void
    {
        $modList = is_array($modId)
            ? array_values(array_filter(array_map('trim', $modId), fn ($v) => $v !== ''))
            : $this->splitList($modId);

        if (empty($modList)) {
            return;
        }

        $current = $this->readCurrentLists($iniPath);
        $workshopIds = $current['workshop_ids'];
        $modIds = $current['mod_ids'];

        $workshopIdAlreadyPresent = in_array($workshopId, $workshopIds, true);
        if (! $workshopIdAlreadyPresent) {
            $workshopIds[] = $workshopId;
        }

        $newModsAdded = false;
        foreach ($modList as $m) {
            if (! in_array($m, $modIds, true)) {
                $modIds[] = $m;
                $newModsAdded = true;
            }
        }

        $mapping = $this->readMapping($iniPath);
        $existingMapped = $mapping[$workshopId] ?? [];
        $mapping[$workshopId] = array_values(array_unique(array_merge($existingMapped, $modList)));
        $this->writeMapping($iniPath, $mapping);

        if ($workshopIdAlreadyPresent && ! $newModsAdded && $mapFolder === null) {
            return;
        }

        $updates = [
            'WorkshopItems' => implode(';', $workshopIds),
            'Mods' => implode(';', $modIds),
        ];

        if ($mapFolder !== null) {
            $config = $this->iniParser->read($iniPath);
            $maps = $this->splitList($config['Map'] ?? 'Muldraugh, KY', ';');
            if (! in_array($mapFolder, $maps, true)) {
                $maps[] = $mapFolder;
                $updates['Map'] = implode(';', $maps);
            }
        }

        $this->writeIniAndState($iniPath, $updates);
    }

    /**
     * Update mod IDs and optional map folder for a Workshop ID.
     *
     * @param string|list<string> $newModIds
     */
    public function update(string $iniPath, string $workshopId, string|array $newModIds, ?string $mapFolder = null): void
    {
        $newModList = is_array($newModIds)
            ? array_values(array_filter(array_map('trim', $newModIds), fn ($v) => $v !== ''))
            : $this->splitList($newModIds);

        if (empty($newModList)) {
            return;
        }

        $current = $this->readCurrentLists($iniPath);
        $workshopIds = $current['workshop_ids'];
        $modIds = $current['mod_ids'];
        $mapping = $this->readMapping($iniPath);

        if (! in_array($workshopId, $workshopIds, true)) {
            $workshopIds[] = $workshopId;
        }

        $oldModIds = $mapping[$workshopId] ?? [];
        if (empty($oldModIds)) {
            $existingList = $this->list($iniPath);
            $found = collect($existingList)->firstWhere('workshop_id', $workshopId);
            $oldModIds = $found['mod_ids'] ?? ($found['mod_id'] ? [$found['mod_id']] : []);
        }

        // Find position of the first old mod ID to replace in-place, preserving order
        $replaceIndex = -1;
        foreach ($oldModIds as $oldMod) {
            $idx = array_search($oldMod, $modIds, true);
            if ($idx !== false) {
                $replaceIndex = $idx;
                break;
            }
        }

        // Remove old mod IDs that are no longer in newModList
        $updatedModIds = array_values(array_filter(
            $modIds,
            fn ($m) => ! in_array($m, $oldModIds, true)
        ));

        // Insert newModList at the replacement position or append
        if ($replaceIndex >= 0 && $replaceIndex <= count($updatedModIds)) {
            array_splice($updatedModIds, $replaceIndex, 0, $newModList);
        } else {
            foreach ($newModList as $m) {
                if (! in_array($m, $updatedModIds, true)) {
                    $updatedModIds[] = $m;
                }
            }
        }
        $updatedModIds = array_values(array_unique($updatedModIds));

        $mapping[$workshopId] = $newModList;
        $this->writeMapping($iniPath, $mapping);

        $updates = [
            'WorkshopItems' => implode(';', $workshopIds),
            'Mods' => implode(';', $updatedModIds),
        ];

        if ($mapFolder !== null) {
            $config = $this->iniParser->read($iniPath);
            $maps = $this->splitList($config['Map'] ?? 'Muldraugh, KY', ';');
            if (! in_array($mapFolder, $maps, true)) {
                $maps[] = $mapFolder;
                $updates['Map'] = implode(';', $maps);
            }
        }

        $this->writeIniAndState($iniPath, $updates);
    }

    /**
     * Remove a mod by workshop ID from both lines.
     *
     * @return array{workshop_id: string, mod_id: string}|null The removed mod, or null if not found.
     */
    public function remove(string $iniPath, string $workshopId, ?string $mapFolder = null): ?array
    {
        $current = $this->readCurrentLists($iniPath);
        $workshopIds = $current['workshop_ids'];
        $modIds = $current['mod_ids'];
        $mapping = $this->readMapping($iniPath);

        $index = array_search($workshopId, $workshopIds, true);

        if ($index === false) {
            return null;
        }

        $associatedMods = $mapping[$workshopId] ?? [];
        if (empty($associatedMods)) {
            $existingList = $this->list($iniPath);
            $found = collect($existingList)->firstWhere('workshop_id', $workshopId);
            $associatedMods = $found['mod_ids'] ?? ($found['mod_id'] ? [$found['mod_id']] : []);
        }

        $removed = [
            'workshop_id' => $workshopIds[$index],
            'mod_id' => implode('; ', $associatedMods),
        ];

        array_splice($workshopIds, $index, 1);

        $modIds = array_values(array_filter(
            $modIds,
            fn ($m) => ! in_array($m, $associatedMods, true)
        ));

        unset($mapping[$workshopId]);
        $this->writeMapping($iniPath, $mapping);

        $updates = [
            'WorkshopItems' => implode(';', $workshopIds),
            'Mods' => implode(';', $modIds),
        ];

        if ($mapFolder !== null) {
            $config = $this->iniParser->read($iniPath);
            $maps = $this->splitList($config['Map'] ?? '', ';');
            $maps = array_filter($maps, fn ($m) => $m !== $mapFolder);
            $updates['Map'] = implode(';', array_values($maps));
        }

        $this->writeIniAndState($iniPath, $updates);

        return $removed;
    }

    /**
     * Reorder mods by replacing both lines with the given ordered list.
     *
     * @param  array<int, array{workshop_id: string, mod_id: string}>  $orderedMods
     */
    public function reorder(string $iniPath, array $orderedMods): void
    {
        $workshopIds = array_column($orderedMods, 'workshop_id');
        $mapping = $this->readMapping($iniPath);

        $current = $this->readCurrentLists($iniPath);
        $existing = $current['workshop_ids'];
        $currentModIds = $current['mod_ids'];

        foreach (array_keys(self::PROTECTED_MODS) as $required) {
            // Cast: PHP coerces numeric-string array keys to int; compare as strings.
            $requiredStr = (string) $required;
            if (in_array($requiredStr, $existing, true) && ! in_array($requiredStr, $workshopIds, true)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'mods' => ["Reorder cannot drop required mod {$requiredStr}."],
                ]);
            }
        }

        $newModIds = [];
        foreach ($orderedMods as $m) {
            $wId = $m['workshop_id'];
            $wModList = $mapping[$wId] ?? ($m['mod_ids'] ?? (isset($m['mod_id']) && $m['mod_id'] !== '' ? $this->splitList($m['mod_id']) : []));
            foreach ($wModList as $modName) {
                if ($modName !== '' && ! in_array($modName, $newModIds, true)) {
                    $newModIds[] = $modName;
                }
            }
        }

        // Keep any remaining mod IDs from current config
        foreach ($currentModIds as $modName) {
            if (! in_array($modName, $newModIds, true)) {
                $newModIds[] = $modName;
            }
        }

        $this->writeIniAndState($iniPath, [
            'WorkshopItems' => implode(';', $workshopIds),
            'Mods' => implode(';', $newModIds),
        ]);
    }

    /**
     * Merge a pasted modpack into the current config in one write.
     *
     * PZ treats `Mods=`, `WorkshopItems=`, and `Map=` as three INDEPENDENT ordered
     * lists — a single Workshop item can provide several mod IDs, and some mods have
     * no Workshop ID at all, so the counts routinely differ (a 122-item pack can have
     * 265 mods). Each list is therefore merged on its own: new entries are appended in
     * the order given, existing ones are left untouched (never removed), and duplicates
     * are skipped. Map folders are prepended so modded maps sit ahead of the vanilla
     * base map (PZ resolves overlapping cells in list order, vanilla last).
     *
     * Everything is written through `writeIniAndState`, so the merged lists land in
     * `.mod_state` (authoritative across reboots), ZomboidManager is re-attached, and
     * any Map change is persisted to `.config_state`.
     *
     * @param  list<string>  $workshopIds
     * @param  list<string>  $modIds
     * @param  list<string>  $mapFolders
     * @return array{workshop_added: int, mods_added: int, maps_added: int}
     */
    public function bulkImport(string $iniPath, array $workshopIds, array $modIds, array $mapFolders = []): array
    {
        $current = $this->readCurrentLists($iniPath);

        [$mergedWorkshop, $workshopAdded] = $this->mergeList($current['workshop_ids'], $workshopIds);
        [$mergedMods, $modsAdded] = $this->mergeList($current['mod_ids'], $modIds);

        $updates = [
            'WorkshopItems' => implode(';', $mergedWorkshop),
            'Mods' => implode(';', $mergedMods),
        ];

        $newMapFolders = [];

        if ($mapFolders !== []) {
            $maps = $this->splitList($this->iniParser->read($iniPath)['Map'] ?? 'Muldraugh, KY', ';');
            $mapSet = array_flip($maps);

            foreach ($mapFolders as $folder) {
                $folder = trim((string) $folder);
                if ($folder === '' || isset($mapSet[$folder])) {
                    continue;
                }
                $mapSet[$folder] = true;
                $newMapFolders[] = $folder;
            }

            if ($newMapFolders !== []) {
                $updates['Map'] = implode(';', array_merge($newMapFolders, $maps));
            }
        }

        if ($workshopAdded === 0 && $modsAdded === 0 && $newMapFolders === []) {
            return ['workshop_added' => 0, 'mods_added' => 0, 'maps_added' => 0];
        }

        $this->writeIniAndState($iniPath, $updates);

        return [
            'workshop_added' => $workshopAdded,
            'mods_added' => $modsAdded,
            'maps_added' => count($newMapFolders),
        ];
    }

    /**
     * Append trimmed, non-empty, not-yet-present items to $current, preserving order.
     *
     * @param  list<string>  $current
     * @param  list<string>  $incoming
     * @return array{0: list<string>, 1: int}  The merged list and the number added.
     */
    private function mergeList(array $current, array $incoming): array
    {
        $seen = array_flip($current);
        $added = 0;

        foreach ($incoming as $item) {
            $item = trim((string) $item);
            if ($item === '' || isset($seen[$item])) {
                continue;
            }
            $seen[$item] = true;
            $current[] = $item;
            $added++;
        }

        return [$current, $added];
    }

    /**
     * Read the current Workshop/Mods lists used by `add`, `remove`, and `reorder`.
     *
     * Prefers `.mod_state` (the web-UI's source of truth) over the live INI,
     * because PZ rewrites the INI on shutdown and may prune entries it didn't
     * load. Without this preference, an `add()` call performed while the INI
     * was pruned would silently drop every previously-installed mod.
     *
     * @return array{workshop_ids: list<string>, mod_ids: list<string>}
     */
    private function readCurrentLists(string $iniPath): array
    {
        $state = $this->parseStateFile(dirname($iniPath).'/.mod_state');

        if ($state !== null) {
            return [
                'workshop_ids' => $this->splitList($state['WorkshopItems']),
                'mod_ids' => $this->splitList($state['Mods']),
            ];
        }

        $config = $this->iniParser->read($iniPath);

        return [
            'workshop_ids' => $this->splitList($config['WorkshopItems'] ?? ''),
            'mod_ids' => $this->splitList($config['Mods'] ?? ''),
        ];
    }

    /**
     * Re-attach any protected mods that are absent from the given lists.
     * Mutates both arrays in-place. The protected mod is appended at the
     * end so the user's ordering of optional mods is preserved.
     *
     * @param  list<string>  $workshopIds
     * @param  list<string>  $modIds
     */
    private function ensureProtectedMods(array &$workshopIds, array &$modIds): void
    {
        foreach (self::PROTECTED_MODS as $workshopId => $modId) {
            // PHP coerces numeric string array keys to int, so cast back before
            // comparing against the string Workshop IDs we get from splitList.
            // Without the cast, in_array with strict=true treats int 3685323705
            // and "3685323705" as different and appends a duplicate every write.
            $workshopIdStr = (string) $workshopId;
            if (in_array($workshopIdStr, $workshopIds, true)) {
                continue;
            }
            $workshopIds[] = $workshopIdStr;
            $modIds[] = $modId;
        }
    }

    /**
     * Apply INI updates and write the mod state snapshot atomically. If the
     * state-file write fails, the prior INI content is restored so callers see
     * an all-or-nothing outcome rather than a partially-applied change.
     *
     * @param  array<string, string>  $updates
     */
    private function writeIniAndState(string $iniPath, array $updates): void
    {
        if (isset($updates['WorkshopItems']) && isset($updates['Mods'])) {
            $workshopIds = $this->splitList($updates['WorkshopItems']);
            $modIds = $this->splitList($updates['Mods']);
            $this->ensureProtectedMods($workshopIds, $modIds);
            $updates['WorkshopItems'] = implode(';', $workshopIds);
            $updates['Mods'] = implode(';', $modIds);
        }

        $previousIni = @file_get_contents($iniPath);

        $this->iniParser->write($iniPath, $updates);

        try {
            $this->writeModState($iniPath);
        } catch (\Throwable $e) {
            if ($previousIni !== false) {
                @file_put_contents($iniPath, $previousIni);
            }
            throw $e;
        }

        // Modded maps append their folder to the INI Map= line, but configure-server.sh
        // rewrites Map= from .config_state on every boot. Persist the change there too,
        // otherwise the modded map folder is dropped on the next container restart while
        // the map's mod survives (via .mod_state). Only Map goes through here — Mods and
        // WorkshopItems are restored from .mod_state, not .config_state.
        if (array_key_exists('Map', $updates)) {
            $this->configState->persistSettings(['Map' => $updates['Map']], $iniPath);
        }
    }

    /**
     * Write a mod state snapshot to the shared volume.
     *
     * This file is read by configure-server.sh on container restart
     * to restore web-UI mod changes that would otherwise be overwritten
     * by the game server image's own configuration logic.
     */
    private function writeModState(string $iniPath): void
    {
        $config = $this->iniParser->read($iniPath);

        $mods = str_replace(["\n", "\r"], '', $config['Mods'] ?? '');
        $workshopItems = str_replace(["\n", "\r"], '', $config['WorkshopItems'] ?? '');

        $stateFile = dirname($iniPath).'/.mod_state';
        $stateDir = dirname($stateFile);
        $contents = "Mods=$mods\nWorkshopItems=$workshopItems\n";
        $tempFile = @tempnam($stateDir, '.mod_state.');

        if ($tempFile === false || dirname($tempFile) !== $stateDir) {
            if ($tempFile !== false) {
                @unlink($tempFile);
            }
            throw new \RuntimeException("Unable to create temporary mod state file in {$stateDir}.");
        }

        try {
            if (@file_put_contents($tempFile, $contents) === false) {
                throw new \RuntimeException("Unable to write temporary mod state file {$tempFile}.");
            }

            if (! @rename($tempFile, $stateFile)) {
                throw new \RuntimeException("Unable to atomically replace mod state file {$stateFile}.");
            }

            @chmod($stateFile, 0644);
        } finally {
            if (is_file($tempFile)) {
                @unlink($tempFile);
            }
        }
    }

    /**
     * @return string[]
     */
    private function splitList(string $value, string $separator = ';'): array
    {
        if ($value === '') {
            return [];
        }

        return array_values(array_filter(
            array_map('trim', explode($separator, $value)),
            fn ($v) => $v !== '',
        ));
    }

    /**
     * Read and parse the installed workshop items and their timeupdated timestamps
     * directly from the game server's appworkshop_108600.acf file.
     *
     * @param string|null $acfPath
     * @return array<string, int> Map of workshop_id => timeupdated timestamp
     */
    public function getInstalledWorkshopTimestamps(?string $acfPath = null): array
    {
        $path = $acfPath ?? config('zomboid.paths.workshop_acf', config('zomboid.game_server_path').'/steamapps/workshop/appworkshop_108600.acf');

        if (! file_exists($path) || ! is_readable($path)) {
            return [];
        }

        $content = file_get_contents($path);
        if ($content === false) {
            return [];
        }

        $installed = [];
        if (preg_match('/"WorkshopItemsInstalled"\s*\{(?P<items>.*?)\}\s*"WorkshopItemDetails"/s', $content, $m)) {
            $section = $m['items'];
            if (preg_match_all('/"(\d+)"\s*\{[^}]*?"timeupdated"\s*"(\d+)"/s', $section, $itemMatches, PREG_SET_ORDER)) {
                foreach ($itemMatches as $item) {
                    $installed[$item[1]] = (int) $item[2];
                }
            }
        }

        return $installed;
    }
}
