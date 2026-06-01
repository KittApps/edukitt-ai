<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Course certificates — one per (user, course) pair.
 *
 * Issuance is manual: the row is only inserted when the user explicitly
 * claims the certificate after every lesson in the course has been
 * completed. `revoked_at` flips back when a lesson is later un-completed
 * so the cert can be re-claimed (the same row is reactivated, preserving
 * id + formatted number).
 *
 * Display-facing fields (`recipient_name`, `course_name`, `difficulty`,
 * `completion_time`) are intentionally cached at issue time so a later
 * profile/course rename doesn't rewrite the historical certificate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->timestamp('issued_at');
            $table->timestamp('revoked_at')->nullable();
            $table->string('recipient_name');
            $table->string('course_name');
            $table->string('difficulty')->nullable();
            $table->string('completion_time')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'course_id']);
            $table->index(['user_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_certificates');
    }
};
