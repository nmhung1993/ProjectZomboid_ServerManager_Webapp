import { Head, router } from '@inertiajs/react';
import type L from 'leaflet';
import {
    AlertTriangle,
    Circle,
    Loader2,
    MapPinned,
    Radio,
    Skull,
    UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import PlayerActionDialogs from '@/components/player-action-dialogs';
import PzMap from '@/components/pz-map';
import type { ZoneOverlay } from '@/components/pz-map';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { MapConfig, PlayerMarker } from '@/types/server';

type TileProgress = {
    generating: boolean;
    completed: number;
    total: number;
    percent: number;
};

type SafeZone = {
    id: string;
    name: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

type Props = {
    markers: PlayerMarker[];
    onlineCount: number;
    serverStatus: 'offline' | 'starting' | 'online';
    mapConfig: MapConfig;
    hasTiles: boolean;
    tileProgress: TileProgress | null;
    safeZones: SafeZone[];
};

const statusDotColor: Record<PlayerMarker['status'], string> = {
    online: 'fill-green-500 text-green-500',
    offline: 'fill-muted text-muted',
    dead: 'fill-red-500 text-red-500',
};

const ZONE_COLORS = [
    '#3b82f6',
    '#ef4444',
    '#22c55e',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
];

export default function PlayerMap({
    markers,
    onlineCount,
    serverStatus,
    mapConfig,
    hasTiles,
    tileProgress,
    safeZones,
}: Props) {
    const { t } = useTranslation();
    const [isMapInteracting, setIsMapInteracting] = useState(false);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (isMapInteracting) return;

        const timer = window.setInterval(() => {
            router.reload({
                only: [
                    'markers',
                    'onlineCount',
                    'serverStatus',
                    'hasTiles',
                    'tileProgress',
                    'safeZones',
                ],
            });
        }, 5000);

        return () => window.clearInterval(timer);
    }, [isMapInteracting]);

    const zoneOverlays: ZoneOverlay[] = useMemo(
        () =>
            safeZones.map((zone, i) => ({
                ...zone,
                color: ZONE_COLORS[i % ZONE_COLORS.length],
            })),
        [safeZones],
    );

    const [kickTarget, setKickTarget] = useState<string | null>(null);
    const [banTarget, setBanTarget] = useState<string | null>(null);
    const [accessTarget, setAccessTarget] = useState<string | null>(null);

    const counts = useMemo(() => {
        const online = Math.max(
            onlineCount,
            markers.filter((m) => m.status === 'online').length,
        );
        const offline = markers.filter((m) => m.status === 'offline').length;
        const dead = markers.filter((m) => m.status === 'dead').length;
        return { online, offline, dead, total: markers.length };
    }, [markers, onlineCount]);

    function handleMarkerAction(marker: PlayerMarker, action: string) {
        switch (action) {
            case 'kick':
                setKickTarget(marker.username);
                break;
            case 'ban':
                setBanTarget(marker.username);
                break;
            case 'access':
                setAccessTarget(marker.username);
                break;
            case 'inventory':
                router.visit(`/admin/players/${marker.username}/inventory`);
                break;
        }
    }

    function focusMarker(marker: PlayerMarker) {
        const map = mapInstanceRef.current;
        if (!map) return;

        const zoom = Math.max(
            mapConfig.minZoom,
            Math.min(
                mapConfig.maxZoom,
                Math.max(map.getZoom(), mapConfig.defaultZoom + 1),
            ),
        );
        map.setView([-marker.y, marker.x], zoom, { animate: true });
    }

    const serverStatusLabel =
        serverStatus === 'online'
            ? t('common.online')
            : serverStatus === 'starting'
              ? t('status.starting')
              : t('common.offline');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.players'), href: '/admin/players' },
        { title: t('admin.player_map.breadcrumb'), href: '/admin/players/map' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.player_map.title')} />
            <div className="flex min-h-0 flex-1 flex-col gap-5 p-4 lg:p-6">
                <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-emerald-500/10 p-5 shadow-sm lg:p-6">
                    <div className="pointer-events-none absolute -top-20 right-0 size-56 rounded-full bg-emerald-500/10 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-inner">
                                <MapPinned className="size-5 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                                        {t('admin.player_map.title')}
                                    </h1>
                                    <Badge
                                        variant="outline"
                                        className={`gap-1.5 bg-background/70 ${
                                            serverStatus === 'online'
                                                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                                : serverStatus === 'starting'
                                                  ? 'border-amber-500/30 text-amber-600 dark:text-amber-400'
                                                  : 'border-red-500/30 text-red-600 dark:text-red-400'
                                        }`}
                                    >
                                        <span
                                            className={`size-1.5 rounded-full ${
                                                serverStatus === 'online'
                                                    ? 'bg-emerald-500'
                                                    : serverStatus ===
                                                        'starting'
                                                      ? 'animate-pulse bg-amber-500'
                                                      : 'bg-red-500'
                                            }`}
                                        />
                                        {serverStatusLabel}
                                    </Badge>
                                </div>
                                <p className="max-w-2xl text-sm text-muted-foreground">
                                    {t('admin.player_map.players_tracked', {
                                        count: String(counts.total),
                                    })}
                                </p>
                            </div>
                        </div>

                        <div
                            className="grid w-full grid-cols-3 overflow-hidden rounded-xl border bg-background/65 shadow-sm backdrop-blur-sm sm:w-auto"
                            aria-live="polite"
                        >
                            <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:min-w-24 sm:px-4">
                                <Radio className="size-4 text-emerald-500" />
                                <div>
                                    <p className="text-lg font-semibold tabular-nums">
                                        {counts.online}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('common.online')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex min-w-0 items-center gap-2 border-x px-3 py-3 sm:min-w-24 sm:px-4">
                                <UsersRound className="size-4 text-slate-500" />
                                <div>
                                    <p className="text-lg font-semibold tabular-nums">
                                        {counts.offline}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('common.offline')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:min-w-24 sm:px-4">
                                <Skull className="size-4 text-red-500" />
                                <div>
                                    <p className="text-lg font-semibold tabular-nums">
                                        {counts.dead}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('common.dead')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {serverStatus === 'offline' && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        <AlertTriangle className="size-4 shrink-0" />
                        {t('admin.player_map.server_offline')}
                    </div>
                )}
                {serverStatus === 'starting' && (
                    <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                        {t('admin.player_map.server_starting')}
                    </div>
                )}

                <Card className="isolate min-h-0 flex-1 gap-0 overflow-hidden py-0">
                    <CardContent className="grid h-full min-h-0 flex-1 p-0 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[minmax(0,1fr)]">
                        <div className="relative min-h-[28rem] overflow-hidden lg:h-full lg:min-h-0">
                            {!hasTiles && tileProgress?.generating && (
                                <div className="absolute top-2 left-1/2 z-[1000] w-64 -translate-x-1/2 rounded-lg border bg-background/90 px-4 py-3 shadow-sm backdrop-blur-sm sm:w-72">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Loader2 className="size-4 animate-spin text-primary" />
                                        {t('admin.player_map.generating_tiles')}
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                        {tileProgress.completed > 0 ? (
                                            <div
                                                className="h-full rounded-full bg-primary transition-all duration-500"
                                                style={{
                                                    width: `${Math.max(tileProgress.percent, 2)}%`,
                                                }}
                                            />
                                        ) : (
                                            <div className="h-full w-full animate-pulse rounded-full bg-primary/30" />
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {tileProgress.completed > 0
                                            ? t(
                                                  'admin.player_map.tiles_rendered',
                                                  {
                                                      count: tileProgress.completed.toLocaleString(),
                                                      percent: String(
                                                          tileProgress.percent,
                                                      ),
                                                  },
                                              )
                                            : t(
                                                  'admin.player_map.preparing_render',
                                              )}
                                    </p>
                                </div>
                            )}
                            {!hasTiles && !tileProgress?.generating && (
                                <div className="absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded-md bg-muted/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                                    {t('admin.player_map.no_tiles')}{' '}
                                    <code className="font-mono">
                                        {t('admin.player_map.no_tiles_command')}
                                    </code>{' '}
                                    {t('admin.player_map.no_tiles_suffix')}
                                </div>
                            )}
                            <PzMap
                                markers={markers}
                                mapConfig={mapConfig}
                                hasTiles={hasTiles}
                                onMarkerAction={handleMarkerAction}
                                zones={zoneOverlays}
                                onMapReady={(map) => {
                                    mapInstanceRef.current = map;
                                }}
                                onInteractionChange={setIsMapInteracting}
                            />
                        </div>

                        <aside className="flex h-full min-h-0 flex-col border-t bg-card/95 lg:border-t-0 lg:border-l">
                            <CardHeader className="border-b px-4 py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <CardTitle>
                                            {t(
                                                'admin.player_map.player_positions',
                                            )}
                                        </CardTitle>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t(
                                                'admin.player_map.players_tracked',
                                                {
                                                    count: String(counts.total),
                                                },
                                            )}
                                        </p>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="tabular-nums"
                                    >
                                        {counts.total}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                                {markers.length > 0 ? (
                                    markers.map((marker) => (
                                        <button
                                            type="button"
                                            key={marker.username}
                                            aria-label={`${marker.name}: ${marker.x.toFixed(0)}, ${marker.y.toFixed(0)}`}
                                            onClick={() => focusMarker(marker)}
                                            className="group flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                        >
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <Circle
                                                    className={`size-2.5 shrink-0 ${statusDotColor[marker.status]}`}
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {marker.name}
                                                    </p>
                                                    {marker.name !==
                                                        marker.username && (
                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                            {marker.username}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                                                <p>
                                                    {marker.x.toFixed(0)},{' '}
                                                    {marker.y.toFixed(0)}
                                                </p>
                                                <p>Z{marker.z}</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="flex h-full min-h-40 flex-col items-center justify-center px-5 text-center">
                                        <UsersRound className="mb-3 size-8 text-muted-foreground/40" />
                                        <p className="text-sm font-medium">
                                            {t(
                                                'admin.player_map.players_tracked',
                                                {
                                                    count: '0',
                                                },
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </CardContent>
                </Card>
            </div>

            <PlayerActionDialogs
                kickTarget={kickTarget}
                banTarget={banTarget}
                accessTarget={accessTarget}
                onCloseKick={() => setKickTarget(null)}
                onCloseBan={() => setBanTarget(null)}
                onCloseAccess={() => setAccessTarget(null)}
                reloadOnly={['markers']}
            />
        </AppLayout>
    );
}
