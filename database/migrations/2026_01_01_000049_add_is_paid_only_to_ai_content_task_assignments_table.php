<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plan-gating per (provider, model) assignment.
 *
 * When TRUE the assignment is only offered to end users on a paid
 * plan; free users won't see a crown-marked option in the model
 * picker and the backend rejects an explicit pick of it. The flag
 * is set from the admin Plan toggle on the AI content task editor.
 *
 * Default is FALSE so existing rows keep behaving exactly as
 * before — i.e. available to every user — until an admin opts a
 * specific model into paid-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_content_task_assignments', function (Blueprint $table) {
            $table->boolean('is_paid_only')->default(false)->after('is_default');
        });
    }

    public function down(): void
    {
        Schema::table('ai_content_task_assignments', function (Blueprint $table) {
            $table->dropColumn('is_paid_only');
        });
    }
};
