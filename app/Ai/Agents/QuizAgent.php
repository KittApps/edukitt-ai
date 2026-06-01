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

namespace App\Ai\Agents;

use App\Ai\Concerns\HasManagedPrompt;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

class QuizAgent implements Agent, HasStructuredOutput
{
    use HasManagedPrompt;
    use Promptable;

    public const TASK_TYPE = 'quiz_generate';

    public function __construct(
        protected string $topic,
        protected array $preferences = [],
        protected ?string $language = null,
    ) {}

    public static function defaultInstructionsTemplate(): string
    {
        return <<<PROMPT
You are an expert quiz designer creating a high-quality educational quiz.

Topic: {topic}

Output language: {language}{preferences}

RULES:
- Honour every user preference above (question count, difficulty, etc.). When no preference is given for a value, pick a sensible default.
- Write ALL generated text (title, description, question stems, options, correct_answer, explanations) in the output language above.
- Order questions from easier to harder inside the requested difficulty band.
- Each question must have a clear, unambiguous stem and exactly 4 plausible options. Distractors should be believable, not obviously wrong.
- correct_answer must be the exact text of the right option (character-for-character match).
- Every question must include a concise explanation (1-3 sentences) of WHY the correct answer is correct.
- Produce a short engaging quiz title (max 8 words) and a 1-sentence description.
PROMPT;
    }

    /**
     * @inheritDoc
     */
    public static function placeholders(): array
    {
        return [
            [
                'token' => '{topic}',
                'label' => 'Topic',
                'description' => 'The subject the quiz is about, supplied by the user.',
                'sample' => 'World War II',
            ],
            [
                'token' => '{language}',
                'label' => 'Language',
                'description' => 'The output language the user picked from the language selector. For module quizzes this is inherited from the parent course. Falls back to "English" when nothing is configured.',
                'sample' => 'English',
            ],
            [
                'token' => '{preferences}',
                'label' => 'Preferences',
                'description' => 'All admin-managed personalize options the user selected (count, difficulty, audience, …). Inserted as a "User preferences" block, or empty if none provided. Manage the available options at admin/settings/ai-content → Quiz Generation → Personalize.',
                'sample' => "\n\nUser preferences:\n- count: 10\n- difficulty: Medium",
            ],
        ];
    }

    protected function runtimeValues(): array
    {
        return [
            '{topic}' => $this->topic,
            '{language}' => $this->language ?: 'English',
            '{preferences}' => $this->formatPreferences(),
        ];
    }

    private function formatPreferences(): string
    {
        if (empty($this->preferences)) {
            return '';
        }

        $lines = ["\n\nUser preferences:"];
        foreach ($this->preferences as $key => $value) {
            $lines[] = "- {$key}: {$value}";
        }

        return implode("\n", $lines);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->required(),
            'description' => $schema->string()->required(),
            'questions' => $schema->array()->items($schema->object([
                'question' => $schema->string()->required(),
                'options' => $schema->array()->items($schema->string())->required(),
                'correct_answer' => $schema->string()->required(),
                'explanation' => $schema->string()->required(),
            ]))->required(),
        ];
    }
}
