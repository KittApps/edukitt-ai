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

namespace App\Http\Middleware;

use App\Models\Page;
use App\Services\Billing\AccessGuard;
use App\Services\Billing\CreditPricingService;
use App\Services\Billing\CreditService;
use App\Services\LocalizationService;
use App\Services\Settings\CertificateSettings;
use App\Services\Settings\ContactSettings;
use App\Services\Settings\CurrencySettings;
use App\Services\Settings\GdprSettings;
use App\Services\Settings\GeneralSettings;
use App\Services\Settings\RecaptchaSettings;
use App\Services\Settings\ThemeSettings;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $localization = app(LocalizationService::class);
        $code = $localization->currentCode();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'locale' => [
                'code' => $code,
                'direction' => $localization->currentDirection(),
                'available' => array_values(array_map(
                    fn (array $lang) => [
                        'code' => $lang['code'],
                        'name' => $lang['name'],
                        'native_name' => $lang['native_name'],
                        'flag' => $lang['flag'] ?? '',
                        'direction' => $lang['direction'],
                    ],
                    $localization->availableLanguages(),
                )),
            ],
            'translations' => fn () => $localization->dictionaryFor($code),
            'flash' => fn () => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'limit_reached' => $request->session()->get('limit_reached'),
                'status' => $request->session()->get('status'),
                'contact_status' => $request->session()->get('contact_status'),
                'locale_import' => $request->session()->get('locale_import'),
            ],
            'billing' => fn () => $this->billingContext($request),
            'settings' => fn () => $this->publicSettings($request),
            'footer' => fn () => $this->footerContext(),
        ];
    }

    /**
     * Build the data the public footer needs:
     *   - `pages`: dynamic "Resources" group, populated by any active
     *     page an admin opted into the footer (single indexed query).
     *   - `legal`: per-slug published flag for the two hardcoded
     *     legal links (Terms / Privacy). The footer hides them when
     *     the corresponding page is unpublished so the link can never
     *     dangle.
     *
     * @return array{
     *     pages: array<int, array{slug: string, title: string}>,
     *     legal: array{terms: bool, privacy: bool},
     * }
     */
    private function footerContext(): array
    {
        $pages = Page::query()
            ->published()
            ->inFooter()
            ->orderBy('title')
            ->get(['slug', 'title'])
            ->map(fn (Page $p): array => [
                'slug' => $p->slug,
                'title' => $p->title,
            ])
            ->values()
            ->all();

        $legalSlugs = ['terms', 'privacy'];
        $publishedLegal = Page::query()
            ->published()
            ->whereIn('slug', $legalSlugs)
            ->pluck('slug')
            ->all();

        return [
            'pages' => $pages,
            'legal' => [
                'terms' => in_array('terms', $publishedLegal, true),
                'privacy' => in_array('privacy', $publishedLegal, true),
            ],
        ];
    }

    /**
     * Subset of the admin-managed settings that any page (public or
     * authenticated) is allowed to read. Exposes:
     *   - registration toggles for the public header / signup CTA
     *   - active theme + enabled theme list for the app-side header
     *     theme switcher and the AppLayout root CSS class.
     *
     * @return array<string, mixed>
     */
    private function publicSettings(Request $request): array
    {
        $general = app(GeneralSettings::class);
        $theme = app(ThemeSettings::class);

        return [
            'register' => [
                'enabled' => $general->isRegistrationEnabled(),
                'email_verification' => $general->requiresEmailVerification(),
            ],
            'theme' => $theme->publicSnapshot($request->user()),
            'brand' => $general->publicSnapshot(),
            'recaptcha' => app(RecaptchaSettings::class)->publicSnapshot(),
            'gdpr' => app(GdprSettings::class)->publicSnapshot(),
            'contact' => app(ContactSettings::class)->publicSnapshot(),
            'currency' => app(CurrencySettings::class)->publicSnapshot(),
            'certificates' => app(CertificateSettings::class)->publicSnapshot(),
        ];
    }

    /**
     * Shared billing context: per-user credit summary + expired-plan
     * banner flag. Cheap (one indexed read on user_credit_balances)
     * and only computed when Inertia actually requests the prop.
     *
     * @return array<string, mixed>|null
     */
    private function billingContext(Request $request): ?array
    {
        $user = $request->user();
        if ($user === null) {
            return null;
        }

        try {
            $balance = app(CreditService::class)->getOrCreateBalance($user);
            $pricing = app(CreditPricingService::class);
            $access = app(AccessGuard::class);
            $certificates = app(CertificateSettings::class);
        } catch (\Throwable) {
            return null;
        }

        $plan = $user->subscriptionPlan;
        $planAllowsCertificates = $plan?->allowsCertificates() ?? false;
        $certificatesEnabledGlobally = $certificates->isEnabled();

        return [
            'credits_enabled' => $pricing->creditsEnabled(),
            'credits' => [
                'used' => $balance->total_used_this_period,
                'plan_remaining' => $balance->plan_credits_remaining,
                'purchased_remaining' => $balance->purchased_credits_remaining,
                'total' => $balance->periodCapacity(),
                'remaining' => $balance->plan_credits_remaining + $balance->purchased_credits_remaining,
            ],
            'plan' => $plan === null ? null : [
                'name' => $plan->name,
                'is_free' => $plan->isFree(),
            ],
            'entitlements' => [
                // Visible only when BOTH the master toggle is on AND the
                // user's plan includes certificates. The plan-only flag
                // is kept separately so the sidebar can render a "Pro"
                // badge instead of hiding the link outright.
                'certificates' => $certificatesEnabledGlobally && $planAllowsCertificates,
                'certificates_plan' => $planAllowsCertificates,
            ],
            'expired_plan' => $access->isOnExpiredPaidPlan($user)
                ? ['previous_plan' => $user->previousPaidPlan?->name]
                : null,
        ];
    }
}
