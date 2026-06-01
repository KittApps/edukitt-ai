import { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '@/Components/Admin/Shared';
import type { Language } from './types';

interface Props {
    languages: Language[];
    onClose: () => void;
}

export default function ExportTranslationsModal({ languages, onClose }: Props) {
    const [selected, setSelected] = useState<string>('all');

    const handleExport = () => {
        const url =
            selected === 'all'
                ? '/admin/settings/localization/export'
                : `/admin/settings/localization/export?language=${encodeURIComponent(selected)}`;
        window.location.href = url;
        onClose();
    };

    return (
        <Modal
            onClose={onClose}
            title="Export Translations"
            description="Download a CSV with language metadata + translation values. Re-importable on this page."
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
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110"
                    >
                        <Download size={14} /> Download CSV
                    </button>
                </>
            }
        >
            <div className="space-y-3">
                <Label>Language</Label>
                <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className={inputCls}
                >
                    <option value="all">All languages</option>
                    {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.flag ? `${lang.flag} ` : ''}
                            {lang.name} ({lang.code}){lang.is_default ? ' · default' : ''}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-on-surface-variant">
                    Picking one language produces a CSV with only that language column in the
                    TRANSLATIONS section. Re-import is column-scoped so other languages stay
                    untouched.
                </p>
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
