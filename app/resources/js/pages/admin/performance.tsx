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

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Cpu className="size-7 text-primary" />
                            Giám sát Hiệu năng & TPS Máy chủ
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Đo lường thời gian thực: Tốc độ khung hình máy chủ (TPS), độ trễ khung hình, bộ nhớ RAM Java heap và các điểm nóng tử địa.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="gap-1.5"
                        >
                            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Làm mới
                        </Button>

                        <Link href="/admin/cleaner">
                            <Button size="sm" className="gap-1.5 bg-primary font-bold">
                                <Sparkles className="size-4" />
                                Mở Bộ Dọn Rác (Cleaner)
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Health Rating Banner */}
                <Card className={`border-2 ${getStatusColor(health.status)}`}>
                    <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center size-16 rounded-2xl bg-card border shadow-inner">
                                <HeartPulse className="size-9 text-primary animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-extrabold">{health.score} / 100</span>
                                    <Badge className="text-xs uppercase font-bold">{health.status}</Badge>
                                </div>
                                <p className="text-sm font-semibold mt-0.5">{getStatusText(health.status)}</p>
                                <p className="text-xs text-muted-foreground">
                                    Cập nhật lần cuối: {new Date(health.latest.recorded_at).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
                            <div className="rounded-xl border bg-card p-3 text-center">
                                <span className="text-xs text-muted-foreground block">Tốc độ TPS</span>
                                <span className="text-xl font-bold text-emerald-600">{health.latest.tps.toFixed(1)}</span>
                            </div>
                            <div className="rounded-xl border bg-card p-3 text-center">
                                <span className="text-xs text-muted-foreground block">Độ trễ Tick</span>
                                <span className="text-xl font-bold text-primary">{health.latest.tick_time_ms.toFixed(1)}ms</span>
                            </div>
                            <div className="rounded-xl border bg-card p-3 text-center">
                                <span className="text-xs text-muted-foreground block">RAM Java</span>
                                <span className="text-xl font-bold text-amber-500">{health.latest.memory_percent}%</span>
                            </div>
                            <div className="rounded-xl border bg-card p-3 text-center">
                                <span className="text-xs text-muted-foreground block">Zombie Sống</span>
                                <span className="text-xl font-bold text-purple-600">{health.latest.active_zombies}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Key Metrics Grid */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Server TPS (Tick Rate)</CardTitle>
                            <Gauge className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{health.latest.tps.toFixed(1)} / 10.0 TPS</div>
                            <p className="text-xs text-muted-foreground mt-1">Chuẩn tối đa Dedicated Server: 10.0 TPS (100ms / tick)</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Server Tick Time</CardTitle>
                            <Timer className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">{health.latest.tick_time_ms.toFixed(1)} ms</div>
                            <p className="text-xs text-muted-foreground mt-1">Chu kỳ vòng lặp máy chủ (Tối ưu ≤ 100ms)</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Java Heap Memory</CardTitle>
                            <HardDrive className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">
                                {Math.round(health.latest.memory_used_mb)} / {Math.round(health.latest.memory_max_mb)} MB
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{health.latest.memory_percent}% bộ nhớ đã cấp</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Xác Zombie Chưa Dọn</CardTitle>
                            <Skull className="size-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{health.latest.dead_bodies}</div>
                            <p className="text-xs text-muted-foreground mt-1">Dọn xác định kỳ để tránh lag</p>
                        </CardContent>
                    </Card>
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
