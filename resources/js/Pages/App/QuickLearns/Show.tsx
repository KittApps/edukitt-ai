import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { forwardRef, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ListChecks, Lightbulb, Code, Cpu, Trash2, Zap } from 'lucide-react';
import CodeBlock from '@/Components/Shared/CodeBlock';
import ConfirmDeleteModal from '@/Components/Shared/ConfirmDeleteModal';
import RichText, { renderInline } from '@/Components/Shared/RichText';
import QuickLearnNavigator from '@/Components/QuickLearnView/QuickLearnNavigator';
import { useT } from '@/lib/i18n';

interface Section {
    title: string;
    type: string;
    content: string;
    items?: string[];
    language?: string;
}

interface QuickLearn {
    id: number;
    title: string;
    description: string;
    topic: string;
    content: Section[] | null;
    preferences: Record<string, string> | null;
    language: string | null;
    ai_model_name: string | null;
}

interface Props {
    quickLearn: QuickLearn;
    showAiModel: boolean;
}

const sectionIcons: Record<string, any> = {
    text: <BookOpen size={18} />,
    'key-points': <ListChecks size={18} />,
    example: <Lightbulb size={18} />,
    code: <Code size={18} />,
};

const sectionLabelKeys: Record<string, { key: string; fallback: string }> = {
    text: { key: 'lessons.section.type.reading', fallback: 'Reading' },
    'key-points': { key: 'lessons.section.type.key_points', fallback: 'Key Points' },
    example: { key: 'lessons.section.type.example', fallback: 'Example' },
    code: { key: 'lessons.section.type.code', fallback: 'Code' },
};

export default function Show({ quickLearn, showAiModel }: Props) {
    const t = useT();
    const sections = quickLearn.content ?? [];
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const preferenceValues = Object.values(quickLearn.preferences ?? {}).filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );

    const handleSectionSelect = (index: number) => {
        setCurrentSectionIndex(index);
        const el = sectionRefs.current[index];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleDelete = () => {
        setDeleting(true);
        router.delete(`/app/quick-learns/${quickLearn.id}`, {
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={quickLearn.title} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        <Link href="/app/library" className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-6">
                            <ArrowLeft size={16} /> {t('courses.show.back_to_library', 'Back to Library')}
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary/8 text-tertiary text-xs font-bold rounded-lg">
                                <Zap size={12} /> {t('library.type.quick_learn', 'Quick Learn')}
                            </span>
                            {preferenceValues.map((value, i) => (
                                <span
                                    key={`pref-${i}-${value}`}
                                    className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg capitalize"
                                >
                                    {value}
                                </span>
                            ))}
                            {showAiModel && quickLearn.ai_model_name && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg">
                                    <Cpu size={11} /> {quickLearn.ai_model_name}
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl font-headline font-extrabold text-on-surface mb-3">{quickLearn.title}</h1>
                        {quickLearn.description && <p className="text-on-surface-variant leading-relaxed">{quickLearn.description}</p>}
                    </motion.div>

                    <div className="space-y-6">
                        {sections.map((section, index) => (
                            <SectionBlock
                                key={index}
                                section={section}
                                index={index}
                                isActive={index === currentSectionIndex}
                                ref={(el) => {
                                    sectionRefs.current[index] = el;
                                }}
                                onClick={() => setCurrentSectionIndex(index)}
                            />
                        ))}
                    </div>
                </div>

                {sections.length > 0 && (
                    <aside className="lg:col-span-4 xl:col-span-3 hidden lg:block">
                        <div className="sticky top-6 h-[calc(100vh-7rem)] flex flex-col gap-4">
                            <div className="flex-1 min-h-0">
                                <QuickLearnNavigator
                                    title={quickLearn.title}
                                    sections={sections.map((s) => ({ title: s.title, type: s.type }))}
                                    currentSectionIndex={currentSectionIndex}
                                    onSectionSelect={handleSectionSelect}
                                />
                            </div>
                            <ActionsCard onDelete={() => setConfirmingDelete(true)} />
                        </div>
                    </aside>
                )}
            </div>

            <ConfirmDeleteModal
                open={confirmingDelete}
                onClose={() => setConfirmingDelete(false)}
                onConfirm={handleDelete}
                isProcessing={deleting}
            />
        </AppLayout>
    );
}

const SectionBlock = forwardRef<
    HTMLDivElement,
    {
        section: Section;
        index: number;
        isActive: boolean;
        onClick: () => void;
    }
>(({ section, index, isActive, onClick }, ref) => {
    const t = useT();
    const icon = sectionIcons[section.type] || <BookOpen size={18} />;
    const labelInfo = sectionLabelKeys[section.type] ?? {
        key: 'lessons.section.type.content',
        fallback: 'Content',
    };
    const label = t(labelInfo.key, labelInfo.fallback);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            onClick={onClick}
            className={`bg-surface-container-lowest rounded-2xl border overflow-hidden transition-all duration-300 scroll-mt-24 ${
                isActive
                    ? 'border-primary/20 shadow-md shadow-primary/5'
                    : 'border-surface-container hover:border-primary/10'
            }`}
        >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-container bg-surface-container-low/50">
                <span className="text-tertiary">{icon}</span>
                <h3 className="font-headline font-bold text-on-surface">{section.title}</h3>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-lg">{label}</span>
            </div>
            <div className="p-6">
                {section.type === 'text' && <RichText content={section.content} />}
                {section.type === 'key-points' && section.items && (
                    <div className="space-y-3">
                        {section.content && <RichText content={section.content} />}
                        <ul className="space-y-3">
                            {section.items.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-2 shrink-0" />
                                    <span className="text-sm text-on-surface-variant">
                                        {renderInline(item)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {section.type === 'example' && (
                    <div className="bg-tertiary/5 rounded-xl p-5 border border-tertiary/10">
                        <RichText content={section.content} />
                    </div>
                )}
                {section.type === 'code' && <CodeBlock code={section.content} language={section.language} />}
            </div>
        </motion.div>
    );
});

SectionBlock.displayName = 'SectionBlock';

function ActionsCard({ onDelete }: { onDelete: () => void }) {
    const t = useT();
    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 flex-shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">
                {t('courses.show.actions.title', 'Actions')}
            </h3>
            <button
                onClick={onDelete}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-error hover:bg-error/5 rounded-xl transition-all"
            >
                <Trash2 size={15} />
                {t('common.delete', 'Delete')}
            </button>
        </div>
    );
}
