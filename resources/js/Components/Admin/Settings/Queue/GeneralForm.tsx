import { useForm } from '@inertiajs/react';
import { CheckCircle2, Database, Info, Save, Workflow } from 'lucide-react';

import { Toggle } from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

import EditorPane from './EditorPane';

export type QueueDriver = 'database' | 'redis' | string;

export interface GeneralBlock {
    enabled: boolean;
    driver: QueueDriver;
    database_ready: boolean;
}

interface Props {
    initial: GeneralBlock;
}

interface FormShape {
    enabled: boolean;
}

export default function GeneralForm({ initial }: Props) {
    const t = useT();
    const form = useForm<FormShape>({
        enabled: initial.enabled,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/queue/general', { preserveScroll: true });
    };

    const isRedis = initial.driver === 'redis';
    const isDatabase = initial.driver === 'database';

    return (
        <EditorPane
            icon={<Workflow size={22} />}
            title={t('admin.queue.general.title', 'Queue system')}
            description={t(
                'admin.queue.general.description',
                'Master switch for background job processing. When disabled, the jobs listed in the Jobs tab run synchronously on the request thread.',
            )}
            onSubmit={submit}
        >
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface">
                <Info size={18} className="mt-0.5 flex-shrink-0 text-primary" />
                <div className="min-w-0 space-y-1">
                    <p className="font-semibold">
                        {t(
                            'admin.queue.general.info.title',
                            'Why use queues?',
                        )}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                        {t(
                            'admin.queue.general.info.body',
                            'Moving slow tasks (emails, webhooks, AI calls) off the web request keeps the app responsive and retries failed work automatically.',
                        )}
                    </p>
                </div>
            </div>

            <label
                htmlFor="queue-enabled"
                className="flex items-center justify-between gap-4 py-3 border-b border-surface-container"
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">
                        {t('admin.queue.general.enabled.label', 'Enable queue system')}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        {t(
                            'admin.queue.general.enabled.hint',
                            'When ON, jobs that have been enabled on the Jobs tab are pushed onto the configured queue instead of running inline.',
                        )}
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <Toggle
                        id="queue-enabled"
                        checked={form.data.enabled}
                        onChange={(v) => form.setData('enabled', v)}
                    />
                </div>
            </label>

            <div className="rounded-xl border border-surface-container bg-surface-container-low/40 px-4 py-3 text-xs space-y-2">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-on-surface-variant" />
                    <span className="font-semibold text-on-surface">
                        {t(
                            'admin.queue.general.status.title',
                            'Active queue driver:',
                        )}
                    </span>
                    <code className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold uppercase tracking-wide">
                        {initial.driver}
                    </code>
                </div>
                {isDatabase && (
                    <div className="flex items-center gap-2 text-on-surface-variant">
                        {initial.database_ready ? (
                            <>
                                <CheckCircle2
                                    size={14}
                                    className="text-emerald-500"
                                />
                                <span>
                                    {t(
                                        'admin.queue.general.status.db_ready',
                                        'Database queue table ready.',
                                    )}
                                </span>
                            </>
                        ) : (
                            <span className="text-amber-600">
                                {t(
                                    'admin.queue.general.status.db_not_ready',
                                    'Database queue table missing — run `php artisan queue:table && php artisan migrate`.',
                                )}
                            </span>
                        )}
                    </div>
                )}
                {isRedis && (
                    <p className="text-on-surface-variant">
                        {t(
                            'admin.queue.general.status.redis_note',
                            'Configure host, port and password on the Redis tab.',
                        )}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} />{' '}
                {t('admin.queue.general.save', 'Save queue settings')}
            </button>
        </EditorPane>
    );
}
