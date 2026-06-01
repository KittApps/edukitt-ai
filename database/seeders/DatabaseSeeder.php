<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Top-level seeder run by `php artisan db:seed` (and by the install
 * wizard after `migrate`).
 *
 * Order matters:
 *   1. Catalogue + settings tables first (plans, packages, providers,
 *      options, faqs, pages, settings) — none of them reference users.
 *   2. Default users last, because the admin/test user are auto-assigned
 *      the default subscription plan which must exist by then.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // 1. Catalogue + configuration data — referenced by users below.
        $this->call([
            SubscriptionPlanSeeder::class,
            CreditPackageSeeder::class,
            AiProviderSeeder::class,
            PersonalizeOptionSeeder::class,
            FaqSeeder::class,
            PagesSeeder::class,
            SettingsSeeder::class,
        ]);

        // 2. Default accounts.
        //
        // Admin: `admin@example.com` / `123456` — documented in the
        // install guide. Buyers MUST change the password on first login.
        // Test:  `test@example.com`  / `123456` — handy for QA but
        // should be deleted from the Admin → Users page before
        // exposing the install to real traffic.
        $subscriptions = app(SubscriptionService::class);

        $admin = User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('123456'),
                'is_admin' => true,
                'is_active' => true,
                'email_verified_at' => now(),
                'locale' => 'en',
                'theme' => 'default',
            ],
        );
        $subscriptions->assignDefaultPlan($admin);

        $test = User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('123456'),
                'is_admin' => false,
                'is_active' => true,
                'email_verified_at' => now(),
                'locale' => 'en',
                'theme' => 'default',
            ],
        );
        $subscriptions->assignDefaultPlan($test);
    }
}
