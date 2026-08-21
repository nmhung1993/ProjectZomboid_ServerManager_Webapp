<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MarketDelivery;
use App\Models\MarketListing;
use App\Services\MarketplaceManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketAdminController extends Controller
{
    public function __construct(
        private readonly MarketplaceManager $marketplaceManager,
    ) {}

    public function index(Request $request): Response
    {
        $this->marketplaceManager->processExpiredAuctions();

        $listings = MarketListing::with(['seller:id,username', 'highestBidder:id,username'])
            ->orderByDesc('created_at')
            ->paginate(20);

        $deliveries = MarketDelivery::with('user:id,username')
            ->orderByDesc('created_at')
            ->paginate(20);

        $stats = [
            'total_listings' => MarketListing::count(),
            'active_listings' => MarketListing::where('status', 'active')->count(),
            'sold_listings' => MarketListing::where('status', 'sold')->count(),
            'total_volume' => (float) MarketListing::where('status', 'sold')->sum('price') + (float) MarketListing::where('status', 'sold')->sum('current_bid'),
            'pending_deliveries' => MarketDelivery::where('status', 'pending')->count(),
        ];

        return Inertia::render('admin/market', [
            'listings' => $listings,
            'deliveries' => $deliveries,
            'stats' => $stats,
        ]);
    }

    public function cancelListing(Request $request, MarketListing $listing): RedirectResponse
    {
        $this->marketplaceManager->cancelListing($listing->id, $request->user(), isAdmin: true);

        return back()->with('success', 'Admin đã hủy bài đăng và hoàn tiền nếu có.');
    }
}
