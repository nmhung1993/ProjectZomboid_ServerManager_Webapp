import { Link } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    Backpack,
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    Crosshair,
    ExternalLink,
    Ghost,
    Heart,
    MapPin,
    Shield,
    Skull,
    Sparkles,
    Tag,
    User as UserIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { formatHours } from '@/lib/hours-format';

const PROFESSION_NAMES: Record<string, string> = {
    unemployed: 'Thất nghiệp',
    fireofficer: 'Lính cứu hỏa',
    policeofficer: 'Cảnh sát',
    parkranger: 'Kiểm lâm',
    constructionworker: 'Thợ xây dựng',
    securityguard: 'Bảo vệ',
    carpenter: 'Thợ mộc',
    burglar: 'Trộm',
    chef: 'Đầu bếp',
    repairman: 'Thợ sửa chữa',
    farmer: 'Nông dân',
    fisherman: 'Ngư dân',
    doctor: 'Bác sĩ',
    nurse: 'Y tá',
    lumberjack: 'Tiều phu',
    fitnessInstructor: 'HLV thể hình',
    electrician: 'Thợ điện',
    engineer: 'Kỹ sư',
    metalworker: 'Thợ kim khí',
    mechanic: 'Thợ cơ khí',
    veteran: 'Cựu chiến binh',
    diyexpert: 'Chuyên gia tự chế (DIY Expert)',
    tailor: 'Thợ may',
    blacksmith: 'Thợ rèn',
    herbalist: 'Thầy thuốc thảo dược',
};

import { resolvePzTrait } from '@/lib/pz-traits';

