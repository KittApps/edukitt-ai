<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Backfill the AI task-type rename `lesson_content` -> `course_lesson`
 * across every table that persists the task key. Idempotent: each UPDATE
 * is guarded by a WHERE on the old key so re-running is a no-op.
 *
 * The `settings` table has a UNIQUE(group, key); we guard against a
 * pre-existing `course_lesson` row (e.g. partially-rerun migration) by
 * deleting the old `lesson_content` row in that case rather than failing
 * the UPDATE on the unique constraint.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('settings')) {
            $hasNew = DB::table('settings')
                ->where('group', 'ai_prompt')
                ->where('key', 'course_lesson')
                ->exists();

            if ($hasNew) {
                DB::table('settings')
                    ->where('group', 'ai_prompt')
                    ->where('key', 'lesson_content')
                    ->delete();
            } else {
                DB::table('settings')
                    ->where('group', 'ai_prompt')
                    ->where('key', 'lesson_content')
                    ->update(['key' => 'course_lesson']);
            }
        }

        if (Schema::hasTable('ai_content_configs')) {
            $hasNew = DB::table('ai_content_configs')
                ->where('task_type', 'course_lesson')
                ->exists();

            if ($hasNew) {
                DB::table('ai_content_configs')
                    ->where('task_type', 'lesson_content')
                    ->delete();
            } else {
                DB::table('ai_content_configs')
                    ->where('task_type', 'lesson_content')
                    ->update(['task_type' => 'course_lesson']);
            }
        }

        if (Schema::hasTable('ai_token_usages')) {
            DB::table('ai_token_usages')
                ->where('task_type', 'lesson_content')
                ->update(['task_type' => 'course_lesson']);
        }

        if (Schema::hasTable('personalize_option_groups')) {
            DB::table('personalize_option_groups')
                ->where('task_type', 'lesson_content')
                ->update(['task_type' => 'course_lesson']);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('settings')) {
            $hasOld = DB::table('settings')
                ->where('group', 'ai_prompt')
                ->where('key', 'lesson_content')
                ->exists();

            if ($hasOld) {
                DB::table('settings')
                    ->where('group', 'ai_prompt')
                    ->where('key', 'course_lesson')
                    ->delete();
            } else {
                DB::table('settings')
                    ->where('group', 'ai_prompt')
                    ->where('key', 'course_lesson')
                    ->update(['key' => 'lesson_content']);
            }
        }

        if (Schema::hasTable('ai_content_configs')) {
            $hasOld = DB::table('ai_content_configs')
                ->where('task_type', 'lesson_content')
                ->exists();

            if ($hasOld) {
                DB::table('ai_content_configs')
                    ->where('task_type', 'course_lesson')
                    ->delete();
            } else {
                DB::table('ai_content_configs')
                    ->where('task_type', 'course_lesson')
                    ->update(['task_type' => 'lesson_content']);
            }
        }

        if (Schema::hasTable('ai_token_usages')) {
            DB::table('ai_token_usages')
                ->where('task_type', 'course_lesson')
                ->update(['task_type' => 'lesson_content']);
        }

        if (Schema::hasTable('personalize_option_groups')) {
            DB::table('personalize_option_groups')
                ->where('task_type', 'course_lesson')
                ->update(['task_type' => 'lesson_content']);
        }
    }
};
