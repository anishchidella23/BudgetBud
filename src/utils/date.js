/**
 * Local-date helpers.
 *
 * Dates are stored as "YYYY-MM-DD" strings and always parsed as *local* dates.
 * `new Date("2025-11-07")` parses as UTC midnight, which shifts a day backwards
 * in western timezones, so parseLocalDate splits the string by hand instead.
 */

export function parseLocalDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function toLocalISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export const todayLocalISO = () => toLocalISO(new Date());

export function addDaysLocalISO(iso, delta) {
    const d = parseLocalDate(iso);
    d.setDate(d.getDate() + delta);
    return toLocalISO(d);
}

export function addMonthsLocalISO(iso, delta) {
    const d = parseLocalDate(iso);
    d.setMonth(d.getMonth() + delta);
    return toLocalISO(d);
}

export function isSameMonth(s, refDate = new Date()) {
    const dt = typeof s === 'string' ? parseLocalDate(s) : s;
    return dt.getFullYear() === refDate.getFullYear() && dt.getMonth() === refDate.getMonth();
}

export function isSameDay(s, refDate = new Date()) {
    const dt = typeof s === 'string' ? parseLocalDate(s) : s;
    return (
        dt.getFullYear() === refDate.getFullYear() &&
        dt.getMonth() === refDate.getMonth() &&
        dt.getDate() === refDate.getDate()
    );
}

/** "2025-11" — the key savings history is bucketed by. */
export const monthKey = (date = new Date()) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** "2025-11" -> "Nov" for chart labels. */
export function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' });
}

/** Advance a "YYYY-MM" key by one month. */
export function nextMonthKey(key) {
    const [y, m] = key.split('-').map(Number);
    return monthKey(new Date(y, m, 1));
}
