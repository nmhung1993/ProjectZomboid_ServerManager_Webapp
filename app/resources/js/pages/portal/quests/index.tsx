import { Head, Link, router } from '@inertiajs/react';
import {
    Award,
    CheckCircle2,
    Clock,
    Coins,
    Crosshair,
    Flame,
    History,
    Plus,
    Shield,
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

interface QuestItem {
    id: number;
    quest_id: number;
    title: string;
    description: string | null;
    type: string;
    category: string;
    target_count: number;
    current_progress: number;
    progress_percent: number;
    reward_coins: number;
    reward_items: Array<{ item_id: string; count: number }> | null;
    is_completed: boolean;
    reward_claimed: boolean;
}

interface ActiveBounty {
    id: number;
    target_username: string;
    creator: string;
    is_mine: boolean;
    reward_amount: number;
    reason: string | null;
    created_at: string;
}

interface ClaimedBounty {
    id: number;
    target_username: string;
    hunter_username: string;
    reward_amount: number;
    claimed_at: string | null;
}

interface Props {
    quests: QuestItem[];
    active_bounties: ActiveBounty[];
    claimed_bounties: ClaimedBounty[];
    wallet_balance: number;
}

export default function QuestsIndexPage({
    quests,
    active_bounties,
    claimed_bounties,
    wallet_balance,
}: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.player_portal'), href: '/portal' },
        { title: t('portal.quests.title'), href: '/portal/quests' },
    ];

    const [activeTab, setActiveTab] = useState<'quests' | 'bounties' | 'history'>('quests');

    // Dialog state
    const [openBounty, setOpenBounty] = useState(false);
    const [targetUsername, setTargetUsername] = useState('');
    const [rewardAmount, setRewardAmount] = useState('100');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleClaimReward = (questId: number) => {
        router.post(`/portal/quests/${questId}/claim`);
    };

    const handleCreateBounty = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post('/portal/quests/bounties', {
            target_username: targetUsername,
            reward_amount: Number(rewardAmount),
            reason,
        }, {
            onFinish: () => {
                setSubmitting(false);
                setOpenBounty(false);
                setTargetUsername('');
                setReason('');
            },
        });
    };

    const handleCancelBounty = (bountyId: number) => {
        if (confirm('Hủy lệnh truy nã này và hoàn tiền về ví cá nhân?')) {
            router.post(`/portal/quests/bounties/${bountyId}/cancel`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('portal.quests.title')} />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Target className="size-7 text-primary" />
                            {t('portal.quests.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('portal.quests.subtitle')}
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

                        <Button onClick={() => setOpenBounty(true)} variant="default" className="gap-2">
                            <Plus className="size-4" />
                            {t('portal.quests.place_bounty')}
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="space-y-4">
                    <div className="flex gap-2 border-b pb-2">
                        <Button
                            variant={activeTab === 'quests' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('quests')}
                            className="gap-1.5"
                        >
                            <Award className="size-4" />
                            {t('portal.quests.tab_quests')} ({quests.length})
                        </Button>
                        <Button
                            variant={activeTab === 'bounties' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('bounties')}
                            className="gap-1.5"
                        >
                            <Crosshair className="size-4 text-red-500" />
                            {t('portal.quests.tab_bounties')} ({active_bounties.length})
                        </Button>
                        <Button
                            variant={activeTab === 'history' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('history')}
                            className="gap-1.5"
                        >
                            <History className="size-4" />
                            {t('portal.quests.tab_history')} ({claimed_bounties.length})
                        </Button>
                    </div>

                    {/* Tab: Quests */}
                    {activeTab === 'quests' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {quests.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-muted-foreground">
                                    Hiện chưa có nhiệm vụ nào đang diễn ra.
                                </div>
                            ) : (
                                quests.map((q) => (
                                    <Card key={q.id} className="hover:border-primary/50 transition-all flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant={q.type === 'daily' ? 'default' : q.type === 'weekly' ? 'secondary' : 'outline'}>
                                                    {q.type === 'daily' ? 'Hàng ngày' : q.type === 'weekly' ? 'Hàng tuần' : 'Thành tựu'}
                                                </Badge>
                                                <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
                                                    <Coins className="size-4" />
                                                    +{q.reward_coins.toLocaleString()}
                                                </div>
                                            </div>
                                            <CardTitle className="text-base font-bold pt-2">{q.title}</CardTitle>
                                            <CardDescription className="text-xs">{q.description || 'Hoàn thành chỉ tiêu để nhận thưởng.'}</CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Progress Bar */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                                    <span>Tiến độ</span>
                                                    <span>{q.current_progress} / {q.target_count} ({q.progress_percent}%)</span>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${q.is_completed ? 'bg-emerald-500' : 'bg-primary'}`}
                                                        style={{ width: `${q.progress_percent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Action button */}
                                            <div>
                                                {q.reward_claimed ? (
                                                    <Button disabled variant="outline" size="sm" className="w-full gap-1.5 text-muted-foreground">
                                                        <CheckCircle2 className="size-4 text-emerald-500" />
                                                        {t('portal.quests.claimed')}
                                                    </Button>
                                                ) : q.is_completed ? (
                                                    <Button onClick={() => handleClaimReward(q.quest_id)} size="sm" className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold">
                                                        <Sparkles className="size-4" />
                                                        {t('portal.quests.claim_btn')}
                                                    </Button>
                                                ) : (
                                                    <Button disabled variant="secondary" size="sm" className="w-full gap-1.5">
                                                        <Clock className="size-4" />
                                                        {t('portal.quests.in_progress')}
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab: Bounties Board */}
                    {activeTab === 'bounties' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {active_bounties.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-muted-foreground">
                                    Không có lệnh truy nã nào đang có hiệu lực.
                                </div>
                            ) : (
                                active_bounties.map((b) => (
                                    <Card key={b.id} className="border-red-500/30 hover:border-red-500/60 shadow-sm transition-all flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="destructive" className="gap-1 animate-pulse">
                                                    <Crosshair className="size-3" />
                                                    WANTED / TRUY NÃ
                                                </Badge>
                                                <div className="flex items-center gap-1 font-bold text-amber-500">
                                                    <Coins className="size-4" />
                                                    {b.reward_amount.toLocaleString()} coins
                                                </div>
                                            </div>
                                            <div className="pt-3">
                                                <CardTitle className="text-xl font-extrabold text-red-500 flex items-center gap-2">
                                                    <UserX className="size-6 text-red-500" />
                                                    {b.target_username}
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    Người đặt: <strong>{b.creator}</strong>
                                                </CardDescription>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground border">
                                                <span className="font-semibold text-foreground">Lý do: </span>
                                                {b.reason || 'Kẻ thù nguy hiểm trong thế giới Zomboid.'}
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-[11px] text-muted-foreground">
                                                    {new Date(b.created_at).toLocaleDateString()}
                                                </span>

                                                {b.is_mine && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                                        onClick={() => handleCancelBounty(b.id)}
                                                    >
                                                        <Trash2 className="size-3" />
                                                        Hủy & Hoàn tiền
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab: History */}
                    {activeTab === 'history' && (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mục tiêu bị hạ</TableHead>
                                            <TableHead>Thợ săn nhận thưởng</TableHead>
                                            <TableHead>Tiền thưởng</TableHead>
                                            <TableHead>Thời gian</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {claimed_bounties.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                    Chưa có thợ săn nào hoàn thành lệnh truy nã.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            claimed_bounties.map((c) => (
                                                <TableRow key={c.id}>
                                                    <TableCell className="font-bold text-red-500 flex items-center gap-2">
                                                        <Skull className="size-4 text-red-500" />
                                                        {c.target_username}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-emerald-600 flex items-center gap-1.5">
                                                        <Crosshair className="size-4" />
                                                        {c.hunter_username}
                                                    </TableCell>
                                                    <TableCell className="font-mono font-bold text-amber-500">
                                                        +{c.reward_amount.toLocaleString()} coins
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {c.claimed_at ? new Date(c.claimed_at).toLocaleString() : '—'}
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

            {/* Create Bounty Dialog */}
            <Dialog open={openBounty} onOpenChange={setOpenBounty}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                            <Crosshair className="size-5" />
                            {t('portal.quests.place_bounty')}
                        </DialogTitle>
                        <DialogDescription>
                            Treo thưởng tiền mặt để người chơi trong server săn lùng kẻ thù hoặc kẻ phạm tội.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateBounty} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="target_user">Tên người chơi bị truy nã (Username)</Label>
                            <Input
                                id="target_user"
                                placeholder="Ví dụ: evil_bandit"
                                value={targetUsername}
                                onChange={(e) => setTargetUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bounty_amt">
                                Tiền thưởng (Tối thiểu 50, Số dư ví: <strong className="text-amber-500">{wallet_balance.toLocaleString()}</strong>)
                            </Label>
                            <Input
                                id="bounty_amt"
                                type="number"
                                min={50}
                                max={wallet_balance}
                                placeholder="500"
                                value={rewardAmount}
                                onChange={(e) => setRewardAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bounty_reason">Lý do truy nã</Label>
                            <Input
                                id="bounty_reason"
                                placeholder="Cướp bóc căn cứ, PK thành viên..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenBounty(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={submitting} variant="destructive">
                                {submitting ? 'Đang phát lệnh...' : 'Phát lệnh Truy nã'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
