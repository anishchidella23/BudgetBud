// @vitest-environment jsdom
/**
 * Integration tests: mount the real index.html, boot main.js against it, and
 * drive the app through the DOM the way a user would.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const click = (sel) => $(sel).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

beforeAll(async () => {
    localStorage.clear();
    document.body.innerHTML = body;
    // jsdom has no layout engine, so give the chart code a viewBox to read.
    await import('../src/main.js');
});

describe('first run', () => {
    it('offers demo data when the app is empty', () => {
        expect($('#demoBanner').hidden).toBe(false);
        expect($('#recentEmpty').hidden).toBe(false);
        expect($('#goalsEmpty').hidden).toBe(false);
        expect($('#billsEmpty').hidden).toBe(false);
    });

    it('hides the destructive clear-data control while there is nothing to clear', () => {
        expect($('#clearDataBtn').hidden).toBe(true);
    });
});

describe('after loading demo data', () => {
    beforeAll(() => {
        click('#loadDemoBtn');
    });

    it('fills the summary cards', () => {
        expect($('#totalBalance').textContent).not.toBe('$0.00');
        expect(Number($('#budgetPct').textContent)).toBeGreaterThan(0);
        expect($('#demoBanner').hidden).toBe(true);
        expect($('#clearDataBtn').hidden).toBe(false);
    });

    it('lists bills and counts only the unpaid ones', () => {
        expect($$('#billsList [data-toggle-bill]')).toHaveLength(3);
        expect($('#billsCount').textContent).toBe('3 due');
        expect($('#billsEmpty').hidden).toBe(true);
    });

    it('renders goals with progress and a savings total', () => {
        expect($$('#goals .goal')).toHaveLength(3);
        expect($('#savedTotal').textContent).not.toBe('$0');
        expect($('#goalsEmpty').hidden).toBe(true);
    });

    it('draws the donut with one path per spending category', () => {
        const slices = $$('#pie path:not(.leader-line)');
        expect(slices.length).toBeGreaterThan(1);
    });

    it('spaces every leader label at least 13px from its neighbour', () => {
        // The regression this guards: several thin slices in a row used to
        // stack their labels 2px apart.
        const labels = $$('#pie text.leader-label');
        expect(labels.length).toBeGreaterThan(2);

        const bySide = { left: [], right: [] };
        labels.forEach((l) => {
            const side = l.getAttribute('text-anchor') === 'start' ? 'right' : 'left';
            bySide[side].push(Number(l.getAttribute('y')));
        });
        Object.values(bySide).forEach((ys) => {
            ys.sort((a, b) => a - b);
            for (let i = 1; i < ys.length; i++) {
                expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(12.99);
            }
        });
    });

    it('plots the savings line chart', () => {
        expect($('#lineChart polyline').getAttribute('points').split(' ').length).toBeGreaterThan(1);
    });
});

describe('paying a bill', () => {
    it('moves money and records a transaction', () => {
        const before = $('#totalBalance').textContent;
        const rentButton = $$('#billsList > .row')
            .find((row) => row.textContent.includes('Rent'))
            .querySelector('[data-toggle-bill]');
        rentButton.click();

        expect($('#billsCount').textContent).toBe('2 due');
        expect($('#totalBalance').textContent).not.toBe(before);
        expect($('#recentTbody').textContent).toContain('Rent');
    });

    it('gives the money back when unpaid', () => {
        const paid = $$('#billsList [data-toggle-bill]').find((b) => b.textContent.trim() === 'Paid');
        paid.click();
        expect($('#billsCount').textContent).toBe('3 due');
    });
});

describe('transactions screen', () => {
    beforeAll(() => {
        click('.tab[data-tab="transactions"]');
    });

    it('shows the whole ledger', () => {
        expect($$('#txTbody tr').length).toBeGreaterThan(5);
        expect($('#txEmpty').hidden).toBe(true);
    });

    it('filters by search text and marks the count as filtered', () => {
        $('#search').value = 'coffee';
        $('#search').dispatchEvent(new window.Event('input'));
        expect($$('#txTbody tr')).toHaveLength(1);
        expect($('#resultCount').textContent).toContain('filtered');
    });

    it('distinguishes "no matches" from "no data"', () => {
        $('#search').value = 'zzzznothing';
        $('#search').dispatchEvent(new window.Event('input'));
        expect($('#txEmpty').hidden).toBe(false);
        expect($('#txEmpty').textContent).toContain('match');

        $('#search').value = '';
        $('#search').dispatchEvent(new window.Event('input'));
    });

    it('keeps the sort mode across a re-render', () => {
        click('#sortBtn');
        expect($('#sortBtn').textContent).toBe('Sort (Amount)');
        // Deleting elsewhere triggers a full re-render.
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        $('#recentTbody [data-del]')?.click();
        expect($('#sortBtn').textContent).toBe('Sort (Amount)');
        vi.restoreAllMocks();
        click('#sortBtn');
    });
});

describe('adding and editing', () => {
    beforeAll(() => {
        click('.tab[data-tab="transactions"]');
    });

    const submitAddForm = () =>
        $('#addForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    it('escapes markup in user-entered names', () => {
        click('#addBtn');
        $('#titleInput').value = 'Latte <b>oat</b>';
        $('#amountInput').value = '-4.75';
        $('#categoryInput').value = 'Dining';
        $('#dateInput').value = '2026-01-05';
        submitAddForm();

        const row = $$('#txTbody tr').find((tr) => tr.textContent.includes('Latte'));
        expect(row).toBeDefined();
        expect(row.querySelector('b')).toBeNull();
        expect(row.textContent).toContain('Latte <b>oat</b>');
    });

    it('creates a category on demand', () => {
        click('#addBtn');
        $('#categoryInput').value = '__new__';
        $('#categoryInput').dispatchEvent(new window.Event('change'));
        expect($('#newCategoryInput').hidden).toBe(false);

        $('#titleInput').value = 'Calculus textbook';
        $('#amountInput').value = '-120';
        $('#newCategoryInput').value = 'Textbooks';
        $('#dateInput').value = '2026-01-06';
        submitAddForm();

        expect($$('#catFilter option').map((o) => o.textContent)).toContain('Textbooks');
        const row = $$('#txTbody tr').find((tr) => tr.textContent.includes('Calculus'));
        expect(row.textContent).toContain('Textbooks');
    });

    it('edits an existing row in place', () => {
        const row = $$('#txTbody tr').find((tr) => tr.textContent.includes('Calculus'));
        row.querySelector('[data-edit]').click();

        expect($('#addModalTitle').textContent).toBe('Edit Transaction');
        expect($('#titleInput').value).toBe('Calculus textbook');
        expect($('#addSubmitBtn').textContent).toBe('Save');

        $('#titleInput').value = 'Calculus textbook (used)';
        $('#amountInput').value = '-80';
        submitAddForm();

        expect($('#txTbody').textContent).toContain('Calculus textbook (used)');
        expect($('#txTbody').textContent).not.toContain('Calculus textbook<');
        expect($$('#txTbody tr').filter((tr) => tr.textContent.includes('Calculus'))).toHaveLength(1);
    });
});

describe('modals', () => {
    it('closes on Escape', () => {
        click('#addBtn');
        expect($('#modalAdd').classList.contains('show')).toBe(true);
        document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect($('#modalAdd').classList.contains('show')).toBe(false);
    });
});
