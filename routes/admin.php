<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\Analytics\AiFailuresController;
use App\Http\Controllers\Admin\Analytics\AiTokensCostController;
use App\Http\Controllers\Admin\Analytics\AiTokensUsageController;
use App\Http\Controllers\Admin\Analytics\RevenueController;
use App\Http\Controllers\Admin\Settings\AiContentController;
use App\Http\Controllers\Admin\Settings\AiProvidersController;
use App\Http\Controllers\Admin\Settings\BillingController;
use App\Http\Controllers\Admin\Settings\EmailController;
use App\Http\Controllers\Admin\Settings\GeneralController;
use App\Http\Controllers\Admin\Settings\LocalizationController;
use App\Http\Controllers\Admin\Settings\QueueController;
use App\Http\Controllers\Admin\Subscriptions\CreditPackagesController;
use App\Http\Controllers\Admin\Subscriptions\SubscriptionPlansController;
use App\Http\Controllers\Admin\Subscriptions\SubscriptionsController;
use App\Http\Controllers\Admin\Subscriptions\TransactionsController;
use App\Http\Controllers\Admin\PagesController;
use App\Http\Controllers\Admin\SupportController;
use App\Http\Controllers\Admin\UsersController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', AdminDashboardController::class)->name('dashboard');

    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/', [UsersController::class, 'index'])->name('index');
        Route::get('/create', [UsersController::class, 'create'])->name('create');
        Route::post('/', [UsersController::class, 'store'])->name('store');
        Route::get('/{user}/edit', [UsersController::class, 'edit'])->name('edit');
        Route::patch('/{user}', [UsersController::class, 'update'])->name('update');
        Route::post('/{user}/credits', [UsersController::class, 'adjustCredits'])
            ->name('credits.adjust');
        Route::post('/{user}/password-reset', [UsersController::class, 'sendPasswordReset'])
            ->name('password.reset');
        Route::patch('/{user}/password', [UsersController::class, 'setPassword'])
            ->name('password.set');
        Route::delete('/{user}', [UsersController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('subscriptions')->name('subscriptions.')->group(function () {
        Route::get('/', [SubscriptionsController::class, 'index'])->name('index');
    });

    Route::prefix('subscription-plans')->name('subscription-plans.')->group(function () {
        Route::get('/', [SubscriptionPlansController::class, 'index'])->name('index');
        Route::get('/create', [SubscriptionPlansController::class, 'create'])->name('create');
        Route::post('/', [SubscriptionPlansController::class, 'store'])->name('store');
        Route::get('/{plan}/edit', [SubscriptionPlansController::class, 'edit'])->name('edit');
        Route::put('/{plan}', [SubscriptionPlansController::class, 'update'])->name('update');
        Route::delete('/{plan}', [SubscriptionPlansController::class, 'destroy'])->name('destroy');
        Route::post('/{plan}/make-default', [SubscriptionPlansController::class, 'makeDefault'])->name('make-default');
    });

    Route::prefix('credit-packages')->name('credit-packages.')->group(function () {
        Route::get('/', [CreditPackagesController::class, 'index'])->name('index');
        Route::post('/', [CreditPackagesController::class, 'store'])->name('store');
        Route::put('/{package}', [CreditPackagesController::class, 'update'])->name('update');
        Route::delete('/{package}', [CreditPackagesController::class, 'destroy'])->name('destroy');
    });

    Route::get('/transactions', [TransactionsController::class, 'index'])->name('transactions.index');
    Route::get('/transactions/export', [TransactionsController::class, 'export'])->name('transactions.export');

    Route::prefix('pages')->name('pages.')->group(function () {
        Route::get('/', [PagesController::class, 'index'])->name('index');
        Route::get('/create', [PagesController::class, 'create'])->name('create');
        Route::post('/', [PagesController::class, 'store'])->name('store');
        Route::get('/{page}/edit', [PagesController::class, 'edit'])->name('edit');
        Route::put('/{page}', [PagesController::class, 'update'])->name('update');
        Route::delete('/{page}', [PagesController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('support')->name('support.')->group(function () {
        Route::get('/', [SupportController::class, 'index'])->name('index');
        Route::post('/categories', [SupportController::class, 'storeCategory'])->name('categories.store');
        Route::put('/categories/{category}', [SupportController::class, 'updateCategory'])->name('categories.update');
        Route::delete('/categories/{category}', [SupportController::class, 'destroyCategory'])->name('categories.destroy');
        Route::post('/categories/reorder', [SupportController::class, 'reorderCategories'])->name('categories.reorder');
        Route::post('/faqs', [SupportController::class, 'storeFaq'])->name('faqs.store');
        Route::put('/faqs/{faq}', [SupportController::class, 'updateFaq'])->name('faqs.update');
        Route::delete('/faqs/{faq}', [SupportController::class, 'destroyFaq'])->name('faqs.destroy');
        Route::post('/categories/{category}/faqs/reorder', [SupportController::class, 'reorderFaqs'])->name('faqs.reorder');
    });

    Route::prefix('analytics')->name('analytics.')->group(function () {
        Route::get('/ai-tokens-usage', [AiTokensUsageController::class, 'index'])->name('ai-tokens-usage');
        Route::get('/ai-tokens-cost', [AiTokensCostController::class, 'index'])->name('ai-tokens-cost');
        Route::get('/ai-failures', [AiFailuresController::class, 'index'])->name('ai-failures');
        Route::delete('/ai-failures/errors', [AiFailuresController::class, 'clearErrors'])->name('ai-failures.clear');
        Route::get('/revenue', [RevenueController::class, 'index'])->name('revenue');
    });

    Route::prefix('settings')->name('settings.')->group(function () {
        // General
        Route::get('/general', [GeneralController::class, 'index'])->name('general');
        Route::post('/general', [GeneralController::class, 'update'])->name('general.update');
        Route::post('/general/brand', [GeneralController::class, 'updateBrand'])->name('general.brand.update');
        Route::post('/general/account', [GeneralController::class, 'updateAccount'])->name('general.account.update');
        Route::post('/general/theme', [GeneralController::class, 'updateTheme'])->name('general.theme.update');
        Route::post('/general/recaptcha', [GeneralController::class, 'updateRecaptcha'])->name('general.recaptcha.update');
        Route::post('/general/gdpr', [GeneralController::class, 'updateGdpr'])->name('general.gdpr.update');
        Route::post('/general/contact', [GeneralController::class, 'updateContact'])->name('general.contact.update');
        Route::post('/general/certificates', [GeneralController::class, 'updateCertificates'])
            ->name('general.certificates.update');

        // AI Providers
        Route::get('/ai-providers', [AiProvidersController::class, 'index'])->name('ai-providers');
        Route::post('/ai-providers', [AiProvidersController::class, 'update'])->name('ai-providers.update');

        // AI Content
        Route::get('/ai-content', [AiContentController::class, 'index'])->name('ai-content');
        Route::post('/ai-content/global-config', [AiContentController::class, 'updateGlobalConfig'])
            ->name('ai-content.global-config.update');
        Route::post('/ai-content/{task:key}/assignments', [AiContentController::class, 'saveAssignments'])
            ->name('ai-content.assignments.save');
        Route::post('/ai-content/{task:key}/configuration', [AiContentController::class, 'saveTaskConfiguration'])
            ->name('ai-content.configuration.save');
        Route::post('/ai-content/{task}/personalize', [AiContentController::class, 'updatePersonalize'])
            ->name('ai-content.personalize.update');
        Route::post('/ai-content/{task}/prompt', [AiContentController::class, 'updatePrompt'])
            ->name('ai-content.prompt.update');
        Route::delete('/ai-content/{task}/prompt', [AiContentController::class, 'resetPrompt'])
            ->name('ai-content.prompt.reset');

        // Billings (Stripe + Credits + Currency)
        Route::get('/billings', [BillingController::class, 'index'])->name('billings');
        Route::post('/billings/credits', [BillingController::class, 'updateCredits'])->name('billings.credits.update');
        Route::post('/billings/currency', [BillingController::class, 'updateCurrency'])->name('billings.currency.update');
        Route::post('/billings/stripe', [BillingController::class, 'updateStripe'])->name('billings.stripe.update');

        // Email (SMTP + Test)
        Route::get('/email', [EmailController::class, 'index'])->name('email');
        Route::post('/email/smtp', [EmailController::class, 'updateSmtp'])->name('email.smtp');
        Route::post('/email/test', [EmailController::class, 'sendTest'])->name('email.test');

        // Queue (General + Jobs + Redis)
        Route::get('/queue', [QueueController::class, 'index'])->name('queue');
        Route::post('/queue/general', [QueueController::class, 'updateGeneral'])->name('queue.general');
        Route::post('/queue/jobs', [QueueController::class, 'updateJobs'])->name('queue.jobs');
        Route::post('/queue/redis', [QueueController::class, 'updateRedis'])->name('queue.redis');
        Route::post('/queue/redis/test', [QueueController::class, 'testRedis'])->name('queue.redis.test');

        // Localization
        Route::get('/localization', [LocalizationController::class, 'index'])->name('localization');
        Route::get('/localization/export', [LocalizationController::class, 'exportCsv'])->name('localization.export');
        Route::post('/localization/import', [LocalizationController::class, 'importCsv'])->name('localization.import');
        Route::get('/localization/ai-translate/options', [LocalizationController::class, 'aiTranslateOptions'])->name('localization.ai-translate.options');
        Route::post('/localization/ai-translate/batch', [LocalizationController::class, 'aiTranslateBatch'])->name('localization.ai-translate.batch');
        Route::post('/localization/languages', [LocalizationController::class, 'addLanguage'])->name('localization.languages.add');
        Route::patch('/localization/languages/{code}', [LocalizationController::class, 'updateLanguage'])->name('localization.languages.update');
        Route::delete('/localization/languages/{code}', [LocalizationController::class, 'removeLanguage'])->name('localization.languages.delete');
        Route::post('/localization/keys', [LocalizationController::class, 'addKey'])->name('localization.keys.add');
        Route::delete('/localization/keys/{id}', [LocalizationController::class, 'removeKey'])->name('localization.keys.delete');
        Route::patch('/localization/translations', [LocalizationController::class, 'saveTranslation'])->name('localization.translations.save');
    });
});
