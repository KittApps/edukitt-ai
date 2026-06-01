<?php

/**
 * EduKitt AI — Free Edition
 *
 * Copyright (c) 2026 Kitt Apps
 * https://kittapps.com
 *
 * Licensed under the EduKitt AI Free Edition License.
 * See LICENSE in the project root.
 */

namespace App\Services;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Single place that owns "is this user eligible for a certificate on this
 * course, do they already have one, and what happens when they claim or
 * later become ineligible".
 *
 * Eligibility ({@see allLessonsCompleted}) is computed lazily — only when
 * the user opens the course page, opens the certificates index, or clicks
 * Claim. On lesson un-completion we never recompute eligibility; we just
 * call the cheap {@see revokeIfNeeded} UPDATE, which no-ops if no row
 * exists. Issued certs are cached with display-facing fields so a later
 * profile/course rename doesn't rewrite past certificates.
 */
class CourseCertificateService
{
    /**
     * Returns the certificate state for this user-course pair.
     * Used by both the course Show sidebar and the certificates index.
     */
    public function status(User $user, Course $course): string
    {
        $hasActive = CourseCertificate::query()
            ->active()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->exists();

        if ($hasActive) {
            return 'earned';
        }

        return $this->allLessonsCompleted($user, $course) ? 'ready' : 'in_progress';
    }

    /**
     * Manually issue (or reactivate) the certificate for this user-course.
     * Wrapped in a transaction so the unique constraint can't race a
     * double-click. If a revoked row already exists, the same id is
     * reactivated so the formatted number doesn't change between claims.
     *
     * @throws RuntimeException if the user is not yet eligible.
     */
    public function issue(User $user, Course $course): CourseCertificate
    {
        if (! $this->allLessonsCompleted($user, $course)) {
            throw new RuntimeException(
                'Cannot issue certificate: course has incomplete lessons.',
            );
        }

        return DB::transaction(function () use ($user, $course) {
            $certificate = CourseCertificate::firstOrNew([
                'user_id' => $user->id,
                'course_id' => $course->id,
            ]);

            $certificate->fill([
                'issued_at' => now(),
                'revoked_at' => null,
                'recipient_name' => trim((string) $user->name),
                'course_name' => $course->title,
                'difficulty' => $course->difficulty,
                'completion_time' => $this->computeCompletionTime($course),
            ])->save();

            return $certificate->fresh();
        });
    }

    /**
     * Idempotent revoke. One UPDATE; no eligibility math, no exceptions.
     * Safe to call from the lesson un-completion path on every request.
     */
    public function revokeIfNeeded(User $user, Course $course): void
    {
        CourseCertificate::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    /**
     * True when the course has at least one lesson and every lesson is
     * marked completed. Zero-lesson courses are never ready.
     */
    public function allLessonsCompleted(User $user, Course $course): bool
    {
        $total = DB::table('course_lessons')
            ->join('course_modules', 'course_lessons.module_id', '=', 'course_modules.id')
            ->where('course_modules.course_id', $course->id)
            ->count();

        if ($total === 0) {
            return false;
        }

        $incomplete = DB::table('course_lessons')
            ->join('course_modules', 'course_lessons.module_id', '=', 'course_modules.id')
            ->where('course_modules.course_id', $course->id)
            ->whereNull('course_lessons.completed_at')
            ->count();

        return $incomplete === 0;
    }

    /**
     * Cheap human-friendly total time, derived from the course's lesson
     * `estimated_duration` strings (e.g. "15 min", "1h"). Falls back to
     * 10 min per lesson when nothing parses, matching the heuristic the
     * Course Show page uses.
     */
    private function computeCompletionTime(Course $course): ?string
    {
        $totalMinutes = 0;
        $lessonCount = 0;

        $course->loadMissing('modules.lessons');

        foreach ($course->modules as $module) {
            foreach ($module->lessons as $lesson) {
                $lessonCount++;
                $totalMinutes += $this->parseMinutes($lesson->estimated_duration);
            }
        }

        if ($lessonCount === 0) {
            return null;
        }

        if ($totalMinutes === 0) {
            $totalMinutes = $lessonCount * 10;
        }

        if ($totalMinutes >= 60) {
            $hours = intdiv($totalMinutes, 60);
            $minutes = $totalMinutes % 60;

            return $minutes === 0 ? "{$hours}h" : "{$hours}h {$minutes}m";
        }

        return "{$totalMinutes} min";
    }

    private function parseMinutes(?string $raw): int
    {
        if ($raw === null || $raw === '') {
            return 0;
        }

        if (! preg_match('/(\d+)\s*(h|hour|hr|m|min|minute)?/i', $raw, $match)) {
            return 0;
        }

        $value = (int) $match[1];
        $unit = strtolower($match[2] ?? 'min');

        return str_starts_with($unit, 'h') ? $value * 60 : $value;
    }
}
