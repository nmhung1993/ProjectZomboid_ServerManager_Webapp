import { Head, router } from '@inertiajs/react';
import {
    Award,
    CheckCircle2,
    Coins,
    Crosshair,
    Crown,
    Flame,
    Gift,
    Globe,
    Layers,
    Lock,
    Medal,
    Shield,
    Sparkles,
    Swords,
    Target,
    Trophy,
    UserCheck,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
    progress: number;
    percent: number;
    is_completed: boolean;
    is_reward_claimed: boolean;
    completed_at: string | null;
}

interface Props {
    achievements: AchievementItem[];
    unlocked_titles: string[];
    active_title: string | null;
    wallet_balance: number;
}

export default function AchievementsPortalPage({
    achievements,
    unlocked_titles,
    active_title,
    wallet_balance,
}: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.player_portal'), href: '/portal' },
        { title: t('nav.achievements'), href: '/portal/achievements' },
    ];

    const [category, setCategory] = useState<string>('all');
    const [claimingId, setClaimingId] = useState<number | null>(null);
    const [equipping, setEquipping] = useState(false);

    const completedCount = achievements.filter((a) => a.is_completed).length;
    const totalCount = achievements.length;
    const totalPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const filtered = achievements.filter((a) => {
        if (category === 'all') return true;
        return a.category === category;
    });

    const handleClaim = (id: number) => {
        setClaimingId(id);
        router.post(route('portal.achievements.claim', id), {}, {
            preserveScroll: true,
            onFinish: () => setClaimingId(null),
        });
    };

    const handleEquipTitle = (title: string | null) => {
        setEquipping(true);
        router.post(route('portal.achievements.equip'), { title }, {
            preserveScroll: true,
            onFinish: () => setEquipping(false),
        });
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'combat':
                return <Crosshair className="size-4 text-purple-500" />;
            case 'pvp':
                return <Swords className="size-4 text-red-500" />;
            case 'survival':
                return <Flame className="size-4 text-amber-500" />;
            case 'economy':
                return <Coins className="size-4 text-yellow-500" />;
            default:
                return <Globe className="size-4 text-blue-500" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Thành tích & Danh hiệu" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Trophy className="size-7 text-primary" />
                            {t('portal.achievements.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('portal.achievements.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm shadow-sm">
                            <Coins className="size-4 text-yellow-500" />
                            <span className="text-muted-foreground">Số dư:</span>
                            <span className="font-bold text-yellow-600">{wallet_balance.toLocaleString()} Coins</span>
                        </div>
                    </div>
                </div>

                {/* Overall Progress & Title Banner */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2 border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Crown className="size-5 text-amber-500" />
                                    Tổng Tiến Độ Thành Tựu Máy Chủ
                                </CardTitle>
                                <span className="font-bold text-lg text-primary">{completedCount} / {totalCount} ({totalPercent}%)</span>
                            </div>
                            <Progress value={totalPercent} className="h-2.5 mt-2" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Đạt các mốc sinh tồn đặc biệt để tự động nhận Coins và mở khóa danh hiệu hiển thị trong Game & Web Rankings!
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Medal className="size-4 text-amber-500" />
                                    {t('portal.achievements.equipped_title')}
                                </span>
                                {active_title && (
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => handleEquipTitle(null)}
                                        disabled={equipping}
                                        className="h-6 text-[11px] text-muted-foreground hover:text-red-500"
                                    >
                                        {t('portal.achievements.unequip')}
                                    </Button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {active_title ? (
                                <div className="flex items-center gap-2">
                                    <Badge className="text-sm font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm border-0 py-1 px-3">
                                        ✨ {active_title}
                                    </Badge>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">Chưa trang bị danh hiệu nào.</p>
                            )}

                            {unlocked_titles.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                    <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                                        Chọn danh hiệu để đeo:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {unlocked_titles.map((title) => (
                                            <Button
                                                key={title}
                                                variant={active_title === title ? 'default' : 'outline'}
                                                size="xs"
                                                onClick={() => handleEquipTitle(title)}
                                                disabled={equipping || active_title === title}
                                                className="h-6 text-[11px]"
                                            >
                                                {title}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/60 max-w-fit">
                    {[
                        { id: 'all', label: 'Tất cả' },
                        { id: 'combat', label: 'Diệt Zombie' },
                        { id: 'pvp', label: 'PvP Sinh Tử' },
                        { id: 'survival', label: 'Sinh Tồn' },
                        { id: 'economy', label: 'Kinh Tế' },
                        { id: 'exploration', label: 'Thám Hiểm' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setCategory(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                category === tab.id
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Achievements List */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((ach) => (
                                <Card
                                    key={ach.id}
                                    className={`relative overflow-hidden transition-all border ${
                                        ach.is_completed
                                            ? 'border-emerald-500/30 bg-emerald-500/5'
                                            : 'border-border hover:border-primary/40'
                                    }`}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className={`flex items-center justify-center size-10 rounded-xl border ${
                                                        ach.is_completed
                                                            ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {ach.is_completed ? (
                                                        <CheckCircle2 className="size-5" />
                                                    ) : (
                                                        <Trophy className="size-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                                        {ach.title}
                                                    </CardTitle>
                                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        {getCategoryIcon(ach.category)}
                                                        <span className="capitalize">{ach.category}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {ach.is_completed && ach.is_reward_claimed ? (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-[11px]">
                                                    Đã nhận
                                                </Badge>
                                            ) : ach.is_completed && !ach.is_reward_claimed ? (
                                                <Button
                                                    size="xs"
                                                    onClick={() => handleClaim(ach.id)}
                                                    disabled={claimingId === ach.id}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-bounce shadow-sm h-7 text-xs"
                                                >
                                                    <Gift className="size-3.5 mr-1" />
                                                    Nhận Thưởng
                                                </Button>
                                            ) : (
                                                <Badge variant="secondary" className="text-[11px]">
                                                    {ach.progress} / {ach.target_value}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-3 pt-0">
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {ach.description}
                                        </p>

                                        {/* Progress bar */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-muted-foreground">Tiến độ</span>
                                                <span className="font-semibold">{ach.percent}%</span>
                                            </div>
                                            <Progress value={ach.percent} className="h-1.5" />
                                        </div>

                                        {/* Rewards Footer */}
                                        <div className="flex items-center justify-between pt-2 border-t text-xs">
                                            <div className="flex items-center gap-1 font-bold text-yellow-600">
                                                <Coins className="size-3.5 text-yellow-500" />
                                                +{ach.reward_coins} Coins
                                            </div>

                                            {ach.reward_title && (
                                                <Badge variant="outline" className="text-[11px] border-amber-500/30 bg-amber-500/10 text-amber-600 font-bold">
                                                    🏷️ {ach.reward_title}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
            </div>
        </AppLayout>
    );
}
