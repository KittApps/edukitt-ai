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

namespace App\Providers;

use App\Ai\Tracking\Analytics\TokenUsageAggregator;
use App\Ai\Tracking\Listeners\RecordTokenUsage;
use App\Ai\Tracking\Pricing\PricingResolver;
use App\Ai\Tracking\TokenRecorder;
use App\Listeners\Billing\HandleStripeWebhooks;
use App\Models\AiProvider;
use App\Services\Ai\AiService;
use App\Services\Ai\Generation\AiGenerationDispatcher;
use App\Services\Ai\Generation\PersisterRegistry;
use App\Services\Ai\Generation\Persisters\CourseLessonPersister;
use App\Services\Ai\Generation\Persisters\CourseOutlinePersister;
use App\Services\Ai\Generation\Persisters\CourseQuizPersister;
use App\Services\Ai\Generation\Persisters\QuickLearnPersister;
use App\Services\Ai\Generation\Persisters\QuizPersister;
use App\Services\Billing\AccessGuard;
use App\Services\Billing\CreditPricingService;
use App\Services\Billing\CreditService;
use App\Services\Billing\StripeSettingsResolver;
use App\Services\Billing\SubscriptionService;
use App\Services\Localization\DatabaseTranslator;
use App\Services\LocalizationService;
use App\Services\Mail\MailDispatcher;
use App\Services\Mail\MailSettingsResolver;
use App\Services\Queue\QueueSettingsResolver;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Laravel\Ai\Events\AgentPrompted;
use Laravel\Cashier\Events\WebhookReceived;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AiService::class);
        $this->app->singleton(LocalizationService::class);
        $this->app->singleton(PricingResolver::class);
        $this->app->singleton(TokenRecorder::class);
        $this->app->singleton(TokenUsageAggregator::class);

        $this->app->singleton(CreditPricingService::class);
        $this->app->singleton(CreditService::class);
        $this->app->singleton(SubscriptionService::class);
        $this->app->singleton(AccessGuard::class);
        $this->app->singleton(StripeSettingsResolver::class);
        $this->app->singleton(MailSettingsResolver::class);
        $this->app->singleton(QueueSettingsResolver::class);
        $this->app->singleton(MailDispatcher::class);

        // AI generation pipeline. The PersisterRegistry is a singleton
        // so the bindings below survive across requests / queue jobs;
        // the dispatcher routes any generation into the matching
        // persister and decides sync vs queued based on the admin
        // toggle. Adding a new generation flow = implement Persister,
        // add a line here.
        $this->app->singleton(PersisterRegistry::class, function ($app) {
            $registry = new PersisterRegistry;
            $registry->register($app->make(QuickLearnPersister::class));
            $registry->register($app->make(CourseOutlinePersister::class));
            $registry->register($app->make(QuizPersister::class));
            $registry->register($app->make(CourseQuizPersister::class));
            $registry->register($app->make(CourseLessonPersister::class));

            return $registry;
        });
        $this->app->singleton(AiGenerationDispatcher::class);

        // Replace Laravel's default `translator` binding with one that
        // first consults the DB-backed dictionary (translation_keys +
        // translations) and only falls back to vendor lang/en/*.php
        // when the key is unknown. This makes framework messages —
        // auth.failed, validation.required, passwords.sent, etc. —
        // editable from /admin/settings/localization without touching
        // any call site (`__()`, `trans()`, validator) since the
        // contract is unchanged.
        //
        // TranslationServiceProvider is a DeferrableProvider, so the
        // framework only registers it the first time `translator` is
        // resolved — and that registration would silently clobber the
        // singleton below. Eagerly registering it here forces Laravel
        // to flag it as loaded so it never re-runs after our override.
        $this->app->register(\Illuminate\Translation\TranslationServiceProvider::class);

        $this->app->singleton('translator', function ($app) {
            $trans = new DatabaseTranslator(
                $app['translation.loader'],
                $app->getLocale(),
            );
            $trans->setFallback($app->getFallbackLocale());

            return $trans;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->syncAiProviderKeysFromDatabase();
        $this->app->make(StripeSettingsResolver::class)->applyToConfig();
        $this->app->make(MailSettingsResolver::class)->applyToConfig();
        $this->app->make(QueueSettingsResolver::class)->applyToConfig();

        View::prependNamespace('notifications', resource_path('views/notifications'));

        Event::listen(AgentPrompted::class, RecordTokenUsage::class);
        Event::listen(WebhookReceived::class, HandleStripeWebhooks::class);
    }

    /**
     * Push admin-managed AI provider API keys from the database into the
     * runtime ai.* config so the laravel/ai package picks them up.
     *
     * This lets admins manage keys via /admin/settings/ai-providers instead
     * of forcing them into .env.
     */
    protected function syncAiProviderKeysFromDatabase(): void
    {
        try {
            if (! Schema::hasTable('ai_providers')) {
                return;
            }

            foreach (AiProvider::query()->get(['slug', 'api_key', 'is_active']) as $provider) {
                if (! $provider->is_active || empty($provider->api_key)) {
                    continue;
                }

                $configKey = "ai.providers.{$provider->slug}.key";

                if (Config::has("ai.providers.{$provider->slug}")) {
                    Config::set($configKey, $provider->api_key);
                }
            }
        } catch (Throwable) {
            // Fail silently during install / migrate when the DB is not yet ready.
        }
    }
}
