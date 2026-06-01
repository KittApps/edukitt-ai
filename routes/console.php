<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily refresh of free-plan credit periods for users who have not
// logged in. Login also lazily renews, so this is the safety net.
Schedule::command('credits:renew-free-plans')
    ->dailyAt('02:30')
    ->withoutOverlapping();

// Reconcile local Stripe subscriptions in case any webhook was missed.
Schedule::command('subscriptions:reconcile')
    ->dailyAt('03:00')
    ->withoutOverlapping();
