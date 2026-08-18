<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('world_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type'); // airdrop, heli_crash, zombie_invasion
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location_name')->nullable();
            $table->float('x')->default(0);
            $table->float('y')->default(0);
            $table->integer('z')->default(0);
            $table->integer('radius')->default(30);
            $table->jsonb('loot_items')->nullable();
            $table->decimal('reward_coins', 12, 2)->default(0);
            $table->string('status')->default('active'); // active, looted, expired, cancelled
            $table->string('looted_by_username')->nullable();
            $table->foreignId('looted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('looted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('world_events');
    }
};
