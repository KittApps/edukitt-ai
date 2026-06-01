import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    BookOpen,
    ClipboardList,
    Cpu,
    Layers,
    Library as LibraryIcon,
    Loader2,
    Plus,
    Search,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '@/lib/i18n';

interface LibraryItem {
    id: number;
    title: string;
    description: string;
    type: 'course' | 'quick-learn' | 'quiz';
    status: string;
    progress?: number;
    ai_model_name?: string | null;
    created_at: string;
    modules_count?: number;
    lessons_count?: number;
    question_count?: number;
    difficulty?: string;
    attempts_count?: number;
}

type FilterKey = 'all' | 'courses' | 'quick_learns' | 'quizzes';

interface Stats {
    courses: number;
    quick_learns: number;
    quizzes: number;
    completed: number;
}

interface Props {
    initialItems: LibraryItem[];
    initialHasMore: boolean;
    initialFilter: FilterKey;
    initialSearch: string;
    perPage: number;
    stats: Stats;
    showAiModel: boolean;
}

interface ItemsResponse {
    items: LibraryItem[];
    page: number;
    has_more: boolean;
    filter: FilterKey;
    q: string;
}

const SEARCH_DEBOUNCE_MS = 300;

export default function Library({
    initialItems,
    initialHasMore,
    initialFilter,
    initialSearch,
    stats,
    showAiModel,
}: Props) {
    const t = useT();
    const { url } = usePage();
    const queryFromUrl = (() => {
        const qs = url.split('?')[1] ?? '';
        const params = new URLSearchParams(qs);
        return params.get('q');
    })();

    const [items, setItems] = useState<LibraryItem[]>(initialItems);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<FilterKey>(initialFilter);
    const [search, setSearch] = useState(queryFromUrl ?? initialSearch);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const requestSeq = useRef(0);
    const skipNextSearchFetch = useRef(true);

    const filterOptions: { key: FilterKey; label: string }[] = [
        { key: 'all', label: t('library.filter.all', 'All') },
        { key: 'courses', label: t('library.filter.courses', 'Courses') },
        { key: 'quick_learns', label: t('library.filter.quick_learns', 'Quick Learns') },
        { key: 'quizzes', label: t('library.filter.quizzes', 'Quizzes') },
    ];

    const typeConfig = {
        course: {
            color: 'primary',
            icon: <BookOpen size={16} />,
            label: t('library.type.course', 'Course'),
        },
        'quick-learn': {
            color: 'tertiary',
            icon: <Zap size={16} />,
            label: t('library.type.quick_learn', 'Quick Learn'),
        },
        quiz: {
            color: 'secondary',
            icon: <ClipboardList size={16} />,
            label: t('library.type.quiz', 'Quiz'),
        },
    };

    const fetchPage = useCallback(
        async (nextPage: number, nextFilter: FilterKey, nextSearch: string, append: boolean) => {
            const seq = ++requestSeq.current;
            if (append) {
                setLoadingMore(true);
            } else {
                setRefreshing(true);
            }

            try {
                const { data } = await axios.get<ItemsResponse>('/app/library/items', {
                    params: {
                        page: nextPage,
                        filter: nextFilter,
                        q: nextSearch,
                    },
                });
                if (seq !== requestSeq.current) return;
                setItems((prev) => (append ? [...prev, ...data.items] : data.items));
                setHasMore(data.has_more);
                setPage(data.page);
            } catch {
                if (seq !== requestSeq.current) return;
                if (!append) {
                    setItems([]);
                    setHasMore(false);
                }
            } finally {
                if (seq === requestSeq.current) {
                    setLoadingMore(false);
                    setRefreshing(false);
                }
            }
        },
        [],
    );

    useEffect(() => {
        if (skipNextSearchFetch.current) {
            skipNextSearchFetch.current = false;
            return;
        }
        const timer = window.setTimeout(() => {
            void fetchPage(1, filter, search, false);
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [search, filter, fetchPage]);

    const onFilterChange = (next: FilterKey) => {
        if (next === filter) return;
        skipNextSearchFetch.current = true;
        setFilter(next);
        void fetchPage(1, next, search, false);
    };

    const onLoadMore = () => {
        if (loadingMore || !hasMore) return;
        void fetchPage(page + 1, filter, search, true);
    };

    return (
        <AppLayout>
            <Head title={t('library.title', 'My Library')} />
            <div className="space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-primary/8 text-primary">
                        <LibraryIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-headline font-extrabold text-on-surface">
                            {t('library.title', 'My Library')}
                        </h1>
                        <p className="text-sm text-on-surface-variant">
                            {t(
                                'library.subtitle',
                                'All your learning content in one place',
                            )}
                        </p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        {
                            value: stats.courses,
                            label: t('library.stats.courses', 'Courses'),
                            color: 'text-primary',
                        },
                        {
                            value: stats.quick_learns,
                            label: t('library.stats.quick_learns', 'Quick Learns'),
                            color: 'text-tertiary',
                        },
                        {
                            value: stats.quizzes,
                            label: t('library.stats.quizzes', 'Quizzes'),
                            color: 'text-secondary',
                        },
                        {
                            value: stats.completed,
                            label: t('library.stats.completed', 'Completed'),
                            color: 'text-on-surface',
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="p-4 bg-surface-container-lowest rounded-2xl border border-surface-container text-center"
                        >
                            <span
                                className={`text-2xl font-headline font-black ${s.color}`}
                            >
                                {s.value}
                            </span>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1">
                                {s.label}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t(
                                'library.search.placeholder',
                                'Search your content...',
                            )}
                            className="w-full bg-surface-container-lowest border border-surface-container rounded-xl pl-11 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-outline-variant"
                        />
                        {refreshing && (
                            <Loader2
                                size={14}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant animate-spin"
                            />
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {filterOptions.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => onFilterChange(f.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    filter === f.key
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container hover:border-primary/20'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {items.length === 0 && !refreshing ? (
                    <EmptyState search={search} filter={filter} />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {items.map((item, index) => (
                                <LibraryCard
                                    key={`${item.type}-${item.id}`}
                                    item={item}
                                    index={index % 12}
                                    config={typeConfig[item.type] || typeConfig.course}
                                    showAiModel={showAiModel}
                                />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={onLoadMore}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-surface-container-lowest text-on-surface border border-surface-container hover:border-primary/30 hover:text-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {t('library.load_more.loading', 'Loading…')}
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            {t('library.load_more.cta', 'Load more')}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function EmptyState({ search, filter }: { search: string; filter: FilterKey }) {
    const t = useT();
    const isFiltered = search.trim() !== '' || filter !== 'all';
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center">
            <LibraryIcon
                size={48}
                className="text-surface-container mx-auto mb-4"
            />
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
                {isFiltered
                    ? t('library.empty.filtered.title', 'No matching content')
                    : t('library.empty.title', 'No content found')}
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
                {isFiltered
                    ? t(
                          'library.empty.filtered.description',
                          'Try a different search term or filter.',
                      )
                    : t(
                          'library.empty.description',
                          'Start by creating a course or quick learn.',
                      )}
            </p>
            {!isFiltered && (
                <Link
                    href="/app/courses/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all"
                >
                    {t('library.empty.cta', 'Create Content')}
                </Link>
            )}
        </div>
    );
}

function LibraryCard({
    item,
    index,
    config,
    showAiModel,
}: {
    item: LibraryItem;
    index: number;
    config: { color: string; icon: JSX.Element; label: string };
    showAiModel: boolean;
}) {
    const t = useT();
    const href =
        item.type === 'course'
            ? `/app/courses/${item.id}`
            : item.type === 'quick-learn'
                ? `/app/quick-learns/${item.id}`
                : `/app/quizzes/${item.id}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
        >
            <Link href={href}>
                <div className="group bg-surface-container-lowest rounded-2xl p-6 border border-surface-container hover:border-primary/20 transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg bg-${config.color}/8 text-${config.color}`}
                        >
                            {config.icon} {config.label}
                        </span>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap">
                            {item.created_at}
                        </span>
                    </div>

                    <h3 className="font-headline font-extrabold text-on-surface mb-1 leading-tight">
                        {item.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
                        {item.description}
                    </p>

                    {item.type === 'course' && item.progress !== undefined && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                                <span>{t('library.card.progress', 'Progress')}</span>
                                <span>{item.progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {item.type === 'course' && (
                        <div className="flex gap-4 mt-4 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1">
                                <Layers size={12} />{' '}
                                {t('library.card.modules', '{count} modules', {
                                    count: item.modules_count ?? 0,
                                })}
                            </span>
                            <span className="flex items-center gap-1">
                                <BookOpen size={12} />{' '}
                                {t('library.card.lessons', '{count} lessons', {
                                    count: item.lessons_count ?? 0,
                                })}
                            </span>
                        </div>
                    )}

                    {item.type === 'quiz' && (
                        <div className="flex gap-4 mt-4 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1">
                                <ClipboardList size={12} />{' '}
                                {t('library.card.questions', '{count} questions', {
                                    count: item.question_count ?? 0,
                                })}
                            </span>
                            {item.difficulty && (
                                <span className="flex items-center gap-1 capitalize">
                                    {item.difficulty}
                                </span>
                            )}
                            {(item.attempts_count ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                    {t('library.card.attempts', '{count} attempts', {
                                        count: item.attempts_count ?? 0,
                                    })}
                                </span>
                            )}
                        </div>
                    )}

                    {showAiModel && item.ai_model_name && (
                        <div
                            className="flex items-center gap-1 mt-3 text-[10px] text-on-surface-variant/70 font-medium truncate"
                            title={item.ai_model_name}
                        >
                            <Cpu size={10} className="flex-shrink-0" />
                            <span className="truncate">{item.ai_model_name}</span>
                        </div>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}
