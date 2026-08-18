<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('death_records', function (Blueprint $table) {
            $table->id();
            $table->string('username');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->float('x')->default(0);
            $table->float('y')->default(0);
            $table->integer('z')->default(0);
            $table->string('cause_of_death')->default('zombie');
            $table->string('killer_username')->nullable();
            $table->foreignId('killer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->float('weight')->default(1.0);
            $table->timestamps();
        });

        Schema::create('server_performance_logs', function (Blueprint $table) {
            $table->id();
            $table->float('tps')->default(60.0);
            $table->float('tick_time_ms')->default(16.6);
            $table->integer('loaded_squares')->default(0);
            $table->integer('active_zombies')->default(0);
            $table->integer('dead_bodies')->default(0);
            $table->integer('online_players')->default(0);
            $table->float('memory_used_mb')->default(0);
            $table->float('memory_max_mb')->default(0);
            $table->timestamp('recorded_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_performance_logs');
        Schema::dropIfExists('death_records');
    }
};
