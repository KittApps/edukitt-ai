import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Check,
    ChevronDown,
    Coins,
    Copy,
    CreditCard,
    DollarSign,
    Info,
    Save,
    Webhook,
} from 'lucide-react';

import {
    NavPanel,
    PageHeader,
    StatusDot,
    Toggle,
    TwoColumnLayout,
    type StatusTone,
} from '@/Components/Admin/Shared';
import { useT } from '@/lib/i18n';

interface CreditsBlock {
    credit_rate_usd: number;
    credits_enabled: boolean;
}

interface CurrencyBlock {
    code: string;
    symbol: string;
}

interface StripeWebhookEventRow {
    type: string;
    description: string;
}

interface StripeBlock {
    publishable: string | null;
    secret_set: boolean;
    webhook_set: boolean;
    currency: string;
    webhook_url: string;
    webhook_events: StripeWebhookEventRow[];
}

interface Props {
    credits: CreditsBlock;
    currency: CurrencyBlock;
    stripe: StripeBlock;
}

type SectionKey = 'credits' | 'currency' | 'stripe';

interface Section {
    key: SectionKey;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    status: { tone: StatusTone; label: string; title?: string };
}

const inputClasses =
    'w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

export default function BillingsSettings({ credits, currency, stripe }: Props) {
    const [activeKey, setActiveKey] = useState<SectionKey>('credits');

    const sections = useMemo<Section[]>(
        () => [
            {
                key: 'credits',
                label: 'Credits',
                subtitle: 'AI usage pricing',
                icon: <Coins size={16} />,
                status: credits.credits_enabled
                    ? { tone: 'success', label: 'Enabled' }
                    : { tone: 'muted', label: 'Off', title: 'Credits system disabled' },
            },
            {
                key: 'currency',
                label: 'Currency',
                subtitle: 'Display code & symbol',
                icon: <DollarSign size={16} />,
                status: {
                    tone: 'success',
                    label: `${currency.symbol} ${currency.code}`,
                },
            },
            {
                key: 'stripe',
                label: 'Stripe',
                subtitle: 'Subscriptions & billing',
                icon: <CreditCard size={16} />,
                status: stripe.secret_set
                    ? { tone: 'success', label: 'Live' }
                    : {
                          tone: 'warning',
                          label: 'Setup',
                          title: 'Stripe secret key not configured',
                      },
            },
        ],
        [credits.credits_enabled, currency.code, currency.symbol, stripe.secret_set],
    );

    return (
        <AdminLayout>
            <Head title="Billing Settings" />
            <div className="space-y-6">
                <PageHeader
                    title="Billing Settings"
                    description="Credit pricing, the display currency used across price labels, and Stripe credentials for subscriptions."
                />

                <TwoColumnLayout
                    aside={
                        <NavPanel label="Sections">
                            {sections.map((section) => (
                                <BillingNavItem
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
                        {activeKey === 'credits' && <CreditsForm initial={credits} />}
                        {activeKey === 'currency' && <CurrencyForm initial={currency} />}
                        {activeKey === 'stripe' && <StripeForm initial={stripe} />}
                    </motion.div>
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}

interface BillingNavItemProps {
    section: Section;
    isActive: boolean;
    onSelect: () => void;
}

function BillingNavItem({ section, isActive, onSelect }: BillingNavItemProps) {
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
            <StatusDot
                tone={section.status.tone}
                label={section.status.label}
                title={section.status.title}
            />
        </button>
    );
}

interface EditorPaneProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void;
}

/**
 * Card wrapper for the right-side editor pane in Billing Settings.
 *
 * Matches the convention used across AI Providers / AI Content / Localization:
 * a title block with an icon + heading + short description, then the form
 * body inside the same surface card.
 */
function EditorPane({ icon, title, description, children, onSubmit }: EditorPaneProps) {
    return (
        <form
            onSubmit={onSubmit}
            className="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden max-w-2xl"
        >
            <div className="flex items-start gap-3 px-6 py-5 border-b border-surface-container">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h2 className="font-headline font-extrabold text-lg text-on-surface">
                        {title}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
                </div>
            </div>
            <div className="p-6 space-y-6">{children}</div>
        </form>
    );
}

function CreditsForm({ initial }: { initial: CreditsBlock }) {
    const t = useT();
    const form = useForm({
        credit_rate_usd: initial.credit_rate_usd,
        credits_enabled: initial.credits_enabled,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/billings/credits');
    };

    return (
        <EditorPane
            icon={<Coins size={22} />}
            title={t('admin.billings.credits.title', 'Credit metering')}
            description={t(
                'admin.billings.credits.description',
                'Control whether AI usage is metered in credits and the USD value of a single credit.',
            )}
            onSubmit={submit}
        >
            <label
                htmlFor="billings-credits-enabled"
                className="flex items-center justify-between gap-4 py-3 border-b border-surface-container last:border-0"
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">Credits enabled</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        When OFF, the credits system is bypassed and only plan feature limits apply.
                        The Credits tab on the user subscription page is also hidden.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <Toggle
                        id="billings-credits-enabled"
                        checked={form.data.credits_enabled}
                        onChange={(v) => form.setData('credits_enabled', v)}
                    />
                </div>
            </label>

            <div>
                <label
                    htmlFor="billings-credit-rate"
                    className="block text-sm font-bold text-on-surface mb-2"
                >
                    Credit rate (USD per 1 credit)
                </label>
                <input
                    id="billings-credit-rate"
                    type="number"
                    step="0.000001"
                    min={0}
                    value={form.data.credit_rate_usd}
                    onChange={(e) => form.setData('credit_rate_usd', Number(e.target.value))}
                    className={inputClasses}
                />
                <p className="text-xs text-on-surface-variant mt-2">
                    AI calls are converted to credits using <code>cost_usd / credit_rate_usd</code>,
                    rounded up to the next whole credit. Lower values make credits more granular.
                </p>
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} /> Save credit settings
            </button>
        </EditorPane>
    );
}

function CurrencyForm({ initial }: { initial: CurrencyBlock }) {
    const t = useT();
    const form = useForm({
        code: initial.code,
        symbol: initial.symbol,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/billings/currency');
    };

    return (
        <EditorPane
            icon={<DollarSign size={22} />}
            title={t('admin.billings.currency.title', 'Display currency')}
            description={t(
                'admin.billings.currency.description',
                'Used wherever prices are shown across the app and admin (plans, transactions, credit packs). Does not change what Stripe charges.',
            )}
            onSubmit={submit}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label
                        htmlFor="billings-currency-code"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        Currency code
                    </label>
                    <input
                        id="billings-currency-code"
                        type="text"
                        maxLength={10}
                        value={form.data.code}
                        onChange={(e) => form.setData('code', e.target.value.toUpperCase())}
                        placeholder="USD"
                        className={`${inputClasses} uppercase`}
                    />
                    <p className="text-xs text-on-surface-variant mt-2">
                        ISO-like short code such as <code>USD</code>, <code>EUR</code>, <code>LKR</code>.
                    </p>
                </div>
                <div>
                    <label
                        htmlFor="billings-currency-symbol"
                        className="block text-sm font-bold text-on-surface mb-2"
                    >
                        Currency symbol
                    </label>
                    <input
                        id="billings-currency-symbol"
                        type="text"
                        maxLength={8}
                        value={form.data.symbol}
                        onChange={(e) => form.setData('symbol', e.target.value)}
                        placeholder="$"
                        className={inputClasses}
                    />
                    <p className="text-xs text-on-surface-variant mt-2">
                        Prefixed to every price, e.g. <code>{form.data.symbol || '$'}10.00</code>.
                    </p>
                </div>
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} /> Save currency
            </button>
        </EditorPane>
    );
}

function StripeForm({ initial }: { initial: StripeBlock }) {
    const t = useT();
    const form = useForm({
        publishable: initial.publishable ?? '',
        secret: '',
        webhook: '',
        currency: initial.currency,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings/billings/stripe', {
            onSuccess: () => form.reset('secret', 'webhook'),
        });
    };

    return (
        <EditorPane
            icon={<CreditCard size={22} />}
            title={t('admin.billings.stripe.title', 'Stripe configuration')}
            description={t(
                'admin.billings.stripe.description',
                'API credentials Cashier uses for subscriptions, invoices and webhooks.',
            )}
            onSubmit={submit}
        >
            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">
                    Publishable key
                </label>
                <input
                    type="text"
                    value={form.data.publishable}
                    onChange={(e) => form.setData('publishable', e.target.value)}
                    placeholder="pk_test_..."
                    className={inputClasses}
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">
                    Secret key
                </label>
                <input
                    type="password"
                    autoComplete="new-password"
                    value={form.data.secret}
                    onChange={(e) => form.setData('secret', e.target.value)}
                    placeholder={initial.secret_set ? '•••••••••• (saved — leave blank to keep)' : 'sk_test_...'}
                    className={inputClasses}
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">
                    Webhook secret
                </label>
                <input
                    type="password"
                    autoComplete="new-password"
                    value={form.data.webhook}
                    onChange={(e) => form.setData('webhook', e.target.value)}
                    placeholder={initial.webhook_set ? '•••••••••• (saved — leave blank to keep)' : 'whsec_...'}
                    className={inputClasses}
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-on-surface mb-2">
                    Default currency
                </label>
                <input
                    type="text"
                    maxLength={3}
                    value={form.data.currency}
                    onChange={(e) => form.setData('currency', e.target.value.toUpperCase())}
                    className={`${inputClasses} uppercase`}
                />
            </div>

            <StripeWebhookUrlCard
                url={initial.webhook_url}
                events={initial.webhook_events}
            />

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
                <Save size={16} /> Save Stripe settings
            </button>
        </EditorPane>
    );
}

/**
 * Read-only info card that surfaces the absolute Stripe webhook URL
 * the operator must paste into the Stripe Dashboard. Mirrors the
 * "Where reCAPTCHA appears" card on the General settings page so
 * admin pages share one visual style for inline help blocks.
 */
function StripeWebhookUrlCard({
    url,
    events,
}: {
    url: string;
    events: StripeWebhookEventRow[];
}) {
    const [copied, setCopied] = useState(false);
    // The events list is read-only reference material — useful when first
    // wiring Stripe up but noisy on every revisit. Collapsed by default so
    // the card stays compact; admins can expand it when they need to
    // double-check which event types this app listens for.
    const [eventsOpen, setEventsOpen] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API can be unavailable on insecure origins;
            // silently ignore so the URL is still visible to copy
            // manually.
        }
    };

    return (
        <div className="rounded-xl border border-surface-container bg-surface-container-low/40 px-4 py-4 space-y-3">
            <div className="flex items-start gap-2.5">
                <Info
                    size={16}
                    className="flex-shrink-0 mt-0.5 text-on-surface-variant"
                />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface">
                        Stripe webhook URL
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                        Add this endpoint in Stripe Dashboard → Developers →
                        Webhooks. Subscribe to the events below (or “Send all
                        event types”) so Laravel Cashier and this app stay in
                        sync.
                    </p>
                </div>
            </div>
            <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container">
                    <Webhook
                        size={14}
                        className="flex-shrink-0 text-on-surface-variant"
                    />
                    <code
                        className="text-xs text-on-surface font-mono truncate"
                        title={url}
                    >
                        {url}
                    </code>
                </div>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-container bg-surface-container-lowest hover:bg-surface-container-low text-xs font-bold text-on-surface transition-colors flex-shrink-0"
                    aria-label={copied ? 'Copied' : 'Copy webhook URL'}
                >
                    {copied ? (
                        <>
                            <Check
                                size={13}
                                className="text-emerald-600 dark:text-emerald-400"
                            />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy size={13} />
                            Copy
                        </>
                    )}
                </button>
            </div>

            {events.length > 0 && (
                <div className="pt-2 border-t border-surface-container">
                    <button
                        type="button"
                        onClick={() => setEventsOpen((o) => !o)}
                        aria-expanded={eventsOpen}
                        className="w-full flex items-center justify-between gap-2 text-left group"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant group-hover:text-on-surface transition-colors">
                            Events to subscribe
                            <span className="ml-1.5 normal-case tracking-normal font-semibold text-on-surface-variant">
                                ({events.length})
                            </span>
                        </span>
                        <ChevronDown
                            size={14}
                            className={`flex-shrink-0 text-on-surface-variant transition-transform ${
                                eventsOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>
                    {eventsOpen && (
                        <div className="mt-3">
                            <ul className="space-y-2.5 text-left">
                                {events.map((row) => (
                                    <li
                                        key={row.type}
                                        className="text-xs text-on-surface-variant leading-snug"
                                    >
                                        <code className="text-[11px] font-mono text-primary font-semibold">
                                            {row.type}
                                        </code>
                                        <span className="text-on-surface-variant">
                                            {' '}
                                            — {row.description}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-[10px] text-on-surface-variant mt-3 leading-relaxed">
                                Cashier may rely on additional Stripe events
                                internally for the{' '}
                                <code className="text-[10px]">subscriptions</code>{' '}
                                table — selecting{' '}
                                <span className="font-semibold text-on-surface">
                                    Receive all events
                                </span>{' '}
                                is the safest default.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
