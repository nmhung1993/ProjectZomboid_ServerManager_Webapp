import { Deferred, Head, Link, router, usePoll } from '@inertiajs/react';
import { formatDate, formatDateTime, formatTime } from '@/lib/dates';
import {
    Archive,
    ArrowUpCircle,
    Circle,
    Clock,
    Globe,
    HardDrive,
    Map,
    Pencil,
    Play,
    RefreshCw,
    Save,
    ScrollText,
    Skull,
    Square,
    Swords,
    Timer,
    Trash2,
    Trophy,
    Users,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { ActivityFeed } from '@/components/activity-feed';
import { AnimatedCounter } from '@/components/animated-counter';
import { GameStateWidget } from '@/components/game-state-widget';
import { Leaderboard } from '@/components/leaderboard';
import { RestartDialog, StopDialog, UpdateDialog, WipeDialog } from '@/components/server-action-dialogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/layouts/app-layout';
import { fetchAction } from '@/lib/fetch-action';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, DashboardData } from '@/types';

export default function Dashboard({
    server,
    auto_restart,
    game_state,
    recent_audit,
    backup_summary,
    leaderboard,
    game_events,
    server_totals,
    connection,
}: DashboardData) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('admin.dashboard.title'), href: dashboard().url }];
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showRestartDialog, setShowRestartDialog] = useState(false);
    const [showStopDialog, setShowStopDialog] = useState(false);
    const [showWipeDialog, setShowWipeDialog] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [connIp, setConnIp] = useState(connection.server_ip);
    const [connPort, setConnPort] = useState(connection.server_port);
    const [connOpen, setConnOpen] = useState(false);
    const [connSaving, setConnSaving] = useState(false);

    async function saveConnection() {
        setConnSaving(true);
        await fetchAction('/admin/server-settings', {
            method: 'PATCH',
            data: { server_ip: connIp, server_port: connPort },
        });
        setConnSaving(false);
        setConnOpen(false);
        router.reload({ only: ['connection'] });
    }

    usePoll(5000, { only: ['server', 'game_state', 'auto_restart'] });

    async function serverAction(action: string) {
        setActionLoading(action);
        await fetchAction(`/admin/server/${action}`);
        setActionLoading(null);
        setTimeout(() => router.reload({ only: ['server'] }), 2000);
    }

    const statusDot =
        server.status === 'online'
            ? 'fill-emerald-500 text-emerald-500'
            : server.status === 'starting'
              ? 'animate-pulse fill-amber-500 text-amber-500'
              : 'fill-red-500 text-red-500';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.dashboard.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden bg-background p-3 sm:gap-5 sm:p-4 md:p-6">
                {/* Server Status Banner */}
                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4 lg:p-5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
                        <Circle className={`size-3.5 sm:size-4 shrink-0 ${statusDot}`} />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm sm:text-base">
                                    {server.status === 'online'
                                        ? t('admin.dashboard.server_online')
                                        : server.status === 'starting'
                                          ? t('admin.dashboard.server_starting')
                                          : t('admin.dashboard.server_offline')}
                                </span>
                                {server.status !== 'offline' && server.uptime && (
                                    <span className="text-xs sm:text-sm text-muted-foreground">
                                        ({server.uptime})
                                    </span>
                                )}
                            </div>
                            {server.status === 'starting' && server.container_status === 'running' && (
                                <p className="text-xs text-muted-foreground">
                                    {t('admin.dashboard.container_waiting')}
                                </p>
                            )}
                        </div>
                        {server.game_version && (
                            <Badge variant="secondary" className="shrink-0 text-xs px-2 py-0.5">
                                v{server.game_version}
                                {server.steam_branch && server.steam_branch !== 'public' && (
                                    <span className="ml-1 opacity-70">({server.steam_branch})</span>
                                )}
                            </Badge>
                        )}
                        {auto_restart?.enabled && auto_restart.schedule?.length > 0 && (
                            <div className="flex min-w-0 flex-wrap items-center gap-1">
                                {auto_restart.schedule.map((time) => {
                                    const isNext = auto_restart.next_restart_at &&
                                        formatTime(new Date(auto_restart.next_restart_at)).slice(0, 5) === time;
                                    return (
                                        <Badge
                                            key={time}
                                            variant={isNext ? 'default' : 'outline'}
                                            className="shrink-0 gap-1 text-[11px] px-1.5 py-0.5"
                                        >
                                            <Timer className="size-3" />
                                            {time}
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {server.online ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs"
                                    disabled={actionLoading !== null}
                                    onClick={() => serverAction('save')}
                                >
                                    <Save className="mr-1 size-3.5" />
                                    {t('admin.dashboard.save')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs"
                                    disabled={actionLoading !== null}
                                    onClick={() => setShowRestartDialog(true)}
                                >
                                    <RefreshCw className="mr-1 size-3.5" />
                                    {t('admin.dashboard.restart')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs"
                                    disabled={actionLoading !== null}
                                    onClick={() => setShowStopDialog(true)}
                                >
                                    <Square className="mr-1 size-3.5" />
                                    {t('admin.dashboard.stop')}
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                className="h-8 px-3 text-xs"
                                disabled={actionLoading !== null}
                                onClick={() => serverAction('start')}
                            >
                                <Play className="mr-1 size-3.5" />
                                {t('admin.dashboard.start')}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            disabled={actionLoading !== null}
                            onClick={() => setShowUpdateDialog(true)}
                        >
                            <ArrowUpCircle className="mr-1 size-3.5" />
                            {t('admin.dashboard.update')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            disabled={actionLoading !== null}
                            onClick={() => setShowWipeDialog(true)}
                        >
                            <Trash2 className="mr-1 size-3.5" />
                            {t('admin.dashboard.wipe')}
                        </Button>
                    </div>
                </div>

                {/* Game State Widget */}
                {server.status !== 'offline' && <GameStateWidget gameState={game_state} />}

                {/* Stats Cards - Unified Grid 2 cols on mobile, 4 on desktop */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <Card className="shadow-sm">
                        <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                            <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                <Users className="size-5 sm:size-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('admin.dashboard.players_online')}</p>
                                <div className="text-lg sm:text-2xl font-bold tabular-nums">
                                    {server.player_count}
                                    {server.max_players !== null && (
                                        <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                                            /{server.max_players}
                                        </span>
                                    )}
                                </div>
                                {server.max_players !== null && server.max_players > 0 && (
                                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-blue-500 transition-all"
                                            style={{ width: `${Math.min((server.player_count / server.max_players) * 100, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                            <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                                <Map className="size-5 sm:size-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('admin.dashboard.map')}</p>
                                <div className="truncate text-base sm:text-xl font-bold">{server.map || t('admin.dashboard.na')}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                            <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                                <Globe className="size-5 sm:size-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('admin.dashboard.connection')}</p>
                                    <Dialog open={connOpen} onOpenChange={(open) => {
                                        setConnOpen(open);
                                        if (open) {
                                            setConnIp(connection.server_ip);
                                            setConnPort(connection.server_port);
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <button className="text-muted-foreground transition-colors hover:text-foreground">
                                                <Pencil className="size-3 sm:size-3.5" />
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>{t('admin.dashboard.connection_settings')}</DialogTitle>
                                                <DialogDescription>
                                                    {t('admin.dashboard.connection_description')}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="conn-ip">{t('admin.dashboard.server_ip')}</Label>
                                                    <Input
                                                        id="conn-ip"
                                                        value={connIp}
                                                        onChange={(e) => setConnIp(e.target.value)}
                                                        placeholder="123.45.67.89"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="conn-port">{t('admin.dashboard.port')}</Label>
                                                    <Input
                                                        id="conn-port"
                                                        value={connPort}
                                                        onChange={(e) => setConnPort(e.target.value)}
                                                        placeholder="16261"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">{t('common.cancel')}</Button>
                                                </DialogClose>
                                                <Button onClick={saveConnection} disabled={connSaving}>
                                                    {connSaving ? t('common.saving') : t('common.save')}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                {connection.server_ip ? (
                                    <div className="truncate font-mono text-xs sm:text-sm font-bold">
                                        {connection.server_ip}:{connection.server_port}
                                    </div>
                                ) : (
                                    <p className="text-xs sm:text-sm text-muted-foreground">{t('admin.dashboard.not_configured')}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Deferred data="backup_summary" fallback={
                        <Card className="shadow-sm">
                            <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                                <Skeleton className="size-10 sm:size-11 rounded-lg" />
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-6 w-12" />
                                </div>
                            </CardContent>
                        </Card>
                    }>
                        <Card className="shadow-sm">
                            <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                                <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                    <Archive className="size-5 sm:size-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('admin.dashboard.backups')}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-lg sm:text-2xl font-bold tabular-nums">{backup_summary?.total_count ?? 0}</span>
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            ({backup_summary?.total_size_human ?? '0 MB'})
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {backup_summary?.last_backup
                                            ? formatDate(backup_summary.last_backup.created_at)
                                            : t('admin.dashboard.never')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Deferred>
                </div>

                {/* Server Totals Ribbon */}
                <Deferred data="server_totals" fallback={
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5">
                                <Skeleton className="size-7 rounded" />
                                <div className="space-y-1">
                                    <Skeleton className="h-2.5 w-12" />
                                    <Skeleton className="h-4 w-10" />
                                </div>
                            </div>
                        ))}
                    </div>
                }>
                    {server_totals && (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                            <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 shadow-sm">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-blue-500/10">
                                    <Users className="size-4 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground truncate">{t('admin.dashboard.total_players')}</p>
                                    <p className="text-sm sm:text-base font-semibold tabular-nums">
                                        <AnimatedCounter value={server_totals.total_players} />
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 shadow-sm">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-red-500/10">
                                    <Skull className="size-4 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground truncate">{t('admin.dashboard.total_kills')}</p>
                                    <p className="text-sm sm:text-base font-semibold tabular-nums">
                                        <AnimatedCounter value={server_totals.total_zombie_kills} />
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 shadow-sm">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-emerald-500/10">
                                    <Clock className="size-4 text-emerald-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground truncate">{t('admin.dashboard.total_hours')}</p>
                                    <p className="text-sm sm:text-base font-semibold tabular-nums">
                                        <AnimatedCounter value={server_totals.total_hours_survived} decimals={1} suffix="h" />
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 shadow-sm">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-orange-500/10">
                                    <Skull className="size-4 text-orange-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground truncate">{t('admin.dashboard.total_deaths')}</p>
                                    <p className="text-sm sm:text-base font-semibold tabular-nums">
                                        <AnimatedCounter value={server_totals.total_deaths} />
                                    </p>
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 shadow-sm">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-purple-500/10">
                                    <Swords className="size-4 text-purple-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground truncate">{t('admin.dashboard.pvp_kills')}</p>
                                    <p className="text-sm sm:text-base font-semibold tabular-nums">
                                        <AnimatedCounter value={server_totals.total_pvp_kills} />
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </Deferred>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Online Players */}
                    <Card className="shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="size-4 text-blue-500" />
                                    {t('admin.dashboard.online_players')}
                                </CardTitle>
                                <Link
                                    href="/rankings"
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {t('admin.dashboard.view_rankings')}
                                </Link>
                            </div>
                            <CardDescription className="text-xs">
                                {t('admin.dashboard.connected', { count: String(server.player_count) })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            {server.players.length > 0 ? (
                                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                                    {server.players.map((player) => (
                                        <Link
                                            key={player.username}
                                            href={`/rankings/${player.username}`}
                                            className="flex items-center justify-between gap-2 rounded-md border border-border/40 p-2 text-xs transition-colors hover:bg-muted/50"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Circle className="size-2 shrink-0 fill-green-500 text-green-500" />
                                                <span className="font-medium truncate">{player.username}</span>
                                                {player.profession && (
                                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 truncate">
                                                        {player.profession}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                                                {player.zombie_kills != null && (
                                                    <span className="flex items-center gap-0.5 text-red-500/90" title={t('admin.dashboard.zombie_kills')}>
                                                        <Skull className="size-3" />
                                                        {player.zombie_kills.toLocaleString()}
                                                    </span>
                                                )}
                                                {player.hours_survived != null && (
                                                    <span className="flex items-center gap-0.5 text-emerald-500/90" title={t('admin.dashboard.hours_survived')}>
                                                        <Clock className="size-3" />
                                                        {player.hours_survived.toLocaleString(undefined, { maximumFractionDigits: 1 })}h
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground py-4 text-center">
                                    {server.status === 'online'
                                        ? t('admin.dashboard.no_players')
                                        : server.status === 'starting'
                                          ? t('admin.dashboard.server_starting_msg')
                                          : t('admin.dashboard.server_offline_msg')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ScrollText className="size-4 text-primary" />
                                {t('admin.dashboard.recent_activity')}
                            </CardTitle>
                            <CardDescription className="text-xs">{t('admin.dashboard.latest_actions')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <Deferred data="recent_audit" fallback={
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <Skeleton className="h-4 w-20 shrink-0" />
                                            <div className="flex-1 space-y-1">
                                                <Skeleton className="h-3 w-28" />
                                                <Skeleton className="h-2.5 w-40" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }>
                                {recent_audit?.length > 0 ? (
                                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                        {recent_audit.map((entry) => (
                                            <div key={entry.id} className="flex items-start justify-between gap-2 border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 font-mono">
                                                            {entry.action}
                                                        </Badge>
                                                        {entry.target && (
                                                            <span className="truncate text-xs text-muted-foreground">
                                                                {entry.target}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {entry.actor}
                                                        {entry.created_at && (
                                                            <> &middot; {formatDateTime(entry.created_at)}</>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground py-4 text-center">{t('admin.dashboard.no_activity')}</p>
                                )}
                            </Deferred>
                        </CardContent>
                    </Card>
                </div>

                {/* Leaderboard + Game Events side-by-side */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Deferred data="leaderboard" fallback={
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="mt-1 h-4 w-40" />
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    {Array.from({ length: 2 }).map((_, col) => (
                                        <div key={col} className="space-y-2">
                                            <Skeleton className="h-4 w-28" />
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Skeleton key={i} className="h-6 w-full" />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    }>
                        <div>
                            <Leaderboard data={leaderboard} />
                            <Link
                                href="/rankings"
                                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                <Trophy className="size-3.5" />
                                {t('admin.dashboard.view_full_rankings')}
                            </Link>
                        </div>
                    </Deferred>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="size-5" />
                                {t('admin.dashboard.game_events')}
                            </CardTitle>
                            <CardDescription>{t('admin.dashboard.game_events_description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Deferred data="game_events" fallback={
                                <div className="space-y-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                            <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
                                            <div className="flex-1 space-y-1">
                                                <Skeleton className="h-4 w-48" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }>
                                <ActivityFeed events={game_events ?? []} />
                            </Deferred>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <RestartDialog open={showRestartDialog} onOpenChange={setShowRestartDialog} />
            <StopDialog open={showStopDialog} onOpenChange={setShowStopDialog} />
            <UpdateDialog
                open={showUpdateDialog}
                onOpenChange={setShowUpdateDialog}
                currentBranch={server.steam_branch ?? 'public'}
                currentVersion={server.game_version}
            />
            <WipeDialog open={showWipeDialog} onOpenChange={setShowWipeDialog} />
        </AppLayout>
    );
}
