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

namespace App\Rules;

use App\Services\Recaptcha\RecaptchaVerifier;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Server-side guard for reCAPTCHA-protected forms.
 *
 * IMPORTANT: this rule is **implicit** (`$implicit = true`). Laravel
 * skips non-implicit rules when the attribute under validation is
 * empty / missing, which is exactly the case the rule exists to
 * catch — a form posted without a solved challenge token. Without
 * the implicit flag, pairing this rule with `nullable` (or even
 * leaving the field optional) lets unauthenticated callers bypass
 * reCAPTCHA simply by omitting `recaptcha_token` from the payload.
 *
 * The implicit-via-public-property convention is recognised by
 * {@see \Illuminate\Validation\InvokableValidationRule::make()}.
 */
class Recaptcha implements ValidationRule
{
    /**
     * Always run, even when the attribute is empty / missing, so a
     * form posted without a token still reaches `verify()` and is
     * rejected when reCAPTCHA is enabled.
     */
    public bool $implicit = true;

    public function __construct(private readonly ?string $ip = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $verifier = app(RecaptchaVerifier::class);
        if (! $verifier->isEnabled()) {
            return;
        }

        if (! $verifier->verify(is_string($value) ? $value : null, $this->ip)) {
            $fail(t('auth.recaptcha.required', 'Please confirm you are not a robot.'));
        }
    }
}
