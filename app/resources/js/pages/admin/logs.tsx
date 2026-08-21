import { Head } from '@inertiajs/react';
import { Activity, Minus, Pause, Play, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BreadcrumbItem } from '@/types';

function formatLogLine(line: string) {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-]\d{2}:\d{2}))\s*(.*)$/);

    if (!match) {
        return { timestamp: null, message: line };
    }

    const [, rawTimestamp, message] = match;
    const date = new Date(rawTimestamp);

    if (Number.isNaN(date.getTime())) {
        return { timestamp: null, message: line };
    }

    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    return {
        timestamp: formatter.format(date).replace(', ', ' '),
        message: message.trim(),
    };
}

export default function Logs({ lines: initialLines }: { lines: string[] }) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('admin.logs.title'), href: '/admin/logs' },
    ];
    const [lines, setLines] = useState(initialLines);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [tail, setTail] = useState('100');
    const [refreshing, setRefreshing] = useState(false);
    const [fontSize, setFontSize] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('pz_logs_fontsize');
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!Number.isNaN(parsed) && parsed >= 9 && parsed <= 18) {
                    return parsed;
                }
            }
            if (window.innerWidth < 768) return 10;
        }
        return 12;
    });
    const outputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            localStorage.setItem('pz_logs_fontsize', String(fontSize));
        } catch {
            // ignore localStorage write errors
        }
    }, [fontSize]);

    function fetchLogs() {
        setRefreshing(true);
        fetch(`/admin/logs/fetch?tail=${tail}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.lines) {
                    setLines(data.lines);
                }
            })
            .catch(() => {})
            .finally(() => setRefreshing(false));
    }

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, tail]);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.logs.title')} />
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-5 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('admin.logs.title')}</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {t('admin.logs.description')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Select value={tail} onValueChange={(v) => { setTail(v); }}>
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="50">{t('admin.logs.lines_label', { count: '50' })}</SelectItem>
                                <SelectItem value="100">{t('admin.logs.lines_label', { count: '100' })}</SelectItem>
                                <SelectItem value="200">{t('admin.logs.lines_label', { count: '200' })}</SelectItem>
                                <SelectItem value="500">{t('admin.logs.lines_label', { count: '500' })}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-2.5"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            {autoRefresh ? (
                                <><Pause className="mr-1 size-3.5" /> {t('admin.logs.pause')}</>
                            ) : (
                                <><Play className="mr-1 size-3.5" /> {t('admin.logs.resume')}</>
                            )}
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" onClick={fetchLogs} disabled={refreshing}>
                            <RefreshCw className={`mr-1 size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            {t('admin.logs.refresh')}
                        </Button>
                    </div>
                </div>

                <Card className="flex min-h-0 flex-1 flex-col shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 sm:p-4 sm:pb-3 gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                <Activity className="size-4 text-emerald-500" />
                                {t('admin.logs.card_title')}
                            </CardTitle>
                            <CardDescription className="text-xs">{t('admin.logs.line_count', { count: String(lines.length) })}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Font size controller +/- */}
                            <div className="flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/40 p-0.5 shadow-xs">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => setFontSize((prev) => Math.max(9, prev - 1))}
                                    disabled={fontSize <= 9}
                                    title="Giảm cỡ chữ (A-)"
                                >
                                    <Minus className="size-3" />
                                </Button>
                                <span className="min-w-[28px] text-center font-mono text-[10px] sm:text-[11px] font-medium text-foreground select-none">
                                    {fontSize}px
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => setFontSize((prev) => Math.min(18, prev + 1))}
                                    disabled={fontSize >= 18}
                                    title="Tăng cỡ chữ (A+)"
                                >
                                    <Plus className="size-3" />
                                </Button>
                            </div>

                            {autoRefresh && (
                                <Badge variant="outline" className="text-[10px] sm:text-[11px] px-1.5 py-0.5">
                                    <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                    <span className="hidden sm:inline">{t('admin.logs.auto_refresh_badge')}</span>
                                    <span className="sm:hidden">Live</span>
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-2.5 pt-0 sm:p-4 sm:pt-0">
                        <div
                            ref={outputRef}
                            style={{ fontSize: `${fontSize}px`, lineHeight: 1.55 }}
                            className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg bg-zinc-950 p-2.5 sm:p-4 font-mono select-text"
                        >
                            {lines.length > 0 ? (
                                lines.map((line, i) => {
                                    const formattedLine = formatLogLine(line);

                                    return (
                                        <div key={i} className="text-zinc-300 hover:bg-zinc-900/50 flex items-start">
                                            <span className="mr-2 sm:mr-3 select-none text-zinc-600 shrink-0">{i + 1}</span>
                                            {formattedLine.timestamp ? (
                                                <span className="mr-1.5 sm:mr-2 whitespace-nowrap text-emerald-400 shrink-0 font-medium">
                                                    {formattedLine.timestamp}
                                                </span>
                                            ) : null}
                                            <span className="break-all sm:break-normal">{formattedLine.message}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-zinc-500">{t('admin.logs.empty')}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
