<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DiscordBotService
{
    /**
     * Maps audit actions to Discord notification configuration.
     *
     * @var array<string, array{icon: string, title: string}>
     */
    private const ACTION_CONFIG = [
        // Server
        'server.start' => ['icon' => '🟢', 'title' => 'Máy chủ đang khởi động'],
        'server.stop' => ['icon' => '🔴', 'title' => 'Máy chủ đã dừng'],
        'server.stop.scheduled' => ['icon' => '⏰', 'title' => 'Lên lịch dừng máy chủ'],
        'server.stop.executed' => ['icon' => '🔴', 'title' => 'Đã dừng máy chủ'],
        'server.restart' => ['icon' => '🔄', 'title' => 'Khởi động lại máy chủ'],
        'server.restart.scheduled' => ['icon' => '⏰', 'title' => 'Lên lịch khởi động lại'],
        'server.restart.executed' => ['icon' => '🔄', 'title' => 'Đang khởi động lại máy chủ'],
        'server.start.completed' => ['icon' => '✅', 'title' => 'Máy chủ đã sẵn sàng'],
        'server.restart.completed' => ['icon' => '✅', 'title' => 'Máy chủ đã sẵn sàng'],
        'server.save' => ['icon' => '💾', 'title' => 'Đã lưu thế giới'],
        'server.wipe' => ['icon' => '⚠️', 'title' => 'Bắt đầu xóa dữ liệu'],
        'server.wipe.scheduled' => ['icon' => '⏰', 'title' => 'Lên lịch xóa dữ liệu'],
        'server.wipe.executed' => ['icon' => '🗑️', 'title' => 'Đang xóa dữ liệu'],
        'server.wipe.completed' => ['icon' => '✅', 'title' => 'Máy chủ online (sau xóa dữ liệu)'],
        'server.autorestart.upcoming' => ['icon' => '⚠️', 'title' => 'Máy chủ sắp tự động khởi động lại'],
        'server.autorestart.scheduled' => ['icon' => '⏰', 'title' => 'Đã lên lịch tự động khởi động lại'],
        'server.update' => ['icon' => '🔄', 'title' => 'Đang cập nhật máy chủ'],
        'server.update.scheduled' => ['icon' => '⏰', 'title' => 'Lên lịch cập nhật'],
        'server.update.executed' => ['icon' => '🔄', 'title' => 'Bắt đầu cập nhật'],
        'server.update.completed' => ['icon' => '✅', 'title' => 'Máy chủ online (sau cập nhật)'],
        'server.branch.changed' => ['icon' => '🌿', 'title' => 'Đã đổi nhánh Steam'],
        'respawn_delay.update' => ['icon' => '⏱️', 'title' => 'Cập nhật thời gian hồi sinh'],
        'respawn_delay.reset' => ['icon' => '🔄', 'title' => 'Reset thời gian hồi sinh'],
        'safezone.config.update' => ['icon' => '🛡️', 'title' => 'Cập nhật khu vực an toàn'],
        'safezone.zone.create' => ['icon' => '🛡️', 'title' => 'Đã tạo khu vực an toàn'],
        'safezone.zone.delete' => ['icon' => '🛡️', 'title' => 'Đã xóa khu vực an toàn'],
        'safezone.violation.detected' => ['icon' => '🚨', 'title' => 'Phát hiện vi phạm PvP'],
        'safezone.violation.dismissed' => ['icon' => 'ℹ️', 'title' => 'Đã bỏ qua vi phạm PvP'],
        'safezone.violation.actioned' => ['icon' => '🔨', 'title' => 'Đã xử lý vi phạm PvP'],
        'shop.currency.awarded' => ['icon' => '💰', 'title' => 'Đã thưởng tiền tệ'],
        'shop.item.create' => ['icon' => '🛒', 'title' => 'Tạo vật phẩm cửa hàng'],
        'shop.item.update' => ['icon' => '🛒', 'title' => 'Cập nhật vật phẩm'],
        'shop.item.delete' => ['icon' => '🛒', 'title' => 'Xóa vật phẩm'],
        'shop.bundle.create' => ['icon' => '📦', 'title' => 'Tạo gói vật phẩm'],
        'shop.bundle.delete' => ['icon' => '📦', 'title' => 'Xóa gói vật phẩm'],
        'shop.promotion.create' => ['icon' => '🏷️', 'title' => 'Tạo khuyến mãi'],
        'shop.promotion.delete' => ['icon' => '🏷️', 'title' => 'Xóa khuyến mãi'],

        // Backup
        'backup.create' => ['icon' => '💾', 'title' => 'Đang tạo bản sao lưu'],
        'backup.created' => ['icon' => '✅', 'title' => 'Sao lưu hoàn tất'],
        'backup.rollback.initiated' => ['icon' => '🔄', 'title' => 'Bắt đầu khôi phục'],
        'backup.rollback' => ['icon' => '🔄', 'title' => 'Đã khôi phục bản sao lưu'],
        'backup.rollback.scheduled' => ['icon' => '⏰', 'title' => 'Lên lịch khôi phục'],
        'backup.rollback.executed' => ['icon' => '✅', 'title' => 'Khôi phục hoàn tất'],
        'backup.delete' => ['icon' => '🗑️', 'title' => 'Đã xóa bản sao lưu'],

        // Player
        'player.kick' => ['icon' => '👢', 'title' => 'Đã kick người chơi'],
        'player.ban' => ['icon' => '🔨', 'title' => 'Đã cấm người chơi'],

        // Notification
        'discord.webhook.update' => ['icon' => '⚙️', 'title' => 'Cập nhật cài đặt webhook'],
        'discord.bot.update' => ['icon' => '⚙️', 'title' => 'Cập nhật cài đặt bot'],
    ];

    /**
     * Send a flat concise notification for an audit log entry.
     */
    public function sendNotification(
        string $botToken,
        string $channelId,
        ?string $threadId,
        array $roleIds,
        AuditLog $auditLog,
    ): void {
        $config = self::ACTION_CONFIG[$auditLog->action] ?? null;

        if (! $config) {
            return;
        }

        $mentions = $this->buildRoleMentions($roleIds);
        $flatMsg = $this->buildFlatMessage($auditLog, $config);
        $content = $mentions ? "{$mentions} {$flatMsg}" : $flatMsg;

        $this->send($botToken, $channelId, $threadId, [
            'content' => $content,
        ]);
    }

    /**
     * Send a test message to verify the bot token and channel work.
     *
     * @return array{success: bool, error?: string}
     */
    public function sendTestMessage(
        string $botToken,
        string $channelId,
        ?string $threadId,
        array $roleIds = [],
    ): array {
        $mentions = $this->buildRoleMentions($roleIds);
        $testMsg = '🔔 **Kiểm tra kết nối Discord Bot thành công!**';
        $content = $mentions ? "{$mentions} {$testMsg}" : $testMsg;

        return $this->send($botToken, $channelId, $threadId, [
            'content' => $content,
        ]);
    }

    /**
     * Build a short flat line message from audit log.
     */
    public function buildFlatMessage(AuditLog $auditLog, ?array $config = null): string
    {
        $cfg = $config ?? self::ACTION_CONFIG[$auditLog->action] ?? ['icon' => '📢', 'title' => $auditLog->action];
        $icon = $cfg['icon'] ?? '📢';
        $title = $cfg['title'] ?? $auditLog->action;

        $msg = "{$icon} **{$title}**";

        if ($auditLog->target) {
            $msg .= ": `{$auditLog->target}`";
        }

        $details = $auditLog->details ?? [];
        if (isset($details['message']) && $details['message'] !== '') {
            $msg .= " — {$details['message']}";
        } elseif (isset($details['reason']) && $details['reason'] !== '') {
            $msg .= " — Lý do: {$details['reason']}";
        }

        return $msg;
    }

    /**
     * Build role mention string from role IDs.
     *
     * @param  array<int, string>  $roleIds
     */
    private function buildRoleMentions(array $roleIds): string
    {
        $mentions = array_filter(array_map(
            fn (string $id) => "<@&{$id}>",
            $roleIds,
        ));

        return $mentions ? implode(' ', $mentions) : '';
    }

    /**
     * Send a payload to the Discord bot API.
     *
     * @param  array<string, mixed>  $payload
     * @return array{success: bool, error?: string}
     */
    private function send(string $botToken, string $channelId, ?string $threadId, array $payload): array
    {
        $targetId = $threadId ?: $channelId;

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bot {$botToken}",
            ])
                ->timeout(10)
                ->retry(2, 1000)
                ->post("https://discord.com/api/v10/channels/{$targetId}/messages", $payload);

            if ($response->successful() || $response->status() === 204) {
                return ['success' => true];
            }

            $error = "Discord returned HTTP {$response->status()}";
            Log::warning('Discord bot message failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return ['success' => false, 'error' => $error];
        } catch (\Throwable $e) {
            Log::warning('Discord bot error', [
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}