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
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Billing\CreditPricingService;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin CRUD for SubscriptionPlan. Replaces the mock-only controller.
 *
 * Mirrors the legacy form shape (`plan` + `featureCatalog`) so the
 * existing Plan form components keep working while gaining a Credits
 * section. Stripe price IDs are entered manually by the operator and
 * stored straight from the form; we never push to Stripe ourselves.
 * The `stripe_product_id` / `stripe_synced_at` columns are kept for
 * forward compatibility but no longer surfaced in the admin UI.
 */
class SubscriptionPlansController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
        private readonly CreditPricingService $pricing,
    ) {}

    public function index(): Response
    {
        $plans = SubscriptionPlan::query()
            ->orderBy('sort_order')
            ->orderBy('monthly_price')
            ->get();

        return Inertia::render('Admin/SubscriptionPlans/Index', [
            'plans' => $plans->map(fn (SubscriptionPlan $p) => $this->present($p)),
            'defaultPlanId' => $plans->firstWhere('is_default', true)?->id,
            'stats' => [
                'plans_total' => $plans->count(),
                'plans_active' => $plans->where('is_active', true)->count(),
                'subscribers_total' => User::query()->whereNotNull('subscription_plan_id')->count(),
                'mrr' => 0.0, // placeholder; computed via Stripe analytics when live
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/SubscriptionPlans/Form', [
            'mode' => 'create',
            'plan' => $this->blankPlan(),
            'featureCatalog' => $this->featureCatalog(),
            'creditRateUsd' => $this->pricing->rate(),
        ]);
    }

    public function edit(SubscriptionPlan $plan): Response
    {
        return Inertia::render('Admin/SubscriptionPlans/Form', [
            'mode' => 'edit',
            'plan' => $this->present($plan),
            'featureCatalog' => $this->featureCatalog(),
            'creditRateUsd' => $this->pricing->rate(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);

        $plan = SubscriptionPlan::create($data);

        if ($plan->is_default) {
            $this->subscriptions->setDefault($plan);
        }

        return redirect()->route('admin.subscription-plans.index')
            ->with('success', 'Plan created.');
    }

    public function update(Request $request, SubscriptionPlan $plan): RedirectResponse
    {
        $data = $this->validatePayload($request);
        $plan->fill($data)->save();

        if ($plan->is_default) {
            $this->subscriptions->setDefault($plan);
        }

        return redirect()->route('admin.subscription-plans.index')
            ->with('success', 'Plan updated.');
    }

    public function destroy(SubscriptionPlan $plan): RedirectResponse
    {
        if ($plan->is_default) {
            return back()->withErrors(['plan' => 'Cannot delete the default plan.']);
        }

        $plan->delete();

        return redirect()->route('admin.subscription-plans.index')
            ->with('success', 'Plan deleted.');
    }

    public function makeDefault(SubscriptionPlan $plan): RedirectResponse
    {
        $this->subscriptions->setDefault($plan);

        return back()->with('success', "{$plan->name} is now the default plan.");
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request): array
    {
        $payload = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'cta_label' => 'nullable|string|max:80',
            'monthly_price' => 'required|numeric|min:0',
            'yearly_price' => 'required|numeric|min:0',
            'currency' => 'required|string|size:3',
            'default_credits' => 'required|integer|min:0',
            'rollover_unused_credits' => 'required|boolean',
            'stripe_monthly_price_id' => 'nullable|string|max:255',
            'stripe_yearly_price_id' => 'nullable|string|max:255',
            'limits' => 'nullable|array',
            'features' => 'nullable|array',
            'features.*.text' => 'required|string|max:255',
            'features.*.included' => 'required|boolean',
            'features.*.highlight' => 'nullable|boolean',
            'is_active' => 'required|boolean',
            'is_popular' => 'required|boolean',
            'is_default' => 'required|boolean',
            'sort_order' => 'required|integer|min:0',
        ]);

        $payload['slug'] = $payload['slug']
            ?: Str::slug($payload['name']).'-'.Str::lower(Str::random(4));
        $payload['currency'] = strtoupper($payload['currency']);

        return $payload;
    }

    private function present(SubscriptionPlan $plan): array
    {
        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'tagline' => $plan->tagline,
            'description' => $plan->description,
            'monthly_price' => (float) $plan->monthly_price,
            'yearly_price' => (float) $plan->yearly_price,
            'currency' => $plan->currency,
            'is_active' => $plan->is_active,
            'is_popular' => $plan->is_popular,
            'is_default' => $plan->is_default,
            'sort_order' => $plan->sort_order,
            'cta_label' => $plan->cta_label ?? 'Subscribe',
            'default_credits' => $plan->default_credits,
            'rollover_unused_credits' => $plan->rollover_unused_credits,
            'limits' => $plan->limits ?? [
                'max_courses' => 0,
                'max_lessons' => 0,
                'max_quick_learns' => 0,
                'max_quizzes' => 0,
                'priority_generation' => 0,
                'certificates' => 0,
            ],
            'features' => $plan->features ?? [],
            'stripe' => [
                'monthly_price_id' => $plan->stripe_monthly_price_id,
                'yearly_price_id' => $plan->stripe_yearly_price_id,
                'linked' => ! empty($plan->stripe_monthly_price_id)
                    && ! empty($plan->stripe_yearly_price_id),
            ],
            'subscriber_count' => User::query()
                ->where('subscription_plan_id', $plan->id)
                ->count(),
        ];
    }

    private function blankPlan(): array
    {
        return [
            'id' => null,
            'name' => '',
            'slug' => '',
            'tagline' => '',
            'description' => '',
            'monthly_price' => 0,
            'yearly_price' => 0,
            'currency' => 'USD',
            'is_active' => true,
            'is_popular' => false,
            'is_default' => false,
            'sort_order' => 0,
            'cta_label' => 'Subscribe',
            'default_credits' => 0,
            'rollover_unused_credits' => false,
            'limits' => [
                'max_courses' => 1,
                'max_lessons' => 10,
                'max_quick_learns' => 10,
                'max_quizzes' => 3,
                'priority_generation' => 0,
                'certificates' => 0,
            ],
            'features' => [
                ['text' => 'Basic AI models', 'included' => true],
            ],
            'stripe' => [
                'monthly_price_id' => null,
                'yearly_price_id' => null,
                'linked' => false,
            ],
            'subscriber_count' => 0,
        ];
    }

    private function featureCatalog(): array
    {
        return [
            ['key' => 'max_courses', 'label' => 'Course generations', 'unit' => '/ month', 'default' => 1],
            ['key' => 'max_lessons', 'label' => 'Course lesson generations', 'unit' => '/ month', 'default' => 10],
            ['key' => 'max_quick_learns', 'label' => 'Quick Learn generations', 'unit' => '/ month', 'default' => 10],
            ['key' => 'max_quizzes', 'label' => 'Quiz generations', 'unit' => '/ month', 'default' => 3],
            ['key' => 'priority_generation', 'label' => 'Priority generation', 'unit' => 'toggle', 'default' => 0],
            ['key' => 'certificates', 'label' => 'Certificates', 'unit' => 'toggle', 'default' => 0],
        ];
    }
}
