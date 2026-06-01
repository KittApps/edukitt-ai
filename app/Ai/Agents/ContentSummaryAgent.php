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
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

/**
 * Generic, reusable summarization agent.
 *
 * Distills a batch of input material — uploaded files, long text, scraped
 * articles, etc. — into a compact plain-text digest that another AI can
 * use as background context for downstream generation.
 *
 * Used internally; never surfaced to end users. Configure it with a cheap
 * model in admin/settings/ai-content so the savings are real.
 */
class ContentSummaryAgent implements Agent
{
    use HasManagedPrompt;
    use Promptable;

    public const TASK_TYPE = 'content_summary';

    public function __construct(
        protected string $topic,
    ) {}

    public static function defaultInstructionsTemplate(): string
    {
        return <<<PROMPT
You are an expert at distilling source material into a compact, structured digest that another AI will read as context.

Topic / focus: {topic}

Read the supplied material and produce a tight, plain-text summary biased toward what is useful for the topic above.

Include:
- Major themes and sections covered.
- Key concepts, definitions, and terminology.
- Notable examples, formulas, processes, or case studies.
- Anything that goes beyond common knowledge of the topic.

Rules:
- Output ONLY the summary text — no preamble like "Here is the summary…".
- Use short headings and bullet points; aim for 300–800 words.
- Skip front matter, page numbers, marketing fluff, and citations.
- If the material is off-topic or unusable, return a single line: "No relevant material found."
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
                'label' => 'Topic / focus',
                'description' => 'A short phrase describing what the summary is for — typically the topic of the downstream task (e.g. a course title, quiz subject, lesson focus). Used to bias the digest toward concepts worth keeping.',
                'sample' => 'Introduction to Linear Algebra',
            ],
        ];
    }

    protected function runtimeValues(): array
    {
        return [
            '{topic}' => $this->topic,
        ];
    }
}
