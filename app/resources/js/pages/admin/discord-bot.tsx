import { Head, router } from '@inertiajs/react';
import { Bot, Send, X } from 'lucide-react';
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

type Settings = {
    has_bot_token: boolean;
    bot_token_masked: string | null;
    enabled: boolean;
    server_id: string | null;
    channel_id: string | null;
    thread_id: string | null;
    role_ids: string[];
    enabled_events: string[];
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

const REMINDER_EVENT = 'server.autorestart.upcoming';

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
    const [channelId, setChannelId] = useState(settings.channel_id ?? '');
    const [threadId, setThreadId] = useState(settings.thread_id ?? '');
    const [roleIds, setRoleIds] = useState<string[]>(settings.role_ids);
    const [roleInput, setRoleInput] = useState('');
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

    function addRole() {
        const trimmed = roleInput.trim();
        if (trimmed && !roleIds.includes(trimmed)) {
            setRoleIds((prev) => [...prev, trimmed]);
        }
        setRoleInput('');
    }

    function removeRole(roleId: string) {
        setRoleIds((prev) => prev.filter((r) => r !== roleId));
    }

    async function save() {
        setSaving(true);
        const data: Record<string, unknown> = {
            enabled,
            server_id: serverId || null,
            channel_id: channelId || null,
            thread_id: threadId || null,
            role_ids: roleIds,
            enabled_events: enabledEvents,
        };

        if (showTokenInput && botToken) {
            data.bot_token = botToken;
        } else if (showTokenInput && !botToken && settings.has_bot_token) {
            // User cleared the token
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
            channel_id: channelId || null,
            thread_id: threadId || null,
            role_ids: roleIds,
        };

        // Send the current token if the user is entering a new one
        if (showTokenInput && botToken) {
            data.bot_token = botToken;
        }

        const result = await fetchAction('/admin/discord_bot/test', {
            data,
            successMessage: t('admin.discord_bot.toast_test_sent'),
        });
        setTesting(false);
        if (result && !result.success) {
            // Error toast is already shown by fetchAction
        }
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

                {/* Settings Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="size-5" />
                            {t('admin.discord_bot.settings_title')}
                        </CardTitle>
                        <CardDescription>
                            {t('admin.discord_bot.settings_description')}
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
                                        value={settings.bot_token_masked ?? ''}
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

                        <Separator />

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

                        {/* Channel ID */}
                        <div className="space-y-2">
                            <Label htmlFor="channel-id">
                                {t('admin.discord_bot.channel_id_label')}
                            </Label>
                            <Input
                                id="channel-id"
                                value={channelId}
                                onChange={(e) => setChannelId(e.target.value)}
                                placeholder={t(
                                    'admin.discord_bot.channel_id_placeholder',
                                )}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('admin.discord_bot.channel_id_description')}
                            </p>
                        </div>

                        {/* Thread ID */}
                        <div className="space-y-2">
                            <Label htmlFor="thread-id">
                                {t('admin.discord_bot.thread_id_label')}
                            </Label>
                            <Input
                                id="thread-id"
                                value={threadId}
                                onChange={(e) => setThreadId(e.target.value)}
                                placeholder={t(
                                    'admin.discord_bot.thread_id_placeholder',
                                )}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('admin.discord_bot.thread_id_description')}
                            </p>
                        </div>

                        {/* Role IDs */}
                        <div className="space-y-2">
                            <Label htmlFor="role-id">
                                {t('admin.discord_bot.role_ids_label')}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="role-id"
                                    value={roleInput}
                                    onChange={(e) =>
                                        setRoleInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addRole();
                                        }
                                    }}
                                    placeholder={t(
                                        'admin.discord_bot.role_ids_placeholder',
                                    )}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addRole}
                                >
                                    {t('admin.discord_bot.add_role')}
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('admin.discord_bot.role_ids_description')}
                            </p>
                            {roleIds.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {roleIds.map((roleId) => (
                                        <span
                                            key={roleId}
                                            className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-accent/50 px-2 py-1 text-xs font-medium"
                                        >
                                            <span className="font-mono">
                                                {roleId}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeRole(roleId)
                                                }
                                                className="text-muted-foreground hover:text-foreground"
                                                aria-label={t(
                                                    'admin.discord_bot.remove_role',
                                                )}
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Enable/Disable */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="bot-enabled">
                                    {t('admin.discord_bot.enable_label')}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('admin.discord_bot.enable_description')}
                                </p>
                            </div>
                            <Switch
                                id="bot-enabled"
                                checked={enabled}
                                onCheckedChange={setEnabled}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="bot-reminder-enabled">
                                    {t(
                                        'admin.discord_bot.reminder_enable_label',
                                    )}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        'admin.discord_bot.reminder_enable_description',
                                    )}
                                </p>
                            </div>
                            <Switch
                                id="bot-reminder-enabled"
                                checked={enabledEvents.includes(REMINDER_EVENT)}
                                onCheckedChange={(checked) =>
                                    toggleEvent(REMINDER_EVENT, checked)
                                }
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

                {/* Event Selection Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    {t('admin.discord_bot.events_title')}
                                </CardTitle>
                                <CardDescription>
                                    {t('admin.discord_bot.events_description')}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={selectAll}
                                    disabled={allSelected}
                                >
                                    {t('admin.discord_bot.select_all')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={deselectAll}
                                    disabled={enabledEvents.length === 0}
                                >
                                    {t('admin.discord_bot.deselect_all')}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Object.entries(groupedEvents).map(
                            ([group, events]) => (
                                <div key={group}>
                                    <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                        {group}
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {events.map(([key, config]) => (
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
                                                            checked === true,
                                                        )
                                                    }
                                                />
                                                <span className="text-sm font-medium">
                                                    {config.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ),
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
