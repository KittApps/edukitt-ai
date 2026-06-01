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

namespace App\Http\Controllers;

use App\Models\FaqCategory;
use App\Services\Settings\GeneralSettings;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PublicSupportController extends Controller
{
    public function __construct(private readonly GeneralSettings $settings) {}

    public function __invoke(): Response
    {
        if (! $this->settings->isSupportEnabled()) {
            throw new NotFoundHttpException();
        }

        $categories = FaqCategory::query()
            ->active()
            ->ordered()
            ->with(['faqs' => fn ($q) => $q->active()->ordered()])
            ->get()
            ->map(fn (FaqCategory $cat) => [
                'id' => $cat->id,
                'slug' => $cat->slug,
                'name' => $cat->name,
                'icon' => $cat->icon,
                'faqs' => $cat->faqs->map(fn ($faq) => [
                    'id' => $faq->id,
                    'question' => $faq->question,
                    'answer' => $faq->answer,
                ])->values(),
            ])
            ->values();

        return Inertia::render('Public/Support', [
            'categories' => $categories,
        ]);
    }
}
