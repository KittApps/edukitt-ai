import { motion } from 'framer-motion';
import { BookOpen, Code, Lightbulb, ListChecks, Zap } from 'lucide-react';
import { useT } from '@/lib/i18n';

export interface QuickLearnNavSection {
    title: string;
    type: string;
}

interface Props {
    title: string;
    sections: QuickLearnNavSection[];
    currentSectionIndex: number;
    onSectionSelect: (index: number) => void;
}

const sectionIcons: Record<string, typeof BookOpen> = {
    text: BookOpen,
    'key-points': ListChecks,
    example: Lightbulb,
    code: Code,
};

const typeColors: Record<string, string> = {
    text: 'bg-primary/10 text-primary',
    code: 'bg-secondary/10 text-secondary',
    'key-points': 'bg-tertiary/10 text-tertiary',
    example: 'bg-primary/10 text-primary',
};

export default function QuickLearnNavigator({
    title,
    sections,
    currentSectionIndex,
    onSectionSelect,
}: Props) {
    const t = useT();

    return (
        <div className="h-full flex flex-col bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-container bg-surface-container-low/30">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    <Zap size={11} />
                    {t('quick_learns.nav.title', 'Quick Learn')}
                </div>
                <p className="text-xs font-bold text-on-surface mt-1 truncate">{title}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {t('quick_learns.nav.section_count', '{count} sections', {
                        count: sections.length,
                    })}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-1"
                >
                    {sections.map((section, i) => {
                        const isCurrent = i === currentSectionIndex;
                        const Icon = sectionIcons[section.type] ?? BookOpen;

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
                                    className={`hidden xl:inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                        typeColors[section.type] ??
                                        'bg-surface-container text-on-surface-variant'
                                    }`}
                                >
                                    <Icon size={9} />
                                </span>
                            </button>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
}
