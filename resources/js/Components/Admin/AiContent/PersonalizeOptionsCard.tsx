import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SlidersHorizontal,
    Plus,
    Pencil,
    Trash2,
    X,
    MoreHorizontal,
    RotateCcw,
    Save,
    Ban,
} from 'lucide-react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Modal } from '@/Components/Admin/Shared';

/**
 * Admin editor for the option groups shown on a task's create-wizard
 * "Personalize" step (e.g. Quick Learn: Format, Reading Time, Depth,
 * Tone). Two-level CRUD — groups and the options inside each group —
 * with explicit Save (POST to /admin/settings/ai-content/{task}/personalize).
 *
 * When rendered inside a tab panel, pass `embedded` to drop the outer
 * card chrome so it sits naturally inside the parent panel.
 */

export interface PersonalizeOption {
    id: string;
    value: string;
    is_default?: boolean;
}

export interface PersonalizeOptionGroup {
    id: string;
    label: string;
    description: string;
    options: PersonalizeOption[];
}

interface Props {
    taskKey: string;
    initialGroups: PersonalizeOptionGroup[];
    embedded?: boolean;
    /**
     * Reflects the task's `personalize_enabled` config column. When
     * false the editor stays fully editable (so admins can prep
     * options ahead of re-enabling) but we surface a red "Disabled"
     * pill in the header and a banner above the list so it's
     * obvious that end users currently bypass this step.
     */
    disabled?: boolean;
}

const inputClasses =
    'w-full bg-surface-container-low/50 border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

const emptyGroup: PersonalizeOptionGroup = {
    id: '',
    label: '',
    description: '',
    options: [],
};

const emptyOption: PersonalizeOption = {
    id: '',
    value: '',
    is_default: false,
};

type GroupEditor =
    | { mode: 'create' }
    | { mode: 'edit'; group: PersonalizeOptionGroup };

type OptionEditor =
    | { mode: 'create'; groupId: string }
    | { mode: 'edit'; groupId: string; option: PersonalizeOption };

const cloneGroups = (groups: PersonalizeOptionGroup[]): PersonalizeOptionGroup[] =>
    groups.map((g) => ({ ...g, options: g.options.map((o) => ({ ...o })) }));

