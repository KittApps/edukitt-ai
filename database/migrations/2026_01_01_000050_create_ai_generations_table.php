<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks every AI generation that runs on a worker.
 *
 * Powers the wizard's "is my generation done yet?" polling endpoint,
 * the admin's failure inspection, and the per-task cleanup of stranded
 * upload attachments. The status column drives a state machine:
 *
 *   pending  → queued, not yet picked up by a worker
 *   running  → a worker dequeued the job and is currently running it
 *   completed → the worker built and persisted the subject (Course/Quiz/QuickLearn/Quiz)
 *   failed   → the worker errored out (or no model was available)
 *
 * `redirect_url` is populated by the persister when status becomes
 * `completed` so the front-end can navigate without re-querying the
 * subject. `error_message` is the sanitised user-facing message we
 * also surface in /admin/analytics later if needed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_generations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // The logical task that produced this generation: matches
            // the same keys used by AiContentTask + AiService prompt().
            $table->string('task_key', 64)->index();

            // Snapshot of the (provider, model) assignment the resolver
            // picked. Nullable because an assignment can be deleted from
            // the admin panel after a generation finishes; we never lose
            // the row.
            $table->foreignId('ai_content_task_assignment_id')->nullable()
                ->constrained('ai_content_task_assignments')
                ->nullOnDelete();

            // State machine. Plain string (not enum) so adding new states
            // later doesn't require a migration on every DB engine.
            $table->string('status', 16)->default('pending');

            // Per-task input payload (topic, personalization, time limit,
            // regenerate_instructions, language, …). The persister knows
            // how to decode its own shape; everything else is opaque.
            $table->json('input')->nullable();

            // Paths to uploaded files (Course Outline only today). Stored
            // on the `local` disk by the controller before dispatch;
            // cleaned up by the job after it completes / fails.
            $table->json('attachment_paths')->nullable();

            // Display name (e.g. "English") to thread into the agent.
            $table->string('language', 64)->nullable();

            // Polymorphic link to whichever model the persister produced:
            // Quiz, QuickLearn, Course, etc. Null while pending/running,
            // on failure, AND for flows like Course Outline where the
            // AI step produces JSON to be confirmed by the wizard
            // before a Course is actually created.
            $table->nullableMorphs('subject');

            // Pre-computed by the persister so the polling endpoint
            // doesn't have to know per-subject route conventions.
            // Populated when the wizard should navigate away (Quick
            // Learn / Quiz), null when the wizard continues to the
            // next step (Course Outline → Review).
            $table->string('redirect_url', 500)->nullable();

            // Freeform per-task result payload. Course Outline parks
            // the AI-built outline here so the wizard's Review step can
            // render it through the polling endpoint without a second
            // round-trip. Quick Learn / Quiz leave this null because
            // their result is the persisted subject.
            $table->json('result_payload')->nullable();

            // User-facing error message on failure. Real stack trace is
            // in the standard Laravel log; this is what we show in the UI.
            $table->text('error_message')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Hot path: a user polling for their own pending generations.
            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_generations');
    }
};
