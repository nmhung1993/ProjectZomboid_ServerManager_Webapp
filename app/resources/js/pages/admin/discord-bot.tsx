import { Head, router } from '@inertiajs/react';
import { Bot, ChevronRight, Send, X } from 'lucide-react';
import { useState } from 'react';
import { fetchAction } from '@/lib/fetch-action';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type { BreadcrumbItem } from '@/types';

type ChannelConfig = {
    channel_id: string | null;
    thread_id: string | null;
    role_ids: string[];
};

type NotificationChannels = {
    server: ChannelConfig;
    backup: ChannelConfig;
    player: ChannelConfig;
    notification: ChannelConfig;
};

type Settings = {
    has_bot_token: boolean;
    bot_token_masked: string | null;
    enabled: boolean;
    server_id: string | null;
    channel_id: string | null;
    thread_id: string | null;
    role_ids: string[];
    enabled_events: string[];
    notification_channels: NotificationChannels | null;
};

type EventConfig = {
    label: string;
    default: boolean;
    group: string;
};

type Props = {
    settings: Settings;
    available_events: Record<string, EventConfig>;
};

const GROUPS = ['server', 'backup', 'player', 'notification'] as const;

const GROUP_LABELS: Record<string, string> = {
    server: 'Server',
    backup: 'Sao lưu',
    player: 'Người chơi',
    notification: 'Thông báo',
};