export default function PersonalizeOptionsCard({
    taskKey,
    initialGroups,
    embedded = false,
    disabled = false,
}: Props) {
    const [groups, setGroups] = useState<PersonalizeOptionGroup[]>(() =>
        cloneGroups(initialGroups),
    );
    const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
        JSON.stringify(initialGroups),
    );
    const [saving, setSaving] = useState(false);

    const [groupDraft, setGroupDraft] = useState<PersonalizeOptionGroup | null>(null);
    const [groupEditor, setGroupEditor] = useState<GroupEditor | null>(null);
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<PersonalizeOptionGroup | null>(
        null,
    );

    const [optionDraft, setOptionDraft] = useState<PersonalizeOption | null>(null);
    const [optionEditor, setOptionEditor] = useState<OptionEditor | null>(null);

    const dirty = useMemo(
        () => JSON.stringify(groups) !== savedSnapshot,
        [groups, savedSnapshot],
    );

    const resetChanges = () => {
        setGroups(cloneGroups(JSON.parse(savedSnapshot) as PersonalizeOptionGroup[]));
    };

    const persist = async () => {
        setSaving(true);
        try {
            await axios.post(
                `/admin/settings/ai-content/${encodeURIComponent(taskKey)}/personalize`,
                { groups },
            );
            setSavedSnapshot(JSON.stringify(groups));
            router.reload({ only: ['personalizeGroups'] });
        } catch (error) {
            console.error('Failed to save personalize options:', error);
        } finally {
            setSaving(false);
        }
    };

    // ─── Group CRUD ────────────────────────────────────────────────
    const openCreateGroup = () => {
        setGroupEditor({ mode: 'create' });
        setGroupDraft({ ...emptyGroup });
    };
    const openEditGroup = (group: PersonalizeOptionGroup) => {
        setGroupEditor({ mode: 'edit', group });
        setGroupDraft({ ...group });
    };
    const closeGroupEditor = () => {
        setGroupEditor(null);
        setGroupDraft(null);
    };
    const saveGroup = () => {
        if (!groupDraft || !groupEditor) return;
        const id = groupDraft.id || slugify(groupDraft.label);
        const next: PersonalizeOptionGroup = { ...groupDraft, id };
        setGroups((prev) =>
            groupEditor.mode === 'create'
                ? [...prev, next]
                : prev.map((g) => (g.id === groupEditor.group.id ? next : g)),
        );
        closeGroupEditor();
    };
    const deleteGroup = () => {
        if (!confirmDeleteGroup) return;
        setGroups((prev) => prev.filter((g) => g.id !== confirmDeleteGroup.id));
        setConfirmDeleteGroup(null);
    };

    // ─── Option CRUD ───────────────────────────────────────────────
    const openCreateOption = (groupId: string) => {
        setOptionEditor({ mode: 'create', groupId });
        setOptionDraft({ ...emptyOption });
    };
    const openEditOption = (groupId: string, option: PersonalizeOption) => {
        setOptionEditor({ mode: 'edit', groupId, option });
        setOptionDraft({ ...option });
    };
    const closeOptionEditor = () => {
        setOptionEditor(null);
        setOptionDraft(null);
    };
    const saveOption = () => {
        if (!optionDraft || !optionEditor) return;
        const id = optionDraft.id || slugify(optionDraft.value);
        const next: PersonalizeOption = { ...optionDraft, id };
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== optionEditor.groupId) return g;
                let options =
                    optionEditor.mode === 'create'
                        ? [...g.options, next]
                        : g.options.map((o) =>
                              o.id === optionEditor.option.id ? next : o,
                          );
                // Enforce: only one default per group.
                if (next.is_default) {
                    options = options.map((o) =>
                        o.id === next.id ? o : { ...o, is_default: false },
                    );
                }
                return { ...g, options };
            }),
        );
        closeOptionEditor();
    };
    const deleteOption = (groupId: string, optionId: string) => {
        setGroups((prev) =>
            prev.map((g) =>
                g.id !== groupId
                    ? g
                    : { ...g, options: g.options.filter((o) => o.id !== optionId) },
            ),
        );
    };

    const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);

    const containerClass = embedded
        ? ''
        : 'bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden';

    const headerClass = embedded
        ? 'flex items-start justify-between gap-4 mb-5'
        : 'flex items-start justify-between gap-4 px-6 py-5 border-b border-surface-container';

    const listClass = embedded
        ? 'divide-y divide-surface-container border-t border-surface-container -mx-6 px-0'
        : 'divide-y divide-surface-container';

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={containerClass}
            >
                {/* Card header */}
                <div className={headerClass}>
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                            <SlidersHorizontal size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-headline font-extrabold text-base text-on-surface">
                                    Personalize Options
                                </h3>
                                {disabled ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                        <Ban size={10} /> Disabled
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
                                        {groups.length} groups · {totalOptions} options
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-xl">
                                Option groups shown on the wizard&apos;s Personalize step.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateGroup}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all flex-shrink-0 whitespace-nowrap"
                    >
                        <Plus size={14} /> Add group
                    </button>
                </div>

                {/* Disabled banner — surfaced when the task config
                    flag is OFF so it's obvious end users currently
                    bypass this step entirely. */}
                {disabled && (
                    <div
                        className={`flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 ${
                            embedded ? 'mb-4' : 'mx-6 mb-4'
                        }`}
                    >
                        <Ban size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Personalize step is disabled for this task.</p>
                            <p className="mt-0.5 text-red-700">
                                End users won&apos;t see this step on the generation form. You can
                                keep editing options here — they&apos;ll be ready when you re-enable
                                it from the Configuration tab.
                            </p>
                        </div>
                    </div>
                )}

                {/* Groups list */}
                {groups.length === 0 ? (
                    <EmptyState onAdd={openCreateGroup} embedded={embedded} />
                ) : (
                    <div className={listClass}>
                        <AnimatePresence initial={false}>
                            {groups.map((group) => (
                                <GroupSection
                                    key={group.id}
                                    group={group}
                                    embedded={embedded}
                                    onEditGroup={() => openEditGroup(group)}
                                    onDeleteGroup={() => setConfirmDeleteGroup(group)}
                                    onAddOption={() => openCreateOption(group.id)}
                                    onEditOption={(o) => openEditOption(group.id, o)}
                                    onDeleteOption={(o) => deleteOption(group.id, o.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Save / Reset footer */}
                <div
                    className={`flex items-center justify-between gap-3 ${
                        embedded
                            ? 'pt-4 mt-2 border-t border-surface-container'
                            : 'px-6 py-4 border-t border-surface-container'
                    }`}
                >
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                        {dirty ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Unsaved changes
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                All changes saved
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={resetChanges}
                            disabled={!dirty || saving}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RotateCcw size={13} />
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={persist}
                            disabled={!dirty || saving}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:brightness-110 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Save size={13} />
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Group editor modal */}
            {groupEditor && groupDraft && (
                <Modal
                    onClose={closeGroupEditor}
                    title={groupEditor.mode === 'create' ? 'Add group' : 'Edit group'}
                    description={
                        groupEditor.mode === 'create'
                            ? 'Create a new section of choices users can personalize.'
                            : 'Rename or rewrite the description of this section.'
                    }
                    size="lg"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeGroupEditor}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveGroup}
                                disabled={!groupDraft.label.trim()}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                {groupEditor.mode === 'create' ? 'Create group' : 'Save changes'}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-5">
                        <Field label="Group name" hint="Shown above the chip list in the wizard.">
                            <input
                                type="text"
                                value={groupDraft.label}
                                onChange={(e) =>
                                    setGroupDraft({ ...groupDraft, label: e.target.value })
                                }
                                placeholder="e.g. Audience"
                                className={inputClasses}
                                autoFocus
                            />
                        </Field>
                        <Field
                            label="Description"
                            hint="Optional helper text shown under the group label."
                        >
                            <textarea
                                value={groupDraft.description}
                                onChange={(e) =>
                                    setGroupDraft({
                                        ...groupDraft,
                                        description: e.target.value,
                                    })
                                }
                                rows={2}
                                placeholder="Who is this Quick Learn for?"
                                className={inputClasses}
                            />
                        </Field>
                    </div>
                </Modal>
            )}

            {/* Option editor modal */}
            {optionEditor && optionDraft && (
                <Modal
                    onClose={closeOptionEditor}
                    title={optionEditor.mode === 'create' ? 'Add option' : 'Edit option'}
                    description={
                        optionEditor.mode === 'create'
                            ? 'Add a new selectable chip to this group.'
                            : 'Update this option and its AI instructions.'
                    }
                    size="lg"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeOptionEditor}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveOption}
                                disabled={!optionDraft.value.trim()}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                {optionEditor.mode === 'create' ? 'Add option' : 'Save changes'}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-5">
                        <Field label="Label" hint="The text shown on the chip.">
                            <input
                                type="text"
                                value={optionDraft.value}
                                onChange={(e) =>
                                    setOptionDraft({ ...optionDraft, value: e.target.value })
                                }
                                placeholder="e.g. Mind Map"
                                className={inputClasses}
                                autoFocus
                            />
                        </Field>
                        <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low/50 border border-surface-container hover:bg-surface-container-low cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={Boolean(optionDraft.is_default)}
                                onChange={(e) =>
                                    setOptionDraft({
                                        ...optionDraft,
                                        is_default: e.target.checked,
                                    })
                                }
                                className="mt-0.5 h-4 w-4 rounded border-surface-container text-primary focus:ring-primary/40"
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-on-surface">
                                    Default selected
                                </span>
                                <span className="block text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                                    Pre-select this option in the wizard.
                                </span>
                            </span>
                        </label>
                    </div>
                </Modal>
            )}

            {/* Delete group confirmation */}
            {confirmDeleteGroup && (
                <Modal
                    onClose={() => setConfirmDeleteGroup(null)}
                    title="Delete group?"
                    description={`"${confirmDeleteGroup.label}" and its ${confirmDeleteGroup.options.length} option(s) will be removed from the wizard.`}
                    size="sm"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteGroup(null)}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={deleteGroup}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:brightness-110 transition-all"
                            >
                                Delete group
                            </button>
                        </>
                    }
                >
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                        Existing Quick Learns generated with these choices are not affected.
                    </p>
                </Modal>
            )}
        </>
    );
}

