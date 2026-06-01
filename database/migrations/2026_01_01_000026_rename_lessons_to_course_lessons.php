<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Rename the `lessons` table to `course_lessons`. No other table holds
 * a foreign key into `lessons` today (verified via `lesson_id` /
 * `->on('lessons')` greps across all migrations), so a plain
 * Schema::rename is sufficient. `Lesson::$table` is pinned to
 * `course_lessons` on the model so Eloquent doesn't fall back to its
 * naming convention.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lessons') && ! Schema::hasTable('course_lessons')) {
            Schema::rename('lessons', 'course_lessons');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('course_lessons') && ! Schema::hasTable('lessons')) {
            Schema::rename('course_lessons', 'lessons');
        }
    }
};
