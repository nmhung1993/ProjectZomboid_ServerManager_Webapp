import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Filter,
    Gavel,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    UserX,
    XCircle,
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

interface Violation {
    id: number;
    username: string;
    access_level: string;
    cheats: string[];
    cheat_string: string;
    x: number | null;
    y: number | null;
    z: number | null;
    status: 'flagged' | 'resolved' | 'dismissed' | 'punished';
    resolved_by: string | null;
    resolution_note: string | null;
    resolved_at: string | null;
    occurred_at: string;
}

interface AntiCheatProps {
    violations: {
        data: Violation[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    stats: {
        total: number;
        flagged: number;
        today: number;
    };
    filters: {
        status?: string;
        player?: string;
    };
}

export default function AntiCheatPage({ violations, stats, filters }: AntiCheatProps) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.anticheat'), href: '/admin/anticheat' },
    ];

    const [syncing, setSyncing] = useState(false);
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
    const [resolveStatus, setResolveStatus] = useState<'resolved' | 'dismissed' | 'punished'>('resolved');
    const [resolveNote, setResolveNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [filterStatus, setFilterStatus] = useState(filters.status || 'all');
    const [searchPlayer, setSearchPlayer] = useState(filters.player || '');

    const handleSync = () => {
        setSyncing(true);
        router.post(
            '/admin/anticheat/sync',
            {},
            {
                onFinish: () => setSyncing(false),
            },
        );
    };

    const handleFilterChange = (status: string) => {
        setFilterStatus(status);
        router.get(
            '/admin/anticheat',
            {
                status: status === 'all' ? undefined : status,
                player: searchPlayer || undefined,
            },
            { preserveState: true },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/anticheat',
            {
                status: filterStatus === 'all' ? undefined : filterStatus,
                player: searchPlayer || undefined,
            },
            { preserveState: true },
        );
    };

    const openResolveDialog = (violation: Violation) => {
        setSelectedViolation(violation);
        setResolveStatus(violation.status === 'flagged' ? 'resolved' : (violation.status as any));
        setResolveNote(violation.resolution_note || '');
    };

    const handleResolveSubmit = () => {
        if (!selectedViolation) return;
        setSubmitting(true);
        router.post(
            `/admin/anticheat/${selectedViolation.id}/resolve`,
            {
                status: resolveStatus,
                note: resolveNote,
            },
            {
                onFinish: () => {
                    setSubmitting(false);
                    setSelectedViolation(null);
                },
            },
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'flagged':
                return (
                    <Badge variant="destructive" className="flex w-fit items-center gap-1">
                        <AlertTriangle className="size-3" />
                        {t('admin.anticheat.status_flagged')}
                    </Badge>
                );
            case 'resolved':
                return (
                    <Badge variant="outline" className="flex w-fit items-center gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        {t('admin.anticheat.status_resolved')}
                    </Badge>
                );
            case 'dismissed':
                return (
                    <Badge variant="secondary" className="flex w-fit items-center gap-1">
                        <XCircle className="size-3" />
                        {t('admin.anticheat.status_dismissed')}
                    </Badge>
                );
            case 'punished':
                return (
                    <Badge variant="destructive" className="flex w-fit items-center gap-1 bg-red-800 text-white">
                        <Gavel className="size-3" />
                        {t('admin.anticheat.status_punished')}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatCheatBadge = (cheat: string) => {
        const labels: Record<string, string> = {
            godmode: 'God Mode',
            noclip: 'No Clip',
            invisible: 'Tàng hình',
            unlimited_ammo: 'Đạn vô hạn',
            unlimited_carry: 'Tải trọng vô hạn',
            unlimited_endurance: 'Thể lực vô hạn',
            build_cheat: 'Build Cheat',
            farming_cheat: 'Farming Cheat',
            health_cheat: 'Health Cheat',
            mechanics_cheat: 'Mechanics Cheat',
            movables_cheat: 'Movables Cheat',
            instant_actions: 'Hành động tức thì',
            admin_tag: 'Admin Tag',
        };

        return (
            <Badge key={cheat} variant="outline" className="border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 font-mono text-xs">
                {labels[cheat] || cheat}
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.anticheat.title')} />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <ShieldAlert className="size-7 text-destructive" />
                            {t('admin.anticheat.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('admin.anticheat.description')}
                        </p>
                    </div>
                    <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
                        <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
                        {t('admin.anticheat.sync_now')}
                    </Button>
                </div>

                {/* Stat Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin.anticheat.total_violations')}</CardTitle>
                            <Shield className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>

                    <Card className={stats.flagged > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin.anticheat.flagged_violations')}</CardTitle>
                            <ShieldAlert className="size-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{stats.flagged}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin.anticheat.today_violations')}</CardTitle>
                            <Clock className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.today}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <Filter className="size-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{t('admin.anticheat.table_status')}:</span>
                                <Select value={filterStatus} onValueChange={handleFilterChange}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all') || 'Tất cả'}</SelectItem>
                                        <SelectItem value="flagged">{t('admin.anticheat.status_flagged')}</SelectItem>
                                        <SelectItem value="resolved">{t('admin.anticheat.status_resolved')}</SelectItem>
                                        <SelectItem value="punished">{t('admin.anticheat.status_punished')}</SelectItem>
                                        <SelectItem value="dismissed">{t('admin.anticheat.status_dismissed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <form onSubmit={handleSearchSubmit} className="flex gap-2">
                                <Input
                                    placeholder={t('admin.anticheat.table_player')}
                                    value={searchPlayer}
                                    onChange={(e) => setSearchPlayer(e.target.value)}
                                    className="w-[200px]"
                                />
                                <Button type="submit" variant="secondary" size="icon">
                                    <Search className="size-4" />
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </Card>

                {/* Violations Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.anticheat.table_player')}</TableHead>
                                    <TableHead>{t('admin.anticheat.table_role')}</TableHead>
                                    <TableHead>{t('admin.anticheat.table_cheats')}</TableHead>
                                    <TableHead>{t('admin.anticheat.table_location')}</TableHead>
                                    <TableHead>{t('admin.anticheat.table_status')}</TableHead>
                                    <TableHead>{t('admin.anticheat.table_time')}</TableHead>
                                    <TableHead className="text-right">{t('admin.anticheat.table_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {violations.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <ShieldCheck className="size-8 text-emerald-500/50 mb-1" />
                                                <p className="font-medium">{t('admin.anticheat.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    violations.data.map((violation) => (
                                        <TableRow key={violation.id} className={violation.status === 'flagged' ? 'bg-destructive/5' : ''}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono">{violation.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {violation.access_level || 'none'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {violation.cheats && violation.cheats.length > 0 ? (
                                                        violation.cheats.map((c) => formatCheatBadge(c))
                                                    ) : (
                                                        <span className="text-sm font-mono">{violation.cheat_string}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {violation.x !== null && violation.y !== null ? (
                                                    <a
                                                        href={`/admin/players/map?x=${violation.x}&y=${violation.y}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                                                    >
                                                        ({violation.x}, {violation.y})
                                                        <ExternalLink className="size-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(violation.status)}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(violation.occurred_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => openResolveDialog(violation)}
                                                >
                                                    {t('common.manage') || 'Xử lý'}
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

            {/* Resolve Dialog */}
            <Dialog open={!!selectedViolation} onOpenChange={(open) => !open && setSelectedViolation(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.anticheat.resolve_dialog_title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.anticheat.resolve_dialog_description', { username: selectedViolation?.username || '' })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedViolation && (
                        <div className="space-y-4 py-2">
                            <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40 font-mono">
                                <div><strong>{t('admin.anticheat.table_player')}:</strong> {selectedViolation.username}</div>
                                <div><strong>{t('admin.anticheat.table_cheats')}:</strong> {selectedViolation.cheat_string}</div>
                                <div><strong>{t('admin.anticheat.table_time')}:</strong> {new Date(selectedViolation.occurred_at).toLocaleString()}</div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resolve_status">{t('admin.anticheat.table_status')}</Label>
                                <Select value={resolveStatus} onValueChange={(val: any) => setResolveStatus(val)}>
                                    <SelectTrigger id="resolve_status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="resolved">{t('admin.anticheat.status_resolved')}</SelectItem>
                                        <SelectItem value="punished">{t('admin.anticheat.status_punished')}</SelectItem>
                                        <SelectItem value="dismissed">{t('admin.anticheat.status_dismissed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resolve_note">{t('admin.anticheat.note_placeholder')}</Label>
                                <Textarea
                                    id="resolve_note"
                                    placeholder={t('admin.anticheat.note_placeholder')}
                                    value={resolveNote}
                                    onChange={(e) => setResolveNote(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedViolation(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleResolveSubmit} disabled={submitting}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
