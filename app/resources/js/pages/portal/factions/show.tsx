import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    Coins,
    Crown,
    ExternalLink,
    Flag,
    LogOut,
    MapPin,
    Plus,
    Shield,
    ShieldAlert,
    Trash2,
    UserCheck,
    UserMinus,
    UserPlus,
    Users,
    X,
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

interface Member {
    id: number;
    user_id: number;
    username: string;
    role: string;
    contribution_points: number;
    joined_at: string;
}

interface Territory {
    id: number;
    name: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    z: number;
    color: string | null;
    is_safe_house: boolean;
}

interface Props {
    faction: {
        id: number;
        name: string;
        tag: string;
        description: string | null;
        color: string;
        leader_id: number;
        bank_balance: number;
        max_members: number;
        created_at: string;
    };
    members: Member[];
    territories: Territory[];
    my_role: string | null;
    is_officer: boolean;
    is_leader: boolean;
    pending_requests: Array<{
        id: number;
        user: { id: number; username: string };
    }>;
    wallet_balance: number;
}

export default function FactionShowPage({
    faction,
    members,
    territories,
    my_role,
    is_officer,
    is_leader,
    pending_requests,
    wallet_balance,
}: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.player_portal'), href: '/portal' },
        { title: t('portal.factions.title'), href: '/portal/factions' },
        { title: `[${faction.tag}] ${faction.name}`, href: `/portal/factions/${faction.id}` },
    ];

    const [activeTab, setActiveTab] = useState<'members' | 'territories' | 'requests'>('members');

    // Dialog states
    const [openDeposit, setOpenDeposit] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');

    const [openClaim, setOpenClaim] = useState(false);
    const [baseName, setBaseName] = useState('Main Outpost');
    const [x1, setX1] = useState('');
    const [y1, setY1] = useState('');
    const [x2, setX2] = useState('');
    const [y2, setY2] = useState('');

    const [openInvite, setOpenInvite] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');

    const handleDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/portal/factions/${faction.id}/deposit`, {
            amount: Number(depositAmount),
        }, {
            onFinish: () => {
                setOpenDeposit(false);
                setDepositAmount('');
            },
        });
    };

    const handleClaim = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/portal/factions/${faction.id}/claim`, {
            name: baseName,
            x1: Number(x1),
            y1: Number(y1),
            x2: Number(x2),
            y2: Number(y2),
            z: 0,
        }, {
            onFinish: () => {
                setOpenClaim(false);
                setX1('');
                setY1('');
                setX2('');
                setY2('');
            },
        });
    };

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/portal/factions/${faction.id}/invite`, {
            username: inviteUsername,
        }, {
            onFinish: () => {
                setOpenInvite(false);
                setInviteUsername('');
            },
        });
    };

    const handleRequestJoin = () => {
        router.post(`/portal/factions/${faction.id}/request-join`);
    };

    const handleRespondRequest = (invitationId: number, accept: boolean) => {
        router.post(`/portal/factions/invitations/${invitationId}/respond`, { accept });
    };

    const handleKick = (userId: number) => {
        if (confirm('Bạn có chắc muốn xóa thành viên này khỏi bang?')) {
            router.post(`/portal/factions/${faction.id}/kick/${userId}`);
        }
    };

    const handleSetRole = (userId: number, role: string) => {
        router.post(`/portal/factions/${faction.id}/role/${userId}`, { role });
    };

    const handleLeave = () => {
        if (confirm(t('portal.factions.leave_confirm'))) {
            router.post(`/portal/factions/${faction.id}/leave`);
        }
    };

    const handleDisband = () => {
        if (confirm(t('portal.factions.disband_confirm'))) {
            router.post(`/portal/factions/${faction.id}/disband`);
        }
    };

    const handleDeleteTerritory = (territoryId: number) => {
        if (confirm('Xóa khu vực căn cứ này?')) {
            router.delete(`/portal/factions/${faction.id}/territories/${territoryId}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`[${faction.tag}] ${faction.name}`} />

            <div className="space-y-6 p-6">
                {/* Faction Header Banner */}
                <Card className="border shadow-sm">
                    <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="size-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-inner text-xl"
                                style={{ backgroundColor: faction.color }}
                            >
                                {faction.tag}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <span>[{faction.tag}] {faction.name}</span>
                                    {my_role && (
                                        <Badge variant="outline" className="text-xs">
                                            {my_role.toUpperCase()}
                                        </Badge>
                                    )}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {faction.description || 'Chưa có mô tả cho bang hội.'}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                            {my_role ? (
                                <>
                                    <Button onClick={() => setOpenDeposit(true)} variant="secondary" size="sm" className="gap-1.5">
                                        <Coins className="size-4 text-amber-500" />
                                        {t('portal.factions.deposit')}
                                    </Button>

                                    {is_officer && (
                                        <>
                                            <Button onClick={() => setOpenInvite(true)} variant="outline" size="sm" className="gap-1.5">
                                                <UserPlus className="size-4" />
                                                {t('portal.factions.invite_member')}
                                            </Button>

                                            <Button onClick={() => setOpenClaim(true)} variant="outline" size="sm" className="gap-1.5">
                                                <MapPin className="size-4 text-blue-500" />
                                                {t('portal.factions.claim_territory')}
                                            </Button>
                                        </>
                                    )}

                                    {!is_leader && (
                                        <Button onClick={handleLeave} variant="ghost" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10">
                                            <LogOut className="size-4" />
                                            Rời bang
                                        </Button>
                                    )}

                                    {is_leader && (
                                        <Button onClick={handleDisband} variant="ghost" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10">
                                            <Trash2 className="size-4" />
                                            Giải tán bang
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button onClick={handleRequestJoin} className="gap-1.5">
                                    <UserPlus className="size-4" />
                                    {t('portal.factions.join_request')}
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="size-3.5" /> Thành viên
                            </span>
                            <span className="text-xl font-bold">{members.length}/{faction.max_members}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Coins className="size-3.5 text-amber-500" /> Quỹ bang
                            </span>
                            <span className="text-xl font-bold text-amber-500">
                                {faction.bank_balance.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="size-3.5 text-blue-500" /> Căn cứ lãnh địa
                            </span>
                            <span className="text-xl font-bold">{territories.length}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <div className="space-y-4">
                    <div className="flex gap-2 border-b pb-2">
                        <Button
                            variant={activeTab === 'members' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('members')}
                            className="gap-1.5"
                        >
                            <Users className="size-4" />
                            Thành viên ({members.length})
                        </Button>
                        <Button
                            variant={activeTab === 'territories' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('territories')}
                            className="gap-1.5"
                        >
                            <MapPin className="size-4" />
                            Căn cứ lãnh địa ({territories.length})
                        </Button>
                        {is_officer && pending_requests.length > 0 && (
                            <Button
                                variant={activeTab === 'requests' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('requests')}
                                className="gap-1.5 text-primary font-bold"
                            >
                                <UserCheck className="size-4" />
                                Đơn xin vào ({pending_requests.length})
                            </Button>
                        )}
                    </div>

                    {/* Members Tab */}
                    {activeTab === 'members' && (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Người chơi</TableHead>
                                            <TableHead>Chức vụ</TableHead>
                                            <TableHead>Điểm cống hiến</TableHead>
                                            <TableHead>Ngày gia nhập</TableHead>
                                            {is_officer && <TableHead className="text-right">Hành động</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.map((m) => (
                                            <TableRow key={m.id}>
                                                <TableCell className="font-semibold flex items-center gap-2">
                                                    {m.role === 'leader' && <Crown className="size-4 text-amber-500" />}
                                                    {m.role === 'officer' && <Shield className="size-4 text-blue-500" />}
                                                    <Link href={`/rankings/${m.username}`} className="hover:underline hover:text-primary">
                                                        {m.username}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={m.role === 'leader' ? 'default' : m.role === 'officer' ? 'secondary' : 'outline'}
                                                    >
                                                        {m.role === 'leader' ? 'Chủ bang' : m.role === 'officer' ? 'Phó bang' : 'Thành viên'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-amber-500 font-semibold">
                                                    {m.contribution_points.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(m.joined_at).toLocaleDateString()}
                                                </TableCell>
                                                {is_officer && (
                                                    <TableCell className="text-right space-x-1">
                                                        {is_leader && m.role !== 'leader' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs"
                                                                onClick={() => handleSetRole(m.user_id, m.role === 'officer' ? 'member' : 'officer')}
                                                            >
                                                                {m.role === 'officer' ? 'Giáng chức' : 'Thăng Phó bang'}
                                                            </Button>
                                                        )}
                                                        {m.role !== 'leader' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleKick(m.user_id)}
                                                            >
                                                                Kick
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Territories Tab */}
                    {activeTab === 'territories' && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="size-4 text-blue-500" />
                                    Khu vực Lãnh địa & Căn cứ Bang ({territories.length})
                                </CardTitle>
                                <CardDescription>
                                    Các khu vực này được bảo vệ trên máy chủ và hiển thị ranh giới trên bản đồ Live Map.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {territories.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-6 text-center">
                                        Chưa có khu vực lãnh địa nào được thiết lập.
                                    </p>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {territories.map((t) => (
                                            <div
                                                key={t.id}
                                                className="rounded-lg border p-3 flex items-center justify-between bg-card"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">{t.name}</span>
                                                        {t.is_safe_house && (
                                                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                                                                Safehouse
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        ({t.x1}, {t.y1}) ➔ ({t.x2}, {t.y2})
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="ghost" asChild className="h-8">
                                                        <Link href={`/admin/players/map?x=${Math.floor((t.x1 + t.x2) / 2)}&y=${Math.floor((t.y1 + t.y2) / 2)}`} target="_blank">
                                                            <ExternalLink className="size-3.5" />
                                                        </Link>
                                                    </Button>
                                                    {is_officer && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 text-destructive"
                                                            onClick={() => handleDeleteTerritory(t.id)}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Pending Requests Tab */}
                    {is_officer && activeTab === 'requests' && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Đơn xin gia nhập bang ({pending_requests.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {pending_requests.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        Không có yêu cầu gia nhập nào đang chờ.
                                    </p>
                                ) : (
                                    pending_requests.map((r) => (
                                        <div
                                            key={r.id}
                                            className="flex items-center justify-between rounded-lg border p-3"
                                        >
                                            <span className="font-bold">{r.user.username}</span>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleRespondRequest(r.id, true)}
                                                >
                                                    Duyệt
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRespondRequest(r.id, false)}
                                                >
                                                    Từ chối
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Deposit Dialog */}
            <Dialog open={openDeposit} onOpenChange={setOpenDeposit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nạp tiền vào Quỹ Bang</DialogTitle>
                        <DialogDescription>
                            Số dư ví cá nhân hiện tại: <strong className="text-amber-500">{wallet_balance.toLocaleString()}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDeposit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="dep_amount">Số tiền nạp</Label>
                            <Input
                                id="dep_amount"
                                type="number"
                                min={1}
                                max={wallet_balance}
                                placeholder="100"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenDeposit(false)}>
                                Hủy
                            </Button>
                            <Button type="submit">
                                Nạp ngay
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Claim Territory Dialog */}
            <Dialog open={openClaim} onOpenChange={setOpenClaim}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thiết lập Căn cứ Lãnh địa</DialogTitle>
                        <DialogDescription>
                            Nhập tọa độ 2 góc (X1, Y1) và (X2, Y2) để đăng ký ranh giới lãnh thổ cho bang.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleClaim} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="base_name">Tên Căn cứ</Label>
                            <Input
                                id="base_name"
                                value={baseName}
                                onChange={(e) => setBaseName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="t_x1">Tọa độ X1</Label>
                                <Input id="t_x1" type="number" value={x1} onChange={(e) => setX1(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="t_y1">Tọa độ Y1</Label>
                                <Input id="t_y1" type="number" value={y1} onChange={(e) => setY1(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="t_x2">Tọa độ X2</Label>
                                <Input id="t_x2" type="number" value={x2} onChange={(e) => setX2(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="t_y2">Tọa độ Y2</Label>
                                <Input id="t_y2" type="number" value={y2} onChange={(e) => setY2(e.target.value)} required />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenClaim(false)}>
                                Hủy
                            </Button>
                            <Button type="submit">
                                Thiết lập
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Invite Member Dialog */}
            <Dialog open={openInvite} onOpenChange={setOpenInvite}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mời thành viên vào Bang</DialogTitle>
                        <DialogDescription>
                            Nhập chính xác tên tài khoản (username) của người chơi.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="inv_username">Tên người chơi</Label>
                            <Input
                                id="inv_username"
                                placeholder="nmhung1805"
                                value={inviteUsername}
                                onChange={(e) => setInviteUsername(e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenInvite(false)}>
                                Hủy
                            </Button>
                            <Button type="submit">
                                Gửi lời mời
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
