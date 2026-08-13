import { Head, usePoll } from '@inertiajs/react';
import {
    Activity,
    Circle,
    Clock,
    Globe,
    Map,
    Package,
    Server,
    Signal,
    Users,
} from 'lucide-react';
import { GameStateWidget } from '@/components/game-state-widget';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePing } from '@/hooks/use-ping';
import { useTranslation } from '@/hooks/use-translation';
import PublicLayout from '@/layouts/public-layout';
import type { StatusPageData } from '@/types';

type StatusTone = 'online' | 'starting' | 'offline';

const statusTone: Record<
    StatusTone,
    {
        dot: string;
        text: string;
        badge: string;
        labelKey: string;
    }
> = {
    online: {
        dot: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        labelKey: 'status.online',
    },
    starting: {
        dot: 'animate-pulse bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        badge: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        labelKey: 'status.starting',
    },
    offline: {
        dot: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
        badge: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
        labelKey: 'status.offline',
    },
};

export default function Status({
    server,
    game_state,
    mods,
    server_name,
}: StatusPageData) {
    usePoll(5000, { only: ['server', 'game_state'] });
    const { t } = useTranslation();
    const ping = usePing('/ping', 15000);

    const tone = statusTone[server.status] ?? statusTone.offline;
    const playerCount = server.player_count;
    const maxPlayers = server.max_players;

    return (
        <>
            <Head title={`${server_name} — ${t('status.page_title')}`} />
            <PublicLayout>
                <div className="mx-auto max-w-7xl px-4 py-8">
                    {/* Hero */}
                    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-emerald-500/10 p-6 shadow-sm lg:p-8">
                        <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
                        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                                    <Server className="size-6 text-emerald-500" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                                        {server_name}
                                    </h1>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className={`gap-1.5 ${tone.badge}`}>
                                            <span className={`size-1.5 rounded-full ${tone.dot}`} />
                                            {t(tone.labelKey)}
                                        </Badge>
                                        {ping !== null && server.status === 'online' && (
                                            <Badge variant="secondary" className="gap-1.5 tabular-nums">
                                                <Signal className="size-3" />
                                                {ping}ms
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
                                <div className="rounded-xl border bg-background/60 px-4 py-3 text-center">
                                    <Users className="mx-auto mb-1 size-4 text-emerald-500" />
                                    <p className="text-xl font-bold tabular-nums">
                                        {playerCount}
                                        {maxPlayers !== null && (
                                            <span className="text-sm font-normal text-muted-foreground">
                                                /{maxPlayers}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">{t('status.players_online')}</p>
                                </div>
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="cursor-default rounded-xl border bg-background/60 px-4 py-3 text-center">
                                                <Map className="mx-auto mb-1 size-4 text-blue-500" />
                                                <p className="truncate text-xl font-bold">{server.map || '—'}</p>
                                                <p className="text-[11px] text-muted-foreground">{t('status.map')}</p>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-mono text-xs">
                                                {server.map || t('status.map')}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <div className="rounded-xl border bg-background/60 px-4 py-3 text-center">
                                    <Clock className="mx-auto mb-1 size-4 text-violet-500" />
                                    <p className="truncate text-xl font-bold">{server.uptime || '—'}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('status.uptime')}</p>
                                </div>
                                <div className="rounded-xl border bg-background/60 px-4 py-3 text-center">
                                    <Package className="mx-auto mb-1 size-4 text-orange-500" />
                                    <p className="text-xl font-bold tabular-nums">{mods.length}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('status.mods')}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Game state */}
                    {server.status !== 'offline' && game_state && (
                        <div className="mt-6">
                            <GameStateWidget gameState={game_state} />
                        </div>
                    )}

                    {/* Detail columns */}
                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        {/* Online players */}
                        <Card>
                            <CardHeader className="border-b pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="size-5 text-emerald-500" />
                                    {t('status.online_players_title')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {server.players.length > 0 ? (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {server.players.map((player) => (
                                            <div
                                                key={player}
                                                className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                                            >
                                                <Circle className="size-2 shrink-0 fill-emerald-500 text-emerald-500" />
                                                <span className="truncate text-sm font-medium">{player}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Users className="mb-3 size-8 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">
                                            {server.status === 'online'
                                                ? t('status.no_players_online')
                                                : server.status === 'starting'
                                                  ? t('status.server_starting')
                                                  : t('status.server_offline')}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Installed mods */}
                        <Card>
                            <CardHeader className="border-b pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="size-5 text-blue-500" />
                                    {t('status.installed_mods_title')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {mods.length > 0 ? (
                                    <div className="space-y-2">
                                        {mods.map((mod) => (
                                            <div
                                                key={mod.workshop_id}
                                                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                                            >
                                                <span className="truncate text-sm font-medium">{mod.mod_id}</span>
                                                {mod.workshop_id && (
                                                    <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                                                        {mod.workshop_id}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Package className="mb-3 size-8 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">{t('status.no_mods_installed')}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PublicLayout>
        </>
    );
}