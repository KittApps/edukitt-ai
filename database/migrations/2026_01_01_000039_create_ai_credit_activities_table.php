<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Flat per-request credit activity log.
 *
 * One row per AI invocation that consumed credits. This is the
 * source of truth for the user-facing Usage tab and is independent
 * of the operations-facing ai_token_usages table (which keeps every
 * provider/token detail). Storing credit math here keeps the user
 * report immune to provider rate changes and pricing-rate edits.
 *
 * subscription_period_start is the user's period_starts_at at the
 * moment of the call. Used as a stable bucket key so the period
 * summary row never needs to JOIN user_credit_balances.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_credit_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('task_type', 64);
            $table->string('provider', 64)->nullable();
            $table->string('model', 128)->nullable();

            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);

            $table->decimal('cost_usd', 12, 6)->default(0);
            $table->unsignedInteger('credits_used')->default(0);

            // How the debit was funded: plan vs purchased buckets.
            // Helps users understand "X plan + Y purchased" usage.
            $table->unsignedInteger('plan_credits_used')->default(0);
            $table->unsignedInteger('purchased_credits_used')->default(0);

            // Bucket key for the current period. Aligns with
            // user_credit_balances.period_starts_at at the time
            // of the call.
            $table->date('subscription_period_start')->nullable();

            // Optional context (course_id, lesson_id, quiz_id, ...).
            $table->json('meta')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'subscription_period_start']);
            $table->index('task_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_credit_activities');
    }
};
