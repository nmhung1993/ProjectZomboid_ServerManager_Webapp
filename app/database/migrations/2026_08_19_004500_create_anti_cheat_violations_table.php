<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anti_cheat_violations', function (Blueprint $table) {
            $table->id();
            $table->string('username')->index();
            $table->string('access_level')->default('none');
            $table->json('cheats');
            $table->string('cheat_string')->nullable();
            $table->integer('x')->nullable();
            $table->integer('y')->nullable();
            $table->integer('z')->nullable();
            $table->string('status')->default('flagged')->index(); // flagged, resolved, dismissed, punished
            $table->string('resolved_by')->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anti_cheat_violations');
    }
};
