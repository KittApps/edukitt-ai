<?php

namespace Database\Seeders;

use App\Models\Faq;
use App\Models\FaqCategory;
use Illuminate\Database\Seeder;

class FaqSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'name' => 'Getting started',
                'slug' => 'getting-started',
                'icon' => 'BookOpen',
                'faqs' => [
                    [
                        'question' => 'How do I create my first course?',
                        'answer' => 'Open the sidebar and click "New Course". Walk through the topic, resources, personalize and review steps — the AI will draft a full outline, then generate each lesson on demand as you open it.',
                    ],
                    [
                        'question' => 'What is the difference between a Quick Learn and a Course?',
                        'answer' => 'A Quick Learn is a single, 5–10 minute focused article on one topic. A Course is a multi-module learning path with lessons and module-end quizzes — better for anything you want to study over multiple sittings.',
                    ],
                ],
            ],
            [
                'name' => 'AI generation',
                'slug' => 'ai-generation',
                'icon' => 'Sparkles',
                'faqs' => [
                    [
                        'question' => "Why can't I select certain AI models?",
                        'answer' => "Some models are reserved for paid plans — they're marked with a crown icon. Upgrade to unlock them, or pick any of the free models available in the selector.",
                    ],
                    [
                        'question' => 'Can I generate content in my own language?',
                        'answer' => 'Yes. Pick your language in the "Ready to go" card before clicking Generate. Your last choice is remembered for next time, and the language is detected from your interface locale on first use.',
                    ],
                ],
            ],
            [
                'name' => 'Billing & credits',
                'slug' => 'billing',
                'icon' => 'CreditCard',
                'faqs' => [
                    [
                        'question' => 'What are credits and how are they used?',
                        'answer' => 'Credits are spent every time the AI generates content for you (outlines, lessons, quizzes, summaries). Your remaining credits are shown on the dashboard, and your plan refills them at the start of each billing period.',
                    ],
                    [
                        'question' => 'How do I upgrade or change my plan?',
                        'answer' => 'Open the plan badge on your dashboard (or visit Subscription from the sidebar), then pick a plan and a billing cycle. Upgrades take effect immediately and unused credits from your current period carry over.',
                    ],
                ],
            ],
            [
                'name' => 'Account',
                'slug' => 'account',
                'icon' => 'UserCircle',
                'faqs' => [
                    [
                        'question' => 'How do I change my email address?',
                        'answer' => "Open Profile from the avatar menu, edit your email and save. If email verification is required, we'll send a 6-digit code to your new address; enter it on the same page to confirm the change.",
                    ],
                    [
                        'question' => 'Can I delete my account?',
                        'answer' => 'If self-service deletion is enabled, you\'ll find a "Delete account" card on your Profile page. Otherwise contact support and we\'ll handle it for you.',
                    ],
                ],
            ],
        ];

        foreach ($data as $catIndex => $cat) {
            $category = FaqCategory::updateOrCreate(
                ['slug' => $cat['slug']],
                [
                    'name' => $cat['name'],
                    'icon' => $cat['icon'],
                    'sort_order' => $catIndex * 10,
                    'is_active' => true,
                ],
            );

            foreach ($cat['faqs'] as $faqIndex => $faq) {
                Faq::updateOrCreate(
                    [
                        'faq_category_id' => $category->id,
                        'question' => $faq['question'],
                    ],
                    [
                        'answer' => $faq['answer'],
                        'sort_order' => $faqIndex * 10,
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
