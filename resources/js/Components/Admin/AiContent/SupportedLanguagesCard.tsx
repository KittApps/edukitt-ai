import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, Globe, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Modal } from '@/Components/Admin/Shared';

/**
 * Admin editor for the list of supported output languages exposed by
 * the language selector on user-facing generation forms.
 *
 * Controlled component — owns no canonical state; the parent (the
 * GlobalConfigCard form) holds the array and persists it as part of
 * the global config payload.
 *
 *
 * Mirrors the chip-tag pattern from PersonalizeOptionsCard so the
 * admin UI feels consistent.
 */

export interface SupportedLanguage {
    code: string;
    name: string;
    is_default?: boolean;
}

interface Props {
    value: SupportedLanguage[];
    onChange: (next: SupportedLanguage[]) => void;
    /**
     * Reflects the `show_language_selector` global toggle. When false
     * the count pill in the header flips to a red "Disabled" badge so
     * it's obvious end users currently bypass the language step. The
     * editor itself stays fully usable.
     */
    disabled?: boolean;
}

const inputClasses =
    'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

type Editor =
    | { mode: 'create' }
    | { mode: 'edit'; original: SupportedLanguage };

export default function SupportedLanguagesCard({ value, onChange, disabled = false }: Props) {
    const languages = value;
    const [editor, setEditor] = useState<Editor | null>(null);
    const [draft, setDraft] = useState<SupportedLanguage | null>(null);
    // Tracks whether the admin has manually typed in the code field
    // during this create flow. While `false` the code mirrors the
    // name (slugified), giving the common "type 'English' → code
    // becomes 'en'" UX without locking out edge cases.
    const [codeTouched, setCodeTouched] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<SupportedLanguage | null>(null);
    const [error, setError] = useState<string | null>(null);

    const openCreate = () => {
        setEditor({ mode: 'create' });
        setDraft({ code: '', name: '', is_default: false });
        setCodeTouched(false);
        setError(null);
    };
    const openEdit = (lang: SupportedLanguage) => {
        setEditor({ mode: 'edit', original: lang });
        setDraft({ ...lang });
        setCodeTouched(true); // edit always treats the code as user-owned
        setError(null);
    };
    const closeEditor = () => {
        setEditor(null);
        setDraft(null);
        setCodeTouched(false);
        setError(null);
    };

    const saveDraft = () => {
        if (!draft || !editor) return;
        const name = draft.name.trim();
        if (!name) return;

        // Code rules: lowercase, letters or `-`, 2–8 chars, matching
        // the backend's regex in AiContentController::updateGlobalConfig.
        const code = normalizeCode(draft.code) || slugifyName(name);
        if (!isValidCode(code)) {
            setError(
                'Code must be 2-8 letters (e.g. "en", "si", "es-419").',
            );
            return;
        }

        const next: SupportedLanguage = {
            code,
            name,
            is_default: !!draft.is_default,
        };

        const collides = languages.some(
            (l) =>
                l.code === next.code &&
                (editor.mode === 'create' || editor.original.code !== next.code),
        );
        if (collides) {
            setError('A language with this code already exists.');
            return;
        }

        let list =
            editor.mode === 'create'
                ? [...languages, next]
                : languages.map((l) =>
                      l.code === editor.original.code ? next : l,
                  );
        if (next.is_default) {
            list = list.map((l) =>
                l.code === next.code ? l : { ...l, is_default: false },
            );
        }
        if (list.length > 0 && !list.some((l) => l.is_default)) {
            list = list.map((l, i) => (i === 0 ? { ...l, is_default: true } : l));
        }
        onChange(list);
        closeEditor();
    };

    const deleteLang = () => {
        if (!confirmDelete) return;
        let list = languages.filter((l) => l.code !== confirmDelete.code);
        if (list.length > 0 && !list.some((l) => l.is_default)) {
            list = list.map((l, i) => (i === 0 ? { ...l, is_default: true } : l));
        }
        onChange(list);
        setConfirmDelete(null);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden"
            >
                <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-surface-container">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                            <Globe size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-headline font-extrabold text-sm text-on-surface">
                                    Supported Languages
                                </h4>
                                {disabled ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                        <Ban size={10} /> Disabled
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
                                        {languages.length}{' '}
                                        {languages.length === 1 ? 'language' : 'languages'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-xl">
                                Languages the AI will generate content in. Users pick one
                                from this list on the generation form; the default is
                                pre-selected for them.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all flex-shrink-0 whitespace-nowrap"
                    >
                        <Plus size={14} /> Add language
                    </button>
                </div>

                <div className="px-5 py-5">
                    {languages.length === 0 ? (
                        <EmptyState onAdd={openCreate} />
                    ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                            <AnimatePresence initial={false}>
                                {languages.map((lang) => (
                                    <LanguageChip
                                        key={lang.code}
                                        lang={lang}
                                        onEdit={() => openEdit(lang)}
                                        onDelete={() => setConfirmDelete(lang)}
                                    />
                                ))}
                            </AnimatePresence>
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-surface-container hover:border-primary/40 hover:bg-primary/5 text-on-surface-variant hover:text-primary text-xs font-bold rounded-full transition-all"
                            >
                                <Plus size={12} /> Add language
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {editor && draft && (
                <Modal
                    onClose={closeEditor}
                    title={editor.mode === 'create' ? 'Add language' : 'Edit language'}
                    description={
                        editor.mode === 'create'
                            ? 'Add a new language to the selector.'
                            : 'Update the code, name or default flag.'
                    }
                    size="lg"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeEditor}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveDraft}
                                disabled={!draft.name.trim()}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                {editor.mode === 'create' ? 'Add language' : 'Save changes'}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-5">
                        {error && (
                            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-700">
                                {error}
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field
                                label="Code"
                                hint="ISO 639-1 (e.g. en, si, es)."
                            >
                                <input
                                    type="text"
                                    value={draft.code}
                                    onChange={(e) => {
                                        setCodeTouched(true);
                                        setDraft({
                                            ...draft,
                                            code: e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z-]/g, '')
                                                .slice(0, 8),
                                        });
                                    }}
                                    placeholder="en"
                                    className={inputClasses + ' font-mono'}
                                    maxLength={8}
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field
                                    label="Name"
                                    hint="Shown to end users on the generation form."
                                >
                                    <input
                                        type="text"
                                        value={draft.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            setDraft({
                                                ...draft,
                                                name,
                                                // Keep the code mirroring the
                                                // name until the admin types
                                                // into the code field themselves.
                                                code:
                                                    editor.mode === 'create' && !codeTouched
                                                        ? slugifyName(name)
                                                        : draft.code,
                                            });
                                        }}
                                        placeholder="English"
                                        className={inputClasses}
                                        autoFocus
                                    />
                                </Field>
                            </div>
                        </div>
                        <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low/50 border border-surface-container hover:bg-surface-container-low cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={!!draft.is_default}
                                onChange={(e) =>
                                    setDraft({
                                        ...draft,
                                        is_default: e.target.checked,
                                    })
                                }
                                className="mt-0.5 h-4 w-4 rounded border-surface-container text-primary focus:ring-primary/40"
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-on-surface">
                                    Default language
                                </span>
                                <span className="block text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                                    Pre-selected on the user generation form. Only one
                                    language can be default at a time.
                                </span>
                            </span>
                        </label>
                    </div>
                </Modal>
            )}

            {confirmDelete && (
                <Modal
                    onClose={() => setConfirmDelete(null)}
                    title="Remove language?"
                    description={`"${confirmDelete.name}" will be removed from the language selector.`}
                    size="sm"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={deleteLang}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:brightness-110 transition-all"
                            >
                                <Trash2 size={13} className="inline mr-1.5 -mt-0.5" />
                                Remove
                            </button>
                        </>
                    }
                >
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                        Existing content already generated in this language is not affected.
                    </p>
                </Modal>
            )}
        </>
    );
}

