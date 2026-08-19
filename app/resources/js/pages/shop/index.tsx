import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from '@/hooks/use-translation';
import {
    Activity,
    ArrowDownToLine,
    CheckCircle,
    Clock,
    Coins,
    Computer,
    Cpu,
    Disc,
    HardDrive,
    Loader2,
    Monitor,
    Package,
    Radio,
    Search,
    ShoppingBag,
    Sliders,
    Sparkles,
    Star,
    Tag,
    Terminal,
    Tv,
    Volume2,
    VolumeX,
    Wifi,
    X,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import PublicLayout from '@/layouts/public-layout';
import { fetchAction } from '@/lib/fetch-action';
import type { DepositResult, PurchaseStatusResponse, ShopBundle, ShopCategory, ShopItem, ShopPromotion } from '@/types/server';

// ── Helpers ──────────────────────────────────────────────────────────

type ActivePromotion = Pick<ShopPromotion, 'name' | 'code' | 'type' | 'value' | 'ends_at'>;

function coin(value: string | number): number {
    return Math.round(typeof value === 'string' ? parseFloat(value) : value);
}

function bundleItemsTotal(bundle: ShopBundle): number {
    return bundle.items.reduce((sum, i) => sum + coin(i.price) * i.pivot.quantity, 0);
}

// ── Shared Components ────────────────────────────────────────────────

function ItemIcon({ src, name, size = 48, retro = false }: { src: string; name: string; size?: number; retro?: boolean }) {
    return (
        <div className={`relative flex items-center justify-center ${retro ? 'bg-black/30 border border-emerald-500/30 p-1.5 rounded-sm' : ''}`}>
            <img
                src={src}
                alt={name}
                width={size}
                height={size}
                className={`object-contain ${retro ? 'filter contrast-125' : 'rounded'}`}
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/items/placeholder.svg'; }}
            />
        </div>
    );
}

function CoinPrice({ amount, size = 'md', className = '', retro = false }: { amount: number; size?: 'sm' | 'md' | 'lg'; className?: string; retro?: boolean }) {
    const iconSize = size === 'lg' ? 'size-4' : size === 'md' ? 'size-3.5' : 'size-3';
    const textSize = size === 'lg' ? 'text-lg font-bold' : size === 'md' ? 'text-sm font-semibold' : 'text-xs font-medium';
    return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
            <Coins className={`${iconSize} ${retro ? 'text-amber-400' : 'text-amber-500'}`} />
            <span className={`tabular-nums font-mono ${textSize}`}>{amount} COINS</span>
        </span>
    );
}

function BundleIcons({ items, size = 28 }: { items: ShopBundle['items']; size?: number }) {
    const sorted = [...items].sort((a, b) => (a.icon ? 0 : 1) - (b.icon ? 0 : 1));
    const shown = sorted.slice(0, 4);
    const extra = items.length - 4;
    const px = size === 28 ? 'size-7' : 'size-9';
    const overlap = size === 28 ? '-space-x-2' : '-space-x-3';
    const borderW = size === 28 ? 'border-2' : 'border-2';
    return (
        <div className={`flex ${overlap}`}>
            {shown.map((item) => (
                <img
                    key={item.id}
                    src={item.icon || '/images/items/placeholder.svg'}
                    alt={item.name}
                    className={`${px} rounded-full ${borderW} border-background bg-muted object-contain p-0.5`}
                />
            ))}
            {extra > 0 && (
                <div className={`flex ${px} items-center justify-center rounded-full ${borderW} border-background bg-muted text-[10px] font-medium`}>
                    +{extra}
                </div>
            )}
        </div>
    );
}

function DiscountBadge({ percent, className = '', retro = false }: { percent: number; className?: string; retro?: boolean }) {
    if (percent <= 0) return null;
    if (retro) {
        return (
            <span className={`border border-red-500 bg-red-950/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest ${className}`}>
                SALE -{percent}%
            </span>
        );
    }
    return (
        <Badge variant="default" className={`bg-green-600 text-xs ${className}`}>
            -{percent}%
        </Badge>
    );
}

// ── Promo Ribbon ─────────────────────────────────────────────────────

