<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Event log of every LLM call. Costs are computed at write-time using
 * the pricing rates captured on the row, so historical cost data is
 * immune to future provider rate changes.
 *
 * Indexes are tuned for the analytics aggregations on
 * /admin/analytics/ai-tokens-usage and /admin/analytics/ai-tokens-cost.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_token_usages', function (Blueprint $table) {
            $table->id();

            // Who & what
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('task_type', 64)->index();
            $table->string('invocation_id', 64)->index();

            // Provider/model snapshot — FKs for joins, slug/model_id strings for
            // analytics queries that must keep working even if a provider is later removed.
            $table->foreignId('ai_provider_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ai_provider_model_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider_slug', 64)->nullable();
            $table->string('model_id', 128)->nullable();

            // Token counts (laravel/ai Usage shape)
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('cache_read_input_tokens')->default(0);
            $table->unsignedInteger('cache_write_input_tokens')->default(0);
            $table->unsignedInteger('reasoning_tokens')->default(0);

            // Pricing snapshot (USD per 1M tokens)
            $table->decimal('input_rate', 10, 4)->nullable();
            $table->decimal('output_rate', 10, 4)->nullable();

            // Computed at write-time using the snapshot rates
            $table->decimal('input_cost', 12, 6)->default(0);
            $table->decimal('output_cost', 12, 6)->default(0);
            $table->decimal('total_cost', 12, 6)->default(0);

            // Polymorphic link to the generated subject (Quiz, QuickLearn, Course, Lesson, ...)
            $table->nullableMorphs('trackable');

            $table->timestamps();

            // Hot paths for the analytics dashboards.
            $table->index('created_at');
            $table->index(['user_id', 'created_at']);
            $table->index(['task_type', 'created_at']);
            $table->index(['ai_provider_id', 'ai_provider_model_id', 'created_at'], 'ai_token_usages_provider_model_time_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_token_usages');
    }
};
