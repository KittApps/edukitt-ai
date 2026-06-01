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
use App\Models\Setting;
use App\Services\Mail\MailSettingsResolver;
use App\Services\Settings\SecretSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Admin → Settings → Email.
 *
 * Two tabs:
 *   - SMTP: outbound server credentials (host, port, encryption,
 *     username, password, from address & name).
 *   - Test Email: send a one-off test message via the saved settings
 *     to verify deliverability without restarting the app.
 *
 * All values are persisted via the existing key/value Setting store
 * under the `email` group. MailSettingsResolver picks them up at boot
 * (and again right before sending the test) and overrides the
 * runtime mail config.
 */
class EmailController extends Controller
{
    private const GROUP = MailSettingsResolver::SETTINGS_GROUP;

    public function __construct(private readonly MailSettingsResolver $resolver) {}

    public function index(): Response
    {
        $snap = $this->resolver->snapshot();

        return Inertia::render('Admin/Settings/Email', [
            'smtp' => [
                'host' => $snap['host'],
                'port' => $snap['port'],
                'encryption' => $snap['encryption'],
                'username' => $snap['username'],
                'password_set' => $snap['password_set'],
                'from_address' => $snap['from_address'],
                'from_name' => $snap['from_name'],
            ],
            'status' => [
                'configured' => $this->resolver->isConfigured(),
            ],
        ]);
    }

    public function updateSmtp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'host' => 'nullable|string|max:255',
            'port' => 'nullable|integer|min:1|max:65535',
            'encryption' => 'nullable|in:tls,ssl',
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:255',
            'from_address' => 'nullable|email|max:255',
            'from_name' => 'nullable|string|max:255',
            'clear_password' => 'nullable|boolean',
        ]);

        Setting::set(self::GROUP, MailSettingsResolver::KEY_HOST, $this->normalise($data['host'] ?? null));
        Setting::set(self::GROUP, MailSettingsResolver::KEY_PORT, $data['port'] ?? null);
        Setting::set(self::GROUP, MailSettingsResolver::KEY_ENCRYPTION, $this->normalise($data['encryption'] ?? null));
        Setting::set(self::GROUP, MailSettingsResolver::KEY_USERNAME, $this->normalise($data['username'] ?? null));
        Setting::set(self::GROUP, MailSettingsResolver::KEY_FROM_ADDRESS, $this->normalise($data['from_address'] ?? null));
        Setting::set(self::GROUP, MailSettingsResolver::KEY_FROM_NAME, $this->normalise($data['from_name'] ?? null));

        // Password handling:
        //   - explicit `clear_password` → wipe the stored value.
        //   - non-empty `password`      → overwrite with the new one
        //     (persisted encrypted via SecretSetting).
        //   - empty `password` and no clear flag → leave the stored
        //     value untouched (preserves the masked placeholder UX).
        if (! empty($data['clear_password'])) {
            SecretSetting::set(self::GROUP, MailSettingsResolver::KEY_PASSWORD, null);
        } elseif (! empty($data['password'])) {
            SecretSetting::set(self::GROUP, MailSettingsResolver::KEY_PASSWORD, $data['password']);
        }

        $this->resolver->applyToConfig();

        return back()->with('success', 'SMTP settings saved.');
    }

    public function sendTest(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'to_address' => 'required|email',
        ]);

        // Make sure we use the latest DB-stored settings without
        // relying on what was applied at boot.
        $this->resolver->applyToConfig();

        try {
            Mail::raw(
                "This is a test message sent from the EduKitt admin panel.\n\n"
                .'If you received this, your SMTP configuration is working correctly.',
                function ($message) use ($data) {
                    $message->to($data['to_address'])
                        ->subject('EduKitt test email');
                }
            );
        } catch (Throwable $e) {
            Log::error('Admin SMTP test email failed', [
                'to' => $data['to_address'],
                'exception' => $e,
            ]);

            $reason = mb_substr($e->getMessage(), 0, 500);

            return back()->with('error', 'Test email failed: '.$reason);
        }

        return back()->with('success', 'Test email sent to '.$data['to_address'].'.');
    }

    /**
     * Normalise a free-text input: trim, then collapse empty strings
     * to null so the resolver can distinguish "explicitly cleared"
     * from "never configured".
     */
    private function normalise(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
