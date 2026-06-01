import ChipSelector from '@/Components/Shared/ChipSelector';
import { useT } from '@/lib/i18n';

interface PersonalizeOptionDto {
    key: string;
    value: string;
    is_default?: boolean;
}

interface PersonalizeGroupDto {
    key: string;
    label: string;
    description: string | null;
    options: PersonalizeOptionDto[];
}

interface Props {
    personalization: Record<string, string>;
    setPersonalization: (p: Record<string, string>) => void;
    groups?: PersonalizeGroupDto[];
}

export default function PersonalizationSection({
    personalization,
    setPersonalization,
    groups = [],
}: Props) {
    const t = useT();

    const handleSelect = (key: string, value: string) => {
        setPersonalization({ ...personalization, [key]: value });
    };

    return (
        <div className="space-y-8 bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
            {groups.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic">
                    {t(
                        'courses.personalize.empty',
                        'No personalization options have been configured yet.',
                    )}
                </p>
            ) : (
                groups.map((group) => (
                    <ChipSelector
                        key={group.key}
                        label={group.label}
                        options={group.options.map((opt) => opt.value)}
                        selected={personalization[group.key] || ''}
                        onSelect={(v) => handleSelect(group.key, v)}
                    />
                ))
            )}
        </div>
    );
}
