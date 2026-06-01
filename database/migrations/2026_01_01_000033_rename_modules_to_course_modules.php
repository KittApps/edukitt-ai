<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rename the `modules` table to `course_modules`. Two tables hold inbound
 * foreign keys (`course_lessons.module_id` and `course_quizzes.module_id`);
 * both are dropped and re-created against the new table name so the
 * constraint names follow the current host-table convention. The
 * `course_lessons` FK is legacy-named `lessons_module_id_foreign`
 * (predates the `lessons` -> `course_lessons` rename), so we drop it by
 * its explicit constraint name rather than via `dropForeign(['module_id'])`,
 * which would otherwise compute the wrong name. The connection's table
 * prefix is prepended manually because `dropForeign($name)` does not
 * apply the prefix to explicit constraint names. `Module::$table` is
 * pinned to `course_modules` on the model so Eloquent doesn't fall back
 * to its naming convention.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('modules') && ! Schema::hasTable('course_modules')) {
            $prefix = Schema::getConnection()->getTablePrefix();
            Schema::table('course_lessons', function (Blueprint $table) use ($prefix) {
                $table->dropForeign($prefix . 'lessons_module_id_foreign');
            });
            Schema::table('course_quizzes', function (Blueprint $table) {
                $table->dropForeign(['module_id']);
            });

            Schema::rename('modules', 'course_modules');

            Schema::table('course_lessons', function (Blueprint $table) {
                $table->foreign('module_id')
                    ->references('id')->on('course_modules')->cascadeOnDelete();
            });
            Schema::table('course_quizzes', function (Blueprint $table) {
                $table->foreign('module_id')
                    ->references('id')->on('course_modules')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('course_modules') && ! Schema::hasTable('modules')) {
            Schema::table('course_lessons', function (Blueprint $table) {
                $table->dropForeign(['module_id']);
            });
            Schema::table('course_quizzes', function (Blueprint $table) {
                $table->dropForeign(['module_id']);
            });

            Schema::rename('course_modules', 'modules');

            Schema::table('course_lessons', function (Blueprint $table) {
                $table->foreign('module_id')
                    ->references('id')->on('modules')->cascadeOnDelete();
            });
            Schema::table('course_quizzes', function (Blueprint $table) {
                $table->foreign('module_id')
                    ->references('id')->on('modules')->cascadeOnDelete();
            });
        }
    }
};
