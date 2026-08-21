import { Head, usePoll } from '@inertiajs/react';
import { BarChart3, Clock, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import ServerPlayerStatsChart, { type ChartPoint } from '@/components/server-player-stats-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { convertHours } from '@/lib/hours-format';
import type { BreadcrumbItem, PlayerStatPeriod, ServerPlayerStats } from '@/types';

type ServerPlayerStatsProps = {
    stats: ServerPlayerStats;
    day_length_minutes?: number;
};

const PERIODS: PlayerStatPeriod[] = ['hour', 'day', 'week', 'month', 'year'];

const PERIOD_COLORS: Record<string, string> = {
    online: 'hsl(221, 83%, 53%)',
    hours: 'hsl(158, 64%, 42%)',
};

function formatLabel(label: string, period: PlayerStatPeriod): string {
    if (period === 'hour') {
        return label.slice(11, 16); // HH:00
    }
    if (period === 'day') {
        const [, month, day] = label.split('-');
        return `${day}/${month}`;
    }
    if (period === 'month') {
        const [year, month] = label.split('-');
        return `${month}/${year}`;
    }
    return label;
}

export default function ServerPlayerStats({ stats, day_length_minutes = 60 }: ServerPlayerStatsProps) {
    const { t } = useTranslation();
    const [period, setPeriod] = useState<PlayerStatPeriod>('hour');

    usePoll(60000, { only: ['stats'] });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('admin.server_player_stats.title'), href: '/admin/server-player-stats' },
    ];

    const series = stats.series[period] ?? [];

    const onlinePoints: ChartPoint[] = series.map((b) => ({
        label: formatLabel(b.label, period),
        value: b.player_count,
    }));

    const hoursPoints: ChartPoint[] = series.map((b) => ({
        label: formatLabel(b.label, period),
        value: convertHours(b.total_hours_survived, 'real', day_length_minutes),
    }));

    const realTotalHours = convertHours(stats.total_hours_played, 'real', day_length_minutes);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.server_player_stats.title')} />
            <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">{t('admin.server_player_stats.title')}</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('admin.server_player_stats.subtitle')}</p>
                    </div>
                    <div className="flex w-fit items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5 sm:gap-1 sm:p-1">
                        {PERIODS.map((p) => (
                            <Button
                                key={p}
                                variant={period === p ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs px-2 sm:h-8 sm:px-3"
                                onClick={() => setPeriod(p)}
                            >
                                {t(`admin.server_player_stats.period_${p}`)}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-4 divide-x divide-border/60 rounded-xl border border-border/60 bg-card p-2 sm:p-3.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <Users className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('admin.server_player_stats.current_online')}</p>
                            <p className="text-xs sm:text-lg font-bold tabular-nums text-foreground">{stats.current_online}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <TrendingUp className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('admin.server_player_stats.peak')}</p>
                            <p className="text-xs sm:text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{stats.peak[period]}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                            <Clock className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('admin.server_player_stats.total_hours')}</p>
                            <p className="text-xs sm:text-lg font-bold tabular-nums text-purple-600 dark:text-purple-400">
                                {realTotalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <BarChart3 className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('admin.server_player_stats.data_points')}</p>
                            <p className="text-xs sm:text-lg font-bold tabular-nums text-foreground">{series.length}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.server_player_stats.online_chart')}</CardTitle>
                            <CardDescription>{t('admin.server_player_stats.online_chart_description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ServerPlayerStatsChart
                                data={onlinePoints}
                                color={PERIOD_COLORS.online}
                                formatValue={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.server_player_stats.hours_chart')}</CardTitle>
                            <CardDescription>{t('admin.server_player_stats.hours_chart_description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ServerPlayerStatsChart
                                data={hoursPoints}
                                color={PERIOD_COLORS.hours}
                                formatValue={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}