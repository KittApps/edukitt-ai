import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

import { useT } from '@/lib/i18n';

import ModalShell, { Field, fieldClasses } from './ModalShell';
import type { CategoryRow, FaqRow } from './types';

interface Props {
    categoryId: number;
    initial: FaqRow | null;
    categories: CategoryRow[];
    onClose: () => void;
}

export default function FaqEditorModal({
    categoryId,
    initial,
    categories,
    onClose,
}: Props) {
    const t = useT();
    const isEdit = initial !== null;

    const form = useForm({
        faq_category_id: initial?.faq_category_id ?? categoryId,
        question: initial?.question ?? '',
        answer: initial?.answer ?? '',
        is_active: initial?.is_active ?? true,
    });

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
            form.put(`/admin/support/faqs/${initial!.id}`, options);
        } else {
            form.post('/admin/support/faqs', options);
        }
    };

    return (
        <ModalShell
            title={
                isEdit
                    ? t('admin.support.editor_faq.edit_title', 'Edit FAQ')
                    : t('admin.support.editor_faq.create_title', 'New FAQ')
            }
            onClose={onClose}
            maxWidth="max-w-xl"
        >
            <form onSubmit={submit} className="space-y-4">
                <Field label={t('admin.support.field.category', 'Category')}>
                    <select
                        className={fieldClasses}
                        value={form.data.faq_category_id}
                        onChange={(e) =>
                            form.setData('faq_category_id', Number(e.target.value))
                        }
                    >
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label={t('admin.support.field.question', 'Question')}>
                    <input
                        autoFocus
                        className={fieldClasses}
                        value={form.data.question}
                        onChange={(e) => form.setData('question', e.target.value)}
                        placeholder={t(
                            'admin.support.field.question_placeholder',
                            'How do I…?',
                        )}
                    />
                    {form.errors.question && (
                        <p className="text-xs text-red-500 mt-1">
                            {form.errors.question}
                        </p>
                    )}
                </Field>

                <Field label={t('admin.support.field.answer', 'Answer')}>
                    <textarea
                        className={`${fieldClasses} min-h-40 resize-y leading-relaxed`}
                        value={form.data.answer}
                        onChange={(e) => form.setData('answer', e.target.value)}
                        placeholder={t(
                            'admin.support.field.answer_placeholder',
                            'Write a clear, helpful answer…',
                        )}
                    />
                    {form.errors.answer && (
                        <p className="text-xs text-red-500 mt-1">
                            {form.errors.answer}
                        </p>
                    )}
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
