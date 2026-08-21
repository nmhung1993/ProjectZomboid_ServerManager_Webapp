import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Coins,
    Gavel,
    History,
    Inbox,
    Package,
    Scale,
    Shield,
    ShoppingBag,
    ShoppingCart,
    Trash2,
    TrendingUp,
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

interface ListingItem {
    id: number;
    seller: { id: number; username: string } | null;
    highest_bidder: { id: number; username: string } | null;
    item_id: string;
    item_name: string;
    category: string;
    quantity: number;
    listing_type: string;
    price: number;
    current_bid: number;
    status: string;
    created_at: string;
}

interface DeliveryItem {
    id: number;
    user: { id: number; username: string } | null;
    username: string;
    item_id: string;
    item_name: string | null;
    quantity: number;
    status: string;
    created_at: string;
}

interface Props {
    listings: {
        data: ListingItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    deliveries: {
        data: DeliveryItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total_listings: number;
        active_listings: number;
        sold_listings: number;
        total_volume: number;
        pending_deliveries: number;
    };
}

export default function AdminMarketPage({ listings, deliveries, stats }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: 'Quản lý Chợ P2P & Đấu giá', href: '/admin/market' },
    ];

    const [activeTab, setActiveTab] = useState<'listings' | 'deliveries'>('listings');

    const handleCancelListing = (listingId: number) => {
        if (confirm('Admin hủy bài đăng này và hoàn tiền cho người đặt giá (nếu có)?')) {
            router.post(`/admin/market/${listingId}/cancel`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý Chợ P2P" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Scale className="size-7 text-primary" />
                            Quản lý Chợ Giao dịch P2P & Nhà Đấu giá
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Giám sát bài niêm yết của người chơi, tiến trình các phiên đấu giá và hàng đợi giao nhận vật phẩm.
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Đang Niêm Yết</CardTitle>
                            <ShoppingCart className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.active_listings} / {stats.total_listings}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Đã Giao Dịch Thành Công</CardTitle>
                            <ShoppingBag className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{stats.sold_listings}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Tổng Khối Lượng Tiền Tệ</CardTitle>
                            <Coins className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">{stats.total_volume.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Gói hàng Đang chờ Giao</CardTitle>
                            <Inbox className="size-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-500">{stats.pending_deliveries}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="space-y-4">
                    <div className="flex gap-2 border-b pb-2">
                        <Button
                            variant={activeTab === 'listings' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('listings')}
                            className="gap-1.5"
                        >
                            <Scale className="size-4" />
                            Danh sách Niêm yết ({listings.total})
                        </Button>
                        <Button
                            variant={activeTab === 'deliveries' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('deliveries')}
                            className="gap-1.5"
                        >
                            <Inbox className="size-4 text-emerald-500" />
                            Hàng đợi Giao vật phẩm ({deliveries.total})
                        </Button>
                    </div>

                    {/* Listings Table */}
                    {activeTab === 'listings' && (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Vật phẩm</TableHead>
                                            <TableHead>Người bán</TableHead>
                                            <TableHead>Hình thức</TableHead>
                                            <TableHead>Giá bán / Thầu</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead className="text-right">Hành động</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {listings.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                    Chưa có bài đăng bán nào.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            listings.data.map((l) => (
                                                <TableRow key={l.id}>
                                                    <TableCell className="font-semibold">
                                                        <div>
                                                            <span>{l.quantity}x {l.item_name}</span>
                                                            <span className="text-xs text-muted-foreground block font-mono">{l.item_id}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        {l.seller?.username || 'Unknown'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={l.listing_type === 'auction' ? 'secondary' : 'default'} className="text-xs">
                                                            {l.listing_type === 'auction' ? 'Đấu giá' : 'Bán trực tiếp'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono font-bold text-amber-500 text-xs">
                                                        {l.listing_type === 'auction' ? l.current_bid?.toLocaleString() : l.price?.toLocaleString()} coins
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={l.status === 'active' ? 'default' : l.status === 'sold' ? 'outline' : 'destructive'}
                                                            className="text-xs"
                                                        >
                                                            {l.status === 'active' ? 'Đang mở' : l.status === 'sold' ? 'Đã bán' : 'Đã hủy'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {l.status === 'active' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                                                onClick={() => handleCancelListing(l.id)}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                                Hủy niêm yết
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
                    )}

                    {/* Deliveries Table */}
                    {activeTab === 'deliveries' && (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Người nhận (Player)</TableHead>
                                            <TableHead>Vật phẩm</TableHead>
                                            <TableHead>Mã Item</TableHead>
                                            <TableHead>Số lượng</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deliveries.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                    Không có gói hàng nào trong hàng đợi.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            deliveries.data.map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-semibold text-xs">{d.username}</TableCell>
                                                    <TableCell className="text-xs">{d.item_name || d.item_id}</TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{d.item_id}</TableCell>
                                                    <TableCell className="font-mono font-bold text-xs">{d.quantity}x</TableCell>
                                                    <TableCell>
                                                        <Badge variant={d.status === 'delivered' ? 'default' : 'secondary'} className="text-xs">
                                                            {d.status === 'delivered' ? 'Đã nhận' : 'Đang chờ vào game'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
