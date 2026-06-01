<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Narrow, append-only log of real AI provider call failures.
 *
 * Written only when {@see \App\Services\Ai\AiService::invokeWithRetry()}
 * exhausts its retry budget — pre-flight billing / plan / no-model
 * exceptions throw earlier so they never reach the logger. Successful
 * calls are NOT logged here; their counts come from `ai_token_usages`
 * (which always has a row per successful prompt) so the success path
 * stays free of extra writes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_call_failures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('task_type', 64);
            $table->string('provider_slug', 64)->nullable();
            $table->string('error_class', 160)->nullable();
            $table->string('error_message', 1000)->nullable();
            $table->timestamp('created_at')->useCurrent();

            // Timeseries query (range-scan) + latest-errors panel
            // (`ORDER BY created_at DESC LIMIT 25`).
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_call_failures');
    }
};
