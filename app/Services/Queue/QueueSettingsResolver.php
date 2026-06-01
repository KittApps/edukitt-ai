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

namespace App\Services\Queue;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Push admin-managed queue settings from the `settings` table into the
 * runtime `queue.*` and `database.redis.*` config so jobs and Horizon
 * pick them up without restarting the app.
 *
 * Mirrors MailSettingsResolver / StripeSettingsResolver: DB values
 * override the env / config-file fallbacks at boot time, and a single
 * helper (`isEmailQueueEnabled`) tells callers whether transactional
 * mail should go through the queue or be sent synchronously.
 */
class QueueSettingsResolver
{
    public const SETTINGS_GROUP = 'queue';

    public const KEY_ENABLED = 'enabled';

    public const KEY_EMAIL_SENDING_ENABLED = 'jobs.email_sending.enabled';

    public const KEY_AI_GENERATION_ENABLED = 'jobs.ai_generation.enabled';

    public const KEY_REDIS_HOST = 'redis.host';

    public const KEY_REDIS_PORT = 'redis.port';

    public const KEY_REDIS_PASSWORD = 'redis.password';

    public const KEY_REDIS_DATABASE = 'redis.database';

    public const DRIVER_DATABASE = 'database';

    public const DRIVER_REDIS = 'redis';

    public const EMAIL_QUEUE_NAME = 'emails';

    public const AI_QUEUE_NAME = 'ai';

    /**
     * Sentinel returned to the UI in place of the real Redis password
     * so the stored secret never round-trips to the browser.
     */
    public const STORED_PASSWORD_MASK = '••••••••';

