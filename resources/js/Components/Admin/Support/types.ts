export interface FaqRow {
    id: number;
    faq_category_id: number;
    question: string;
    answer: string;
    sort_order: number;
    is_active: boolean;
}

export interface CategoryRow {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
    faqs_count: number;
    faqs: FaqRow[];
}

export interface SupportStats {
    categories: number;
    categories_active: number;
    faqs: number;
    faqs_active: number;
}

export type CategoryEditorState = CategoryRow | 'new' | null;
export type FaqEditorState = FaqRow | 'new' | null;
