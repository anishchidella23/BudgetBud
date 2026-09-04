import { describe, expect, it } from 'vitest';
import {
    computeTotals,
    createDefaultState,
    filterTransactions,
    goalSaved,
    migrate,
    savingsSeries,
    spendingByCategory,
    totalSaved,
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
            { id: 't1', name: 'Paycheck', amount: 2000, category: 'Income', date: '2025-11-01', note: '' },
            { id: 't2', name: 'Rent', amount: -800, category: 'Bills', date: '2025-11-01', note: '' },
            {
                id: 't3',
                name: 'Coffee',
                amount: -4.5,
                category: 'Dining',
                date: '2025-11-07',
                note: 'oat milk',
            },
            { id: 't4', name: 'Bus', amount: -2.5, category: 'Transport', date: '2025-11-07', note: '' },
            { id: 't5', name: 'Old laptop', amount: -500, category: 'Other', date: '2025-10-14', note: '' },
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

    it('returns rows carrying their stable id', () => {
        const [coffee] = filterTransactions(fixture(), { query: 'coffee' });
        expect(coffee.id).toBe('t3');
    });
});

describe('savings, derived from contributions', () => {
    const withGoals = () => ({
        ...createDefaultState(),
        goals: [
            { id: 'g1', name: 'Emergency Fund', target: 3000, due: '2027-05-01' },
            { id: 'g2', name: 'Spring Break', target: 1200, due: '2027-03-01' },
        ],
        contributions: [
            { id: 'c1', goalId: 'g1', amount: 300, date: '2025-09-05' },
            { id: 'c2', goalId: 'g2', amount: 100, date: '2025-09-20' },
            { id: 'c3', goalId: 'g1', amount: 250, date: '2025-11-02' },
        ],
    });

    it('totals each goal from its own contributions', () => {
        const s = withGoals();
        expect(goalSaved(s, 'g1')).toBe(550);
        expect(goalSaved(s, 'g2')).toBe(100);
        expect(totalSaved(s)).toBe(650);
    });

    it('accumulates the chart series month by month', () => {
        expect(savingsSeries(withGoals(), new Date(2025, 10, 7))).toEqual([
            { month: '2025-09', saved: 400 },
            { month: '2025-10', saved: 400 },
            { month: '2025-11', saved: 650 },
        ]);
    });

    it('carries the running total through months with no contributions', () => {
        const s = {
            ...withGoals(),
            contributions: [{ id: 'c1', goalId: 'g1', amount: 300, date: '2025-09-05' }],
        };
        expect(savingsSeries(s, new Date(2025, 11, 1)).map((p) => p.saved)).toEqual([300, 300, 300, 300]);
    });

    it('crosses a year boundary in order', () => {
        const s = {
            ...withGoals(),
            contributions: [{ id: 'c1', goalId: 'g1', amount: 50, date: '2025-11-04' }],
        };
        expect(savingsSeries(s, new Date(2026, 0, 3)).map((p) => p.month)).toEqual([
            '2025-11',
            '2025-12',
            '2026-01',
        ]);
    });

    it('seeds an empty series with the current month', () => {
        expect(savingsSeries(createDefaultState(), new Date(2025, 10, 7))).toEqual([
            { month: '2025-11', saved: 0 },
        ]);
    });

    it('drops a deleted goal from the series instead of stranding its money', () => {
        const s = withGoals();
        // What removeGoal() does: the goal and its contributions go together.
        s.goals = s.goals.filter((g) => g.id !== 'g1');
        s.contributions = s.contributions.filter((c) => c.goalId !== 'g1');
        expect(totalSaved(s)).toBe(100);
        expect(savingsSeries(s, new Date(2025, 10, 7)).at(-1).saved).toBe(100);
    });
});

describe('migrate', () => {
    const v1 = () => ({
        monthlyBudget: 2400,
        transactions: [{ name: 'Rent', amount: -1150, category: 'Bills', date: '2025-11-01' }],
        bills: [{ name: 'Internet', amount: 60, due: '2025-11-15', paid: false }],
        goals: [{ id: 1, name: 'Emergency Fund', target: 3000, saved: 1850, due: '2027-05-01' }],
        savingsHistory: [{ month: 'Sep', saved: 900 }],
    });

    it('assigns ids to records that lack them', () => {
        const s = migrate(v1(), new Date(2025, 10, 7));
        expect(s.transactions[0].id).toBeTruthy();
        expect(s.bills[0].id).toBeTruthy();
    });

    it('converts a stored goal balance into a contribution', () => {
        const s = migrate(v1(), new Date(2025, 10, 7));
        expect(s.goals[0]).not.toHaveProperty('saved');
        expect(s.contributions).toHaveLength(1);
        expect(goalSaved(s, s.goals[0].id)).toBe(1850);
    });

    it('drops the v1 running total that could drift', () => {
        expect(migrate(v1(), new Date(2025, 10, 7))).not.toHaveProperty('savingsHistory');
    });

    it('preserves user settings and fills in new defaults', () => {
        const s = migrate(v1(), new Date(2025, 10, 7));
        expect(s.monthlyBudget).toBe(2400);
        expect(s.version).toBe(2);
        expect(Array.isArray(s.categories)).toBe(true);
    });

    it('leaves an already-migrated state alone', () => {
        const s = migrate(v1(), new Date(2025, 10, 7));
        const again = migrate(JSON.parse(JSON.stringify(s)), new Date(2025, 10, 7));
        expect(again.contributions).toHaveLength(1);
        expect(again.goals).toHaveLength(1);
    });

    it('falls back to defaults on junk input', () => {
        expect(migrate(null).version).toBe(2);
        expect(migrate('nonsense').transactions).toEqual([]);
    });

    it('skips goals that never had a balance', () => {
        const raw = { goals: [{ name: 'Untouched', target: 500, saved: 0, due: '2027-01-01' }] };
        expect(migrate(raw, new Date(2025, 10, 7)).contributions).toEqual([]);
    });
});

describe('transactionsToCsv', () => {
    it('writes a header row and quotes every field', () => {
        const csv = transactionsToCsv(fixture().transactions).split('\n');
        expect(csv[0]).toBe('"date","name","category","amount","note"');
        expect(csv[1]).toBe('"2025-11-01","Paycheck","Income","2000",""');
    });

    it('escapes embedded quotes', () => {
        const s = {
            ...createDefaultState(),
            transactions: [
                {
                    id: 'x',
                    name: 'The "Good" Cafe',
                    amount: -3,
                    category: 'Dining',
                    date: '2025-11-07',
                    note: '',
                },
            ],
        };
        expect(transactionsToCsv(s.transactions)).toContain('"The ""Good"" Cafe"');
    });
});
