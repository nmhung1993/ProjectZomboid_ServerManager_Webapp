<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DiscordWebhookService
{
    private const ACTION_CONFIG = [
        'server.start' => ['color' => 0x2ECC71, 'title_vi' => 'Máy chủ khởi động'],
        'server.stop' => ['color' => 0xE74C3C, 'title_vi' => 'Máy chủ dừng'],
        'server.stop.scheduled' => ['color' => 0xE67E22, 'title_vi' => 'Lên lịch dừng máy chủ'],
        'server.stop.executed' => ['color' => 0xE74C3C, 'title_vi' => 'Đã dừng máy chủ'],
        'server.restart' => ['color' => 0x3498DB, 'title_vi' => 'Khởi động lại máy chủ'],
        'server.restart.scheduled' => ['color' => 0xE67E22, 'title_vi' => 'Lên lịch khởi động lại'],
        'server.restart.executed' => ['color' => 0x3498DB, 'title_vi' => 'Đang khởi động lại'],
        'server.start.completed' => ['color' => 0x2ECC71, 'title_vi' => 'Máy chủ sẵn sàng'],
        'server.restart.completed' => ['color' => 0x2ECC71, 'title_vi' => 'Máy chủ sẵn sàng'],
        'server.save' => ['color' => 0x2ECC71, 'title_vi' => 'Đã lưu thế giới'],
        'server.wipe' => ['color' => 0xE74C3C, 'title_vi' => 'Bắt đầu xóa dữ liệu'],
        'server.wipe.scheduled' => ['color' => 0xE67E22, 'title_vi' => 'Lên lịch xóa dữ liệu'],
        'server.wipe.executed' => ['color' => 0xE74C3C, 'title_vi' => 'Đang xóa dữ liệu'],
        'server.wipe.completed' => ['color' => 0x2ECC71, 'title_vi' => 'Máy chủ online (sau xóa dữ liệu)'],
        'server.autorestart.upcoming' => ['color' => 0x3498DB, 'title_vi' => 'Sắp khởi động lại'],
        'server.autorestart.scheduled' => ['color' => 0xE67E22, 'title_vi' => 'Đã lên lịch khởi động lại tự động'],
        'server.update' => ['color' => 0x3498DB, 'title_vi' => 'Đang cập nhật máy chủ'],
        'server.update.scheduled' => ['color' => 0xE67E22, 'title_vi' => 'Lên lịch cập nhật'],
        'server.update.executed' => ['color' => 0x3498DB, 'title_vi' => 'Bắt đầu cập nhật'],
        'server.update.completed' => ['color' => 0x2ECC71, 'title_vi' => 'Máy chủ online (sau cập nhật)'],
        'server.branch.changed' => ['color' => 0x9B59B6, 'title_vi' => 'Đã đổi nhánh Steam'],
        'respawn_delay.update' => ['color' => 0x9B59B6, 'title_vi' => 'Đã cập nhật thời gian hồi sinh'],
        'respawn_delay.reset' => ['color' => 0x3498DB, 'title_vi' => 'Đã reset thời gian hồi sinh'],
        'safezone.config.update' => ['color' => 0x9B59B6, 'title_vi' => 'Đã cập nhật cấu hình khu vực an toàn'],
        'safezone.zone.create' => ['color' => 0x2ECC71, 'title_vi' => 'Đã tạo khu vực an toàn'],
        'safezone.zone.delete' => ['color' => 0xE74C3C, 'title_vi' => 'Đã xóa khu vực an toàn'],
        'safezone.violation.detected' => ['color' => 0xE74C3C, 'title_vi' => 'Phát hiện vi phạm PvP'],
        'safezone.violation.dismissed' => ['color' => 0x95A5A6, 'title_vi' => 'Đã bỏ qua vi phạm PvP'],
        'safezone.violation.actioned' => ['color' => 0xE74C3C, 'title_vi' => 'Đã xử lý vi phạm PvP'],
        'shop.currency.awarded' => ['color' => 0xF1C40F, 'title_vi' => 'Đã thưởng tiền tệ'],
        'shop.item.create' => ['color' => 0x2ECC71, 'title_vi' => 'Đã tạo vật phẩm cửa hàng'],
        'shop.item.update' => ['color' => 0x3498DB, 'title_vi' => 'Đã cập nhật vật phẩm'],
        'shop.item.delete' => ['color' => 0xE74C3C, 'title_vi' => 'Đã xóa vật phẩm'],
        'shop.bundle.create' => ['color' => 0x2ECC71, 'title_vi' => 'Đã tạo gói'],
        'shop.bundle.delete' => ['color' => 0xE74C3C, 'title_vi' => 'Đã xóa gói'],
        'shop.promotion.create' => ['color' => 0x2ECC71, 'title_vi' => 'Đã tạo khuyến mãi'],
        'shop.promotion.delete' => ['color' => 0xE74C3C, 'title_vi' => 'Đã xóa khuyến mãi'],
        'backup.create' => ['color' => 0x2ECC71, 'title_vi' => 'Đang sao lưu'],
        'backup.created' => ['color' => 0x2ECC71, 'title_vi' => 'Sao lưu hoàn tất'],
        'backup.rollback.initiated' => ['color' => 0x9B59B6, 'title_vi' => 'Bắt đầu khôi phục'],
        'backup.rollback' => ['color' => 0x9B59B6, 'title_vi' => 'Đã khôi phục'],
        'backup.rollback.scheduled' => ['color' => 0xE67E22, 'title_vi' => 'Lên lịch khôi phục'],
        'backup.rollback.executed' => ['color' => 0x9B59B6, 'title_vi' => 'Khôi phục hoàn tất'],
        'backup.delete' => ['color' => 0xE74C3C, 'title_vi' => 'Đã xóa bản sao lưu'],
        'player.kick' => ['color' => 0xE67E22, 'title_vi' => 'Đã đá người chơi'],
        'player.ban' => ['color' => 0xE74C3C, 'title_vi' => 'Đã cấm người chơi'],
        'discord.webhook.update' => ['color' => 0x3498DB, 'title_vi' => 'Đã cập nhật cài đặt webhook'],
        'discord.bot.update' => ['color' => 0x3498DB, 'title_vi' => 'Đã cập nhật cài đặt bot'],
    ];

    public function sendNotification(string $webhookUrl, AuditLog $auditLog): void
    {
        $config = self::ACTION_CONFIG[$auditLog->action] ?? null;

        if (! $config) {
            return;
        }

        $embed = [
            'title' => $config['title_vi'],
            'color' => $config['color'],
            'description' => $this->buildDescription($auditLog),
        ];

        $this->send($webhookUrl, ['embeds' => [$embed]]);
    }

    public function sendTestMessage(string $webhookUrl): array
    {
        $embed = [
            'title' => 'Kiểm tra kết nối Webhook',
            'description' => 'Kết nối Discord Webhook thành công!',
            'color' => 0x2ECC71,
        ];

        return $this->send($webhookUrl, ['embeds' => [$embed]]);
    }

    private function buildDescription(AuditLog $auditLog): string
    {
        $parts = [];
        $actor = $auditLog->actor ?? 'system';
        $parts[] = "Người thực hiện: {$actor}";

        if ($auditLog->target) {
            $parts[] = "Mục tiêu: {$auditLog->target}";
        }

        $details = $auditLog->details ?? [];
        if (isset($details['reason'])) {
            $parts[] = "Lý do: {$details['reason']}";
        }
        if (isset($details['message'])) {
            $parts[] = "{$details['message']}";
        }

        return implode("\n", $parts);
    }

    private function send(string $url, array $payload): array
    {
        try {
            $response = Http::timeout(10)
                ->retry(2, 1000)
                ->post($url, $payload);

            if ($response->successful() || $response->status() === 204) {
                return ['success' => true];
            }

            $error = "Discord returned HTTP {$response->status()}";
            Log::warning('Discord webhook failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return ['success' => false, 'error' => $error];
        } catch (\Throwable $e) {
            Log::warning('Discord webhook error', [
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}