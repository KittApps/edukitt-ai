<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quick_learns', function (Blueprint $table) {
            $table->string('language', 64)->nullable()->after('preferences');
            $table->string('ai_model_name')->nullable()->after('language');
            $table->dropColumn(['format', 'reading_time', 'depth', 'tone']);
        });
    }

    public function down(): void
    {
        Schema::table('quick_learns', function (Blueprint $table) {
            $table->string('format')->nullable()->after('topic');
            $table->string('reading_time')->nullable()->after('format');
            $table->string('depth')->nullable()->after('reading_time');
            $table->string('tone')->nullable()->after('depth');
            $table->dropColumn(['language', 'ai_model_name']);
        });
    }
};
