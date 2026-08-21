import { Head, router } from '@inertiajs/react';
import {
    Award,
    CheckCircle2,
    Coins,
    Crosshair,
    Plus,
    Skull,
    Sparkles,
    Target,
    Trash2,
    UserX,
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface QuestData {
    id: number;
    title: string;
    description: string | null;
    type: string;
    category: string;
    target_count: number;
    reward_coins: number;
    is_active: boolean;
    player_quests_count: number;
    created_at: string;
}

interface BountyData {
    id: number;
    target_username: string;
    creator: { id: number; username: string } | null;
    reward_amount: number;
    reason: string | null;
    status: string;
    hunter_username: string | null;
    created_at: string;
}

interface Props {
    quests: QuestData[];
    bounties: {
        data: BountyData[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: {
        total_quests: number;
        active_quests: number;
        total_completions: number;
        active_bounties: number;
        total_bounty_pool: number;
    };
}

export default function AdminQuestsPage({ quests, bounties, stats }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: 'Quản lý Nhiệm vụ & Truy nã', href: '/admin/quests' },
    ];

    const [openCreateQuest, setOpenCreateQuest] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('daily');
    const [category, setCategory] = useState('zombie_kills');
    const [targetCount, setTargetCount] = useState('50');
    const [rewardCoins, setRewardCoins] = useState('100');
    const [submitting, setSubmitting] = useState(false);

    const handleCreateQuest = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post('/admin/quests', {
            title,
            description,
            type,
            category,
            target_count: Number(targetCount),
            reward_coins: Number(rewardCoins),
            is_active: true,
        }, {
            onFinish: () => {
                setSubmitting(false);
                setOpenCreateQuest(false);
                setTitle('');
                setDescription('');
            },
        });
    };

    const handleDeleteQuest = (questId: number) => {
        if (confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) {
            router.delete(`/admin/quests/${questId}`);
        }
    };

    const handleCancelBounty = (bountyId: number) => {
        if (confirm('Hủy bỏ lệnh truy nã này và hoàn tiền cho người đặt?')) {
            router.post(`/admin/quests/bounties/${bountyId}/cancel`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý Nhiệm vụ & Truy nã" />

            <div className="space-y-4 p-3 sm:space-y-6 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Target className="size-5 sm:size-7 text-primary" />
                            Quản lý Nhiệm vụ & Truy nã (Quests)
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            Cấu hình nhiệm vụ sinh tồn hàng ngày, phần thưởng ví và giám sát bảng truy nã người chơi.
                        </p>
                    </div>

                    <Button onClick={() => setOpenCreateQuest(true)} size="sm" className="h-8 text-xs px-2.5 gap-1.5 w-fit">
                        <Plus className="size-3.5" />
                        Tạo Nhiệm vụ mới
                    </Button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-4 divide-x divide-border/60 rounded-xl border border-border/60 bg-card p-2 sm:p-3.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Award className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Nhiệm vụ mở</p>
                            <p className="text-xs sm:text-lg font-bold tabular-nums text-foreground">{stats.active_quests} / {stats.total_quests}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Hoàn thành</p>
                            <p className="text-xs sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.total_completions}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                            <Crosshair className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Lệnh Truy nã</p>
                            <p className="text-xs sm:text-lg font-bold text-red-500 tabular-nums">{stats.active_bounties}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 px-0.5 sm:px-2 text-center sm:text-left min-w-0">
                        <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <Coins className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Quỹ Tiền thưởng</p>
                            <p className="text-xs sm:text-lg font-bold text-amber-500 tabular-nums">{stats.total_bounty_pool.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Quests Table */}
                <Card className="shadow-sm">
                    <CardHeader className="p-3.5 pb-2 sm:p-4 sm:pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Award className="size-4 text-primary" />
                            Danh sách Nhiệm vụ ({quests.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên nhiệm vụ</TableHead>
                                    <TableHead>Phân loại</TableHead>
                                    <TableHead>Mục tiêu</TableHead>
                                    <TableHead>Phần thưởng</TableHead>
                                    <TableHead>Người tham gia</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Chưa có nhiệm vụ nào. Nhấn "Tạo Nhiệm vụ mới" ở trên để bắt đầu.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    quests.map((q) => (
                                        <TableRow key={q.id}>
                                            <TableCell className="font-semibold">
                                                <div>
                                                    <span className="font-bold">{q.title}</span>
                                                    {q.description && (
                                                        <span className="text-xs text-muted-foreground block truncate max-w-xs">{q.description}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={q.type === 'daily' ? 'default' : q.type === 'weekly' ? 'secondary' : 'outline'}>
                                                    {q.type === 'daily' ? 'Hàng ngày' : q.type === 'weekly' ? 'Hàng tuần' : 'Thành tựu'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {q.category === 'zombie_kills' && `Diệt ${q.target_count} Zombie`}
                                                {q.category === 'survival_hours' && `Sinh tồn ${q.target_count} giờ`}
                                                {q.category === 'pvp_kills' && `Hạ ${q.target_count} Người chơi`}
                                                {q.category === 'custom' && `Chỉ tiêu: ${q.target_count}`}
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-amber-500">
                                                +{q.reward_coins.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {q.player_quests_count} người
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteQuest(q.id)}
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

                {/* Bounties Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Crosshair className="size-5 text-red-500" />
                            Danh sách Lệnh Truy nã ({bounties.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mục tiêu</TableHead>
                                    <TableHead>Người phát lệnh</TableHead>
                                    <TableHead>Tiền thưởng</TableHead>
                                    <TableHead>Lý do</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bounties.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Không có lệnh truy nã nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bounties.data.map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell className="font-bold text-red-500 flex items-center gap-2">
                                                <UserX className="size-4 text-red-500" />
                                                {b.target_username}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {b.creator?.username || 'Server / Admin'}
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-amber-500">
                                                {b.reward_amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                                {b.reason || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={b.status === 'active' ? 'destructive' : b.status === 'claimed' ? 'default' : 'outline'}
                                                >
                                                    {b.status === 'active' ? 'Đang truy nã' : b.status === 'claimed' ? `Đã hạ bởi ${b.hunter_username}` : 'Đã hủy'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {b.status === 'active' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-destructive hover:bg-destructive/10 text-xs"
                                                        onClick={() => handleCancelBounty(b.id)}
                                                    >
                                                        Hủy & Hoàn tiền
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

            {/* Create Quest Dialog */}
            <Dialog open={openCreateQuest} onOpenChange={setOpenCreateQuest}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo Nhiệm vụ mới</DialogTitle>
                        <DialogDescription>
                            Thiết lập mục tiêu và phần thưởng cho người chơi hoàn thành.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateQuest} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="q_title">Tên nhiệm vụ</Label>
                            <Input
                                id="q_title"
                                placeholder="Ví dụ: Tiêu diệt 100 Zombie tại Muldraugh"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="q_type">Chu kỳ</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger id="q_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Hàng ngày (Daily)</SelectItem>
                                        <SelectItem value="weekly">Hàng tuần (Weekly)</SelectItem>
                                        <SelectItem value="achievement">Thành tựu (Achievement)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="q_cat">Loại chỉ tiêu</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="q_cat">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="zombie_kills">Diệt Zombie</SelectItem>
                                        <SelectItem value="survival_hours">Giờ sinh tồn</SelectItem>
                                        <SelectItem value="pvp_kills">Hạ gục Người chơi</SelectItem>
                                        <SelectItem value="custom">Tùy biến</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="q_target">Số lượng mục tiêu</Label>
                                <Input
                                    id="q_target"
                                    type="number"
                                    min={1}
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="q_reward">Tiền thưởng (Coins)</Label>
                                <Input
                                    id="q_reward"
                                    type="number"
                                    min={0}
                                    value={rewardCoins}
                                    onChange={(e) => setRewardCoins(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="q_desc">Mô tả chi tiết</Label>
                            <Textarea
                                id="q_desc"
                                placeholder="Ghi chú hướng dẫn cho người chơi..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenCreateQuest(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Đang tạo...' : 'Tạo Nhiệm vụ'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
