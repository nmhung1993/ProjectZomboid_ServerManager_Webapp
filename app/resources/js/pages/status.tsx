import { Head, Link, usePoll } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    Circle,
    Clock,
    Crosshair,
    Map,
    Server,
    Signal,
    Skull,
    Swords,
    Trophy,
    Users,
} from 'lucide-react';
import { GameStateWidget } from '@/components/game-state-widget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePing } from '@/hooks/use-ping';
import { useTranslation } from '@/hooks/use-translation';
import PublicLayout from '@/layouts/public-layout';
import { formatHours } from '@/lib/hours-format';
import type { LeaderboardEntry, StatusOnlinePlayer, StatusPageData } from '@/types';

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

function MiniRankBadge({ rank }: { rank?: number | null }) {
    if (!rank) {
        return (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                —
            </span>
        );
    }
    if (rank === 1) {
        return (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-yellow-500/20 text-[11px] font-bold text-yellow-600 dark:text-yellow-400 shadow-sm">
                #1
            </span>
        );
    }
    if (rank === 2) {
        return (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                #2
            </span>
        );
    }
    if (rank === 3) {
        return (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-800/20 text-[11px] font-bold text-amber-700 dark:text-amber-500">
                #3
            </span>
        );
    }
    return (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground">
            #{rank}
        </span>
    );
}

const PROFESSION_NAMES: Record<string, string> = {
    unemployed: 'Thất nghiệp',
    fireofficer: 'Lính cứu hỏa',
    policeofficer: 'Cảnh sát',
    parkranger: 'Kiểm lâm',
    constructionworker: 'Thợ xây dựng',
    securityguard: 'Bảo vệ',
    carpenter: 'Thợ mộc',
    burglar: 'Trộm',
    chef: 'Đầu bếp',
    repairman: 'Thợ sửa chữa',
    farmer: 'Nông dân',
    fisherman: 'Ngư dân',
    doctor: 'Bác sĩ',
    nurse: 'Y tá',
    lumberjack: 'Tiều phu',
    fitnessInstructor: 'HLV thể hình',
    electrician: 'Thợ điện',
    engineer: 'Kỹ sư',
    metalworker: 'Thợ kim khí',
    mechanic: 'Thợ cơ khí',
    veteran: 'Cựu chiến binh',
};