    /**
     * Apply DB-stored queue settings to the runtime config.
     *
     * Safe to call during boot — silently skips if the settings table
     * is not available yet (early install / migrate phase).
     *
     * Note: this method NEVER overrides `config('queue.default')`. The
     * active driver is whatever the framework resolves from
     * `config/queue.php` (i.e. the `QUEUE_CONNECTION` env var). The
     * admin UI only exposes "queue on/off" and Redis connection
     * details — it does not pick the driver.
     */
    public function applyToConfig(): void
    {
        if ($this->driver() !== self::DRIVER_REDIS) {
            return;
        }

        try {
            $host = Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_HOST);
            $port = Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_PORT);
            $password = Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_PASSWORD);
            $database = Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_DATABASE);
        } catch (Throwable) {
            return;
        }

        if (! empty($host)) {
            Config::set('database.redis.default.host', $host);
        }
        if ($port !== null && $port !== '') {
            Config::set('database.redis.default.port', (int) $port);
        }
        if (! empty($password)) {
            // Laravel treats null/empty as "no auth"; the literal "null"
            // string from .env is normalised here too.
            Config::set('database.redis.default.password', $password);
        }
        if ($database !== null && $database !== '') {
            Config::set('database.redis.default.database', (int) $database);
        }
    }

    /**
     * Are queues enabled at all? When false every caller falls back
     * to synchronous execution (Mail::send, notify*, etc.).
     */
    public function enabled(): bool
    {
        try {
            return (bool) (Setting::get(self::SETTINGS_GROUP, self::KEY_ENABLED) ?? false);
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * The currently active queue driver, as resolved by the framework
     * from `config/queue.php` (which itself reads `QUEUE_CONNECTION`).
     *
     * This is intentionally not admin-configurable — operators pick the
     * driver via .env / config so deployments are environment-aware
     * (e.g. database locally, redis in production).
     */
    public function driver(): string
    {
        $value = Config::get('queue.default');
        $value = is_string($value) ? strtolower($value) : null;

        return $value !== null && $value !== '' ? $value : self::DRIVER_DATABASE;
    }

    /**
     * Single source of truth used by the mail dispatcher + the framework
     * notification overrides. Email sending only goes through the queue
     * when BOTH the master switch and the per-job toggle are on.
     */
    public function isEmailQueueEnabled(): bool
    {
        if (! $this->enabled()) {
            return false;
        }

        try {
            return (bool) (Setting::get(self::SETTINGS_GROUP, self::KEY_EMAIL_SENDING_ENABLED) ?? false);
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Name of the connection that queued mail should target. Tracks the
     * framework-resolved `config('queue.default')` so emails always land
     * on the supervisor for whichever driver is currently active.
     */
    public function resolvedConnection(): string
    {
        return $this->driver();
    }

    /**
     * Dedicated queue name for transactional emails. Matched by the
     * `supervisor-emails` block in config/horizon.php so Horizon
     * processes mail jobs on their own worker pool.
     */
    public function emailQueueName(): string
    {
        return self::EMAIL_QUEUE_NAME;
    }

    /**
     * Single source of truth for "should AI generation run on a worker?".
     *
     * Mirrors the email helper: both the master queue switch and the
     * per-feature toggle must be on. When false, the AI dispatcher
     * (see App\Services\Ai\AiGenerationDispatcher) executes the
     * generation in the current request — exactly as the app behaved
     * before this feature was added.
     */
    public function isAiGenerationQueueEnabled(): bool
    {
        if (! $this->enabled()) {
            return false;
        }

        try {
            return (bool) (Setting::get(self::SETTINGS_GROUP, self::KEY_AI_GENERATION_ENABLED) ?? false);
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Dedicated queue name for AI generation jobs. Long-running, can be
     * slow; isolating it on its own queue keeps short jobs (emails,
     * notifications) responsive even when an LLM call is hanging on a
     * timeout. Horizon picks this up via the `supervisor-ai` block in
     * config/horizon.php.
     */
    public function aiQueueName(): string
    {
        return self::AI_QUEUE_NAME;
    }

    /**
     * Snapshot of the stored values for the admin UI. Password is
     * normalised to a boolean flag so the secret never reaches the
     * browser.
     *
     * @return array{
     *     enabled: bool,
     *     driver: string,
     *     jobs: array{email_sending: bool, ai_generation: bool},
     *     redis: array{host: ?string, port: ?int, password_set: bool, database: ?int},
     *     database_ready: bool,
     * }
     */
    public function snapshot(): array
    {
        return [
            'enabled' => $this->enabled(),
            'driver' => $this->driver(),
            'jobs' => [
                'email_sending' => $this->isEmailQueueEnabled(),
                'ai_generation' => $this->isAiGenerationQueueEnabled(),
            ],
            'redis' => [
                'host' => self::nullableString(
                    Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_HOST) ?? env('REDIS_HOST'),
                ),
                'port' => self::nullableInt(
                    Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_PORT) ?? env('REDIS_PORT'),
                ),
                'password_set' => ! empty(Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_PASSWORD)),
                'database' => self::nullableInt(
                    Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_DATABASE) ?? env('REDIS_DB', 0),
                ),
            ],
            'database_ready' => $this->isDatabaseQueueReady(),
        ];
    }

    /**
     * Cheap probe so the General tab can surface "jobs table ready ✓".
     * Returns false during install / migrate before the table exists.
     */
    public function isDatabaseQueueReady(): bool
    {
        try {
            return Schema::hasTable('jobs');
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Ping the configured Redis instance with PHP's redis client.
     *
     * Applies the admin-overridden host/port/password/db before issuing
     * the ping so the operator can validate a new connection before
     * saving. Returns a structured result the controller can pass back
     * to the UI without leaking exception details.
     *
     * @param  array{host?: ?string, port?: ?int, password?: ?string, database?: ?int}  $overrides
     * @return array{ok: bool, message: string, latency_ms: ?int}
     */
    public function testRedisConnection(array $overrides = []): array
    {
        $host = $overrides['host'] ?? Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_HOST) ?? env('REDIS_HOST', '127.0.0.1');
        $port = (int) ($overrides['port'] ?? Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_PORT) ?? env('REDIS_PORT', 6379));
        $password = $overrides['password'] ?? Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_PASSWORD) ?? env('REDIS_PASSWORD');
        $database = (int) ($overrides['database'] ?? Setting::get(self::SETTINGS_GROUP, self::KEY_REDIS_DATABASE) ?? env('REDIS_DB', 0));

        // Build an ephemeral connection so the live runtime config is
        // never mutated by a one-off "Test connection" click.
        $connectionName = 'queue_settings_probe';
        Config::set("database.redis.{$connectionName}", [
            'host' => $host,
            'port' => $port,
            'username' => null,
            'password' => $password !== null && $password !== '' && $password !== 'null' ? $password : null,
            'database' => $database,
            'read_write_timeout' => 2,
            'timeout' => 2,
        ]);

        $start = microtime(true);

        try {
            $client = Redis::connection($connectionName);
            $client->ping();
            $latency = (int) round((microtime(true) - $start) * 1000);

            return [
                'ok' => true,
                'message' => "Connected to {$host}:{$port} (db {$database}).",
                'latency_ms' => $latency,
            ];
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'message' => mb_substr($e->getMessage(), 0, 500),
                'latency_ms' => null,
            ];
        } finally {
            // Purge the throwaway connection so subsequent ::connection()
            // calls don't reuse this probe's socket.
            try {
                Redis::purge($connectionName);
            } catch (Throwable) {
                // ignore
            }
        }
    }

    /**
     * Convenience used by the database-queue status indicator: returns
     * true when the `jobs` table exists AND we can run a trivial SELECT
     * against it (catches missing-DB / permission issues early).
     */
    public function isDatabaseQueueHealthy(): bool
    {
        if (! $this->isDatabaseQueueReady()) {
            return false;
        }
        try {
            DB::table('jobs')->limit(1)->count();

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private static function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $str = (string) $value;

        return $str === '' || $str === 'null' ? null : $str;
    }

    private static function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }
}
