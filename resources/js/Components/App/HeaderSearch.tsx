import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight,
    BookOpen,
    ClipboardList,
    Loader2,
    Search,
    Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useT } from '@/lib/i18n';

type ResultType = 'course' | 'quick-learn' | 'quiz';

interface SearchResult {
    id: number;
    type: ResultType;
    title: string;
    description: string | null;
    url: string;
}

interface SearchResponse {
    query: string;
    results: SearchResult[];
    counts?: {
        courses: number;
        quick_learns: number;
        quizzes: number;
        total: number;
    };
}

const TYPE_META: Record<ResultType, { label: string; icon: JSX.Element; tone: string }> = {
    course: {
        label: 'Course',
        icon: <BookOpen size={12} />,
        tone: 'text-primary bg-primary/10',
    },
    'quick-learn': {
        label: 'Quick Learn',
        icon: <Zap size={12} />,
        tone: 'text-tertiary bg-tertiary/10',
    },
    quiz: {
        label: 'Quiz',
        icon: <ClipboardList size={12} />,
        tone: 'text-secondary bg-secondary/10',
    },
};

const DEBOUNCE_MS = 220;
const MIN_QUERY_LENGTH = 2;

export default function HeaderSearch() {
    const t = useT();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const seq = ++requestSeq.current;
        const timer = window.setTimeout(async () => {
            try {
                const { data } = await axios.get<SearchResponse>('/app/search', {
                    params: { q: trimmed },
                });
                if (seq !== requestSeq.current) return;
                setResults(data.results ?? []);
                setHighlight(0);
            } catch {
                if (seq !== requestSeq.current) return;
                setResults([]);
            } finally {
                if (seq === requestSeq.current) {
                    setLoading(false);
                }
            }
        }, DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [query]);

    const gotoLibrary = (term: string) => {
        const url = term ? `/app/library?q=${encodeURIComponent(term)}` : '/app/library';
        router.visit(url);
        setOpen(false);
        inputRef.current?.blur();
    };

    const gotoResult = (result: SearchResult) => {
        router.visit(result.url);
        setOpen(false);
        inputRef.current?.blur();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (results.length > 0 && highlight >= 0 && highlight < results.length) {
                gotoResult(results[highlight]);
            } else {
                gotoLibrary(query.trim());
            }
            return;
        }

        if (!open || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(results.length - 1, h + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
        }
    };

    const trimmed = query.trim();
    const showDropdown = open && trimmed.length >= MIN_QUERY_LENGTH;
    const showEmpty = !loading && results.length === 0 && trimmed.length >= MIN_QUERY_LENGTH;

    return (
        <div className="relative w-56 md:w-80 group" ref={containerRef}>
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                {loading ? (
                    <Loader2 size={16} className="text-outline-variant animate-spin" />
                ) : (
                    <Search size={16} className="text-outline-variant" />
                )}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => trimmed.length >= MIN_QUERY_LENGTH && setOpen(true)}
                onKeyDown={onKeyDown}
                className="w-full bg-surface-container-lowest border border-surface-container rounded-xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-outline-variant"
                placeholder={t(
                    'header.search.placeholder',
                    'Search courses, topics...',
                )}
            />

            {showDropdown && (
                <div className="absolute left-0 right-0 mt-2 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container py-1.5 z-50 max-h-[28rem] overflow-y-auto">
                    {loading && results.length === 0 && (
                        <div className="px-4 py-6 flex items-center justify-center text-on-surface-variant text-xs">
                            <Loader2 size={14} className="animate-spin mr-2" />
                            {t('header.search.loading', 'Searching…')}
                        </div>
                    )}

                    {showEmpty && (
                        <div className="px-4 py-6 text-center">
                            <p className="text-sm font-semibold text-on-surface">
                                {t('header.search.empty.title', 'No matches')}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                {t(
                                    'header.search.empty.hint',
                                    'Press Enter to open the library anyway.',
                                )}
                            </p>
                        </div>
                    )}

                    {results.length > 0 && (
                        <>
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                {t('header.search.results.label', 'Results')}
                            </div>
                            {results.map((r, index) => {
                                const meta = TYPE_META[r.type];
                                const active = index === highlight;
                                return (
                                    <button
                                        key={`${r.type}-${r.id}`}
                                        onMouseEnter={() => setHighlight(index)}
                                        onClick={() => gotoResult(r)}
                                        className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                                            active
                                                ? 'bg-primary/5'
                                                : 'hover:bg-surface-container-low'
                                        }`}
                                    >
                                        <span
                                            className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 ${meta.tone}`}
                                        >
                                            {meta.icon}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold text-on-surface truncate">
                                                {r.title}
                                            </span>
                                            <span className="block text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                                                {t(
                                                    `header.search.type.${r.type}`,
                                                    meta.label,
                                                )}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </>
                    )}

                    <button
                        onClick={() => gotoLibrary(trimmed)}
                        className="w-full mt-1 border-t border-surface-container flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                        <span className="truncate">
                            {t(
                                'header.search.view_all',
                                'See all results in Library',
                            )}
                        </span>
                        <ArrowRight size={14} className="flex-shrink-0" />
                    </button>
                </div>
            )}
        </div>
    );
}
