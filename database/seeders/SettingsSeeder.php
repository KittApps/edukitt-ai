<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

/**
 * Seed default values for every key the admin panel exposes.
 *
 * Two design principles:
 *
 *   1. **Non-clobbering.** We use `firstOrCreate` so re-running the
 *      seeder on an existing install does NOT overwrite values the
 *      admin has already saved. Only missing rows get the default.
 *
 *   2. **No secrets.** Stripe keys, SMTP password, reCAPTCHA secret,
 *      etc. ship as `null`. The buyer enters their own credentials
 *      via Admin → Settings after install. Never ship the dev DB's
 *      encrypted secret blobs.
 *
 * Storage format: the `value` column is JSON-cast, so we pass native
 * PHP scalars / arrays here and Eloquent encodes them on write.
 */
class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // -------------------------------------------------------------
            // General (Admin → Settings → General)
            // -------------------------------------------------------------
            'general' => [
                'site_name' => 'EduKitt AI',
                'site_title' => 'EduKitt — AI Powered Learning Platform',
                'site_description' => null,
                'site.default_language_code' => 'en',
                'language_switcher_enabled' => true,
                'logo' => null,
                'favicon' => null,
                'support_enabled' => true,
                'register.enabled' => true,
                // Default OFF so the buyer's first registration works
                // before they have configured SMTP. Flip back ON from
                // the admin panel once mail delivery is verified.
                'register.email_verification' => false,
            ],

            // -------------------------------------------------------------
            // Theme (Admin → Settings → General → Theme)
            // -------------------------------------------------------------
            //
            // These are also written by the create_themes_table migration.
            // We list them here so a `db:seed` after a manual reset
            // re-creates them, but firstOrCreate keeps the migration's
            // values intact when they already exist.
            'theme' => [
                'default_key' => 'default',
                'user_selection_enabled' => true,
            ],

            // -------------------------------------------------------------
            // AI Content (Admin → Settings → AI Content → Global)
            // -------------------------------------------------------------
            'ai_content' => [
                'merge_course_generation' => false,
                'show_language_selector' => true,
                'user_can_select_model' => false,
                'supported_languages' => [
                    ['code' => 'en', 'name' => 'English', 'is_default' => true],
                ],
            ],

            // -------------------------------------------------------------
            // Billing (Admin → Settings → Billings)
            // -------------------------------------------------------------
            //
            // Stripe keys ship as null. Operator pastes their own keys
            // via the Billings tab — the form uses SecretSetting which
            // encrypts at rest.
            'billing' => [
                'credits_enabled' => true,
                'credit_rate_usd' => 0.002,
                'display_currency_code' => 'USD',
                'display_currency_symbol' => '$',
                'stripe_currency' => 'USD',
                'stripe_publishable_key' => null,
                'stripe_secret_key' => null,
                'stripe_webhook_secret' => null,
            ],

            // -------------------------------------------------------------
            // Certificates (Admin → Settings → General → Certificates)
            // -------------------------------------------------------------
            'certificates' => [
                'enabled' => true,
                'background_color' => '#ffffff',
                'primary_color' => '#000000',
            ],

            // -------------------------------------------------------------
            // Contact (Admin → Settings → General → Contact)
            // -------------------------------------------------------------
            //
            // Disabled by default because `recipient_email` is null —
            // contact submissions would land nowhere until the admin
            // fills it in.
            'contact' => [
                'enabled' => false,
                'recipient_email' => null,
            ],

            // -------------------------------------------------------------
            // Email / SMTP (Admin → Settings → Email)
            // -------------------------------------------------------------
            //
            // Password ships as null. Operator enters it via the SMTP
            // form which routes through SecretSetting for encryption.
            'email' => [
                'host' => null,
                'port' => null,
                'username' => null,
                'password' => null,
                'encryption' => 'tls',
                'from_address' => null,
                'from_name' => 'EduAI',
            ],

            // -------------------------------------------------------------
            // GDPR / Cookie banner (Admin → Settings → General → GDPR)
            // -------------------------------------------------------------
            //
            // Banner copy ships pre-written so a buyer who flips this on
            // gets a useful default immediately.
            'gdpr' => [
                'enabled' => false,
                'banner_message' => 'We use cookies to provide essential functionality and to improve your experience. By continuing, you agree to our use of cookies.',
                'accept_label' => 'Accept',
                'decline_label' => 'Decline',
                'policy_label' => 'Learn more',
                'policy_url' => null,
            ],

            // -------------------------------------------------------------
            // reCAPTCHA (Admin → Settings → General → reCAPTCHA)
            // -------------------------------------------------------------
            'recaptcha' => [
                'enabled' => false,
                'site_key' => null,
                'secret_key' => null,
            ],

            // -------------------------------------------------------------
            // Queue (Admin → Settings → Queue)
            // -------------------------------------------------------------
            //
            // Off by default so buyers without Redis / Horizon still get
            // a working install. The two per-job toggles describe what
            // the queue WOULD do once `enabled` is flipped on.
            'queue' => [
                'enabled' => false,
                'jobs.ai_generation.enabled' => true,
                'jobs.email_sending.enabled' => false,
            ],
        ];

        foreach ($defaults as $group => $rows) {
            foreach ($rows as $key => $value) {
                Setting::firstOrCreate(
                    ['group' => $group, 'key' => $key],
                    ['value' => $value],
                );
            }
        }
    }
}
