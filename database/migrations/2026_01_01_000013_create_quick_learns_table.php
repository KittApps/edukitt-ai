<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quick_learns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('topic')->nullable();
            $table->string('format')->nullable();
            $table->string('reading_time')->nullable();
            $table->string('depth')->nullable();
            $table->string('tone')->nullable();
            $table->json('content')->nullable();
            $table->boolean('is_generated')->default(false);
            $table->string('status')->default('draft')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quick_learns');
    }
};
