<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('active_title')->nullable()->after('name');
        });

        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description');
            $table->string('category')->default('combat'); // combat, pvp, survival, economy, exploration
            $table->string('icon')->default('Trophy');
            $table->string('metric_type'); // zombie_kills, pvp_kills, survived_hours, total_coins, completed_quests, claimed_vehicles
            $table->integer('target_value')->default(1);
            $table->decimal('reward_coins', 12, 2)->default(0);
            $table->string('reward_title')->nullable();
            $table->timestamps();
        });

        Schema::create('player_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('achievement_id')->constrained('achievements')->cascadeOnDelete();
            $table->integer('progress')->default(0);
            $table->boolean('is_completed')->default(false);
            $table->boolean('is_reward_claimed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'achievement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_achievements');
        Schema::dropIfExists('achievements');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('active_title');
        });
    }
};
