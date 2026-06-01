<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Switch `ai_generations.error_message` (plain text) to `error_payload`
 * (JSON) so the queue path can store the same rich envelope the sync
 * path returns from an exception's render() method:
 *
 *   { ok, reason, message, feature, cta, ... }
 *
 * That envelope is what the front-end's axios interceptor already
 * decodes (HTTP 402 with a `reason` field → fires the global
 * billing:limit-reached event → LimitReachedModal renders). Storing
 * the full envelope on the row means a polling client gets exactly the
 * same data a sync caller would have received, and the same modal
 * appears regardless of which path the request took.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generations', function (Blueprint $table) {
            $table->dropColumn('error_message');
        });

        Schema::table('ai_generations', function (Blueprint $table) {
            $table->json('error_payload')->nullable()->after('redirect_url');
        });
    }

    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table) {
            $table->dropColumn('error_payload');
        });

        Schema::table('ai_generations', function (Blueprint $table) {
            $table->text('error_message')->nullable()->after('redirect_url');
        });
    }
};
