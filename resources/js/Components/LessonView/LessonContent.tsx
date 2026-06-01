import { forwardRef, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen,
    Code2,
    FlaskConical,
    Lightbulb,
} from 'lucide-react';
import CodeBlock from '@/Components/Shared/CodeBlock';
import RichText, { renderInline } from '@/Components/Shared/RichText';
import { useT } from '@/lib/i18n';

export interface Section {
    title: string;
    type: string;
    content: string;
    items?: string[];
    language?: string;
}

interface SectionTypeConfig {
    icon: typeof BookOpen;
    label: string;
    accent: string;
    bg: string;
}

function useSectionTypeConfig(): Record<string, SectionTypeConfig> {
    const t = useT();

    return {
        text: {
            icon: BookOpen,
            label: t('lessons.section.type.reading', 'Reading'),
            accent: 'text-primary',
            bg: 'bg-primary/10',
        },
        code: {
            icon: Code2,
            label: t('lessons.section.type.code', 'Code'),
            accent: 'text-secondary',
            bg: 'bg-secondary/10',
        },
        'key-points': {
            icon: Lightbulb,
            label: t('lessons.section.type.key_points', 'Key Points'),
            accent: 'text-tertiary',
            bg: 'bg-tertiary/10',
        },
        example: {
            icon: FlaskConical,
            label: t('lessons.section.type.example', 'Example'),
            accent: 'text-primary',
            bg: 'bg-primary/10',
        },
    };
}

interface Props {
    sections: Section[];
    currentSectionIndex: number;
    onSectionVisible: (index: number) => void;
}

export default function LessonContent({ sections, currentSectionIndex, onSectionVisible }: Props) {
    const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const scrolledBySelection = useRef(false);

    useEffect(() => {
        const el = sectionRefs.current[currentSectionIndex];
        if (el) {
            scrolledBySelection.current = true;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.setTimeout(() => {
                scrolledBySelection.current = false;
            }, 400);
        }
    }, [currentSectionIndex]);

    return (
        <div className="space-y-6">
            {sections.map((section, i) => (
                <SectionBlock
                    key={i}
                    section={section}
                    index={i}
                    isActive={i === currentSectionIndex}
                    ref={(el) => {
                        sectionRefs.current[i] = el;
                    }}
                    onClick={() => onSectionVisible(i)}
                />
            ))}
        </div>
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
    const sectionTypeConfig = useSectionTypeConfig();
    const config = sectionTypeConfig[section.type] ?? sectionTypeConfig.text;
    const Icon = config.icon;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={onClick}
            className={`rounded-2xl border transition-all duration-300 ${
                isActive
                    ? 'border-primary/20 shadow-md shadow-primary/5'
                    : 'border-surface-container hover:border-primary/10'
            } bg-surface-container-lowest overflow-hidden`}
        >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-container/60">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon size={16} className={config.accent} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-on-surface">{section.title}</h3>
                    <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${config.accent}`}
                    >
                        {config.label}
                    </p>
                </div>
            </div>

            <div className="px-6 py-5">
                {section.type === 'code' ? (
                    <CodeBlock code={section.content} language={section.language} />
                ) : section.type === 'key-points' && section.items ? (
                    <KeyPointsBlock intro={section.content} items={section.items} />
                ) : section.type === 'example' ? (
                    <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                        <RichText content={section.content} />
                    </div>
                ) : (
                    <RichText content={section.content} />
                )}
            </div>
        </motion.div>
    );
});

SectionBlock.displayName = 'SectionBlock';

function KeyPointsBlock({ intro, items }: { intro?: string; items: string[] }) {
    return (
        <div className="space-y-4">
            {intro && (
                <p className="text-sm text-on-surface leading-relaxed">
                    {renderInline(intro)}
                </p>
            )}
            <ul className="space-y-2.5">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-md bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black">
                            {i + 1}
                        </div>
                        <span className="text-sm text-on-surface leading-relaxed">
                            {renderInline(item)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

