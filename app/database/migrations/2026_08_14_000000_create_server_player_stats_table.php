<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('server_player_stats', function (Blueprint $table) {
            $table->id();
            $table->timestamp('recorded_at')->index();
            $table->unsignedInteger('player_count')->default(0);
            $table->float('total_hours_survived')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('server_player_stats');
    }
};