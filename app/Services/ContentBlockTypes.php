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

class ContentBlockTypes
{
    /**
     * All supported content block types for lessons/quick-learns.
     * Each type has: key, label (display in content), sidebarLabel (display in navigator),
     * icon (lucide icon name), description.
     * This is the single source of truth - loaded dynamically for both LLM prompts and UI rendering.
     */
    public static function all(): array
    {
        return [
            [
                'key' => 'text',
                'label' => 'Reading',
                'sidebarLabel' => 'Text',
                'icon' => 'book-open',
                'description' => 'Rich text reading content. Use inline `code` for keywords/paths/shortcuts, **bold** for key terms, *italic* for light emphasis. Split long content into paragraphs with \n\n.',            ],
            [
                'key' => 'key-points',
                'label' => 'Key Points',
                'sidebarLabel' => 'Key Points',
                'icon' => 'list-checks',
                'description' => 'A bullet list of important takeaways or key concepts.',
            ],
            [
                'key' => 'example',
                'label' => 'Example',
                'sidebarLabel' => 'Example',
                'icon' => 'lightbulb',
                'description' => 'A practical example illustrating the concept.',
            ],
            [
                'key' => 'code',
                'label' => 'Code',
                'sidebarLabel' => 'Code',
                'icon' => 'code',
                'description' => 'Raw code only. Set "language" (e.g. html, css, js, php, python). Keep real newlines and indentation.',
            ],
        ];
    }

    /**
     * Get block types formatted for inclusion in AI prompts.
     */
    public static function forPrompt(): string
    {
        return collect(self::all())->map(function ($type) {
            return "- \"{$type['key']}\": {$type['description']}";
        })->implode("\n");
    }

    /**
     * Get only the keys of available block types.
     */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }
}
