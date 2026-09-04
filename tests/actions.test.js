// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
    addBill,
    addCategory,
    addContribution,
    addGoal,
    addTransaction,
    removeBill,
    removeGoal,
    removeTransaction,
    setBillPaid,
    updateTransaction,
} from '../src/actions.js';
import { createDefaultState, goalSaved, replaceState, state, totalSaved } from '../src/state.js';
import { todayLocalISO } from '../src/utils/date.js';

beforeEach(() => {
    localStorage.clear();
    replaceState(createDefaultState());
});

describe('transactions', () => {
    it('adds with a stable id and persists', () => {
        const txn = addTransaction({ name: 'Coffee', amount: -4.5, category: 'Dining', date: '2025-11-07' });
        expect(txn.id).toBeTruthy();
        expect(state.transactions).toHaveLength(1);
        expect(JSON.parse(localStorage.getItem('budgetbud.state.v1')).transactions).toHaveLength(1);
    });

    it('edits in place without disturbing the id', () => {
        const txn = addTransaction({ name: 'Cofee', amount: -4.5, category: 'Dining', date: '2025-11-07' });
        updateTransaction(txn.id, { name: 'Coffee', amount: -5.25 });
        expect(state.transactions[0]).toMatchObject({ id: txn.id, name: 'Coffee', amount: -5.25 });
    });

    it('removes the right row when ids are similar', () => {
        const a = addTransaction({ name: 'A', amount: -1, category: 'Other', date: '2025-11-07' });
        addTransaction({ name: 'B', amount: -2, category: 'Other', date: '2025-11-07' });
        removeTransaction(a.id);
        expect(state.transactions.map((t) => t.name)).toEqual(['B']);
    });
});

describe('bills and the money they move', () => {
    it('records a transaction when a bill is marked paid', () => {
        const bill = addBill({ name: 'Rent', amount: 1150, due: '2025-11-01' });
        setBillPaid(bill.id, true);

        expect(state.transactions).toHaveLength(1);
        expect(state.transactions[0]).toMatchObject({
            name: 'Rent',
            amount: -1150,
            category: 'Bills',
            billId: bill.id,
            date: todayLocalISO(),
        });
    });

    it('removes that transaction when the bill is marked unpaid again', () => {
        const bill = addBill({ name: 'Rent', amount: 1150, due: '2025-11-01' });
        setBillPaid(bill.id, true);
        setBillPaid(bill.id, false);
        expect(state.transactions).toHaveLength(0);
        expect(state.bills[0].paid).toBe(false);
    });

    it('does not double-charge when told to pay twice', () => {
        const bill = addBill({ name: 'Rent', amount: 1150, due: '2025-11-01' });
        setBillPaid(bill.id, true);
        setBillPaid(bill.id, true);
        expect(state.transactions).toHaveLength(1);
    });

    it('takes the payment with it when the bill is deleted', () => {
        const bill = addBill({ name: 'Rent', amount: 1150, due: '2025-11-01' });
        setBillPaid(bill.id, true);
        removeBill(bill.id);
        expect(state.bills).toHaveLength(0);
        expect(state.transactions).toHaveLength(0);
    });

    it('marks the bill unpaid if its payment is deleted from the ledger', () => {
        const bill = addBill({ name: 'Rent', amount: 1150, due: '2025-11-01' });
        setBillPaid(bill.id, true);
        removeTransaction(state.transactions[0].id);
        expect(state.bills[0].paid).toBe(false);
    });

    it('always records a payment as an expense, whatever sign the bill has', () => {
        const bill = addBill({ name: 'Odd', amount: -75, due: '2025-11-01' });
        setBillPaid(bill.id, true);
        expect(state.transactions[0].amount).toBe(-75);
    });
});

describe('goals and contributions', () => {
    it('accumulates contributions against a goal', () => {
        const goal = addGoal({ name: 'Laptop', target: 1400, due: '2026-08-01' });
        addContribution(goal.id, 200);
        addContribution(goal.id, 110);
        expect(goalSaved(state, goal.id)).toBe(310);
    });

    it('deleting a goal removes its money from the totals', () => {
        const keep = addGoal({ name: 'Keep', target: 500, due: '2026-08-01' });
        const drop = addGoal({ name: 'Drop', target: 500, due: '2026-08-01' });
        addContribution(keep.id, 100);
        addContribution(drop.id, 640);
        expect(totalSaved(state)).toBe(740);

        removeGoal(drop.id);
        expect(state.goals).toHaveLength(1);
        expect(totalSaved(state)).toBe(100);
    });
});

describe('categories', () => {
    it('adds a new category', () => {
        expect(addCategory('Textbooks')).toBe('Textbooks');
        expect(state.categories).toContain('Textbooks');
    });

    it('trims and refuses duplicates case-insensitively', () => {
        addCategory('Textbooks');
        expect(addCategory('  textbooks  ')).toBe('Textbooks');
        expect(state.categories.filter((c) => c.toLowerCase() === 'textbooks')).toHaveLength(1);
    });

    it('ignores an empty name', () => {
        const before = state.categories.length;
        expect(addCategory('   ')).toBeNull();
        expect(state.categories).toHaveLength(before);
    });
});
