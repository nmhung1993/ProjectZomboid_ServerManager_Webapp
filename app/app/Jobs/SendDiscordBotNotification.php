<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Services\DiscordBotService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendDiscordBotNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 5;

    public function __construct(
        private readonly string $botToken,
        private readonly string $channelId,
        private readonly ?string $threadId,
        private readonly array $roleIds,
        private readonly string $auditLogId,
    ) {}

    public function handle(DiscordBotService $service): void
    {
        $auditLog = AuditLog::find($this->auditLogId);

        if (! $auditLog) {
            return;
        }

        $service->sendNotification(
            botToken: $this->botToken,
            channelId: $this->channelId,
            threadId: $this->threadId,
            roleIds: $this->roleIds,
            auditLog: $auditLog,
        );
    }
}