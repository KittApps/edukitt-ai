interface AuthSocialDividerProps {
    label: string;
}

export default function AuthSocialDivider({ label }: AuthSocialDividerProps) {
    return (
        <div className="relative my-6 flex items-center" role="separator" aria-label={label}>
            <span className="flex-1 h-px bg-surface-container" />
            <span className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                {label}
            </span>
            <span className="flex-1 h-px bg-surface-container" />
        </div>
    );
}
