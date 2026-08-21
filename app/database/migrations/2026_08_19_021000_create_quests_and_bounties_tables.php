<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quests', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type')->default('daily'); // daily, weekly, achievement, custom
            $table->string('category')->default('zombie_kills'); // zombie_kills, survival_hours, pvp_kills, custom
            $table->integer('target_count')->default(50);
            $table->string('target_item')->nullable();
            $table->decimal('reward_coins', 12, 2)->default(100);
            $table->jsonb('reward_items')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('player_quests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quest_id')->constrained('quests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('username')->index();
            $table->integer('current_progress')->default(0);
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->boolean('reward_claimed')->default(false);
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            $table->unique(['quest_id', 'user_id']);
        });

        Schema::create('bounties', function (Blueprint $table) {
            $table->id();
            $table->string('target_username')->index();
            $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('reward_amount', 12, 2)->default(500);
            $table->text('reason')->nullable();
            $table->string('status')->default('active'); // active, claimed, cancelled, expired
            $table->string('hunter_username')->nullable()->index();
            $table->foreignId('hunter_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bounties');
        Schema::dropIfExists('player_quests');
        Schema::dropIfExists('quests');
    }
};
