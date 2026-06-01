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

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseCertificate;
use App\Services\CourseCertificateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * End-to-end controller for the course certificates feature.
 *
 * - {@see index}    : three-bucket list (earned / ready / in_progress).
 *                     Eligibility ('ready') is computed lazily here, never
 *                     on lesson events, per the feature's brief.
 * - {@see show}     : detail page for one issued certificate.
 * - {@see issue}    : manual claim — turns a 'ready' course into 'earned'.
 *                     Returns JSON + redirect to mirror the quiz pipeline.
 */
class CourseCertificateController extends Controller
{
    public function __construct(
        private readonly CourseCertificateService $certificates,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $user = $request->user();

        $courses = $user->courses()
            ->with(['modules.lessons'])
            ->get();

        $activeCerts = CourseCertificate::query()
            ->active()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('course_id');

        $earned = [];
        $ready = [];
        $inProgress = [];

        foreach ($courses as $course) {
            $existing = $activeCerts->get($course->id);

            if ($existing !== null) {
                $earned[] = $this->presentEarned($existing);

                continue;
            }

            $isReady = $this->certificates->allLessonsCompleted($user, $course);

            if ($isReady) {
                $ready[] = $this->presentReady($course);
            } else {
                $inProgress[] = $this->presentInProgress($course);
            }
        }

        return Inertia::render('App/CourseCertificates/Index', [
            'certificates' => [
                'earned' => $earned,
                'ready' => $ready,
                'in_progress' => $inProgress,
            ],
        ]);
    }

    public function show(Request $request, int $certificate): InertiaResponse
    {
        $cert = CourseCertificate::query()
            ->active()
            ->findOrFail($certificate);

        abort_unless($cert->user_id === $request->user()->id, 403);

        return Inertia::render('App/CourseCertificates/Show', [
            'certificate' => $this->presentEarned($cert),
            'recipient_name' => $cert->recipient_name,
        ]);
    }

    public function issue(Request $request, Course $course): JsonResponse|RedirectResponse
    {
        $this->authorize('view', $course);

        $certificate = $this->certificates->issue($request->user(), $course);

        return response()->json([
            'certificate' => $this->presentEarned($certificate),
            'redirect' => route('app.course-certificates.show', $certificate),
        ]);
    }

    /**
     * Shape an earned certificate for the React layer. Mirrors the
     * existing `CourseCertificate` TS interface plus a `course_id` field
     * the Index page needs to deep-link "View Certificate" CTAs.
     *
     * @return array<string, mixed>
     */
    private function presentEarned(CourseCertificate $cert): array
    {
        return [
            'id' => (string) $cert->id,
            'course_id' => $cert->course_id,
            'course_name' => $cert->course_name,
            'issue_date' => $this->formatIssuedDate($cert->issued_at),
            'completion_time' => $cert->completion_time ?? '',
            'status' => 'earned',
            'difficulty' => $cert->difficulty,
            'formatted_number' => $cert->formatted_number,
        ];
    }

    /**
     * Shape a ready-to-claim course slot. Uses the course id as the
     * synthetic certificate id so the frontend can route the Claim CTA
     * to /app/courses/{course_id}/certificate/issue.
     *
     * @return array<string, mixed>
     */
    private function presentReady(Course $course): array
    {
        return [
            'id' => "course-{$course->id}",
            'course_id' => $course->id,
            'course_name' => $course->title,
            'issue_date' => '',
            'completion_time' => '',
            'status' => 'ready',
            'difficulty' => $course->difficulty,
            'progress' => 100,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentInProgress(Course $course): array
    {
        $totalLessons = 0;
        $completedLessons = 0;
        foreach ($course->modules as $module) {
            foreach ($module->lessons as $lesson) {
                $totalLessons++;
                if ($lesson->completed_at !== null) {
                    $completedLessons++;
                }
            }
        }

        $progress = $totalLessons > 0
            ? (int) round(($completedLessons / $totalLessons) * 100)
            : 0;

        return [
            'id' => "course-{$course->id}",
            'course_id' => $course->id,
            'course_name' => $course->title,
            'issue_date' => '',
            'completion_time' => '',
            'status' => 'in_progress',
            'progress' => $progress,
            'difficulty' => $course->difficulty,
        ];
    }

    private function formatIssuedDate(?Carbon $issuedAt): string
    {
        return $issuedAt?->format('M j, Y') ?? '';
    }
}
