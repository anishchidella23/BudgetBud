// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clear, hasSavedState, load, save } from '../src/storage.js';
import { createDefaultState, replaceState, state } from '../src/state.js';

const KEY = 'budgetbud.state.v1';

const v1Blob = {
    monthlyBudget: 2400,
    transactions: [{ name: 'Rent', amount: -1150, category: 'Bills', date: '2026-09-01' }],
    bills: [{ name: 'Internet', amount: 60, due: '2026-09-15', paid: false }],
    goals: [{ id: 1, name: 'Emergency Fund', target: 3000, saved: 1850, due: '2027-05-01' }],
    savingsHistory: [{ month: 'Sep', saved: 1850 }],
};

beforeEach(() => {
    localStorage.clear();
    replaceState(createDefaultState());
});

describe('load', () => {
    it('starts from defaults when nothing is stored', () => {
        expect(load().transactions).toEqual([]);
        expect(hasSavedState()).toBe(false);
    });

    it('upgrades a v1 blob and keeps the data', () => {
        localStorage.setItem(KEY, JSON.stringify(v1Blob));
        const s = load();
        expect(s.monthlyBudget).toBe(2400);
        expect(s.transactions[0].name).toBe('Rent');
        expect(s.contributions[0].amount).toBe(1850);
    });

    it('writes the upgraded shape straight back to storage', () => {
        localStorage.setItem(KEY, JSON.stringify(v1Blob));
        load();
        const stored = JSON.parse(localStorage.getItem(KEY));
        expect(stored.version).toBe(2);
        expect(stored.contributions).toHaveLength(1);
        expect(stored).not.toHaveProperty('savingsHistory');
    });

    it('does not rewrite storage when the schema already matches', () => {
        localStorage.setItem(KEY, JSON.stringify(v1Blob));
        load();
        const first = localStorage.getItem(KEY);
        load();
        expect(localStorage.getItem(KEY)).toBe(first);
    });

    it('falls back to defaults on corrupt JSON instead of throwing', () => {
        localStorage.setItem(KEY, '{not json');
        expect(() => load()).not.toThrow();
        expect(state.transactions).toEqual([]);
    });
});

describe('save and clear', () => {
    it('round-trips the live state', () => {
        state.monthlyBudget = 1234;
        save();
        replaceState(createDefaultState());
        expect(load().monthlyBudget).toBe(1234);
    });

    it('clear wipes both storage and memory', () => {
        state.monthlyBudget = 999;
        save();
        clear();
        expect(hasSavedState()).toBe(false);
        expect(state.monthlyBudget).toBe(3000);
    });
});
