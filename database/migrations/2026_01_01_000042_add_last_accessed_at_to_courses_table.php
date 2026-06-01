<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks the last time the owner opened a course (or any lesson under it).
 * Powers the dashboard "Continue Learning" sort, which is a true
 * recency-of-visit list rather than a recency-of-mutation list. Kept
 * separate from `updated_at` so that unrelated writes (status flips,
 * lesson generation, etc.) don't promote a course in the list.
 *
 * The composite `(user_id, status, last_accessed_at)` index covers the
 * dashboard query: filter by owner + status, then order by last access.
 * The existing single-column `user_id` / `status` indexes stay in place
 * for other queries.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->timestamp('last_accessed_at')->nullable()->after('updated_at');

            $table->index(
                ['user_id', 'status', 'last_accessed_at'],
                'courses_user_status_last_accessed_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex('courses_user_status_last_accessed_idx');
            $table->dropColumn('last_accessed_at');
        });
    }
};
