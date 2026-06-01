<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin-managed subscription plans. Replaces the mock plan array used
 * during the design phase.
 *
 * Key columns:
 *   - default_credits / rollover_unused_credits power the credit
 *     allowance per billing period (see UserCreditBalance for the
 *     per-user counters).
 *   - is_default marks the plan automatically assigned to new users
 *     on registration. Only one plan can be the default at a time;
 *     enforcement lives in SubscriptionService::setDefault().
 *   - stripe_* columns are populated by the admin when wiring Stripe
 *     prices to a plan. Free plans (price 0) leave them null.
 *   - limits/features are flexible JSON blobs so the catalogue of
 *     feature flags can evolve without schema churn.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('cta_label')->nullable();

            $table->decimal('monthly_price', 10, 2)->default(0);
            $table->decimal('yearly_price', 10, 2)->default(0);
            $table->string('currency', 3)->default('USD');

            // Credits
            $table->unsignedInteger('default_credits')->default(0);
            $table->boolean('rollover_unused_credits')->default(false);

            // Stripe wiring
            $table->string('stripe_product_id')->nullable();
            $table->string('stripe_monthly_price_id')->nullable();
            $table->string('stripe_yearly_price_id')->nullable();
            $table->timestamp('stripe_synced_at')->nullable();

            // Limits + marketing copy
            $table->json('limits')->nullable();
            $table->json('features')->nullable();

            $table->boolean('is_active')->default(true);
            $table->boolean('is_popular')->default(false);
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
            $table->index('is_default');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
