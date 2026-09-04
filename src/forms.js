/** Modal form submissions: transactions, savings, goals, bills, budget. */

import { extendHistoryToCurrent, state } from './state.js';
import { save } from './storage.js';
import { $ } from './ui/dom.js';
import { closeModal } from './ui/modal.js';
import { todayLocalISO } from './utils/date.js';
import { escapeHtml } from './utils/format.js';

export function bindForms({ rerender, switchTab }) {
    $('#categoryInput').innerHTML = state.categories.map((c) => `<option>${escapeHtml(c)}</option>`).join('');
    $('#dateInput').value = todayLocalISO();

    $('#clearBtn').addEventListener('click', () => {
        $('#titleInput').value = '';
        $('#amountInput').value = '';
        $('#noteInput').value = '';
    });

    $('#addForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#titleInput').value.trim();
        const amount = parseFloat($('#amountInput').value);
        if (!name || Number.isNaN(amount)) return;

        state.transactions.push({
            name,
            amount,
            category: $('#categoryInput').value,
            date: $('#dateInput').value || todayLocalISO(),
            note: $('#noteInput').value.trim(),
        });
        save();

        $('#titleInput').value = '';
        $('#amountInput').value = '';
        $('#noteInput').value = '';
        closeModal('modalAdd');
        rerender();
        switchTab('transactions');
    });

    $('#addSavingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const goalId = parseInt($('#goalSelect').value, 10);
        const amount = parseFloat($('#saveAmount').value);
        if (Number.isNaN(goalId) || Number.isNaN(amount) || amount <= 0) return;

        const goal = state.goals.find((g) => g.id === goalId);
        if (!goal) return;
        goal.saved += amount;

        // Credit the contribution to the current month's bucket.
        state.savingsHistory = extendHistoryToCurrent(state.savingsHistory);
        state.savingsHistory[state.savingsHistory.length - 1].saved += amount;
        save();

        $('#saveAmount').value = '';
        closeModal('modalAddSaving');
        rerender();
        switchTab('savings');
    });

    $('#newGoalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#goalName').value.trim();
        const target = parseFloat($('#goalTarget').value);
        const due = $('#goalDue').value || todayLocalISO();
        if (!name || Number.isNaN(target) || target <= 0) return;

        state.goals.push({ id: Date.now(), name, target, saved: 0, due });
        save();
        closeModal('modalNewGoal');
        rerender();
        switchTab('savings');
    });

    $('#addBillForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#billName').value.trim();
        const amount = parseFloat($('#billAmount').value);
        const due = $('#billDue').value || todayLocalISO();
        if (!name || Number.isNaN(amount) || amount <= 0) return;

        state.bills.push({ name, amount, due, paid: false });
        save();

        $('#billName').value = '';
        $('#billAmount').value = '';
        closeModal('modalAddBill');
        rerender();
        switchTab('home');
    });

    $('#editBudgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const val = Math.floor(parseFloat($('#budgetInput').value));
        if (Number.isNaN(val)) return;
        state.monthlyBudget = Math.max(0, val);
        save();
        closeModal('modalEditBudget');
        rerender();
    });
}
