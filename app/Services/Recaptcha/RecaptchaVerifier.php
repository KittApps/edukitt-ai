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

namespace App\Services\Recaptcha;

use App\Services\Settings\RecaptchaSettings;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Server-side verification of a Google reCAPTCHA v2 response token.
 *
 * The widget on the frontend posts the user's solved challenge token
 * along with the form. We forward it to Google's siteverify endpoint
 * together with the admin-configured secret and return a simple bool.
 */
class RecaptchaVerifier
{
    private const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

    public function __construct(private readonly RecaptchaSettings $settings) {}

    public function isEnabled(): bool
    {
        return $this->settings->isEnabled();
    }

    public function verify(?string $token, ?string $ip = null): bool
    {
        if (! $this->isEnabled()) {
            return true;
        }

        if ($token === null || $token === '') {
            return false;
        }

        $secret = $this->settings->secretKey();
        if ($secret === null) {
            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout(5)
                ->post(self::VERIFY_URL, array_filter([
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $ip,
                ], fn ($v) => $v !== null));

            if (! $response->successful()) {
                Log::warning('reCAPTCHA siteverify HTTP error', [
                    'status' => $response->status(),
                ]);

                return false;
            }

            return (bool) ($response->json('success') ?? false);
        } catch (Throwable $e) {
            Log::warning('reCAPTCHA siteverify exception', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
