<?php

/**
 * EduKitt AI — Free Edition
 *
 * Copyright (c) 2026 Kitt Apps
 * https://kittapps.com
 *
 * Licensed under the EduKitt AI Free Edition License.
 * See LICENSE in the project root.
 */

namespace App\Http\Controllers\Admin\Subscriptions;

use App\Http\Controllers\Controller;
use App\Models\CreditPackage;
use App\Services\Billing\CreditPricingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin CRUD for one-off credit packages sold via Stripe Checkout.
 *
 * Packs are intentionally simple: name, credits, price (cents), Stripe
 * price id, badge, active toggle, sort order. The user-facing
 * Credits tab consumes the same model directly.
 */
class CreditPackagesController extends Controller
{
    public function __construct(
        private readonly CreditPricingService $pricing,
    ) {}

    public function index(): Response
    {
        $packages = CreditPackage::query()
            ->withCount([
                'creditPackPurchases as purchases_count' => function ($query): void {
                    $query->where('status', 'completed');
                },
            ])
            ->orderBy('sort_order')
            ->orderBy('credits')
            ->get();

        return Inertia::render('Admin/CreditPackages/Index', [
            'packages' => $packages->map(fn (CreditPackage $p) => $this->present($p))->all(),
            'creditRateUsd' => $this->pricing->rate(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $payload = $this->validatePayload($request);

        CreditPackage::create($payload);

        return back()->with('success', 'Credit package created.');
    }

    public function update(Request $request, CreditPackage $package): RedirectResponse
    {
        $payload = $this->validatePayload($request);

        $package->fill($payload)->save();

        return back()->with('success', 'Credit package updated.');
    }

    public function destroy(CreditPackage $package): RedirectResponse
    {
        $package->delete();

        return back()->with('success', 'Credit package deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'credits' => 'required|integer|min:1',
            'price_cents' => 'required|integer|min:0',
            'currency' => 'required|string|size:3',
            'stripe_price_id' => 'nullable|string|max:255',
            'badge' => 'nullable|in:popular,best',
            'is_active' => 'required|boolean',
            'sort_order' => 'required|integer|min:0',
        ]);

        $data['slug'] = $data['slug']
            ?: Str::slug($data['name']).'-'.Str::lower(Str::random(4));
        $data['currency'] = strtoupper($data['currency']);

        return $data;
    }

    private function present(CreditPackage $pkg): array
    {
        return [
            'id' => $pkg->id,
            'name' => $pkg->name,
            'slug' => $pkg->slug,
            'credits' => $pkg->credits,
            'price_cents' => $pkg->price_cents,
            'price' => round($pkg->priceFloat(), 2),
            'per_credit' => round($pkg->perCreditFloat(), 4),
            'currency' => $pkg->currency,
            'stripe_price_id' => $pkg->stripe_price_id,
            'badge' => $pkg->badge,
            'is_active' => $pkg->is_active,
            'sort_order' => $pkg->sort_order,
            'purchases_count' => (int) ($pkg->purchases_count ?? 0),
        ];
    }
}
