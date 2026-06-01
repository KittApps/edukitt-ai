<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pre-aggregated daily credit usage for the user-facing Usage chart.
 *
 * Each AI call UPSERTs the matching `(user_id, date, task_type)` row
 * incrementing `credits_used`, so the Usage tab can render a stacked
 * area chart from a single `SELECT * WHERE user_id=? AND date BETWEEN ?`
 * with no SUM / GROUP BY / JOIN.
 *
 * Forward step is destructive: the previous flat `ai_credit_activities`
 * activity log is dropped because the new chart-only payload no longer
 * needs per-call detail. Per-call telemetry (provider, model, tokens,
 * cost) lives in `ai_token_usages`, which is unrelated and untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Destructive: rich per-call activity log is replaced by the daily
        // rollup table below. Anything that previously read from this table
        // has been moved to `ai_token_usages` (telemetry) or
        // `user_credit_daily_usages` (chart).
        Schema::dropIfExists('ai_credit_activities');

        Schema::create('user_credit_daily_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('task_type', 64);
            $table->date('date');
            $table->unsignedInteger('credits_used')->default(0);

            $table->timestamps();

            $table->unique(['user_id', 'date', 'task_type'], 'uniq_user_date_task');
            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        // Forward step is destructive (the old activity log is dropped),
        // so down() only undoes what this migration created. Restoring
        // `ai_credit_activities` is intentionally left out — no caller
        // depends on it and no historical data needs to be preserved.
        Schema::dropIfExists('user_credit_daily_usages');
    }
};
