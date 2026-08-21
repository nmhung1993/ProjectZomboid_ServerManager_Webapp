import { Head } from '@inertiajs/react';
import {
    Activity,
    Award,
    Clock,
    Coins,
    Crosshair,
    Flame,
    Gift,
    MapPin,
    Package,
    Radio,
    Shield,
    Sparkles,
    Trophy,
    Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

interface WorldEventItem {
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
    expires_at: string | null;
    created_at: string;
}

interface LootedHistoryItem {
    id: number;
    title: string;
    event_type: string;
    looted_by_username: string;
    reward_coins: number;
    looted_at: string | null;
}

interface Props {
    active_events: WorldEventItem[];
    recent_looted: LootedHistoryItem[];
}

export default function PortalEventsPage({ active_events, recent_looted }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.player_portal'), href: '/portal' },
        { title: t('portal.events.title'), href: '/portal/events' },
    ];

    const getEventBadge = (type: string) => {
        switch (type) {
            case 'airdrop':
                return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><Package className="size-3" /> Airdrop Cứu Trợ</Badge>;
            case 'heli_crash':
                return <Badge className="bg-red-600 hover:bg-red-700 gap-1"><Flame className="size-3" /> Trực Thăng Rơi</Badge>;
            default:
                return <Badge className="bg-purple-600 hover:bg-purple-700 gap-1"><Zap className="size-3" /> Quái Vật Đột Kích</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('portal.events.title')} />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Radio className="size-7 text-primary animate-pulse" />
                            {t('portal.events.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('portal.events.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Active Events Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="size-5 text-amber-500" />
                            {t('portal.events.active_list')} ({active_events.length})
                        </h2>
                    </div>

                    {active_events.length === 0 ? (
                        <Card className="py-16 text-center text-muted-foreground">
                            <CardContent>
                                <Package className="size-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Hiện không có sự kiện thế giới nào đang diễn ra.</p>
                                <p className="text-xs mt-1 text-muted-foreground">
                                    Hãy chuẩn bị vũ khí và lương thực, máy bay tiếp tế quân đội sẽ sớm bay qua Knox County!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {active_events.map((ev) => (
                                <Card key={ev.id} className="border-amber-500/40 hover:border-amber-500 transition-all flex flex-col justify-between overflow-hidden relative shadow-md">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            {getEventBadge(ev.event_type)}
                                            <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
                                                <Coins className="size-4" />
                                                +{ev.reward_coins} coins thưởng
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg font-bold pt-2">{ev.title}</CardTitle>
                                        <CardDescription className="text-xs leading-relaxed">
                                            {ev.description}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* Location info */}
                                        <div className="flex items-center gap-2 text-xs rounded-lg bg-muted/60 p-3 border">
                                            <MapPin className="size-4 text-primary shrink-0" />
                                            <div className="flex-1">
                                                <span className="font-semibold block">{ev.location_name || 'Vùng hoang dã'}</span>
                                                <span className="font-mono text-muted-foreground text-[11px]">
                                                    Tọa độ: [X: {Math.round(ev.x)}, Y: {Math.round(ev.y)}] (Bán kính: {ev.radius}m)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Loot preview */}
                                        {ev.loot_items && ev.loot_items.length > 0 && (
                                            <div>
                                                <span className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1">
                                                    <Gift className="size-3.5" /> Vật phẩm trong Thùng Hàng:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ev.loot_items.map((loot, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs font-mono">
                                                            {loot.count || 1}x {loot.item_id}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="size-3.5" /> Hết hạn:
                                            </span>
                                            <span className="font-medium">
                                                {ev.expires_at ? new Date(ev.expires_at).toLocaleTimeString() : 'Không thời hạn'}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Loot History Section */}
                <div className="space-y-4 pt-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Trophy className="size-5 text-amber-500" />
                        {t('portal.events.recent_looted')}
                    </h2>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sự kiện</TableHead>
                                        <TableHead>Loại</TableHead>
                                        <TableHead>Người đoạt thùng</TableHead>
                                        <TableHead>Thưởng</TableHead>
                                        <TableHead>Thời gian</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recent_looted.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                Chưa có lịch sử đoạt thùng hàng nào gần đây.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recent_looted.map((h) => (
                                            <TableRow key={h.id}>
                                                <TableCell className="font-semibold text-xs">{h.title}</TableCell>
                                                <TableCell>{getEventBadge(h.event_type)}</TableCell>
                                                <TableCell className="font-bold text-primary text-xs">{h.looted_by_username}</TableCell>
                                                <TableCell className="font-bold text-amber-500 text-xs">+{h.reward_coins} coins</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {h.looted_at ? new Date(h.looted_at).toLocaleString() : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
