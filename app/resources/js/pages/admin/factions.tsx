import { Head, Link, router } from '@inertiajs/react';
import {
    Coins,
    Crown,
    Edit2,
    Flag,
    MapPin,
    RefreshCw,
    Shield,
    Trash2,
    Users,
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

interface FactionItem {
    id: number;
    name: string;
    tag: string;
    description: string | null;
    color: string;
    leader: { id: number; username: string } | null;
    members_count: number;
    max_members: number;
    bank_balance: number;
    territories: Array<{ id: number; name: string }>;
    created_at: string;
}

interface Props {
    factions: {
        data: FactionItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total_factions: number;
        total_territories: number;
        total_bank: number;
    };
}

export default function AdminFactionsPage({ factions, stats }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: 'Quản lý Bang hội', href: '/admin/factions' },
    ];

    const [syncing, setSyncing] = useState(false);
    const [selectedFaction, setSelectedFaction] = useState<FactionItem | null>(null);
    const [newBalance, setNewBalance] = useState('');

    const handleSync = () => {
        setSyncing(true);
        router.post('/admin/factions/sync', {}, {
            onFinish: () => setSyncing(false),
        });
    };

    const openEditBank = (f: FactionItem) => {
        setSelectedFaction(f);
        setNewBalance(String(f.bank_balance));
    };

    const handleUpdateBank = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFaction) return;

        router.patch(`/admin/factions/${selectedFaction.id}/bank`, {
            bank_balance: Number(newBalance),
        }, {
            onFinish: () => setSelectedFaction(null),
        });
    };

    const handleDelete = (f: FactionItem) => {
        if (confirm(`Bạn có chắc muốn xóa/giải tán vĩnh viễn bang [${f.tag}] ${f.name}?`)) {
            router.delete(`/admin/factions/${f.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý Bang hội (Factions)" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Flag className="size-7 text-primary" />
                            Quản lý Bang hội (Factions)
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Quản lý toàn bộ danh sách liên minh bang hội và căn cứ lãnh địa trong server.
                        </p>
                    </div>

                    <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
                        <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
                        Đồng bộ Game Server
                    </Button>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Tổng số Bang hội</CardTitle>
                            <Flag className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_factions}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Tổng số Căn cứ Lãnh địa</CardTitle>
                            <MapPin className="size-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_territories}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Tổng quỹ Bang hội</CardTitle>
                            <Coins className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">{stats.total_bank.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Factions Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bang hội</TableHead>
                                    <TableHead>Chủ bang</TableHead>
                                    <TableHead>Thành viên</TableHead>
                                    <TableHead>Quỹ bang</TableHead>
                                    <TableHead>Căn cứ</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {factions.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Chưa có bang hội nào được tạo.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    factions.data.map((f) => (
                                        <TableRow key={f.id}>
                                            <TableCell className="font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="size-3 rounded-full"
                                                        style={{ backgroundColor: f.color }}
                                                    />
                                                    <span>[{f.tag}] {f.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Crown className="size-3.5 text-amber-500" />
                                                    <span>{f.leader?.username || '—'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {f.members_count}/{f.max_members}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono font-semibold text-amber-500">
                                                {f.bank_balance.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {f.territories.length} Căn cứ
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(f.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8"
                                                    onClick={() => openEditBank(f)}
                                                    title="Chỉnh sửa Quỹ bang"
                                                >
                                                    <Coins className="size-3.5 text-amber-500" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-destructive"
                                                    onClick={() => handleDelete(f)}
                                                    title="Xóa bang"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Bank Dialog */}
            <Dialog open={!!selectedFaction} onOpenChange={(open) => !open && setSelectedFaction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Điều chỉnh Quỹ Bang</DialogTitle>
                        <DialogDescription>
                            Chỉnh sửa số dư quỹ bang cho: <strong>[{selectedFaction?.tag}] {selectedFaction?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateBank} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit_bank">Số dư mới</Label>
                            <Input
                                id="edit_bank"
                                type="number"
                                min={0}
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSelectedFaction(null)}>
                                Hủy
                            </Button>
                            <Button type="submit">
                                Lưu thay đổi
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
