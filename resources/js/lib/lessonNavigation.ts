import { router } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import { AiGenerationFailedError, submitAiGeneration } from '@/lib/aiGeneration';

export interface NavigableLesson {
    id: number;
    title: string;
    is_generated: boolean;
}

/**
 * Shared "open a lesson" flow used by every in-app link that opens
 * a lesson (Course view, Lesson top bar prev/next, side navigator, …).
 *
 * Already-generated lessons short-circuit to a plain Inertia visit —
 * no overlay, no extra request, identical to a normal link.
 *
 * Ungenerated lessons go through `/app/lessons/{id}/generate` via
 * `submitAiGeneration` so the queue toggle is transparent: the
 * overlay stays open whether the worker took 200 ms or 30 s, and we
 * navigate as soon as the row reports back.
 *
 * The overlay belongs to whichever page mounted the hook — once
 * `router.visit()` lands on the new page, that page unmounts and
 * the overlay vanishes with it. No global state needed.
 */
export function useLessonNavigation() {
    const [generating, setGenerating] = useState<NavigableLesson | null>(null);
    // Bump on every cancel so any in-flight openLesson() ignores its
    // own resolution. We can't actually abort the network polling
    // mid-flight, but we can stop honouring the redirect once the
    // user has dismissed the overlay.
    const cancelRef = useRef(0);

    const cancel = useCallback(() => {
        cancelRef.current += 1;
        setGenerating(null);
    }, []);

    const openLesson = useCallback(async (lesson: NavigableLesson) => {
        if (lesson.is_generated) {
            router.visit(`/app/lessons/${lesson.id}`);
            return;
        }

        const token = ++cancelRef.current;
        setGenerating(lesson);

        try {
            const result = await submitAiGeneration<{ redirect?: string }>(
                `/app/lessons/${lesson.id}/generate`,
                {},
            );

            if (cancelRef.current !== token) {
                return;
            }

            if (typeof result.redirect === 'string' && result.redirect.length > 0) {
                router.visit(result.redirect);
                return;
            }

            setGenerating(null);
        } catch (err) {
            if (cancelRef.current !== token) {
                return;
            }
            if (!(err instanceof AiGenerationFailedError)) {
                console.error('Lesson generation failed', err);
            }
            setGenerating(null);
        }
    }, []);

    return { generating, openLesson, cancel };
}
