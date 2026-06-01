import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    Sparkles,
    XCircle,
} from 'lucide-react';
import { Modal, Toggle } from '@/Components/Admin/Shared';

interface Props {
    onClose: () => void;
    onFinished?: () => void;
}

interface TargetLanguage {
    code: string;
    name: string;
    native_name: string;
    flag: string | null;
}

interface ProviderModel {
    id: number;
    name: string;
    model_id: string;
}

interface ProviderOption {
    id: number;
    name: string;
    slug: string;
    models: ProviderModel[];
}

interface OptionsResponse {
    languages: TargetLanguage[];
    groups: string[];
    providers: ProviderOption[];
}

interface BatchResponse {
    translated: number;
    skipped: number;
    remaining_before: number;
    remaining_after: number;
    done: boolean;
    errors: Array<{ key: string; message: string }>;
}

interface SavedSettings {
    languageCode?: string;
    group?: string;
    scope?: 'missing' | 'all';
    providerId?: number;
    modelId?: number;
    temperature?: number;
    maxTokens?: number;
}

const COOKIE_NAME = 'admin_ai_translate_settings';
const COOKIE_TTL_DAYS = 90;

const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 4096;

export default function AiTranslateModal({ onClose, onFinished }: Props) {
    const [options, setOptions] = useState<OptionsResponse | null>(null);
    const [optionsError, setOptionsError] = useState<string | null>(null);

    const [languageCode, setLanguageCode] = useState('');
    const [group, setGroup] = useState('');
    const [scope, setScope] = useState<'missing' | 'all'>('missing');
    const [providerId, setProviderId] = useState<number | null>(null);
    const [modelId, setModelId] = useState<number | null>(null);
    const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
    const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
    const [rememberSelection, setRememberSelection] = useState(true);

    const [phase, setPhase] = useState<'form' | 'running' | 'finished'>('form');
    const [progress, setProgress] = useState({
        total: 0,
        translated: 0,
        skipped: 0,
    });
    const [errors, setErrors] = useState<BatchResponse['errors']>([]);
    const [batchError, setBatchError] = useState<string | null>(null);
    const [aborting, setAborting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        axios
            .get<OptionsResponse>('/admin/settings/localization/ai-translate/options')
            .then((res) => {
                if (cancelled) return;
                setOptions(res.data);

                const saved = readSavedSettings();
                applyDefaults(res.data, saved);
            })
            .catch(() => {
                if (cancelled) return;
                setOptionsError('Failed to load options. Please reload the page.');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const applyDefaults = (data: OptionsResponse, saved: SavedSettings | null) => {
        const lang =
            (saved?.languageCode &&
                data.languages.find((l) => l.code === saved.languageCode)) ||
            data.languages[0];
        setLanguageCode(lang?.code ?? '');

        const grp =
            saved?.group && (saved.group === '' || data.groups.includes(saved.group))
                ? saved.group
                : '';
        setGroup(grp);

        setScope(saved?.scope === 'all' ? 'all' : 'missing');

        const provider =
            (saved?.providerId &&
                data.providers.find((p) => p.id === saved.providerId)) ||
            data.providers[0];
        if (provider) {
            setProviderId(provider.id);

            const model =
                (saved?.modelId &&
                    provider.models.find((m) => m.id === saved.modelId)) ||
                provider.models[0];
            setModelId(model?.id ?? null);
        }

        if (typeof saved?.temperature === 'number') {
            setTemperature(saved.temperature);
        }
        if (typeof saved?.maxTokens === 'number') {
            setMaxTokens(saved.maxTokens);
        }
    };

    const activeProvider = useMemo(
        () => options?.providers.find((p) => p.id === providerId) ?? null,
        [options, providerId],
    );

    useEffect(() => {
        // Keep model selection in sync if the active provider changes
        // and the previously-picked model is no longer offered.
        if (!activeProvider) return;
        if (!activeProvider.models.some((m) => m.id === modelId)) {
            setModelId(activeProvider.models[0]?.id ?? null);
        }
    }, [activeProvider, modelId]);

    const percent = useMemo(() => {
        if (progress.total === 0) return 0;
        const done = progress.translated + progress.skipped;
        return Math.min(100, Math.round((done / progress.total) * 100));
    }, [progress]);

    const canStart = Boolean(
        options &&
            languageCode &&
            providerId !== null &&
            modelId !== null,
    );

    const start = async () => {
        if (!canStart) return;

        if (rememberSelection) {
            writeSavedSettings({
                languageCode,
                group,
                scope,
                providerId: providerId ?? undefined,
                modelId: modelId ?? undefined,
                temperature,
                maxTokens,
            });
        }

        setProgress({ total: 0, translated: 0, skipped: 0 });
        setErrors([]);
        setBatchError(null);
        setAborting(false);
        setPhase('running');

        await runLoop();
    };

    const runLoop = async () => {
        let translatedTotal = 0;
        let skippedTotal = 0;
        let total = 0;
        let aborted = false;

        while (!aborted) {
            try {
                const { data } = await axios.post<BatchResponse>(
                    '/admin/settings/localization/ai-translate/batch',
                    {
                        language_code: languageCode,
                        group: group === '' ? null : group,
                        scope,
                        ai_provider_id: providerId,
                        ai_provider_model_id: modelId,
                    },
                );

                if (total === 0) {
                    total = data.remaining_before;
                }
                translatedTotal += data.translated;
                skippedTotal += data.skipped;

                setProgress({
                    total,
                    translated: translatedTotal,
                    skipped: skippedTotal,
                });
                if (data.errors.length > 0) {
                    setErrors((prev) => [...prev, ...data.errors]);
                }

                if (data.done) break;
            } catch (e: unknown) {
                const message =
                    axios.isAxiosError(e) && e.response?.data?.message
                        ? String(e.response.data.message)
                        : 'AI request failed.';
                setBatchError(message);
                break;
            }

            // Drained between renders so the abort button can stop the
            // loop between two consecutive batch calls.
            aborted = await checkAbort();
        }

        setPhase('finished');
        onFinished?.();
    };

    const checkAbort = (): Promise<boolean> =>
        new Promise((resolve) => {
            // Defer so React commits the previous state and any pending
            // abort click resolves before we read it.
            setTimeout(() => resolve(abortRequested.current), 0);
        });

    const abortRequested = useMemo(() => ({ current: false }), []);

    const requestAbort = () => {
        abortRequested.current = true;
        setAborting(true);
    };

    return (
        <Modal
            onClose={phase === 'running' ? () => {} : onClose}
            title="Auto translate with AI"
            description={
                phase === 'running'
                    ? 'Translating in batches. Keep this modal open until it finishes.'
                    : 'Generate translations for missing or all keys using your chosen AI model.'
            }
            size="2xl"
            footer={
                phase === 'running' ? (
                    <button
                        onClick={requestAbort}
                        disabled={aborting}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
                    >
                        <XCircle size={14} />
                        {aborting ? 'Stopping after current batch…' : 'Stop'}
                    </button>
                ) : phase === 'finished' ? (
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110"
                    >
                        Close
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={start}
                            disabled={!canStart}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50"
                        >
                            <Sparkles size={14} /> Start translating
                        </button>
                    </>
                )
            }
        >
            {optionsError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-800">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{optionsError}</span>
                </div>
            )}

            {!options && !optionsError && (
                <div className="flex items-center gap-2 px-2 py-6 text-xs text-on-surface-variant">
                    <Loader2 size={14} className="animate-spin" /> Loading options…
                </div>
            )}

            {options && phase === 'form' && (
                <FormPhase
                    options={options}
                    languageCode={languageCode}
                    onLanguageCode={setLanguageCode}
                    group={group}
                    onGroup={setGroup}
                    scope={scope}
                    onScope={setScope}
                    providerId={providerId}
                    onProviderId={setProviderId}
                    activeProvider={activeProvider}
                    modelId={modelId}
                    onModelId={setModelId}
                    temperature={temperature}
                    onTemperature={setTemperature}
                    maxTokens={maxTokens}
                    onMaxTokens={setMaxTokens}
                    rememberSelection={rememberSelection}
                    onRememberSelection={setRememberSelection}
                />
            )}

            {options && phase !== 'form' && (
                <ProgressPhase
                    phase={phase}
                    percent={percent}
                    progress={progress}
                    errors={errors}
                    batchError={batchError}
                />
            )}
        </Modal>
    );
}

function FormPhase({
    options,
    languageCode,
    onLanguageCode,
    group,
    onGroup,
    scope,
    onScope,
    providerId,
    onProviderId,
    activeProvider,
    modelId,
    onModelId,
    temperature,
    onTemperature,
    maxTokens,
    onMaxTokens,
    rememberSelection,
    onRememberSelection,
}: {
    options: OptionsResponse;
    languageCode: string;
    onLanguageCode: (v: string) => void;
    group: string;
    onGroup: (v: string) => void;
    scope: 'missing' | 'all';
    onScope: (v: 'missing' | 'all') => void;
    providerId: number | null;
    onProviderId: (v: number) => void;
    activeProvider: ProviderOption | null;
    modelId: number | null;
    onModelId: (v: number) => void;
    temperature: number;
    onTemperature: (v: number) => void;
    maxTokens: number;
    onMaxTokens: (v: number) => void;
    rememberSelection: boolean;
    onRememberSelection: (v: boolean) => void;
}) {
    const noLanguages = options.languages.length === 0;
    const noProviders = options.providers.length === 0;

    if (noLanguages) {
        return (
            <EmptyState
                title="No target languages"
                message="Add at least one non-default language on the Languages tab before running auto-translate."
            />
        );
    }
    if (noProviders) {
        return (
            <EmptyState
                title="No active AI providers"
                message="Configure at least one provider with an active model under Settings → AI Providers."
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Target language">
                    <select
                        value={languageCode}
                        onChange={(e) => onLanguageCode(e.target.value)}
                        className={inputCls}
                    >
                        {options.languages.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.flag ? `${lang.flag} ` : ''}
                                {lang.name} ({lang.code})
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Group">
                    <select
                        value={group}
                        onChange={(e) => onGroup(e.target.value)}
                        className={inputCls}
                    >
                        <option value="">All groups</option>
                        {options.groups.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Scope">
                    <select
                        value={scope}
                        onChange={(e) =>
                            onScope(e.target.value === 'all' ? 'all' : 'missing')
                        }
                        className={inputCls}
                    >
                        <option value="missing">Only missing translations</option>
                        <option value="all">All keys (overwrite existing)</option>
                    </select>
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label="Provider">
                    <select
                        value={providerId ?? ''}
                        onChange={(e) => onProviderId(Number(e.target.value))}
                        className={inputCls}
                    >
                        {options.providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Model">
                    <select
                        value={modelId ?? ''}
                        onChange={(e) => onModelId(Number(e.target.value))}
                        className={inputCls}
                        disabled={!activeProvider || activeProvider.models.length === 0}
                    >
                        {activeProvider?.models.length === 0 && (
                            <option value="">No active models</option>
                        )}
                        {activeProvider?.models.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Temperature">
                    <input
                        type="number"
                        min={0}
                        max={2}
                        step={0.05}
                        value={temperature}
                        onChange={(e) =>
                            onTemperature(
                                Math.max(0, Math.min(2, Number(e.target.value) || 0)),
                            )
                        }
                        className={inputCls}
                    />
                </Field>

                <Field label="Max tokens">
                    <input
                        type="number"
                        min={256}
                        max={32000}
                        step={128}
                        value={maxTokens}
                        onChange={(e) =>
                            onMaxTokens(
                                Math.max(
                                    256,
                                    Math.min(32000, Number(e.target.value) || 0),
                                ),
                            )
                        }
                        className={inputCls}
                    />
                </Field>
            </div>

            <label
                htmlFor="remember-ai-settings"
                className="flex items-center justify-between gap-3 cursor-pointer rounded-xl border border-surface-container bg-surface-container-low/40 px-4 py-3"
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">
                        Save my selection
                    </p>
                    <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">
                        Remembers the provider, model and other choices in a cookie so the
                        next time you open this modal they're already filled in.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <Toggle
                        id="remember-ai-settings"
                        checked={rememberSelection}
                        onChange={onRememberSelection}
                    />
                </div>
            </label>
        </div>
    );
}

function ProgressPhase({
    phase,
    percent,
    progress,
    errors,
    batchError,
}: {
    phase: 'running' | 'finished';
    percent: number;
    progress: { total: number; translated: number; skipped: number };
    errors: Array<{ key: string; message: string }>;
    batchError: string | null;
}) {
    const Icon = phase === 'running' ? Loader2 : CheckCircle2;
    const headline =
        phase === 'running'
            ? `Translating… ${percent}%`
            : batchError
              ? 'Stopped'
              : 'Done';

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Icon
                        size={16}
                        className={
                            phase === 'running'
                                ? 'animate-spin text-primary'
                                : batchError
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                        }
                    />
                    <p className="text-sm font-bold text-on-surface">{headline}</p>
                </div>

                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface-variant tabular-nums">
                    <span>
                        {progress.translated + progress.skipped} / {progress.total}{' '}
                        keys processed
                    </span>
                    <span>
                        {progress.translated} translated
                        {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
                    </span>
                </div>
            </div>

            {batchError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-800">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{batchError}</span>
                </div>
            )}

            {errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/60 overflow-hidden">
                    <div className="px-3 py-2 border-b border-red-200 bg-red-100/60 flex items-center gap-2">
                        <AlertCircle size={13} className="text-red-700" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-red-800">
                            Errors ({errors.length})
                        </p>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-red-100">
                        {errors.map((e, i) => (
                            <div
                                key={`${e.key}-${i}`}
                                className="px-3 py-2 flex items-start gap-2 text-xs"
                            >
                                <span className="font-mono font-bold text-red-700 flex-shrink-0">
                                    {e.key}
                                </span>
                                <span className="text-red-900 leading-snug">
                                    {e.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ title, message }: { title: string; message: string }) {
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
            <p className="text-sm font-bold text-amber-900">{title}</p>
            <p className="text-xs text-amber-800 mt-1 leading-snug">{message}</p>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">
                {label}
            </label>
            {children}
        </div>
    );
}

const inputCls =
    'w-full bg-surface-container-low border border-surface-container rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 disabled:opacity-50';

function readSavedSettings(): SavedSettings | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    try {
        const raw = decodeURIComponent(match.split('=').slice(1).join('='));
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
        return null;
    }
}

function writeSavedSettings(settings: SavedSettings) {
    if (typeof document === 'undefined') return;
    const value = encodeURIComponent(JSON.stringify(settings));
    const expires = new Date(
        Date.now() + COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toUTCString();
    document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}
