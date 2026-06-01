export interface Language {
    code: string;
    name: string;
    native_name: string;
    flag: string;
    is_default: boolean;
    is_active: boolean;
    direction: 'ltr' | 'rtl';
    translated_count: number;
    total_count: number;
}

export interface TranslationKey {
    id: number;
    group: string;
    key: string;
    source: string;
    placeholders: string[];
    updated_at: string | null;
}

export interface TranslationValue {
    value: string;
    updated_at: string | null;
}

export type ValuesMap = Record<string, Record<string, TranslationValue>>;

export interface FlattenedTranslation {
    id: number;
    group: string;
    key: string;
    source: string;
    translation: string;
    placeholders: string[];
    updated_at: string | null;
}
