<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-user credit counters. One row per user, kept up to date by
 * CreditService so the hot path (debit / pre-check / page load)
 * never needs a SUM over ai_credit_activities.
 *
 * Two-bucket accounting:
 *   - plan_credits_remaining: from the user's current plan, resets
 *     every period (rollover may carry leftovers).
 *   - purchased_credits_remaining: from one-off credit packs,
 *     never reset by renewals.
 *
 * Period tracking:
 *   - period_starts_at / period_ends_at define the active billing
 *     window. For free users this is a calendar month managed by
 *     the renewal cron / login hook. For paid users it follows
 *     the Stripe subscription current_period_*.
 *   - total_used_this_period mirrors SUM(credits_used) for the
 *     current window so the user-facing page can render
 *     "{used} / {capacity}" without scanning the activity log.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_credit_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();

            $table->unsignedInteger('plan_credits_remaining')->default(0);
            $table->unsignedInteger('purchased_credits_remaining')->default(0);
            $table->unsignedInteger('total_used_this_period')->default(0);

            $table->timestamp('period_starts_at')->nullable();
            $table->timestamp('period_ends_at')->nullable();
            $table->timestamp('last_renewed_at')->nullable();

            $table->timestamps();

            $table->index('period_ends_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_credit_balances');
    }
};
