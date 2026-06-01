<?php

namespace Database\Seeders;

use App\Models\AiProvider;
use App\Models\AiProviderModel;
use Illuminate\Database\Seeder;

/**
 * Seed the catalogue of supported AI providers and the model rows the
 * platform knows about out of the box.
 *
 * Shipping defaults:
 *   - Providers ship INACTIVE with `api_key = null` so a fresh install
 *     never leaks an API key and never silently bills the buyer's
 *     account. The admin enables each provider from Admin → Settings
 *     → AI Providers after entering a key.
 *   - Models ship ACTIVE so that the moment the admin flips a provider
 *     on, the dropdowns in the user-facing wizards are populated.
 *
 * Idempotent: keyed on slug (provider) and (ai_provider_id, model_id)
 * (model) so re-seeding never duplicates rows. Existing api_key values
 * and per-row `is_active` toggles are NOT overwritten on re-seed —
 * use the dedicated reset action in the admin UI for that.
 */
class AiProviderSeeder extends Seeder
{
    public function run(): void
    {
        $providers = [
            [
                'name' => 'OpenAI',
                'slug' => 'openai',
                'models' => [
                    ['name' => 'GPT-5.4',      'model_id' => 'gpt-5.4',      'input_price' => 2.00, 'output_price' => 15.00],
                    ['name' => 'GPT-5.4 mini', 'model_id' => 'gpt-5.4-mini', 'input_price' => 0.75, 'output_price' => 4.50],
                    ['name' => 'GPT-5',        'model_id' => 'gpt-5',        'input_price' => 1.25, 'output_price' => 10.00],
                    ['name' => 'GPT-5 mini',   'model_id' => 'gpt-5-mini',   'input_price' => 0.25, 'output_price' => 2.00],
                    ['name' => 'GPT-4.1',      'model_id' => 'gpt-4.1',      'input_price' => 2.00, 'output_price' => 8.00],
                ],
            ],
            [
                'name' => 'Anthropic',
                'slug' => 'anthropic',
                'models' => [
                    ['name' => 'Claude 4 Sonnet',  'model_id' => 'claude-sonnet-4-6', 'input_price' => 3.00, 'output_price' => 15.00],
                    ['name' => 'Claude Haiku 4.5', 'model_id' => 'claude-haiku-4-5',  'input_price' => 1.00, 'output_price' => 5.00],
                ],
            ],
            [
                'name' => 'Google Gemini',
                'slug' => 'gemini',
                'models' => [
                    ['name' => 'Gemini 3.1 Pro',        'model_id' => 'gemini-3.1-pro-preview', 'input_price' => 2.00, 'output_price' => 12.00],
                    ['name' => 'Gemini 3.1 Flash-Lite', 'model_id' => 'gemini-3.1-flash-lite',  'input_price' => 0.25, 'output_price' => 1.50],
                    ['name' => 'Gemini 2.5 Pro',        'model_id' => 'gemini-2.5-pro',         'input_price' => 1.25, 'output_price' => 2.50],
                    ['name' => 'Gemini 2.5 Flash',      'model_id' => 'gemini-2.5-flash',       'input_price' => 0.30, 'output_price' => 2.50],
                    ['name' => 'Gemini 2.5 Flash-Lite', 'model_id' => 'gemini-2.5-flash-lite',  'input_price' => 0.10, 'output_price' => 0.40],
                ],
            ],
            [
                'name' => 'DeepSeek',
                'slug' => 'deepseek',
                'models' => [
                    ['name' => 'DeepSeek V4 Flash', 'model_id' => 'deepseek-v4-flash', 'input_price' => 0.14, 'output_price' => 0.28],
                    ['name' => 'DeepSeek V4 Pro',   'model_id' => 'deepseek-v4-pro',   'input_price' => 0.435, 'output_price' => 0.87],
                ],
            ],
            [
                'name' => 'xAI',
                'slug' => 'xai',
                'models' => [
                    ['name' => 'Grok 4.3', 'model_id' => 'grok-4.3', 'input_price' => 1.25, 'output_price' => 2.49],
                ],
            ],
            [
                'name' => 'OpenRouter',
                'slug' => 'openrouter',
                'models' => [],
            ],
            [
                'name' => 'Ollama',
                'slug' => 'ollama',
                'models' => [],
            ],
        ];

        foreach ($providers as $providerData) {
            $provider = AiProvider::firstOrCreate(
                ['slug' => $providerData['slug']],
                [
                    'name' => $providerData['name'],
                    'api_key' => null,
                    'is_active' => false,
                ],
            );

            // Update display-name only — never clobber the admin's saved
            // api_key or activation status on a re-seed.
            if ($provider->name !== $providerData['name']) {
                $provider->name = $providerData['name'];
                $provider->save();
            }

            foreach ($providerData['models'] as $modelData) {
                AiProviderModel::updateOrCreate(
                    [
                        'ai_provider_id' => $provider->id,
                        'model_id' => $modelData['model_id'],
                    ],
                    [
                        'name' => $modelData['name'],
                        'input_price_per_million' => $modelData['input_price'],
                        'output_price_per_million' => $modelData['output_price'],
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
