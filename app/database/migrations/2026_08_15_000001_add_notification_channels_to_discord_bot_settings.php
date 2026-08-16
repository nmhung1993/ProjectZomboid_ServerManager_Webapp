<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->jsonb('notification_channels')->nullable()->after('enabled');
            // Make old columns nullable so both paths work
            $table->string('channel_id')->nullable()->change();
            $table->string('thread_id')->nullable()->change();
            $table->jsonb('role_ids')->default('[]')->change();
        });
    }

    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn('notification_channels');
        });
    }
};