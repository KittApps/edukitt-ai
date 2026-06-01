import { Head, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Award,
    CheckCircle2,
    Cookie,
    Globe,
    Mail,
    Palette,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import AccountsForm, {
    type AccountsBlock,
} from '@/Components/Admin/Settings/General/AccountsForm';
import BrandForm, {
    type BrandBlock,
} from '@/Components/Admin/Settings/General/BrandForm';
import CertificatesForm, {
    type CertificatesBlock,
} from '@/Components/Admin/Settings/General/CertificatesForm';
import ContactForm, {
    type ContactBlock,
} from '@/Components/Admin/Settings/General/ContactForm';
import GdprForm, {
    type GdprBlock,
} from '@/Components/Admin/Settings/General/GdprForm';
import RecaptchaForm, {
    type RecaptchaBlock,
} from '@/Components/Admin/Settings/General/RecaptchaForm';
import SiteForm, {
    type SiteBlock,
} from '@/Components/Admin/Settings/General/SiteForm';
import ThemeForm, {
    type ThemeBlock,
} from '@/Components/Admin/Settings/General/ThemeForm';
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

interface LanguageOption {
    code: string;
    name: string;
    native_name: string;
    flag: string | null;
    direction: 'ltr' | 'rtl';
    is_translation_base?: boolean;
}

interface LanguagesBlock {
    options: LanguageOption[];
    current_default: string | null;
}

interface GeneralProps {
    general: {
        site: SiteBlock;
        brand: BrandBlock;
        account: AccountsBlock;
    };
    theme: ThemeBlock;
    recaptcha: RecaptchaBlock;
    gdpr: GdprBlock;
    contact: ContactBlock;
    certificates: CertificatesBlock;
    languages: LanguagesBlock;
}

type SectionKey =
    | 'site'
    | 'brand'
    | 'account'
    | 'theme'
    | 'recaptcha'
    | 'gdpr'
    | 'contact'
    | 'certificates';

interface Section {
    key: SectionKey;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    status: { tone: StatusTone; label: string; title?: string };
}

interface FlashShape {
    success?: string | null;
    error?: string | null;
}

export default function GeneralSettings({
    general,
    theme,
    recaptcha,
    gdpr,
    contact,
    certificates,
    languages,
}: GeneralProps) {
    const t = useT();
    const [activeKey, setActiveKey] = useState<SectionKey>('site');

    const enabledThemeCount = useMemo(
        () => theme.themes.filter((row) => row.enabled).length,
        [theme.themes],
    );

    const sections = useMemo<Section[]>(
        () => [
            {
                key: 'site',
                label: t('admin.general.nav.site.label', 'Site'),
                subtitle: t(
                    'admin.general.nav.site.subtitle',
                    'Title & description',
                ),
                icon: <Globe size={16} />,
                status: general.site.title
                    ? {
                          tone: 'success',
                          label: t('admin.general.nav.site.set', 'Set'),
                      }
                    : {
                          tone: 'warning',
                          label: t('admin.general.nav.site.setup', 'Setup'),
                          title: t(
                              'admin.general.nav.site.setup_title',
                              'Site title not configured',
                          ),
                      },
            },
            {
                key: 'brand',
                label: t('admin.general.nav.brand.label', 'Brand'),
                subtitle: t(
                    'admin.general.nav.brand.subtitle',
                    'Name, logos & favicon',
                ),
                icon: <Sparkles size={16} />,
                status: general.brand.name
                    ? {
                          tone: 'success',
                          label: t('admin.general.nav.brand.set', 'Set'),
                      }
                    : {
                          tone: 'warning',
                          label: t('admin.general.nav.brand.setup', 'Setup'),
                          title: t(
                              'admin.general.nav.brand.setup_title',
                              'Brand name not configured',
                          ),
                      },
            },
            {
                key: 'account',
                label: t('admin.general.nav.account.label', 'Accounts'),
                subtitle: t(
                    'admin.general.nav.account.subtitle',
                    'Sign-up, verification & deletion',
                ),
                icon: <Users size={16} />,
                status: general.account.registration_enabled
                    ? {
                          tone: 'success',
                          label: t('admin.general.nav.account.open', 'Open'),
                      }
                    : {
                          tone: 'muted',
                          label: t(
                              'admin.general.nav.account.closed',
                              'Closed',
                          ),
                          title: t(
                              'admin.general.nav.account.closed_title',
                              'Public sign-ups are disabled',
                          ),
                      },
            },
            {
                key: 'recaptcha',
                label: t('admin.general.nav.recaptcha.label', 'reCAPTCHA'),
                subtitle: t(
                    'admin.general.nav.recaptcha.subtitle',
                    'Protect auth forms',
                ),
                icon: <ShieldCheck size={16} />,
                status: recaptcha.effective
                    ? {
                          tone: 'success',
                          label: t('admin.general.nav.recaptcha.on', 'On'),
                          title: t(
                              'admin.general.nav.recaptcha.on_title',
                              'Active on login, register, forgot & reset password',
                          ),
                      }
                    : recaptcha.enabled
                      ? {
                            tone: 'warning',
                            label: t(
                                'admin.general.nav.recaptcha.setup',
                                'Setup',
                            ),
                            title: t(
                                'admin.general.nav.recaptcha.setup_title',
                                'Enabled but missing site/secret key',
                            ),
                        }
                      : {
                            tone: 'muted',
                            label: t(
                                'admin.general.nav.recaptcha.off',
                                'Off',
                            ),
                            title: t(
                                'admin.general.nav.recaptcha.off_title',
                                'reCAPTCHA disabled — no challenge on auth forms',
                            ),
                        },
            },
            {
                key: 'gdpr',
                label: t('admin.general.nav.gdpr.label', 'GDPR'),
                subtitle: t(
                    'admin.general.nav.gdpr.subtitle',
                    'Cookie consent banner',
                ),
                icon: <Cookie size={16} />,
                status: gdpr.enabled
                    ? {
                          tone: 'success',
                          label: t('admin.general.nav.gdpr.on', 'On'),
                          title: t(
                              'admin.general.nav.gdpr.on_title',
                              'Cookie banner shown on public pages',
                          ),
                      }
                    : {
                          tone: 'muted',
                          label: t('admin.general.nav.gdpr.off', 'Off'),
                          title: t(
                              'admin.general.nav.gdpr.off_title',
                              'Cookie banner hidden',
                          ),
                      },
            },
            {
                key: 'contact',
                label: t('admin.general.nav.contact.label', 'Contact'),
                subtitle: t(
                    'admin.general.nav.contact.subtitle',
                    'Public contact form',
                ),
                icon: <Mail size={16} />,
                status: contact.enabled
                    ? {
                          tone: 'success',
                          label: t('admin.general.nav.contact.on', 'On'),
                          title: t(
                              'admin.general.nav.contact.on_title',
                              'Contact page enabled at /contact',
                          ),
                      }
                    : {
                          tone: 'muted',
                          label: t('admin.general.nav.contact.off', 'Off'),
                          title: t(
                              'admin.general.nav.contact.off_title',
                              'Contact page disabled and hidden from menus',
                          ),
                      },
            },
            {
                key: 'certificates',
                label: t(
                    'admin.general.nav.certificates.label',
                    'Certificates',
                ),
                subtitle: t(
                    'admin.general.nav.certificates.subtitle',
                    'Course completion certificates',
                ),
                icon: <Award size={16} />,
                status: certificates.enabled
                    ? {
                          tone: 'success',
                          label: t(
                              'admin.general.nav.certificates.on',
                              'On',
                          ),
                          title: t(
                              'admin.general.nav.certificates.on_title',
                              'Certificates feature is enabled',
                          ),
                      }
                    : {
                          tone: 'muted',
                          label: t(
                              'admin.general.nav.certificates.off',
                              'Off',
                          ),
                          title: t(
                              'admin.general.nav.certificates.off_title',
                              'Certificates hidden everywhere',
                          ),
                      },
            },
            {
                key: 'theme',
                label: t('admin.general.nav.theme.label', 'Themes'),
                subtitle: t(
                    'admin.general.nav.theme.subtitle',
                    'Available themes & default',
                ),
                icon: <Palette size={16} />,
                status: theme.allow_user_selection
                    ? {
                          tone: 'success',
                          label: t(
                              'admin.general.nav.theme.user_on',
                              '{count} on',
                              { count: enabledThemeCount },
                          ),
                          title: t(
                              'admin.general.nav.theme.user_on_title',
                              'Users can pick their own theme',
                          ),
                      }
                    : {
                          tone: 'muted',
                          label: t(
                              'admin.general.nav.theme.locked',
                              'Locked',
                          ),
                          title: t(
                              'admin.general.nav.theme.locked_title',
                              'Users see the admin-default theme only',
                          ),
                      },
            },
        ],
        [
            general.site.title,
            general.brand.name,
            general.account.registration_enabled,
            theme.allow_user_selection,
            enabledThemeCount,
            recaptcha.effective,
            recaptcha.enabled,
            gdpr.enabled,
            contact.enabled,
            certificates.enabled,
            t,
        ],
    );

    return (
        <AdminLayout>
            <Head title={t('admin.general.head_title', 'General')} />
            <div className="space-y-6">
                <PageHeader
                    title={t('admin.general.title', 'General')}
                    description={t(
                        'admin.general.description',
                        'Site identity, authentication and sign-up policy.',
                    )}
                />

                <FlashBanner />

                <TwoColumnLayout
                    aside={
                        <NavPanel
                            label={t('admin.general.nav.label', 'General')}
                        >
                            {sections.map((section) => (
                                <GeneralNavItem
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
                        {activeKey === 'site' && (
                            <SiteForm
                                initial={general.site}
                                languages={languages}
                            />
                        )}
                        {activeKey === 'brand' && (
                            <BrandForm initial={general.brand} />
                        )}
                        {activeKey === 'account' && (
                            <AccountsForm initial={general.account} />
                        )}
                        {activeKey === 'recaptcha' && (
                            <RecaptchaForm initial={recaptcha} />
                        )}
                        {activeKey === 'gdpr' && (
                            <GdprForm initial={gdpr} />
                        )}
                        {activeKey === 'contact' && (
                            <ContactForm initial={contact} />
                        )}
                        {activeKey === 'certificates' && (
                            <CertificatesForm initial={certificates} />
                        )}
                        {activeKey === 'theme' && (
                            <ThemeForm initial={theme} />
                        )}
                    </motion.div>
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}

interface GeneralNavItemProps {
    section: Section;
    isActive: boolean;
    onSelect: () => void;
}

function GeneralNavItem({ section, isActive, onSelect }: GeneralNavItemProps) {
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