// ─── Group section ────────────────────────────────────────────────
function GroupSection({
    group,
    embedded,
    onEditGroup,
    onDeleteGroup,
    onAddOption,
    onEditOption,
    onDeleteOption,
}: {
    group: PersonalizeOptionGroup;
    embedded: boolean;
    onEditGroup: () => void;
    onDeleteGroup: () => void;
    onAddOption: () => void;
    onEditOption: (option: PersonalizeOption) => void;
    onDeleteOption: (option: PersonalizeOption) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <motion.section
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className={embedded ? 'px-6 py-5' : 'px-6 py-5'}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-on-surface">{group.label}</h4>
                        <code className="text-[10px] font-mono text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded">
                            {group.id}
                        </code>
                    </div>
                    {group.description && (
                        <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                            {group.description}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onAddOption}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] font-bold rounded-lg transition-colors"
                    >
                        <Plus size={12} /> Option
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setMenuOpen((v) => !v)}
                            onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
                            title="Group actions"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                        >
                            <MoreHorizontal size={14} />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-surface-container bg-surface shadow-lg overflow-hidden z-10"
                                >
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setMenuOpen(false);
                                            onEditGroup();
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low text-left transition-colors"
                                    >
                                        <Pencil size={13} /> Edit group
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setMenuOpen(false);
                                            onDeleteGroup();
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 text-left transition-colors"
                                    >
                                        <Trash2 size={13} /> Delete group
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Chips */}
            {group.options.length === 0 ? (
                <div className="flex items-center gap-2">
                    <p className="text-xs text-on-surface-variant italic">
                        No options yet.
                    </p>
                    <button
                        type="button"
                        onClick={onAddOption}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                        <Plus size={12} /> Add the first one
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 flex-wrap">
                    <AnimatePresence initial={false}>
                        {group.options.map((option) => (
                            <OptionChip
                                key={option.id}
                                option={option}
                                onEdit={() => onEditOption(option)}
                                onDelete={() => onDeleteOption(option)}
                            />
                        ))}
                    </AnimatePresence>
                    <button
                        type="button"
                        onClick={onAddOption}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-surface-container hover:border-primary/40 hover:bg-primary/5 text-on-surface-variant hover:text-primary text-xs font-bold rounded-full transition-all"
                    >
                        <Plus size={12} /> Add option
                    </button>
                </div>
            )}
        </motion.section>
    );
}

