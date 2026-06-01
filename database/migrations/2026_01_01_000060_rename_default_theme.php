<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('themes')
            ->where('key', 'default')
            ->update([
                'name' => 'Default',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('themes')
            ->where('key', 'default')
            ->update([
                'name' => 'Default Purple',
                'updated_at' => now(),
            ]);
    }
};
