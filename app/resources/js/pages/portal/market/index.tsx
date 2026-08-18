import { Head, router } from '@inertiajs/react';
import {
    Clock,
    Coins,
    Crosshair,
    Gavel,
    History,
    Inbox,
    Package,
    Plus,
    Scale,
    Shield,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Tag,
    Trash2,
    TrendingUp,
    User as UserIcon,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

interface MarketListingItem {
    id: number;
    seller_id: number;
    seller_name: string;
    is_mine: boolean;
    item_id: string;
    item_name: string;
    category: string;
    quantity: number;
    listing_type: string;
    price: number;
    starting_bid: number;
    current_bid: number;
    highest_bidder_id: number | null;
    is_highest_bidder: boolean;
    buyout_price: number | null;
    bid_count: number;
    expires_at: string | null;
    created_at: string;
}

interface DeliveryItem {
    id: number;
    item_id: string;
    item_name: string | null;
    quantity: number;
    status: string;
    delivered_at: string | null;
    created_at: string;
}

interface Props {
    listings: MarketListingItem[];
    deliveries: DeliveryItem[];
    wallet_balance: number;
}

export default function MarketplaceIndexPage({ listings, deliveries, wallet_balance }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.player_portal'), href: '/portal' },
        { title: t('portal.market.title'), href: '/portal/market' },
    ];

    const [activeTab, setActiveTab] = useState<'all' | 'auctions' | 'mine' | 'deliveries'>('all');

    // Create listing dialog
    const [openCreate, setOpenCreate] = useState(false);
    const [listingType, setListingType] = useState('fixed_price');
    const [itemId, setItemId] = useState('Base.Axe');
    const [itemName, setItemName] = useState('Rìu Cứu Hỏa (Fire Axe)');
    const [category, setCategory] = useState('weapons');
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState('200');
    const [startingBid, setStartingBid] = useState('100');
    const [buyoutPrice, setBuyoutPrice] = useState('500');
    const [durationHours, setDurationHours] = useState('24');
    const [submitting, setSubmitting] = useState(false);

    // Bid dialog
    const [bidListing, setBidListing] = useState<MarketListingItem | null>(null);
    const [bidAmount, setBidAmount] = useState('');

    const handleCreateListing = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post('/portal/market', {
            listing_type: listingType,
            item_id: itemId,
            item_name: itemName,
            category,
            quantity: Number(quantity),
            price: listingType === 'fixed_price' ? Number(price) : null,
            starting_bid: listingType === 'auction' ? Number(startingBid) : null,
            buyout_price: listingType === 'auction' && buyoutPrice ? Number(buyoutPrice) : null,
            duration_hours: Number(durationHours),
        }, {
            onFinish: () => {
                setSubmitting(false);
                setOpenCreate(false);
            },
        });
    };

    const handleBuyFixed = (listing: MarketListingItem) => {
        if (confirm(`Mua ${listing.quantity}x ${listing.item_name} với giá ${listing.price} coins?`)) {
            router.post(`/portal/market/${listing.id}/buy`);
        }
    };

    const handlePlaceBid = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bidListing) return;
        setSubmitting(true);
        router.post(`/portal/market/${bidListing.id}/bid`, {
            amount: Number(bidAmount),
        }, {
            onFinish: () => {
                setSubmitting(false);
                setBidListing(null);
                setBidAmount('');
            },
        });
    };

    const handleCancelListing = (listingId: number) => {
        if (confirm('Bạn có chắc muốn hủy đăng bán vật phẩm này?')) {
            router.post(`/portal/market/${listingId}/cancel`);
        }
    };

    const fixedListings = listings.filter((l) => l.listing_type === 'fixed_price');
    const auctionListings = listings.filter((l) => l.listing_type === 'auction');
    const myListings = listings.filter((l) => l.is_mine);
    const pendingDeliveries = deliveries.filter((d) => d.status === 'pending');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('portal.market.title')} />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Scale className="size-7 text-primary" />
                            {t('portal.market.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('portal.market.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 shadow-sm">
                            <Coins className="size-5 text-amber-500" />
                            <div>
                                <span className="text-xs text-muted-foreground block">Số dư Ví</span>
                                <span className="font-bold text-amber-500">{wallet_balance.toLocaleString()}</span>
                            </div>
                        </div>

                        <Button onClick={() => setOpenCreate(true)} className="gap-2">
                            <Plus className="size-4" />
                            {t('portal.market.create_listing')}
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="space-y-4">
                    <div className="flex gap-2 border-b pb-2">
                        <Button
                            variant={activeTab === 'all' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('all')}
                            className="gap-1.5"
                        >
                            <ShoppingCart className="size-4" />
                            {t('portal.market.tab_all')} ({fixedListings.length})
                        </Button>
                        <Button
                            variant={activeTab === 'auctions' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('auctions')}
                            className="gap-1.5"
                        >
                            <Gavel className="size-4 text-amber-500" />
                            {t('portal.market.tab_auctions')} ({auctionListings.length})
                        </Button>
                        <Button
                            variant={activeTab === 'mine' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('mine')}
                            className="gap-1.5"
                        >
                            <Tag className="size-4" />
                            {t('portal.market.tab_my_listings')} ({myListings.length})
                        </Button>
                        <Button
                            variant={activeTab === 'deliveries' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('deliveries')}
                            className="gap-1.5"
                        >
                            <Inbox className="size-4 text-emerald-500" />
                            {t('portal.market.tab_deliveries')} ({pendingDeliveries.length})
                        </Button>
                    </div>

                    {/* Tab: Fixed Price Market */}
                    {activeTab === 'all' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {fixedListings.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-muted-foreground">
                                    Chợ hiện chưa có vật phẩm nào được đăng bán trực tiếp.
                                </div>
                            ) : (
                                fixedListings.map((l) => (
                                    <Card key={l.id} className="hover:border-primary/50 transition-all flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {l.category}
                                                </Badge>
                                                <div className="flex items-center gap-1 font-bold text-amber-500">
                                                    <Coins className="size-4" />
                                                    {l.price.toLocaleString()} coins
                                                </div>
                                            </div>
                                            <CardTitle className="text-base font-bold pt-2 flex items-center gap-2">
                                                <Package className="size-4 text-primary" />
                                                {l.quantity}x {l.item_name}
                                            </CardTitle>
                                            <CardDescription className="text-xs font-mono">
                                                Người bán: <strong>{l.seller_name}</strong>
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-xs text-muted-foreground">
                                                    Mã: <code className="font-mono">{l.item_id}</code>
                                                </span>

                                                {l.is_mine ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs text-destructive hover:bg-destructive/10 gap-1"
                                                        onClick={() => handleCancelListing(l.id)}
                                                    >
                                                        <Trash2 className="size-3" />
                                                        Hủy bán
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleBuyFixed(l)}
                                                        disabled={wallet_balance < l.price}
                                                        className="gap-1.5 font-bold"
                                                    >
                                                        <ShoppingCart className="size-4" />
                                                        Mua ngay
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab: Auction House */}
                    {activeTab === 'auctions' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {auctionListings.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-muted-foreground">
                                    Không có phiên đấu giá nào đang diễn ra.
                                </div>
                            ) : (
                                auctionListings.map((l) => (
                                    <Card key={l.id} className="border-amber-500/30 hover:border-amber-500/60 transition-all flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="secondary" className="gap-1 text-amber-500 font-bold">
                                                    <Gavel className="size-3" />
                                                    ĐẤU GIÁ ({l.bid_count} lượt)
                                                </Badge>
                                                {l.is_highest_bidder && (
                                                    <Badge variant="default" className="bg-emerald-600 text-xs">
                                                        Bạn đang dẫn đầu
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-base font-bold pt-2 flex items-center gap-2">
                                                <Package className="size-4 text-amber-500" />
                                                {l.quantity}x {l.item_name}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Người bán: <strong>{l.seller_name}</strong>
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs border">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Giá thầu cao nhất:</span>
                                                    <span className="font-bold text-amber-500 text-sm">
                                                        {l.current_bid.toLocaleString()} coins
                                                    </span>
                                                </div>
                                                {l.buyout_price && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Mua đứt ngay:</span>
                                                        <span className="font-bold text-emerald-600">
                                                            {l.buyout_price.toLocaleString()} coins
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-1 text-[11px] text-muted-foreground">
                                                    <span>Kết thúc:</span>
                                                    <span>{l.expires_at ? new Date(l.expires_at).toLocaleString() : 'Không thời hạn'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                {l.is_mine ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full text-xs text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleCancelListing(l.id)}
                                                    >
                                                        Hủy đấu giá
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="w-full gap-1.5 bg-amber-600 hover:bg-amber-700 font-bold"
                                                        onClick={() => {
                                                            setBidListing(l);
                                                            setBidAmount(String(l.current_bid + 10));
                                                        }}
                                                    >
                                                        <Gavel className="size-4" />
                                                        Đặt giá thầu
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab: My Listings */}
                    {activeTab === 'mine' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {myListings.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-muted-foreground">
                                    Bạn chưa đăng bán vật phẩm nào. Nhấn "Đăng bán vật phẩm" ở trên để bắt đầu.
                                </div>
                            ) : (
                                myListings.map((l) => (
                                    <Card key={l.id} className="flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant={l.listing_type === 'auction' ? 'secondary' : 'default'}>
                                                    {l.listing_type === 'auction' ? 'Đấu giá' : 'Bán trực tiếp'}
                                                </Badge>
                                                <span className="font-bold text-amber-500">
                                                    {l.listing_type === 'auction' ? l.current_bid.toLocaleString() : l.price.toLocaleString()} coins
                                                </span>
                                            </div>
                                            <CardTitle className="text-base font-bold pt-2">{l.quantity}x {l.item_name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full text-xs text-destructive hover:bg-destructive/10 gap-1"
                                                onClick={() => handleCancelListing(l.id)}
                                            >
                                                <Trash2 className="size-3.5" />
                                                Hủy niêm yết
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab: Deliveries / Mailbox */}
                    {activeTab === 'deliveries' && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Inbox className="size-5 text-emerald-500" />
                                    Hộp thư Giao nhận Vật phẩm ({deliveries.length})
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Các vật phẩm đã mua hoặc thắng đấu giá sẽ tự động được gửi vào túi đồ của bạn khi online trong server.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Vật phẩm</TableHead>
                                            <TableHead>Số lượng</TableHead>
                                            <TableHead>Mã Item</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead>Thời gian</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deliveries.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                    Hộp thư trống. Bạn chưa có gói hàng nào.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            deliveries.map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-semibold">{d.item_name || d.item_id}</TableCell>
                                                    <TableCell className="font-mono font-bold">{d.quantity}x</TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{d.item_id}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={d.status === 'delivered' ? 'default' : 'secondary'} className="text-xs">
                                                            {d.status === 'delivered' ? 'Đã nhận trong game' : 'Đang chờ vào game'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {new Date(d.created_at).toLocaleString()}
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

            {/* Create Listing Dialog */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Scale className="size-5 text-primary" />
                            Đăng bán Vật phẩm lên Chợ P2P
                        </DialogTitle>
                        <DialogDescription>
                            Niêm yết bán hoặc mở phiên đấu giá cho người chơi khác trong server.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateListing} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="l_type">Hình thức bán</Label>
                            <Select value={listingType} onValueChange={setListingType}>
                                <SelectTrigger id="l_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed_price">Bán trực tiếp (Fixed Price)</SelectItem>
                                    <SelectItem value="auction">Đấu giá (Auction House)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="l_name">Tên hiển thị</Label>
                                <Input
                                    id="l_name"
                                    placeholder="Rìu Cứu Hỏa"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="l_cat">Danh mục</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="l_cat">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weapons">Vũ khí</SelectItem>
                                        <SelectItem value="medical">Y tế</SelectItem>
                                        <SelectItem value="food">Thực phẩm</SelectItem>
                                        <SelectItem value="ammo">Đạn dược</SelectItem>
                                        <SelectItem value="vehicles">Phụ tùng Xe</SelectItem>
                                        <SelectItem value="tools">Công cụ</SelectItem>
                                        <SelectItem value="misc">Khác</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="l_id">Mã Item (PZ ID)</Label>
                                <Input
                                    id="l_id"
                                    placeholder="Base.Axe"
                                    value={itemId}
                                    onChange={(e) => setItemId(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="l_qty">Số lượng</Label>
                                <Input
                                    id="l_qty"
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {listingType === 'fixed_price' ? (
                            <div className="space-y-2">
                                <Label htmlFor="l_price">Giá bán (Coins)</Label>
                                <Input
                                    id="l_price"
                                    type="number"
                                    min={1}
                                    placeholder="200"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="l_start">Giá khởi điểm</Label>
                                    <Input
                                        id="l_start"
                                        type="number"
                                        min={1}
                                        value={startingBid}
                                        onChange={(e) => setStartingBid(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="l_buyout">Mua đứt ngay (Tùy chọn)</Label>
                                    <Input
                                        id="l_buyout"
                                        type="number"
                                        min={1}
                                        placeholder="500"
                                        value={buyoutPrice}
                                        onChange={(e) => setBuyoutPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="l_dur">Thời hạn niêm yết</Label>
                            <Select value={durationHours} onValueChange={setDurationHours}>
                                <SelectTrigger id="l_dur">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6">6 Giờ</SelectItem>
                                    <SelectItem value="12">12 Giờ</SelectItem>
                                    <SelectItem value="24">24 Giờ (1 Ngày)</SelectItem>
                                    <SelectItem value="48">48 Giờ (2 Ngày)</SelectItem>
                                    <SelectItem value="72">72 Giờ (3 Ngày)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Đang đăng...' : 'Đăng bán'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Place Bid Dialog */}
            <Dialog open={bidListing !== null} onOpenChange={(o) => !o && setBidListing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-500">
                            <Gavel className="size-5" />
                            Đặt Giá Thầu Đấu Giá
                        </DialogTitle>
                        <DialogDescription>
                            Đấu giá cho vật phẩm <strong>{bidListing?.item_name}</strong>. Tiền sẽ được giữ và tự động hoàn trả nếu bạn bị vượt giá.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePlaceBid} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="b_amt">
                                Giá thầu của bạn (Tối thiểu: <strong className="text-amber-500">{(bidListing ? (bidListing.bid_count > 0 ? bidListing.current_bid + 5 : bidListing.starting_bid) : 0).toLocaleString()} coins</strong>)
                            </Label>
                            <Input
                                id="b_amt"
                                type="number"
                                min={bidListing ? (bidListing.bid_count > 0 ? bidListing.current_bid + 5 : bidListing.starting_bid) : 1}
                                max={wallet_balance}
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setBidListing(null)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700">
                                {submitting ? 'Đang đặt thầu...' : 'Xác nhận Đặt thầu'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
