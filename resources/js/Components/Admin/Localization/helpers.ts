import axios from 'axios';

export function findMissingPlaceholders(value: string, expected: string[]): string[] {
    if (!value || expected.length === 0) return [];
    return expected.filter((p) => !value.includes(`{${p}}`));
}

export async function saveTranslation(
    languageCode: string,
    key: string,
    value: string,
): Promise<void> {
    await axios.patch('/admin/settings/localization/translations', {
        language_code: languageCode,
        key,
        value,
    });
}
