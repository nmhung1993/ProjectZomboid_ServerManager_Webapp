<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->string('item_id');
            $table->string('item_name');
            $table->string('category')->default('misc');
            $table->integer('quantity')->default(1);
            $table->string('listing_type')->default('fixed_price'); // fixed_price, auction
            $table->decimal('price', 12, 2)->nullable();
            $table->decimal('starting_bid', 12, 2)->nullable();
            $table->decimal('current_bid', 12, 2)->nullable();
            $table->foreignId('highest_bidder_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('buyout_price', 12, 2)->nullable();
            $table->integer('bid_count')->default(0);
            $table->string('status')->default('active'); // active, sold, expired, cancelled
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('market_bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('market_listings')->cascadeOnDelete();
            $table->foreignId('bidder_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->boolean('is_winning')->default(false);
            $table->timestamps();
        });

        Schema::create('market_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('username');
            $table->string('item_id');
            $table->string('item_name')->nullable();
            $table->integer('quantity')->default(1);
            $table->string('status')->default('pending'); // pending, delivered
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_deliveries');
        Schema::dropIfExists('market_bids');
        Schema::dropIfExists('market_listings');
    }
};
