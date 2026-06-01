<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * App-side theme catalogue refresh — replaces "Midnight Blue" with
 * three reading-friendly palettes geared toward an education platform:
 *
 *   - Sepia      — warm cream paper, Kindle/long-read style
 *   - Slate      — cool light gray, calm study-desk
 *   - Solarized  — Solarized Light precision palette
 *
 * Side effects:
 *   - Any user whose preference was "theme-midnight-blue" is reset to
 *     null so the resolver falls back to the admin default.
 *   - If the admin default itself was "theme-midnight-blue", it is
 *     reset to "default" (the original purple) — never leave the app
 *     pointed at a theme that no longer exists.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        // Reset any users still pointing at the removed theme.
        if (DB::getSchemaBuilder()->hasColumn('users', 'theme')) {
            DB::table('users')
                ->where('theme', 'theme-midnight-blue')
                ->update(['theme' => null]);
        }

        // If the admin had picked midnight-blue as the system default,
        // step it back to the original purple so we never end up with
        // a dangling default_key referencing a row we're about to drop.
        DB::table('settings')
            ->where('group', 'theme')
            ->where('key', 'default_key')
            ->where('value', json_encode('theme-midnight-blue'))
            ->update([
                'value' => json_encode('default'),
                'updated_at' => $now,
            ]);

        // Drop the removed theme.
        DB::table('themes')->where('key', 'theme-midnight-blue')->delete();

        // Insert the three new reading-friendly themes. `insertOrIgnore`
        // keeps this migration idempotent if it ever gets re-run.
        DB::table('themes')->insertOrIgnore([
            [
                'key' => 'theme-sepia',
                'name' => 'Sepia',
                'description' => 'Warm cream paper — Kindle-style long-read mode.',
                'enabled' => true,
                'is_dark' => false,
                'position' => 5,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'theme-slate',
                'name' => 'Slate',
                'description' => 'Cool light gray — calm study-desk feel.',
                'enabled' => true,
                'is_dark' => false,
                'position' => 6,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'theme-solarized',
                'name' => 'Solarized',
                'description' => 'Solarized Light — eye-friendly precision palette.',
                'enabled' => true,
                'is_dark' => false,
                'position' => 7,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        $now = now();

        DB::table('themes')
            ->whereIn('key', ['theme-sepia', 'theme-slate', 'theme-solarized'])
            ->delete();

        DB::table('themes')->insertOrIgnore([
            [
                'key' => 'theme-midnight-blue',
                'name' => 'Midnight Blue',
                'description' => 'Deep indigo, near-black surfaces.',
                'enabled' => true,
                'is_dark' => true,
                'position' => 5,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
};
