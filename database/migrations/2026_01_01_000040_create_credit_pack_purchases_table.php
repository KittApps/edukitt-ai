<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Local ledger of one-off credit pack purchases.
 *
 * Cashier stores subscription rows (subscriptions / subscription_items)
 * but does not persist one-off Checkout sessions. We record them here
 * on `checkout.session.completed` so the admin Transactions page can
 * read both purchase types from the local database without round-trips
 * to the Stripe API.
 *
 * `stripe_session_id` is unique so webhook retries are idempotent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_pack_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('credit_package_id')
                ->nullable()
                ->constrained('credit_packages')
                ->nullOnDelete();

            $table->unsignedInteger('credits');
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 3)->default('USD');

            $table->string('stripe_session_id')->unique();
            $table->string('stripe_payment_intent_id')->nullable()->index();

            // completed | failed | pending
            $table->string('status', 16)->default('completed');

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_pack_purchases');
    }
};
