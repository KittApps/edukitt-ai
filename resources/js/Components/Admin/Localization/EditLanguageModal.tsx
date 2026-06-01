import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { Modal } from '@/Components/Admin/Shared';
import type { Language } from './types';

interface Props {
    language: Language;
    onClose: () => void;
}

export default function EditLanguageModal({ language, onClose }: Props) {
    const [form, setForm] = useState({
        name: language.name,
        native_name: language.native_name,
        flag: language.flag ?? '',
        direction: language.direction,
    });
    const [submitting, setSubmitting] = useState(false);

    const submit = () => {
        if (!form.name || !form.native_name) return;
        setSubmitting(true);
        router.patch(
            `/admin/settings/localization/languages/${language.code}`,
            form,
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Modal
            onClose={onClose}
            title="Edit Language"
            description="Update the display name, flag, or text direction. The language code cannot be changed."
            size="md"
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
                        <Check size={14} /> {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </>
            }
        >
            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <Label>Language Code</Label>
                        <input
                            value={language.code}
                            disabled
                            className={inputCls + ' font-mono opacity-60 cursor-not-allowed'}
                        />
                    </div>
                    <div>
                        <Label>Flag</Label>
                        <input
                            value={form.flag}
                            onChange={(e) => setForm({ ...form, flag: e.target.value })}
                            placeholder="🇵🇹"
                            className={inputCls + ' text-center'}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>English Name</Label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Portuguese"
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <Label>Native Name</Label>
                        <input
                            value={form.native_name}
                            onChange={(e) =>
                                setForm({ ...form, native_name: e.target.value })
                            }
                            placeholder="Português"
                            className={inputCls}
                        />
                    </div>
                </div>
                <div>
                    <Label>Direction</Label>
                    <select
                        value={form.direction}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                direction: e.target.value as 'ltr' | 'rtl',
                            })
                        }
                        className={inputCls}
                    >
                        <option value="ltr">Left to Right (LTR)</option>
                        <option value="rtl">Right to Left (RTL)</option>
                    </select>
                </div>
            </div>
        </Modal>
    );
}

const inputCls =
    'w-full bg-surface-container-low border border-surface-container rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30';

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">
            {children}
        </label>
    );
}
