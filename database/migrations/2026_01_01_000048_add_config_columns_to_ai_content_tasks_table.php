<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-task admin-tunable runtime knobs for the AI content tasks.
 *
 * Each column is a typed flag the admin sees on the task editor's
 * "Configuration" sub-tab. Whether a column is *applicable* to a
 * given task is decided in PHP (AiContentTask::applicableConfigKeys)
 * — irrelevant columns are left at their default and never surfaced
 * in that task's UI.
 *
 *  - personalize_enabled       — controls the Personalize step on
 *                                 user-facing tasks that ship one.
 *  - resources_enabled         — toggles the resources/docs upload
 *                                 box on the course outline form.
 *  - resources_max_files       — upper bound on file count.
 *  - resources_max_file_size_mb — upper bound on each file's size.
 *
 * New per-task knobs: add a column here + entry in
 * AiContentTask::APPLICABLE_CONFIG. The controller and the React
 * Configuration card pick them up automatically.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_content_tasks', function (Blueprint $table) {
            $table->boolean('personalize_enabled')->default(true)->after('is_internal');
            $table->boolean('resources_enabled')->default(false)->after('personalize_enabled');
            $table->unsignedSmallInteger('resources_max_files')->default(5)->after('resources_enabled');
            $table->unsignedSmallInteger('resources_max_file_size_mb')->default(10)->after('resources_max_files');
        });
    }

    public function down(): void
    {
        Schema::table('ai_content_tasks', function (Blueprint $table) {
            $table->dropColumn([
                'personalize_enabled',
                'resources_enabled',
                'resources_max_files',
                'resources_max_file_size_mb',
            ]);
        });
    }
};
