import { describe, expect, it } from 'vitest';
import {
    computeTotals,
    createDefaultState,
    extendHistoryToCurrent,
    filterTransactions,
    spendingByCategory,
    transactionsToCsv,
} from '../src/state.js';

/** State fixed to November 2025 with one October transaction outside the month. */
function fixture() {
    return {
        ...createDefaultState(),
        monthlyBudget: 1000,
        period: 'month',
        viewDate: '2025-11-07',
        transactions: [
            { name: 'Paycheck', amount: 2000, category: 'Income', date: '2025-11-01', note: '' },
            { name: 'Rent', amount: -800, category: 'Bills', date: '2025-11-01', note: '' },
            { name: 'Coffee', amount: -4.5, category: 'Dining', date: '2025-11-07', note: 'oat milk' },
            { name: 'Bus', amount: -2.5, category: 'Transport', date: '2025-11-07', note: '' },
            { name: 'Old laptop', amount: -500, category: 'Other', date: '2025-10-14', note: '' },
        ],
    };
}

describe('computeTotals', () => {
    it('reports balance across every transaction', () => {
        expect(computeTotals(fixture()).balance).toBe(693);
    });

    it('measures budget usage against the viewed month only', () => {
        // 800 + 4.50 + 2.50 spent in November; October's 500 is excluded.
        const { spent, pct, remaining } = computeTotals(fixture());
        expect(spent).toBe(807);
        expect(pct).toBe(81);
        expect(remaining).toBe(193);
    });

    it('follows the view as the user pages back a month', () => {
        const s = { ...fixture(), viewDate: '2025-10-14' };
        expect(computeTotals(s).spent).toBe(500);
    });

    it('caps usage at 100% and never reports negative headroom', () => {
        const s = { ...fixture(), monthlyBudget: 100 };
        const { pct, remaining } = computeTotals(s);
        expect(pct).toBe(100);
        expect(remaining).toBe(0);
    });

    it('handles a zero budget without dividing by zero', () => {
        const s = { ...fixture(), monthlyBudget: 0 };
        expect(computeTotals(s).pct).toBe(0);
    });
});

describe('spendingByCategory', () => {
    it('totals expenses for the viewed month, largest first', () => {
        expect(spendingByCategory(fixture())).toEqual([
            { name: 'Bills', value: 800 },
            { name: 'Dining', value: 4.5 },
            { name: 'Transport', value: 2.5 },
        ]);
    });

    it('narrows to a single day in day mode', () => {
        const s = { ...fixture(), period: 'day' };
        expect(spendingByCategory(s)).toEqual([
            { name: 'Dining', value: 4.5 },
            { name: 'Transport', value: 2.5 },
        ]);
    });

    it('excludes income', () => {
        const names = spendingByCategory(fixture()).map((e) => e.name);
        expect(names).not.toContain('Income');
    });
});

describe('filterTransactions', () => {
    it('sorts by date, newest first, by default', () => {
        const list = filterTransactions(fixture());
        expect(list[0].date).toBe('2025-11-07');
        expect(list.at(-1).date).toBe('2025-10-14');
    });

    it('sorts by absolute amount', () => {
        const list = filterTransactions(fixture(), { mode: 'amount' });
        expect(list.map((t) => Math.abs(t.amount))).toEqual([2000, 800, 500, 4.5, 2.5]);
    });

    it('matches name or category, case-insensitively', () => {
        expect(filterTransactions(fixture(), { query: 'coff' })).toHaveLength(1);
        expect(filterTransactions(fixture(), { query: 'transport' })).toHaveLength(1);
    });

    it('filters by category', () => {
        const list = filterTransactions(fixture(), { category: 'Bills' });
        expect(list).toHaveLength(1);
        expect(list[0].name).toBe('Rent');
    });

    it('keeps each row pointing at its index in the unfiltered list', () => {
        const [coffee] = filterTransactions(fixture(), { query: 'coffee' });
        expect(fixture().transactions[coffee.index].name).toBe('Coffee');
    });
});

describe('extendHistoryToCurrent', () => {
    it('seeds an empty history with the current month', () => {
        expect(extendHistoryToCurrent([], new Date(2025, 10, 7))).toEqual([{ month: '2025-11', saved: 0 }]);
    });

    it('carries the running total forward over untouched months', () => {
        const out = extendHistoryToCurrent([{ month: '2025-09', saved: 300 }], new Date(2025, 10, 7));
        expect(out).toEqual([
            { month: '2025-09', saved: 300 },
            { month: '2025-10', saved: 300 },
            { month: '2025-11', saved: 300 },
        ]);
    });

    it('crosses a year boundary in order', () => {
        const out = extendHistoryToCurrent([{ month: '2025-11', saved: 50 }], new Date(2026, 0, 3));
        expect(out.map((h) => h.month)).toEqual(['2025-11', '2025-12', '2026-01']);
    });

    it('is a no-op when history already reaches the current month', () => {
        const history = [{ month: '2025-11', saved: 10 }];
        expect(extendHistoryToCurrent(history, new Date(2025, 10, 7))).toEqual(history);
    });

    it('does not mutate the history it is given', () => {
        const history = [{ month: '2025-09', saved: 300 }];
        extendHistoryToCurrent(history, new Date(2025, 10, 7));
        expect(history).toHaveLength(1);
    });
});

describe('transactionsToCsv', () => {
    it('writes a header row and quotes every field', () => {
        const csv = transactionsToCsv(fixture()).split('\n');
        expect(csv[0]).toBe('"date","name","category","amount","note"');
        expect(csv[1]).toBe('"2025-11-01","Paycheck","Income","2000",""');
    });

    it('escapes embedded quotes', () => {
        const s = {
            ...createDefaultState(),
            transactions: [{ name: 'The "Good" Cafe', amount: -3, category: 'Dining', date: '2025-11-07', note: '' }],
        };
        expect(transactionsToCsv(s)).toContain('"The ""Good"" Cafe"');
    });
});
