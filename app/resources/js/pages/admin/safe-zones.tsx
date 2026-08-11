import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    MapPin,
    MousePointerClick,
    Pencil,
    Plus,
    ShieldAlert,
    ShieldCheck,
    Swords,
    Trash2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PzMap from '@/components/pz-map';
import type { DrawnZone, ZoneOverlay } from '@/components/pz-map';
import { SortableHeader } from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTableSort } from '@/hooks/use-table-sort';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/dates';
import { fetchAction } from '@/lib/fetch-action';
import type { BreadcrumbItem } from '@/types';
import type { MapConfig } from '@/types/server';

type Zone = {
    id: string;
    name: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

type SafeZoneConfig = {
    enabled: boolean;
    zones: Zone[];
};

type Violation = {
    id: number;
    attacker: string;
    victim: string;
    zone_id: string;
    zone_name: string;
    attacker_x: number | null;
    attacker_y: number | null;
    strike_number: number;
    status: 'pending' | 'dismissed' | 'actioned';
    resolution_note: string | null;
    resolved_by: string | null;
    occurred_at: string;
    resolved_at: string | null;
};

type Props = {
    config: SafeZoneConfig;
    violations: Violation[];
    violationsLimit: number;
    mapConfig: MapConfig;
    hasTiles: boolean;
};

const ZONE_COLORS = [
    '#3b82f6',
    '#ef4444',
    '#22c55e',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
];

type ViolationSortKey = 'attacker' | 'strike_number' | 'occurred_at' | 'status';

export default function SafeZones({
    config,
    violations,
    violationsLimit,
    mapConfig,
    hasTiles,
}: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('admin.safe_zones.title'), href: '/admin/safe-zones' },
    ];

    const [showAddDialog, setShowAddDialog] = useState(false);
    const {
        sortKey: vSortKey,
        sortDir: vSortDir,
        toggleSort: toggleVSort,
    } = useTableSort<ViolationSortKey>('occurred_at', 'desc');
    const [showDeleteDialog, setShowDeleteDialog] = useState<Zone | null>(null);
    const [showResolveDialog, setShowResolveDialog] =
        useState<Violation | null>(null);
    const [resolveAction, setResolveAction] = useState<
        'dismissed' | 'actioned'
    >('dismissed');
    const [resolveNote, setResolveNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [violationsDisplayLimit, setViolationsDisplayLimit] =
        useState<number>(violationsLimit);
    const [drawingMode, setDrawingMode] = useState(false);
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    // Add zone form state
    const [newZone, setNewZone] = useState({
        id: '',
        name: '',
        x1: '',
        y1: '',
        x2: '',
        y2: '',
    });

    // Build zone overlays with cycling colors
    const zoneOverlays: ZoneOverlay[] = config.zones.map((zone, i) => ({
        ...zone,
        color: ZONE_COLORS[i % ZONE_COLORS.length],
    }));

    function handleZoneDrawn(zone: DrawnZone) {
        setNewZone({
            id: '',
            name: '',
            x1: String(zone.x1),
            y1: String(zone.y1),
            x2: String(zone.x2),
            y2: String(zone.y2),
        });
        setDrawingMode(false);
        setShowAddDialog(true);
    }

    function handleZoneClick(zone: ZoneOverlay) {
        setSelectedZoneId(selectedZoneId === zone.id ? null : zone.id);
    }

    async function toggleEnabled() {
        setLoading(true);
        await fetchAction('/admin/safe-zones/config', {
            method: 'PATCH',
            data: { enabled: !config.enabled },
            successMessage: config.enabled
                ? t('admin.safe_zones.toast_disabled')
                : t('admin.safe_zones.toast_enabled'),
        });
        setLoading(false);
        router.reload({ only: ['config'] });
    }

    async function handleAddZone() {
        setLoading(true);
        const result = await fetchAction('/admin/safe-zones', {
            data: {
                id: newZone.id,
                name: newZone.name,
                x1: parseInt(newZone.x1, 10),
                y1: parseInt(newZone.y1, 10),
                x2: parseInt(newZone.x2, 10),
                y2: parseInt(newZone.y2, 10),
            },
        });
        setLoading(false);
        if (result) {
            setShowAddDialog(false);
            setNewZone({ id: '', name: '', x1: '', y1: '', x2: '', y2: '' });
            router.reload({ only: ['config'] });
        }
    }

    async function handleDeleteZone() {
        if (!showDeleteDialog) return;
        setLoading(true);
        await fetchAction(`/admin/safe-zones/${showDeleteDialog.id}`, {
            method: 'DELETE',
        });
        setLoading(false);
        setShowDeleteDialog(null);
        router.reload({ only: ['config'] });
    }

    async function handleResolve() {
        if (!showResolveDialog) return;
        setLoading(true);
        await fetchAction(
            `/admin/safe-zones/violations/${showResolveDialog.id}/resolve`,
            {
                data: { status: resolveAction, note: resolveNote || null },
            },
        );
        setLoading(false);
        setShowResolveDialog(null);
        setResolveNote('');
        router.reload({ only: ['violations'] });
    }

    async function handleKickAndResolve(violation: Violation) {
        setLoading(true);
        await fetchAction(`/admin/players/${violation.attacker}/kick`, {
            data: {
                reason: `PvP violation in safe zone: ${violation.zone_name}`,
            },
        });
        await fetchAction(
            `/admin/safe-zones/violations/${violation.id}/resolve`,
            {
                data: { status: 'actioned', note: 'Player kicked' },
            },
        );
        setLoading(false);
        router.reload({ only: ['violations'] });
    }

    async function handleBanAndResolve(violation: Violation) {
        setLoading(true);
        await fetchAction(`/admin/players/${violation.attacker}/ban`, {
            data: {
                reason: `PvP violation in safe zone: ${violation.zone_name}`,
            },
        });
        await fetchAction(
            `/admin/safe-zones/violations/${violation.id}/resolve`,
            {
                data: { status: 'actioned', note: 'Player banned' },
            },
        );
        setLoading(false);
        router.reload({ only: ['violations'] });
    }

    const filteredViolations = useMemo(() => {
        const result = violations.filter(
            (v) => statusFilter === 'all' || v.status === statusFilter,
        );
        const sorted = [...result];
        sorted.sort((a, b) => {
            let cmp = 0;
            if (vSortKey === 'attacker')
                cmp = a.attacker.localeCompare(b.attacker);
            else if (vSortKey === 'strike_number')
                cmp = a.strike_number - b.strike_number;
            else if (vSortKey === 'occurred_at')
                cmp =
                    new Date(a.occurred_at).getTime() -
                    new Date(b.occurred_at).getTime();
            else if (vSortKey === 'status')
                cmp = a.status.localeCompare(b.status);
            return vSortDir === 'desc' ? -cmp : cmp;
        });
        return sorted;
    }, [violations, statusFilter, vSortKey, vSortDir]);

    const pendingCount = violations.filter(
        (v) => v.status === 'pending',
    ).length;

    function handleViolationLimitChange(value: string) {
        const nextLimit = Number(value);
        setViolationsDisplayLimit(nextLimit);
        router.get(
            '/admin/safe-zones',
            { limit: nextLimit },
            { preserveState: true, replace: true },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.safe_zones.title')} />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto p-4 lg:p-6">
                <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-blue-500/10 p-5 shadow-sm lg:p-6">
                    <div className="pointer-events-none absolute -top-20 right-4 size-60 rounded-full bg-blue-500/10 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
                                <ShieldCheck className="size-5 text-blue-500" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                                        {t('admin.safe_zones.title')}
                                    </h1>
                                    <Badge
                                        variant="outline"
                                        className={
                                            config.enabled
                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-background/70 text-muted-foreground'
                                        }
                                    >
                                        {config.enabled
                                            ? t('common.enabled')
                                            : t('common.disabled')}
                                    </Badge>
                                </div>
                                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                    {t('admin.safe_zones.config_description')}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-3 rounded-xl border bg-background/70 px-4 py-2.5 shadow-sm backdrop-blur-sm">
                                <MapPin className="size-4 text-blue-500" />
                                <div>
                                    <p className="text-base font-semibold tabular-nums">
                                        {config.zones.length}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('admin.safe_zones.zone_map')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border bg-background/70 px-4 py-2.5 shadow-sm backdrop-blur-sm">
                                <Swords className="size-4 text-red-500" />
                                <div>
                                    <p className="text-base font-semibold tabular-nums">
                                        {pendingCount}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('admin.safe_zones.filter_pending')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border bg-background/70 px-3 py-2.5 shadow-sm backdrop-blur-sm">
                                <Label
                                    htmlFor="sz-enabled"
                                    className="text-xs font-medium"
                                >
                                    {config.enabled
                                        ? t('common.enabled')
                                        : t('common.disabled')}
                                </Label>
                                <Switch
                                    id="sz-enabled"
                                    checked={config.enabled}
                                    onCheckedChange={toggleEnabled}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
                    {/* Map */}
                    <Card className="h-[70svh] max-h-[52rem] min-h-[28rem] gap-0 overflow-hidden py-0">
                        <CardHeader className="py-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="size-5" />
                                        {t('admin.safe_zones.zone_map')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t(
                                            'admin.safe_zones.zone_map_description',
                                        )}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant={
                                            drawingMode ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        onClick={() =>
                                            setDrawingMode(!drawingMode)
                                        }
                                    >
                                        {drawingMode ? (
                                            <>
                                                <X className="mr-1.5 size-3.5" />
                                                {t(
                                                    'admin.safe_zones.cancel_drawing',
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Pencil className="mr-1.5 size-3.5" />
                                                {t(
                                                    'admin.safe_zones.draw_zone',
                                                )}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setNewZone({
                                                id: '',
                                                name: '',
                                                x1: '',
                                                y1: '',
                                                x2: '',
                                                y2: '',
                                            });
                                            setShowAddDialog(true);
                                        }}
                                    >
                                        <Plus className="mr-1.5 size-3.5" />
                                        {t('admin.safe_zones.add_zone')}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="relative min-h-0 flex-1 p-0">
                            {drawingMode && (
                                <div className="absolute top-3 left-1/2 z-[1000] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-2 rounded-lg border border-blue-500/30 bg-background/90 px-3 py-2 text-sm text-blue-500 shadow-lg backdrop-blur-sm">
                                    <MousePointerClick className="size-4 shrink-0" />
                                    {t('admin.safe_zones.drawing_hint')}
                                </div>
                            )}
                            <div className="h-full overflow-hidden border-t">
                                <PzMap
                                    mapConfig={mapConfig}
                                    hasTiles={hasTiles}
                                    zones={zoneOverlays}
                                    drawingMode={drawingMode}
                                    onZoneDrawn={handleZoneDrawn}
                                    selectedZoneId={selectedZoneId}
                                    onZoneClick={handleZoneClick}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Zone Configuration */}
                    <Card className="h-[70svh] max-h-[52rem] min-h-[28rem] gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldAlert className="size-5" />
                                        {t('admin.safe_zones.config_title')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t(
                                            'admin.safe_zones.config_description',
                                        )}
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="shrink-0 tabular-nums"
                                >
                                    {config.zones.length}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 overflow-y-auto p-3">
                            {config.zones.length > 0 ? (
                                <div className="space-y-2">
                                    {config.zones.map((zone, i) => (
                                        <div
                                            key={zone.id}
                                            className={`group relative overflow-hidden rounded-xl border transition-colors ${
                                                selectedZoneId === zone.id
                                                    ? 'border-blue-500/40 bg-blue-500/10'
                                                    : 'border-border/70 hover:bg-muted/50'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                aria-pressed={
                                                    selectedZoneId === zone.id
                                                }
                                                className="w-full p-3 pr-12 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                                onClick={() =>
                                                    setSelectedZoneId(
                                                        selectedZoneId ===
                                                            zone.id
                                                            ? null
                                                            : zone.id,
                                                    )
                                                }
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className="mt-1 size-2.5 shrink-0 rounded-full shadow-sm"
                                                        style={{
                                                            backgroundColor:
                                                                ZONE_COLORS[
                                                                    i %
                                                                        ZONE_COLORS.length
                                                                ],
                                                        }}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold">
                                                            {zone.name}
                                                        </p>
                                                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                                                            {zone.id}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5">
                                                    <div>
                                                        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                                                            {t(
                                                                'admin.safe_zones.table_from',
                                                            )}
                                                        </p>
                                                        <p className="mt-0.5 font-mono text-xs">
                                                            {zone.x1}, {zone.y1}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                                                            {t(
                                                                'admin.safe_zones.table_to',
                                                            )}
                                                        </p>
                                                        <p className="mt-0.5 font-mono text-xs">
                                                            {zone.x2}, {zone.y2}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2.5 right-2.5 size-8 text-muted-foreground opacity-70 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                                aria-label={t(
                                                    'admin.safe_zones.delete_confirm',
                                                )}
                                                onClick={() =>
                                                    setShowDeleteDialog(zone)
                                                }
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full min-h-48 flex-col items-center justify-center px-5 text-center">
                                    <ShieldAlert className="mb-3 size-9 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        {t('admin.safe_zones.no_zones')}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Violations */}
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="size-5" />
                                    {t('admin.safe_zones.violations_title')}
                                    {pendingCount > 0 && (
                                        <Badge variant="destructive">
                                            {pendingCount}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    {t(
                                        'admin.safe_zones.violations_description',
                                    )}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <Label
                                        htmlFor="violation-limit"
                                        className="text-sm text-muted-foreground"
                                    >
                                        {t('admin.safe_zones.limit_label')}
                                    </Label>
                                    <Select
                                        value={String(violationsDisplayLimit)}
                                        onValueChange={
                                            handleViolationLimitChange
                                        }
                                    >
                                        <SelectTrigger
                                            id="violation-limit"
                                            className="w-[110px]"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[100, 200, 500, 1000].map(
                                                (value) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={String(value)}
                                                    >
                                                        {value}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(
                                    [
                                        'pending',
                                        'actioned',
                                        'dismissed',
                                        'all',
                                    ] as const
                                ).map((s) => (
                                    <Button
                                        key={s}
                                        variant={
                                            statusFilter === s
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        aria-pressed={statusFilter === s}
                                        onClick={() => setStatusFilter(s)}
                                    >
                                        {t(`admin.safe_zones.filter_${s}`)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        {filteredViolations.length > 0 ? (
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-card">
                                    <TableRow>
                                        <TableHead>
                                            <SortableHeader
                                                column="attacker"
                                                label={t(
                                                    'admin.safe_zones.table_attacker',
                                                )}
                                                sortKey={vSortKey}
                                                sortDir={vSortDir}
                                                onSort={toggleVSort}
                                            />
                                        </TableHead>
                                        <TableHead>
                                            {t('admin.safe_zones.table_victim')}
                                        </TableHead>
                                        <TableHead>
                                            {t('admin.safe_zones.table_zone')}
                                        </TableHead>
                                        <TableHead>
                                            <SortableHeader
                                                column="strike_number"
                                                label={t(
                                                    'admin.safe_zones.table_strike',
                                                )}
                                                sortKey={vSortKey}
                                                sortDir={vSortDir}
                                                onSort={toggleVSort}
                                            />
                                        </TableHead>
                                        <TableHead>
                                            {t(
                                                'admin.safe_zones.table_location',
                                            )}
                                        </TableHead>
                                        <TableHead>
                                            <SortableHeader
                                                column="occurred_at"
                                                label={t(
                                                    'admin.safe_zones.table_time',
                                                )}
                                                sortKey={vSortKey}
                                                sortDir={vSortDir}
                                                onSort={toggleVSort}
                                            />
                                        </TableHead>
                                        <TableHead>
                                            <SortableHeader
                                                column="status"
                                                label={t(
                                                    'admin.safe_zones.table_status',
                                                )}
                                                sortKey={vSortKey}
                                                sortDir={vSortDir}
                                                onSort={toggleVSort}
                                            />
                                        </TableHead>
                                        <TableHead className="text-right">
                                            {t('common.actions')}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredViolations.map((v) => (
                                        <TableRow key={v.id}>
                                            <TableCell className="font-medium">
                                                {v.attacker}
                                            </TableCell>
                                            <TableCell>{v.victim}</TableCell>
                                            <TableCell>{v.zone_name}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        v.strike_number >= 3
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {v.strike_number}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {v.attacker_x != null ? (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="size-3" />
                                                        {v.attacker_x},{' '}
                                                        {v.attacker_y}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {formatDateTime(v.occurred_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        v.status === 'pending'
                                                            ? 'outline'
                                                            : v.status ===
                                                                'actioned'
                                                              ? 'destructive'
                                                              : 'secondary'
                                                    }
                                                >
                                                    {t(
                                                        `admin.safe_zones.filter_${v.status}`,
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {v.status === 'pending' && (
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={loading}
                                                            onClick={() =>
                                                                handleKickAndResolve(
                                                                    v,
                                                                )
                                                            }
                                                        >
                                                            {t('common.kick')}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={loading}
                                                            onClick={() =>
                                                                handleBanAndResolve(
                                                                    v,
                                                                )
                                                            }
                                                        >
                                                            {t('common.ban')}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={loading}
                                                            onClick={() => {
                                                                setResolveAction(
                                                                    'dismissed',
                                                                );
                                                                setResolveNote(
                                                                    '',
                                                                );
                                                                setShowResolveDialog(
                                                                    v,
                                                                );
                                                            }}
                                                        >
                                                            <X className="mr-1 size-3" />
                                                            {t(
                                                                'common.dismiss',
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                                {v.status !== 'pending' &&
                                                    v.resolved_by && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {t(
                                                                'admin.safe_zones.resolved_by',
                                                                {
                                                                    name: v.resolved_by,
                                                                },
                                                            )}
                                                        </span>
                                                    )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {statusFilter === 'all'
                                    ? t('admin.safe_zones.no_violations_all')
                                    : t('admin.safe_zones.no_violations', {
                                          status: statusFilter,
                                      })}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Zone Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.safe_zones.add_dialog_title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.safe_zones.add_dialog_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="zone-id">
                                    {t('admin.safe_zones.zone_id_label')}
                                </Label>
                                <Input
                                    id="zone-id"
                                    placeholder={t(
                                        'admin.safe_zones.zone_id_placeholder',
                                    )}
                                    value={newZone.id}
                                    onChange={(e) =>
                                        setNewZone({
                                            ...newZone,
                                            id: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="zone-name">
                                    {t('admin.safe_zones.name_label')}
                                </Label>
                                <Input
                                    id="zone-name"
                                    placeholder={t(
                                        'admin.safe_zones.name_placeholder',
                                    )}
                                    value={newZone.name}
                                    onChange={(e) =>
                                        setNewZone({
                                            ...newZone,
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="zone-x1">
                                    {t('admin.safe_zones.x1_label')}
                                </Label>
                                <Input
                                    id="zone-x1"
                                    type="number"
                                    placeholder="10000"
                                    value={newZone.x1}
                                    onChange={(e) =>
                                        setNewZone({
                                            ...newZone,
                                            x1: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="zone-y1">
                                    {t('admin.safe_zones.y1_label')}
                                </Label>
                                <Input
                                    id="zone-y1"
                                    type="number"
                                    placeholder="10000"
                                    value={newZone.y1}
                                    onChange={(e) =>
                                        setNewZone({
                                            ...newZone,
                                            y1: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="zone-x2">
                                    {t('admin.safe_zones.x2_label')}
                                </Label>
                                <Input
                                    id="zone-x2"
                                    type="number"
                                    placeholder="10100"
                                    value={newZone.x2}
                                    onChange={(e) =>
                                        setNewZone({
                                            ...newZone,
                                            x2: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="zone-y2">
                                    {t('admin.safe_zones.y2_label')}
                                </Label>
                                <Input
                                    id="zone-y2"
                                    type="number"
                                    placeholder="10100"
                                    value={newZone.y2}
                                    onChange={(e) =>
                                        setNewZone({
                                            ...newZone,
                                            y2: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowAddDialog(false)}
                            disabled={loading}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleAddZone}
                            disabled={
                                loading ||
                                !newZone.id ||
                                !newZone.name ||
                                !newZone.x1 ||
                                !newZone.y1 ||
                                !newZone.x2 ||
                                !newZone.y2
                            }
                        >
                            <Check className="mr-1.5 size-3.5" />
                            {loading
                                ? t('admin.safe_zones.adding')
                                : t('admin.safe_zones.add_zone')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Zone Confirmation */}
            <Dialog
                open={showDeleteDialog !== null}
                onOpenChange={(open) => !open && setShowDeleteDialog(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.safe_zones.delete_dialog_title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.safe_zones.delete_dialog_description', {
                                name: showDeleteDialog?.name ?? '',
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(null)}
                            disabled={loading}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteZone}
                            disabled={loading}
                        >
                            {loading
                                ? t('admin.safe_zones.deleting')
                                : t('admin.safe_zones.delete_confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Resolve Violation Dialog */}
            <Dialog
                open={showResolveDialog !== null}
                onOpenChange={(open) => !open && setShowResolveDialog(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.safe_zones.resolve_dialog_title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.safe_zones.resolve_dialog_description', {
                                attacker: showResolveDialog?.attacker ?? '',
                                victim: showResolveDialog?.victim ?? '',
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="resolve-note">
                                {t('admin.safe_zones.resolve_note_label')}
                            </Label>
                            <Textarea
                                id="resolve-note"
                                placeholder={t(
                                    'admin.safe_zones.resolve_note_placeholder',
                                )}
                                value={resolveNote}
                                onChange={(e) => setResolveNote(e.target.value)}
                                maxLength={500}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowResolveDialog(null)}
                            disabled={loading}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleResolve} disabled={loading}>
                            {loading
                                ? t('admin.safe_zones.resolving')
                                : t('common.dismiss')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
