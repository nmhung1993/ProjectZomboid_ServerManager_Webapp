import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Cpu,
    Flame,
    Gauge,
    HardDrive,
    HeartPulse,
    MapPin,
    RefreshCw,
    ShieldAlert,
    Skull,
    Sparkles,
    Timer,
    Users,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
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
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface HealthData {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    latest: {
        tps: number;
        tick_time_ms: number;
        active_zombies: number;
        dead_bodies: number;
        online_players: number;
        memory_used_mb: number;
        memory_max_mb: number;
        memory_percent: number;
        recorded_at: string;
    };
}

interface HistoryItem {
    time: string;
    tps: number;
    tick_time_ms: number;
    active_zombies: number;
    dead_bodies: number;
    online_players: number;
    memory_used_mb: number;
}

interface HotspotItem {
    name: string;
    total_deaths: number;
    pvp_deaths: number;
    center_x: number;
    center_y: number;
}

interface Props {
    health: HealthData;
    history: HistoryItem[];
    hotspots: HotspotItem[];
}

export default function AdminPerformancePage({ health, history, hotspots }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.performance'), href: '/admin/performance' },
    ];

    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        router.reload({ onFinish: () => setRefreshing(false) });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'excellent':
                return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
            case 'good':
                return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
            case 'warning':
                return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
            default:
                return 'text-red-500 border-red-500/30 bg-red-500/10';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'excellent':
                return 'Hoạt động Hoàn Hảo (60 TPS)';
            case 'good':
                return 'Tốt & Ổn Định';
            case 'warning':
                return 'Tải Cao (Cần lưu ý)';
            default:
                return 'Nguy Hiểm (Đang lag)';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Giám sát Hiệu năng Máy chủ" />

            <div className="space-y-4 p-3 sm:space-y-6 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Cpu className="size-5 sm:size-7 text-primary" />
                            Giám sát Hiệu năng & TPS Máy chủ
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            Đo lường thời gian thực: Tốc độ khung hình (TPS), độ trễ, RAM Java heap và điểm nóng tử địa.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="h-8 text-xs px-2.5 gap-1.5"
                        >
                            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Làm mới
                        </Button>

                        <Link href="/admin/cleaner">
                            <Button size="sm" className="h-8 text-xs px-2.5 gap-1.5 bg-primary font-bold">
                                <Sparkles className="size-3.5" />
                                Mở Bộ Dọn Rác (Cleaner)
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Health Rating Banner */}
                <Card className={`border ${getStatusColor(health.status)} shadow-sm`}>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center justify-center size-10 sm:size-12 rounded-xl bg-card border shadow-inner shrink-0">
                                <HeartPulse className="size-5 sm:size-7 text-primary animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl sm:text-2xl font-extrabold">{health.score} / 100</span>
                                    <Badge className="text-[10px] uppercase font-bold">{health.status}</Badge>
                                </div>
                                <p className="text-xs font-semibold mt-0.5 truncate">{getStatusText(health.status)}</p>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground self-start sm:self-center">
                            Cập nhật: {new Date(health.latest.recorded_at).toLocaleTimeString()}
                        </p>
                    </CardContent>
                </Card>

                {/* Key Metrics Grid - Single row 4-column strip on mobile */}
                <div className="grid grid-cols-4 divide-x divide-border/60 rounded-xl border border-border/60 bg-card p-2 sm:p-3.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Gauge className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Server TPS</p>
                            <p className="text-xs sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {health.latest.tps.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">/ 10.0</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <Timer className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Độ trễ Tick</p>
                            <p className="text-xs sm:text-base font-bold text-primary tabular-nums">
                                {health.latest.tick_time_ms.toFixed(1)}ms
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <HardDrive className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">RAM Java</p>
                            <p className="text-xs sm:text-base font-bold text-amber-500 tabular-nums">
                                {health.latest.memory_percent}%
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                            <Skull className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Xác Chưa Dọn</p>
                            <p className="text-xs sm:text-base font-bold text-red-500 tabular-nums">
                                {health.latest.dead_bodies}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Hotspots Section */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Flame className="size-5 text-red-500" />
                                Top 5 Điểm Nóng Tử Địa Nguy Hiểm Nhất (Death Hotspots)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Khu vực tập trung nhiều cái chết và giao tranh PvP ác liệt nhất máy chủ.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Khu vực</TableHead>
                                        <TableHead>Tổng người chết</TableHead>
                                        <TableHead>PvP Kills</TableHead>
                                        <TableHead>Mức nguy hiểm</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hotspots.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                Chưa có dữ liệu tử vong nào được ghi nhận.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        hotspots.map((h, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-semibold flex items-center gap-2">
                                                    <MapPin className="size-3.5 text-primary" />
                                                    {h.name}
                                                </TableCell>
                                                <TableCell className="font-bold">{h.total_deaths}</TableCell>
                                                <TableCell className="font-bold text-red-500">{h.pvp_deaths}</TableCell>
                                                <TableCell>
                                                    <Badge variant={idx === 0 ? 'destructive' : 'secondary'} className="text-[11px]">
                                                        {idx === 0 ? 'Cực kỳ nguy hiểm' : idx < 3 ? 'Nguy hiểm cao' : 'Trung bình'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="size-5 text-primary" />
                                Nhật Ký Chỉ Số Gần Đây
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Lịch sử 10 mẫu đo lường hiệu năng gần nhất từ máy chủ game.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Thời gian</TableHead>
                                        <TableHead>TPS</TableHead>
                                        <TableHead>Tick Time</TableHead>
                                        <TableHead>Zombies</TableHead>
                                        <TableHead>RAM (MB)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.slice(-10).reverse().map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-xs font-mono">{item.time}</TableCell>
                                            <TableCell className="font-bold text-emerald-600 text-xs">{item.tps.toFixed(1)}</TableCell>
                                            <TableCell className="text-xs font-mono">{item.tick_time_ms.toFixed(1)}ms</TableCell>
                                            <TableCell className="text-xs">{item.active_zombies}</TableCell>
                                            <TableCell className="text-xs font-mono">{Math.round(item.memory_used_mb)} MB</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
