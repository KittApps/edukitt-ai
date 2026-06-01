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
use App\Models\CreditPackPurchase;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Laravel\Cashier\Subscription;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Admin Transactions page.
 *
 * Surfaces a unified ledger of paid transactions from two sources:
 *   - Cashier `subscriptions` rows (one row per user's subscription)
 *   - Local `credit_pack_purchases` rows (one row per one-off Checkout
 *     completion, populated by HandleStripeWebhooks)
 *
 * The two sets are merged and paginated in PHP. This is fine for the
 * volumes this app handles; if it ever grows we can move to a real
 * UNION ALL query or to a denormalised `transactions` table written
 * directly from webhooks.
 *
 * Filters (type/status/q) and pagination are server-side. The page
 * issues partial Inertia visits when filters change.
 */
class TransactionsController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request)
    {
        $filters = $this->parseFilters($request);
        $page = max(1, (int) $request->integer('page', 1));

        $unified = $this->loadUnifiedRows();

        $filtered = $this->applyFilters($unified, $filters['type'], $filters['status'], $filters['q']);

        $sorted = $filtered
            ->sortByDesc('created_at')
            ->values();

        $paginator = new LengthAwarePaginator(
            items: $sorted->forPage($page, self::PER_PAGE)->values(),
            total: $sorted->count(),
            perPage: self::PER_PAGE,
            currentPage: $page,
            options: [
                'path' => $request->url(),
                'query' => $request->query(),
            ],
        );

        return Inertia::render('Admin/Transactions/Index', [
            'transactions' => [
                'data' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
            'stats' => $this->buildStats($unified),
            'filters' => $filters,
        ]);
    }

    /**
     * Stream the current filter selection as a CSV download.
     *
     * Honours the same `type` / `status` / `q` filters as the table
     * (`page` is intentionally ignored — the export always covers the
     * full filtered set, not the current page). Rows are written one
     * by one straight to `php://output` so the response doesn't have
     * to hold the whole file in memory; the UTF-8 BOM up front keeps
     * Excel from mangling non-ASCII names and emojis.
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $this->parseFilters($request);

        $rows = $this->applyFilters(
            $this->loadUnifiedRows(),
            $filters['type'],
            $filters['status'],
            $filters['q'],
        )
            ->sortByDesc('created_at')
            ->values();

        $filename = 'transactions-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');

            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Transaction ID',
                'Date',
                'Type',
                'User',
                'Email',
                'Reference',
                'Description',
                'Amount',
                'Currency',
                'Status',
                'Gateway',
            ]);

            foreach ($rows as $row) {
                fputcsv($out, [
                    (string) ($row['id'] ?? ''),
                    (string) ($row['created_at'] ?? ''),
                    (string) ($row['type'] ?? ''),
                    (string) ($row['user']['name'] ?? ''),
                    (string) ($row['user']['email'] ?? ''),
                    (string) ($row['reference'] ?? ''),
                    (string) ($row['description'] ?? ''),
                    number_format((float) ($row['amount'] ?? 0), 2, '.', ''),
                    (string) ($row['currency'] ?? ''),
                    (string) ($row['status'] ?? ''),
                    (string) ($row['gateway'] ?? ''),
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Cache-Control' => 'no-store, no-cache',
        ]);
    }

    /**
     * Normalised filter shape shared by `index()` and `export()` so the
     * CSV always covers exactly the same set of rows the table shows.
     *
     * @return array{type: string, status: string, q: string}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'type' => $request->string('type')->toString() ?: 'all',
            'status' => $request->string('status')->toString() ?: 'all',
            'q' => trim($request->string('q')->toString()),
        ];
    }

    /**
     * Build the unfiltered, unsorted unified ledger from both sources
     * (Cashier subscriptions + local credit-pack purchases). Owners
     * and price → plan lookups are eager-loaded once so the two
     * presenters don't issue N+1 queries.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function loadUnifiedRows(): Collection
    {
        $plans = SubscriptionPlan::query()
            ->get()
            ->keyBy('id');
        $planByPriceId = $this->buildPlanByPriceId($plans);

        $subscriptionRows = Subscription::query()
            ->with('owner')
            ->get()
            ->map(fn (Subscription $sub) => $this->presentSubscription($sub, $planByPriceId))
            ->filter(); // drop rows with no owner

        $creditPackRows = CreditPackPurchase::query()
            ->with(['user', 'package'])
            ->get()
            ->map(fn (CreditPackPurchase $row) => $this->presentCreditPack($row))
            ->filter();

        return $subscriptionRows
            ->concat($creditPackRows)
            ->values();
    }

    /**
     * Build a stripe_price_id => SubscriptionPlan lookup so each Cashier
     * subscription row can be labelled with its plan name + cycle and
     * priced from the local plan record.
     *
     * @param  Collection<int, SubscriptionPlan>  $plans
     * @return array<string, array{plan: SubscriptionPlan, cycle: 'monthly'|'yearly'}>
     */
    private function buildPlanByPriceId(Collection $plans): array
    {
        $map = [];
        foreach ($plans as $plan) {
            if (! empty($plan->stripe_monthly_price_id)) {
                $map[$plan->stripe_monthly_price_id] = ['plan' => $plan, 'cycle' => 'monthly'];
            }
            if (! empty($plan->stripe_yearly_price_id)) {
                $map[$plan->stripe_yearly_price_id] = ['plan' => $plan, 'cycle' => 'yearly'];
            }
        }

        return $map;
    }

    /**
     * Project a Cashier Subscription row into the unified transaction
     * shape consumed by the admin Transactions table.
     *
     * @param  array<string, array{plan: SubscriptionPlan, cycle: 'monthly'|'yearly'}>  $planByPriceId
     * @return array<string, mixed>|null
     */
    private function presentSubscription(Subscription $sub, array $planByPriceId): ?array
    {
        $user = $sub->owner;
        if ($user === null) {
            return null;
        }

        $matched = $sub->stripe_price ? ($planByPriceId[$sub->stripe_price] ?? null) : null;
        $plan = $matched['plan'] ?? null;
        $cycle = $matched['cycle'] ?? null;

        $amount = 0.0;
        $currency = 'USD';
        $description = 'Subscription';

        if ($plan !== null) {
            $amount = (float) ($cycle === 'yearly' ? $plan->yearly_price : $plan->monthly_price);
            $currency = $plan->currency ?? 'USD';
            $cycleLabel = $cycle === 'yearly' ? 'Yearly' : 'Monthly';
            $description = "{$plan->name} — {$cycleLabel}";
        }

        return [
            'id' => 'sub_'.$sub->id,
            'reference' => (string) $sub->stripe_id,
            'user' => $this->presentUser($user),
            'type' => 'subscription',
            'description' => $description,
            'amount' => $amount,
            'currency' => $currency,
            'status' => $this->mapSubscriptionStatus((string) $sub->stripe_status),
            'gateway' => 'stripe',
            'created_at' => optional($sub->created_at)->toIso8601String(),
        ];
    }

    /**
     * Project a CreditPackPurchase row into the unified transaction shape.
     *
     * @return array<string, mixed>|null
     */
    private function presentCreditPack(CreditPackPurchase $row): ?array
    {
        $user = $row->user;
        if ($user === null) {
            return null;
        }

        $packageName = $row->package?->name ?? 'Credit pack';
        $description = "{$packageName} — {$row->credits} credits";

        return [
            'id' => 'cp_'.$row->id,
            'reference' => $row->stripe_session_id,
            'user' => $this->presentUser($user),
            'type' => 'credit_pack',
            'description' => $description,
            'amount' => round($row->amountFloat(), 2),
            'currency' => $row->currency ?: 'USD',
            'status' => $row->status,
            'gateway' => 'stripe',
            'created_at' => optional($row->created_at)->toIso8601String(),
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, avatar: ?string}
     */
    private function presentUser($user): array
    {
        return [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'avatar' => $user->avatar ?? null,
        ];
    }

    /**
     * Map Cashier/Stripe subscription statuses onto the invoice-like
     * status set the admin UI displays. Keeps the frontend ignorant of
     * subscription internals.
     */
    private function mapSubscriptionStatus(string $stripeStatus): string
    {
        return match ($stripeStatus) {
            'active', 'trialing' => 'paid',
            'past_due' => 'open',
            'canceled', 'incomplete_expired' => 'void',
            'unpaid', 'incomplete' => 'uncollectible',
            default => 'pending',
        };
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function applyFilters(Collection $rows, string $type, string $status, string $q): Collection
    {
        $q = mb_strtolower($q);

        return $rows->filter(function (array $row) use ($type, $status, $q) {
            if ($type !== 'all' && $row['type'] !== $type) {
                return false;
            }
            if ($status !== 'all' && $row['status'] !== $status) {
                return false;
            }
            if ($q === '') {
                return true;
            }

            $haystack = mb_strtolower(implode(' ', [
                $row['user']['name'] ?? '',
                $row['user']['email'] ?? '',
                $row['reference'] ?? '',
                $row['description'] ?? '',
            ]));

            return str_contains($haystack, $q);
        });
    }

    /**
     * Compute the stats row from the *unfiltered* unified set so the
     * top-of-page numbers reflect overall billing, not the current
     * filter selection.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function buildStats(Collection $rows): array
    {
        $currency = $rows->first()['currency'] ?? 'USD';

        $subscriptions = $rows->where('type', 'subscription');
        $creditPacks = $rows->where('type', 'credit_pack');

        $subscriptionsRevenue = (float) $subscriptions
            ->where('status', 'paid')
            ->sum('amount');

        $creditPacksRevenue = (float) $creditPacks
            ->where('status', 'completed')
            ->sum('amount');

        $paidInvoices = $subscriptions
            ->where('status', 'paid')
            ->count()
            + $creditPacks
                ->where('status', 'completed')
                ->count();

        return [
            'gross_revenue' => round($subscriptionsRevenue + $creditPacksRevenue, 2),
            'subscriptions_revenue' => round($subscriptionsRevenue, 2),
            'credit_packs_revenue' => round($creditPacksRevenue, 2),
            'paid_invoices' => $paidInvoices,
            'currency' => $currency,
        ];
    }
}
