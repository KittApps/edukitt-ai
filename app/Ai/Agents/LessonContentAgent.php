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
use App\Services\ContentBlockTypes;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

class LessonContentAgent implements Agent, HasStructuredOutput
{
    use HasManagedPrompt;
    use Promptable;

    public const TASK_TYPE = 'course_lesson';

    public function __construct(
        protected string $courseTitle,
        protected string $moduleTitle,
        protected string $lessonSummary,
        protected ?string $regenerateInstructions = null,
        protected ?string $language = null,
    ) {}

    public static function defaultInstructionsTemplate(): string
    {
        return <<<PROMPT
You are an expert educator creating detailed, engaging lesson content.

Course: {course_title}
Module: {module_title}

Output language: {language}

Generate lesson content as structured sections/topics. Each section covers a sub-topic of the lesson.

RULES:
- Generate 3-8 sections per lesson based on content depth needed.
- The first section SHOULD be a "text" type covering definitions & overview, but only if relevant.
- Use a mix of section types appropriate to the content. Not all types need to be used.
- Each section must have a clear title and substantive content.
- Write ALL human-readable text (section titles, prose, key points, examples, intros) in the output language above. Code samples themselves stay in their native programming language.
- For "text" type: provide rich explanatory content.
- For "key-points" type: provide an array of bullet point strings.
- For "example" type: provide a practical, clear example.
- For "code" type: raw code only with real \n newlines; put any intro in a preceding "text" section.

Available section types:
{block_types}

Base the content on this lesson summary (this contains the key concepts to cover):
{lesson_summary}{regenerate_instructions}
PROMPT;
    }

    /**
     * @inheritDoc
     */
    public static function placeholders(): array
    {
        return [
            [
                'token' => '{course_title}',
                'label' => 'Course title',
                'description' => 'Title of the parent course the lesson belongs to.',
                'sample' => 'Introduction to Machine Learning',
            ],
            [
                'token' => '{module_title}',
                'label' => 'Module title',
                'description' => 'Title of the module containing this lesson.',
                'sample' => 'Supervised Learning Fundamentals',
            ],
            [
                'token' => '{language}',
                'label' => 'Language',
                'description' => 'The output language inherited from the parent course (set when the outline was generated). Falls back to "English" when the course has no recorded language.',
                'sample' => 'English',
            ],
            [
                'token' => '{lesson_summary}',
                'label' => 'Lesson summary',
                'description' => 'The lesson summary generated during course-outline creation — contains key concepts to cover.',
                'sample' => 'Introduce linear regression, including the model formula, cost function, and how it is fit using gradient descent.',
            ],
            [
                'token' => '{block_types}',
                'label' => 'Block types',
                'description' => 'The catalogue of available section types the AI may use (text, key-points, example, code…).',
                'sample' => ContentBlockTypes::forPrompt(),
            ],
            [
                'token' => '{regenerate_instructions}',
                'label' => 'Regenerate instructions',
                'description' => 'Free-form change requests sent when the user asks to regenerate this lesson. Empty on the first generation.',
                'sample' => "\n\nThe user has requested changes to the previously generated content. Apply these changes:\nAdd more code examples and reduce theory.",
            ],
        ];
    }

    protected function runtimeValues(): array
    {
        return [
            '{course_title}' => $this->courseTitle,
            '{module_title}' => $this->moduleTitle,
            '{language}' => $this->language ?: 'English',
            '{lesson_summary}' => $this->lessonSummary,
            '{block_types}' => ContentBlockTypes::forPrompt(),
            '{regenerate_instructions}' => $this->formatRegenerateInstructions(),
        ];
    }

    private function formatRegenerateInstructions(): string
    {
        if (!$this->regenerateInstructions) {
            return '';
        }

        return "\n\nThe user has requested changes to the previously generated content. Apply these changes:\n"
            . $this->regenerateInstructions;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'sections' => $schema->array()->items($schema->object([
                'title' => $schema->string()->required(),
                'type' => $schema->string()->required(),
                'content' => $schema->string()->required(),
                'items' => $schema->array()->items($schema->string())->nullable()->required(),
                'language' => $schema->string()->nullable()->required(),
            ]))->required(),
        ];
    }
}
