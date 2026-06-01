<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Move every existing row in `ai_content_configs` over to the new
 * `ai_content_task_assignments` table as the task's default
 * assignment, then drop the legacy table.
 *
 * Done as a single migration so the system is never in a state
 * where the resolver has neither side populated. Down() is
 * intentionally a no-op for the data move — restoring a
 * destructive drop is not worth the complexity given migrations
 * are normally not rolled back across this kind of refactor;
 * the legacy table itself is recreated empty for schema parity
 * if someone really does roll back.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_content_configs')) {
            return;
        }

        $now = now();
        $taskIds = DB::table('ai_content_tasks')->pluck('id', 'key');

        $rows = DB::table('ai_content_configs')->get();
        foreach ($rows as $row) {
            $taskId = $taskIds[$row->task_type] ?? null;
            if ($taskId === null) {
                // Unknown task_type — skip rather than fail the migration.
                // Admin can re-create it from the UI if needed.
                continue;
            }

            // Use updateOrInsert against the unique index so the migration
            // is idempotent if it's run after a partial backfill.
            DB::table('ai_content_task_assignments')->updateOrInsert(
                [
                    'ai_content_task_id' => $taskId,
                    'ai_provider_id' => $row->ai_provider_id,
                    'ai_provider_model_id' => $row->ai_provider_model_id,
                ],
                [
                    'temperature' => $row->temperature ?? 0.70,
                    'max_tokens' => $row->max_tokens ?? 4096,
                    'is_default' => true,
                    'sort_order' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        Schema::drop('ai_content_configs');
    }

    public function down(): void
    {
        if (Schema::hasTable('ai_content_configs')) {
            return;
        }

        // Recreate the legacy table empty so the schema looks like
        // it did before. We do NOT attempt to copy assignments back —
        // the old 1:1 contract can't be reproduced when a task has
        // more than one assignment.
        Schema::create('ai_content_configs', function ($table) {
            $table->id();
            $table->string('task_type')->unique();
            $table->foreignId('ai_provider_id')
                ->constrained('ai_providers')
                ->cascadeOnDelete();
            $table->foreignId('ai_provider_model_id')
                ->constrained('ai_provider_models')
                ->cascadeOnDelete();
            $table->decimal('temperature', 3, 2)->default(0.7);
            $table->unsignedInteger('max_tokens')->default(4096);
            $table->timestamps();
        });
    }
};
