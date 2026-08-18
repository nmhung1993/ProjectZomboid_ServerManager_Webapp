<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\MarketBid;
use App\Models\MarketDelivery;
use App\Models\MarketListing;
use App\Models\Wallet;
use App\Services\MarketplaceManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplacePortalController extends Controller
{
    public function __construct(
        private readonly MarketplaceManager $marketplaceManager,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        // Process any expired auctions automatically
        $this->marketplaceManager->processExpiredAuctions();

        $activeListings = MarketListing::with('seller:id,username')
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (MarketListing $l) => [
                'id' => $l->id,
                'seller_id' => $l->seller_id,
                'seller_name' => $l->seller?->username ?? 'Unknown',
                'is_mine' => $l->seller_id === $user->id,
                'item_id' => $l->item_id,
                'item_name' => $l->item_name,
                'category' => $l->category,
                'quantity' => $l->quantity,
                'listing_type' => $l->listing_type,
                'price' => (float) $l->price,
                'starting_bid' => (float) $l->starting_bid,
                'current_bid' => (float) $l->current_bid,
                'highest_bidder_id' => $l->highest_bidder_id,
                'is_highest_bidder' => $l->highest_bidder_id === $user->id,
                'buyout_price' => $l->buyout_price ? (float) $l->buyout_price : null,
                'bid_count' => $l->bid_count,
                'expires_at' => $l->expires_at?->toISOString(),
                'created_at' => $l->created_at->toISOString(),
            ]);

        $myDeliveries = MarketDelivery::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (MarketDelivery $d) => [
                'id' => $d->id,
                'item_id' => $d->item_id,
                'item_name' => $d->item_name,
                'quantity' => $d->quantity,
                'status' => $d->status,
                'delivered_at' => $d->delivered_at?->toISOString(),
                'created_at' => $d->created_at->toISOString(),
            ]);

        $wallet = Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);

        return Inertia::render('portal/market/index', [
            'listings' => $activeListings,
            'deliveries' => $myDeliveries,
            'wallet_balance' => (float) $wallet->balance,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'item_id' => ['required', 'string', 'max:100'],
            'item_name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'in:weapons,medical,food,ammo,vehicles,tools,misc'],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'listing_type' => ['required', 'string', 'in:fixed_price,auction'],
            'price' => ['nullable', 'numeric', 'min:1'],
            'starting_bid' => ['nullable', 'numeric', 'min:1'],
            'buyout_price' => ['nullable', 'numeric', 'min:1'],
            'duration_hours' => ['required', 'integer', 'in:6,12,24,48,72'],
        ]);

        $user = $request->user();

        if ($validated['listing_type'] === 'fixed_price') {
            if (empty($validated['price'])) {
                return back()->withErrors(['price' => 'Vui lòng nhập giá bán']);
            }
            $this->marketplaceManager->createFixedListing(
                seller: $user,
                itemId: $validated['item_id'],
                itemName: $validated['item_name'],
                category: $validated['category'],
                quantity: (int) $validated['quantity'],
                price: (float) $validated['price'],
                durationHours: (int) $validated['duration_hours']
            );
        } else {
            if (empty($validated['starting_bid'])) {
                return back()->withErrors(['starting_bid' => 'Vui lòng nhập giá khởi điểm']);
            }
            $this->marketplaceManager->createAuctionListing(
                seller: $user,
                itemId: $validated['item_id'],
                itemName: $validated['item_name'],
                category: $validated['category'],
                quantity: (int) $validated['quantity'],
                startingBid: (float) $validated['starting_bid'],
                buyoutPrice: ! empty($validated['buyout_price']) ? (float) $validated['buyout_price'] : null,
                durationHours: (int) $validated['duration_hours']
            );
        }

        return back()->with('success', 'Đã đăng vật phẩm lên Chợ giao dịch thành công!');
    }

    public function buy(Request $request, MarketListing $listing): RedirectResponse
    {
        try {
            $this->marketplaceManager->buyFixedListing($request->user(), $listing->id);

            return back()->with('success', "Đã mua thành công {$listing->quantity}x {$listing->item_name}! Vật phẩm sẽ được chuyển vào túi đồ khi bạn vào game.");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function bid(Request $request, MarketListing $listing): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        try {
            $res = $this->marketplaceManager->placeBid($request->user(), $listing->id, (float) $validated['amount']);

            if ($res instanceof MarketDelivery) {
                return back()->with('success', "Mua đứt thành công {$listing->item_name} với giá {$validated['amount']} coins!");
            }

            return back()->with('success', "Đã đặt giá thầu thành công: {$validated['amount']} coins!");
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function cancel(Request $request, MarketListing $listing): RedirectResponse
    {
        try {
            $this->marketplaceManager->cancelListing($listing->id, $request->user());

            return back()->with('success', 'Đã hủy niêm yết vật phẩm.');
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
