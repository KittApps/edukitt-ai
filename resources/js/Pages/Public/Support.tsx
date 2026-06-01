import { Head } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BookOpen,
    ChevronDown,
    CreditCard,
    HelpCircle,
    LayoutGrid,
    LifeBuoy,
    Mail,
    MessageCircle,
    Sparkles,
    UserCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';

interface FaqItem {
    id: number;
    question: string;
    answer: string;
}

interface FaqCategory {
    id: number;
    slug: string;
    name: string;
    icon: string | null;
    faqs: FaqItem[];
}

interface Props {
    categories: FaqCategory[];
}

const ICON_MAP: Record<string, JSX.Element> = {
    BookOpen: <BookOpen size={14} />,
    Sparkles: <Sparkles size={14} />,
    CreditCard: <CreditCard size={14} />,
    UserCircle: <UserCircle size={14} />,
    LifeBuoy: <LifeBuoy size={14} />,
    Mail: <Mail size={14} />,
    MessageCircle: <MessageCircle size={14} />,
    HelpCircle: <HelpCircle size={14} />,
};

const ALL_KEY = '__all__';

function iconFor(name: string | null): JSX.Element {
    if (!name) return <HelpCircle size={14} />;
    return ICON_MAP[name] ?? <HelpCircle size={14} />;
}

export default function Support({ categories }: Props) {
    const t = useT();
    const [activeKey, setActiveKey] = useState<string>(ALL_KEY);
    const [openId, setOpenId] = useState<number | null>(null);

    const allFaqs = useMemo<FaqItem[]>(
        () => categories.flatMap((c) => c.faqs),
        [categories],
    );

    const visibleFaqs = useMemo<FaqItem[]>(() => {
        if (activeKey === ALL_KEY) return allFaqs;
        return (
            categories.find((c) => c.slug === activeKey)?.faqs ?? []
        );
    }, [activeKey, allFaqs, categories]);

    const totalFaqs = allFaqs.length;

    return (
        <PublicLayout>
            <Head>
                <title>
                    {t(
                        'public.support.head_title',
                        'Help & Support — EduKitt',
                    )}
                </title>
                <meta
                    name="description"
                    content={t(
                        'public.support.head_description',
                        'Find answers to common questions about courses, billing, account management and more.',
                    )}
                />
            </Head>

            <section className="px-6 pt-14 pb-10 md:pt-20 md:pb-12">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider inline-flex items-center gap-2">
                            <LifeBuoy size={16} />
                            {t('public.support.kicker', 'Help & Support')}
                        </p>
                        <h1 className="text-3xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                            {t(
                                'public.support.title',
                                'How can we help?',
                            )}
                        </h1>
                        <p className="text-on-surface-variant mt-3 text-base md:text-lg">
                            {t(
                                'public.support.subtitle',
                                'Browse common questions or get in touch — we usually reply within one business day.',
                            )}
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="px-6 pb-20 md:pb-28">
                <div className="max-w-3xl mx-auto">
                    {totalFaqs === 0 ? (
                        <EmptyState
                            title={t(
                                'public.support.empty_all.title',
                                'No FAQs yet',
                            )}
                            description={t(
                                'public.support.empty_all.description',
                                'Our team is preparing answers. Check back soon, or get in touch directly.',
                            )}
                        />
                    ) : (
                        <>
                            <CategoryTabs
                                categories={categories}
                                allCount={totalFaqs}
                                activeKey={activeKey}
                                onSelect={(key) => {
                                    setActiveKey(key);
                                    setOpenId(null);
                                }}
                            />

                            <div className="mt-8 space-y-3">
                                {visibleFaqs.length === 0 ? (
                                    <EmptyState
                                        title={t(
                                            'public.support.empty_category.title',
                                            'Nothing here yet',
                                        )}
                                        description={t(
                                            'public.support.empty_category.description',
                                            'This category has no questions yet. Try a different tab.',
                                        )}
                                    />
                                ) : (
                                    visibleFaqs.map((faq) => (
                                        <FaqRow
                                            key={faq.id}
                                            question={faq.question}
                                            answer={faq.answer}
                                            isOpen={openId === faq.id}
                                            onToggle={() =>
                                                setOpenId((prev) =>
                                                    prev === faq.id
                                                        ? null
                                                        : faq.id,
                                                )
                                            }
                                        />
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}

function CategoryTabs({
    categories,
    allCount,
    activeKey,
    onSelect,
}: {
    categories: FaqCategory[];
    allCount: number;
    activeKey: string;
    onSelect: (key: string) => void;
}) {
    const t = useT();

    return (
        <div
            role="tablist"
            aria-label={t(
                'public.support.tabs_aria',
                'Filter questions by category',
            )}
            className="flex flex-wrap items-center justify-center gap-2"
        >
            <TabButton
                isActive={activeKey === ALL_KEY}
                onClick={() => onSelect(ALL_KEY)}
                icon={<LayoutGrid size={14} />}
                label={t('public.support.tabs.all', 'All')}
                count={allCount}
            />
            {categories.map((c) => (
                <TabButton
                    key={c.slug}
                    isActive={activeKey === c.slug}
                    onClick={() => onSelect(c.slug)}
                    icon={iconFor(c.icon)}
                    label={c.name}
                    count={c.faqs.length}
                />
            ))}
        </div>
    );
}

function TabButton({
    isActive,
    onClick,
    icon,
    label,
    count,
}: {
    isActive: boolean;
    onClick: () => void;
    icon: JSX.Element;
    label: string;
    count: number;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                isActive
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/15'
                    : 'bg-surface-container-lowest text-on-surface-variant border-surface-container hover:border-primary/30 hover:text-on-surface'
            }`}
        >
            <span className="flex-shrink-0">{icon}</span>
            <span className="whitespace-nowrap">{label}</span>
            <span
                className={`text-[10px] font-bold tabular-nums rounded-full px-1.5 py-0.5 ${
                    isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container text-on-surface-variant'
                }`}
            >
                {count}
            </span>
        </button>
    );
}

function FaqRow({
    question,
    answer,
    isOpen,
    onToggle,
}: {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            className={`rounded-2xl border bg-surface-container-lowest transition-colors ${
                isOpen
                    ? 'border-primary/30 shadow-sm shadow-primary/5'
                    : 'border-surface-container hover:border-primary/20'
            }`}
        >
            <button
                onClick={onToggle}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
                <span className="font-headline font-bold text-on-surface text-sm md:text-base">
                    {question}
                </span>
                <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-on-surface-variant transition-transform ${
                        isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center">
            <LifeBuoy
                size={48}
                className="text-surface-container mx-auto mb-4"
            />
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
                {title}
            </h3>
            <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
    );
}
