export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    is_admin?: boolean;
}

export interface LocaleInfo {
    code: string;
    direction: 'ltr' | 'rtl';
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    locale: LocaleInfo;
    translations: Record<string, string>;
};
