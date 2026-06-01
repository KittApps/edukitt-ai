import { useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Database,
    PlugZap,
    RotateCcw,
    Save,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';
import { inputClasses } from './styles';

export interface RedisBlock {
    host: string | null;
    port: number | null;
    password_set: boolean;
    database: number | null;
}

interface Props {
    initial: RedisBlock;
}

interface RedisFormData {
    host: string;
    port: string;
    password: string;
    database: string;
    clear_password: boolean;
}

interface TestResult {
    ok: boolean;
    message: string;
    latency_ms: number | null;
}

const STORED_PASSWORD_MASK = '••••••••';

export default function RedisForm({ initial }: Props) {
    const t = useT();
    const form = useForm<RedisFormData>({
        host: initial.host ?? '',
        port: initial.port !== null ? String(initial.port) : '',
        password: '',
        database: initial.database !== null ? String(initial.database) : '0',
        clear_password: false,
    });

    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testing, setTesting] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/queue/redis', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('password');
                form.setData('clear_password', false);
            },
        });
    };

    const runTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const csrf =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';

            const response = await fetch('/admin/settings/queue/redis/test', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    host: form.data.host || null,
                    port: form.data.port ? Number(form.data.port) : null,
                    database: form.data.database
                        ? Number(form.data.database)
                        : null,
                    password: form.data.password || null,
                    use_saved_password:
                        !form.data.password && initial.password_set,
                }),
            });

            const data = (await response.json()) as TestResult;
            setTestResult(data);
        } catch (err) {
            setTestResult({
                ok: false,
                message: err instanceof Error ? err.message : String(err),
                latency_ms: null,
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <EditorPane
            icon={<Database size={22} />}
            title={t('admin.queue.redis.title', 'Redis connection')}
            description={t(
                'admin.queue.redis.description',
                'Connection details for the Redis instance used by the queue and Horizon. Defaults fall through to your .env values.',
            )}
            onSubmit={submit}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="redis-host"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t('admin.queue.redis.host', 'Host')}
                    </label>
                    <input
                        id="redis-host"
                        type="text"
                        autoComplete="off"
                        value={form.data.host}
                        onChange={(e) => form.setData('host', e.target.value)}
                        placeholder="127.0.0.1"
                        className={inputClasses}
                    />
                    {form.errors.host && (
                        <p className="text-xs text-red-600 mt-1">{form.errors.host}</p>
                    )}
                </div>
                <div>
                    <label
                        htmlFor="redis-port"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        {t('admin.queue.redis.port', 'Port')}
                    </label>
                    <input
                        id="redis-port"
                        type="number"
                        min={1}
                        max={65535}
                        value={form.data.port}
                        onChange={(e) => form.setData('port', e.target.value)}
                        placeholder="6379"
                        className={inputClasses}
                    />
                    {form.errors.port && (
                        <p className="text-xs text-red-600 mt-1">{form.errors.port}</p>
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label
                        htmlFor="redis-password"
                        className="block text-sm font-bold text-on-surface"
                    >
                        {t('admin.queue.redis.password', 'Password')}
                    </label>
                    {initial.password_set && !form.data.clear_password && (
                        <button
                            type="button"
                            onClick={() => {
                                form.setData('password', '');
                                form.setData('clear_password', true);
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant hover:text-red-600 transition-colors"
                        >
                            <RotateCcw size={12} />
                            {t(
                                'admin.queue.redis.clear_password',
                                'Clear stored password',
                            )}
                        </button>
                    )}
                </div>
                <input
                    id="redis-password"
                    type="password"
                    autoComplete="new-password"
                    disabled={form.data.clear_password}
                    value={form.data.password}
                    onChange={(e) => form.setData('password', e.target.value)}
                    placeholder={
                        initial.password_set && !form.data.clear_password
                            ? `${STORED_PASSWORD_MASK} ${t(
                                  'admin.queue.redis.password_saved',
                                  '(saved — leave blank to keep)',
                              )}`
                            : t(
                                  'admin.queue.redis.password_placeholder',
                                  'Redis AUTH password (leave blank for none)',
                              )
                    }
                    className={`${inputClasses} ${
                        form.data.clear_password ? 'opacity-50' : ''
                    }`}
                />
                {form.data.clear_password && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p>
                                {t(
                                    'admin.queue.redis.clear_password_notice',
                                    'Stored password will be cleared on save.',
                                )}
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    form.setData('clear_password', false)
                                }
                                className="mt-1 underline font-semibold"
                            >
                                {t('admin.queue.redis.cancel_clear', 'Cancel')}
                            </button>
                        </div>
                    </div>
                )}
                {form.errors.password && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.password}
                    </p>
                )}
            </div>

            <div>
                <label
                    htmlFor="redis-database"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    {t('admin.queue.redis.database', 'Database index')}
                </label>
                <input
                    id="redis-database"
                    type="number"
                    min={0}
                    max={15}
                    value={form.data.database}
                    onChange={(e) => form.setData('database', e.target.value)}
                    placeholder="0"
                    className={inputClasses}
                />
                <p className="text-xs text-on-surface-variant mt-2">
                    {t(
                        'admin.queue.redis.database_hint',
                        'Logical Redis database number (0–15). Use a different index than your cache to keep queue keys isolated.',
                    )}
                </p>
                {form.errors.database && (
                    <p className="text-xs text-red-600 mt-1">
                        {form.errors.database}
                    </p>
                )}
            </div>

            {testResult && (
                <div
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                        testResult.ok
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                    }`}
                >
                    {testResult.ok ? (
                        <CheckCircle2
                            size={14}
                            className="flex-shrink-0 mt-0.5"
                        />
                    ) : (
                        <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 break-words">
                        <p className="font-semibold">{testResult.message}</p>
                        {testResult.latency_ms !== null && (
                            <p className="opacity-80">
                                {t('admin.queue.redis.latency', 'Latency:')}{' '}
                                {testResult.latency_ms} ms
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                    <Save size={16} />{' '}
                    {t('admin.queue.redis.save', 'Save Redis settings')}
                </button>
                <button
                    type="button"
                    onClick={runTest}
                    disabled={testing}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-surface-container-low text-on-surface border border-surface-container rounded-xl text-sm font-bold hover:bg-surface-container transition-all disabled:opacity-50"
                >
                    <PlugZap size={16} />{' '}
                    {testing
                        ? t('admin.queue.redis.testing', 'Testing…')
                        : t('admin.queue.redis.test', 'Test connection')}
                </button>
            </div>
        </EditorPane>
    );
}
