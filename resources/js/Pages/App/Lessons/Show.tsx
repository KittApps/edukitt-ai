import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import LessonTopBar from '@/Components/LessonView/LessonTopBar';
import LessonContent, { Section } from '@/Components/LessonView/LessonContent';
import LessonNavigator, { NavLevel } from '@/Components/LessonView/LessonNavigator';
import RegenerateModal from '@/Components/LessonView/RegenerateModal';
import LessonGenerationOverlay from '@/Components/Shared/LessonGenerationOverlay';
import { useT } from '@/lib/i18n';
import { useLessonNavigation } from '@/lib/lessonNavigation';

interface Lesson {
    id: number;
    title: string;
    content: Section[] | null;
    is_generated: boolean;
    completed_at: string | null;
    estimated_duration: string | null;
    module: {
        id: number;
        title: string;
        course: {
            id: number;
            title: string;
            modules: {
                id: number;
                title: string;
                lessons: {
                    id: number;
                    title: string;
                    is_generated: boolean;
                    completed_at: string | null;
                }[];
            }[];
        };
    };
}

interface Props {
    lesson: Lesson;
    course: {
        id: number;
        title: string;
        modules: {
            id: number;
            title: string;
            lessons: {
                id: number;
                title: string;
                is_generated: boolean;
                completed_at: string | null;
            }[];
        }[];
    };
}

export default function Show({ lesson, course }: Props) {
    const t = useT();
    const sections = lesson.content ?? [];
    const { generating, openLesson, cancel } = useLessonNavigation();

    const { allLessons, currentIndex, prevLesson, nextLesson } = useMemo(() => {
        const flat = course.modules.flatMap((m) =>
            m.lessons.map((l) => ({ moduleId: m.id, lesson: l })),
        );
        const idx = flat.findIndex((x) => x.lesson.id === lesson.id);
        return {
            allLessons: flat,
            currentIndex: idx,
            prevLesson: idx > 0 ? flat[idx - 1].lesson : null,
            nextLesson: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1].lesson : null,
        };
    }, [course, lesson.id]);

    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [navLevel, setNavLevel] = useState<NavLevel>('sections');
    const [showRegenerate, setShowRegenerate] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleRegenerate = (instructions: string) => {
        setShowRegenerate(false);
        router.post(
            `/app/lessons/${lesson.id}/regenerate`,
            { instructions },
            {
                preserveScroll: true,
                preserveState: false,
                onStart: () => setIsRegenerating(true),
                onFinish: () => setIsRegenerating(false),
            },
        );
    };

    const showGeneratingOverlay =
        isRegenerating || !lesson.is_generated || sections.length === 0;

    return (
        <AppLayout>
            <Head title={lesson.title} />
            <div className="space-y-4">
                <LessonTopBar
                    courseId={course.id}
                    lessonId={lesson.id}
                    moduleTitle={lesson.module.title}
                    lessonTitle={lesson.title}
                    lessonDuration={lesson.estimated_duration}
                    lessonIndex={currentIndex >= 0 ? currentIndex : 0}
                    totalLessons={allLessons.length}
                    completedTopics={sections.length > 0 ? currentSectionIndex + 1 : 0}
                    totalTopics={sections.length}
                    prevLesson={prevLesson}
                    nextLesson={nextLesson}
                    onLessonNavigate={openLesson}
                    isCompleted={lesson.completed_at !== null}
                    isRegenerating={isRegenerating}
                    onRegenerate={() => setShowRegenerate(true)}
                />

                <div
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4"
                    style={{ height: 'calc(100vh - 200px)' }}
                >
                    <div className="lg:col-span-8 xl:col-span-9 overflow-y-auto no-scrollbar pr-1">
                        {showGeneratingOverlay ? (
                            <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center">
                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                                <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
                                    {isRegenerating
                                        ? t(
                                              'lessons.show.regenerating.title',
                                              'Regenerating Content...',
                                          )
                                        : t(
                                              'lessons.show.generating.title',
                                              'Generating Content...',
                                          )}
                                </h3>
                                <p className="text-sm text-on-surface-variant">
                                    {isRegenerating
                                        ? t(
                                              'lessons.show.regenerating.description',
                                              'Applying your feedback to rebuild this lesson. This may take a moment.',
                                          )
                                        : t(
                                              'lessons.show.generating.description',
                                              'AI is creating your lesson content. This may take a moment.',
                                          )}
                                </p>
                            </div>
                        ) : (
                            <LessonContent
                                sections={sections}
                                currentSectionIndex={currentSectionIndex}
                                onSectionVisible={setCurrentSectionIndex}
                            />
                        )}
                    </div>

                    <div className="lg:col-span-4 xl:col-span-3 hidden lg:block h-full">
                        <LessonNavigator
                            course={course}
                            currentModuleId={lesson.module.id}
                            currentLessonId={lesson.id}
                            currentSectionIndex={currentSectionIndex}
                            sections={sections.map((s) => ({ title: s.title, type: s.type }))}
                            navLevel={navLevel}
                            onNavLevelChange={setNavLevel}
                            onSectionSelect={(i) => {
                                setCurrentSectionIndex(i);
                            }}
                            onLessonNavigate={openLesson}
                        />
                    </div>
                </div>
            </div>

            <RegenerateModal
                isOpen={showRegenerate}
                onClose={() => setShowRegenerate(false)}
                onRegenerate={handleRegenerate}
            />

            <LessonGenerationOverlay
                open={generating !== null}
                lessonTitle={generating?.title ?? ''}
                onClose={cancel}
            />
        </AppLayout>
    );
}
