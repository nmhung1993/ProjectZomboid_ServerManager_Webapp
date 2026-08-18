<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('factions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('tag', 10)->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('color', 20)->default('#3b82f6');
            $table->foreignId('leader_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('bank_balance', 14, 2)->default(0);
            $table->unsignedInteger('max_members')->default(20);
            $table->timestamps();
        });

        Schema::create('faction_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faction_id')->constrained('factions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('username')->index();
            $table->string('role')->default('member'); // leader, officer, member
            $table->decimal('contribution_points', 12, 2)->default(0);
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamps();

            $table->unique(['faction_id', 'user_id']);
        });

        Schema::create('faction_territories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faction_id')->constrained('factions')->cascadeOnDelete();
            $table->string('name')->default('Main Base');
            $table->integer('x1');
            $table->integer('y1');
            $table->integer('x2');
            $table->integer('y2');
            $table->integer('z')->default(0);
            $table->string('color', 20)->nullable();
            $table->boolean('is_safe_house')->default(true);
            $table->timestamps();
        });

        Schema::create('faction_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faction_id')->constrained('factions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type')->default('invitation'); // invitation (from faction to user), request (from user to faction)
            $table->string('status')->default('pending'); // pending, accepted, rejected, cancelled
            $table->string('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faction_invitations');
        Schema::dropIfExists('faction_territories');
        Schema::dropIfExists('faction_members');
        Schema::dropIfExists('factions');
    }
};
