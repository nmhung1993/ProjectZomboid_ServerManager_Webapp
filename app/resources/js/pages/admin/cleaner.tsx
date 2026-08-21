import { Head, router } from '@inertiajs/react';
import {
    Activity,
    CheckCircle2,
    Clock,
    Flame,
    History,
    RefreshCw,
    Shield,
    Skull,
    Sparkles,
    Trash2,
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

interface CleanerLogItem {
    id: number;
    clean_type: string;
    items_removed: number;
    triggered_by: string;
    details: any;
    created_at: string;
}

interface Props {
    logs: {
        data: CleanerLogItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total_cleanups: number;
        total_bodies_removed: number;
        total_items_removed: number;
    };
}

export default function AdminCleanerPage({ logs, stats }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: 'Dọn rác tối ưu Server', href: '/admin/cleaner' },
    ];

    const [cleaningBodies, setCleaningBodies] = useState(false);
    const [cleaningItems, setCleaningItems] = useState(false);

    const handleCleanBodies = () => {
        setCleaningBodies(true);
        router.post('/admin/cleaner/bodies', {}, {
            onFinish: () => setCleaningBodies(false),
        });
    };

    const handleCleanItems = () => {
        setCleaningItems(true);
        router.post('/admin/cleaner/items', {}, {
            onFinish: () => setCleaningItems(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dọn rác tối ưu Server" />

            <div className="space-y-4 p-3 sm:space-y-6 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Sparkles className="size-5 sm:size-7 text-primary" />
                            Dọn rác Tối ưu Server (Auto Lag Cleaner)
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            Loại bỏ xác Zombie và rác vật phẩm rơi vãi mặt đất để giảm tải RAM/CPU và chống tụt FPS cho máy chủ.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Button
                            onClick={handleCleanBodies}
                            disabled={cleaningBodies}
                            size="sm"
                            className="h-8 text-xs px-2.5 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                        >
                            <Skull className="size-3.5" />
                            {cleaningBodies ? 'Đang dọn...' : 'Dọn xác Zombie'}
                        </Button>

                        <Button
                            onClick={handleCleanItems}
                            disabled={cleaningItems}
                            size="sm"
                            className="h-8 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                        >
                            <Trash2 className="size-3.5" />
                            {cleaningItems ? 'Đang dọn...' : 'Dọn rác mặt đất'}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-border/60 rounded-xl border border-border/60 bg-card p-2.5 sm:p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 px-1 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Lượt Dọn dẹp</p>
                            <p className="text-xs sm:text-xl font-bold tabular-nums text-foreground">{stats.total_cleanups}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 px-1 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                            <Skull className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Xác Zombie Đã Xóa</p>
                            <p className="text-xs sm:text-xl font-bold text-red-500 tabular-nums">{stats.total_bodies_removed.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 px-1 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <Trash2 className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Rác Mặt đất Đã Xóa</p>
                            <p className="text-xs sm:text-xl font-bold text-amber-500 tabular-nums">{stats.total_items_removed.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Cleaner Logs Table */}
                <Card className="shadow-sm">
                    <CardHeader className="p-3.5 pb-2 sm:p-4 sm:pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <History className="size-4 text-primary" />
                            Nhật ký Dọn dẹp ({logs.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Thời gian</TableHead>
                                    <TableHead>Loại dọn dẹp</TableHead>
                                    <TableHead>Số lượng đã xóa</TableHead>
                                    <TableHead>Nguồn kích hoạt</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            Chưa có lượt dọn dẹp nào được ghi nhận.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.data.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {new Date(log.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-semibold flex items-center gap-2">
                                                {log.clean_type === 'dead_bodies' ? (
                                                    <>
                                                        <Skull className="size-4 text-red-500" />
                                                        Dọn xác Zombie
                                                    </>
                                                ) : log.clean_type === 'ground_items' ? (
                                                    <>
                                                        <Trash2 className="size-4 text-amber-500" />
                                                        Dọn rác Mặt đất
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="size-4 text-primary" />
                                                        {log.clean_type}
                                                    </>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-sm">
                                                {log.items_removed > 0 ? (
                                                    <span className="text-emerald-600">
                                                        +{log.items_removed.toLocaleString()} mục
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-mono">
                                                    {log.triggered_by}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={log.details?.status === 'completed' ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {log.details?.status === 'completed' ? 'Hoàn tất' : 'Đang xử lý'}
                                                </Badge>
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
