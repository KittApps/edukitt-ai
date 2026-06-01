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
use App\Http\Requests\Admin\Support\StoreFaqCategoryRequest;
use App\Http\Requests\Admin\Support\StoreFaqRequest;
use App\Models\Faq;
use App\Models\FaqCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportController extends Controller
{
    public function index(): Response
    {
        $categories = FaqCategory::query()
            ->ordered()
            ->with(['faqs' => fn ($q) => $q->ordered()])
            ->get()
            ->map(fn (FaqCategory $cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'slug' => $cat->slug,
                'icon' => $cat->icon,
                'sort_order' => $cat->sort_order,
                'is_active' => $cat->is_active,
                'faqs_count' => $cat->faqs->count(),
                'faqs' => $cat->faqs->map(fn (Faq $faq) => [
                    'id' => $faq->id,
                    'faq_category_id' => $faq->faq_category_id,
                    'question' => $faq->question,
                    'answer' => $faq->answer,
                    'sort_order' => $faq->sort_order,
                    'is_active' => $faq->is_active,
                ])->values(),
            ])
            ->values();

        return Inertia::render('Admin/Support/Index', [
            'categories' => $categories,
            'stats' => $this->buildStats(),
        ]);
    }

    public function storeCategory(StoreFaqCategoryRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['sort_order'] = (int) (FaqCategory::max('sort_order') ?? 0) + 10;

        FaqCategory::create($data);

        return back()->with('success', 'Category created.');
    }

    public function updateCategory(StoreFaqCategoryRequest $request, FaqCategory $category): RedirectResponse
    {
        $category->update($request->validated());

        return back()->with('success', 'Category updated.');
    }

    public function destroyCategory(FaqCategory $category): RedirectResponse
    {
        $name = $category->name;
        $category->delete();

        return back()->with('success', "Category \"{$name}\" deleted.");
    }

    public function storeFaq(StoreFaqRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['sort_order'] = (int) (Faq::where('faq_category_id', $data['faq_category_id'])->max('sort_order') ?? 0) + 10;

        Faq::create($data);

        return back()->with('success', 'FAQ added.');
    }

    public function updateFaq(StoreFaqRequest $request, Faq $faq): RedirectResponse
    {
        $faq->update($request->validated());

        return back()->with('success', 'FAQ updated.');
    }

    public function destroyFaq(Faq $faq): RedirectResponse
    {
        $faq->delete();

        return back()->with('success', 'FAQ deleted.');
    }

    public function reorderCategories(Request $request): RedirectResponse
    {
        $ids = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:faq_categories,id'],
        ])['ids'];

        foreach ($ids as $position => $id) {
            FaqCategory::where('id', $id)->update(['sort_order' => ($position + 1) * 10]);
        }

        return back();
    }

    public function reorderFaqs(Request $request, FaqCategory $category): RedirectResponse
    {
        $ids = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:faqs,id'],
        ])['ids'];

        foreach ($ids as $position => $id) {
            Faq::where('id', $id)
                ->where('faq_category_id', $category->id)
                ->update(['sort_order' => ($position + 1) * 10]);
        }

        return back();
    }

    private function buildStats(): array
    {
        return [
            'categories' => FaqCategory::count(),
            'categories_active' => FaqCategory::where('is_active', true)->count(),
            'faqs' => Faq::count(),
            'faqs_active' => Faq::where('is_active', true)->count(),
        ];
    }
}