function PromoRibbon({ promotions, retro = false }: { promotions: ActivePromotion[]; retro?: boolean }) {
    if (promotions.length === 0) return null;

    if (retro) {
        return (
            <div className="rounded-sm border-2 border-[#555] bg-[#000080] p-2.5 text-white shadow-inner font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-1.5">
                    <span className="font-bold text-yellow-300 flex items-center gap-1.5">
                        <Sparkles className="size-3.5" /> *** KNOX BBS BULLETIN: ACTIVE PROMO CODES ***
                    </span>
                    <span className="text-[10px] text-zinc-300">JULY 1993 DISPATCH</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {promotions.map((p) => (
                        <div key={p.code} className="flex items-center gap-2 rounded bg-black/40 border border-white/20 px-2 py-1">
                            <Tag className="size-3 text-amber-400" />
                            <span className="font-bold text-amber-300">{p.code}</span>
                            <span className="text-zinc-300">({p.type === 'percentage' ? `-${p.value}%` : `-${p.value} Coins`})</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Tag className="size-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">Khuyến Mãi Đang Diễn Ra</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {promotions.map((p) => (
                        <Badge key={p.code} variant="secondary" className="gap-1.5 text-xs font-mono font-bold">
                            <span>{p.code}</span>
                            <span className="text-muted-foreground font-normal">
                                {p.type === 'percentage' ? `-${p.value}%` : `-${p.value} Coins`}
                            </span>
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Props ────────────────────────────────────────────────────────────

interface Props {
    categories: ShopCategory[];
    items: ShopItem[];
    bundles: ShopBundle[];
    activePromotions: ActivePromotion[];
    balance: number | null;
    availableBalance: number | null;
    hasPzAccount: boolean;
    pendingDeposit: boolean;
    lastDepositResult: DepositResult | null;
}

export default function ShopIndex({
    categories,
    items,
    bundles,
    activePromotions,
    balance: initialBalance,
    availableBalance: initialAvailableBalance,
    hasPzAccount,
    pendingDeposit: initialPendingDeposit,
    lastDepositResult: initialLastDepositResult,
}: Props) {
    const { auth } = usePage().props;
    const isAuthenticated = !!auth.user;

    // ── State ────────────────────────────────────────────────────────
    const [filter, setFilter] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [buyItem, setBuyItem] = useState<ShopItem | null>(null);
    const [buyBundle, setBuyBundle] = useState<ShopBundle | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(initialBalance);
    const [availableBalance, setAvailableBalance] = useState(initialAvailableBalance);
    const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);

    // 1993 Retro Computer Aesthetic State
    const [retroMode, setRetroMode] = useState(true);
    const [crtScanlines, setCrtScanlines] = useState(true);
    const [crtPalette, setCrtPalette] = useState<'vga' | 'green' | 'amber'>('vga');
    const [soundEnabled, setSoundEnabled] = useState(false);

    // Deposit state
    const [depositLoading, setDepositLoading] = useState(false);
    const [pendingDeposit, setPendingDeposit] = useState(initialPendingDeposit);
    const [lastDepositResult, setLastDepositResult] = useState(initialLastDepositResult);
    const [depositCooldown, setDepositCooldown] = useState(0);
    const [depositError, setDepositError] = useState<string | null>(null);
    const dismissedResultIds = useRef<Set<string>>(new Set());
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const purchasePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { t } = useTranslation();

    // ── Audio Beep Effects ──
    const playBeep = useCallback((freq = 800, dur = 0.05) => {
        if (!soundEnabled || typeof window === 'undefined' || !window.AudioContext) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + dur);
        } catch {
            // Ignore audio context errors
        }
    }, [soundEnabled]);

    // ── Derived ──────────────────────────────────────────────────────
    const filteredItems = useMemo(() => {
        let result = items;
        if (activeCategory) result = result.filter((i) => i.category_id === activeCategory);
        if (filter) {
            const q = filter.toLowerCase();
            result = result.filter((i) => i.name.toLowerCase().includes(q) || i.item_type.toLowerCase().includes(q));
        }
        return result;
    }, [items, filter, activeCategory]);

    const featuredItems = useMemo(() => items.filter((i) => i.is_featured), [items]);
    const featuredBundles = useMemo(() => bundles.filter((b) => b.is_featured), [bundles]);

    // ── Sync & Effects ───────────────────────────────────────────────
    function dismissDepositResult() {
        if (lastDepositResult?.id) dismissedResultIds.current.add(lastDepositResult.id);
        setLastDepositResult(null);
    }

    useEffect(() => {
        setPendingDeposit(initialPendingDeposit);
        if (initialLastDepositResult && !dismissedResultIds.current.has(initialLastDepositResult.id)) {
            setLastDepositResult(initialLastDepositResult);
        }
        setBalance(initialBalance);
        setAvailableBalance(initialAvailableBalance);
    }, [initialPendingDeposit, initialLastDepositResult, initialBalance, initialAvailableBalance]);

    useEffect(() => {
        if (!lastDepositResult) return;
        const timer = setTimeout(dismissDepositResult, 8000);
        return () => clearTimeout(timer);
    }, [lastDepositResult]);

    useEffect(() => {
        if (!depositError || depositCooldown > 0) return;
        const timer = setTimeout(() => setDepositError(null), 8000);
        return () => clearTimeout(timer);
    }, [depositError, depositCooldown]);

    useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

    // ── Deposit Polling ──────────────────────────────────────────────
    const pollDepositStatus = useCallback(async () => {
        try {
            const res = await fetch('/shop/deposit/status', {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (!res.ok) return;
            const data = await res.json();
            setPendingDeposit(data.pendingDeposit);
            if (data.lastDepositResult && !dismissedResultIds.current.has(data.lastDepositResult.id)) {
                setLastDepositResult(data.lastDepositResult);
            }
            if (data.balance != null) setBalance(data.balance);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!pendingDeposit) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } return; }
        pollRef.current = setInterval(pollDepositStatus, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [pendingDeposit, pollDepositStatus]);

    // ── Purchase Polling ─────────────────────────────────────────────
    const pollPurchaseStatus = useCallback(async () => {
        if (!pendingPurchaseId) return;
        try {
            const res = await fetch(`/shop/purchase/${pendingPurchaseId}/status`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (!res.ok) return;
            const data: PurchaseStatusResponse = await res.json();
            if (data.status === 'completed') {
                toast.success(t('shop.purchase_completed'));
                setPendingPurchaseId(null);
                if (data.availableBalance !== undefined) setAvailableBalance(data.availableBalance);
                if (data.balance !== undefined) setBalance(data.balance);
            } else if (data.status === 'failed') {
                toast.error(data.error_message || t('shop.purchase_failed'));
                setPendingPurchaseId(null);
                if (data.availableBalance !== undefined) setAvailableBalance(data.availableBalance);
                if (data.balance !== undefined) setBalance(data.balance);
            }
        } catch { /* ignore */ }
    }, [pendingPurchaseId, t]);

    useEffect(() => {
        if (!pendingPurchaseId) { if (purchasePollRef.current) { clearInterval(purchasePollRef.current); purchasePollRef.current = null; } return; }
        purchasePollRef.current = setInterval(pollPurchaseStatus, 3000);
        return () => { if (purchasePollRef.current) clearInterval(purchasePollRef.current); };
    }, [pendingPurchaseId, pollPurchaseStatus]);

    // ── Handlers ─────────────────────────────────────────────────────
    function requireAuth(): boolean {
        if (!isAuthenticated) { router.visit('/login?redirect=/shop'); return true; }
        return false;
    }

    async function handleBuyItem() {
        if (!buyItem) return;
        playBeep(1200, 0.1);
        setLoading(true);
        const result = await fetchAction(`/shop/item/${buyItem.id}/purchase`, {
            data: { quantity, promotion_code: promoCode || undefined },
            successMessage: t('shop.delivering_item', { name: buyItem.name }),
        });
        setLoading(false);
        if (result) {
            setBuyItem(null);
            setQuantity(1);
            setPromoCode('');
            if (result.purchase_id) setPendingPurchaseId(result.purchase_id);
            if (result.availableBalance !== undefined) setAvailableBalance(result.availableBalance);
            if (result.balance !== undefined) setBalance(result.balance);
        }
    }

    async function handleBuyBundle() {
        if (!buyBundle) return;
        playBeep(1200, 0.1);
        setLoading(true);
        const result = await fetchAction(`/shop/bundle/${buyBundle.slug}/purchase`, {
            data: { promotion_code: promoCode || undefined },
            successMessage: t('shop.delivering_bundle', { name: buyBundle.name }),
        });
        setLoading(false);
        if (result) {
            setBuyBundle(null);
            setPromoCode('');
            if (result.purchase_id) setPendingPurchaseId(result.purchase_id);
            if (result.availableBalance !== undefined) setAvailableBalance(result.availableBalance);
            if (result.balance !== undefined) setBalance(result.balance);
        }
    }

    function startCooldown(seconds: number) {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        setDepositCooldown(seconds);
        cooldownRef.current = setInterval(() => {
            setDepositCooldown((prev) => {
                if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); cooldownRef.current = null; return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    async function handleDeposit() {
        playBeep(600, 0.08);
        setDepositLoading(true);
        setDepositError(null);
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        try {
            const res = await fetch('/shop/deposit', { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken, Accept: 'application/json' } });
            const json = await res.json().catch(() => ({}));
            if (res.ok) { toast.success(t('shop.deposit_request_sent')); setPendingDeposit(true); setLastDepositResult(null); }
            else if (res.status === 429) { startCooldown(parseInt(res.headers.get('Retry-After') || '60', 10)); setDepositError(t('shop.too_many_requests')); }
            else { setDepositError(json.error || json.message || `Request failed (${res.status})`); }
        } catch { setDepositError(t('shop.network_error')); }
        setDepositLoading(false);
    }

    const itemTotal = buyItem ? coin(buyItem.price) * quantity : 0;
    const canAffordItem = availableBalance === null || itemTotal <= availableBalance;
    const canAffordBundle = buyBundle ? (availableBalance === null || coin(buyBundle.price) <= availableBalance) : true;

    // Determine color scheme classes for retro mode
    const paletteClasses = {
        vga: 'bg-[#181824] text-zinc-100 border-[#4f5565]',
        green: 'bg-[#0a180a] text-emerald-400 border-emerald-900 crt-glow-green',
        amber: 'bg-[#180f05] text-amber-400 border-amber-900 crt-glow-amber',
    }[crtPalette];

    return (
        <PublicLayout>
            <Head title="Knox BBS Online Store (1993) - Zomboid Shop" />
            <div className="mx-auto max-w-7xl space-y-6 p-3 sm:p-4 lg:p-6">
                
                {/* ── Retro 1993 Computer Chassis Container ── */}
                {retroMode ? (
                    <div className="rounded-2xl border-8 border-[#d4ceb8] dark:border-[#2e2a22] bg-[#c5beaa] dark:bg-[#1e1b15] p-3 sm:p-5 shadow-2xl">
                        
                        {/* Monitor Bezel Top Header */}
                        <div className="mb-3 flex flex-wrap items-center justify-between border-b-2 border-black/20 pb-2.5 text-xs font-mono font-bold text-[#544d3c] dark:text-[#a89f89]">
                            <div className="flex items-center gap-2">
                                <Cpu className="size-4" />
                                <span className="tracking-wider">KNOX MICROSYSTEMS 486DX2/66 — MS-DOS BBS v3.2 (JULY 1993)</span>
                            </div>
                            
                            {/* LED Indicators & Controls */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-[10px]">
                                    <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                                    <span>PWR</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                    <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
                                    <span>TURBO</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                    <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
                                    <span>14.4k BBS</span>
                                </div>

                                {/* Audio Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    className="p-1 rounded bg-black/10 hover:bg-black/20 text-xs flex items-center gap-1"
                                    title="Toggle PC Speaker Sound"
                                >
                                    {soundEnabled ? <Volume2 className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="size-3.5" />}
                                </button>

                                {/* Scanlines Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setCrtScanlines(!crtScanlines)}
                                    className={`px-2 py-0.5 rounded border text-[11px] font-bold ${crtScanlines ? 'bg-black text-emerald-400 border-emerald-500' : 'bg-white/20'}`}
                                >
                                    CRT: {crtScanlines ? 'ON' : 'OFF'}
                                </button>

                                {/* Palette Toggle */}
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setCrtPalette('vga')}
                                        className={`size-4 rounded-full border ${crtPalette === 'vga' ? 'ring-2 ring-blue-400' : ''} bg-blue-600`}
                                        title="VGA 256 Color"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCrtPalette('green')}
                                        className={`size-4 rounded-full border ${crtPalette === 'green' ? 'ring-2 ring-emerald-400' : ''} bg-emerald-600`}
                                        title="Monochrome Green Phosphor"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCrtPalette('amber')}
                                        className={`size-4 rounded-full border ${crtPalette === 'amber' ? 'ring-2 ring-amber-400' : ''} bg-amber-600`}
                                        title="Amber Phosphor Glow"
                                    />
                                </div>

                                {/* Modern Mode Switcher */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRetroMode(false)}
                                    className="h-7 text-[11px] gap-1 bg-white/40 dark:bg-black/40"
                                >
                                    <Sparkles className="size-3 text-purple-500" />
                                    Giao diện Hiện đại
                                </Button>
                            </div>
                        </div>

                        {/* ── CRT Screen Display ── */}
                        <div className={`crt-screen ${crtScanlines ? 'crt-scanlines' : ''} rounded-xl border-4 border-[#333] ${paletteClasses} p-4 sm:p-6 shadow-inner space-y-6`}>
                            
                            {/* Windows 3.1 / OS-2 BBS Application Bar */}
                            <div className="rounded-t-sm border-2 border-t-white border-l-white border-b-black border-r-black bg-[#000080] px-3 py-1.5 text-white flex items-center justify-between shadow-xs font-mono">
                                <div className="flex items-center gap-2 text-xs font-bold truncate">
                                    <Computer className="size-4 text-yellow-300" />
                                    <span>KNOX TELECOMMUNICATION ONLINE MALL [BUILD: 1993.07]</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                    <span className="border border-white/40 bg-[#c0c0c0] text-black px-1.5 font-bold shadow-xs cursor-pointer">_</span>
                                    <span className="border border-white/40 bg-[#c0c0c0] text-black px-1.5 font-bold shadow-xs cursor-pointer">口</span>
                                    <span className="border border-white/40 bg-[#c0c0c0] text-black px-1.5 font-bold shadow-xs cursor-pointer">X</span>
                                </div>
                            </div>

                            {/* Retro System Menu Bar */}
                            <div className="border border-[#444] bg-[#c0c0c0] text-black px-3 py-1 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shadow-xs">
                                <div className="flex gap-3">
                                    <span className="cursor-pointer hover:underline font-bold"><u>F</u>ile</span>
                                    <span className="cursor-pointer hover:underline font-bold"><u>C</u>atalog</span>
                                    <span className="cursor-pointer hover:underline font-bold"><u>D</u>eposit</span>
                                    <span className="cursor-pointer hover:underline font-bold"><u>M</u>odem(14400)</span>
                                    <span className="cursor-pointer hover:underline font-bold"><u>H</u>elp</span>
                                </div>
                                {balance !== null && (
                                    <div className="flex items-center gap-2 bg-black text-amber-300 px-2.5 py-0.5 rounded-xs border border-amber-500/40 font-mono font-bold">
                                        <Coins className="size-3.5 text-amber-400" />
                                        <span>BANK: {coin(balance)} COINS</span>
                                        {availableBalance !== null && availableBalance < balance && (
                                            <span className="text-zinc-400 text-[11px]">(Avail: {coin(availableBalance)})</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <PromoRibbon promotions={activePromotions} retro={true} />

                            {/* ── Electronic Funds Deposit (ATM Terminal) ── */}
                            <div className="rounded-sm border-2 border-t-black border-l-black border-b-white border-r-white bg-black/40 p-4 font-mono space-y-3">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <div className="flex items-center gap-2">
                                        <HardDrive className="size-4 text-emerald-400" />
                                        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                            [+] KNOX BANKING EFT — NẠP TIỀN TỪ GAME VÀO VÍ WEB
                                        </span>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[10px] text-amber-300 border-amber-400/40">
                                        RATE: $1.00 = 1 COIN | CỌC $100 = 100 COINS
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1 text-zinc-300">
                                        <p className="font-bold text-yellow-300">&gt; HƯỚNG DẪN GỬI TIỀN VÀO TÀI KHOẢN:</p>
                                        <p>1. Cầm tiền mặt ($ / Cọc tiền) trong túi đồ nhân vật trong game.</p>
                                        <p>2. Nhấn nút "GỬI TIỀN (DEPOSIT)" bên dưới.</p>
                                        <p>3. Hệ thống sẽ quét và cộng Coins trực tiếp vào Ví.</p>
                                    </div>

                                    <div className="flex flex-col items-center justify-center gap-2 p-3 bg-black/60 border border-white/20 rounded-sm">
                                        {!isAuthenticated ? (
                                            <Button size="sm" className="win93-btn font-mono bg-[#c0c0c0] text-black hover:bg-white" onClick={() => router.visit('/login?redirect=/shop')}>
                                                &gt;&gt; ĐĂNG NHẬP TÀI KHOẢN &lt;&lt;
                                            </Button>
                                        ) : !hasPzAccount ? (
                                            <p className="text-rose-400 text-center text-xs">Vui lòng liên kết tài khoản Project Zomboid trước.</p>
                                        ) : pendingDeposit ? (
                                            <div className="flex items-center gap-2 text-amber-300">
                                                <Loader2 className="size-4 animate-spin" />
                                                <span>Đang truyền gói tin Modem... Giữ nhân vật online!</span>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={handleDeposit}
                                                disabled={depositLoading || depositCooldown > 0}
                                                className="win93-btn font-mono bg-[#c0c0c0] text-black hover:bg-white active:bg-zinc-400 font-bold"
                                            >
                                                {depositLoading ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <ArrowDownToLine className="mr-1 size-3.5" />}
                                                {depositCooldown > 0 ? `ĐỢI (${depositCooldown}s)` : 'GỬI TIỀN (DEPOSIT NOW)'}
                                            </Button>
                                        )}

                                        {depositError && (
                                            <p className="text-rose-400 text-[11px] text-center font-bold">{depositError}</p>
                                        )}
                                        {lastDepositResult && (
                                            <p className="text-emerald-400 text-[11px] text-center font-bold">
                                                {lastDepositResult.status === 'success'
                                                    ? `[NẠP THÀNH CÔNG] +${lastDepositResult.total_coins} Coins ($${lastDepositResult.money_count} mặt, ${lastDepositResult.bundle_count || 0} cọc)`
                                                    : lastDepositResult.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Featured Items & Specials ── */}
                            {(featuredItems.length > 0 || featuredBundles.length > 0) && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 border-b border-amber-500/30 pb-1 text-xs font-mono font-bold text-amber-300">
                                        <Star className="size-4 text-yellow-400" />
                                        <span>*** VẬT PHẨM NỔI BẬT / KHUYẾN MÃI ĐẶC BIỆT ***</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {featuredItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => { playBeep(900, 0.05); if (!requireAuth()) { setBuyItem(item); setQuantity(1); } }}
                                                className="win93-beveled-outset bg-[#c0c0c0] text-black p-3 flex flex-col items-center gap-1.5 text-center font-mono hover:bg-white transition-colors"
                                            >
                                                <ItemIcon src={item.icon || '/images/items/placeholder.svg'} name={item.name} retro={true} />
                                                <span className="font-bold text-xs truncate max-w-full">{item.name}</span>
                                                <CoinPrice amount={coin(item.price)} size="sm" retro={false} />
                                                <span className="bg-blue-800 text-white text-[10px] px-1.5 py-0.5 rounded-xs mt-1">[ MUA NGAY ]</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── MS-DOS Command Prompt Search & Category Filter ── */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                    <Button
                                        variant={activeCategory === null ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => { playBeep(700, 0.04); setActiveCategory(null); }}
                                        className="h-7 text-xs font-mono win93-btn"
                                    >
                                        [ ALL ]
                                    </Button>
                                    {categories.map((cat) => (
                                        <Button
                                            key={cat.id}
                                            variant={activeCategory === cat.id ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => { playBeep(700, 0.04); setActiveCategory(cat.id); }}
                                            className="h-7 text-xs font-mono win93-btn whitespace-nowrap"
                                        >
                                            {cat.name}
                                        </Button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <Terminal className="absolute left-2.5 top-2 size-3.5 text-emerald-400" />
                                    <Input
                                        placeholder="C:\KNOX\SHOP> SEARCH_ITEM..."
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="pl-8 h-8 font-mono text-xs bg-black text-emerald-400 border-emerald-500/50 rounded-xs placeholder:text-emerald-700"
                                    />
                                </div>
                            </div>

                            {/* ── Catalog Grid ── */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => { playBeep(850, 0.05); if (!requireAuth()) { setBuyItem(item); setQuantity(1); } }}
                                        className="win93-beveled-outset bg-[#c0c0c0] text-black p-3 flex flex-col items-center justify-between text-center font-mono hover:bg-white transition-transform hover:-translate-y-0.5 shadow-sm group"
                                    >
                                        <div className="w-full flex flex-col items-center gap-1.5">
                                            <ItemIcon src={item.icon || '/images/items/placeholder.svg'} name={item.name} retro={true} />
                                            <span className="font-bold text-xs line-clamp-1 group-hover:text-blue-700">{item.name}</span>
                                            {item.description && (
                                                <span className="text-[10px] text-zinc-600 line-clamp-2">{item.description}</span>
                                            )}
                                        </div>

                                        <div className="w-full mt-2 pt-1.5 border-t border-black/10 flex flex-col items-center gap-1">
                                            <CoinPrice amount={coin(item.price)} size="sm" />
                                            {item.quantity > 1 && (
                                                <span className="text-[10px] text-zinc-500">(Gói x{item.quantity})</span>
                                            )}
                                            <span className="w-full bg-[#000080] text-white text-[10px] py-0.5 rounded-xs font-bold uppercase hover:bg-blue-700">
                                                [ ĐẶT MUA ]
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {filteredItems.length === 0 && (
                                <div className="py-12 text-center font-mono text-xs text-zinc-400 space-y-1">
                                    <p>&gt; FILE NOT FOUND: 0 ITEMS MATCHING SEARCH CRITERIA.</p>
                                    <p className="text-[11px] text-zinc-500">Try checking category filter or catalog database.</p>
                                </div>
                            )}

                            {/* ── Bundles ── */}
                            {bundles.length > 0 && (
                                <div className="space-y-3 pt-4 border-t-2 border-white/20">
                                    <div className="flex items-center justify-between font-mono text-xs text-yellow-300 font-bold">
                                        <div className="flex items-center gap-2">
                                            <Package className="size-4" />
                                            <span>*** BỘ VẬT PHẨM COMBO (SURVIVAL BUNDLES) ***</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400">TIẾT KIỆM TỐI ĐA</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {bundles.map((bundle) => {
                                            const total = bundleItemsTotal(bundle);
                                            const discount = parseFloat(bundle.discount_percent ?? '0');
                                            return (
                                                <button
                                                    key={bundle.id}
                                                    type="button"
                                                    onClick={() => { playBeep(850, 0.05); if (!requireAuth()) setBuyBundle(bundle); }}
                                                    className="win93-beveled-outset bg-[#c0c0c0] text-black p-3.5 text-left font-mono hover:bg-white transition-colors"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs text-blue-900">{bundle.name}</span>
                                                        <DiscountBadge percent={discount} retro={true} />
                                                    </div>
                                                    {bundle.description && (
                                                        <p className="text-[11px] text-zinc-600 mt-1 line-clamp-1">{bundle.description}</p>
                                                    )}
                                                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-black/10">
                                                        <BundleIcons items={bundle.items} />
                                                        <div className="text-right">
                                                            {discount > 0 && (
                                                                <span className="text-[10px] text-zinc-500 line-through mr-1.5">{total}</span>
                                                            )}
                                                            <CoinPrice amount={coin(bundle.price)} size="sm" />
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Status Bar / Bottom Ticker ── */}
                            <div className="border-t border-white/20 pt-2 flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400">
                                <div className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    <span>HAYES SMARTMODEM 14.4k — CONNECTED TO KNOX BBS SERVER</span>
                                </div>
                                <span>COM1: 8-N-1 | 1993 PROJECT ZOMBOID SHOP</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Modern Sleek Mode ── */
                    <div className="space-y-6">
                        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-emerald-500/10 p-6 shadow-sm lg:p-8">
                            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{t('shop.title')}</h1>
                                    <p className="text-muted-foreground text-sm">{t('shop.description')}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setRetroMode(true)}
                                        className="gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                    >
                                        <Monitor className="size-4" />
                                        🖥️ Chuyển sang Máy tính Cũ 1993
                                    </Button>
                                    {balance !== null && (
                                        <div className="flex items-center gap-3 rounded-xl border bg-background/60 px-4 py-3">
                                            <Coins className="size-5 text-amber-500" />
                                            <div>
                                                <p className="text-xl font-bold tabular-nums">{coin(balance)} Coins</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <PromoRibbon promotions={activePromotions} />

                        {/* Modern Items grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="flex flex-col items-center gap-2 rounded-lg border border-border/50 p-4 text-center transition-colors hover:bg-accent"
                                    onClick={() => { if (!requireAuth()) { setBuyItem(item); setQuantity(1); } }}
                                >
                                    <ItemIcon src={item.icon || '/images/items/placeholder.svg'} name={item.name} />
                                    <span className="truncate text-sm font-medium">{item.name}</span>
                                    <CoinPrice amount={coin(item.price)} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Retro 1993 Purchase Item Dialog ── */}
            <Dialog open={buyItem !== null} onOpenChange={(open) => { if (!open) { setBuyItem(null); setQuantity(1); setPromoCode(''); } }}>
                <DialogContent className={retroMode ? 'win93-beveled-outset bg-[#c0c0c0] text-black font-mono border-2 border-black max-w-md' : 'max-w-md'}>
                    <DialogHeader>
                        <DialogTitle className={retroMode ? 'text-sm font-bold font-mono text-[#000080] border-b border-black/20 pb-1 flex items-center gap-1.5' : ''}>
                            {retroMode ? <Disc className="size-4" /> : null}
                            {t('shop.purchase_item')} - ORDER PROCESSING
                        </DialogTitle>
                        <DialogDescription className={retroMode ? 'text-xs text-zinc-700 font-mono' : ''}>
                            {t('shop.confirm_purchase')}
                        </DialogDescription>
                    </DialogHeader>
                    {buyItem && (
                        <div className="space-y-4">
                            <div className={`flex items-center gap-3 p-3 rounded ${retroMode ? 'bg-black/10 border border-black/20 font-mono' : 'bg-muted'}`}>
                                <ItemIcon src={buyItem.icon || '/images/items/placeholder.svg'} name={buyItem.name} size={40} retro={retroMode} />
                                <div className="flex-1 text-xs">
                                    <p className="font-bold">{buyItem.name}</p>
                                    <p className="text-zinc-600">
                                        <CoinPrice amount={coin(buyItem.price)} size="sm" /> / {t('shop.each')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 font-mono">
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('shop.quantity')}</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={buyItem.max_per_player || 100}
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className={retroMode ? 'bg-white text-black border-2 border-black h-8 text-xs' : ''}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('shop.promo_code')}</Label>
                                    <Input
                                        placeholder="OPTIONAL"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                        className={retroMode ? 'bg-white text-black border-2 border-black h-8 text-xs uppercase' : ''}
                                    />
                                </div>
                            </div>

                            <div className={`flex items-center justify-between p-2.5 rounded font-mono ${retroMode ? 'bg-[#000080] text-yellow-300 font-bold' : 'bg-muted'}`}>
                                <span className="text-xs uppercase">{t('shop.total')}:</span>
                                <CoinPrice amount={itemTotal} size="md" className="text-yellow-300" />
                            </div>

                            {!canAffordItem && (
                                <p className="text-xs font-mono text-red-600 font-bold">
                                    [!] {t('shop.insufficient_balance', { amount: String(itemTotal - coin(availableBalance!)) })}
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setBuyItem(null)} className={retroMode ? 'win93-btn font-mono bg-[#c0c0c0] text-black' : ''}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size="sm"
                            disabled={!buyItem || loading || pendingPurchaseId !== null || !canAffordItem}
                            onClick={handleBuyItem}
                            className={retroMode ? 'win93-btn font-mono bg-[#000080] text-white hover:bg-blue-900' : ''}
                        >
                            {loading ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <ShoppingBag className="mr-1 size-3.5" />}
                            {t('shop.buy_now')} (TRANSMIT)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Retro 1993 Purchase Bundle Dialog ── */}
            <Dialog open={buyBundle !== null} onOpenChange={(open) => { if (!open) { setBuyBundle(null); setPromoCode(''); } }}>
                <DialogContent className={retroMode ? 'win93-beveled-outset bg-[#c0c0c0] text-black font-mono border-2 border-black max-w-md' : 'max-w-md'}>
                    <DialogHeader>
                        <DialogTitle className={retroMode ? 'text-sm font-bold font-mono text-[#000080] border-b border-black/20 pb-1 flex items-center gap-1.5' : ''}>
                            <Package className="size-4" />
                            {t('shop.purchase_bundle')} - BUNDLE ORDER
                        </DialogTitle>
                        <DialogDescription className={retroMode ? 'text-xs text-zinc-700 font-mono' : ''}>
                            {t('shop.confirm_bundle')}
                        </DialogDescription>
                    </DialogHeader>
                    {buyBundle && (() => {
                        const total = bundleItemsTotal(buyBundle);
                        const discount = parseFloat(buyBundle.discount_percent ?? '0');
                        return (
                            <div className="space-y-4 font-mono text-xs">
                                <div className="p-2.5 rounded bg-black/10 border border-black/20">
                                    <p className="font-bold text-sm text-blue-900">{buyBundle.name}</p>
                                    {buyBundle.description && <p className="text-zinc-600 mt-1">{buyBundle.description}</p>}
                                </div>

                                <div className="space-y-1 border border-black/10 p-2 bg-white/50 rounded">
                                    <Label className="text-xs font-bold text-zinc-700">[ ITEMS IN BUNDLE ]</Label>
                                    {buyBundle.items.map((i) => (
                                        <div key={i.id} className="flex items-center justify-between text-[11px]">
                                            <span>• {i.name} {i.pivot.quantity > 1 ? `x${i.pivot.quantity}` : ''}</span>
                                            <span className="text-zinc-500">{coin(i.price) * i.pivot.quantity} Coins</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">{t('shop.promo_code')}</Label>
                                    <Input
                                        placeholder="OPTIONAL"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                        className={retroMode ? 'bg-white text-black border-2 border-black h-8 text-xs uppercase' : ''}
                                    />
                                </div>

                                <div className={`flex items-center justify-between p-2.5 rounded ${retroMode ? 'bg-[#000080] text-yellow-300 font-bold' : 'bg-muted'}`}>
                                    <span>{t('shop.total')}:</span>
                                    <CoinPrice amount={coin(buyBundle.price)} size="md" className="text-yellow-300" />
                                </div>

                                {!canAffordBundle && (
                                    <p className="text-xs text-red-600 font-bold">
                                        [!] {t('shop.insufficient_balance', { amount: String(coin(buyBundle.price) - coin(availableBalance!)) })}
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setBuyBundle(null)} className={retroMode ? 'win93-btn font-mono bg-[#c0c0c0] text-black' : ''}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size="sm"
                            disabled={!buyBundle || loading || pendingPurchaseId !== null || !canAffordBundle}
                            onClick={handleBuyBundle}
                            className={retroMode ? 'win93-btn font-mono bg-[#000080] text-white hover:bg-blue-900' : ''}
                        >
                            {loading ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <ShoppingBag className="mr-1 size-3.5" />}
                            {t('shop.buy_now')} (CONFIRM)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PublicLayout>
    );
}
