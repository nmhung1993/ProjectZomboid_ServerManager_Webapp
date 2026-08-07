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
            SendDiscordBotNotification::dispatch(
                $botSettings->bot_token,
                $botSettings->channel_id,
                $botSettings->thread_id,
                $botSettings->role_ids ?? [],
                $auditLog->id,
            );
        }
    }
}
