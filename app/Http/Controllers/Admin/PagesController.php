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

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Pages\StorePageRequest;
use App\Models\Page;
use App\Services\Content\HtmlSanitizer;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PagesController extends Controller
{
    public function __construct(private readonly HtmlSanitizer $sanitizer) {}

    public function index(): Response
    {
        $pages = Page::query()
            ->orderByDesc('is_system')
            ->orderBy('title')
            ->get()
            ->map(fn (Page $p) => $this->toRow($p));

        return Inertia::render('Admin/Pages/Index', [
            'pages' => $pages,
            'stats' => $this->stats(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Pages/Create');
    }

    public function store(StorePageRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['content'] = $this->sanitizer->clean($data['content']);

        Page::create($data);

        return redirect()
            ->route('admin.pages.index')
            ->with('success', 'Page created.');
    }

    public function edit(Page $page): Response
    {
        return Inertia::render('Admin/Pages/Edit', [
            'page' => $this->toRow($page),
        ]);
    }

    public function update(StorePageRequest $request, Page $page): RedirectResponse
    {
        $data = $request->validated();
        $data['content'] = $this->sanitizer->clean($data['content']);

        $page->update($data);

        return redirect()
            ->route('admin.pages.edit', $page)
            ->with('success', 'Page updated.');
    }

    public function destroy(Page $page): RedirectResponse
    {
        if ($page->is_system) {
            return back()->with('error', 'System pages cannot be deleted.');
        }

        $title = $page->title;
        $page->delete();

        return redirect()
            ->route('admin.pages.index')
            ->with('success', "Page \"{$title}\" deleted.");
    }

    private function toRow(Page $p): array
    {
        return [
            'id' => $p->id,
            'slug' => $p->slug,
            'title' => $p->title,
            'meta_description' => $p->meta_description,
            'content' => $p->content,
            'is_published' => $p->is_published,
            'is_system' => $p->is_system,
            'show_in_footer' => $p->show_in_footer,
            'updated_at' => optional($p->updated_at)->toIso8601String(),
            'public_url' => url('/pages/'.$p->slug),
        ];
    }

    private function stats(): array
    {
        return [
            'total' => Page::count(),
            'published' => Page::where('is_published', true)->count(),
            'drafts' => Page::where('is_published', false)->count(),
            'system' => Page::where('is_system', true)->count(),
        ];
    }
}
