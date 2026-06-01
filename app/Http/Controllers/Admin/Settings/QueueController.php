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
use App\Services\Queue\QueueSettingsResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin → Settings → Queue.
 *
 * Tabs:
 *   - General: master enable toggle + driver picker (database|redis).
 *   - Jobs:    per-feature toggles for which background jobs go through
 *              the queue (right now only "Email sending").
 *   - Redis:   connection details for the redis driver. Only visible
 *              when driver === 'redis'.
 *
 * All values are persisted via the existing key/value Setting store
 * under the `queue` group. QueueSettingsResolver picks them up at boot
 * and overrides the runtime queue + redis config.
 */
class QueueController extends Controller
{
    private const GROUP = QueueSettingsResolver::SETTINGS_GROUP;

    public function __construct(private readonly QueueSettingsResolver $resolver) {}

    public function index(): Response
    {
        $snap = $this->resolver->snapshot();

        return Inertia::render('Admin/Settings/Queue', [
            'general' => [
                'enabled' => $snap['enabled'],
                'driver' => $snap['driver'],
                'database_ready' => $snap['database_ready'],
            ],
            'jobs' => [
                'email_sending' => $snap['jobs']['email_sending'],
                'ai_generation' => $snap['jobs']['ai_generation'],
            ],
            'redis' => [
                'host' => $snap['redis']['host'],
                'port' => $snap['redis']['port'],
                'password_set' => $snap['redis']['password_set'],
                'database' => $snap['redis']['database'],
            ],
            'horizon' => [
                'path' => '/'.ltrim((string) config('horizon.path', 'horizon'), '/'),
            ],
        ]);
    }

    public function updateGeneral(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        Setting::set(self::GROUP, QueueSettingsResolver::KEY_ENABLED, (bool) $data['enabled']);

        $this->resolver->applyToConfig();

        return back()->with('success', 'Queue settings saved.');
    }

    public function updateJobs(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email_sending' => 'required|boolean',
            'ai_generation' => 'required|boolean',
        ]);

        Setting::set(
            self::GROUP,
            QueueSettingsResolver::KEY_EMAIL_SENDING_ENABLED,
            (bool) $data['email_sending'],
        );
        Setting::set(
            self::GROUP,
            QueueSettingsResolver::KEY_AI_GENERATION_ENABLED,
            (bool) $data['ai_generation'],
        );

        return back()->with('success', 'Job queue toggles saved.');
    }

    public function updateRedis(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'host' => 'nullable|string|max:255',
            'port' => 'nullable|integer|min:1|max:65535',
            'password' => 'nullable|string|max:255',
            'database' => 'nullable|integer|min:0|max:15',
            'clear_password' => 'nullable|boolean',
        ]);

        Setting::set(self::GROUP, QueueSettingsResolver::KEY_REDIS_HOST, $this->normalise($data['host'] ?? null));
        Setting::set(self::GROUP, QueueSettingsResolver::KEY_REDIS_PORT, $data['port'] ?? null);
        Setting::set(self::GROUP, QueueSettingsResolver::KEY_REDIS_DATABASE, $data['database'] ?? null);

        // Same secret-handling UX as the SMTP password field.
        if (! empty($data['clear_password'])) {
            Setting::set(self::GROUP, QueueSettingsResolver::KEY_REDIS_PASSWORD, null);
        } elseif (! empty($data['password'])) {
            Setting::set(self::GROUP, QueueSettingsResolver::KEY_REDIS_PASSWORD, $data['password']);
        }

        $this->resolver->applyToConfig();

        return back()->with('success', 'Redis settings saved.');
    }

    public function testRedis(Request $request): JsonResponse
    {
        $data = $request->validate([
            'host' => 'nullable|string|max:255',
            'port' => 'nullable|integer|min:1|max:65535',
            'password' => 'nullable|string|max:255',
            'database' => 'nullable|integer|min:0|max:15',
            'use_saved_password' => 'nullable|boolean',
        ]);

        // When the form sends an empty password and `use_saved_password`
        // is true, fall back to whatever is in the settings store so
        // operators don't have to retype the secret on every test.
        $passwordOverride = null;
        if (! empty($data['use_saved_password'])) {
            $passwordOverride = null;
        } elseif (array_key_exists('password', $data) && $data['password'] !== null) {
            $passwordOverride = $data['password'];
        }

        $result = $this->resolver->testRedisConnection([
            'host' => $this->normalise($data['host'] ?? null),
            'port' => $data['port'] ?? null,
            'password' => $passwordOverride,
            'database' => $data['database'] ?? null,
        ]);

        return response()->json($result);
    }

    /**
     * Same normalisation rule as MailSettingsResolver: trim and collapse
     * empty strings to null so the resolver can distinguish "explicitly
     * cleared" from "never configured".
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
