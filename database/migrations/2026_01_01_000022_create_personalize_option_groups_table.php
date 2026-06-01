<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personalize_option_groups', function (Blueprint $table) {
            $table->id();
            $table->string('task_type', 64)->index();
            $table->string('key', 64);
            $table->string('label');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['task_type', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personalize_option_groups');
    }
};
