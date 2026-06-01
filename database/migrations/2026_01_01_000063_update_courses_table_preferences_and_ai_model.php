<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->renameColumn('personalization', 'preferences');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->string('ai_model_name')->nullable()->after('language');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn('ai_model_name');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->renameColumn('preferences', 'personalization');
        });
    }
};
