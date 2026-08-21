<?php

namespace App\Services;

use App\Models\GameEvent;
use App\Models\MarketBid;
use App\Models\MarketDelivery;
use App\Models\MarketListing;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class MarketplaceManager
{
    private string $deliveriesPath;

    public function __construct(?string $deliveriesPath = null)
    {
        $this->deliveriesPath = $deliveriesPath ?? config('zomboid.lua_bridge.pending_deliveries', '/lua-bridge/pending_deliveries.json');
    }

    /**
     * Create a fixed-price listing.
     */
    public function createFixedListing(
        User $seller,
        string $itemId,
        string $itemName,
        string $category,
        int $quantity,
        float $price,
        int $durationHours = 48
    ): MarketListing {
        if ($price <= 0 || $quantity <= 0) {
            throw new InvalidArgumentException('Giá và số lượng phải lớn hơn 0.');
        }

        return MarketListing::create([
            'seller_id' => $seller->id,
            'item_id' => trim($itemId),
            'item_name' => trim($itemName),
            'category' => $category,
            'quantity' => $quantity,
            'listing_type' => 'fixed_price',
            'price' => $price,
            'status' => 'active',
            'expires_at' => now()->addHours($durationHours),
        ]);
    }

    /**
     * Create an auction listing.
     */
    public function createAuctionListing(
        User $seller,
        string $itemId,
        string $itemName,
        string $category,
        int $quantity,
        float $startingBid,
        ?float $buyoutPrice = null,
        int $durationHours = 24
    ): MarketListing {
        if ($startingBid <= 0 || $quantity <= 0) {
            throw new InvalidArgumentException('Giá khởi điểm và số lượng phải lớn hơn 0.');
        }

        if ($buyoutPrice !== null && $buyoutPrice <= $startingBid) {
            throw new InvalidArgumentException('Giá mua đứt phải lớn hơn giá khởi điểm.');
        }

        return MarketListing::create([
            'seller_id' => $seller->id,
            'item_id' => trim($itemId),
            'item_name' => trim($itemName),
            'category' => $category,
            'quantity' => $quantity,
            'listing_type' => 'auction',
            'starting_bid' => $startingBid,
            'current_bid' => $startingBid,
            'buyout_price' => $buyoutPrice,
            'status' => 'active',
            'expires_at' => now()->addHours($durationHours),
        ]);
    }

    /**
     * Purchase a fixed-price item.
     */
    public function buyFixedListing(User $buyer, int $listingId): MarketDelivery
    {
        return DB::transaction(function () use ($buyer, $listingId) {
            $listing = MarketListing::where('id', $listingId)->lockForUpdate()->firstOrFail();

            if ($listing->status !== 'active') {
                throw new InvalidArgumentException('Vật phẩm này không còn mở bán.');
            }

            if ($listing->listing_type !== 'fixed_price') {
                throw new InvalidArgumentException('Đây là phiên đấu giá, không thể mua trực tiếp.');
            }

            if ($listing->seller_id === $buyer->id) {
                throw new InvalidArgumentException('Bạn không thể tự mua vật phẩm của chính mình.');
            }

            $price = (float) $listing->price;
            $buyerWallet = Wallet::firstOrCreate(['user_id' => $buyer->id], ['balance' => 0]);

            if ((float) $buyerWallet->balance < $price) {
                throw new InvalidArgumentException("Số dư không đủ. Bạn cần {$price} coins.");
            }

            // Deduct buyer
            $buyerWallet->decrement('balance', $price);

            // Credit seller (95% payout, 5% server fee)
            $sellerPayout = round($price * 0.95, 2);
            $sellerWallet = Wallet::firstOrCreate(['user_id' => $listing->seller_id], ['balance' => 0]);
            $sellerWallet->increment('balance', $sellerPayout);
            $sellerWallet->increment('total_earned', $sellerPayout);

            // Mark sold
            $listing->update([
                'status' => 'sold',
                'highest_bidder_id' => $buyer->id,
            ]);

            // Create Delivery
            $delivery = MarketDelivery::create([
                'user_id' => $buyer->id,
                'username' => $buyer->username,
                'item_id' => $listing->item_id,
                'item_name' => $listing->item_name,
                'quantity' => $listing->quantity,
                'status' => 'pending',
            ]);

            $this->syncDeliveriesBridge();

            return $delivery;
        });
    }

    /**
     * Place a bid on an auction.
     */
    public function placeBid(User $bidder, int $listingId, float $amount): MarketBid|MarketDelivery
    {
        return DB::transaction(function () use ($bidder, $listingId, $amount) {
            $listing = MarketListing::where('id', $listingId)->lockForUpdate()->firstOrFail();

            if ($listing->status !== 'active' || ($listing->expires_at && $listing->expires_at->isPast())) {
                throw new InvalidArgumentException('Phiên đấu giá này đã kết thúc.');
            }

            if ($listing->listing_type !== 'auction') {
                throw new InvalidArgumentException('Vật phẩm này không thuộc hình thức đấu giá.');
            }

            if ($listing->seller_id === $bidder->id) {
                throw new InvalidArgumentException('Bạn không thể tự đấu giá vật phẩm của chính mình.');
            }

            // Check if instant buyout triggered
            if ($listing->buyout_price && $amount >= (float) $listing->buyout_price) {
                $buyoutAmount = (float) $listing->buyout_price;
                $bidderWallet = Wallet::firstOrCreate(['user_id' => $bidder->id], ['balance' => 0]);

                if ((float) $bidderWallet->balance < $buyoutAmount) {
                    throw new InvalidArgumentException('Số dư ví không đủ để mua đứt vật phẩm.');
                }

                // Refund previous highest bidder if any
                if ($listing->highest_bidder_id && $listing->highest_bidder_id !== $bidder->id) {
                    $prevWallet = Wallet::firstOrCreate(['user_id' => $listing->highest_bidder_id], ['balance' => 0]);
                    $prevWallet->increment('balance', (float) $listing->current_bid);
                }

                $bidderWallet->decrement('balance', $buyoutAmount);

                $sellerPayout = round($buyoutAmount * 0.95, 2);
                $sellerWallet = Wallet::firstOrCreate(['user_id' => $listing->seller_id], ['balance' => 0]);
                $sellerWallet->increment('balance', $sellerPayout);
                $sellerWallet->increment('total_earned', $sellerPayout);

                $listing->update([
                    'status' => 'sold',
                    'current_bid' => $buyoutAmount,
                    'highest_bidder_id' => $bidder->id,
                    'bid_count' => $listing->bid_count + 1,
                ]);

                $delivery = MarketDelivery::create([
                    'user_id' => $bidder->id,
                    'username' => $bidder->username,
                    'item_id' => $listing->item_id,
                    'item_name' => $listing->item_name,
                    'quantity' => $listing->quantity,
                    'status' => 'pending',
                ]);

                $this->syncDeliveriesBridge();

                return $delivery;
            }

            // Regular Bid
            $minBid = $listing->bid_count > 0 ? (float) $listing->current_bid + 5.0 : (float) $listing->starting_bid;
            if ($amount < $minBid) {
                throw new InvalidArgumentException("Giá thầu tối thiểu hợp lệ là {$minBid} coins.");
            }

            $bidderWallet = Wallet::firstOrCreate(['user_id' => $bidder->id], ['balance' => 0]);
            if ((float) $bidderWallet->balance < $amount) {
                throw new InvalidArgumentException('Số dư ví không đủ để đặt giá thầu.');
            }

            // Refund previous bidder
            if ($listing->highest_bidder_id && $listing->highest_bidder_id !== $bidder->id) {
                $prevWallet = Wallet::firstOrCreate(['user_id' => $listing->highest_bidder_id], ['balance' => 0]);
                $prevWallet->increment('balance', (float) $listing->current_bid);
            }

            // Deduct new bidder
            $bidderWallet->decrement('balance', $amount);

            // Update listing
            $listing->update([
                'current_bid' => $amount,
                'highest_bidder_id' => $bidder->id,
                'bid_count' => $listing->bid_count + 1,
            ]);

            MarketBid::where('listing_id', $listing->id)->update(['is_winning' => false]);

            return MarketBid::create([
                'listing_id' => $listing->id,
                'bidder_id' => $bidder->id,
                'amount' => $amount,
                'is_winning' => true,
            ]);
        });
    }

    /**
     * Process expired auctions.
     */
    public function processExpiredAuctions(): int
    {
        $expiredListings = MarketListing::where('status', 'active')
            ->where('listing_type', 'auction')
            ->where('expires_at', '<=', now())
            ->get();

        $processed = 0;
        foreach ($expiredListings as $listing) {
            DB::transaction(function () use ($listing, &$processed) {
                if ($listing->highest_bidder_id && $listing->bid_count > 0) {
                    $winningAmount = (float) $listing->current_bid;
                    $sellerPayout = round($winningAmount * 0.95, 2);

                    $sellerWallet = Wallet::firstOrCreate(['user_id' => $listing->seller_id], ['balance' => 0]);
                    $sellerWallet->increment('balance', $sellerPayout);
                    $sellerWallet->increment('total_earned', $sellerPayout);

                    $winner = User::find($listing->highest_bidder_id);
                    if ($winner) {
                        MarketDelivery::create([
                            'user_id' => $winner->id,
                            'username' => $winner->username,
                            'item_id' => $listing->item_id,
                            'item_name' => $listing->item_name,
                            'quantity' => $listing->quantity,
                            'status' => 'pending',
                        ]);
                    }

                    $listing->update(['status' => 'sold']);
                } else {
                    $listing->update(['status' => 'expired']);
                }

                $processed++;
            });
        }

        if ($processed > 0) {
            $this->syncDeliveriesBridge();
        }

        return $processed;
    }

    /**
     * Cancel listing.
     */
    public function cancelListing(int $listingId, User $user, bool $isAdmin = false): bool
    {
        return DB::transaction(function () use ($listingId, $user, $isAdmin) {
            $listing = MarketListing::where('id', $listingId)->lockForUpdate()->firstOrFail();

            if (! $isAdmin && $listing->seller_id !== $user->id) {
                throw new InvalidArgumentException('Bạn không có quyền hủy bài đăng này.');
            }

            if ($listing->status !== 'active') {
                return false;
            }

            // If auction with active bids, refund highest bidder
            if ($listing->listing_type === 'auction' && $listing->highest_bidder_id && $listing->bid_count > 0) {
                $bidderWallet = Wallet::firstOrCreate(['user_id' => $listing->highest_bidder_id], ['balance' => 0]);
                $bidderWallet->increment('balance', (float) $listing->current_bid);
            }

            $listing->update(['status' => 'cancelled']);

            return true;
        });
    }

    /**
     * Sync pending deliveries to Lua bridge JSON.
     */
    public function syncDeliveriesBridge(): bool
    {
        try {
            $pending = MarketDelivery::where('status', 'pending')->get()->map(fn (MarketDelivery $d) => [
                'id' => $d->id,
                'username' => $d->username,
                'item_id' => $d->item_id,
                'quantity' => $d->quantity,
            ])->values()->all();

            return JsonFile::writeAtomic($this->deliveriesPath, ['deliveries' => $pending]);
        } catch (\Throwable $e) {
            Log::warning('Failed to write pending deliveries JSON', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