// ─── Option chip ──────────────────────────────────────────────────
function OptionChip({
    option,
    onEdit,
    onDelete,
}: {
    option: PersonalizeOption;
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
            className="group/chip relative inline-flex items-center gap-1 rounded-full pl-3 pr-1.5 py-1 border bg-primary/8 border-primary/15 text-on-surface text-xs font-bold transition-all hover:bg-primary/12"
        >
            <button
                type="button"
                onClick={onEdit}
                title={option.is_default ? 'Default — click to edit' : 'Edit'}
                className="py-0.5 inline-flex items-center gap-1.5"
            >
                {option.value}
                {option.is_default && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 leading-none">
                        default
                    </span>
                )}
            </button>
            <button
                type="button"
                onClick={onDelete}
                title="Delete option"
                className="w-5 h-5 rounded-full text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
            >
                <X size={11} strokeWidth={2.5} />
            </button>
        </motion.span>
    );
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyState({
    onAdd,
    embedded,
}: {
    onAdd: () => void;
    embedded: boolean;
}) {
    return (
        <div className={`text-center ${embedded ? 'py-10' : 'px-6 py-12'}`}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <SlidersHorizontal size={22} />
            </div>
            <p className="text-sm font-bold text-on-surface mb-1">No groups yet</p>
            <p className="text-xs text-on-surface-variant mb-5 max-w-sm mx-auto">
                Add your first option group — Format, Tone, Audience, anything — and it will
                appear in the Quick Learn create wizard for users.
            </p>
            <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all"
            >
                <Plus size={14} /> Add your first group
            </button>
        </div>
    );
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

function slugify(s: string): string {
    return (
        s
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || `item_${Date.now().toString(36)}`
    );
}
