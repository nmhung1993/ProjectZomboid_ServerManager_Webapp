<?php

namespace App\Http\Requests\Admin;

use App\Models\DiscordBotSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDiscordBotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $availableEvents = array_keys(DiscordBotSetting::availableEvents());

        return [
            'bot_token' => ['sometimes', 'nullable', 'string', 'min:50', 'max:100'],
            'enabled' => ['sometimes', 'boolean'],
            'server_id' => ['sometimes', 'nullable', 'string', 'max:30'],
            'channel_id' => ['sometimes', 'nullable', 'string', 'max:30'],
            'thread_id' => ['sometimes', 'nullable', 'string', 'max:30'],
            'role_ids' => ['sometimes', 'array'],
            'role_ids.*' => ['string', 'max:30'],
            'enabled_events' => ['sometimes', 'array'],
            'enabled_events.*' => ['string', Rule::in($availableEvents)],
            'notification_channels' => ['sometimes', 'array'],
            'notification_channels.*.channel_id' => ['nullable', 'string', 'max:30'],
            'notification_channels.*.thread_id' => ['nullable', 'string', 'max:30'],
            'notification_channels.*.role_ids' => ['nullable', 'array'],
            'notification_channels.*.role_ids.*' => ['string', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'bot_token.min' => 'The bot token must be at least 50 characters.',
            'bot_token.max' => 'The bot token must not exceed 100 characters.',
            'server_id.max' => 'The server ID must not exceed 30 characters.',
            'channel_id.max' => 'The channel ID must not exceed 30 characters.',
            'thread_id.max' => 'The thread ID must not exceed 30 characters.',
            'role_ids.*.max' => 'Each role ID must not exceed 30 characters.',
        ];
    }
}