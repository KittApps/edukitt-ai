<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('language')->default('English');
            $table->string('difficulty')->nullable();
            $table->string('learning_style')->nullable();
            $table->string('duration')->nullable();
            $table->string('status')->default('draft')->index();
            $table->integer('progress')->default(0);
            $table->text('topic')->nullable();
            $table->json('personalization')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
