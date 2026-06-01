<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quick_learns', function (Blueprint $table) {
            // Generic bag for admin-defined personalize groups beyond the
            // original four (format, reading_time, depth, tone). The four
            // legacy columns are kept and continue to receive their matching
            // values for backwards compatibility with anything that reads them.
            $table->json('preferences')->nullable()->after('tone');
        });
    }

    public function down(): void
    {
        Schema::table('quick_learns', function (Blueprint $table) {
            $table->dropColumn('preferences');
        });
    }
};
