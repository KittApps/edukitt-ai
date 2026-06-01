<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('topic')->nullable();
            $table->unsignedSmallInteger('question_count')->default(0);
            $table->string('difficulty')->nullable();
            $table->string('question_type')->nullable();
            $table->string('time_limit')->nullable();
            $table->json('questions')->nullable();
            $table->boolean('is_generated')->default(false);
            $table->string('status')->default('draft')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quizzes');
    }
};
