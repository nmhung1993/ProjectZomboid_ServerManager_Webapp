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
};

type TraitInfo = {
    label: string;
    type: 'positive' | 'negative' | 'neutral';
    desc?: string;
};

const TRAITS_DATA: Record<string, TraitInfo> = {
    // Positive Traits
    AdrenalineJunkie: { label: 'Nghiện Adrenaline', type: 'positive', desc: 'Chạy nhanh hơn khi cực kỳ hoảng sợ' },
    Athletic: { label: 'Lực lưỡng', type: 'positive', desc: 'Chạy nhanh hơn, ít tiêu hao thể lực' },
    Axeman: { label: 'Chuyên gia dùng rìu', type: 'positive', desc: 'Chặt cây & vung rìu nhanh hơn' },
    Brave: { label: 'Dũng cảm', type: 'positive', desc: 'Ít bị hoảng sợ khi gặp zombie' },
    Brawler: { label: 'Đấu sĩ', type: 'positive', desc: '+1 Điểm Rìu & Vũ khí cùn dài' },
    Burglar: { label: 'Trộm xe', type: 'positive', desc: 'Có thể đấu dây điện khởi động xe ngay' },
    CatEyes: { label: 'Mắt mèo', type: 'positive', desc: 'Nhìn rõ hơn nhiều trong đêm tối' },
    Cook: { label: 'Đầu bếp', type: 'positive', desc: '+2 Điểm Nấu ăn' },
    Dextrous: { label: 'Khéo tay', type: 'positive', desc: 'Chuyển đồ đạc trong túi nhanh gấp đôi' },
    EagleEyed: { label: 'Mắt đại bàng', type: 'positive', desc: 'Tầm nhìn rộng, phát hiện mục tiêu nhanh' },
    FastHealer: { label: 'Hồi phục nhanh', type: 'positive', desc: 'Vết thương hồi phục nhanh hơn' },
    FastLearner: { label: 'Học nhanh', type: 'positive', desc: '+30% XP cho hầu hết kỹ năng' },
    FastReader: { label: 'Đọc nhanh', type: 'positive', desc: 'Đọc sách truyện nhanh hơn' },
    FirstAid: { label: 'Sơ cứu', type: 'positive', desc: '+1 Điểm Sơ cứu y tế' },
    Fishing: { label: 'Câu cá', type: 'positive', desc: '+1 Điểm Câu cá' },
    Fit: { label: 'Cân đối', type: 'positive', desc: '+2 Thể lực' },
    Gardener: { label: 'Làm vườn', type: 'positive', desc: '+1 Điểm Nông nghiệp' },
    Graceful: { label: 'Duyên dáng', type: 'positive', desc: 'Tạo ít tiếng động hơn khi di chuyển' },
    Gymnast: { label: 'VĐV thể dục', type: 'positive', desc: '+1 Điểm Đi nhẹ & Nhanh nhẹn' },
    Handy: { label: 'Khéo tay / Thợ sửa', type: 'positive', desc: '+1 Điểm Mộc, Bảo trì, xây dựng nhanh' },
    Hardy: { label: 'Bền bỉ', type: 'positive', desc: 'Thể lực hồi phục nhanh hơn' },
    Hiker: { label: 'Dã ngoại', type: 'positive', desc: '+1 Điểm Đi bẫy & Tìm kiếm' },
    Hunter: { label: 'Thợ săn', type: 'positive', desc: '+1 Điểm Bắn súng, Dùng dao, Đi bẫy' },
    Inconspicuous: { label: 'Kín đáo', type: 'positive', desc: 'Zombie ít phát hiện hơn 50%' },
    IronGut: { label: 'Bao tử sắt', type: 'positive', desc: 'Ít bị ngộ độc thực phẩm' },
    KeenHearing: { label: 'Thính tai', type: 'positive', desc: 'Tăng bán kính nhận diện zombie phía sau' },
    LightEater: { label: 'Ăn ít', type: 'positive', desc: 'Ít bị đói hơn' },
    LowThirst: { label: 'Ít khát', type: 'positive', desc: 'Ít bị khát nước hơn' },
    Lucky: { label: 'May mắn', type: 'positive', desc: 'Tăng tỉ lệ tìm thấy đồ quý hiếm' },
    Marksman: { label: 'Xạ thủ', type: 'positive', desc: '+1 Điểm Bắn súng & Nạp đạn' },
    Mechanic: { label: 'Thợ cơ khí', type: 'positive', desc: '+1 Điểm Cơ khí ô tô' },
    NightOwl: { label: 'Cú đêm', type: 'positive', desc: 'Cần ngủ ít hơn, luôn cảnh giác' },
    Nutritionist: { label: 'Chuyên gia dinh dưỡng', type: 'positive', desc: 'Thấy giá trị dinh dưỡng thức ăn' },
    Organized: { label: 'Ngăn nắp', type: 'positive', desc: '+30% sức chứa của mọi túi đồ' },
    Outdoorsman: { label: 'Người sống ngoài trời', type: 'positive', desc: 'Kháng cảm lạnh, không sợ mưa gió' },
    Packmule: { label: 'Người thồ hàng', type: 'positive', desc: 'Tăng trọng lượng mang vác' },
    Resilient: { label: 'Kháng bệnh', type: 'positive', desc: 'Giảm nguy cơ nhiễm trùng vết thương' },
    Runner: { label: 'Chạy nhanh', type: 'positive', desc: '+1 Điểm Chạy bộ' },
    Sewer: { label: 'Thợ may', type: 'positive', desc: '+1 Điểm May vá' },
    SpeedDemon: { label: 'Tay lái lụa', type: 'positive', desc: 'Lái xe nhanh hơn, lùi xe khỏe' },
    Stout: { label: 'Vạm vỡ', type: 'positive', desc: '+2 Sức mạnh, đẩy lùi zombie tốt' },
    Strong: { label: 'Khỏe như voi', type: 'positive', desc: '+4 Sức mạnh, sát thương tối đa' },
    Tailor: { label: 'Thợ may', type: 'positive', desc: '+1 Điểm May vá' },
    ThickSkinned: { label: 'Da dày', type: 'positive', desc: 'Giảm tỷ lệ bị cắn/cào rách da' },
    Wakeful: { label: 'Tỉnh táo', type: 'positive', desc: 'Cần ngủ ít hơn' },

    // Negative Traits
    Agoraphobic: { label: 'Sợ không gian rộng', type: 'negative', desc: 'Hoảng sợ khi ở ngoài trời' },
    Allergic: { label: 'Dị ứng', type: 'negative', desc: 'Dễ bị hắt hơi' },
    Asthmatic: { label: 'Hen suyễn', type: 'negative', desc: 'Mất thể lực nhanh hơn khi chạy/đánh' },
    Claustophobic: { label: 'Sợ phòng kín', type: 'negative', desc: 'Hoảng sợ khi ở trong phòng kín' },
    Clumsy: { label: 'Hậu đậu', type: 'negative', desc: 'Tạo nhiều tiếng ồn khi di chuyển' },
    Conspicuous: { label: 'Dễ bị chú ý', type: 'negative', desc: 'Zombie dễ phát hiện gấp đôi' },
    Cowardly: { label: 'Nhút nhát', type: 'negative', desc: 'Dễ hoảng loạn cực độ' },
    Deaf: { label: 'Điếc', type: 'negative', desc: 'Không nghe thấy âm thanh trong game' },
    Disorganized: { label: 'Bừa bộn', type: 'negative', desc: '-30% sức chứa của mọi túi đồ' },
    Emaciated: { label: 'Gầy còm', type: 'negative', desc: '-4 Sức mạnh, -4 Thể lực' },
    Feeble: { label: 'Yếu ớt', type: 'negative', desc: '-2 Sức mạnh' },
    HardOfHearing: { label: 'Lãng tai', type: 'negative', desc: 'Giảm tầm nghe và cảnh báo sau lưng' },
    HeartyAppetite: { label: 'Ăn nhiều', type: 'negative', desc: 'Nhanh đói hơn bình thường' },
    Hemophobic: { label: 'Sợ máu', type: 'negative', desc: 'Hoảng sợ khi người dính máu' },
    HighThirst: { label: 'Uống nhiều', type: 'negative', desc: 'Nhanh khát nước gấp đôi' },
    Hypochondriac: { label: 'Ảo tưởng bệnh', type: 'negative', desc: 'Tự phát triển triệu chứng bệnh giả' },
    Illiterate: { label: 'Mù chữ', type: 'negative', desc: 'Không thể đọc sách/tạp chí' },
    NeedsSleep: { label: 'Ham ngủ', type: 'negative', desc: 'Nhanh mệt mỏi, cần ngủ nhiều' },
    Sleepyhead: { label: 'Ham ngủ', type: 'negative', desc: 'Nhanh mệt mỏi, cần ngủ nhiều' },
    Obese: { label: 'Béo phì', type: 'negative', desc: '-2 Thể lực, chạy chậm, dễ ngã' },
    Outofshape: { label: 'Mất dáng', type: 'negative', desc: '-2 Thể lực' },
    Overweight: { label: 'Thừa cân', type: 'negative', desc: '-1 Thể lực, chạy chậm hơn' },
    Pacifist: { label: 'Bất bạo động', type: 'negative', desc: 'Giảm 25% XP vũ khí cận chiến/súng' },
    ProneToIllness: { label: 'Dễ ốm', type: 'negative', desc: 'Dễ bị cảm cúm & nhiễm bệnh' },
    RestlessSleeper: { label: 'Khó ngủ', type: 'negative', desc: 'Ngủ không sâu, thể lực hồi chậm' },
    ShortSighted: { label: 'Cận thị', type: 'negative', desc: 'Giảm tầm nhìn và phát hiện mục tiêu' },
    SlowHealer: { label: 'Hồi phục chậm', type: 'negative', desc: 'Vết thương lâu lành hơn' },
    SlowLearner: { label: 'Học chậm', type: 'negative', desc: 'Giảm 30% XP nhận được' },
    SlowReader: { label: 'Đọc chậm', type: 'negative', desc: 'Đọc sách lâu hơn' },
    Smoker: { label: 'Nghiện thuốc lá', type: 'negative', desc: 'Căng thẳng nếu không hút thuốc' },
    SundayDriver: { label: 'Lái xe rùa bò', type: 'negative', desc: 'Tốc độ xe chậm, tăng tốc kém' },
    ThinSkinned: { label: 'Da mỏng', type: 'negative', desc: 'Dễ bị cào rách da & cắn' },
    Underweight: { label: 'Thiếu cân', type: 'negative', desc: '-1 Thể lực, dễ bị xô ngã' },
    Unfit: { label: 'Thể lực kém', type: 'negative', desc: '-4 Thể lực' },
    Unlucky: { label: 'Xui xẻo', type: 'negative', desc: 'Giảm tỉ lệ tìm thấy đồ quý' },
    VeryUnderweight: { label: 'Rất thiếu cân', type: 'negative', desc: '-2 Thể lực, -2 Sức mạnh' },
    Weak: { label: 'Yếu như sên', type: 'negative', desc: '-5 Sức mạnh, mang vác ít' },
    WeakStomach: { label: 'Bụng yếu', type: 'negative', desc: 'Dễ bị ngộ độc thực phẩm nặng' },
};

