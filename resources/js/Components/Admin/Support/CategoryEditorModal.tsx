import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useState } from 'react';

import { useT } from '@/lib/i18n';

import ModalShell, { Field, fieldClasses } from './ModalShell';
import type { CategoryRow } from './types';

interface Props {
    initial: CategoryRow | null;
    onClose: () => void;
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

export default function CategoryEditorModal({ initial, onClose }: Props) {
    const t = useT();
    const isEdit = initial !== null;
    const [slugTouched, setSlugTouched] = useState(isEdit);

    const form = useForm({
        name: initial?.name ?? '',
        slug: initial?.slug ?? '',
        icon: initial?.icon ?? '',
        is_active: initial?.is_active ?? true,
    });

    const handleNameChange = (next: string) => {
        form.setData('name', next);
        if (!slugTouched) {
            form.setData('slug', slugify(next));
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        };
        if (isEdit) {
            form.put(`/admin/support/categories/${initial!.id}`, options);
        } else {
            form.post('/admin/support/categories', options);
        }
    };

    return (
        <ModalShell
            title={
                isEdit
                    ? t('admin.support.editor_category.edit_title', 'Edit category')
                    : t('admin.support.editor_category.create_title', 'New category')
            }
            onClose={onClose}
        >
            <form onSubmit={submit} className="space-y-4">
                <Field label={t('admin.support.field.name', 'Name')}>
                    <input
                        autoFocus
                        className={fieldClasses}
                        value={form.data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder={t(
                            'admin.support.field.name_placeholder',
                            'Getting started',
                        )}
                    />
                    {form.errors.name && (
                        <p className="text-xs text-red-500 mt-1">{form.errors.name}</p>
                    )}
                </Field>

                <Field label={t('admin.support.field.slug', 'Slug')}>
                    <input
                        className={`${fieldClasses} font-mono`}
                        value={form.data.slug}
                        onChange={(e) => {
                            setSlugTouched(true);
                            form.setData('slug', e.target.value);
                        }}
                        placeholder="getting-started"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">
                        {t(
                            'admin.support.field.slug_hint',
                            'Lowercase, numbers and dashes only. Used in URLs.',
                        )}
                    </p>
                    {form.errors.slug && (
                        <p className="text-xs text-red-500 mt-1">{form.errors.slug}</p>
                    )}
                </Field>

                <Field label={t('admin.support.field.icon', 'Icon')}>
                    <input
                        className={fieldClasses}
                        value={form.data.icon ?? ''}
                        onChange={(e) => form.setData('icon', e.target.value)}
                        placeholder="BookOpen"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">
                        {t(
                            'admin.support.field.icon_hint',
                            'Optional lucide-react icon name (e.g. BookOpen, Sparkles, CreditCard).',
                        )}
                    </p>
                </Field>

                <label className="flex items-center gap-2 text-sm font-bold text-on-surface">
                    <input
                        type="checkbox"
                        checked={form.data.is_active}
                        onChange={(e) => form.setData('is_active', e.target.checked)}
                    />
                    {t('admin.support.field.active', 'Active')}
                </label>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container"
                    >
                        {t('admin.support.cancel', 'Cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:brightness-110 disabled:opacity-50"
                    >
                        <Save size={14} />{' '}
                        {form.processing
                            ? t('admin.support.saving', 'Saving…')
                            : t('admin.support.save', 'Save')}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
