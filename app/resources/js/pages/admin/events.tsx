import { Head, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Coins,
    Flame,
    Gift,
    MapPin,
    Package,
    Plus,
    Radio,
    Sparkles,
    Trash2,
    Trophy,
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

interface LootItem {
    item_id: string;
    count?: number;
}

interface EventItem {
    id: number;
    event_type: string;
    title: string;
    description: string | null;
    location_name: string | null;
    x: number;
    y: number;
    z: number;
    radius: number;
    loot_items: LootItem[];
    reward_coins: number;
    status: string;
    looted_by_username: string | null;
    looted_by_user: { id: number; username: string } | null;
    expires_at: string | null;
    created_at: string;
}

interface Props {
    events: {
        data: EventItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total_events: number;
        active_events: number;
        looted_events: number;
        total_rewards_paid: number;
    };
}

export default function AdminEventsPage({ events, stats }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: 'Quản lý Sự kiện Thế giới', href: '/admin/events' },
    ];

    const [triggering, setTriggering] = useState(false);

    const handleSpawnAirdrop = () => {
        setTriggering(true);
        router.post('/admin/events/airdrop', {}, {
            onFinish: () => setTriggering(false),
        });
    };

    const handleSpawnHeliCrash = () => {
        setTriggering(true);
        router.post('/admin/events/heli-crash', {}, {
            onFinish: () => setTriggering(false),
        });
    };

    const handleCancel = (eventId: number) => {
        if (confirm('Bạn có chắc muốn hủy sự kiện này?')) {
            router.post(`/admin/events/${eventId}/cancel`);
        }
    };

    const getEventBadge = (type: string) => {
        switch (type) {
            case 'airdrop':
                return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><Package className="size-3" /> Airdrop</Badge>;
            case 'heli_crash':
                return <Badge className="bg-red-600 hover:bg-red-700 gap-1"><Flame className="size-3" /> Heli Crash</Badge>;
            default:
                return <Badge className="bg-purple-600 hover:bg-purple-700 gap-1"><Zap className="size-3" /> Horde</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý Sự kiện Thế giới" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Radio className="size-7 text-primary animate-pulse" />
                            Quản lý Sự kiện Thế giới Động (Dynamic World Events)
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Kích hoạt các đợt thả thùng viện trợ quân sự Airdrop, hiện trường trực thăng rơi và đàn zombie đột kích.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSpawnAirdrop}
                            disabled={triggering}
                            className="bg-amber-600 hover:bg-amber-700 gap-1.5 font-bold"
                        >
                            <Package className="size-4" />
                            Thả Thùng Airdrop Ngay
                        </Button>
                        <Button
                            onClick={handleSpawnHeliCrash}
                            disabled={triggering}
                            className="bg-red-600 hover:bg-red-700 gap-1.5 font-bold"
                        >
                            <Flame className="size-4" />
                            Tạo Trực Thăng Rơi
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Đang Hoạt Động</CardTitle>
                            <Radio className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">{stats.active_events}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Đã Bị Chiếm Đoạt</CardTitle>
                            <Trophy className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{stats.looted_events}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Tổng Sự Kiện Đã Tổ Chức</CardTitle>
                            <Activity className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_events}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Tiền Thưởng Đã Phát</CardTitle>
                            <Coins className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">{stats.total_rewards_paid.toLocaleString()} coins</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Events Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Radio className="size-4 text-primary" />
                            Lịch sử & Danh sách Sự kiện ({events.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sự kiện</TableHead>
                                    <TableHead>Loại</TableHead>
                                    <TableHead>Vị trí (Tọa độ)</TableHead>
                                    <TableHead>Vật phẩm Loot</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Người đoạt thùng</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Chưa có sự kiện nào. Hãy nhấn các nút ở trên để tạo sự kiện mới!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    events.data.map((e) => (
                                        <TableRow key={e.id}>
                                            <TableCell className="font-semibold text-xs">
                                                <div>
                                                    <span>{e.title}</span>
                                                    <span className="text-[11px] text-muted-foreground block">{new Date(e.created_at).toLocaleString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getEventBadge(e.event_type)}</TableCell>
                                            <TableCell className="text-xs">
                                                <div>
                                                    <span className="font-semibold">{e.location_name || 'N/A'}</span>
                                                    <span className="text-muted-foreground block font-mono text-[11px]">
                                                        [{Math.round(e.x)}, {Math.round(e.y)}]
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {e.loot_items?.map((item, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-[10px] font-mono">
                                                            {item.count || 1}x {item.item_id}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={e.status === 'active' ? 'default' : e.status === 'looted' ? 'secondary' : 'outline'}
                                                    className="text-xs"
                                                >
                                                    {e.status === 'active' ? 'Đang mở' : e.status === 'looted' ? 'Đã đoạt' : 'Đã kết thúc'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-primary">
                                                {e.looted_by_username || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {e.status === 'active' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                                        onClick={() => handleCancel(e.id)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                        Hủy
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
