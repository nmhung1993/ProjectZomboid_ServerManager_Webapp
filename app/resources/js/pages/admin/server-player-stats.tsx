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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('admin.server_player_stats.title')}</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('admin.server_player_stats.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">
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

                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <Card className="shadow-sm">
                        <CardHeader className="p-3.5 pb-1 sm:p-4 sm:pb-2">
                            <CardDescription className="flex items-center gap-1.5 text-xs">
                                <Users className="size-3.5 sm:size-4 text-blue-500" />
                                <span className="truncate">{t('admin.server_player_stats.current_online')}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
                            <div className="text-xl sm:text-3xl font-bold tabular-nums">{stats.current_online}</div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="p-3.5 pb-1 sm:p-4 sm:pb-2">
                            <CardDescription className="flex items-center gap-1.5 text-xs">
                                <TrendingUp className="size-3.5 sm:size-4 text-emerald-500" />
                                <span className="truncate">{t('admin.server_player_stats.peak')}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
                            <div className="text-xl sm:text-3xl font-bold tabular-nums">{stats.peak[period]}</div>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {t(`admin.server_player_stats.period_${period}`)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="p-3.5 pb-1 sm:p-4 sm:pb-2">
                            <CardDescription className="flex items-center gap-1.5 text-xs">
                                <Clock className="size-3.5 sm:size-4 text-purple-500" />
                                <span className="truncate">{t('admin.server_player_stats.total_hours')}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
                            <div className="text-xl sm:text-3xl font-bold tabular-nums">
                                {realTotalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="p-3.5 pb-1 sm:p-4 sm:pb-2">
                            <CardDescription className="flex items-center gap-1.5 text-xs">
                                <BarChart3 className="size-3.5 sm:size-4 text-amber-500" />
                                <span className="truncate">{t('admin.server_player_stats.data_points')}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
                            <div className="text-xl sm:text-3xl font-bold tabular-nums">{series.length}</div>
                        </CardContent>
                    </Card>
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