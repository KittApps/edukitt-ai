import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useT } from '@/lib/i18n';

import ModalShell from './ModalShell';

interface Props {
    title: string;
    description?: string;
    confirmLabel?: string;
    url: string;
    onClose: () => void;
}

export default function ConfirmDeleteModal({
    title,
    description,
    confirmLabel,
    url,
    onClose,
}: Props) {
    const t = useT();
    const [pending, setPending] = useState(false);

    const handleDelete = () => {
        setPending(true);
        router.delete(url, {
            preserveScroll: true,
            onFinish: () => {
                setPending(false);
                onClose();
            },
        });
    };

    return (
        <ModalShell title={title} onClose={onClose}>
            <p className="text-sm text-on-surface-variant">
                {description ??
                    t(
                        'admin.support.delete_default_desc',
                        'This action cannot be undone.',
                    )}
            </p>

            <div className="mt-6 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container"
                >
                    {t('admin.support.cancel', 'Cancel')}
                </button>
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={pending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:brightness-110 disabled:opacity-50"
                >
                    <Trash2 size={14} />{' '}
                    {pending
                        ? t('admin.support.deleting', 'Deleting…')
                        : (confirmLabel ?? t('admin.support.delete', 'Delete'))}
                </button>
            </div>
        </ModalShell>
    );
}
