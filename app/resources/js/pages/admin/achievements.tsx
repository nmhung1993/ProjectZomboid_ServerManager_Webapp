import { Head, router, useForm } from '@inertiajs/react';
import {
    Award,
    Coins,
    Crosshair,
    Flame,
    Globe,
    Plus,
    Swords,
    Trash2,
    Trophy,
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
    DialogTrigger,
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

interface AchievementItem {
    id: number;
    slug: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    metric_type: string;
    target_value: number;
    reward_coins: number;
    reward_title: string | null;
    total_unlocked: number;
}

interface Props {
    achievements: AchievementItem[];
    stats: {
        total_achievements: number;
        total_unlocked_count: number;
        total_rewards_claimed: number;
    };
}

export default function AdminAchievementsPage({ achievements, stats }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.achievements'), href: '/admin/achievements' },
    ];

    const [createOpen, setCreateOpen] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        title: '',
        description: '',
        category: 'combat',
        metric_type: 'zombie_kills',
        target_value: 100,
        reward_coins: 100,
        reward_title: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/achievements', {
            onSuccess: () => {
                reset();
                setCreateOpen(false);
            },
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Bạn có chắc muốn xóa thành tích này?')) {
            router.delete(`/admin/achievements/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý Thành tích & Danh hiệu" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Trophy className="size-7 text-primary" />
                            Quản lý Thành tích & Danh hiệu Máy chủ
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Cấu hình các danh hiệu và cột mốc phần thưởng cho người chơi hoàn thành thử thách.
                        </p>
                    </div>

                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-1.5 font-bold">
                                <Plus className="size-4" />
                                Tạo Thành Tích Mới
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Thêm Thành Tích Mới</DialogTitle>
                                    <DialogDescription>
                                        Người chơi sẽ tự động nhận phần thưởng Coins và Danh hiệu khi đạt mốc.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Tên Thành Tích</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Ví dụ: Huyền Thoại Muldraugh"
                                            required
                                        />
                                        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Mô Tả Điều Kiện</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Ví dụ: Tiêu diệt 2,500 zombie trên toàn bản đồ..."
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Danh Mục</Label>
                                            <Select
                                                value={data.category}
                                                onValueChange={(val) => setData('category', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="combat">Diệt Zombie</SelectItem>
                                                    <SelectItem value="pvp">PvP Sinh Tử</SelectItem>
                                                    <SelectItem value="survival">Sinh Tồn</SelectItem>
                                                    <SelectItem value="economy">Kinh Tế</SelectItem>
                                                    <SelectItem value="exploration">Thám Hiểm</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Chỉ Số Kiểm Tra</Label>
                                            <Select
                                                value={data.metric_type}
                                                onValueChange={(val) => setData('metric_type', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="zombie_kills">Xác Zombie Giết</SelectItem>
                                                    <SelectItem value="pvp_kills">Người chơi Hạ gục</SelectItem>
                                                    <SelectItem value="survived_hours">Giờ Sống Sót</SelectItem>
                                                    <SelectItem value="total_coins">Tổng Coins Kiếm</SelectItem>
                                                    <SelectItem value="completed_quests">Nhiệm Vụ Đã Làm</SelectItem>
                                                    <SelectItem value="claimed_vehicles">Xe Đã Claim</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="target_value">Mốc Cần Đạt</Label>
                                            <Input
                                                id="target_value"
                                                type="number"
                                                min="1"
                                                value={data.target_value}
                                                onChange={(e) => setData('target_value', parseInt(e.target.value) || 1)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="reward_coins">Coins Thưởng</Label>
                                            <Input
                                                id="reward_coins"
                                                type="number"
                                                min="0"
                                                value={data.reward_coins}
                                                onChange={(e) => setData('reward_coins', parseFloat(e.target.value) || 0)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reward_title">Danh Hiệu Mở Khóa (Tùy chọn)</Label>
                                        <Input
                                            id="reward_title"
                                            value={data.reward_title}
                                            onChange={(e) => setData('reward_title', e.target.value)}
                                            placeholder="Ví dụ: [Sát Thủ Zombie]"
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                        Hủy
                                    </Button>
                                    <Button type="submit" disabled={processing} className="font-bold">
                                        Tạo Thành Tích
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Tổng Thành Tích</CardTitle>
                            <Trophy className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_achievements}</div>
                            <p className="text-xs text-muted-foreground mt-1">Các thử thách đang mở cho người chơi</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Lượt Đã Mở Khóa</CardTitle>
                            <Award className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{stats.total_unlocked_count}</div>
                            <p className="text-xs text-muted-foreground mt-1">Lần hoàn thành từ tất cả người chơi</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Phần Thưởng Đã Trao</CardTitle>
                            <Coins className="size-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.total_rewards_claimed}</div>
                            <p className="text-xs text-muted-foreground mt-1">Lượt nhận thưởng thành công</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Danh Sách Thành Tích Máy Chủ</CardTitle>
                        <CardDescription className="text-xs">
                            Quản lý tất cả danh hiệu và phần thưởng thử thách.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên Thành Tích</TableHead>
                                    <TableHead>Danh Mục</TableHead>
                                    <TableHead>Mốc Yêu Cầu</TableHead>
                                    <TableHead>Phần Thưởng</TableHead>
                                    <TableHead>Danh Hiệu</TableHead>
                                    <TableHead>Đã Mở</TableHead>
                                    <TableHead className="text-right">Thao Tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {achievements.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell>
                                            <div className="font-semibold">{a.title}</div>
                                            <div className="text-xs text-muted-foreground">{a.description}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {a.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {a.metric_type}: <strong>{a.target_value.toLocaleString()}</strong>
                                        </TableCell>
                                        <TableCell className="font-bold text-yellow-600 text-xs">
                                            +{a.reward_coins} Coins
                                        </TableCell>
                                        <TableCell>
                                            {a.reward_title ? (
                                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                                                    {a.reward_title}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Không có</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-bold text-emerald-600 text-xs">
                                            {a.total_unlocked} người
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(a.id)}
                                                className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
