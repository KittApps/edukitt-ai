import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, FileUp, Upload } from 'lucide-react';
import { Modal, Toggle } from '@/Components/Admin/Shared';
import type { PageProps } from '@/types';

interface Props {
    onClose: () => void;
    onImported?: () => void;
}

interface ImportResult {
    summary: string;
    errors: Array<{ row: number; message: string }>;
    languages_created: number;
    languages_updated: number;
    keys_created: number;
    sources_updated: number;
    translations_updated: number;
    rows_skipped: number;
}

export default function ImportTranslationsModal({ onClose, onImported }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [overwriteEmpty, setOverwriteEmpty] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const { props } = usePage<PageProps<{ flash?: { locale_import?: ImportResult | null } }>>();
    const result = props.flash?.locale_import ?? null;

    const submit = () => {
        if (!file) {
            setValidationError('Please choose a CSV file to upload.');
            return;
        }
        setValidationError(null);
        setSubmitting(true);

        router.post(
            '/admin/settings/localization/import',
            {
                file,
                overwrite_empty: overwriteEmpty,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    onImported?.();
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    if (typeof first === 'string' && first.length > 0) {
                        setValidationError(first);
                    } else {
                        setValidationError('Upload failed. Please check the file and try again.');
                    }
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const hasErrors = (result?.errors?.length ?? 0) > 0;
    const showResultBanner = result !== null;

    return (
        <Modal
            onClose={onClose}
            title="Import Translations"
            description="Upload a CSV exported from this page. Only columns present in the file are updated."
            size="lg"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low"
                    >
                        Close
                    </button>
                    <button
                        onClick={submit}
                        disabled={submitting || !file}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50"
                    >
                        <Upload size={14} /> {submitting ? 'Importing...' : 'Import CSV'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <FileDrop file={file} onChange={setFile} />

                <div className="space-y-2.5 rounded-xl border border-surface-container bg-surface-container-low/40 px-4 py-3">
                    <ToggleRow
                        id="overwrite-empty"
                        label="Overwrite with empty cells"
                        hint="By default an empty cell is skipped so existing values are preserved."
                        checked={overwriteEmpty}
                        onChange={setOverwriteEmpty}
                    />
                    <p className="text-[11px] text-on-surface-variant pt-1.5 border-t border-surface-container leading-snug">
                        If the file contains a LANGUAGES section, any new language codes are
                        auto-created before the translations are applied.
                    </p>
                </div>

                {validationError !== null && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-800">
                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{validationError}</span>
                    </div>
                )}

                {showResultBanner && result !== null && (
                    <ResultBanner result={result} hasErrors={hasErrors} />
                )}

                {hasErrors && result !== null && <ErrorList errors={result.errors} />}
            </div>
        </Modal>
    );
}

function FileDrop({
    file,
    onChange,
}: {
    file: File | null;
    onChange: (f: File | null) => void;
}) {
    return (
        <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-surface-container bg-surface-container-low/40 px-4 py-5 cursor-pointer hover:border-primary/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileUp size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface truncate">
                    {file ? file.name : 'Choose a CSV file'}
                </p>
                <p className="text-xs text-on-surface-variant">
                    {file
                        ? `${(file.size / 1024).toFixed(1)} KB — click to replace`
                        : 'Max 10 MB · UTF-8 encoded'}
                </p>
            </div>
            <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
        </label>
    );
}

function ToggleRow({
    id,
    label,
    hint,
    checked,
    onChange,
}: {
    id: string;
    label: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label
            htmlFor={id}
            className="flex items-center justify-between gap-3 cursor-pointer"
        >
            <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">{label}</p>
                <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">{hint}</p>
            </div>
            <div className="flex-shrink-0">
                <Toggle id={id} checked={checked} onChange={onChange} />
            </div>
        </label>
    );
}

function ResultBanner({ result, hasErrors }: { result: ImportResult; hasErrors: boolean }) {
    const tone = hasErrors
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-emerald-200 bg-emerald-50 text-emerald-900';
    const Icon = hasErrors ? AlertCircle : CheckCircle2;

    return (
        <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${tone}`}>
            <Icon size={14} className="mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
                <p className="text-xs font-bold">{result.summary}</p>
                {hasErrors && (
                    <p className="text-[11px] mt-0.5">
                        {result.errors.length} row(s) failed — details below.
                    </p>
                )}
            </div>
        </div>
    );
}

function ErrorList({ errors }: { errors: ImportResult['errors'] }) {
    return (
        <div className="rounded-xl border border-red-200 bg-red-50/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-red-200 bg-red-100/60 flex items-center gap-2">
                <AlertCircle size={13} className="text-red-700" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-red-800">
                    Errors ({errors.length})
                </p>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-red-100">
                {errors.map((e, i) => (
                    <div key={i} className="px-3 py-2 flex items-start gap-2 text-xs">
                        <span className="font-mono font-bold text-red-700 flex-shrink-0">
                            {e.row > 0 ? `Row ${e.row}` : 'File'}
                        </span>
                        <span className="text-red-900 leading-snug">{e.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
