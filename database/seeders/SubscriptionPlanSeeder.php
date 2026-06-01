<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seed the catalogue of subscription plans (Free / Pro / Business).
 *
 * Idempotent: keyed on `slug` so re-running updates in place. Stripe
 * price IDs are intentionally left null — the operator pastes them
 * from the Stripe dashboard via the admin UI.
 *
 * Limit keys:
 *   - max_courses, max_lessons, max_quick_learns, max_quizzes,
 *     max_regenerations — per-period feature caps enforced by
 *     {@see \App\Services\Billing\AccessGuard}. `-1` = unlimited.
 *   - max_file_upload_mb — clamps the resource-upload size for that
 *     plan's users; surfaced in the admin AI Content settings.
 *   - priority_generation — boolean flag (0/1) used by the queue
 *     resolver to route to the priority queue.
 *   - certificates — boolean (0/1); gates Course Certificates per plan.
 *   - advanced_models — boolean (0/1); gates the "paid-only" AI models
 *     in TaskAssignmentResolver.
 */
class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'tagline' => 'Get started with EduAI for free',
                'description' => 'A generous starter tier for learners trying out AI-powered courses and quick learns.',
                'cta_label' => 'Get started',
                'monthly_price' => 0,
                'yearly_price' => 0,
                'currency' => 'USD',
                'default_credits' => 100,
                'rollover_unused_credits' => false,
                'limits' => [
                    'max_courses' => 5,
                    'max_lessons' => -1,
                    'max_quick_learns' => 10,
                    'max_quizzes' => 3,
                    'max_regenerations' => 5,
                    'max_file_upload_mb' => 2,
                    'priority_generation' => 0,
                    'certificates' => 1,
                    'advanced_models' => 0,
                ],
                'features' => [
                    ['text' => '100 AI credits per month', 'included' => true],
                    ['text' => '5 full courses per month', 'included' => true],
                    ['text' => '10 Quick Learns per month', 'included' => true],
                    ['text' => '3 quizzes per month', 'included' => true],
                    ['text' => 'Basic AI models', 'included' => true],
                    ['text' => 'Course completion certificates', 'included' => true],
                    ['text' => 'Priority generation queue', 'included' => false],
                    ['text' => 'Advanced AI models', 'included' => false],
                ],
                'is_active' => true,
                'is_popular' => false,
                'is_default' => true,
                'sort_order' => 0,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'tagline' => 'Unlock your full learning potential',
                'description' => 'For serious learners who want more courses, deeper content, and faster generation.',
                'cta_label' => 'Upgrade to Pro',
                'monthly_price' => 14.99,
                'yearly_price' => 149.00,
                'currency' => 'USD',
                'default_credits' => 2000,
                'rollover_unused_credits' => false,
                'limits' => [
                    'max_courses' => 20,
                    'max_lessons' => 200,
                    'max_quick_learns' => 100,
                    'max_quizzes' => 50,
                    'max_regenerations' => 50,
                    'max_file_upload_mb' => 25,
                    'priority_generation' => 1,
                    'certificates' => 1,
                    'advanced_models' => 1,
                ],
                'features' => [
                    ['text' => '2,000 AI credits per month', 'included' => true, 'highlight' => true],
                    ['text' => 'Up to 20 full courses per month', 'included' => true],
                    ['text' => '100 Quick Learns per month', 'included' => true],
                    ['text' => '50 quizzes per month', 'included' => true],
                    ['text' => 'Priority generation queue', 'included' => true],
                    ['text' => 'Course completion certificates', 'included' => true],
                    ['text' => 'Advanced AI models (GPT-5, Claude Sonnet)', 'included' => true],
                    ['text' => 'Up to 25 MB file uploads', 'included' => true],
                ],
                'is_active' => true,
                'is_popular' => true,
                'is_default' => false,
                'sort_order' => 10,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'tagline' => 'Powering teams and power learners',
                'description' => 'Unlimited generations, the largest credit allowance, and credits that roll over month to month.',
                'cta_label' => 'Upgrade to Business',
                'monthly_price' => 39.99,
                'yearly_price' => 399.00,
                'currency' => 'USD',
                'default_credits' => 10000,
                'rollover_unused_credits' => true,
                'limits' => [
                    'max_courses' => -1,
                    'max_lessons' => -1,
                    'max_quick_learns' => -1,
                    'max_quizzes' => -1,
                    'max_regenerations' => -1,
                    'max_file_upload_mb' => 100,
                    'priority_generation' => 1,
                    'certificates' => 1,
                    'advanced_models' => 1,
                ],
                'features' => [
                    ['text' => '10,000 AI credits per month', 'included' => true, 'highlight' => true],
                    ['text' => 'Unlimited courses, lessons, and quizzes', 'included' => true, 'highlight' => true],
                    ['text' => 'Unused credits roll over month to month', 'included' => true, 'highlight' => true],
                    ['text' => 'Highest priority generation queue', 'included' => true],
                    ['text' => 'Course completion certificates', 'included' => true],
                    ['text' => 'All advanced AI models (GPT-5, Claude Opus, Gemini Pro)', 'included' => true],
                    ['text' => 'Up to 100 MB file uploads', 'included' => true],
                    ['text' => 'Priority support', 'included' => true],
                ],
                'is_active' => true,
                'is_popular' => false,
                'is_default' => false,
                'sort_order' => 20,
            ],
        ];

        DB::transaction(function () use ($plans) {
            foreach ($plans as $attributes) {
                $slug = $attributes['slug'];
                unset($attributes['slug']);

                SubscriptionPlan::updateOrCreate(
                    ['slug' => $slug],
                    $attributes,
                );
            }

            // Enforce the single-default-plan invariant: only the plan we
            // explicitly marked as default in this seed run keeps
            // is_default = true. Matches SubscriptionService::setDefault().
            $defaultSlug = collect($plans)
                ->first(fn (array $p) => ($p['is_default'] ?? false) === true)['slug']
                ?? 'free';

            SubscriptionPlan::query()
                ->where('slug', '!=', $defaultSlug)
                ->update(['is_default' => false]);
        });
    }
}
