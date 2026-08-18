<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mod_update_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->integer('check_interval_minutes')->default(15);
            $table->boolean('notify_discord')->default(true);
            $table->boolean('auto_restart')->default(true);
            $table->integer('restart_delay_minutes')->default(5);
            $table->integer('skip_if_scheduled_within_minutes')->default(30);
            $table->timestamp('last_checked_at')->nullable();
            $table->json('known_mod_timestamps')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mod_update_settings');
    }
};
