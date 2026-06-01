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

namespace App\Services\Content;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Thin wrapper around HTMLPurifier with a sensible allow-list for
 * admin-authored rich text (legal pages, marketing copy, etc.).
 *
 * The output is safe to render directly inside an Inertia page without
 * additional escaping.
 */
class HtmlSanitizer
{
    private ?HTMLPurifier $purifier = null;

    public function clean(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        return $this->purifier()->purify($html);
    }

    private function purifier(): HTMLPurifier
    {
        if ($this->purifier !== null) {
            return $this->purifier;
        }

        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Doctype', 'HTML 4.01 Transitional');
        $config->set('HTML.Allowed', implode(',', [
            'p', 'br', 'hr',
            'h1', 'h2', 'h3', 'h4',
            'strong', 'em', 'u', 's', 'code',
            'ul', 'ol', 'li',
            'blockquote',
            'a[href|title|target|rel]',
            'pre',
        ]));
        $config->set('HTML.TargetBlank', true);
        $config->set('Attr.AllowedFrameTargets', ['_blank']);
        $config->set('AutoFormat.AutoParagraph', false);
        $config->set('AutoFormat.RemoveEmpty', true);
        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
        ]);

        $cachePath = storage_path('app/htmlpurifier');
        if (! is_dir($cachePath)) {
            @mkdir($cachePath, 0755, true);
        }
        $config->set('Cache.SerializerPath', $cachePath);

        return $this->purifier = new HTMLPurifier($config);
    }
}
