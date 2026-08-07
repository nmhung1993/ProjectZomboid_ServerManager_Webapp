<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDiscordBotRequest;
use App\Models\DiscordBotSetting;
use App\Services\AuditLogger;
use App\Services\DiscordBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DiscordBotController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly DiscordBotService $discordBot,
    ) {}

    public function index(): Response
    {
        $settings = DiscordBotSetting::instance();

        return Inertia::render('admin/discord-bot', [
            'settings' => [
                'has_bot_token' => (bool) $settings->bot_token,
                'bot_token_masked' => $settings->bot_token
                    ? '••••••••••••••••' . substr($settings->bot_token, -5)
                    : null,
                'enabled' => $settings->enabled,
                'server_id' => $settings->server_id,
                'channel_id' => $settings->channel_id,
                'thread_id' => $settings->thread_id,
                'role_ids' => $settings->role_ids ?? [],
                'enabled_events' => $settings->enabled_events ?? [],
            ],
            'available_events' => DiscordBotSetting::availableEvents(),
        ]);
    }

    public function update(UpdateDiscordBotRequest $request): JsonResponse
    {
        $settings = DiscordBotSetting::instance();
        $validated = $request->validated();

        // Only update bot_token if explicitly provided
        if (array_key_exists('bot_token', $validated)) {
            $settings->bot_token = $validated['bot_token'];
        }

        if (array_key_exists('enabled', $validated)) {
            $settings->enabled = $validated['enabled'];
        }

        if (array_key_exists('server_id', $validated)) {
            $settings->server_id = $validated['server_id'];
        }

        if (array_key_exists('channel_id', $validated)) {
            $settings->channel_id = $validated['channel_id'];
        }

        if (array_key_exists('thread_id', $validated)) {
            $settings->thread_id = $validated['thread_id'];
        }

        if (array_key_exists('role_ids', $validated)) {
            $settings->role_ids = $validated['role_ids'];
        }

        if (array_key_exists('enabled_events', $validated)) {
            $settings->enabled_events = $validated['enabled_events'];
        }

        $settings->save();

        $this->auditLogger->log(
            actor: $request->user()->name ?? 'admin',
            action: 'discord.bot.update',
            details: [
                'enabled' => $settings->enabled,
                'events_count' => count($settings->enabled_events ?? []),
                'token_changed' => array_key_exists('bot_token', $validated),
                'server_id' => $settings->server_id,
                'channel_id' => $settings->channel_id,
                'thread_id' => $settings->thread_id,
                'role_count' => count($settings->role_ids ?? []),
            ],
            ip: $request->ip(),
        );

        return response()->json(['message' => 'Discord bot settings updated']);
    }

    public function test(Request $request): JsonResponse
    {
        $settings = DiscordBotSetting::instance();

        // Use the provided values if given, otherwise fall back to the saved ones
        $botToken = $request->input('bot_token') ?: $settings->bot_token;
        $serverId = $request->input('server_id') ?: $settings->server_id;
        $channelId = $request->input('channel_id') ?: $settings->channel_id;
        $threadId = $request->input('thread_id') ?: $settings->thread_id;
        $roleIds = $request->input('role_ids') ?? ($settings->role_ids ?? []);

        if (! $botToken) {
            return response()->json([
                'success' => false,
                'error' => 'No bot token configured',
            ], 422);
        }

        if (! $channelId) {
            return response()->json([
                'success' => false,
                'error' => 'No channel ID configured',
            ], 422);
        }

        $result = $this->discordBot->sendTestMessage(
            botToken: $botToken,
            channelId: $channelId,
            threadId: $threadId,
            roleIds: $roleIds,
        );

        if (! $result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result);
    }
}