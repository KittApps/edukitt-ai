import { Head, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    Database,
    ExternalLink,
    ListTodo,
    Workflow,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import GeneralForm, {
    type GeneralBlock,
} from '@/Components/Admin/Settings/Queue/GeneralForm';
import JobsForm, {
    type JobsBlock,
} from '@/Components/Admin/Settings/Queue/JobsForm';
import RedisForm, {
    type RedisBlock,
} from '@/Components/Admin/Settings/Queue/RedisForm';
import {
    NavPanel,
    PageHeader,
    StatusDot,
    TwoColumnLayout,
    type StatusTone,
} from '@/Components/Admin/Shared';
import AdminLayout from '@/Layouts/AdminLayout';
import { useT } from '@/lib/i18n';
import type { PageProps } from '@/types';

interface HorizonBlock {
    path: string;
}

interface Props {
    general: GeneralBlock;
    jobs: JobsBlock;
    redis: RedisBlock;
    horizon: HorizonBlock;
}

type SectionKey = 'general' | 'jobs' | 'redis' | 'guide';

interface Section {
    key: SectionKey;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    status: { tone: StatusTone; label?: string; title?: string };
}

interface FlashShape {
    success?: string | null;
    error?: string | null;
}

export default function QueueSettings({
    general,
    jobs,
    redis,
    horizon,
}: Props) {
    const t = useT();
    // The driver is no longer admin-configurable — it tracks the
    // framework-resolved `config('queue.default')` value the controller
    // sends down on every render. Tab visibility and the Open Monitor
    // button both key off this prop value.
    const isRedis = general.driver === 'redis';
    const [activeKey, setActiveKey] = useState<SectionKey>('general');

    const sections = useMemo<Section[]>(() => {
        const base: Section[] = [
            {
                key: 'general',
                label: t('admin.queue.nav.general.label', 'General'),
                subtitle: t(
                    'admin.queue.nav.general.subtitle',
                    'Master switch & driver',
                ),
                icon: <Workflow size={16} />,
                status: general.enabled
                    ? {
                          tone: 'success',
                          label: t('admin.queue.nav.general.on', 'On'),
                      }
                    : {
                          tone: 'muted',
                          label: t('admin.queue.nav.general.off', 'Off'),
                          title: t(
                              'admin.queue.nav.general.off_title',
                              'Queue system is disabled — all jobs run synchronously',
                          ),
                      },
            },
            {
                key: 'jobs',
                label: t('admin.queue.nav.jobs.label', 'Jobs'),
                subtitle: t(
                    'admin.queue.nav.jobs.subtitle',
                    'Per-feature toggles',
                ),
                icon: <ListTodo size={16} />,
                status: jobs.email_sending || jobs.ai_generation
                    ? {
                          tone: 'success',
                          label: t('admin.queue.nav.jobs.active', 'Active'),
                      }
                    : {
                          tone: 'muted',
                          label: t('admin.queue.nav.jobs.idle', 'Idle'),
                      },
            },
        ];

        if (isRedis) {
            base.push({
                key: 'redis',
                label: t('admin.queue.nav.redis.label', 'Redis'),
                subtitle: t(
                    'admin.queue.nav.redis.subtitle',
                    'Connection details',
                ),
                icon: <Database size={16} />,
                status: redis.host
                    ? {
                          tone: 'info',
                          label: t('admin.queue.nav.redis.set', 'Set'),
                      }
                    : {
                          tone: 'warning',
                          label: t('admin.queue.nav.redis.setup', 'Setup'),
                          title: t(
                              'admin.queue.nav.redis.setup_title',
                              'Redis host not configured',
                          ),
                      },
            });
        }

        return base;
    }, [isRedis, general.enabled, jobs.email_sending, jobs.ai_generation, redis.host, t]);

    const monitorEnabled = general.enabled && isRedis;

    return (
        <AdminLayout>
            <Head title={t('admin.queue.head_title', 'Queue')} />
            <div className="space-y-6">
                <PageHeader
                    title={t('admin.queue.title', 'Queue')}
                    description={t(
                        'admin.queue.description',
                        'Background job processing for emails and other deferred work, plus a dashboard for monitoring workers.',
                    )}
                    actions={
                        <a
                            href={horizon.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-disabled={!monitorEnabled}
                            onClick={(e) => {
                                if (!monitorEnabled) e.preventDefault();
                            }}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                monitorEnabled
                                    ? 'bg-primary text-white hover:brightness-110'
                                    : 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60'
                            }`}
                            title={
                                monitorEnabled
                                    ? t(
                                          'admin.queue.monitor.open',
                                          'Open Horizon dashboard',
                                      )
                                    : t(
                                          'admin.queue.monitor.disabled',
                                          'Available when the queue is enabled and QUEUE_CONNECTION is redis',
                                      )
                            }
                        >
                            <ExternalLink size={16} />
                            {t('admin.queue.monitor.button', 'Open monitor')}
                        </a>
                    }
                />

                <FlashBanner />

                <TwoColumnLayout
                    aside={
                        <NavPanel
                            label={t('admin.queue.nav.label', 'Queue')}
                        >
                            {sections.map((section) => (
                                <QueueNavItem
                                    key={section.key}
                                    section={section}
                                    isActive={section.key === activeKey}
                                    onSelect={() => setActiveKey(section.key)}
                                />
                            ))}
                        </NavPanel>
                    }
                >
                    <motion.div
                        key={activeKey}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeKey === 'general' && (
                            <GeneralForm initial={general} />
                        )}
                        {activeKey === 'jobs' && (
                            <JobsForm
                                initial={jobs}
                                queueEnabled={general.enabled}
                            />
                        )}
                        {activeKey === 'redis' && isRedis && (
                            <RedisForm initial={redis} />
                        )}
                    </motion.div>
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}

interface QueueNavItemProps {
    section: Section;
    isActive: boolean;
    onSelect: () => void;
}

function QueueNavItem({ section, isActive, onSelect }: QueueNavItemProps) {
    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                    ? 'bg-primary/10 border border-primary/15'
                    : 'hover:bg-surface-container-low border border-transparent'
            }`}
        >
            <div
                className={`p-2 rounded-lg flex-shrink-0 ${
                    isActive
                        ? 'bg-primary text-white'
                        : 'bg-surface-container text-on-surface-variant group-hover:text-primary'
                }`}
            >
                {section.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p
                    className={`text-sm font-bold truncate ${
                        isActive ? 'text-primary' : 'text-on-surface'
                    }`}
                >
                    {section.label}
                </p>
                <p className="text-[10px] text-on-surface-variant truncate">
                    {section.subtitle}
                </p>
            </div>
            {section.status.label ? (
                <StatusDot
                    tone={section.status.tone}
                    label={section.status.label}
                    title={section.status.title}
                />
            ) : (
                <StatusDot
                    tone={section.status.tone}
                    title={section.status.title}
                />
            )}
        </button>
    );
}

function FlashBanner() {
    const { props } = usePage<PageProps<{ flash?: FlashShape }>>();
    const flash = props.flash ?? {};
    if (!flash.success && !flash.error) {
        return null;
    }
    if (flash.error) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="min-w-0 break-words">{flash.error}</p>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            <p className="min-w-0 break-words">{flash.success}</p>
        </div>
    );
}
