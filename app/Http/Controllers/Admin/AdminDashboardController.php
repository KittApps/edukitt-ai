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

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\DashboardAggregator;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function __construct(
        private readonly DashboardAggregator $aggregator,
    ) {}

    public function __invoke(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'summary' => $this->aggregator->summary(),
            'registrations' => $this->aggregator->userRegistrations(30),
            'recentUsers' => $this->aggregator->recentUsers(5),
            'recentTransactions' => $this->aggregator->recentTransactions(5),
        ]);
    }
}