function formatProfession(prof?: string | null): string {
    if (!prof) return 'Thất nghiệp';
    const clean = prof.trim().toLowerCase();
    for (const [key, label] of Object.entries(PROFESSION_NAMES)) {
        if (key.toLowerCase() === clean) return label;
    }
    return prof.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

export type PlayerInfoData = {
    id: number | null;
    username: string;
    role: string;
    steam_id: string | null;
    isOnline: boolean;
    createdAt: string | null;
    stats: {
        zombie_kills: number;
        hours_survived: number;
        profession: string | null;
        skills: Record<string, number>;
        traits?: string[];
        is_dead: boolean;
    } | null;
    live: {
        x: number | null;
        y: number | null;
        z: number | null;
        is_ghost: boolean;
    } | null;
};

type Props = {
    player: PlayerInfoData | null;
    dayLengthMinutes?: number;
    onClose: () => void;
};

export default function PlayerInfoDialog({ player, dayLengthMinutes = 60, onClose }: Props) {
    const { t } = useTranslation();

    if (!player) return null;

    const stats = player.stats;
    const live = player.live;
    const skills = stats?.skills ?? {};
    const skillEntries = Object.entries(skills);

    const rawTraits: string[] = stats?.traits ?? [];
    const traitsList = rawTraits.map(resolvePzTrait);
    const positiveTraits = traitsList.filter((t) => t.type === 'positive');
    const negativeTraits = traitsList.filter((t) => t.type === 'negative');
    const otherTraits = traitsList.filter((t) => t.type === 'neutral');

    const isDead = live?.is_dead ?? stats?.is_dead ?? false;

    return (
        <Dialog open={!!player} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                            <UserIcon className="size-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2 flex-wrap">
                                <span>{player.username}</span>
                                {(player as any).active_title && (
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] font-bold">
                                        ✨ {(player as any).active_title}
                                    </Badge>
                                )}
                                <Badge variant={player.isOnline ? 'default' : 'outline'} className="text-[11px] gap-1 py-0">
                                    <Circle
                                        className={`size-1.5 ${player.isOnline ? 'fill-emerald-400 text-emerald-400 animate-pulse' : 'fill-muted-foreground text-muted-foreground'}`}
                                    />
                                    {player.isOnline ? t('common.online') : t('common.offline')}
                                </Badge>
                                <Badge variant="secondary" className="text-[11px] font-normal">
                                    {player.role.replace('_', ' ')}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                {player.steam_id ? `Steam ID: ${player.steam_id}` : t('admin.players.dialog_info_subtitle')}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Character Survival Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {/* Profession */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Shield className="size-3 text-blue-500" />
                                Nghề nghiệp
                            </span>
                            <span className="text-sm font-semibold mt-1 truncate">
                                {formatProfession(stats?.profession)}
                            </span>
                        </div>

                        {/* Status / Health */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Heart className="size-3 text-rose-500" />
                                Trạng thái
                            </span>
                            <div className="mt-1 flex items-center gap-1.5">
                                {isDead ? (
                                    <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                                        <Skull className="size-3.5" /> Đã tử nạn
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Sparkles className="size-3.5" /> Còn sống
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Survived Time */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Clock className="size-3 text-amber-500" />
                                Đã sống sót
                            </span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                                {formatHours(stats?.hours_survived ?? 0, 'ingame', dayLengthMinutes)}
                            </span>
                        </div>

                        {/* Zombie Kills */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Crosshair className="size-3 text-purple-500" />
                                Tiêu diệt Zombie
                            </span>
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">
                                {(stats?.zombie_kills ?? 0).toLocaleString()} xác
                            </span>
                        </div>

                        {/* Position */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between col-span-2 sm:col-span-2">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <MapPin className="size-3 text-primary" />
                                Vị trí tọa độ
                            </span>
                            <span className="text-xs font-mono font-medium mt-1 truncate">
                                {live ? `X: ${Math.round(live.x)}, Y: ${Math.round(live.y)}, Z: ${live.z}` : 'Không có tín hiệu tọa độ'}
                            </span>
                        </div>
                    </div>

                    {/* Character Traits Breakdown */}
                    <div className="rounded-xl border bg-card p-3.5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="size-3.5 text-amber-500" />
                                Đặc điểm nhân vật (Traits - {traitsList.length})
                            </h4>
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="size-3" /> {positiveTraits.length} Ưu điểm
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                                    <AlertCircle className="size-3" /> {negativeTraits.length} Nhược điểm
                                </span>
                            </div>
                        </div>

                        {traitsList.length > 0 ? (
                            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                {positiveTraits.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="size-3" /> Ưu điểm (Positive)
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {positiveTraits.map((t) => (
                                                <Badge
                                                    key={t.key}
                                                    variant="outline"
                                                    title={t.desc}
                                                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs py-1 px-2.5 font-medium gap-1.5 flex items-center shadow-xs"
                                                >
                                                    <img
                                                        src={t.iconUrl}
                                                        alt={t.label}
                                                        className="size-4.5 object-contain shrink-0"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <span>{t.label}</span>
                                                    {t.desc && <span className="text-[10px] text-muted-foreground opacity-75">({t.desc})</span>}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {negativeTraits.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                            <AlertCircle className="size-3" /> Nhược điểm (Negative)
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {negativeTraits.map((t) => (
                                                <Badge
                                                    key={t.key}
                                                    variant="outline"
                                                    title={t.desc}
                                                    className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs py-1 px-2.5 font-medium gap-1.5 flex items-center shadow-xs"
                                                >
                                                    <img
                                                        src={t.iconUrl}
                                                        alt={t.label}
                                                        className="size-4.5 object-contain shrink-0"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <span>{t.label}</span>
                                                    {t.desc && <span className="text-[10px] text-muted-foreground opacity-75">({t.desc})</span>}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherTraits.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-semibold text-muted-foreground">Đặc điểm khác</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {otherTraits.map((t) => (
                                                <Badge key={t.key} variant="secondary" className="text-xs py-1 px-2.5 font-medium gap-1.5 flex items-center">
                                                    <img
                                                        src={t.iconUrl}
                                                        alt={t.label}
                                                        className="size-4.5 object-contain shrink-0"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <span>{t.label}</span>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                                Chưa có dữ liệu đặc điểm (traits) của nhân vật này.
                            </div>
                        )}
                    </div>

                    {/* Skills Breakdown */}
                    <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="size-3.5 text-amber-500" />
                                Kỹ năng nhân vật ({skillEntries.length})
                            </h4>
                            <span className="text-[11px] text-muted-foreground">Cấp tối đa: 10</span>
                        </div>

                        {skillEntries.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                                {skillEntries.map(([skillName, level]) => (
                                    <div
                                        key={skillName}
                                        className="rounded-lg border border-border/50 bg-background/50 p-2.5 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium truncate">{skillName}</span>
                                            <span className="font-bold tabular-nums text-primary">
                                                Lv {level}/10
                                            </span>
                                        </div>
                                        {/* Skill progress bar */}
                                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                                style={{ width: `${Math.min(100, (level / 10) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                                Chưa có dữ liệu kỹ năng ingame (sẽ tự động cập nhật sau khi đồng bộ snapshot máy chủ).
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {player.isOnline && (
                            <Button variant="outline" size="sm" asChild className="gap-1.5">
                                <Link href={`/admin/players/${player.username}/inventory`}>
                                    <Backpack className="size-3.5" />
                                    Xem kho đồ
                                </Link>
                            </Button>
                        )}
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                            <Link href={`/rankings/${player.username}`}>
                                <ExternalLink className="size-3.5" />
                                Hồ sơ công khai
                            </Link>
                        </Button>
                    </div>
                    <DialogClose asChild>
                        <Button variant="secondary" size="sm">
                            {t('common.close')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
