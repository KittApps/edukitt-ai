/**
 * Format a USD value at the precision conventional in this app:
 *   - >= $1   : 2 dp ($12.50)
 *   - >= $0.01: 3 dp ($0.025)
 *   - else    : 5 dp ($0.00100)
 *
 * Mirrors the helper used inside the SubscriptionPlans Credits card
 * and the CreditPackages modal, so the "Approx. cost value …" line
 * reads identically across admin panes.
 */
export function formatUsd(value: number): string {
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.01) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(5)}`;
}
