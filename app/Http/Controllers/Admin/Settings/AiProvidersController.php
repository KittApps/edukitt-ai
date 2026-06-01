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

namespace App\Http\Controllers\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Models\AiProvider;
use App\Models\AiProviderModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AiProvidersController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Settings/AiProviders', [
            'providers' => AiProvider::with('models')->get(),
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'providers' => 'required|array',
            'providers.*.id' => 'nullable|integer|exists:ai_providers,id',
            'providers.*.name' => 'required|string',
            'providers.*.slug' => 'required|string',
            'providers.*.api_key' => 'nullable|string',
            'providers.*.is_active' => 'boolean',
            'providers.*.models' => 'nullable|array',
            'providers.*.models.*.id' => 'nullable|integer|exists:ai_provider_models,id',
            'providers.*.models.*.name' => 'required|string',
            'providers.*.models.*.model_id' => 'required|string',
            'providers.*.models.*.input_price_per_million' => 'nullable|numeric|min:0',
            'providers.*.models.*.output_price_per_million' => 'nullable|numeric|min:0',
            'providers.*.models.*.is_active' => 'boolean',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->input('providers') as $providerData) {
                $provider = AiProvider::updateOrCreate(
                    ['slug' => $providerData['slug']],
                    [
                        'name' => $providerData['name'],
                        'api_key' => $providerData['api_key'] ?? null,
                        'is_active' => $providerData['is_active'] ?? true,
                    ],
                );

                $submittedModels = $providerData['models'] ?? [];
                $submittedModelIds = array_values(array_filter(
                    array_map(
                        fn ($m) => $m['model_id'] ?? null,
                        $submittedModels,
                    ),
                    fn ($v) => $v !== null && $v !== '',
                ));

                $provider->models()
                    ->when(
                        ! empty($submittedModelIds),
                        fn ($q) => $q->whereNotIn('model_id', $submittedModelIds),
                    )
                    ->delete();

                foreach ($submittedModels as $modelData) {
                    AiProviderModel::updateOrCreate(
                        [
                            'ai_provider_id' => $provider->id,
                            'model_id' => $modelData['model_id'],
                        ],
                        [
                            'name' => $modelData['name'],
                            'input_price_per_million' => $modelData['input_price_per_million'] ?? null,
                            'output_price_per_million' => $modelData['output_price_per_million'] ?? null,
                            'is_active' => $modelData['is_active'] ?? true,
                        ],
                    );
                }
            }
        });

        return back()->with('success', 'AI providers updated.');
    }
}
