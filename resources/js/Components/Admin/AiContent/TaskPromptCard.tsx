import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquareText,
    RotateCcw,
    Save,
    Eye,
    Pencil,
    Copy,
    Check,
    Info,
    type LucideProps,
} from 'lucide-react';
import axios from 'axios';
import { router } from '@inertiajs/react';

/**
 * Admin editor for an AI task's system prompt template.
 *
 * Generic across all agent-backed tasks (Quick Learn, Course Outline,
 * Lesson Content, Quiz). The default template and placeholder metadata
 * come from the corresponding agent class on the backend — passed in
 * here as props. Reset clears the DB override; Save persists a new
 * override; both partial-reload `prompts` so subsequent generations
 * pick up the change immediately.
 *
 * When rendered inside a tab panel, pass `embedded` to drop the outer
 * card chrome so it sits naturally inside the parent panel.
 */

export interface PromptPlaceholder {
    token: string;
    label: string;
    description: string;
    sample: string;
}

interface Props {
    taskKey: string;
    template: string;
    defaultTemplate: string;
    placeholders: PromptPlaceholder[];
    hasCustom?: boolean;
    embedded?: boolean;
}

const textareaClasses =
    'w-full bg-surface-container-low/40 border border-surface-container rounded-xl px-4 py-3.5 text-[13px] font-mono leading-relaxed text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-y';

