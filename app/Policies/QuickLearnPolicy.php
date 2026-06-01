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

namespace App\Policies;

use App\Models\QuickLearn;
use App\Models\User;

class QuickLearnPolicy
{
    public function view(User $user, QuickLearn $quickLearn): bool
    {
        return $user->id === $quickLearn->user_id;
    }

    public function delete(User $user, QuickLearn $quickLearn): bool
    {
        return $user->id === $quickLearn->user_id;
    }
}
