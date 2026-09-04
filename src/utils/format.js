/** Number and text formatting helpers. */

/** Whole-dollar formatting: 1234.56 -> "1,235". */
export const fmt = (n) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Cent-precision formatting: 1234.5 -> "1,234.50". */
export const fmt2 = (n) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Escape a value for interpolation into an HTML template string.
 * Every user-supplied field (transaction names, bill names, categories, goal
 * names) must go through this before it reaches innerHTML.
 */
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
