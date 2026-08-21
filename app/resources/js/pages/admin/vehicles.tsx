import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Battery,
    Car,
    CheckCircle2,
    Fuel,
    Gauge,
    MapPin,
    Shield,
    Sparkles,
    Trash2,
    Unlock,
    User,
    Wrench,
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

interface VehicleRecord {
    id: number;
    sql_id: number;
    name: string;
    model: string | null;
    owner_username: string | null;
    x: number;
    y: number;
    z: number;
    engine_condition: number;
    fuel_level: number;
    battery_charge: number;
    is_claimed: boolean;
    last_seen_at: string | null;
}

interface Props {
    vehicles: {
        data: VehicleRecord[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total_vehicles: number;
        claimed_vehicles: number;
        broken_vehicles: number;
    };
    currentFilter: string;
}

export default function AdminVehiclesPage({ vehicles, stats, currentFilter }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: 'Quản lý Phương tiện (Xe)', href: '/admin/vehicles' },
    ];

    const handleRepair = (vehicleId: number, sqlId: number) => {
        if (confirm(`Gửi lệnh sửa chữa toàn diện 100% cho xe #${sqlId}?`)) {
            router.post(`/admin/vehicles/${vehicleId}/repair`);
        }
    };

    const handleUnclaim = (vehicleId: number, sqlId: number) => {
        if (confirm(`Gỡ quyền sở hữu (Unclaim) xe #${sqlId}?`)) {
            router.post(`/admin/vehicles/${vehicleId}/unclaim`);
        }
    };

    const handleDelete = (vehicleId: number, sqlId: number) => {
        if (confirm(`Xóa dữ liệu xe #${sqlId}?`)) {
            router.delete(`/admin/vehicles/${vehicleId}`);
        }
    };

    const handleCleanupBroken = () => {
        if (confirm('Dọn dẹp toàn bộ xe nát (0% động cơ) trên server?')) {
            router.post('/admin/vehicles/cleanup-broken');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý Phương tiện" />

            <div className="space-y-4 p-3 sm:space-y-6 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Car className="size-5 sm:size-7 text-primary" />
                            Quản lý Phương tiện (Vehicles)
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            Giám sát tình trạng xe, tọa độ thực tế trên bản đồ và can thiệp sửa chữa, gỡ claim.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleCleanupBroken}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-2.5 text-destructive hover:bg-destructive/10 gap-1.5"
                        >
                            <Trash2 className="size-3.5" />
                            Dọn xe nát (0%)
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1 sm:p-4 sm:pb-2">
                            <CardTitle className="text-xs font-medium">Tổng Phương tiện</CardTitle>
                            <Car className="size-3.5 sm:size-4 text-primary" />
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
                            <div className="text-xl sm:text-2xl font-bold tabular-nums">{stats.total_vehicles}</div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1 sm:p-4 sm:pb-2">
                            <CardTitle className="text-xs font-medium">Xe đã Claim</CardTitle>
                            <Shield className="size-3.5 sm:size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
                            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">{stats.claimed_vehicles}</div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-2 sm:col-span-1 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-3.5 pb-1 sm:p-4 sm:pb-2">
                            <CardTitle className="text-xs font-medium">Xe hỏng (&lt;30%)</CardTitle>
                            <AlertTriangle className="size-3.5 sm:size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 sm:p-4 sm:pt-0">
                            <div className="text-xl sm:text-2xl font-bold text-amber-500 tabular-nums">{stats.broken_vehicles}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Button
                        size="sm"
                        className="h-7 text-xs px-2 sm:h-8 sm:px-3"
                        variant={currentFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => router.get('/admin/vehicles')}
                    >
                        Tất cả ({stats.total_vehicles})
                    </Button>
                    <Button
                        size="sm"
                        className="h-7 text-xs px-2 sm:h-8 sm:px-3"
                        variant={currentFilter === 'claimed' ? 'default' : 'outline'}
                        onClick={() => router.get('/admin/vehicles?filter=claimed')}
                    >
                        Đã Claim ({stats.claimed_vehicles})
                    </Button>
                    <Button
                        size="sm"
                        className="h-7 text-xs px-2 sm:h-8 sm:px-3"
                        variant={currentFilter === 'unclaimed' ? 'default' : 'outline'}
                        onClick={() => router.get('/admin/vehicles?filter=unclaimed')}
                    >
                        Chưa Claim ({stats.total_vehicles - stats.claimed_vehicles})
                    </Button>
                    <Button
                        size="sm"
                        className="h-7 text-xs px-2 sm:h-8 sm:px-3"
                        variant={currentFilter === 'broken' ? 'default' : 'outline'}
                        onClick={() => router.get('/admin/vehicles?filter=broken')}
                    >
                        Xe hỏng nặng ({stats.broken_vehicles})
                    </Button>
                </div>

                {/* Vehicles Table */}
                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SQL ID</TableHead>
                                    <TableHead>Tên xe / Model</TableHead>
                                    <TableHead>Chủ sở hữu (Owner)</TableHead>
                                    <TableHead>Tọa độ (X, Y)</TableHead>
                                    <TableHead>Động cơ</TableHead>
                                    <TableHead>Xăng</TableHead>
                                    <TableHead>Ắc quy</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vehicles.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            Không có phương tiện nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    vehicles.data.map((v) => (
                                        <TableRow key={v.id}>
                                            <TableCell className="font-mono font-bold text-xs">
                                                #{v.sql_id}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div>
                                                    <span>{v.name}</span>
                                                    <span className="text-xs text-muted-foreground block font-mono">{v.model}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {v.is_claimed && v.owner_username ? (
                                                    <Badge variant="default" className="gap-1 font-mono text-xs">
                                                        <User className="size-3" />
                                                        {v.owner_username}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs text-muted-foreground">
                                                        Vô chủ
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {Math.round(v.x)}, {Math.round(v.y)}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`font-mono text-xs font-bold ${v.engine_condition < 30 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {Math.round(v.engine_condition)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {Math.round(v.fuel_level)}%
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {Math.round(v.battery_charge)}%
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-primary hover:bg-primary/10 gap-1"
                                                        onClick={() => handleRepair(v.id, v.sql_id)}
                                                        title="Sửa chữa 100%"
                                                    >
                                                        <Wrench className="size-3.5" />
                                                        Sửa
                                                    </Button>

                                                    {v.is_claimed && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 text-xs text-amber-500 hover:bg-amber-500/10 gap-1"
                                                            onClick={() => handleUnclaim(v.id, v.sql_id)}
                                                            title="Gỡ quyền sở hữu"
                                                        >
                                                            <Unlock className="size-3.5" />
                                                            Gỡ
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(v.id, v.sql_id)}
                                                        title="Xóa xe"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
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
