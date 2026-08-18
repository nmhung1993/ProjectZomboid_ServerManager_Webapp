import { Head, Link, router } from '@inertiajs/react';
import {
    Coins,
    Crown,
    ExternalLink,
    Flag,
    MapPin,
    Plus,
    Shield,
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface FactionSummary {
    id: number;
    name: string;
    tag: string;
    description: string | null;
    color: string;
    leader: string;
    members_count: number;
    max_members: number;
    bank_balance: number;
    territories_count: number;
    created_at: string;
}

interface MyFaction {
    id: number;
    name: string;
    tag: string;
    description: string | null;
    color: string;
    role: string;
    bank_balance: number;
    members_count: number;
    territories_count: number;
}

interface Props {
    my_faction: MyFaction | null;
    factions: FactionSummary[];
    my_invitations: Array<{
        id: number;
        faction: { id: number; name: string; tag: string };
        type: string;
        created_by: string;
    }>;
    wallet_balance: number;
}

export default function FactionsIndexPage({
    my_faction,
    factions,
    my_invitations,
    wallet_balance,
}: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.player_portal'), href: '/portal' },
        { title: t('portal.factions.title'), href: '/portal/factions' },
    ];

    const [openCreate, setOpenCreate] = useState(false);
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [creating, setCreating] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        router.post(
            '/portal/factions',
            { name, tag, description, color },
            {
                onFinish: () => {
                    setCreating(false);
                    setOpenCreate(false);
                },
            },
        );
    };

    const handleRespondInvitation = (invitationId: number, accept: boolean) => {
        router.post(`/portal/factions/invitations/${invitationId}/respond`, { accept });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('portal.factions.title')} />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Flag className="size-7 text-primary" />
                            {t('portal.factions.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('portal.factions.subtitle')}
                        </p>
                    </div>

                    {!my_faction && (
                        <Button onClick={() => setOpenCreate(true)} className="gap-2">
                            <Plus className="size-4" />
                            {t('portal.factions.create_btn')}
                        </Button>
                    )}
                </div>

                {/* Invitations Alert */}
                {my_invitations.length > 0 && (
                    <Card className="border-primary/40 bg-primary/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="size-4 text-primary" />
                                Lời mời gia nhập Bang hội ({my_invitations.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {my_invitations.map((inv) => (
                                <div
                                    key={inv.id}
                                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                                >
                                    <div>
                                        <span className="font-bold">[{inv.faction.tag}] {inv.faction.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                            (Mời bởi {inv.created_by})
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRespondInvitation(inv.id, true)}
                                        >
                                            Chấp nhận
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRespondInvitation(inv.id, false)}
                                        >
                                            Từ chối
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* My Faction Banner */}
                {my_faction ? (
                    <Card className="border-2 border-primary/30 shadow-md">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="size-12 rounded-xl flex items-center justify-center font-bold text-white shadow-inner text-lg"
                                    style={{ backgroundColor: my_faction.color }}
                                >
                                    {my_faction.tag}
                                </div>
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <span>[{my_faction.tag}] {my_faction.name}</span>
                                        <Badge variant="secondary">{my_faction.role.toUpperCase()}</Badge>
                                    </CardTitle>
                                    <CardDescription>{my_faction.description || 'Chưa có mô tả'}</CardDescription>
                                </div>
                            </div>
                            <Button asChild className="mt-3 sm:mt-0 gap-1.5">
                                <Link href={`/portal/factions/${my_faction.id}`}>
                                    Trang quản lý Bang
                                    <ExternalLink className="size-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4 pt-2 border-t">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="size-3.5" /> Thành viên
                                </span>
                                <span className="text-lg font-bold">{my_faction.members_count}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Coins className="size-3.5 text-amber-500" /> Quỹ bang
                                </span>
                                <span className="text-lg font-bold text-amber-500">
                                    {my_faction.bank_balance.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="size-3.5 text-blue-500" /> Căn cứ lãnh địa
                                </span>
                                <span className="text-lg font-bold">{my_faction.territories_count}</span>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {/* All Factions Directory */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Crown className="size-5 text-amber-500" />
                        {t('portal.factions.all_factions')} ({factions.length})
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {factions.map((f) => (
                            <Card key={f.id} className="hover:border-primary/50 transition-all flex flex-col justify-between">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="size-9 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm"
                                                style={{ backgroundColor: f.color }}
                                            >
                                                {f.tag}
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-bold truncate">
                                                    [{f.tag}] {f.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Chủ bang: {f.leader}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pb-4">
                                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                                        {f.description || 'Không có mô tả.'}
                                    </p>

                                    <div className="flex items-center justify-between text-xs pt-2 border-t">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Users className="size-3" /> {f.members_count}/{f.max_members}
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                                            <Coins className="size-3" /> {f.bank_balance.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1 text-blue-500">
                                            <MapPin className="size-3" /> {f.territories_count} Căn cứ
                                        </span>
                                    </div>

                                    <div className="pt-1">
                                        <Button asChild variant="outline" size="sm" className="w-full">
                                            <Link href={`/portal/factions/${f.id}`}>
                                                Xem chi tiết
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* Create Faction Dialog */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('portal.factions.create_btn')}</DialogTitle>
                        <DialogDescription>
                            Thành lập liên minh và xây dựng thế lực mới trong thế giới Zomboid.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="fac_name">{t('portal.factions.name')}</Label>
                            <Input
                                id="fac_name"
                                placeholder="Ví dụ: West Point Survivors"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fac_tag">{t('portal.factions.tag')}</Label>
                                <Input
                                    id="fac_tag"
                                    placeholder="WPS"
                                    maxLength={8}
                                    value={tag}
                                    onChange={(e) => setTag(e.target.value.toUpperCase())}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fac_color">{t('portal.factions.color')}</Label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        id="fac_color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="size-9 rounded cursor-pointer border p-0.5"
                                    />
                                    <span className="font-mono text-xs text-muted-foreground">{color}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fac_desc">{t('portal.factions.desc')}</Label>
                            <Textarea
                                id="fac_desc"
                                placeholder="Mô tả tôn chỉ, luật lệ hoặc thông tin bang..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={creating}>
                                {creating ? 'Đang tạo...' : t('portal.factions.create_btn')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
