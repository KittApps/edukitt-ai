<?php

namespace Database\Seeders;

use App\Models\CreditPackage;
use Illuminate\Database\Seeder;

/**
 * Seed one-off credit packs sold via Stripe Checkout.
 *
 * Idempotent: keyed on `slug`. `price_cents` stores USD minor units to
 * mirror Stripe. Stripe price IDs are left null — the operator pastes
 * them from the Stripe dashboard via the admin UI.
 *
 * Badge values follow the existing convention from the migration
 * comment: `popular`, `best`, or null.
 */
class CreditPackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'slug' => 'starter',
                'name' => 'Starter',
                'credits' => 100,
                'price_cents' => 199,
                'currency' => 'USD',
                'badge' => null,
                'is_active' => true,
                'sort_order' => 10,
            ],
            [
                'slug' => 'plus',
                'name' => 'Plus',
                'credits' => 500,
                'price_cents' => 799,
                'currency' => 'USD',
                'badge' => null,
                'is_active' => true,
                'sort_order' => 20,
            ],
            [
                'slug' => 'pro-pack',
                'name' => 'Pro Pack',
                'credits' => 1500,
                'price_cents' => 1999,
                'currency' => 'USD',
                'badge' => 'popular',
                'is_active' => true,
                'sort_order' => 30,
            ],
            [
                'slug' => 'mega',
                'name' => 'Mega',
                'credits' => 5000,
                'price_cents' => 4999,
                'currency' => 'USD',
                'badge' => 'best',
                'is_active' => true,
                'sort_order' => 40,
            ],
        ];

        foreach ($packages as $attributes) {
            $slug = $attributes['slug'];
            unset($attributes['slug']);

            CreditPackage::updateOrCreate(
                ['slug' => $slug],
                $attributes,
            );
        }
    }
}
