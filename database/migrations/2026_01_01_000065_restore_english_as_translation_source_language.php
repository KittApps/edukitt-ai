<?php

use App\Services\LocalizationService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Site default language is stored in settings (`general.site.default_language_code`).
 * `languages.is_default` only marks the translation source row — keep it on English.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('languages')) {
            return;
        }

        $enId = DB::table('languages')->where('code', 'en')->value('id');

        DB::table('languages')->update(['is_default' => false]);

        if ($enId !== null) {
            DB::table('languages')->where('id', $enId)->update([
                'is_default' => true,
                'is_active' => true,
            ]);
        } else {
            $firstId = DB::table('languages')->orderBy('id')->value('id');
            if ($firstId !== null) {
                DB::table('languages')->where('id', $firstId)->update(['is_default' => true]);
            }
        }

        try {
            app(LocalizationService::class)->forgetCache();
        } catch (\Throwable) {
            // Install / migrate edge cases — cache will rebuild on demand.
        }
    }
};
