<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Track which plan a user is currently on (free or paid). The relation
 * is the source of truth for plan-driven feature limits and for the
 * credit refill amount on renewal.
 *
 * `previous_paid_plan_id` lets us show the "Your plan expired" banner
 * after a paid subscription ends (drops back to default free plan).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('subscription_plan_id')
                ->nullable()
                ->after('avatar')
                ->constrained('subscription_plans')
                ->nullOnDelete();

            $table->foreignId('previous_paid_plan_id')
                ->nullable()
                ->after('subscription_plan_id')
                ->constrained('subscription_plans')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subscription_plan_id');
            $table->dropConstrainedForeignId('previous_paid_plan_id');
        });
    }
};
