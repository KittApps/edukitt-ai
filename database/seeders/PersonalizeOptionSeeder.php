<?php

namespace Database\Seeders;

use App\Models\PersonalizeOption;
use App\Models\PersonalizeOptionGroup;
use Illuminate\Database\Seeder;

class PersonalizeOptionSeeder extends Seeder
{
    /**
     * Seed default Personalize Options for each supported AI task.
     *
     * Idempotent: re-running will not duplicate or clobber admin edits.
     * Composite key used for both groups and options:
     *   - PersonalizeOptionGroup: (task_type, key)
     *   - PersonalizeOption:      (personalize_option_group_id, key)
     */
    public function run(): void
    {
        $catalogue = [
            'quick_learn' => [
                [
                    'key' => 'reading_time',
                    'label' => 'Reading Time',
                    'description' => 'How long the user wants to spend with this Quick Learn.',
                    'options' => [
                        ['key' => '3min', 'value' => '3 min'],
                        ['key' => '5min', 'value' => '5 min', 'is_default' => true],
                        ['key' => '10min', 'value' => '10 min'],
                        ['key' => '15min', 'value' => '15 min'],
                    ],
                ],
                [
                    'key' => 'depth',
                    'label' => 'Depth',
                    'description' => 'How deep the AI goes into the topic.',
                    'options' => [
                        ['key' => 'overview', 'value' => 'Overview'],
                        ['key' => 'moderate', 'value' => 'Moderate', 'is_default' => true],
                        ['key' => 'deep_dive', 'value' => 'Deep Dive'],
                    ],
                ],
                [
                    'key' => 'tone',
                    'label' => 'Tone',
                    'description' => 'The voice and style the AI should use.',
                    'options' => [
                        ['key' => 'casual', 'value' => 'Casual', 'is_default' => true],
                        ['key' => 'academic', 'value' => 'Academic'],
                        ['key' => 'professional', 'value' => 'Professional'],
                        ['key' => 'fun', 'value' => 'Fun'],
                    ],
                ],
            ],

            'course_outline' => [
                [
                    'key' => 'difficulty',
                    'label' => 'Difficulty',
                    'description' => 'Target skill level for the learner.',
                    'options' => [
                        ['key' => 'beginner', 'value' => 'Beginner', 'is_default' => true],
                        ['key' => 'intermediate', 'value' => 'Intermediate'],
                        ['key' => 'advanced', 'value' => 'Advanced'],
                    ],
                ],
                [
                    'key' => 'audience',
                    'label' => 'Audience',
                    'description' => 'Who the course is primarily aimed at.',
                    'options' => [
                        ['key' => 'students', 'value' => 'Students', 'is_default' => true],
                        ['key' => 'professionals', 'value' => 'Professionals'],
                        ['key' => 'hobbyists', 'value' => 'Hobbyists'],
                    ],
                ],
                [
                    'key' => 'tone',
                    'label' => 'Tone',
                    'description' => 'The voice and style the AI should use.',
                    'options' => [
                        ['key' => 'casual', 'value' => 'Casual'],
                        ['key' => 'professional', 'value' => 'Professional', 'is_default' => true],
                        ['key' => 'academic', 'value' => 'Academic'],
                    ],
                ],
            ],

            'quiz_generate' => [
                [
                    'key' => 'difficulty',
                    'label' => 'Difficulty',
                    'description' => 'How challenging the quiz questions should be.',
                    'options' => [
                        ['key' => 'easy', 'value' => 'Easy'],
                        ['key' => 'medium', 'value' => 'Medium', 'is_default' => true],
                        ['key' => 'hard', 'value' => 'Hard'],
                    ],
                ],
                [
                    'key' => 'num_of_questions',
                    'label' => 'Num of Questions',
                    'description' => 'How many questions the AI should generate.',
                    'options' => [
                        ['key' => '5', 'value' => '5', 'is_default' => true],
                        ['key' => '10', 'value' => '10'],
                        ['key' => '15', 'value' => '15'],
                        ['key' => '20', 'value' => '20'],
                    ],
                ],
                [
                    'key' => 'time_limit',
                    'label' => 'Time Limit',
                    'description' => 'Optional countdown timer for the quiz attempt.',
                    'options' => [
                        ['key' => 'none', 'value' => 'No limit', 'is_default' => true],
                        ['key' => '5min', 'value' => '5 min'],
                        ['key' => '10min', 'value' => '10 min'],
                        ['key' => '15min', 'value' => '15 min'],
                        ['key' => '30min', 'value' => '30 min'],
                    ],
                ],
            ],
        ];

        // Retired groups: dropped from defaults in newer releases. We
        // remove them on re-seed so upgrades stay tidy. Cascading delete
        // on the FK handles the option rows.
        $this->retire('quiz_generate', ['question_type', 'count']);

        foreach ($catalogue as $taskType => $groups) {
            foreach ($groups as $groupIndex => $groupData) {
                $group = PersonalizeOptionGroup::updateOrCreate(
                    ['task_type' => $taskType, 'key' => $groupData['key']],
                    [
                        'label' => $groupData['label'],
                        'description' => $groupData['description'] ?? null,
                        'sort_order' => $groupIndex,
                        'is_active' => true,
                    ],
                );

                foreach ($groupData['options'] as $optionIndex => $optionData) {
                    PersonalizeOption::updateOrCreate(
                        [
                            'personalize_option_group_id' => $group->id,
                            'key' => $optionData['key'],
                        ],
                        [
                            'value' => $optionData['value'],
                            'is_default' => (bool) ($optionData['is_default'] ?? false),
                            'sort_order' => $optionIndex,
                            'is_active' => true,
                        ],
                    );
                }
            }
        }
    }

    /**
     * Delete groups (and their cascading options) that we no longer ship
     * as defaults but may still be hanging around in an existing DB from
     * a previous seed run.
     *
     * @param  array<int, string>  $groupKeys
     */
    private function retire(string $taskType, array $groupKeys): void
    {
        PersonalizeOptionGroup::query()
            ->where('task_type', $taskType)
            ->whereIn('key', $groupKeys)
            ->get()
            ->each
            ->delete();
    }
}
