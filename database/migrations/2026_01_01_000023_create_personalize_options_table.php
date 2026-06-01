<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personalize_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personalize_option_group_id')
                ->constrained('personalize_option_groups')
                ->cascadeOnDelete();
            $table->string('key', 64);
            $table->string('value');
            $table->boolean('is_default')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['personalize_option_group_id', 'key'], 'personalize_options_group_key_unique');
            $table->index(['personalize_option_group_id', 'is_default'], 'personalize_options_group_default_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personalize_options');
    }
};
