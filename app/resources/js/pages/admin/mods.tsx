import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors  } from '@dnd-kit/core';
import type {DragEndEvent} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Clock, FileUp, GripVertical, Loader2, Package, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { fetchAction } from '@/lib/fetch-action';
import { parseModImport } from '@/lib/parse-mod-import';
import type { BreadcrumbItem, ModEntry } from '@/types';

type LookupResult = {
    found: boolean;
    workshop_id: string;
    title?: string;
    preview_url?: string | null;
    mod_ids?: string[];
    map_folders?: string[];
};

type LookupState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; title: string; previewUrl: string | null; modIds: string[]; mapFolders: string[] }
    | { status: 'not_found' }
    | { status: 'no_mod_ids'; title: string; previewUrl: string | null; mapFolders: string[] }
    | { status: 'error' };

function StatusBadge({ status }: { status: ModEntry['status'] }) {
    const { t } = useTranslation();

    if (status === 'active') {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                data-testid="mod-status-active"
            >
                <CheckCircle2 className="size-3" />
                {t('admin.mods.status_active')}
            </Badge>
        );
    }

    if (status === 'pending_restart') {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                data-testid="mod-status-pending"
            >
                <Clock className="size-3" />
                {t('admin.mods.status_pending')}
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="gap-1 text-muted-foreground" data-testid="mod-status-stopped">
            {t('admin.mods.status_stopped')}
        </Badge>
    );
}

