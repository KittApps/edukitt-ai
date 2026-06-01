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

use App\Models\Lesson;
use App\Models\User;

/**
 * Lessons have no direct `user_id` column — ownership is inherited from
 * the parent course (`lesson → module → course → user_id`). All three
 * abilities walk the chain identically; the public methods exist so
 * controllers can spell intent (view vs update vs delete) the same way
 * the sibling Course / Quiz / QuickLearn policies do.
 */
class LessonPolicy
{
    public function view(User $user, Lesson $lesson): bool
    {
        return $this->ownsLesson($user, $lesson);
    }

    public function update(User $user, Lesson $lesson): bool
    {
        return $this->ownsLesson($user, $lesson);
    }

    public function delete(User $user, Lesson $lesson): bool
    {
        return $this->ownsLesson($user, $lesson);
    }

    /**
     * Resolve the owning course's `user_id` without assuming the
     * relation chain was eager-loaded by the caller. `loadMissing`
     * is a no-op when the relations are already present, so repeated
     * authorize() calls inside a single request stay cheap.
     */
    protected function ownsLesson(User $user, Lesson $lesson): bool
    {
        $lesson->loadMissing('module.course');

        $ownerId = $lesson->module?->course?->user_id;

        return $ownerId !== null && $user->id === $ownerId;
    }
}
