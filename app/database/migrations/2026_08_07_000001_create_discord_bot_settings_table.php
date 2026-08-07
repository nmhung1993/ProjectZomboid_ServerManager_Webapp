<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discord_bot_settings', function (Blueprint $table) {
            $table->id();
            $table->text('bot_token')->nullable();
            $table->boolean('enabled')->default(false);
            $table->string('channel_id')->nullable();
            $table->string('thread_id')->nullable();
            $table->jsonb('role_ids')->default('[]');
            $table->jsonb('enabled_events')->default('[]');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discord_bot_settings');
    }
};