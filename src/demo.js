/**
 * Sample data for the hosted demo.
 *
 * A budgeting app with no data in it shows nothing but zeroes and an empty
 * chart, which makes the deployed build useless as a demonstration. Dates are
 * generated relative to today so the sample always lands in the current month.
 */

import { createDefaultState, newId, replaceState } from './state.js';
import { save } from './storage.js';
import { monthKey, todayLocalISO } from './utils/date.js';

/** Clamp a day-of-month to a date that has already happened this month. */
function dayThisMonth(day, today = new Date()) {
    const safe = Math.max(1, Math.min(day, today.getDate()));
    return `${monthKey(today)}-${String(safe).padStart(2, '0')}`;
}

function dayAhead(offset, today = new Date()) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildDemoState(today = new Date()) {
    const s = createDefaultState();
    s.monthlyBudget = 2400;
    s.viewDate = todayLocalISO();

    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
    const lastMonthIso = `${monthKey(lastMonth)}-15`;

    const txns = [
        ['Textbooks', -89, 'Other', lastMonthIso, 'last month'],
        ['Paycheck', 2450, 'Income', dayThisMonth(1, today), ''],
        ['Rent', -1150, 'Bills', dayThisMonth(1, today), 'monthly'],
        ['Trader Joes', -84.32, 'Groceries', dayThisMonth(2, today), ''],
        ['Metro card', -32, 'Transport', dayThisMonth(2, today), 'monthly pass'],
        ['Ramen with Sam', -27.4, 'Dining', dayThisMonth(3, today), ''],
        ['Spotify', -11.99, 'Entertainment', dayThisMonth(3, today), ''],
        ['Giant', -63.18, 'Groceries', dayThisMonth(3, today), ''],
        ['Uber home', -18.6, 'Transport', dayThisMonth(4, today), 'rain'],
        ['Coffee', -4.75, 'Dining', dayThisMonth(4, today), 'oat milk'],
        ['Movie night', -16, 'Entertainment', dayThisMonth(4, today), ''],
    ];
    s.transactions = txns.map(([name, amount, category, date, note]) => ({
        id: newId(),
        name,
        amount,
        category,
        date,
        note,
    }));

    s.bills = [
        { id: newId(), name: 'Rent', amount: 1150, due: dayAhead(6, today), paid: false },
        { id: newId(), name: 'Internet', amount: 60, due: dayAhead(11, today), paid: false },
        { id: newId(), name: 'Phone', amount: 45, due: dayAhead(19, today), paid: false },
    ];

    const goals = [
        ['Emergency Fund', 3000, 5],
        ['Spring Break', 1200, 3],
        ['New Laptop', 1400, 8],
    ];
    s.goals = goals.map(([name, target, monthsOut]) => ({
        id: newId(),
        name,
        target,
        due: `${monthKey(new Date(today.getFullYear(), today.getMonth() + monthsOut, 1))}-01`,
    }));

    // Six months of steady contributions so the savings chart has a shape.
    const schedule = [
        [0, [200, 120, 80]],
        [1, [250, 100, 60]],
        [2, [300, 120, 40]],
        [3, [350, 100, 50]],
        [4, [400, 100, 40]],
        [5, [350, 100, 40]],
    ];
    s.contributions = [];
    schedule.forEach(([monthsAgo, amounts]) => {
        const month = monthKey(new Date(today.getFullYear(), today.getMonth() - (5 - monthsAgo), 1));
        amounts.forEach((amount, i) => {
            s.contributions.push({ id: newId(), goalId: s.goals[i].id, amount, date: `${month}-05` });
        });
    });

    return s;
}

export function loadDemoData() {
    const next = replaceState(buildDemoState());
    save();
    return next;
}
