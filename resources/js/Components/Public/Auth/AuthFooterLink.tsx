import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

interface AuthFooterLinkProps {
    prompt?: string;
    label: string;
    href: string;
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    as?: 'a' | 'button';
    icon?: ReactNode;
}

export default function AuthFooterLink({
    prompt,
    label,
    href,
    method,
    as,
    icon,
}: AuthFooterLinkProps) {
    return (
        <p className="text-sm text-on-surface-variant font-medium">
            {prompt && <span className="me-1.5">{prompt}</span>}
            <Link
                href={href}
                method={method}
                as={as}
                className="inline-flex items-center gap-1 text-primary font-bold hover:underline underline-offset-4 transition-colors"
            >
                {icon}
                {label}
            </Link>
        </p>
    );
}
