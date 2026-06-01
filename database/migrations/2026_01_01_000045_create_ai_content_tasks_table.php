<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Catalog of AI generation tasks the admin can configure.
 *
 * Tasks are the "what" of an AI call (e.g. "course_outline",
 * "quick_learn"). The (provider, model) "how" lives on the
 * paired ai_content_task_assignments table — one task can carry
 * many assignments, with one flagged as default.
 *
 * `is_internal` marks tasks that are never surfaced to end users
 * (e.g. content summarisation done as part of an outline call).
 * The admin UI restricts those tasks to a single assignment so the
 * runtime resolver has exactly one model to pick from.
 *
 * Tasks are seeded from the previously-hardcoded list in
 * AiContentController so existing prompt + personalize wiring
 * keeps its `task_type` keys.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_content_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->text('description')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        DB::table('ai_content_tasks')->insert([
            [
                'key' => 'default',
                'label' => 'Default (Fallback)',
                'description' => 'Used by any task that does not have its own provider configured.',
                'is_internal' => false,
                'sort_order' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'course_outline',
                'label' => 'Course Outline Generation',
                'description' => null,
                'is_internal' => false,
                'sort_order' => 10,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'course_lesson',
                'label' => 'Course Lesson Generation',
                'description' => null,
                'is_internal' => false,
                'sort_order' => 20,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'quick_learn',
                'label' => 'Quick Learn Generation',
                'description' => null,
                'is_internal' => false,
                'sort_order' => 30,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'quiz_generate',
                'label' => 'Quiz Generation',
                'description' => null,
                'is_internal' => false,
                'sort_order' => 40,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'content_summary',
                'label' => 'Content Summary',
                'description' => 'Internal: used to compress attached materials before passing them to a downstream task. Never user-selectable.',
                'is_internal' => true,
                'sort_order' => 50,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_content_tasks');
    }
};
