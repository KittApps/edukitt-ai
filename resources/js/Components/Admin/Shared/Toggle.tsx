interface Props {
    id?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
}

/**
 * Shared admin pill-style toggle switch.
 *
 * Used across admin settings panels (subscription plans, billings, …) so
 * any boolean field renders the same way. Compose with a row wrapper to
 * pair it with a label + helper text.
 */
export default function Toggle({ id, checked, onChange, disabled }: Props) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
                checked ? 'bg-primary' : 'bg-surface-container'
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}