// ─── Language chip ────────────────────────────────────────────────
function LanguageChip({
    lang,
    onEdit,
    onDelete,
}: {
    lang: SupportedLanguage;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <motion.span
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className={`group/chip relative inline-flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1 border text-on-surface text-xs font-bold transition-all ${
                lang.is_default
                    ? 'bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15'
                    : 'bg-primary/8 border-primary/15 hover:bg-primary/12'
            }`}
        >
            <button
                type="button"
                onClick={onEdit}
                title={lang.is_default ? 'Default — click to edit' : 'Edit language'}
                className="py-0.5 inline-flex items-center gap-1.5"
            >
                {lang.name}
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/70 leading-none">
                    {lang.code}
                </span>
                {lang.is_default && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700/80 leading-none">
                        default
                    </span>
                )}
            </button>
            <button
                type="button"
                onClick={onEdit}
                title="Edit language"
                className="w-5 h-5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-on-surface/10 flex items-center justify-center transition-colors"
            >
                <Pencil size={10} strokeWidth={2.5} />
            </button>
            <button
                type="button"
                onClick={onDelete}
                title="Remove language"
                className="w-5 h-5 rounded-full text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
            >
                <X size={11} strokeWidth={2.5} />
            </button>
        </motion.span>
    );
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Globe size={22} />
            </div>
            <p className="text-sm font-bold text-on-surface mb-1">
                No languages yet
            </p>
            <p className="text-xs text-on-surface-variant mb-5 max-w-sm mx-auto">
                Add at least one language so the selector has something to show.
            </p>
            <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all"
            >
                <Plus size={14} /> Add the first language
            </button>
        </div>
    );
}

/**
 * Suggest a default code from a language name. Used to autofill the
 * Code field while the admin is typing the Name — they can always
 * override it afterwards. Strategy:
 *   1. Lowercase, strip non-letters.
 *   2. Take the first 2 characters (the common ISO 639-1 case:
 *      "English" → "en", "Spanish" → "sp" — the admin can tighten
 *      it to "es" themselves).
 */
function slugifyName(name: string): string {
    return name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2);
}

/** Normalise admin-typed input the same way the backend validates it. */
function normalizeCode(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z-]/g, '').slice(0, 8);
}

/**
 * Mirror of the backend regex
 * (`AiContentController::updateGlobalConfig`):
 *     letters, optionally followed by letters / dashes, 2–8 chars.
 */
function isValidCode(code: string): boolean {
    return /^[a-z][a-z-]*$/.test(code) && code.length >= 2 && code.length <= 8;
}

// ─── Field helper ─────────────────────────────────────────────────
function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                {label}
            </label>
            {children}
            {hint && <p className="text-[11px] text-on-surface-variant mt-1.5">{hint}</p>}
        </div>
    );
}
