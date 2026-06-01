<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a per-page "Show in footer" toggle. The public footer renders
     * a "Resources" column populated from pages where this flag is on
     * AND the page is published. Defaults to false so existing pages
     * stay hidden from the footer until an admin opts each one in.
     */
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->boolean('show_in_footer')->default(false)->after('is_system');
            $table->index(['is_published', 'show_in_footer'], 'pages_published_footer_idx');
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropIndex('pages_published_footer_idx');
            $table->dropColumn('show_in_footer');
        });
    }
};
