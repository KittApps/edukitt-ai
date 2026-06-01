import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import {
    NavPanel,
    PageHeader,
    TwoColumnLayout,
} from '@/Components/Admin/Shared';
import {
    ProviderEditor,
    ProviderNavItem,
    type Model,
    type Provider,
} from '@/Components/Admin/AiProviders';

interface Props {
    providers: Provider[];
}

export default function AiProviders({ providers: initialProviders }: Props) {
    const [providers, setProviders] = useState<Provider[]>(initialProviders);
    const [saving, setSaving] = useState(false);
    const [activeSlug, setActiveSlug] = useState<string>(initialProviders[0]?.slug ?? '');

    const activeProvider = useMemo(
        () => providers.find((p) => p.slug === activeSlug),
        [providers, activeSlug],
    );

    const updateProvider = (
        slug: string,
        field: keyof Provider,
        value: Provider[keyof Provider],
    ) => {
        setProviders((prev) =>
            prev.map((p) => (p.slug === slug ? { ...p, [field]: value } : p)),
        );
    };

    const updateModel = (
        providerSlug: string,
        modelIndex: number,
        field: keyof Model,
        value: Model[keyof Model],
    ) => {
        setProviders((prev) =>
            prev.map((p) => {
                if (p.slug !== providerSlug) return p;
                const models = [...p.models];
                models[modelIndex] = { ...models[modelIndex], [field]: value };
                return { ...p, models };
            }),
        );
    };

    const addModel = (providerSlug: string) => {
        setProviders((prev) =>
            prev.map((p) =>
                p.slug !== providerSlug
                    ? p
                    : {
                          ...p,
                          models: [
                              ...p.models,
                              {
                                  name: '',
                                  model_id: '',
                                  input_price_per_million: null,
                                  output_price_per_million: null,
                                  is_active: true,
                              },
                          ],
                      },
            ),
        );
    };

    const removeModel = (providerSlug: string, modelIndex: number) => {
        setProviders((prev) =>
            prev.map((p) =>
                p.slug !== providerSlug
                    ? p
                    : { ...p, models: p.models.filter((_, i) => i !== modelIndex) },
            ),
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post('/admin/settings/ai-providers', { providers });
            router.reload();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="AI Providers" />
            <div className="space-y-6">
                <PageHeader
                    title="AI Providers"
                    description="Configure API keys and models for each AI provider."
                    actions={
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save All'}
                        </button>
                    }
                />

                <TwoColumnLayout
                    aside={
                        <NavPanel label="Providers">
                            {providers.map((provider) => (
                                <ProviderNavItem
                                    key={provider.slug}
                                    provider={provider}
                                    isActive={provider.slug === activeSlug}
                                    onSelect={() => setActiveSlug(provider.slug)}
                                />
                            ))}
                        </NavPanel>
                    }
                >
                    {activeProvider ? (
                        <motion.div
                            key={activeProvider.slug}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ProviderEditor
                                provider={activeProvider}
                                onUpdate={(field, value) =>
                                    updateProvider(activeProvider.slug, field, value)
                                }
                                onUpdateModel={(mi, f, v) =>
                                    updateModel(activeProvider.slug, mi, f, v)
                                }
                                onAddModel={() => addModel(activeProvider.slug)}
                                onRemoveModel={(mi) =>
                                    removeModel(activeProvider.slug, mi)
                                }
                            />
                        </motion.div>
                    ) : (
                        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center text-sm text-on-surface-variant">
                            Select a provider from the list.
                        </div>
                    )}
                </TwoColumnLayout>
            </div>
        </AdminLayout>
    );
}
