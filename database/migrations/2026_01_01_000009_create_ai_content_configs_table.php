<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_content_configs', function (Blueprint $table) {
            $table->id();
            $table->string('task_type')->unique();
            $table->foreignId('ai_provider_id')->constrained('ai_providers')->cascadeOnDelete();
            $table->foreignId('ai_provider_model_id')->constrained('ai_provider_models')->cascadeOnDelete();
            $table->decimal('temperature', 3, 2)->default(0.7);
            $table->integer('max_tokens')->default(4096);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_content_configs');
    }
};
