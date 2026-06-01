<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin-managed one-off credit packs sold via Stripe Checkout.
 *
 * Credits granted by a pack go into `purchased_credits_remaining`
 * on user_credit_balances and never expire — see CreditService.
 *
 * The `price_cents` column stores the unit price in the smallest
 * denomination of `currency` (USD by default) to mirror Stripe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('credits');
            $table->unsignedInteger('price_cents');
            $table->string('currency', 3)->default('USD');
            $table->string('stripe_price_id')->nullable();
            $table->string('badge')->nullable(); // popular | best | null
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_packages');
    }
};
