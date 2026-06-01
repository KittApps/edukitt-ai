<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds an admin-controlled "active" flag for user accounts.
 *
 * Inactive accounts are blocked at login and force-logged-out by the
 * EnsureUserIsActive middleware on any subsequent authenticated
 * request. Defaults to `true` so existing rows stay logged-in capable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('is_admin');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