function formatProfession(prof?: string | null): string {
    if (!prof) return 'Thất nghiệp';
    const clean = prof.trim().toLowerCase();
    for (const [key, label] of Object.entries(PROFESSION_NAMES)) {
        if (key.toLowerCase() === clean) return label;
    }
    return prof.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function normalizePlayer(p: string | StatusOnlinePlayer): StatusOnlinePlayer {
    if (typeof p === 'string') {
        return {
            username: p,
            rank: null,
            zombie_kills: 0,
            hours_survived: 0,
            profession: null,
            is_dead: false,
        };
    }
    return p;
}

export default function Status({
    server,
    game_state,
    server_name,
    top_rankings,
    day_length_minutes = 60,
}: StatusPageData) {
    usePoll(5000, { only: ['server', 'game_state'] });
    const { t } = useTranslation();
    const ping = usePing('/ping', 15000);

    const tone = statusTone[server.status] ?? statusTone.offline;
    const playerCount = server.player_count;
    const maxPlayers = server.max_players;

    const normalizedPlayers = (server.players ?? []).map(normalizePlayer);

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

                            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
                                <div className="rounded-xl border bg-background/60 px-5 py-3 text-center min-w-[120px]">
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
                                            <div className="cursor-default rounded-xl border bg-background/60 px-5 py-3 text-center min-w-[120px]">
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
                                <div className="rounded-xl border bg-background/60 px-5 py-3 text-center min-w-[120px]">
                                    <Clock className="mx-auto mb-1 size-4 text-violet-500" />
                                    <p className="truncate text-xl font-bold">{server.uptime || '—'}</p>
                                    <p className="text-[11px] text-muted-foreground">{t('status.uptime')}</p>
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

                    {/* Online players (Table List) */}
                    <div className="mt-6">
                        <Card className="w-full shadow-sm">
                            <CardHeader className="border-b pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Activity className="size-5 text-emerald-500" />
                                        {t('status.online_players_title')}
                                    </CardTitle>
                                    <Badge variant="secondary" className="tabular-nums">
                                        {normalizedPlayers.length} online
                                    </Badge>
                                </div>
                                <CardDescription>
                                    {t('admin.server_player_stats.subtitle')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {normalizedPlayers.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="w-12 text-center">#</TableHead>
                                                    <TableHead className="w-16 text-center">Hạng</TableHead>
                                                    <TableHead>Người chơi</TableHead>
                                                    <TableHead className="hidden sm:table-cell">Nghề nghiệp</TableHead>
                                                    <TableHead className="text-right">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Crosshair className="size-3.5 text-red-500" />
                                                            Zombie hạ gục
                                                        </span>
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock className="size-3.5 text-emerald-500" />
                                                            Giờ sống (Realtime)
                                                        </span>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {normalizedPlayers.map((player, idx) => (
                                                    <TableRow
                                                        key={player.username}
                                                        className="hover:bg-muted/40 transition-colors"
                                                    >
                                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <MiniRankBadge rank={player.rank} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link
                                                                href={`/rankings/${player.username}`}
                                                                className="inline-flex items-center gap-2 font-medium hover:underline hover:text-primary transition-colors"
                                                            >
                                                                <Circle className="size-2 shrink-0 fill-emerald-500 text-emerald-500" />
                                                                <span className="font-semibold">{player.username}</span>
                                                                {player.is_dead && (
                                                                    <Skull className="size-3.5 text-red-500" title="Dead" />
                                                                )}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Badge variant="outline" className="text-xs font-normal">
                                                                {formatProfession(player.profession)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums text-red-500/90">
                                                            {(player.zombie_kills ?? 0).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                            {formatHours(player.hours_survived ?? 0, 'real', day_length_minutes)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Users className="mb-3 size-10 text-muted-foreground/40" />
                                        <p className="text-sm font-medium text-muted-foreground">
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
                    </div>

                    {/* Mini Leaderboards Section */}
                    {top_rankings && (
                        <div className="mt-6 grid gap-6 md:grid-cols-2">
                            {/* Top Kills */}
                            <Card className="shadow-sm">
                                <CardHeader className="border-b pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Swords className="size-4 text-red-500" />
                                            Top Zombie Kills
                                        </CardTitle>
                                        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                            <Link href="/rankings">
                                                {t('common.view_all')}
                                                <ArrowRight className="ml-1 size-3" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-3">
                                    {top_rankings.kills && top_rankings.kills.length > 0 ? (
                                        <div className="divide-y divide-border/40">
                                            {top_rankings.kills.map((entry: LeaderboardEntry) => (
                                                <Link
                                                    key={entry.username}
                                                    href={`/rankings/${entry.username}`}
                                                    className="flex items-center justify-between py-2.5 px-2 rounded-md transition-colors hover:bg-muted/50 text-sm"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <MiniRankBadge rank={entry.rank} />
                                                        <span className="font-medium truncate">{entry.username}</span>
                                                    </div>
                                                    <span className="font-semibold tabular-nums text-red-500/90">
                                                        {entry.zombie_kills.toLocaleString()} kills
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="py-6 text-center text-xs text-muted-foreground">
                                            {t('common.no_data')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Top Survival */}
                            <Card className="shadow-sm">
                                <CardHeader className="border-b pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Trophy className="size-4 text-amber-500" />
                                            Top Sinh tồn (Realtime)
                                        </CardTitle>
                                        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                            <Link href="/rankings">
                                                {t('common.view_all')}
                                                <ArrowRight className="ml-1 size-3" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-3">
                                    {top_rankings.survival && top_rankings.survival.length > 0 ? (
                                        <div className="divide-y divide-border/40">
                                            {top_rankings.survival.map((entry: LeaderboardEntry) => (
                                                <Link
                                                    key={entry.username}
                                                    href={`/rankings/${entry.username}`}
                                                    className="flex items-center justify-between py-2.5 px-2 rounded-md transition-colors hover:bg-muted/50 text-sm"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <MiniRankBadge rank={entry.rank} />
                                                        <span className="font-medium truncate">{entry.username}</span>
                                                    </div>
                                                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        {formatHours(entry.hours_survived, 'real', day_length_minutes)}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="py-6 text-center text-xs text-muted-foreground">
                                            {t('common.no_data')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </PublicLayout>
        </>
    );
}