function RoleInput({
    roleIds,
    onChange,
}: {
    roleIds: string[];
    onChange: (ids: string[]) => void;
}) {
    const [input, setInput] = useState('');

    function add() {
        const trimmed = input.trim();
        if (trimmed && !roleIds.includes(trimmed)) {
            onChange([...roleIds, trimmed]);
        }
        setInput('');
    }

    return (
        <div className="space-y-2">
            <Label>ID Vai trò (đề cập)</Label>
            <div className="flex items-center gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder="Ví dụ: 123456789012345678"
                />
                <Button variant="outline" size="sm" onClick={add} type="button">
                    Thêm vai trò
                </Button>
            </div>
            {roleIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {roleIds.map((rid) => (
                        <span
                            key={rid}
                            className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-accent/50 px-2 py-1 text-xs font-medium"
                        >
                            <span className="font-mono">{rid}</span>
                            <button
                                type="button"
                                onClick={() =>
                                    onChange(roleIds.filter((r) => r !== rid))
                                }
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DiscordBot({ settings, available_events }: Props) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('admin.discord_bot.title'), href: '/admin/discord_bot' },
    ];

    const [botToken, setBotToken] = useState('');
    const [showTokenInput, setShowTokenInput] = useState(
        !settings.has_bot_token,
    );
    const [enabled, setEnabled] = useState(settings.enabled);
    const [serverId, setServerId] = useState(settings.server_id ?? '');
    const [channels, setChannels] = useState<NotificationChannels>(() => {
        const def: ChannelConfig = {
            channel_id: settings.channel_id ?? '',
            thread_id: settings.thread_id ?? '',
            role_ids: settings.role_ids,
        };
        const saved: NotificationChannels = settings.notification_channels ?? {
            server: { channel_id: '', thread_id: '', role_ids: [] },
            backup: { channel_id: '', thread_id: '', role_ids: [] },
            player: { channel_id: '', thread_id: '', role_ids: [] },
            notification: { channel_id: '', thread_id: '', role_ids: [] },
        };
        return {
            server: saved.server ?? { ...def },
            backup: saved.backup ?? { ...def },
            player: saved.player ?? { ...def },
            notification: saved.notification ?? { ...def },
        };
    });
    const [enabledEvents, setEnabledEvents] = useState<string[]>(
        settings.enabled_events,
    );
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const allEventKeys = Object.keys(available_events);
    const allSelected = allEventKeys.length === enabledEvents.length;

    // Group events by their group
    const groupedEvents: Record<string, [string, EventConfig][]> = {};
    for (const [key, config] of Object.entries(available_events)) {
        if (!groupedEvents[config.group]) {
            groupedEvents[config.group] = [];
        }
        groupedEvents[config.group].push([key, config]);
    }

    function updateChannelGroup(
        group: keyof NotificationChannels,
        field: keyof ChannelConfig,
        value: string | string[],
    ) {
        setChannels((prev) => ({
            ...prev,
            [group]: { ...prev[group], [field]: value },
        }));
    }

    function toggleEvent(eventKey: string, checked: boolean) {
        setEnabledEvents((prev) =>
            checked
                ? prev.includes(eventKey)
                    ? prev
                    : [...prev, eventKey]
                : prev.filter((e) => e !== eventKey),
        );
    }

    function selectAll() {
        setEnabledEvents(allEventKeys);
    }

    function deselectAll() {
        setEnabledEvents([]);
    }

    async function save() {
        setSaving(true);
        const data: Record<string, unknown> = {
            enabled,
            server_id: serverId || null,
            enabled_events: enabledEvents,
            notification_channels: channels,
        };

        if (showTokenInput && botToken) {
            data.bot_token = botToken;
        } else if (showTokenInput && !botToken && settings.has_bot_token) {
            data.bot_token = null;
        }

        await fetchAction('/admin/discord_bot', {
            method: 'PATCH',
            data,
            successMessage: t('admin.discord_bot.toast_settings_saved'),
        });
        setSaving(false);
        router.reload();
    }

    async function sendTest() {
        setTesting(true);
        const data: Record<string, unknown> = {
            server_id: serverId || null,
            channel_id: settings.channel_id,
            thread_id: settings.thread_id,
            role_ids: settings.role_ids,
        };

        if (showTokenInput && botToken) {
            data.bot_token = botToken;
        }

        const result = await fetchAction('/admin/discord_bot/test', {
            data,
            successMessage: t('admin.discord_bot.toast_test_sent'),
        });
        setTesting(false);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.discord_bot.title')} />
            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t('admin.discord_bot.title')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('admin.discord_bot.description')}
                    </p>
                </div>

                {/* Global Settings Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="size-5" />
                            Cài đặt chung
                        </CardTitle>
                        <CardDescription>
                            Token bot và trạng thái bật/tắt
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Bot Token */}
                        <div className="space-y-2">
                            <Label htmlFor="bot-token">
                                {t('admin.discord_bot.bot_token_label')}
                            </Label>
                            {settings.has_bot_token && !showTokenInput ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={
                                            settings.bot_token_masked ?? ''
                                        }
                                        disabled
                                        className="font-mono"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowTokenInput(true)}
                                    >
                                        {t('admin.discord_bot.change_token')}
                                    </Button>
                                </div>
                            ) : (
                                <Input
                                    id="bot-token"
                                    type="password"
                                    value={botToken}
                                    onChange={(e) =>
                                        setBotToken(e.target.value)
                                    }
                                    placeholder={t(
                                        'admin.discord_bot.bot_token_placeholder',
                                    )}
                                    autoComplete="off"
                                />
                            )}
                        </div>

                        {/* Server ID */}
                        <div className="space-y-2">
                            <Label htmlFor="server-id">
                                {t('admin.discord_bot.server_id_label')}
                            </Label>
                            <Input
                                id="server-id"
                                value={serverId}
                                onChange={(e) => setServerId(e.target.value)}
                                placeholder={t(
                                    'admin.discord_bot.server_id_placeholder',
                                )}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('admin.discord_bot.server_id_description')}
                            </p>
                        </div>

                        <Separator />

                        {/* Enable/Disable */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="bot-enabled">
                                    {t('admin.discord_bot.enable_label')}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        'admin.discord_bot.enable_description',
                                    )}
                                </p>
                            </div>
                            <Switch
                                id="bot-enabled"
                                checked={enabled}
                                onCheckedChange={setEnabled}
                            />
                        </div>

                        <Separator />

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Button onClick={save} disabled={saving}>
                                {saving
                                    ? t('common.saving')
                                    : t('admin.discord_bot.save_settings')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={sendTest}
                                disabled={testing}
                            >
                                <Send className="mr-1.5 size-4" />
                                {testing
                                    ? t('admin.discord_bot.sending')
                                    : t('admin.discord_bot.send_test')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Per-Group Channel Config + Events */}
                {GROUPS.map((group) => {
                    const cfg = channels[group];
                    const groupEvents = groupedEvents[group] ?? [];
                    return (
                        <details key={group} className="group">
                            <summary className="cursor-pointer list-none">
                                <Card className="[&_svg]:open:rotate-90">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ChevronRight className="size-4 transition-transform" />
                                            {GROUP_LABELS[group]} — Kênh & Vai trò
                                        </CardTitle>
                                        <CardDescription>
                                            Cấu hình kênh, chủ đề và vai trò cho
                                            nhóm {GROUP_LABELS[group].toLowerCase()}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </summary>
                            <Card className="-mt-px rounded-t-none">
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>
                                            ID Kênh (Channel){' '}
                                            {group === 'notification' ? '' : `(${GROUP_LABELS[group]})`}
                                        </Label>
                                        <Input
                                            value={cfg.channel_id ?? ''}
                                            onChange={(e) =>
                                                updateChannelGroup(
                                                    group,
                                                    'channel_id',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Ví dụ: 123456789012345678"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>
                                            ID Chủ đề (Thread){' '}
                                            {group === 'notification' ? '' : `(${GROUP_LABELS[group]})`}{' '}
                                            (tùy chọn)
                                        </Label>
                                        <Input
                                            value={cfg.thread_id ?? ''}
                                            onChange={(e) =>
                                                updateChannelGroup(
                                                    group,
                                                    'thread_id',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Ví dụ: 123456789012345678"
                                        />
                                    </div>

                                    <RoleInput
                                        roleIds={cfg.role_ids}
                                        onChange={(ids) =>
                                            updateChannelGroup(
                                                group,
                                                'role_ids',
                                                ids,
                                            )
                                        }
                                    />

                                    {groupEvents.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-3">
                                                <Label className="text-base font-semibold">
                                                    Sự kiện {GROUP_LABELS[group]}
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Chọn sự kiện nào kích hoạt
                                                    thông báo qua kênh này
                                                </p>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {groupEvents.map(
                                                        ([key, ec]) => (
                                                            <label
                                                                key={key}
                                                                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 px-4 py-3 transition-colors hover:bg-accent/50"
                                                            >
                                                                <Checkbox
                                                                    checked={enabledEvents.includes(
                                                                        key,
                                                                    )}
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        toggleEvent(
                                                                            key,
                                                                            checked ===
                                                                                true,
                                                                        )
                                                                    }
                                                                />
                                                                <span className="text-sm font-medium">
                                                                    {ec.label}
                                                                </span>
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </details>
                    );
                })}
            </div>
        </AppLayout>
    );
}