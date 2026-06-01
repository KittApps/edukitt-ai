export interface PageRow {
    id: number;
    slug: string;
    title: string;
    meta_description: string | null;
    content: string;
    is_published: boolean;
    is_system: boolean;
    show_in_footer: boolean;
    updated_at: string | null;
    public_url: string;
}

export interface PagesStats {
    total: number;
    published: number;
    drafts: number;
    system: number;
}

export interface PageFormPayload {
    title: string;
    slug: string;
    meta_description: string;
    content: string;
    is_published: boolean;
    show_in_footer: boolean;
}
