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

class QuickLearnAgent implements Agent, HasStructuredOutput
{
    use HasManagedPrompt;
    use Promptable;

    public const TASK_TYPE = 'quick_learn';

    public function __construct(
        protected string $topic,
        protected array $preferences = [],
        protected ?string $language = null,
    ) {}

    public static function defaultInstructionsTemplate(): string
    {
        return <<<PROMPT
You are an expert educator creating a self-contained lesson on a single topic. 
Treat it like a single, well-developed lesson — focused on one topic, but with real depth.

Topic: {topic}

Output language: {language}

User preferences:
{preferences}

Generate structured content sections covering the topic end-to-end.

RULES:
- Generate 3-8 sections with clear, useful content — enough to actually learn from, but not overwhelming.
- The first section SHOULD be a "text" type covering definition & overview, when relevant.
- Use a mix of section types appropriate to the content. Not all types need to be used.
- Each section must have a clear title and standalone content the reader can learn from.
- Write ALL human-readable text (titles, prose, key points, examples, intros) in the output language above.
- Code samples stay in their native programming language.
- For "text" type: provide explanatory content with concrete details, not one-liners.
- For "key-points" type: provide an array of bullet point strings.
- For "example" type: provide a practical, clear example that illustrates the concept.
- For "code" type: raw code only with real \n newlines; put any intro in a preceding "text" section.


Available section types:
{block_types}
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
                'description' => 'The subject typed by the user in step 1 of the wizard.',
                'sample' => 'Photosynthesis',
            ],
            [
                'token' => '{language}',
                'label' => 'Language',
                'description' => 'The output language the user picked from the language selector. Falls back to "English" when the language selector is off.',
                'sample' => 'English',
            ],
            [
                'token' => '{preferences}',
                'label' => 'Preferences',
                'description' => 'The user\'s preference choices, formatted as "- key: value" lines.',
                'sample' => "- tone: Casual\n- depth: Overview",
            ],
            [
                'token' => '{block_types}',
                'label' => 'Block types',
                'description' => 'The catalogue of available section types the AI may use (text, key-points, example, code…).',
                'sample' => ContentBlockTypes::forPrompt(),
            ],
        ];
    }

    protected function runtimeValues(): array
    {
        $prefs = '';
        foreach ($this->preferences as $key => $value) {
            $prefs .= "- {$key}: {$value}\n";
        }

        return [
            '{topic}' => $this->topic,
            '{language}' => $this->language ?: 'English',
            '{preferences}' => rtrim($prefs, "\n"),
            '{block_types}' => ContentBlockTypes::forPrompt(),
        ];
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->required(),
            'description' => $schema->string()->required(),
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
