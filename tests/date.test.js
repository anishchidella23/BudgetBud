import { describe, expect, it } from 'vitest';
import {
    addDaysLocalISO,
    addMonthsLocalISO,
    isSameDay,
    isSameMonth,
    monthKey,
    monthLabel,
    nextMonthKey,
    parseLocalDate,
    toLocalISO,
} from '../src/utils/date.js';

describe('local date handling', () => {
    it('parses an ISO day as local midnight, not UTC', () => {
        const d = parseLocalDate('2025-11-07');
        expect(d.getFullYear()).toBe(2025);
        expect(d.getMonth()).toBe(10);
        expect(d.getDate()).toBe(7);
    });

    it('round-trips through toLocalISO', () => {
        expect(toLocalISO(parseLocalDate('2025-01-05'))).toBe('2025-01-05');
    });

    it('adds days across a month boundary', () => {
        expect(addDaysLocalISO('2025-01-31', 1)).toBe('2025-02-01');
        expect(addDaysLocalISO('2025-03-01', -1)).toBe('2025-02-28');
    });

    it('adds months across a year boundary', () => {
        expect(addMonthsLocalISO('2025-12-15', 1)).toBe('2026-01-15');
        expect(addMonthsLocalISO('2025-01-15', -1)).toBe('2024-12-15');
    });

    it('compares months and days against a reference date', () => {
        const ref = parseLocalDate('2025-11-07');
        expect(isSameMonth('2025-11-30', ref)).toBe(true);
        expect(isSameMonth('2025-12-01', ref)).toBe(false);
        expect(isSameDay('2025-11-07', ref)).toBe(true);
        expect(isSameDay('2025-11-08', ref)).toBe(false);
    });
});

describe('month keys', () => {
    it('formats and advances keys', () => {
        expect(monthKey(new Date(2025, 10, 7))).toBe('2025-11');
        expect(nextMonthKey('2025-12')).toBe('2026-01');
        expect(monthLabel('2025-11')).toBe('Nov');
    });

    it('sorts lexicographically in chronological order', () => {
        const keys = ['2026-01', '2025-02', '2025-11'];
        expect([...keys].sort()).toEqual(['2025-02', '2025-11', '2026-01']);
    });
});