function SortableModRow({
    mod,
    index,
    onEdit,
    onDelete,
    isDragDisabled,
    isProtected,
}: {
    mod: ModEntry;
    index: number;
    onEdit: (mod: ModEntry) => void;
    onDelete: (mod: ModEntry) => void;
    isDragDisabled: boolean;
    isProtected: boolean;
}) {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: mod.workshop_id || mod.mod_id || String(index),
        disabled: isDragDisabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
    };

    const modIdList = useMemo(() => {
        if (mod.mod_ids && mod.mod_ids.length > 0) {
            return mod.mod_ids;
        }
        if (mod.mod_id) {
            return mod.mod_id.split(';').map((s) => s.trim()).filter(Boolean);
        }
        return [];
    }, [mod.mod_ids, mod.mod_id]);

    return (
        <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : undefined}>
            <TableCell className="w-[50px]">
                {!isDragDisabled ? (
                    <button
                        type="button"
                        aria-label={`Reorder ${mod.mod_id}`}
                        className="cursor-grab touch-none text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="size-4" />
                    </button>
                ) : (
                    <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                )}
            </TableCell>
            <TableCell className="font-medium">
                <div className="flex flex-wrap items-center gap-1.5">
                    {modIdList.length > 1 ? (
                        modIdList.map((id) => (
                            <Badge key={id} variant="secondary" className="font-mono text-xs">
                                {id}
                            </Badge>
                        ))
                    ) : (
                        <span>{modIdList[0] || mod.mod_id}</span>
                    )}
                    {isProtected && (
                        <Badge variant="outline" className="text-xs">
                            {t('admin.mods.required_badge')}
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
                {mod.workshop_id ? (
                    <Badge variant="secondary" className="font-mono text-xs">
                        {mod.workshop_id}
                    </Badge>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell>
                <StatusBadge status={mod.status} />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(mod)}
                        title={t('admin.mods.edit_mod')}
                        data-testid={`edit-mod-${mod.workshop_id || mod.mod_id}`}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    {!isProtected && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(mod)}
                            title={t('admin.mods.delete_dialog_title')}
                            data-testid={`delete-mod-${mod.workshop_id || mod.mod_id}`}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

export default function Mods({
    mods,
    protectedWorkshopIds = [],
    pendingRestart = false,
    serverRunning = false,
}: {
    mods: ModEntry[];
    protectedWorkshopIds?: string[];
    pendingRestart?: boolean;
    serverRunning?: boolean;
}) {
    const { t } = useTranslation();
    const protectedSet = useMemo(() => new Set(protectedWorkshopIds), [protectedWorkshopIds]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('admin.mods.title'), href: '/admin/mods' },
    ];
    const [showAdd, setShowAdd] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ModEntry | null>(null);
    const [workshopId, setWorkshopId] = useState('');
    const [modId, setModId] = useState('');
    const [selectedModIds, setSelectedModIds] = useState<string[]>([]);
    const [customModInput, setCustomModInput] = useState('');
    const [mapFolder, setMapFolder] = useState('');
    const [loading, setLoading] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [search, setSearch] = useState('');
    const [orderedMods, setOrderedMods] = useState(mods);
    const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
    const [manualOverride, setManualOverride] = useState(false);
    const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lookupAbort = useRef<AbortController | null>(null);

    // Edit Mod Dialog State
    const [editTarget, setEditTarget] = useState<ModEntry | null>(null);
    const [editWorkshopId, setEditWorkshopId] = useState('');
    const [editModIds, setEditModIds] = useState<string[]>([]);
    const [editCustomModInput, setEditCustomModInput] = useState('');
    const [editMapFolder, setEditMapFolder] = useState('');
    const [editLookup, setEditLookup] = useState<LookupState>({ status: 'idle' });
    const [editManualOverride, setEditManualOverride] = useState(false);
    const [editManualText, setEditManualText] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    const existingWorkshopIds = useMemo(() => new Set(mods.map((m) => m.workshop_id).filter(Boolean)), [mods]);
    const existingModIds = useMemo(() => new Set(mods.map((m) => m.mod_id).filter(Boolean)), [mods]);

    const [showBulk, setShowBulk] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkPhase, setBulkPhase] = useState<'input' | 'resolving' | 'ready'>('input');
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
    const [bulkWorkshopIds, setBulkWorkshopIds] = useState<string[]>([]);
    const [bulkModIds, setBulkModIds] = useState<string[]>([]);
    const [bulkMapFolders, setBulkMapFolders] = useState<string[]>([]);
    const [bulkUnresolved, setBulkUnresolved] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const bulkCancelled = useRef(false);

    const isFiltering = search.length > 0;

    const bulkNewMods = bulkModIds.filter((m) => !existingModIds.has(m)).length;
    const bulkNewWorkshop = bulkWorkshopIds.filter((w) => !existingWorkshopIds.has(w)).length;
    const bulkHasSomething = bulkModIds.length > 0 || bulkWorkshopIds.length > 0;

    function openBulk() {
        bulkCancelled.current = false;
        setBulkText('');
        setBulkPhase('input');
        setBulkProgress({ done: 0, total: 0 });
        setBulkWorkshopIds([]);
        setBulkModIds([]);
        setBulkMapFolders([]);
        setBulkUnresolved([]);
        setShowBulk(true);
    }

    function closeBulk() {
        bulkCancelled.current = true;
        setShowBulk(false);
    }

    async function prepareBulk() {
        const parsed = parseModImport(bulkText);
        setBulkMapFolders(parsed.mapFolders);

        if (parsed.mode === 'ini') {
            setBulkWorkshopIds(parsed.workshopIds);
            setBulkModIds(parsed.modIds);
            setBulkUnresolved([]);
            setBulkPhase('ready');
            return;
        }

        // IDs-only: resolve each Workshop ID's mod IDs via the Steam lookup endpoint.
        bulkCancelled.current = false;
        setBulkPhase('resolving');
        setBulkProgress({ done: 0, total: parsed.workshopIds.length });

        const workshopIds: string[] = [];
        const modIds: string[] = [];
        const mapFolders: string[] = [...parsed.mapFolders];
        const unresolved: string[] = [];

        for (let i = 0; i < parsed.workshopIds.length; i++) {
            if (bulkCancelled.current) {
                return;
            }
            const id = parsed.workshopIds[i];
            const json = (await fetchAction('/admin/mods/lookup', {
                data: { workshop_id: id },
                silent: true,
            })) as { found?: boolean; mod_ids?: string[]; map_folders?: string[] } | null;

            const ids = json?.mod_ids ?? [];
            if (json && json.found !== false && ids.length > 0) {
                workshopIds.push(id);
                modIds.push(...ids);
                if (json.map_folders) {
                    mapFolders.push(...json.map_folders);
                }
            } else {
                unresolved.push(id);
            }
            setBulkProgress({ done: i + 1, total: parsed.workshopIds.length });
        }

        if (bulkCancelled.current) {
            return;
        }
        setBulkWorkshopIds(workshopIds);
        setBulkModIds(modIds);
        setBulkMapFolders(mapFolders);
        setBulkUnresolved(unresolved);
        setBulkPhase('ready');
    }

    async function submitBulk() {
        setImporting(true);
        const result = await fetchAction('/admin/mods/import', {
            data: {
                workshop_ids: bulkWorkshopIds,
                mod_ids: bulkModIds,
                map: bulkMapFolders,
            },
            successMessage: t('admin.mods.bulk_toast_imported', {
                count: String(bulkModIds.length || bulkWorkshopIds.length),
            }),
        });
        setImporting(false);
        if (result) {
            closeBulk();
            router.reload({ only: ['mods', 'pendingRestart', 'serverRunning'] });
        }
    }

    useEffect(() => {
        setOrderedMods(mods);
    }, [mods]);

    const resetLookupState = useCallback(() => {
        setLookup({ status: 'idle' });
        setModId('');
        setSelectedModIds([]);
        setCustomModInput('');
        setMapFolder('');
        setManualOverride(false);
    }, []);

    const runLookup = useCallback(async (rawId: string) => {
        const trimmed = rawId.trim();
        if (!/^\d{1,20}$/.test(trimmed)) {
            setLookup({ status: 'idle' });
            return;
        }

        lookupAbort.current?.abort();
        const controller = new AbortController();
        lookupAbort.current = controller;
        setLookup({ status: 'loading' });

        const json = (await fetchAction('/admin/mods/lookup', {
            data: { workshop_id: trimmed },
            silent: true,
            signal: controller.signal,
        })) as LookupResult | null;

        if (controller.signal.aborted) return;

        if (!json || json.found === false) {
            setLookup({ status: 'not_found' });
            setModId('');
            setSelectedModIds([]);
            setMapFolder('');
            setManualOverride(true);
            return;
        }

        const modIds = json.mod_ids ?? [];
        const mapFolders = json.map_folders ?? [];
        const title = json.title ?? '';
        const previewUrl = json.preview_url ?? null;

        if (modIds.length === 0) {
            setLookup({ status: 'no_mod_ids', title, previewUrl, mapFolders });
            setModId('');
            setSelectedModIds([]);
            setMapFolder(mapFolders[0] ?? '');
            setManualOverride(true);
            return;
        }

        setLookup({ status: 'success', title, previewUrl, modIds, mapFolders });
        setSelectedModIds(modIds);
        setModId(modIds[0] || '');
        setMapFolder(mapFolders[0] ?? '');
        setManualOverride(false);
    }, []);

    useEffect(() => {
        if (!showAdd) {
            return;
        }
        if (lookupTimer.current) {
            clearTimeout(lookupTimer.current);
        }
        const trimmed = workshopId.trim();
        if (trimmed === '') {
            resetLookupState();
            return;
        }
        lookupTimer.current = setTimeout(() => {
            runLookup(trimmed);
        }, 400);
        return () => {
            if (lookupTimer.current) clearTimeout(lookupTimer.current);
        };
    }, [workshopId, showAdd, runLookup, resetLookupState]);

    const filteredMods = useMemo(() => {
        if (!search) return orderedMods;
        const q = search.toLowerCase();
        return orderedMods.filter((m) => m.mod_id.toLowerCase().includes(q) || m.workshop_id.toLowerCase().includes(q));
    }, [orderedMods, search]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = orderedMods.findIndex((m) => (m.workshop_id || m.mod_id) === active.id);
        const newIndex = orderedMods.findIndex((m) => (m.workshop_id || m.mod_id) === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(orderedMods, oldIndex, newIndex);
        setOrderedMods(reordered);

        await fetchAction('/admin/mods/order', {
            method: 'PUT',
            data: {
                mods: reordered.map((m) => ({ workshop_id: m.workshop_id, mod_id: m.mod_id })),
            },
            successMessage: t('admin.mods.toast_order_updated'),
        });

        router.reload({ only: ['mods', 'pendingRestart', 'serverRunning'] });
    }

    async function restartServer() {
        setRestarting(true);
        await fetchAction('/admin/server/restart', {
            method: 'POST',
            successMessage: t('admin.mods.toast_restart_started'),
        });
        setRestarting(false);
        router.reload({ only: ['mods', 'pendingRestart', 'serverRunning'] });
    }

    function closeAddDialog() {
        setShowAdd(false);
        setWorkshopId('');
        resetLookupState();
    }

    function toggleSelectModId(id: string) {
        setSelectedModIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    function addCustomModIdToAddDialog() {
        const trimmed = customModInput.trim();
        if (trimmed && !selectedModIds.includes(trimmed)) {
            setSelectedModIds((prev) => [...prev, trimmed]);
            setCustomModInput('');
        }
    }

    function removeSelectedModId(id: string) {
        setSelectedModIds((prev) => prev.filter((item) => item !== id));
    }

    async function addMod() {
        setLoading(true);
        const finalModIds = manualOverride
            ? modId.split(';').map((s) => s.trim()).filter(Boolean)
            : (selectedModIds.length > 0 ? selectedModIds : (modId ? [modId] : []));

        await fetchAction('/admin/mods', {
            data: {
                workshop_id: workshopId,
                mod_ids: finalModIds,
                map_folder: mapFolder || null,
            },
            successMessage: t('admin.mods.toast_added', { mod_id: finalModIds.join(', ') || workshopId }),
        });
        setLoading(false);
        closeAddDialog();
        router.reload({ only: ['mods', 'pendingRestart', 'serverRunning'] });
    }

    // Edit Mod Handlers
    async function openEdit(mod: ModEntry) {
        setEditTarget(mod);
        setEditWorkshopId(mod.workshop_id);
        const initialIds = mod.mod_ids && mod.mod_ids.length > 0
            ? [...mod.mod_ids]
            : (mod.mod_id ? mod.mod_id.split(';').map((s) => s.trim()).filter(Boolean) : []);
        setEditModIds(initialIds);
        setEditCustomModInput('');
        setEditMapFolder(mod.map_folder || '');
        setEditManualOverride(false);
        setEditManualText(initialIds.join('; '));
        setEditLookup({ status: 'idle' });

        if (mod.workshop_id && /^\d{1,20}$/.test(mod.workshop_id.trim())) {
            setEditLookup({ status: 'loading' });
            const json = (await fetchAction('/admin/mods/lookup', {
                data: { workshop_id: mod.workshop_id.trim() },
                silent: true,
            })) as LookupResult | null;

            if (json && json.found !== false) {
                const discModIds = json.mod_ids ?? [];
                const discMapFolders = json.map_folders ?? [];
                const title = json.title ?? '';
                const previewUrl = json.preview_url ?? null;
                setEditLookup({ status: 'success', title, previewUrl, modIds: discModIds, mapFolders: discMapFolders });
            } else {
                setEditLookup({ status: 'not_found' });
            }
        }
    }

    function closeEditDialog() {
        setEditTarget(null);
        setEditLookup({ status: 'idle' });
        setEditModIds([]);
        setEditCustomModInput('');
        setEditManualOverride(false);
    }

    function toggleEditModId(id: string) {
        setEditModIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    function addCustomModIdToEditDialog() {
        const trimmed = editCustomModInput.trim();
        if (trimmed && !editModIds.includes(trimmed)) {
            setEditModIds((prev) => [...prev, trimmed]);
            setEditCustomModInput('');
        }
    }

    function removeEditModId(id: string) {
        setEditModIds((prev) => prev.filter((item) => item !== id));
    }

    async function saveEditMod() {
        if (!editTarget) return;
        setEditLoading(true);

        const finalModIds = editManualOverride
            ? editManualText.split(';').map((s) => s.trim()).filter(Boolean)
            : editModIds;

        await fetchAction(`/admin/mods/${editWorkshopId || editTarget.workshop_id}`, {
            method: 'PUT',
            data: {
                mod_ids: finalModIds,
                map_folder: editMapFolder || null,
            },
            successMessage: t('admin.mods.toast_updated', {
                count: String(finalModIds.length),
                workshop_id: editWorkshopId || editTarget.workshop_id,
            }),
        });

        setEditLoading(false);
        closeEditDialog();
        router.reload({ only: ['mods', 'pendingRestart', 'serverRunning'] });
    }

    async function removeMod(mod: ModEntry) {
        setLoading(true);
        await fetchAction(`/admin/mods/${mod.workshop_id}`, {
            method: 'DELETE',
            successMessage: t('admin.mods.toast_removed', { mod_id: mod.mod_id }),
        });
        setLoading(false);
        setDeleteTarget(null);
        router.reload({ only: ['mods', 'pendingRestart', 'serverRunning'] });
    }

    const canSubmitAdd = useMemo(() => {
        if (loading || lookup.status === 'loading') return false;
        if (!workshopId.trim()) return false;
        if (manualOverride) {
            return modId.trim().length > 0;
        }
        return selectedModIds.length > 0 || modId.trim().length > 0;
    }, [loading, lookup.status, workshopId, manualOverride, modId, selectedModIds]);

    const canSubmitEdit = useMemo(() => {
        if (editLoading) return false;
        if (editManualOverride) {
            return editManualText.trim().length > 0;
        }
        return editModIds.length > 0;
    }, [editLoading, editManualOverride, editManualText, editModIds]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.mods.title')} />
            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('admin.mods.title')}</h1>
                        <p className="text-muted-foreground">
                            {t('admin.mods.mods_installed', { count: String(mods.length) })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={openBulk} data-testid="bulk-import-button">
                            <FileUp className="mr-1.5 size-4" />
                            {t('admin.mods.bulk_import')}
                        </Button>
                        <Button onClick={() => setShowAdd(true)} data-testid="add-mod-button">
                            <Plus className="mr-1.5 size-4" />
                            {t('admin.mods.add_mod')}
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="size-5" />
                                    {t('admin.mods.installed_mods')}
                                </CardTitle>
                                <CardDescription>
                                    {t('admin.mods.installed_mods_description', { filtered: String(filteredMods.length), total: String(mods.length) })}
                                </CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('admin.mods.search_placeholder')}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 sm:w-[200px]"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {pendingRestart && (
                            <Alert
                                className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600"
                                data-testid="pending-restart-banner"
                            >
                                <AlertTriangle className="size-4" />
                                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <span>{t('admin.mods.pending_restart_banner')}</span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={restarting || !serverRunning}
                                        onClick={restartServer}
                                        data-testid="restart-server-button"
                                    >
                                        <RotateCcw className={`mr-1.5 size-4 ${restarting ? 'animate-spin' : ''}`} />
                                        {restarting ? t('admin.mods.restarting') : t('admin.mods.restart_now')}
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}
                        {filteredMods.length > 0 ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">{isFiltering ? '#' : ''}</TableHead>
                                            <TableHead>{t('admin.mods.table_mod_id')}</TableHead>
                                            <TableHead className="hidden sm:table-cell">{t('admin.mods.table_workshop_id')}</TableHead>
                                            <TableHead>{t('admin.mods.table_status')}</TableHead>
                                            <TableHead className="text-right">{t('common.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <SortableContext
                                        items={filteredMods.map((m) => m.workshop_id || m.mod_id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <TableBody>
                                            {filteredMods.map((mod, index) => (
                                                <SortableModRow
                                                    key={mod.workshop_id || mod.mod_id || index}
                                                    mod={mod}
                                                    index={index}
                                                    onEdit={openEdit}
                                                    onDelete={setDeleteTarget}
                                                    isDragDisabled={isFiltering}
                                                    isProtected={protectedSet.has(mod.workshop_id)}
                                                />
                                            ))}
                                        </TableBody>
                                    </SortableContext>
                                </Table>
                            </DndContext>
                        ) : (
                            <p className="py-8 text-center text-muted-foreground">
                                {search ? t('admin.mods.no_mods_search') : t('admin.mods.no_mods')}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Mod Dialog */}
            <Dialog open={showAdd} onOpenChange={(open) => (open ? setShowAdd(true) : closeAddDialog())}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('admin.mods.add_dialog_title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.mods.add_dialog_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="workshop-id">{t('admin.mods.table_workshop_id')}</Label>
                            <div className="relative">
                                <Input
                                    id="workshop-id"
                                    inputMode="numeric"
                                    value={workshopId}
                                    onChange={(e) => setWorkshopId(e.target.value)}
                                    placeholder={t('admin.mods.workshop_id_placeholder')}
                                    data-testid="workshop-id-input"
                                />
                                {lookup.status === 'loading' && (
                                    <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            {(lookup.status === 'success' || lookup.status === 'no_mod_ids') && (
                                <div
                                    className="flex items-center gap-3 rounded-md border bg-muted/30 p-2"
                                    data-testid="workshop-preview"
                                >
                                    {lookup.previewUrl && (
                                        <img
                                            src={lookup.previewUrl}
                                            alt=""
                                            className="size-10 rounded object-cover"
                                        />
                                    )}
                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                        {lookup.title}
                                    </p>
                                </div>
                            )}
                            {lookup.status === 'not_found' && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    {t('admin.mods.lookup_not_found')}
                                </p>
                            )}
                            {lookup.status === 'error' && (
                                <p className="text-xs text-destructive">
                                    {t('admin.mods.lookup_error')}
                                </p>
                            )}
                            {lookup.status === 'no_mod_ids' && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    {t('admin.mods.lookup_no_mod_ids')}
                                </p>
                            )}
                        </div>

                        {/* Discovered Mod IDs from Steam */}
                        {lookup.status === 'success' && !manualOverride && lookup.modIds.length > 0 && (
                            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">
                                        {t('admin.mods.available_mods_from_steam')}
                                    </Label>
                                    <div className="flex gap-2 text-xs">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-primary hover:underline"
                                            onClick={() => setSelectedModIds([...lookup.modIds])}
                                        >
                                            {t('admin.mods.select_all')}
                                        </Button>
                                        <span className="text-muted-foreground">·</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-muted-foreground hover:underline"
                                            onClick={() => setSelectedModIds([])}
                                        >
                                            {t('admin.mods.deselect_all')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {lookup.modIds.map((id) => (
                                        <label
                                            key={id}
                                            className="flex items-center gap-2.5 rounded-md border bg-background/60 p-2 text-xs hover:bg-muted/50 cursor-pointer transition-colors"
                                        >
                                            <Checkbox
                                                checked={selectedModIds.includes(id)}
                                                onCheckedChange={() => toggleSelectModId(id)}
                                            />
                                            <span className="font-mono font-medium">{id}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active / Custom Mod IDs */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="mod-id">
                                    {manualOverride ? t('admin.mods.table_mod_id') : t('admin.mods.custom_mods_label')}
                                </Label>
                                {lookup.status === 'success' && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto px-2 py-0.5 text-xs"
                                        onClick={() => {
                                            if (!manualOverride) {
                                                setModId(selectedModIds.join('; '));
                                            } else {
                                                setSelectedModIds(modId.split(';').map((s) => s.trim()).filter(Boolean));
                                            }
                                            setManualOverride(!manualOverride);
                                        }}
                                        data-testid="mod-id-edit-manually"
                                    >
                                        <Pencil className="mr-1 size-3" />
                                        {manualOverride ? t('common.cancel') : t('admin.mods.edit_manually')}
                                    </Button>
                                )}
                            </div>

                            {manualOverride || lookup.status !== 'success' ? (
                                <>
                                    <Input
                                        id="mod-id"
                                        value={modId}
                                        onChange={(e) => setModId(e.target.value)}
                                        placeholder={t('admin.mods.mod_id_placeholder')}
                                        disabled={lookup.status === 'loading'}
                                        data-testid="mod-id-input"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Phân tách nhiều Mod ID bằng dấu chấm phẩy (;)
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    {selectedModIds.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 rounded-md border bg-background p-2">
                                            {selectedModIds.map((id) => (
                                                <Badge
                                                    key={id}
                                                    variant="secondary"
                                                    className="gap-1 font-mono text-xs pr-1"
                                                >
                                                    {id}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSelectedModId(id)}
                                                        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                                                    >
                                                        <X className="size-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                            {t('admin.mods.no_mod_selected')}
                                        </p>
                                    )}

                                    {/* Add custom mod ID input */}
                                    <div className="flex gap-2 pt-1">
                                        <Input
                                            value={customModInput}
                                            onChange={(e) => setCustomModInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addCustomModIdToAddDialog();
                                                }
                                            }}
                                            placeholder={t('admin.mods.custom_mod_id_placeholder')}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            disabled={!customModInput.trim()}
                                            onClick={addCustomModIdToAddDialog}
                                        >
                                            <Plus className="mr-1 size-3" />
                                            {t('common.add')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="map-folder">{t('admin.mods.map_folder_label')}</Label>
                            {lookup.status === 'success' && lookup.mapFolders.length > 1 ? (
                                <Select value={mapFolder || '__none__'} onValueChange={(v) => setMapFolder(v === '__none__' ? '' : v)}>
                                    <SelectTrigger id="map-folder">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">{t('admin.mods.map_folder_none')}</SelectItem>
                                        {lookup.mapFolders.map((f) => (
                                            <SelectItem key={f} value={f}>
                                                {f}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="map-folder"
                                    value={mapFolder}
                                    onChange={(e) => setMapFolder(e.target.value)}
                                    placeholder={t('admin.mods.map_folder_placeholder')}
                                />
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeAddDialog}>{t('common.cancel')}</Button>
                        <Button disabled={!canSubmitAdd} onClick={addMod} data-testid="submit-add-mod">
                            {t('admin.mods.add_mod')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Mod Dialog */}
            <Dialog open={editTarget !== null} onOpenChange={(open) => (open ? null : closeEditDialog())}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="size-4" />
                            {t('admin.mods.edit_dialog_title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.mods.edit_dialog_description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Workshop ID display */}
                        <div className="space-y-2">
                            <Label>{t('admin.mods.table_workshop_id')}</Label>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-sm px-2.5 py-1">
                                    {editWorkshopId || editTarget?.workshop_id || '—'}
                                </Badge>
                                {editLookup.status === 'loading' && (
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {editLookup.status === 'success' && (
                                <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
                                    {editLookup.previewUrl && (
                                        <img
                                            src={editLookup.previewUrl}
                                            alt=""
                                            className="size-10 rounded object-cover"
                                        />
                                    )}
                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                        {editLookup.title}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Discovered Mod IDs from Steam */}
                        {editLookup.status === 'success' && !editManualOverride && editLookup.modIds.length > 0 && (
                            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">
                                        {t('admin.mods.available_mods_from_steam')}
                                    </Label>
                                    <div className="flex gap-2 text-xs">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-primary hover:underline"
                                            onClick={() => {
                                                const merged = arrayMove([...new Set([...editModIds, ...editLookup.modIds])], 0, 0);
                                                setEditModIds(merged);
                                            }}
                                        >
                                            {t('admin.mods.select_all')}
                                        </Button>
                                        <span className="text-muted-foreground">·</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-xs text-muted-foreground hover:underline"
                                            onClick={() => {
                                                const steamSet = new Set(editLookup.modIds);
                                                setEditModIds(editModIds.filter((id) => !steamSet.has(id)));
                                            }}
                                        >
                                            {t('admin.mods.deselect_all')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {editLookup.modIds.map((id) => (
                                        <label
                                            key={id}
                                            className="flex items-center gap-2.5 rounded-md border bg-background/60 p-2 text-xs hover:bg-muted/50 cursor-pointer transition-colors"
                                        >
                                            <Checkbox
                                                checked={editModIds.includes(id)}
                                                onCheckedChange={() => toggleEditModId(id)}
                                            />
                                            <span className="font-mono font-medium">{id}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mod IDs Configuration */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>
                                    {editManualOverride ? t('admin.mods.table_mod_id') : t('admin.mods.custom_mods_label')}
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto px-2 py-0.5 text-xs"
                                    onClick={() => {
                                        if (!editManualOverride) {
                                            setEditManualText(editModIds.join('; '));
                                        } else {
                                            setEditModIds(editManualText.split(';').map((s) => s.trim()).filter(Boolean));
                                        }
                                        setEditManualOverride(!editManualOverride);
                                    }}
                                >
                                    <Pencil className="mr-1 size-3" />
                                    {editManualOverride ? t('common.cancel') : t('admin.mods.edit_manually')}
                                </Button>
                            </div>

                            {editManualOverride ? (
                                <>
                                    <Textarea
                                        value={editManualText}
                                        onChange={(e) => setEditManualText(e.target.value)}
                                        placeholder={t('admin.mods.mod_id_placeholder')}
                                        rows={3}
                                        className="font-mono text-xs"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Phân tách nhiều Mod ID bằng dấu chấm phẩy (;)
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    {editModIds.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 rounded-md border bg-background p-2 min-h-[44px]">
                                            {editModIds.map((id) => (
                                                <Badge
                                                    key={id}
                                                    variant="secondary"
                                                    className="gap-1 font-mono text-xs pr-1"
                                                >
                                                    {id}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEditModId(id)}
                                                        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                                                    >
                                                        <X className="size-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                            {t('admin.mods.no_mod_selected')}
                                        </p>
                                    )}

                                    {/* Add custom mod ID input */}
                                    <div className="flex gap-2 pt-1">
                                        <Input
                                            value={editCustomModInput}
                                            onChange={(e) => setEditCustomModInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addCustomModIdToEditDialog();
                                                }
                                            }}
                                            placeholder={t('admin.mods.custom_mod_id_placeholder')}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            disabled={!editCustomModInput.trim()}
                                            onClick={addCustomModIdToEditDialog}
                                        >
                                            <Plus className="mr-1 size-3" />
                                            {t('common.add')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Map Folder */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-map-folder">{t('admin.mods.map_folder_label')}</Label>
                            {editLookup.status === 'success' && editLookup.mapFolders.length > 1 ? (
                                <Select value={editMapFolder || '__none__'} onValueChange={(v) => setEditMapFolder(v === '__none__' ? '' : v)}>
                                    <SelectTrigger id="edit-map-folder">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">{t('admin.mods.map_folder_none')}</SelectItem>
                                        {editLookup.mapFolders.map((f) => (
                                            <SelectItem key={f} value={f}>
                                                {f}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="edit-map-folder"
                                    value={editMapFolder}
                                    onChange={(e) => setEditMapFolder(e.target.value)}
                                    placeholder={t('admin.mods.map_folder_placeholder')}
                                />
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditDialog}>{t('common.cancel')}</Button>
                        <Button disabled={!canSubmitEdit} onClick={saveEditMod} data-testid="submit-edit-mod">
                            {t('admin.mods.save_changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Dialog */}
            <Dialog open={showBulk} onOpenChange={(open) => (open ? setShowBulk(true) : closeBulk())}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('admin.mods.bulk_dialog_title')}</DialogTitle>
                        <DialogDescription>{t('admin.mods.bulk_dialog_description')}</DialogDescription>
                    </DialogHeader>

                    {bulkPhase === 'input' && (
                        <div className="space-y-3">
                            <Textarea
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                rows={8}
                                placeholder={t('admin.mods.bulk_placeholder')}
                                className="font-mono text-xs"
                                data-testid="bulk-import-textarea"
                            />
                            <p className="text-xs text-muted-foreground">{t('admin.mods.bulk_hint')}</p>
                        </div>
                    )}

                    {bulkPhase === 'resolving' && (
                        <div className="space-y-3 py-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="size-4 animate-spin" />
                                {t('admin.mods.bulk_resolving', {
                                    done: String(bulkProgress.done),
                                    total: String(bulkProgress.total),
                                })}
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{
                                        width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {bulkPhase === 'ready' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-md border p-2" data-testid="bulk-new-mods">
                                    <div className="text-lg font-semibold text-emerald-600">{bulkNewMods}</div>
                                    <div className="text-xs text-muted-foreground">{t('admin.mods.bulk_new_mods')}</div>
                                </div>
                                <div className="rounded-md border p-2">
                                    <div className="text-lg font-semibold">{bulkNewWorkshop}</div>
                                    <div className="text-xs text-muted-foreground">{t('admin.mods.bulk_new_workshop')}</div>
                                </div>
                                <div className="rounded-md border p-2">
                                    <div className="text-lg font-semibold text-amber-600">{bulkUnresolved.length}</div>
                                    <div className="text-xs text-muted-foreground">{t('admin.mods.bulk_unresolved')}</div>
                                </div>
                            </div>
                            {bulkMapFolders.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {t('admin.mods.bulk_maps', { count: String(bulkMapFolders.length) })}
                                </p>
                            )}
                            {bulkUnresolved.length > 0 && (
                                <Alert className="border-amber-500/40 bg-amber-500/10">
                                    <AlertTriangle className="size-4" />
                                    <AlertDescription className="text-xs">
                                        {t('admin.mods.bulk_unresolved_hint')}
                                        <span className="mt-1 block break-all font-mono">
                                            {bulkUnresolved.join('; ')}
                                        </span>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {!bulkHasSomething && (
                                <p className="text-sm text-muted-foreground">{t('admin.mods.bulk_nothing')}</p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {bulkPhase === 'input' && (
                            <>
                                <Button variant="outline" onClick={closeBulk}>
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    disabled={bulkText.trim() === ''}
                                    onClick={prepareBulk}
                                    data-testid="bulk-prepare-button"
                                >
                                    {t('admin.mods.bulk_prepare')}
                                </Button>
                            </>
                        )}
                        {bulkPhase === 'resolving' && (
                            <Button variant="outline" onClick={closeBulk}>
                                {t('common.cancel')}
                            </Button>
                        )}
                        {bulkPhase === 'ready' && (
                            <>
                                <Button variant="outline" onClick={() => setBulkPhase('input')}>
                                    {t('admin.mods.bulk_back')}
                                </Button>
                                <Button
                                    disabled={importing || !bulkHasSomething}
                                    onClick={submitBulk}
                                    data-testid="bulk-import-submit"
                                >
                                    {importing
                                        ? t('admin.mods.bulk_importing')
                                        : t('admin.mods.bulk_do_import', {
                                              count: String(bulkModIds.length || bulkWorkshopIds.length),
                                          })}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.mods.delete_dialog_title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.mods.delete_dialog_description', { mod_id: deleteTarget?.mod_id ?? '', workshop_id: deleteTarget?.workshop_id ?? '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
                        <Button
                            variant="destructive"
                            disabled={loading}
                            onClick={() => deleteTarget && removeMod(deleteTarget)}
                        >
                            {t('admin.mods.delete_dialog_title')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
