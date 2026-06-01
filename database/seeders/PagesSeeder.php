<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Seeder;

class PagesSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            [
                'slug' => 'terms',
                'title' => 'Terms of Service',
                'meta_description' => 'The terms and conditions that govern your use of the platform.',
                'content' => $this->termsContent(),
            ],
            [
                'slug' => 'privacy',
                'title' => 'Privacy Policy',
                'meta_description' => 'How we collect, use, and protect your personal information.',
                'content' => $this->privacyContent(),
            ],
        ];

        foreach ($pages as $page) {
            Page::updateOrCreate(
                ['slug' => $page['slug']],
                array_merge($page, [
                    'is_published' => true,
                    'is_system' => true,
                ]),
            );
        }
    }

    private function termsContent(): string
    {
        return <<<'HTML'
<h2>Welcome</h2>
<p>These terms describe the rules for using the platform. By accessing or using the service, you agree to be bound by them.</p>

<h2>Your account</h2>
<p>You are responsible for keeping your account credentials secure and for any activity that happens under your account.</p>

<h2>Acceptable use</h2>
<ul>
    <li>Do not attempt to abuse, disrupt, or reverse-engineer the service.</li>
    <li>Do not upload content you do not have the right to use.</li>
    <li>Respect other users and our team.</li>
</ul>

<h2>Changes to these terms</h2>
<p>We may update these terms from time to time. We will notify you of material changes before they take effect.</p>
HTML;
    }

    private function privacyContent(): string
    {
        return <<<'HTML'
<h2>Overview</h2>
<p>This policy explains what data we collect, how we use it, and the choices you have.</p>

<h2>Data we collect</h2>
<ul>
    <li>Account information (name, email).</li>
    <li>Usage data needed to operate and improve the service.</li>
    <li>Optional content you upload while using the service.</li>
</ul>

<h2>How we use data</h2>
<p>We use your data to provide the service, communicate important updates, and improve product quality.</p>

<h2>Your choices</h2>
<p>You may update your profile, request deletion of your account, or contact us with any privacy concerns.</p>
HTML;
    }
}
