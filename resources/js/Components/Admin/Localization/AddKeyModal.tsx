import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Braces, Plus } from 'lucide-react';
import { Modal } from '@/Components/Admin/Shared';

interface Props {
    onClose: () => void;
}

export default function AddKeyModal({ onClose }: Props) {
    const [form, setForm] = useState({ key: '', source: '' });
    const [submitting, setSubmitting] = useState(false);

    const submit = () => {
        if (!form.key || !form.source) return;
        setSubmitting(true);
        router.post('/admin/settings/localization/keys', form, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <Modal
            onClose={onClose}
            title="Add Translation Key"
            description="Manually add a new key. Duplicates with the same key are ignored."
            size="lg"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50"
                    >
                        <Plus size={14} /> {submitting ? 'Adding...' : 'Add Key'}
                    </button>
                </>
            }
        >
            <div className="space-y-3">
                <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">
                        Key
                    </label>
                    <input
                        value={form.key}
                        onChange={(e) => setForm({ ...form, key: e.target.value })}
                        placeholder="e.g. courses.detail.share_button"
                        className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 font-mono"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">
                        Dot-separated. First segment is the group (e.g. <code>courses</code>).
                    </p>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">
                        Source (English)
                    </label>
                    <textarea
                        rows={3}
                        value={form.source}
                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                        placeholder="e.g. Welcome back, {name}"
                        className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
                        <Braces size={10} />
                        Use <code className="font-mono font-bold">{'{name}'}</code> for dynamic
                        values — placeholders are auto-detected and must be preserved in every
                        translation.
                    </p>
                </div>
            </div>
        </Modal>
    );
}
