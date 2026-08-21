<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sql_id')->unique();
            $table->string('name')->default('Vehicle');
            $table->string('model')->nullable();
            $table->string('owner_username')->nullable()->index();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->float('x')->default(0);
            $table->float('y')->default(0);
            $table->integer('z')->default(0);
            $table->float('engine_condition')->default(100);
            $table->float('fuel_level')->default(100);
            $table->float('battery_charge')->default(100);
            $table->boolean('is_claimed')->default(false);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });

        Schema::create('cleaner_logs', function (Blueprint $table) {
            $table->id();
            $table->string('clean_type'); // dead_bodies, ground_items, broken_vehicles
            $table->integer('items_removed')->default(0);
            $table->string('triggered_by')->default('system'); // system, admin_manual, scheduler
            $table->jsonb('details')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cleaner_logs');
        Schema::dropIfExists('vehicles');
    }
};
