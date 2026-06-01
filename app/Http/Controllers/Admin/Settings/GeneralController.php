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
use App\Models\Language;
use App\Models\Setting;
use App\Models\Theme;
use App\Services\Settings\CertificateSettings;
use App\Services\Settings\ContactSettings;
use App\Services\Settings\GdprSettings;
use App\Services\Settings\GeneralSettings;
use App\Services\Settings\RecaptchaSettings;
use App\Services\Settings\SecretSetting;
use App\Services\Settings\ThemeSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin → Settings → General.
 *
 * Three tabs:
 *   - Site:     site name + logo upload.
 *   - Accounts: sign-up master toggle, email-verification requirement,
 *               and whether end users can delete their own account.
 *   - Theme:    per-theme enable / disable, system default selection,
 *               and whether end users may pick their own theme.
 *
 * All values are persisted via the existing key/value Setting store under
 * the `general` group. {@see GeneralSettings} is the typed accessor every
 * other caller reads through.
 */
class GeneralController extends Controller
{
    private const GROUP = GeneralSettings::GROUP;

    public function __construct(
        private readonly GeneralSettings $settings,
        private readonly ThemeSettings $themeSettings,
        private readonly RecaptchaSettings $recaptchaSettings,
        private readonly GdprSettings $gdprSettings,
        private readonly ContactSettings $contactSettings,
        private readonly CertificateSettings $certificateSettings,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Admin/Settings/General', [
            'general' => $this->settings->snapshot(),
            'theme' => $this->themeSettings->snapshot(),
            'recaptcha' => $this->recaptchaSettings->snapshot(),
            'gdpr' => $this->gdprSettings->snapshot(),
            'contact' => $this->contactSettings->snapshot(),
            'certificates' => $this->certificateSettings->snapshot(),
            'languages' => $this->languageOptions(),
        ]);
    }

    /**
     * Active languages (managed under Settings → Localization), used to
     * populate the "default site language" dropdown on the Site tab.
     * The selected value is stored independently in {@see GeneralSettings::KEY_SITE_DEFAULT_LANGUAGE_CODE}
     * and does not change which language is the translation base (always English / `is_default` row).
     */
    private function languageOptions(): array
    {
        $rows = Language::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['code', 'name', 'native_name', 'flag', 'direction', 'is_default']);

        $activeCodes = $rows->pluck('code')->all();

        $stored = $this->settings->siteDefaultLanguageCode();
        if ($stored !== null && ! in_array($stored, $activeCodes, true)) {
            $stored = null;
        }

        $fallback = $rows->firstWhere('code', 'en')?->code
            ?? $rows->firstWhere('is_default', true)?->code
            ?? $rows->first()?->code;

        return [
            'options' => $rows->map(fn (Language $l) => [
                'code' => $l->code,
                'name' => $l->name,
                'native_name' => $l->native_name,
                'flag' => $l->flag,
                'direction' => $l->direction,
                'is_translation_base' => (bool) $l->is_default,
            ])->all(),
            'current_default' => $stored ?? $fallback,
        ];
    }

    /**
     * Site tab: the home <title> tag and the meta description used by
     * the marketing surface, plus the default site language used as
     * the initial locale for visitors who haven't picked one yet.
     * Pure text + a dropdown, no uploads — keeps the form fast and the
     * validation simple.
     */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'site_title' => 'nullable|string|max:160',
            'site_description' => 'nullable|string|max:500',
            'support_enabled' => 'required|boolean',
            'language_switcher_enabled' => 'required|boolean',
            'default_language_code' => [
                'nullable',
                'string',
                Rule::exists('languages', 'code')->where('is_active', true),
            ],
        ]);

        Setting::set(self::GROUP, GeneralSettings::KEY_SITE_TITLE, $data['site_title'] ?? null);
        Setting::set(self::GROUP, GeneralSettings::KEY_SITE_DESCRIPTION, $data['site_description'] ?? null);
        Setting::set(self::GROUP, GeneralSettings::KEY_SUPPORT_ENABLED, (bool) $data['support_enabled']);
        Setting::set(self::GROUP, GeneralSettings::KEY_LANGUAGE_SWITCHER_ENABLED, (bool) $data['language_switcher_enabled']);

        $defaultLang = $data['default_language_code'] ?? null;
        if (is_string($defaultLang) && $defaultLang !== '') {
            Setting::set(self::GROUP, GeneralSettings::KEY_SITE_DEFAULT_LANGUAGE_CODE, $defaultLang);
        } else {
            Setting::set(self::GROUP, GeneralSettings::KEY_SITE_DEFAULT_LANGUAGE_CODE, null);
        }

        return back()->with('success', 'Site settings updated.');
    }

    /**
     * Brand tab: display name, light/dark logo, favicon.
     *
     * Uploads land under `storage/app/public/settings/` and the stored
     * setting value is the disk-relative path. The accessor
     * (GeneralSettings::*Url) converts it to a public URL on read.
     * Asking the request for `remove_*` flags lets admins clear an
     * existing asset without uploading a new one.
     */
    public function updateBrand(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'site_name' => 'nullable|string|max:255',
            'logo' => 'nullable|image|max:5120',
            'logo_dark' => 'nullable|image|max:5120',
            'favicon' => 'nullable|file|mimes:ico,png,svg|max:1024',
            'remove_logo' => 'nullable|boolean',
            'remove_logo_dark' => 'nullable|boolean',
            'remove_favicon' => 'nullable|boolean',
        ]);

        Setting::set(self::GROUP, GeneralSettings::KEY_SITE_NAME, $data['site_name'] ?? null);

        $this->processAsset(
            $request,
            field: 'logo',
            removeField: 'remove_logo',
            settingKey: GeneralSettings::KEY_LOGO,
        );
        $this->processAsset(
            $request,
            field: 'logo_dark',
            removeField: 'remove_logo_dark',
            settingKey: GeneralSettings::KEY_LOGO_DARK,
        );
        $this->processAsset(
            $request,
            field: 'favicon',
            removeField: 'remove_favicon',
            settingKey: GeneralSettings::KEY_FAVICON,
        );

        return back()->with('success', 'Brand updated.');
    }

    /**
     * Store an uploaded asset, delete the old file when replacing, or
     * clear the setting + delete the file when the admin ticked the
     * "remove" checkbox. No-op when neither flag is set so partial
     * form submits don't accidentally wipe existing assets.
     */
    private function processAsset(
        Request $request,
        string $field,
        string $removeField,
        string $settingKey,
    ): void {
        if ($request->boolean($removeField)) {
            $current = $this->settings->{$this->existingPathReader($settingKey)}();
            if ($current !== null) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($current);
            }
            Setting::set(self::GROUP, $settingKey, null);

            return;
        }

        if ($request->hasFile($field)) {
            $current = $this->settings->{$this->existingPathReader($settingKey)}();
            if ($current !== null) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($current);
            }
            $path = $request->file($field)->store('settings', 'public');
            Setting::set(self::GROUP, $settingKey, $path);
        }
    }

    /**
     * Map a setting key to the GeneralSettings reader method that
     * returns its raw stored path (not the resolved URL — we need
     * the path to delete the underlying file on the disk).
     */
    private function existingPathReader(string $settingKey): string
    {
        return match ($settingKey) {
            GeneralSettings::KEY_LOGO => 'logoPath',
            GeneralSettings::KEY_LOGO_DARK => 'logoDarkPath',
            GeneralSettings::KEY_FAVICON => 'faviconPath',
            default => throw new \InvalidArgumentException("No path reader for {$settingKey}"),
        };
    }

    /**
     * Account-management toggles: open/close sign-ups, require/skip
     * email verification, allow/block end-user self-deletion. Reads
     * are picked up on the next request — no cache to bust.
     */
    public function updateAccount(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'registration_enabled' => 'required|boolean',
            'email_verification' => 'required|boolean',
            'deletion_enabled' => 'required|boolean',
        ]);

        Setting::set(self::GROUP, GeneralSettings::KEY_REGISTER_ENABLED, (bool) $data['registration_enabled']);
        Setting::set(
            self::GROUP,
            GeneralSettings::KEY_REGISTER_EMAIL_VERIFICATION,
            (bool) $data['email_verification'],
        );
        Setting::set(
            self::GROUP,
            GeneralSettings::KEY_ACCOUNT_DELETION_ENABLED,
            (bool) $data['deletion_enabled'],
        );

        return back()->with('success', 'Account settings updated.');
    }

    /**
     * Theme tab. Persists three things in one shot:
     *   - per-theme `enabled` flag (in the `themes` table)
     *   - system default theme key (in `settings` group `theme`)
     *   - whether end users may pick their own theme (in same group)
     *
     * Validation rules (enforced in addition to the request rules):
     *   - The chosen default theme must exist and must be enabled.
     *   - At least one theme must remain enabled (otherwise the app
     *     would have nothing to render with).
     */
    public function updateTheme(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'allow_user_selection' => 'required|boolean',
            'default_key' => 'required|string|exists:themes,key',
            'themes' => 'required|array|min:1',
            'themes.*.key' => 'required|string|exists:themes,key',
            'themes.*.enabled' => 'required|boolean',
        ]);

        $byKey = collect($data['themes'])->keyBy('key');

        $defaultKey = (string) $data['default_key'];
        if (! ($byKey->get($defaultKey)['enabled'] ?? false)) {
            return back()
                ->withErrors(['default_key' => 'The default theme must be enabled.'])
                ->withInput();
        }

        $anyEnabled = $byKey->contains(fn (array $row) => (bool) $row['enabled']);
        if (! $anyEnabled) {
            return back()
                ->withErrors(['themes' => 'At least one theme must be enabled.'])
                ->withInput();
        }

        DB::transaction(function () use ($byKey, $defaultKey, $data) {
            foreach ($byKey as $key => $row) {
                Theme::query()
                    ->where('key', $key)
                    ->update(['enabled' => (bool) $row['enabled']]);
            }

            Setting::set(ThemeSettings::GROUP, ThemeSettings::KEY_DEFAULT_KEY, $defaultKey);
            Setting::set(
                ThemeSettings::GROUP,
                ThemeSettings::KEY_USER_SELECTION_ENABLED,
                (bool) $data['allow_user_selection'],
            );
        });

        return back()->with('success', 'Theme settings updated.');
    }

    /**
     * reCAPTCHA tab. Site key is stored in plaintext (it's embedded
     * in the public widget script anyway); the secret is encrypted
     * via SecretSetting. Leaving the secret blank on update keeps
     * the existing value — same convention as Stripe / SMTP.
     */
    public function updateRecaptcha(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'site_key' => 'nullable|string|max:255',
            'secret_key' => 'nullable|string|max:255',
        ]);

        Setting::set(RecaptchaSettings::GROUP, RecaptchaSettings::KEY_ENABLED, (bool) $data['enabled']);
        Setting::set(RecaptchaSettings::GROUP, RecaptchaSettings::KEY_SITE_KEY, $data['site_key'] ?? null);

        if (! empty($data['secret_key'])) {
            SecretSetting::set(RecaptchaSettings::GROUP, RecaptchaSettings::KEY_SECRET_KEY, $data['secret_key']);
        }

        return back()->with('success', 'reCAPTCHA settings updated.');
    }

    /**
     * GDPR / cookie-consent banner tab. All strings are stored as
     * plain settings rows so admins can localise wording, swap the
     * policy URL, or fully disable the banner from one place.
     */
    public function updateGdpr(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'banner_message' => 'required|string|max:600',
            'accept_label' => 'required|string|max:60',
            'decline_label' => 'required|string|max:60',
            'policy_url' => 'nullable|string|max:2048',
            'policy_label' => 'nullable|string|max:60',
        ]);

        Setting::set(GdprSettings::GROUP, GdprSettings::KEY_ENABLED, (bool) $data['enabled']);
        Setting::set(GdprSettings::GROUP, GdprSettings::KEY_BANNER_MESSAGE, $data['banner_message']);
        Setting::set(GdprSettings::GROUP, GdprSettings::KEY_ACCEPT_LABEL, $data['accept_label']);
        Setting::set(GdprSettings::GROUP, GdprSettings::KEY_DECLINE_LABEL, $data['decline_label']);
        Setting::set(GdprSettings::GROUP, GdprSettings::KEY_POLICY_URL, $data['policy_url'] ?: null);
        Setting::set(GdprSettings::GROUP, GdprSettings::KEY_POLICY_LABEL, $data['policy_label'] ?: 'Learn more');

        return back()->with('success', 'GDPR settings updated.');
    }

    public function updateContact(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'recipient_email' => 'nullable|email|max:255',
        ]);

        Setting::set(ContactSettings::GROUP, ContactSettings::KEY_ENABLED, (bool) $data['enabled']);
        Setting::set(ContactSettings::GROUP, ContactSettings::KEY_RECIPIENT_EMAIL, $data['recipient_email'] ?: null);

        return back()->with('success', 'Contact settings updated.');
    }

    /**
     * Certificates tab. Two knobs:
     *   - `enabled`        master toggle; when off the cert pages,
     *                      sidebar nav item and CourseCertificateCard
     *                      all disappear app-wide.
     *   - `primary_color`  optional hex override for the cert PDF.
     *                      Stored as null when blank so the runtime
     *                      can derive a value from the active theme.
     */
    public function updateCertificates(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'primary_color' => ['nullable', 'string', 'max:7', 'regex:/^#?[0-9a-fA-F]{3,6}$/'],
            'background_color' => ['nullable', 'string', 'max:7', 'regex:/^#?[0-9a-fA-F]{3,6}$/'],
        ]);

        Setting::set(
            CertificateSettings::GROUP,
            CertificateSettings::KEY_ENABLED,
            (bool) $data['enabled'],
        );

        Setting::set(
            CertificateSettings::GROUP,
            CertificateSettings::KEY_PRIMARY_COLOR,
            $this->normalizeColorInput($data['primary_color'] ?? null),
        );

        Setting::set(
            CertificateSettings::GROUP,
            CertificateSettings::KEY_BACKGROUND_COLOR,
            $this->normalizeColorInput($data['background_color'] ?? null),
        );

        return back()->with('success', 'Certificate settings updated.');
    }

    /**
     * Prefix a missing `#` and coerce empty strings to null so the
     * settings row stores a clean hex or nothing at all.
     */
    private function normalizeColorInput(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return str_starts_with($value, '#') ? $value : '#'.$value;
    }
}
