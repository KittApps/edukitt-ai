import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Circle,
    FileText,
    FolderOpen,
    Layers,
    Play,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { NavigableLesson } from '@/lib/lessonNavigation';

export type NavLevel = 'modules' | 'lessons' | 'sections';

export interface NavLesson {
    id: number;
    title: string;
    is_generated: boolean;
    completed_at: string | null;
}

export interface NavModule {
    id: number;
    title: string;
    lessons: NavLesson[];
}

export interface NavCourse {
    id: number;
    title: string;
    modules: NavModule[];
}

export interface NavSection {
    title: string;
    type: string;
}

interface Props {
    course: NavCourse;
    currentModuleId: number;
    currentLessonId: number;
    currentSectionIndex: number;
    sections: NavSection[];
    navLevel: NavLevel;
    onNavLevelChange: (level: NavLevel) => void;
    onSectionSelect: (index: number) => void;
    onLessonNavigate: (lesson: NavigableLesson) => void;
}

export default function LessonNavigator({
    course,
    currentModuleId,
    currentLessonId,
    currentSectionIndex,
    sections,
    navLevel,
    onNavLevelChange,
    onSectionSelect,
    onLessonNavigate,
}: Props) {
    const currentModule = course.modules.find((m) => m.id === currentModuleId);
    const currentLesson = currentModule?.lessons.find((l) => l.id === currentLessonId);

    return (
        <div className="h-full flex flex-col bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <NavBreadcrumb
                courseTitle={course.title}
                moduleTitle={currentModule?.title}
                lessonTitle={currentLesson?.title}
                navLevel={navLevel}
                onNavLevelChange={onNavLevelChange}
            />

            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                <AnimatePresence mode="wait">
                    {navLevel === 'modules' && (
                        <NavPanel key="modules">
                            <ModulesView
                                modules={course.modules}
                                currentModuleId={currentModuleId}
                                onModuleSelect={() => onNavLevelChange('lessons')}
                            />
                        </NavPanel>
                    )}
                    {navLevel === 'lessons' && currentModule && (
                        <NavPanel key="lessons">
                            <LessonsView
                                module={currentModule}
                                currentLessonId={currentLessonId}
                                onLessonNavigate={onLessonNavigate}
                            />
                        </NavPanel>
                    )}
                    {navLevel === 'sections' && currentLesson && (
                        <NavPanel key="sections">
                            <SectionsView
                                sections={sections}
                                currentSectionIndex={currentSectionIndex}
                                onSectionSelect={onSectionSelect}
                            />
                        </NavPanel>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function NavPanel({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
        >
            {children}
        </motion.div>
    );
}

function NavBreadcrumb({
    courseTitle,
    moduleTitle,
    lessonTitle,
    navLevel,
    onNavLevelChange,
}: {
    courseTitle: string;
    moduleTitle?: string;
    lessonTitle?: string;
    navLevel: NavLevel;
    onNavLevelChange: (level: NavLevel) => void;
}) {
    const t = useT();
    return (
        <div className="px-4 py-3 border-b border-surface-container bg-surface-container-low/30">
            <div className="flex items-center gap-1 text-[11px] font-medium flex-wrap">
                <button
                    onClick={() => onNavLevelChange('modules')}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                        navLevel === 'modules'
                            ? 'text-primary font-bold'
                            : 'text-on-surface-variant hover:text-primary'
                    }`}
                >
                    <FolderOpen size={11} />
                    <span className="max-w-[80px] truncate">{courseTitle}</span>
                </button>

                {(navLevel === 'lessons' || navLevel === 'sections') && moduleTitle && (
                    <>
                        <ChevronRight size={10} className="text-outline-variant" />
                        <button
                            onClick={() => onNavLevelChange('lessons')}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                                navLevel === 'lessons'
                                    ? 'text-primary font-bold'
                                    : 'text-on-surface-variant hover:text-primary'
                            }`}
                        >
                            <Layers size={11} />
                            <span className="max-w-[80px] truncate">{moduleTitle}</span>
                        </button>
                    </>
                )}

                {navLevel === 'sections' && lessonTitle && (
                    <>
                        <ChevronRight size={10} className="text-outline-variant" />
                        <span className="text-primary font-bold flex items-center gap-1 px-1.5 py-0.5">
                            <FileText size={11} />
                            <span className="max-w-[80px] truncate">{lessonTitle}</span>
                        </span>
                    </>
                )}
            </div>

            {navLevel !== 'modules' && (
                <button
                    onClick={() =>
                        onNavLevelChange(navLevel === 'sections' ? 'lessons' : 'modules')
                    }
                    className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant hover:text-primary mt-1.5 transition-colors uppercase tracking-wider"
                >
                    <ArrowLeft size={10} />
                    {t('common.back', 'Back')}
                </button>
            )}
        </div>
    );
}

