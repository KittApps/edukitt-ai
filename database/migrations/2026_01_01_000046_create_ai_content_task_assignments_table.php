<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * (provider, model) assignments per AI generation task.
 *
 * Replaces the 1:1 `ai_content_configs` table. Each row is one
 * eligible (provider, model) combination an admin has approved for
 * a given task; exactly one row per task carries `is_default = true`
 * and is what the runtime resolver picks today (via
 * AiContentTaskAssignment::defaultForTaskKey). End users will later
 * be allowed to pick any non-default assignment as well.
 *
 * `temperature` + `max_tokens` are per-assignment so a cheap fast
 * model can be tuned differently from a flagship model on the
 * same task.
 *
 * Internal tasks (ai_content_tasks.is_internal = true) are limited
 * to a single row at the validation layer — enforced by the admin
 * controller, not the DB, so we keep the schema simple and don't
 * couple it to a flag that lives on a different table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_content_task_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_content_task_id')
                ->constrained('ai_content_tasks')
                ->cascadeOnDelete();
            $table->foreignId('ai_provider_id')
                ->constrained('ai_providers')
                ->cascadeOnDelete();
            $table->foreignId('ai_provider_model_id')
                ->constrained('ai_provider_models')
                ->cascadeOnDelete();
            $table->decimal('temperature', 3, 2)->default(0.70);
            $table->unsignedInteger('max_tokens')->default(4096);
            $table->boolean('is_default')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            // Same (provider, model) can't be added twice to the same
            // task — admins should bump the existing row instead.
            $table->unique(
                ['ai_content_task_id', 'ai_provider_id', 'ai_provider_model_id'],
                'ai_content_task_assignments_unique',
            );

            // Hot path: resolver looks up "the default for task N".
            $table->index(
                ['ai_content_task_id', 'is_default'],
                'ai_content_task_assignments_default_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_content_task_assignments');
    }
};
