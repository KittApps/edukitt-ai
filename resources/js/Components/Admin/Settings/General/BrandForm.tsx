import { useForm } from '@inertiajs/react';
import { Image as ImageIcon, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';
import { inputClasses } from './styles';

export interface BrandBlock {
    name: string | null;
    logo: string | null;
    logo_dark: string | null;
    favicon: string | null;
}

interface Props {
    initial: BrandBlock;
}

interface FormShape {
    site_name: string;
    logo: File | null;
    logo_dark: File | null;
    favicon: File | null;
    remove_logo: boolean;
    remove_logo_dark: boolean;
    remove_favicon: boolean;
}

type AssetKey = 'logo' | 'logo_dark' | 'favicon';
type RemoveKey = 'remove_logo' | 'remove_logo_dark' | 'remove_favicon';

export default function BrandForm({ initial }: Props) {
    const t = useT();
    const form = useForm<FormShape>({
        site_name: initial.name ?? '',
        logo: null,
        logo_dark: null,
        favicon: null,
        remove_logo: false,
        remove_logo_dark: false,
        remove_favicon: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/general/brand', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () =>
                form.reset(
                    'logo',
                    'logo_dark',
                    'favicon',
                    'remove_logo',
                    'remove_logo_dark',
                    'remove_favicon',
                ),
        });
    };

    return (
        <EditorPane
            icon={<Sparkles size={22} />}
            title={t('admin.general.brand.title', 'Brand')}
            description={t(
                'admin.general.brand.description',
                'Display name, logos and favicon used by the public site, app shell and emails.',
            )}
            onSubmit={submit}
        >
            <div>
                <label
                    htmlFor="brand-name"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.general.brand.name', 'Brand name')}
                </label>
                <input
                    id="brand-name"
                    type="text"
                    value={form.data.site_name}
                    onChange={(e) => form.setData('site_name', e.target.value)}
                    placeholder="EduKitt"
                    className={inputClasses}
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                    {t(
                        'admin.general.brand.name_hint',
                        'Shown as a text fallback whenever no logo is uploaded.',
                    )}
                </p>
                {form.errors.site_name && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.site_name}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AssetUploader
                    label={t('admin.general.brand.logo', 'Logo (light)')}
                    hint={t(
                        'admin.general.brand.logo_hint',
                        'PNG or SVG up to 5 MB.',
                    )}
                    previewBg="bg-surface-container-low/60"
                    currentUrl={initial.logo}
                    file={form.data.logo}
                    onFile={(file) => {
                        form.setData('logo', file);
                        form.setData('remove_logo', false);
                    }}
                    remove={form.data.remove_logo}
                    onRemoveToggle={(v) => {
                        form.setData('remove_logo', v);
                        if (v) form.setData('logo', null);
                    }}
                    error={form.errors.logo}
                    accept="image/*"
                    stacked
                />

                <AssetUploader
                    label={t('admin.general.brand.logo_dark', 'Logo (dark)')}
                    hint={t(
                        'admin.general.brand.logo_dark_hint',
                        'Optional. Used by dark themes.',
                    )}
                    previewBg="bg-[#111] text-white"
                    currentUrl={initial.logo_dark}
                    file={form.data.logo_dark}
                    onFile={(file) => {
                        form.setData('logo_dark', file);
                        form.setData('remove_logo_dark', false);
                    }}
                    remove={form.data.remove_logo_dark}
                    onRemoveToggle={(v) => {
                        form.setData('remove_logo_dark', v);
                        if (v) form.setData('logo_dark', null);
                    }}
                    error={form.errors.logo_dark}
                    accept="image/*"
                    stacked
                />
            </div>

            <AssetUploader
                label={t('admin.general.brand.favicon', 'Favicon')}
                hint={t(
                    'admin.general.brand.favicon_hint',
                    'ICO, PNG or SVG up to 1 MB. Shown in browser tabs.',
                )}
                previewBg="bg-surface-container-low/60"
                currentUrl={initial.favicon}
                file={form.data.favicon}
                onFile={(file) => {
                    form.setData('favicon', file);
                    form.setData('remove_favicon', false);
                }}
                remove={form.data.remove_favicon}
                onRemoveToggle={(v) => {
                    form.setData('remove_favicon', v);
                    if (v) form.setData('favicon', null);
                }}
                error={form.errors.favicon}
                accept=".ico,image/png,image/svg+xml,image/x-icon"
                small
            />

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t('admin.general.brand.save', 'Save brand')}
            </button>
        </EditorPane>
    );
}

interface AssetUploaderProps {
    label: string;
    hint: string;
    previewBg: string;
    currentUrl: string | null;
    file: File | null;
    onFile: (file: File | null) => void;
    remove: boolean;
    onRemoveToggle: (v: boolean) => void;
    error?: string;
    accept: string;
    small?: boolean;
    stacked?: boolean;
}

function AssetUploader({
    label,
    hint,
    previewBg,
    currentUrl,
    file,
    onFile,
    remove,
    onRemoveToggle,
    error,
    accept,
    small,
    stacked,
}: AssetUploaderProps) {
    const t = useT();
    const inputId = `asset-${label.replace(/\s+/g, '-').toLowerCase()}`;
    const [localPreview, setLocalPreview] = useState<string | null>(null);

    const handleFile = (next: File | null) => {
        onFile(next);
        setLocalPreview(next ? URL.createObjectURL(next) : null);
    };

    const showCurrent = !remove && currentUrl && !file;
    const previewUrl = file ? localPreview : showCurrent ? currentUrl : null;

    const previewBoxClasses = stacked
        ? 'h-24 w-full'
        : small
          ? 'h-16 w-16'
          : 'h-20 w-32';

    return (
        <div>
            <label
                htmlFor={inputId}
                className="block text-sm font-bold text-on-surface mb-2"
            >
                {label}
            </label>
            <div className={stacked ? 'space-y-3' : 'flex items-stretch gap-3'}>
                <div
                    className={`flex-shrink-0 ${previewBoxClasses} rounded-xl border border-surface-container ${previewBg} flex items-center justify-center overflow-hidden`}
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                        />
                    ) : (
                        <ImageIcon
                            size={20}
                            className="text-on-surface-variant/60"
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <input
                        type="file"
                        id={inputId}
                        className="hidden"
                        accept={accept}
                        onChange={(e) =>
                            handleFile(e.target.files?.[0] ?? null)
                        }
                    />
                    <div className="flex flex-wrap gap-1.5">
                        <label
                            htmlFor={inputId}
                            className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-colors"
                        >
                            <Upload size={12} />
                            {file
                                ? truncate(file.name, 20)
                                : currentUrl
                                  ? t(
                                        'admin.general.brand.replace',
                                        'Replace',
                                    )
                                  : t('admin.general.brand.upload', 'Upload')}
                        </label>

                        {currentUrl && (
                            <button
                                type="button"
                                onClick={() => onRemoveToggle(!remove)}
                                className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-bold transition-colors ${
                                    remove
                                        ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                                        : 'text-on-surface-variant hover:bg-surface-container-low'
                                }`}
                            >
                                <Trash2 size={11} />
                                {remove
                                    ? t(
                                          'admin.general.brand.will_remove',
                                          'Will remove',
                                      )
                                    : t('admin.general.brand.remove', 'Remove')}
                            </button>
                        )}
                    </div>

                    <p className="text-[10px] text-on-surface-variant mt-1.5">
                        {hint}
                    </p>
                    {error && (
                        <p className="text-xs text-red-600 mt-1">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
