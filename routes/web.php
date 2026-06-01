<?php

use App\Http\Controllers\App\AiGenerationController;
use App\Http\Controllers\App\CourseCertificateController;
use App\Http\Controllers\App\CourseController;
use App\Http\Controllers\App\CourseQuizController;
use App\Http\Controllers\App\DashboardController;
use App\Http\Controllers\App\LessonController;
use App\Http\Controllers\App\LibraryController;
use App\Http\Controllers\App\QuickLearnController;
use App\Http\Controllers\App\QuizController;
use App\Http\Controllers\App\SearchController;
use App\Http\Controllers\App\SubscriptionController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicContactController;
use App\Http\Controllers\PublicHomeController;
use App\Http\Controllers\PublicPageController;
use App\Http\Controllers\PublicPricingController;
use App\Http\Controllers\PublicSupportController;
use App\Http\Controllers\UserThemeController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PublicHomeController::class, 'index'])->name('home');

Route::get('/pricing', [PublicPricingController::class, 'index'])->name('pricing');

// Help & Support — gated by Admin → Settings → General → Site
Route::get('/support', PublicSupportController::class)->name('support');

// Contact — gated by Admin → Settings → General → Contact.
// POST is throttled per IP to slow basic spam attempts.
Route::get('/contact', [PublicContactController::class, 'show'])->name('contact');
Route::post('/contact', [PublicContactController::class, 'submit'])
    ->middleware('throttle:5,60')
    ->name('contact.submit');

// Public, admin-managed pages (Terms, Privacy, …). Slug pattern keeps the
// route from greedily matching reserved app paths.
Route::get('/pages/{slug}', [PublicPageController::class, 'show'])
    ->where('slug', '[a-z0-9-]+')
    ->name('pages.show');

// Public locale switcher — anyone can change their session language
Route::post('/locale', [LocaleController::class, 'switch'])->name('locale.switch');

// Per-user app theme switcher. Mirrors the locale switcher in shape:
// authenticated only, gated by the admin-managed user-selection toggle,
// validated against the enabled themes catalogue.
Route::post('/theme/switch', [UserThemeController::class, 'switch'])
    ->middleware('auth')
    ->name('theme.switch');

// Redirect alias for Laravel's built-in middleware compatibility
Route::get('/dashboard', fn () => redirect()->route('app.dashboard'))
    ->middleware(['auth'])
    ->name('dashboard');

// Authenticated app routes
Route::middleware(['auth', 'verified'])->prefix('app')->name('app.')->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // Courses
    Route::get('/courses/create', [CourseController::class, 'create'])->name('courses.create');
    Route::post('/courses/generate-outline', [CourseController::class, 'generateOutline'])
        ->middleware('subscription.active')->name('courses.generate-outline');
    Route::post('/courses', [CourseController::class, 'store'])
        ->middleware('subscription.active')->name('courses.store');
    Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');
    Route::delete('/courses/{course}', [CourseController::class, 'destroy'])->name('courses.destroy');

    // Lessons
    Route::get('/lessons/{lesson}', [LessonController::class, 'show'])->name('lessons.show');
    Route::post('/lessons/{lesson}/generate', [LessonController::class, 'generate'])
        ->middleware('subscription.active')->name('lessons.generate');
    Route::post('/lessons/{lesson}/complete', [LessonController::class, 'complete'])->name('lessons.complete');
    Route::post('/lessons/{lesson}/regenerate', [LessonController::class, 'regenerate'])
        ->middleware('subscription.active')->name('lessons.regenerate');

    // Module-end quizzes (generated via the existing quiz pipeline)
    Route::post('/modules/{module}/quiz', [CourseQuizController::class, 'generate'])
        ->middleware('subscription.active')->name('modules.quiz.generate');

    // Quick Learns
    Route::get('/quick-learns/create', [QuickLearnController::class, 'create'])->name('quick-learns.create');
    Route::post('/quick-learns/generate', [QuickLearnController::class, 'generate'])
        ->middleware('subscription.active')->name('quick-learns.generate');
    Route::get('/quick-learns/{quickLearn}', [QuickLearnController::class, 'show'])->name('quick-learns.show');
    Route::delete('/quick-learns/{quickLearn}', [QuickLearnController::class, 'destroy'])->name('quick-learns.destroy');

    // Quizzes
    Route::get('/quizzes/create', [QuizController::class, 'create'])->name('quizzes.create');
    Route::post('/quizzes/generate', [QuizController::class, 'generate'])
        ->middleware('subscription.active')->name('quizzes.generate');
    Route::get('/quizzes/{quiz}', [QuizController::class, 'show'])->name('quizzes.show');
    Route::post('/quizzes/{quiz}/attempts', [QuizController::class, 'storeAttempt'])->name('quizzes.attempts.store');
    Route::get('/quizzes/{quiz}/attempts/{attempt}', [QuizController::class, 'showAttempt'])->name('quizzes.attempts.show');
    Route::delete('/quizzes/{quiz}', [QuizController::class, 'destroy'])->name('quizzes.destroy');

    // Library
    Route::get('/library', LibraryController::class)->name('library');
    Route::get('/library/items', [LibraryController::class, 'items'])->name('library.items');

    // Live search powering the header search input.
    Route::get('/search', SearchController::class)->name('search');

    // Polling endpoint for queued AI generations. The wizards hit
    // this when the admin has flipped on the "Process AI requests
    // via queue" toggle and the controller returned `queued: true`.
    Route::get('/ai-generations/{generation}/status', [AiGenerationController::class, 'status'])
        ->name('ai-generations.status');

    // Course Certificates. Guarded by `certificates.enabled` so the
    // feature is fully hidden when the admin has flipped the global
    // toggle off, and gated per-plan when the toggle is on.
    Route::middleware('certificates.enabled')->group(function () {
        Route::get('/certificates', [CourseCertificateController::class, 'index'])->name('course-certificates.index');
        Route::get('/certificates/{certificate}', [CourseCertificateController::class, 'show'])->name('course-certificates.show');
        Route::post('/courses/{course}/certificate/issue', [CourseCertificateController::class, 'issue'])->name('course-certificates.issue');
    });

    // Subscription
    Route::get('/subscription', [SubscriptionController::class, 'index'])->name('subscription');
    Route::get('/subscription/billing-portal', [SubscriptionController::class, 'billingPortal'])
        ->name('subscription.billing-portal');
    Route::get('/subscription/checkout/{plan}/{cycle}', [SubscriptionController::class, 'checkout'])
        ->whereIn('cycle', ['monthly', 'yearly'])
        ->name('subscription.checkout');
    Route::get('/subscription/credits/checkout/{package}', [SubscriptionController::class, 'creditCheckout'])
        ->name('subscription.credits.checkout');
    Route::post('/subscription/swap/{plan}/{cycle}', [SubscriptionController::class, 'swap'])
        ->whereIn('cycle', ['monthly', 'yearly'])
        ->name('subscription.swap');
});

// Profile
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Code-based email change. Verify is throttled at 5/min to slow
    // down brute force; resend is rate-limited inside the service.
    Route::post('/profile/email-change/verify', [ProfileController::class, 'verifyEmailChange'])
        ->middleware('throttle:5,1')
        ->name('profile.email-change.verify');
    Route::post('/profile/email-change/resend', [ProfileController::class, 'resendEmailChange'])
        ->middleware('throttle:5,1')
        ->name('profile.email-change.resend');
    Route::delete('/profile/email-change', [ProfileController::class, 'cancelEmailChange'])
        ->name('profile.email-change.cancel');
});

require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
