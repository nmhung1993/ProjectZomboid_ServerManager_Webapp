<?php

namespace App\Observers;

use App\Jobs\SendDiscordBotNotification;
use App\Jobs\SendDiscordWebhookNotification;
use App\Models\AuditLog;
use App\Models\DiscordBotSetting;
use App\Models\DiscordWebhookSetting;

class AuditLogObserver
{
    /**
     * Prevent audit log deletion to preserve the compliance trail.
     */
    public function deleting(AuditLog $auditLog): never
    {
        throw new \RuntimeException('Audit logs cannot be deleted.');
    }

    public function created(AuditLog $auditLog): void
    {
        $webhookSettings = DiscordWebhookSetting::instance();

        if ($webhookSettings->shouldNotify($auditLog->action)) {
            SendDiscordWebhookNotification::dispatch(
                $webhookSettings->webhook_url,
                $auditLog->id,
            );
        }

        $botSettings = DiscordBotSetting::instance();

        if ($botSettings->shouldNotify($auditLog->action)) {
            $group = DiscordBotSetting::groupForAction($auditLog->action);
            $cfg = $botSettings->channelConfigFor($group);

            SendDiscordBotNotification::dispatch(
                $botSettings->bot_token,
                $cfg['channel_id'] ?? $botSettings->channel_id,
                $cfg['thread_id'] ?? $botSettings->thread_id,
                $cfg['role_ids'] ?? $botSettings->role_ids ?? [],
                $auditLog->id,
            );
        }
    }
}
