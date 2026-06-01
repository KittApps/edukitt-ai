<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->json('preferences')->nullable()->after('topic');
            $table->string('language', 64)->nullable()->after('preferences');
            $table->string('ai_model_name')->nullable()->after('language');
            $table->dropColumn(['difficulty', 'question_type', 'time_limit']);
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->string('difficulty')->nullable()->after('question_count');
            $table->string('question_type')->nullable()->after('difficulty');
            $table->string('time_limit')->nullable()->after('question_type');
            $table->dropColumn(['preferences', 'language', 'ai_model_name']);
        });
    }
};
