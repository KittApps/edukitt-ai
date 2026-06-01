<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * App-side themes catalogue.
 *
 * Each row represents a CSS theme defined in resources/css/app.css.
 * The `key` column doubles as the CSS class name applied to the layout
 * root (with the special key `default` meaning "no class — use the
 * @theme block as-is, i.e. the original purple theme").
 *
 * Admins manage these rows via Admin → Settings → General → Theme:
 *   - per-theme enable / disable
 *   - choose the system default
 *   - allow / disallow end users to pick their own
 *
 * The two non-list pieces of state (default key + user-selection toggle)
 * live in the `settings` table under the `theme` group, since they are
 * single scalars rather than per-theme metadata.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('themes', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('enabled')->default(true);
            $table->boolean('is_dark')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        $now = now();
        $rows = [
            [
                'key' => 'default',
                'name' => 'Default',
                'description' => 'Soft violet — the original look.',
                'is_dark' => false,
                'position' => 0,
            ],
            [
                'key' => 'theme-dark',
                'name' => 'Dark',
                'description' => 'Deep slate background, light text, purple accent.',
                'is_dark' => true,
                'position' => 1,
            ],
            [
                'key' => 'theme-ocean',
                'name' => 'Ocean',
                'description' => 'Teal / cyan, cool light surfaces.',
                'is_dark' => false,
                'position' => 2,
            ],
            [
                'key' => 'theme-forest',
                'name' => 'Forest',
                'description' => 'Emerald green, warm-neutral surfaces.',
                'is_dark' => false,
                'position' => 3,
            ],
            [
                'key' => 'theme-sunset',
                'name' => 'Sunset',
                'description' => 'Orange / rose, warm cream surfaces.',
                'is_dark' => false,
                'position' => 4,
            ],
            [
                'key' => 'theme-sepia',
                'name' => 'Sepia',
                'description' => 'Warm cream paper — Kindle-style long-read mode.',
                'is_dark' => false,
                'position' => 5,
            ],
            [
                'key' => 'theme-slate',
                'name' => 'Slate',
                'description' => 'Cool light gray — calm study-desk feel.',
                'is_dark' => false,
                'position' => 6,
            ],
            [
                'key' => 'theme-solarized',
                'name' => 'Solarized',
                'description' => 'Solarized Light — eye-friendly precision palette.',
                'is_dark' => false,
                'position' => 7,
            ],
            [
                'key' => 'theme-mint',
                'name' => 'Mint',
                'description' => 'Soft sage — calm, focused study tone.',
                'is_dark' => false,
                'position' => 8,
            ],
            [
                'key' => 'theme-nord',
                'name' => 'Nord',
                'description' => 'Nord Snow Storm — cool blue-gray, low eye-strain.',
                'is_dark' => false,
                'position' => 9,
            ],
        ];

        DB::table('themes')->insert(array_map(
            fn (array $row) => array_merge($row, [
                'enabled' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]),
            $rows,
        ));

        // Seed default settings under the `theme` group. User-selection
        // is OFF by default so the feature is opt-in for the admin.
        DB::table('settings')->insert([
            [
                'group' => 'theme',
                'key' => 'default_key',
                'value' => json_encode('default'),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'group' => 'theme',
                'key' => 'user_selection_enabled',
                'value' => json_encode(false),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('themes');

        DB::table('settings')->where('group', 'theme')->delete();
    }
};