function resolveTraitInfo(traitKey: string): { key: string; label: string; type: 'positive' | 'negative' | 'neutral'; desc?: string } {
    const cleanKey = traitKey.trim();
    // Direct match
    if (TRAITS_DATA[cleanKey]) {
        return { key: cleanKey, ...TRAITS_DATA[cleanKey] };
    }
    // Case-insensitive match
    for (const [k, val] of Object.entries(TRAITS_DATA)) {
        if (k.toLowerCase() === cleanKey.toLowerCase()) {
            return { key: k, ...val };
        }
    }
    // Fallback: formatted name
    const prettyName = cleanKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
    return {
        key: cleanKey,
        label: prettyName,
        type: 'neutral',
    };
}

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
    const traitsList = rawTraits.map(resolveTraitInfo);
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
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <span>{player.username}</span>
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
                                {isDead ? <Skull className="size-3 text-red-500" /> : <Heart className="size-3 text-emerald-500" />}
                                Trạng thái
                            </span>
                            <span className="text-sm font-semibold mt-1">
                                {isDead ? (
                                    <span className="text-red-500 flex items-center gap-1">Đã chết</span>
                                ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">Còn sống</span>
                                )}
                            </span>
                        </div>

                        {/* Zombie Kills */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Crosshair className="size-3 text-red-500" />
                                Zombie hạ gục
                            </span>
                            <span className="text-sm font-semibold mt-1 tabular-nums">
                                {(stats?.zombie_kills ?? 0).toLocaleString()}
                            </span>
                        </div>

                        {/* Realtime Survival */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Clock className="size-3 text-emerald-500" />
                                Giờ sống thực tế
                            </span>
                            <span className="text-sm font-semibold mt-1 tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatHours(stats?.hours_survived ?? 0, 'real', dayLengthMinutes)}
                            </span>
                        </div>

                        {/* Ingame Survival */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Activity className="size-3 text-amber-500" />
                                Giờ trong game
                            </span>
                            <span className="text-sm font-semibold mt-1 tabular-nums">
                                {((stats?.hours_survived ?? 0)).toFixed(1)}h
                            </span>
                        </div>

                        {/* Created At */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex flex-col justify-between">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Calendar className="size-3 text-violet-500" />
                                Ngày đăng ký
                            </span>
                            <span className="text-sm font-semibold mt-1 truncate">
                                {player.createdAt ? new Date(player.createdAt).toLocaleDateString() : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Live coordinates if online */}
                    {player.isOnline && live && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <MapPin className="size-4 text-emerald-500 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Tọa độ trực tiếp: </span>
                                    <span className="font-mono text-muted-foreground">
                                        X: {live.x ?? '—'}, Y: {live.y ?? '—'}, Z: {live.z ?? 0}
                                    </span>
                                    {live.is_ghost && (
                                        <Badge variant="outline" className="ml-2 text-[10px] text-amber-500 border-amber-500/30 py-0">
                                            <Ghost className="size-2.5 mr-0.5" /> Ghost
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
                                <Link href="/admin/players/map">
                                    Mở bản đồ
                                    <ExternalLink className="size-3" />
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* Character Traits Breakdown */}
                    <div className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Tag className="size-3.5 text-indigo-500" />
                                Đặc điểm nhân vật (Traits - {traitsList.length})
                            </h4>
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3" /> {positiveTraits.length} Ưu điểm
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                    <AlertCircle className="size-3" /> {negativeTraits.length} Nhược điểm
                                </span>
                            </div>
                        </div>

                        {traitsList.length > 0 ? (
                            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                {positiveTraits.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="size-3" /> Ưu điểm (Positive)
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {positiveTraits.map((t) => (
                                                <Badge
                                                    key={t.key}
                                                    variant="outline"
                                                    title={t.desc}
                                                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs py-1 px-2.5 font-medium gap-1"
                                                >
                                                    <span>{t.label}</span>
                                                    {t.desc && <span className="text-[10px] text-muted-foreground opacity-75">({t.desc})</span>}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {negativeTraits.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                            <AlertCircle className="size-3" /> Nhược điểm (Negative)
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {negativeTraits.map((t) => (
                                                <Badge
                                                    key={t.key}
                                                    variant="outline"
                                                    title={t.desc}
                                                    className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs py-1 px-2.5 font-medium gap-1"
                                                >
                                                    <span>{t.label}</span>
                                                    {t.desc && <span className="text-[10px] text-muted-foreground opacity-75">({t.desc})</span>}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherTraits.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-medium text-muted-foreground">Đặc điểm khác</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {otherTraits.map((t) => (
                                                <Badge key={t.key} variant="secondary" className="text-xs py-1 px-2.5 font-medium">
                                                    {t.label}
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
