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

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Users\AdjustCreditsRequest;
use App\Http\Requests\Admin\Users\SetPasswordRequest;
use App\Http\Requests\Admin\Users\StoreUserRequest;
use App\Http\Requests\Admin\Users\UpdateUserRequest;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserCreditBalance;
use App\Services\Billing\CreditPricingService;
use App\Services\Billing\CreditService;
use App\Services\Billing\SubscriptionService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin Users management.
 *
 * The list/show shape is paginated server-side with search +
 * `role` / `plan` / `verified` filters that all map to real columns
 * on the `users` table. The Create/Edit panes treat the subscription
 * change as a *manual override*: Stripe is never contacted from here,
 * so the admin can freely grant comp accounts, fix lapsed renewals
 * or assign internal users to a plan without going through Checkout.
 *
 *   - `index()`            : paginated list + filters + stats
 *   - `create()` / `store()` : new-user form + persistence
 *   - `edit()` / `update()`  : Basics + Subscription panes
 *   - `adjustCredits()`    : Credits pane delta (locked txn)
 *   - `sendPasswordReset()` / `setPassword()` : Password pane actions
 *   - `destroy()`          : delete with self + last-admin guards
 */
class UsersController extends Controller
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly CreditService $credits,
        private readonly CreditPricingService $pricing,
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function index(Request $request): Response
    {
        $q = trim($request->string('q')->toString());
        $role = $request->string('role')->toString() ?: 'all';
        $plan = $request->string('plan')->toString() ?: 'all';
        $verified = $request->string('verified')->toString() ?: 'all';
        $status = $request->string('status')->toString() ?: 'all';

        $paginator = User::query()
            // `is_active` is required by SubscriptionService::resolveStatus()
            // — without it `$plan->is_active` comes back null and every row
            // gets misreported as `plan_disabled`.
            ->with(['subscriptionPlan:id,name,slug,monthly_price,yearly_price,is_active', 'creditBalance'])
            ->when($q !== '', fn (Builder $b) => $b->where(function (Builder $b) use ($q) {
                $b->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            }))
            ->when($role === 'admin', fn (Builder $b) => $b->where('is_admin', true))
            ->when($role === 'user', fn (Builder $b) => $b->where('is_admin', false))
            ->when($plan !== 'all' && $plan !== '' && is_numeric($plan),
                fn (Builder $b) => $b->where('subscription_plan_id', (int) $plan))
            ->when($verified === 'verified', fn (Builder $b) => $b->whereNotNull('email_verified_at'))
            ->when($verified === 'unverified', fn (Builder $b) => $b->whereNull('email_verified_at'))
            ->when($status === 'active', fn (Builder $b) => $b->where('is_active', true))
            ->when($status === 'inactive', fn (Builder $b) => $b->where('is_active', false))
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => [
                'data' => $paginator->getCollection()->map(fn (User $u) => $this->present($u))->all(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
            'filters' => [
                'q' => $q,
                'role' => $role,
                'plan' => $plan,
                'verified' => $verified,
                'status' => $status,
            ],
            'plans' => $this->planOptions(),
            'stats' => $this->buildStats(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Users/Create', [
            'plans' => $this->planOptions(),
            'creditRateUsd' => $this->pricing->rate(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'is_admin' => (bool) $data['is_admin'],
                'is_active' => (bool) ($data['is_active'] ?? true),
                'subscription_plan_id' => $data['subscription_plan_id'] ?? null,
                'email_verified_at' => ($data['email_verified'] ?? false)
                    ? CarbonImmutable::now()
                    : null,
            ]);

            // Seed the credit balance row so the Credits pane has
            // something to display immediately and the renewal cron
            // can find an anchor period.
            $this->credits->getOrCreateBalance($user);

            return $user;
        });

        return redirect()
            ->route('admin.users.edit', $user)
            ->with('success', "User \"{$user->name}\" created.");
    }

    public function edit(User $user): Response
    {
        $user->load(['subscriptionPlan', 'creditBalance']);

        // Make sure a balance row exists for the Credits pane. Cheap
        // (one indexed read + at most one insert on first-ever edit).
        $balance = $this->credits->getOrCreateBalance($user);

        return Inertia::render('Admin/Users/Edit', [
            'user' => $this->presentForEdit($user, $balance),
            'plans' => $this->planOptions(),
            'creditRateUsd' => $this->pricing->rate(),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();

        // Self-deactivation guard: refuse before opening the transaction
        // so we don't accidentally roll back unrelated state. Same shape
        // as the destroy() self-delete guard for UI consistency.
        $wantsActive = (bool) ($data['is_active'] ?? true);
        if (! $wantsActive
            && $request->user() !== null
            && $request->user()->id === $user->id
        ) {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        DB::transaction(function () use ($user, $data) {
            // Snapshot the OLD plan id before any writes so the
            // upgrade/downgrade rule inside applyManualPlanChange can
            // still see the previous state. Plan id deliberately not
            // written here — SubscriptionService owns that column when
            // the plan changes.
            $oldPlanId = $user->subscription_plan_id;
            $newPlanId = $data['subscription_plan_id'] ?? null;
            $planChanged = ($oldPlanId === null) !== ($newPlanId === null)
                || (int) $oldPlanId !== (int) $newPlanId;

            $user->fill([
                'name' => $data['name'],
                'email' => $data['email'],
                'is_admin' => (bool) $data['is_admin'],
                'is_active' => (bool) ($data['is_active'] ?? true),
            ]);

            // Toggle email verification only when its state changed —
            // avoids clobbering the original verification timestamp on
            // an unrelated Basics save.
            $isVerifiedNow = $user->email_verified_at !== null;
            $wantsVerified = (bool) ($data['email_verified'] ?? false);
            if ($wantsVerified !== $isVerifiedNow) {
                $user->email_verified_at = $wantsVerified ? CarbonImmutable::now() : null;
            }

            $user->save();

            // Detect whether the admin actually edited the period
            // override. The Edit form prefills both date inputs from
            // the current balance, so a "save Basics" round-trip
            // would otherwise silently rewrite the period window.
            $balance = $this->credits->getOrCreateBalance($user);
            $existingStart = optional($balance->period_starts_at)->toDateString();
            $existingEnd = optional($balance->period_ends_at)->toDateString();

            $rawStart = $data['period_starts_at'] ?? null;
            $rawEnd = $data['period_ends_at'] ?? null;
            $periodOverride = null;
            if (! empty($rawStart) && ! empty($rawEnd)
                && ($rawStart !== $existingStart || $rawEnd !== $existingEnd)) {
                $periodOverride = [
                    'start' => CarbonImmutable::parse($rawStart),
                    'end' => CarbonImmutable::parse($rawEnd),
                ];
            }

            if ($planChanged) {
                // Single canonical entry point — same upgrade-additive /
                // downgrade-replace rule the user-facing swap flow uses.
                // Handles the "no plan" case (zeros plan credits, keeps
                // purchased) and the period override transparently.
                $newPlan = $newPlanId !== null
                    ? SubscriptionPlan::find($newPlanId)
                    : null;

                $this->subscriptions->applyManualPlanChange(
                    $user,
                    $newPlan,
                    $periodOverride['start'] ?? null,
                    $periodOverride['end'] ?? null,
                );
            } elseif ($periodOverride !== null) {
                // Plan didn't change but the operator explicitly
                // edited the period dates — write them through
                // without touching the credit buckets.
                $this->credits->setPeriodWindow(
                    $user,
                    $periodOverride['start'],
                    $periodOverride['end'],
                );
            }
        });

        return redirect()
            ->route('admin.users.edit', $user)
            ->with('success', 'User updated.');
    }

    public function adjustCredits(AdjustCreditsRequest $request, User $user): RedirectResponse
    {
        $add = (int) ($request->input('add') ?? 0);
        $remove = (int) ($request->input('remove') ?? 0);
        $note = trim((string) $request->input('note', ''));

        // Defensive: seed the balance row first so the locked SELECT
        // below always finds one. The edit page also seeds, so this is
        // a no-op in the common case.
        $this->credits->getOrCreateBalance($user);

        DB::transaction(function () use ($user, $add, $remove) {
            $balance = UserCreditBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($add > 0) {
                $balance->plan_credits_remaining += $add;
            }

            if ($remove > 0) {
                $remaining = $remove;
                $planTake = min($balance->plan_credits_remaining, $remaining);
                $balance->plan_credits_remaining -= $planTake;
                $remaining -= $planTake;

                if ($remaining > 0) {
                    $purchasedTake = min($balance->purchased_credits_remaining, $remaining);
                    $balance->purchased_credits_remaining -= $purchasedTake;
                    // Anything left over is the admin asking to remove
                    // more credits than the user has — clamp at zero.
                }
            }

            $balance->save();
        });

        $summary = match (true) {
            $add > 0 && $remove > 0 => "+{$add} / −{$remove} credits adjusted.",
            $add > 0 => "+{$add} credits added.",
            $remove > 0 => "−{$remove} credits removed.",
            default => 'Credits adjusted.',
        };

        if ($note !== '') {
            $summary .= " Note: {$note}";
        }

        return back()->with('success', $summary);
    }

    public function sendPasswordReset(User $user): RedirectResponse
    {
        $status = Password::sendResetLink(['email' => $user->email]);

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('success', "Password reset email sent to {$user->email}.");
        }

        return back()->with(
            'error',
            'Could not send reset email: '.__($status),
        );
    }

    public function setPassword(SetPasswordRequest $request, User $user): RedirectResponse
    {
        $user->forceFill([
            'password' => Hash::make($request->string('password')->toString()),
        ])->save();

        return back()->with('success', 'Password updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user() !== null && $request->user()->id === $user->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        if ($user->is_admin) {
            $remainingAdmins = User::query()
                ->where('is_admin', true)
                ->where('id', '!=', $user->id)
                ->count();

            if ($remainingAdmins === 0) {
                return back()->with(
                    'error',
                    'Cannot delete the last remaining admin user.',
                );
            }
        }

        $name = $user->name;
        $user->delete();

        return redirect()
            ->route('admin.users.index')
            ->with('success', "User \"{$name}\" deleted.");
    }

    /**
     * Project a user into the list-row shape consumed by the admin
     * Users table.
     *
     * @return array<string, mixed>
     */
    private function present(User $user): array
    {
        $balance = $user->creditBalance;
        $credits = null;
        if ($balance !== null) {
            $credits = [
                'used' => (int) $balance->total_used_this_period,
                'total' => $balance->periodCapacity(),
            ];
        }

        $plan = $user->subscriptionPlan;

        return [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'avatar' => $user->avatar,
            'is_admin' => (bool) $user->is_admin,
            'is_active' => (bool) $user->is_active,
            'email_verified_at' => optional($user->email_verified_at)->toIso8601String(),
            'created_at' => optional($user->created_at)->toIso8601String(),
            'last_login_at' => optional($user->last_login_at)->toIso8601String(),
            'plan' => $plan === null ? null : [
                'id' => (int) $plan->id,
                'name' => (string) $plan->name,
                'slug' => (string) $plan->slug,
                'is_free' => $plan->isFree(),
            ],
            'credits' => $credits,
            // Same string the Edit page Subscription pane renders —
            // surfaced here so the list row can show it inline under
            // the plan badge without a separate request.
            'subscription_status' => $this->subscriptions->resolveStatus($user),
        ];
    }

    /**
     * Project a user into the rich Edit-form shape (adds password
     * presence, full plan summary card, balance details for the
     * Credits pane).
     *
     * @return array<string, mixed>
     */
    private function presentForEdit(User $user, UserCreditBalance $balance): array
    {
        $plan = $user->subscriptionPlan;

        return [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'avatar' => $user->avatar,
            'is_admin' => (bool) $user->is_admin,
            'is_active' => (bool) $user->is_active,
            'email_verified' => $user->email_verified_at !== null,
            'email_verified_at' => optional($user->email_verified_at)->toIso8601String(),
            'created_at' => optional($user->created_at)->toIso8601String(),
            'subscription_plan_id' => $user->subscription_plan_id,
            'subscription_status' => $this->subscriptions->resolveStatus($user),
            'plan' => $plan === null ? null : [
                'id' => (int) $plan->id,
                'name' => (string) $plan->name,
                'slug' => (string) $plan->slug,
                'monthly_price' => (float) $plan->monthly_price,
                'yearly_price' => (float) $plan->yearly_price,
                'currency' => (string) $plan->currency,
                'default_credits' => (int) $plan->default_credits,
                'is_free' => $plan->isFree(),
            ],
            'balance' => [
                'plan_remaining' => (int) $balance->plan_credits_remaining,
                'purchased_remaining' => (int) $balance->purchased_credits_remaining,
                'used' => (int) $balance->total_used_this_period,
                'total' => $balance->periodCapacity(),
                'period_starts_at' => optional($balance->period_starts_at)->toIso8601String(),
                'period_ends_at' => optional($balance->period_ends_at)->toIso8601String(),
            ],
        ];
    }

    /**
     * Plan list shared by the index filter dropdown and the
     * create/edit Subscription pane.
     *
     * @return array<int, array<string, mixed>>
     */
    private function planOptions(): array
    {
        return SubscriptionPlan::query()
            ->orderBy('sort_order')
            ->orderBy('monthly_price')
            ->get(['id', 'name', 'slug', 'monthly_price', 'yearly_price', 'currency', 'default_credits'])
            ->map(fn (SubscriptionPlan $p) => [
                'id' => (int) $p->id,
                'name' => (string) $p->name,
                'slug' => (string) $p->slug,
                'monthly_price' => (float) $p->monthly_price,
                'yearly_price' => (float) $p->yearly_price,
                'currency' => (string) $p->currency,
                'default_credits' => (int) $p->default_credits,
                'is_free' => $p->isFree(),
            ])
            ->all();
    }

    /**
     * Top-of-page stat cards. Computed from the full users table
     * (not the current filter) so the numbers reflect the whole base.
     *
     * @return array<string, int>
     */
    private function buildStats(): array
    {
        $total = User::query()->count();
        $admins = User::query()->where('is_admin', true)->count();
        $verified = User::query()->whereNotNull('email_verified_at')->count();

        // "Paid" = currently *active* paid subscriber. We require both:
        //   (a) the user's `subscription_plan_id` points at a paid plan
        //       (defensive — keeps us from miscounting if a Cashier row
        //       and the local plan column ever drift), and
        //   (b) a Cashier `subscriptions` row in a healthy state:
        //       `stripe_status` ∈ {active, trialing} OR within the
        //       grace-period window (`ends_at > now`). This is the SQL
        //       equivalent of `Subscription::valid()` and matches the
        //       statuses `SubscriptionService::resolveStatus()` returns
        //       as `active` / `trialing` / `on_grace_period`. It cleanly
        //       excludes `past_due`, fully-canceled (`ends_at` past),
        //       `incomplete`, and admin-disabled-plan users.
        $paid = User::query()
            ->whereHas('subscriptionPlan', function (Builder $b) {
                $b->where('monthly_price', '>', 0)
                    ->orWhere('yearly_price', '>', 0);
            })
            ->whereHas('subscriptions', function (Builder $b) {
                $b->where('type', SubscriptionService::CASHIER_SUBSCRIPTION_NAME)
                    ->where(function (Builder $b) {
                        $b->whereIn('stripe_status', ['active', 'trialing'])
                            ->orWhere(function (Builder $b) {
                                $b->whereNotNull('ends_at')
                                    ->where('ends_at', '>', now());
                            });
                    });
            })
            ->count();

        return [
            'total' => $total,
            'admins' => $admins,
            'verified' => $verified,
            'paid' => $paid,
        ];
    }
}