export default function TaskPromptCard({
    taskKey,
    template,
    defaultTemplate,
    placeholders,
    hasCustom = false,
    embedded = false,
}: Props) {
    const [prompt, setPrompt] = useState<string>(template);
    const [savedPrompt, setSavedPrompt] = useState<string>(template);
    const [savedHasCustom, setSavedHasCustom] = useState<boolean>(hasCustom);
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState<false | 'saving' | 'resetting'>(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const dirty = prompt !== savedPrompt;
    const isDefault = prompt === defaultTemplate;
    const customized = savedHasCustom && !dirty;
    const charCount = prompt.length;

    const rendered = useMemo(() => {
        let out = prompt;
        for (const p of placeholders) {
            out = out.split(p.token).join(p.sample);
        }
        return out;
    }, [prompt, placeholders]);

    const insertToken = (token: string) => {
        const el = textareaRef.current;
        if (!el) {
            setPrompt((p) => `${p}${p.endsWith('\n') ? '' : ' '}${token}`);
            return;
        }
        const start = el.selectionStart ?? prompt.length;
        const end = el.selectionEnd ?? prompt.length;
        const next = prompt.slice(0, start) + token + prompt.slice(end);
        setPrompt(next);
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + token.length;
            el.setSelectionRange(pos, pos);
        });
    };

    const handleReset = async () => {
        if (busy) return;
        setBusy('resetting');
        try {
            if (savedHasCustom) {
                await axios.delete(
                    `/admin/settings/ai-content/${encodeURIComponent(taskKey)}/prompt`,
                );
                setSavedHasCustom(false);
            }
            setPrompt(defaultTemplate);
            setSavedPrompt(defaultTemplate);
            router.reload({ only: ['prompts'] });
        } catch (error) {
            console.error('Failed to reset prompt:', error);
        } finally {
            setBusy(false);
        }
    };

    const handleSave = async () => {
        if (busy || !dirty) return;
        setBusy('saving');
        try {
            await axios.post(
                `/admin/settings/ai-content/${encodeURIComponent(taskKey)}/prompt`,
                { template: prompt },
            );
            setSavedPrompt(prompt);
            setSavedHasCustom(true);
            router.reload({ only: ['prompts'] });
        } catch (error) {
            console.error('Failed to save prompt:', error);
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API blocked — silent fail.
        }
    };

    const containerClass = embedded
        ? ''
        : 'bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden';

    const headerClass = embedded
        ? 'flex items-start justify-between gap-4 mb-5'
        : 'flex items-start justify-between gap-4 px-6 py-5 border-b border-surface-container';

    const bodyClass = embedded ? 'space-y-5' : 'p-6 space-y-5';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={containerClass}
        >
            {/* Header */}
            <div className={headerClass}>
                <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <MessageSquareText size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-headline font-extrabold text-base text-on-surface">
                                System prompt
                            </h3>
                            {dirty && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                    Unsaved
                                </span>
                            )}
                            {customized && !isDefault && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    Customized
                                </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
                                {charCount.toLocaleString()} chars
                            </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-xl">
                            Instructions sent to the AI for this task. Edits take effect on the next generation.
                        </p>
                    </div>
                </div>

                {/* Mode toggle */}
                <div className="inline-flex items-center bg-surface-container-low rounded-xl p-1 flex-shrink-0">
                    <ModeButton
                        active={mode === 'edit'}
                        onClick={() => setMode('edit')}
                        icon={Pencil}
                        label="Edit"
                    />
                    <ModeButton
                        active={mode === 'preview'}
                        onClick={() => setMode('preview')}
                        icon={Eye}
                        label="Preview"
                    />
                </div>
            </div>

            {/* Body */}
            <div className={bodyClass}>
                <AnimatePresence mode="wait">
                    {mode === 'edit' ? (
                        <motion.div
                            key="edit"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                        >
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={18}
                                className={textareaClasses}
                                spellCheck={false}
                            />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                                    <Info size={11} />
                                    Click a placeholder below to insert it at the cursor.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={12} className="text-emerald-500" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={12} />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-1.5">
                                    <Eye size={11} />
                                    Rendered with example values
                                </div>
                                <HighlightedPrompt
                                    text={rendered}
                                    placeholders={placeholders}
                                />
                            </div>
                            <p className="text-[11px] text-on-surface-variant mt-2 flex items-center gap-1.5">
                                <Info size={11} />
                                Values shown above are samples. The real prompt uses
                                live data from each generation.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Placeholders */}
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2.5">
                        Placeholders
                    </div>
                    {placeholders.length === 0 ? (
                        <p className="text-[11px] text-on-surface-variant">
                            This task has no placeholders.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                            {placeholders.map((p) => (
                                <PlaceholderCard
                                    key={p.token}
                                    placeholder={p}
                                    disabled={mode === 'preview'}
                                    onInsert={() => insertToken(p.token)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-surface-container">
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={busy !== false || (isDefault && !savedHasCustom)}
                        title={
                            savedHasCustom
                                ? 'Clear admin override and revert to the agent default'
                                : 'Already on the default template'
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <RotateCcw size={13} />
                        {busy === 'resetting' ? 'Resetting…' : 'Reset to default'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!dirty || busy !== false}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:brightness-110 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Save size={13} />
                        {busy === 'saving' ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Subcomponents ────────────────────────────────────────────────

function ModeButton({
    active,
    onClick,
    icon: Icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ComponentType<LucideProps>;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                active
                    ? 'text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface'
            }`}
        >
            {active && (
                <motion.span
                    layoutId="task-prompt-mode-bg"
                    className="absolute inset-0 rounded-lg bg-surface-container-lowest shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
            )}
            <span className="relative inline-flex items-center gap-1.5">
                <Icon size={12} />
                {label}
            </span>
        </button>
    );
}

function PlaceholderCard({
    placeholder,
    disabled,
    onInsert,
}: {
    placeholder: PromptPlaceholder;
    disabled: boolean;
    onInsert: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onInsert}
            disabled={disabled}
            className="group text-left rounded-xl border border-surface-container bg-surface-container-lowest hover:border-primary/30 hover:bg-primary/5 px-3 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-surface-container disabled:hover:bg-surface-container-lowest"
            title={disabled ? 'Switch to Edit to insert' : 'Insert at cursor'}
        >
            <code className="inline-block text-[11px] font-mono font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded mb-1.5">
                {placeholder.token}
            </code>
            <p className="text-[11px] text-on-surface-variant leading-snug">
                {placeholder.description}
            </p>
        </button>
    );
}

/**
 * Renders the prompt as plain text but highlights any remaining
 * placeholder tokens in case the admin types a typo that won't be
 * substituted.
 */
function HighlightedPrompt({
    text,
    placeholders,
}: {
    text: string;
    placeholders: PromptPlaceholder[];
}) {
    const parts = useMemo(() => {
        const regex = /(\{[a-z_]+\})/g;
        return text.split(regex).map((chunk, i) => {
            if (regex.test(chunk)) {
                regex.lastIndex = 0;
                const known = placeholders.some((p) => p.token === chunk);
                return (
                    <code
                        key={i}
                        className={`px-1 py-0.5 rounded text-[12px] font-mono font-bold ${
                            known
                                ? 'text-primary bg-primary/10'
                                : 'text-amber-700 bg-amber-500/10'
                        }`}
                        title={
                            known
                                ? 'Known placeholder'
                                : 'Unknown placeholder — will not be substituted'
                        }
                    >
                        {chunk}
                    </code>
                );
            }
            return (
                <span key={i} className="whitespace-pre-wrap">
                    {chunk}
                </span>
            );
        });
    }, [text, placeholders]);

    return (
        <div className="text-[13px] font-mono leading-relaxed text-on-surface">
            {parts}
        </div>
    );
}
