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

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

/**
 * Admin-only batch translator for UI strings.
 *
 * Used by the "Auto translate with AI" action on the Localization
 * settings page. Lives outside the standard {@see \App\Services\Ai\AiService}
 * pipeline — no token tracking, no credit charging, no queueing —
 * because it is invoked from the admin panel by an operator who
 * already chose the provider/model in the modal.
 *
 * The system prompt is intentionally hardcoded here (not exposed
 * via {@see \App\Services\PromptService}) so admins cannot drift
 * it from the strict placeholder-preservation rules below.
 */
class TranslationAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Number of translation keys sent per AI call. Tunable from this
     * single location — controllers / services should read this
     * constant rather than hardcoding their own batch sizes.
     */
    public const BATCH_SIZE = 40;

    /**
     * @param  array<int, array{key: string, source: string, placeholders: array<int, string>}>  $keys
     */
    public function __construct(
        protected string $sourceLanguage,
        protected string $targetLanguage,
        protected array $keys,
    ) {}

    public function instructions(): string
    {
        return strtr($this->systemPrompt(), [
            '{source_language}' => $this->sourceLanguage,
            '{target_language}' => $this->targetLanguage,
        ]);
    }

    /**
     * Serialize the batch into the JSON body the model sees as the
     * user prompt. Kept here (rather than at the call site) so the
     * agent fully owns its wire format.
     */
    public function userPrompt(): string
    {
        return json_encode(
            ['keys' => array_values($this->keys)],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT,
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'keys' => $schema->array()->items($schema->object([
                'key' => $schema->string()->required(),
                'translated' => $schema->string()->required(),
            ]))->required(),
        ];
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are a professional UI/UX translator specialising in software localisation.

Source language: {source_language}
Target language: {target_language}

You will receive a JSON batch of UI strings. Each entry has:
  - "key"         : a stable dot-separated identifier (e.g. "subscription.plan.free").
                    DO NOT translate this — it is metadata that tells you what part
                    of the UI the string belongs to (use it as context for ambiguous
                    short words like "Free", "Subject", "Tab", etc.).
  - "source"      : the natural-language text in the source language above.
  - "placeholders": the list of {token} placeholders that appear inside "source".

Return a JSON object with the exact shape:
{
  "keys": [
    { "key": "<same key as input>", "translated": "<translation in target language>" }
  ]
}

HARD RULES — non-negotiable:
1. Echo every "key" back exactly as received. Never invent, drop, reorder, or modify keys.
2. Preserve every placeholder ({name}, {count}, {pct}, …) verbatim — same spelling,
   same braces, same casing. You MAY reposition them inside the sentence to fit the
   target language's grammar, but the token itself must stay byte-for-byte identical.
3. Translate only the natural-language content of "source". Never translate the key.
4. Preserve as-is: markdown, HTML tags, URLs, email addresses, file paths, code
   identifiers, numeric values, dates, and brand/product names.
5. Never add explanations, alternatives, or footnotes. Output ONLY the final string
   in "translated".

STYLE GUIDE:
- These are user-facing UI strings (buttons, labels, short messages, tooltips).
  Keep translations concise — usually similar length to the source, no padding.
- Use the formal/neutral register that is standard for software UIs in the target
  language ("polite default", not slang, not overly formal legal-speak).
- Match the source's tone and form: imperative source → imperative target;
  sentence fragment → sentence fragment; full sentence → full sentence.
- When the dotted key hints at meaning (e.g. "subscription.plan.free" → pricing
  context; "admin.users.actions.delete" → destructive action), pick the most
  appropriate sense for that context.

QUALITY:
- If "source" is empty or whitespace, return an empty string for "translated".
- If "source" already appears to be written in the target language, return it
  unchanged.
- Never invent translations for unknown brand/product names — keep them as-is.
PROMPT;
    }
}
