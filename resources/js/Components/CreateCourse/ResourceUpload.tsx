import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, FileText, Upload, X } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface Props {
    resources: File[];
    setResources: (files: File[]) => void;
    /**
     * Admin-set cap from `ai_content_tasks.resources_max_files`.
     * Files dropped or selected beyond this count are silently rejected
     * with a transient banner explaining what was skipped and why.
     * Defaults to a sensible 5 if the wizard mounts before the config
     * snapshot has loaded (shouldn't happen in practice).
     */
    maxFiles?: number;
    /**
     * Admin-set per-file size cap in megabytes from
     * `ai_content_tasks.resources_max_file_size_mb`. Both the visible
     * hint text and the client-side gating use this; the server enforces
     * the same value as a `file|max:KB` rule so a bypassed client still
     * fails cleanly.
     */
    maxFileSizeMb?: number;
}

/**
 * Per-rejection record kept just long enough to show the user why a
 * file didn't end up in the list. Cleared the next time they touch
 * the picker so the banner doesn't linger forever.
 */
interface Rejection {
    name: string;
    reason: 'size' | 'count';
}

export default function ResourceUpload({
    resources,
    setResources,
    maxFiles = 5,
    maxFileSizeMb = 10,
}: Props) {
    const t = useT();

    const maxFileSizeBytes = useMemo(
        () => Math.max(1, maxFileSizeMb) * 1024 * 1024,
        [maxFileSizeMb],
    );

    // Transient rejection list. The banner shows one line per file
    // the user just dropped/selected that we had to skip — clears as
    // soon as they interact with the picker again, no auto-timer
    // needed.
    const [rejections, setRejections] = useState<Rejection[]>([]);

    const atCapacity = resources.length >= maxFiles;
    const remainingSlots = Math.max(0, maxFiles - resources.length);

    /**
     * Merge a freshly dropped/selected batch into the resources list,
     * respecting both the per-file size cap and the total file count
     * cap. Records what was skipped so we can tell the user about it.
     */
    const acceptBatch = useCallback(
        (incoming: File[]) => {
            const nextRejections: Rejection[] = [];
            const sizeAllowed: File[] = [];

            for (const file of incoming) {
                if (file.size > maxFileSizeBytes) {
                    nextRejections.push({ name: file.name, reason: 'size' });
                    continue;
                }
                sizeAllowed.push(file);
            }

            const slotsLeft = Math.max(0, maxFiles - resources.length);
            const kept = sizeAllowed.slice(0, slotsLeft);
            const dropped = sizeAllowed.slice(slotsLeft);
            for (const file of dropped) {
                nextRejections.push({ name: file.name, reason: 'count' });
            }

            if (kept.length > 0) {
                setResources([...resources, ...kept]);
            }
            setRejections(nextRejections);
        },
        [maxFileSizeBytes, maxFiles, resources, setResources],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            acceptBatch(Array.from(e.dataTransfer.files));
        },
        [acceptBatch],
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        acceptBatch(Array.from(e.target.files));
        // Reset so re-picking the same file fires onChange again.
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setResources(resources.filter((_, i) => i !== index));
        setRejections([]);
    };

    // Dynamic hint reads straight from the admin config so admins can
    // tweak the cap without a frontend deploy.
    const hint = t(
        'courses.resources.dropzone.hint',
        'PDF, DOC, TXT, MD — max {sizeMb}MB each, up to {maxFiles} files',
        { sizeMb: maxFileSizeMb, maxFiles },
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-2">
                    {t('courses.resources.heading', 'Add Resources')}
                </h2>
                <p className="text-sm text-on-surface-variant">
                    {t(
                        'courses.resources.description',
                        'Upload files to enrich your course with additional context. (Optional)',
                    )}
                </p>
            </div>

            <div
                onDrop={atCapacity ? (e) => e.preventDefault() : handleDrop}
                onDragOver={(e) => e.preventDefault()}
                aria-disabled={atCapacity}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all bg-surface-container-lowest group ${
                    atCapacity
                        ? 'border-surface-container opacity-60 cursor-not-allowed'
                        : 'border-surface-container hover:border-primary/30 cursor-pointer'
                }`}
            >
                <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md"
                    disabled={atCapacity}
                />
                <label
                    htmlFor="file-upload"
                    className={atCapacity ? 'cursor-not-allowed' : 'cursor-pointer'}
                >
                    <Upload
                        size={32}
                        className="mx-auto mb-4 text-outline-variant group-hover:text-primary transition-colors"
                    />
                    <p className="font-bold text-on-surface mb-1">
                        {atCapacity
                            ? t(
                                  'courses.resources.dropzone.full',
                                  'Maximum files reached',
                              )
                            : t(
                                  'courses.resources.dropzone.title',
                                  'Drop files here or click to browse',
                              )}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                        {atCapacity
                            ? t(
                                  'courses.resources.dropzone.full_hint',
                                  'Remove a file below to add another (up to {maxFiles}).',
                                  { maxFiles },
                              )
                            : hint}
                    </p>
                </label>
            </div>

            {rejections.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                        <p className="font-semibold">
                            {t(
                                'courses.resources.rejected.title',
                                "Some files weren't added:",
                            )}
                        </p>
                        <ul className="list-disc list-inside space-y-0.5">
                            {rejections.map((r) => (
                                <li key={`${r.name}-${r.reason}`}>
                                    <span className="font-medium">{r.name}</span>{' '}
                                    —{' '}
                                    {r.reason === 'size'
                                        ? t(
                                              'courses.resources.rejected.size',
                                              'exceeds {sizeMb}MB',
                                              { sizeMb: maxFileSizeMb },
                                          )
                                        : t(
                                              'courses.resources.rejected.count',
                                              'over the {maxFiles}-file limit',
                                              { maxFiles },
                                          )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {resources.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {t(
                            'courses.resources.list.label',
                            '{used} of {maxFiles} files',
                            { used: resources.length, maxFiles },
                        )}
                        {remainingSlots === 0
                            ? ` · ${t('courses.resources.list.full_suffix', 'full')}`
                            : ''}
                    </p>
                    {resources.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between bg-surface-container-lowest rounded-xl p-4 border border-surface-container"
                        >
                            <div className="flex items-center gap-3">
                                <FileText size={18} className="text-primary" />
                                <div>
                                    <p className="text-sm font-semibold text-on-surface">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-on-surface-variant">
                                        {formatBytes(file.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-red-500"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Compact human-friendly file size — bytes up to 1KB, kilobytes up to
 * 1MB, megabytes thereafter. Avoids confusing "0.0 KB" for tiny test
 * files and "1240.3 KB" instead of "1.2 MB" for larger ones.
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
