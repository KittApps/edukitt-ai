<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks when each user most recently completed a successful login.
 *
 * Stamped from AuthenticatedSessionController::store() after the
 * credentials check + active-account guard pass, so it never reflects
 * a failed/blocked attempt. Surfaced on the admin Users list to help
 * spot dormant accounts at a glance.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('last_login_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('last_login_at');
        });
    }
};
