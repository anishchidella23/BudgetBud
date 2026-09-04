/**
 * Application state and the pure selectors derived from it.
 *
 * Everything below `state` is a plain function of a state object so it can be
 * unit tested without a DOM. Mutations live in actions.js.
 */

import {
    isSameDay,
    isSameMonth,
    monthKey,
    nextMonthKey,
    parseLocalDate,
    todayLocalISO,
} from './utils/date.js';

export const SCHEMA_VERSION = 2;

export const DEFAULT_CATEGORIES = [
    'Groceries',
    'Transport',
    'Dining',
    'Entertainment',
    'Bills',
    'Income',
    'Savings',
    'Other',
];

let idCounter = 0;

/** Stable id for a record. Crypto-backed where available, counter otherwise. */
export function newId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    idCounter += 1;
    return `id-${Date.now()}-${idCounter}`;
}

export function createDefaultState() {
    return {
        version: SCHEMA_VERSION,
        monthlyBudget: 3000,
        period: 'month',
        viewDate: todayLocalISO(),
        categories: [...DEFAULT_CATEGORIES],
        transactions: [],
        bills: [],
        goals: [],
        /** Money moved into a goal: {id, goalId, amount, date}. */
        contributions: [],
    };
}

/** The live state object. Replaced wholesale on load, mutated thereafter. */
export let state = createDefaultState();

export function replaceState(next) {
    state = next;
    return state;
}

/**
 * Bring a persisted state object up to the current schema.
 *
 * v1 stored `goal.saved` alongside a separate `savingsHistory` running total,
 * which let the two drift apart — deleting a goal left its money in the chart
 * forever. v2 keeps a contribution log and derives both from it.
 */
export function migrate(raw, today = new Date()) {
    const base = createDefaultState();
    if (!raw || typeof raw !== 'object') return base;

    const next = { ...base, ...raw, version: SCHEMA_VERSION };

    next.transactions = (raw.transactions ?? []).map((t) => ({ ...t, id: t.id ?? newId() }));
    next.bills = (raw.bills ?? []).map((b) => ({ ...b, id: b.id ?? newId() }));

    if (raw.version === SCHEMA_VERSION && Array.isArray(raw.contributions)) {
        next.goals = (raw.goals ?? []).map((g) => ({ ...g, id: g.id ?? newId() }));
        next.contributions = raw.contributions.map((c) => ({ ...c, id: c.id ?? newId() }));
        return next;
    }

    // v1 -> v2: fold each goal's stored balance into a single contribution.
    // The per-month breakdown in v1's savingsHistory can't be attributed back
    // to individual goals, so the series is rebuilt from goal balances instead.
    const seededDate = `${monthKey(today)}-01`;
    next.goals = [];
    next.contributions = [];
    (raw.goals ?? []).forEach((g) => {
        const id = g.id ?? newId();
        const { saved, ...rest } = g;
        next.goals.push({ ...rest, id });
        if (saved > 0) {
            next.contributions.push({ id: newId(), goalId: id, amount: saved, date: seededDate });
        }
    });
    delete next.savingsHistory;
    return next;
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
    const q = query.trim().toLowerCase();
    return s.transactions
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

/** What a goal has accumulated, derived from its contributions. */
export function goalSaved(s, goalId) {
    return s.contributions.filter((c) => c.goalId === goalId).reduce((sum, c) => sum + c.amount, 0);
}

export function totalSaved(s = state) {
    return s.contributions.reduce((sum, c) => sum + c.amount, 0);
}

/**
 * Cumulative savings by month for the line chart, as [{month, saved}].
 *
 * Months with no contributions still need a point, otherwise the chart draws a
 * straight line between distant months and implies steady saving that didn't
 * happen — so gaps carry the running total forward.
 */
export function savingsSeries(s = state, today = new Date()) {
    const current = monthKey(today);
    const byMonth = {};
    s.contributions.forEach((c) => {
        const key = c.date.slice(0, 7);
        byMonth[key] = (byMonth[key] || 0) + c.amount;
    });

    const months = Object.keys(byMonth).sort();
    if (!months.length) return [{ month: current, saved: 0 }];

    const out = [];
    let running = 0;
    let cursor = months[0];
    // Walk month by month from the first contribution to today, filling gaps.
    let guard = 0;
    while (cursor <= current && guard++ < 600) {
        running += byMonth[cursor] ?? 0;
        out.push({ month: cursor, saved: running });
        cursor = nextMonthKey(cursor);
    }
    // Contributions dated in the future still belong on the chart.
    months
        .filter((m) => m > current)
        .forEach((m) => {
            running += byMonth[m];
            out.push({ month: m, saved: running });
        });
    return out;
}

/** Rows in CSV order, header included. Pass a filtered list to export a subset. */
export function transactionsToCsv(txns) {
    const list = Array.isArray(txns) ? txns : txns.transactions;
    const rows = [['date', 'name', 'category', 'amount', 'note']].concat(
        list.map((t) => [t.date, t.name, t.category, t.amount, t.note || ''])
    );
    return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}
