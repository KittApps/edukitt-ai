<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('themes')->insertOrIgnore([
            [
                'key' => 'theme-mint',
                'name' => 'Mint',
                'description' => 'Soft sage — calm, focused study tone.',
                'enabled' => true,
                'is_dark' => false,
                'position' => 8,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'theme-nord',
                'name' => 'Nord',
                'description' => 'Nord Snow Storm — cool blue-gray, low eye-strain.',
                'enabled' => true,
                'is_dark' => false,
                'position' => 9,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('themes')
            ->whereIn('key', ['theme-mint', 'theme-nord'])
            ->delete();
    }
};
