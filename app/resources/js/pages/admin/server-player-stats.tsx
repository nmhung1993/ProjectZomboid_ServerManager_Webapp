import { Head, usePoll } from '@inertiajs/react';
import { BarChart3, Clock, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import ServerPlayerStatsChart, { type ChartPoint } from '@/components/server-player-stats-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, PlayerStatPeriod, ServerPlayerStats } from '@/types';

type ServerPlayerStatsProps = {
    stats: ServerPlayerStats;
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

export default function ServerPlayerStats({ stats }: ServerPlayerStatsProps) {
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
        value: b.total_hours_survived,
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.server_player_stats.title')} />
            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('admin.server_player_stats.title')}</h1>
                        <p className="text-muted-foreground">{t('admin.server_player_stats.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
                        {PERIODS.map((p) => (
                            <Button
                                key={p}
                                variant={period === p ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setPeriod(p)}
                            >
                                {t(`admin.server_player_stats.period_${p}`)}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-1.5">
                                <Users className="size-4" />
                                {t('admin.server_player_stats.current_online')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tabular-nums">{stats.current_online}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-1.5">
                                <TrendingUp className="size-4" />
                                {t('admin.server_player_stats.peak')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tabular-nums">{stats.peak[period]}</div>
                            <p className="text-xs text-muted-foreground">
                                {t(`admin.server_player_stats.period_${period}`)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-1.5">
                                <Clock className="size-4" />
                                {t('admin.server_player_stats.total_hours')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tabular-nums">
                                {stats.total_hours_played.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-1.5">
                                <BarChart3 className="size-4" />
                                {t('admin.server_player_stats.data_points')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold tabular-nums">{series.length}</div>
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