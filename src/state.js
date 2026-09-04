/**
 * Application state and the pure selectors derived from it.
 *
 * Everything below `state` is a plain function of the state object so it can be
 * unit tested without a DOM.
 */

import { isSameDay, isSameMonth, monthKey, nextMonthKey, parseLocalDate, todayLocalISO } from './utils/date.js';

export const DEFAULT_CATEGORIES = [
    'Groceries',
    'Transport',
    'Dining',
    'Entertainment',
    'Bills',
    'Income',
    'Other',
];

export function createDefaultState() {
    return {
        monthlyBudget: 3000,
        period: 'month',
        viewDate: todayLocalISO(),
        transactions: [],
        categories: [...DEFAULT_CATEGORIES],
        bills: [],
        goals: [],
        savingsHistory: [],
    };
}

/** The live state object. Replaced wholesale on load, mutated thereafter. */
export let state = createDefaultState();

export function replaceState(next) {
    state = next;
    return state;
}

/**
 * Balance is all-time (every transaction ever), while budget usage is scoped to
 * the month being viewed — the original prototype measured the monthly budget
 * against all-time spending, so the bar disagreed with the chart beneath it.
 */
export function computeTotals(s = state) {
    const balance = s.transactions.reduce((sum, t) => sum + t.amount, 0);
    const ref = parseLocalDate(s.viewDate);
    const spent = s.transactions
        .filter((t) => t.amount < 0 && isSameMonth(t.date, ref))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const budget = Math.max(0, s.monthlyBudget);
    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    return { balance, spent, pct, remaining: Math.max(0, budget - spent) };
}

/** Expense totals per category for the viewed day or month, largest first. */
export function spendingByCategory(s = state) {
    const ref = parseLocalDate(s.viewDate);
    const map = {};
    s.transactions.forEach((t) => {
        if (t.amount >= 0) return;
        const inPeriod = s.period === 'month' ? isSameMonth(t.date, ref) : isSameDay(t.date, ref);
        if (inPeriod) map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

/** Filter + sort for the transactions screen. `mode` is 'date' or 'amount'. */
export function filterTransactions(s, { query = '', category = '', mode = 'date' } = {}) {
    const q = query.toLowerCase();
    return s.transactions
        .map((t, index) => ({ ...t, index }))
        .filter(
            (t) =>
                (!q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) &&
                (!category || t.category === category)
        )
        .sort((a, b) =>
            mode === 'date'
                ? parseLocalDate(b.date) - parseLocalDate(a.date)
                : Math.abs(b.amount) - Math.abs(a.amount)
        );
}

/**
 * Pad the savings history forward to the current month, carrying the running
 * total across untouched months. Entries are keyed "YYYY-MM" so the series
 * stays ordered across a year boundary.
 */
export function extendHistoryToCurrent(history, today = new Date()) {
    const current = monthKey(today);
    if (!history.length) return [{ month: current, saved: 0 }];

    const out = history.map((h) => ({ ...h }));
    let last = out[out.length - 1].month;
    // Guard against a corrupted trailing key rather than looping forever.
    let guard = 0;
    while (last < current && guard++ < 600) {
        last = nextMonthKey(last);
        out.push({ month: last, saved: out[out.length - 1].saved });
    }
    return out;
}

export function totalSaved(s = state) {
    return s.goals.reduce((sum, g) => sum + g.saved, 0);
}

/** Rows in CSV order, header included. */
export function transactionsToCsv(s = state) {
    const rows = [['date', 'name', 'category', 'amount', 'note']].concat(
        s.transactions.map((t) => [t.date, t.name, t.category, t.amount, t.note || ''])
    );
    return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}