function ModulesView({
    modules,
    currentModuleId,
    onModuleSelect,
}: {
    modules: NavModule[];
    currentModuleId: number;
    onModuleSelect: () => void;
}) {
    const t = useT();
    return (
        <div className="space-y-1">
            {modules.map((mod, i) => {
                const completedCount = mod.lessons.filter((l) => l.completed_at !== null).length;
                const allDone = completedCount === mod.lessons.length && mod.lessons.length > 0;
                const isCurrent = mod.id === currentModuleId;

                return (
                    <button
                        key={mod.id}
                        onClick={() => {
                            if (isCurrent) {
                                onModuleSelect();
                            }
                        }}
                        disabled={!isCurrent}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group ${
                            isCurrent
                                ? 'bg-primary/10 border border-primary/15 cursor-pointer'
                                : 'hover:bg-surface-container-low cursor-default opacity-70'
                        }`}
                        title={
                            isCurrent
                                ? t('lessons.nav.view_lessons', 'View lessons')
                                : t(
                                      'lessons.nav.open_lesson_hint',
                                      'Open a lesson from this module to browse',
                                  )
                        }
                    >
                        <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black ${
                                allDone
                                    ? 'bg-primary text-white'
                                    : isCurrent
                                      ? 'bg-primary/15 text-primary'
                                      : 'bg-surface-container text-on-surface-variant'
                            }`}
                        >
                            {allDone ? <CheckCircle2 size={14} /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-xs font-bold leading-snug truncate ${
                                    isCurrent
                                        ? 'text-primary'
                                        : 'text-on-surface group-hover:text-primary'
                                }`}
                            >
                                {mod.title}
                            </p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">
                                {t('lessons.nav.lesson_progress', '{completed}/{total} lessons', {
                                    completed: completedCount,
                                    total: mod.lessons.length,
                                })}
                            </p>
                        </div>
                        <ChevronRight size={14} className="text-outline-variant flex-shrink-0" />
                    </button>
                );
            })}
        </div>
    );
}

function LessonsView({
    module: mod,
    currentLessonId,
    onLessonNavigate,
}: {
    module: NavModule;
    currentLessonId: number;
    onLessonNavigate: (lesson: NavigableLesson) => void;
}) {
    return (
        <div className="space-y-1">
            {mod.lessons.map((lesson) => {
                const isCurrent = lesson.id === currentLessonId;
                const isCompleted = lesson.completed_at !== null;

                return (
                    <button
                        key={lesson.id}
                        type="button"
                        onClick={() => {
                            if (isCurrent) return;
                            onLessonNavigate(lesson);
                        }}
                        disabled={isCurrent}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group ${
                            isCurrent
                                ? 'bg-primary/10 border border-primary/15 cursor-default'
                                : 'hover:bg-surface-container-low'
                        }`}
                    >
                        {isCompleted ? (
                            <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                        ) : isCurrent ? (
                            <Play
                                size={16}
                                className="text-primary flex-shrink-0"
                                fill="currentColor"
                            />
                        ) : (
                            <Circle size={16} className="text-outline-variant flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-xs font-bold leading-snug truncate ${
                                    isCurrent
                                        ? 'text-primary'
                                        : 'text-on-surface group-hover:text-primary'
                                }`}
                            >
                                {lesson.title}
                            </p>
                        </div>
                        <ChevronRight size={14} className="text-outline-variant flex-shrink-0" />
                    </button>
                );
            })}
        </div>
    );
}

const typeColors: Record<string, string> = {
    text: 'bg-primary/10 text-primary',
    code: 'bg-secondary/10 text-secondary',
    'key-points': 'bg-tertiary/10 text-tertiary',
    example: 'bg-primary/10 text-primary',
};

function SectionsView({
    sections,
    currentSectionIndex,
    onSectionSelect,
}: {
    sections: NavSection[];
    currentSectionIndex: number;
    onSectionSelect: (index: number) => void;
}) {
    return (
        <div className="space-y-1">
            {sections.map((section, i) => {
                const isCurrent = i === currentSectionIndex;
                return (
                    <button
                        key={i}
                        onClick={() => onSectionSelect(i)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                            isCurrent
                                ? 'bg-primary/10 border border-primary/15'
                                : 'hover:bg-surface-container-low'
                        }`}
                    >
                        <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-black ${
                                isCurrent
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-container text-on-surface-variant'
                            }`}
                        >
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-xs font-bold leading-snug truncate ${
                                    isCurrent
                                        ? 'text-primary'
                                        : 'text-on-surface group-hover:text-primary'
                                }`}
                            >
                                {section.title}
                            </p>
                        </div>
                        <span
                            className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                typeColors[section.type] ||
                                'bg-surface-container text-on-surface-variant'
                            }`}
                        >
                            {section.type.replace('-', ' ')}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
