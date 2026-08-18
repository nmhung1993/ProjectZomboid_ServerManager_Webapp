<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportModsRequest;
use App\Http\Requests\Admin\LookupWorkshopModRequest;
use App\Services\AuditLogger;
use App\Services\DockerManager;
use App\Services\ModManager;
use App\Services\SteamWorkshopClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ModController extends Controller
{
    public function __construct(
        private readonly ModManager $modManager,
        private readonly AuditLogger $auditLogger,
        private readonly DockerManager $dockerManager,
        private readonly SteamWorkshopClient $workshopClient,
    ) {}

    public function index(): Response
    {
        $mods = [];
        $pendingRestart = false;
        $serverRunning = false;

        try {
            $serverRunning = (bool) ($this->dockerManager->getContainerStatus()['running'] ?? false);
        } catch (\Throwable) {
            // Docker socket unreachable — treat server as stopped, keep rendering
        }

        try {
            $status = $this->modManager->listWithStatus(
                config('zomboid.paths.server_ini'),
                $serverRunning,
            );
            $mods = $status['mods'];
            $pendingRestart = $status['pending_restart'];
        } catch (\Throwable) {
            // Config not available — render empty list rather than 500
        }

        return Inertia::render('admin/mods', [
            'mods' => $mods,
            'protectedWorkshopIds' => array_keys(ModManager::PROTECTED_MODS),
            'pendingRestart' => $pendingRestart,
            'serverRunning' => $serverRunning,
        ]);
    }

    public function lookup(LookupWorkshopModRequest $request): JsonResponse
    {
        $workshopId = $request->validated('workshop_id');
        $details = $this->workshopClient->getDetails($workshopId);

        if ($details === null) {
            return response()->json([
                'found' => false,
                'workshop_id' => $workshopId,
            ], 404);
        }

        return response()->json([
            'found' => true,
            'workshop_id' => $details['workshop_id'],
            'title' => $details['title'],
            'preview_url' => $details['preview_url'],
            'mod_ids' => $details['mod_ids'],
            'map_folders' => $details['map_folders'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workshop_id' => 'required|string|max:20',
            'mod_id' => 'nullable|string|max:255',
            'mod_ids' => 'nullable|array',
            'mod_ids.*' => 'string|max:255',
            'map_folder' => 'nullable|string|max:255',
        ]);

        $modIds = $validated['mod_ids'] ?? (isset($validated['mod_id']) && $validated['mod_id'] !== '' ? [$validated['mod_id']] : []);
        if (empty($modIds)) {
            $details = $this->workshopClient->getDetails($validated['workshop_id']);
            if ($details && ! empty($details['mod_ids'])) {
                $modIds = $details['mod_ids'];
                if (empty($validated['map_folder']) && ! empty($details['map_folders'])) {
                    $validated['map_folder'] = $details['map_folders'][0];
                }
            }
        }

        if (empty($modIds)) {
            return response()->json([
                'error' => 'At least one Mod ID is required.',
            ], 422);
        }

        try {
            $this->modManager->add(
                config('zomboid.paths.server_ini'),
                $validated['workshop_id'],
                $modIds,
                $validated['map_folder'] ?? null,
            );
        } catch (RuntimeException $e) {
            Log::error('Failed to add mod', ['exception' => $e, 'mod' => $validated]);

            return response()->json([
                'error' => 'Could not write the server config. The server may still be starting, or the config volume is not writable.',
            ], 500);
        }

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'mod.add',
            target: $validated['workshop_id'],
            details: $validated,
            ip: $request->ip(),
        );

        return response()->json([
            'added' => $validated,
            'restart_required' => true,
        ], 201);
    }

    public function update(Request $request, string $workshopId): JsonResponse
    {
        $validated = $request->validate([
            'mod_id' => 'nullable|string|max:255',
            'mod_ids' => 'nullable|array',
            'mod_ids.*' => 'string|max:255',
            'map_folder' => 'nullable|string|max:255',
        ]);

        $modIds = $validated['mod_ids'] ?? (isset($validated['mod_id']) && $validated['mod_id'] !== '' ? [$validated['mod_id']] : []);
        if (empty($modIds)) {
            $details = $this->workshopClient->getDetails($workshopId);
            if ($details && ! empty($details['mod_ids'])) {
                $modIds = $details['mod_ids'];
            }
        }

        if (empty($modIds)) {
            return response()->json([
                'error' => 'At least one Mod ID is required.',
            ], 422);
        }

        try {
            $this->modManager->update(
                config('zomboid.paths.server_ini'),
                $workshopId,
                $modIds,
                $validated['map_folder'] ?? null,
            );
        } catch (RuntimeException $e) {
            Log::error('Failed to update mod', ['exception' => $e, 'workshop_id' => $workshopId, 'data' => $validated]);

            return response()->json([
                'error' => 'Could not write the server config. The server may still be starting, or the config volume is not writable.',
            ], 500);
        }

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'mod.update',
            target: $workshopId,
            details: ['workshop_id' => $workshopId, 'mod_ids' => $modIds, 'map_folder' => $validated['map_folder'] ?? null],
            ip: $request->ip(),
        );

        return response()->json([
            'updated' => ['workshop_id' => $workshopId, 'mod_ids' => $modIds],
            'restart_required' => true,
        ]);
    }

    public function destroy(Request $request, string $workshopId): JsonResponse
    {
        if (ModManager::isProtected($workshopId)) {
            return response()->json([
                'error' => 'This mod is required by the manager and cannot be removed.',
            ], 422);
        }

        try {
            $removed = $this->modManager->remove(
                config('zomboid.paths.server_ini'),
                $workshopId,
            );
        } catch (RuntimeException $e) {
            Log::error('Failed to remove mod', ['exception' => $e, 'workshop_id' => $workshopId]);

            return response()->json([
                'error' => 'Could not write the server config. The server may still be starting, or the config volume is not writable.',
            ], 500);
        }

        if (! $removed) {
            return response()->json(['error' => 'Mod not found'], 404);
        }

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'mod.remove',
            target: $workshopId,
            details: $removed,
            ip: $request->ip(),
        );

        return response()->json([
            'removed' => $removed,
            'restart_required' => true,
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mods' => 'required|array',
            'mods.*.workshop_id' => 'required|string',
            'mods.*.mod_id' => 'nullable|string',
            'mods.*.mod_ids' => 'nullable|array',
            'mods.*.mod_ids.*' => 'string',
        ]);

        try {
            $this->modManager->reorder(
                config('zomboid.paths.server_ini'),
                $validated['mods'],
            );
        } catch (RuntimeException $e) {
            Log::error('Failed to reorder mods', ['exception' => $e]);

            return response()->json([
                'error' => 'Could not write the server config. The server may still be starting, or the config volume is not writable.',
            ], 500);
        }

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'mod.reorder',
            details: ['count' => count($validated['mods'])],
            ip: $request->ip(),
        );

        $serverRunning = false;
        try {
            $serverRunning = (bool) ($this->dockerManager->getContainerStatus()['running'] ?? false);
        } catch (\Throwable) {
            // Docker unreachable
        }

        $status = $this->modManager->listWithStatus(
            config('zomboid.paths.server_ini'),
            $serverRunning,
        );

        return response()->json([
            'mods' => $status['mods'],
            'pending_restart' => $status['pending_restart'],
            'restart_required' => true,
        ]);
    }

    /**
     * Merge a pasted modpack (Workshop/Mods pairs + optional map folders) into the
     * current list in one write. The result lands in `.mod_state` so it survives
     * container restarts; map folders are persisted to `.config_state` too.
     */
    public function import(ImportModsRequest $request): JsonResponse
    {
        $workshopIds = $request->validated('workshop_ids', []);
        $modIds = $request->validated('mod_ids', []);
        $mapFolders = $request->validated('map', []);

        try {
            $summary = $this->modManager->bulkImport(
                config('zomboid.paths.server_ini'),
                $workshopIds,
                $modIds,
                $mapFolders,
            );
        } catch (RuntimeException $e) {
            Log::error('Failed to bulk import mods', ['exception' => $e]);

            return response()->json([
                'error' => 'Could not write the server config. The server may still be starting, or the config volume is not writable.',
            ], 500);
        }

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'mod.import',
            target: 'server.ini',
            details: $summary,
            ip: $request->ip(),
        );

        $serverRunning = false;

        try {
            $serverRunning = (bool) ($this->dockerManager->getContainerStatus()['running'] ?? false);
        } catch (\Throwable) {
            // Docker socket unreachable — report the list without live status
        }

        $status = $this->modManager->listWithStatus(
            config('zomboid.paths.server_ini'),
            $serverRunning,
        );

        return response()->json([
            'mods' => $status['mods'],
            'pending_restart' => $status['pending_restart'],
            'summary' => $summary,
            'restart_required' => true,
        ], 201);
    }
}
