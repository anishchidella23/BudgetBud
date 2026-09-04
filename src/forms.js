/** Modal form submissions: transactions, savings, goals, bills, budget. */

import {
    addBill,
    addCategory,
    addContribution,
    addGoal,
    addTransaction,
    getTransaction,
    setMonthlyBudget,
    updateTransaction,
} from './actions.js';
import { state } from './state.js';
import { $ } from './ui/dom.js';
import { closeModal, openModal } from './ui/modal.js';
import { todayLocalISO } from './utils/date.js';
import { escapeHtml } from './utils/format.js';

/** Sentinel option that swaps the category select for a free-text field. */
const NEW_CATEGORY = '__new__';

/** id of the transaction being edited, or null when adding. */
let editingId = null;

export function renderCategoryOptions() {
    const options =
        state.categories.map((c) => `<option>${escapeHtml(c)}</option>`).join('') +
        `<option value="${NEW_CATEGORY}">+ New category…</option>`;

    const select = $('#categoryInput');
    const previous = select.value;
    select.innerHTML = options;
    if (state.categories.includes(previous)) select.value = previous;
}

function toggleNewCategoryField() {
    const isNew = $('#categoryInput').value === NEW_CATEGORY;
    const field = $('#newCategoryInput');
    field.hidden = !isNew;
    field.required = isNew;
    if (isNew) field.focus();
    else field.value = '';
}

/** Resolve the chosen category, creating it first if the user typed a new one. */
function resolveCategory() {
    if ($('#categoryInput').value !== NEW_CATEGORY) return $('#categoryInput').value;
    const created = addCategory($('#newCategoryInput').value);
    if (created) renderCategoryOptions();
    return created;
}

function resetAddForm() {
    $('#titleInput').value = '';
    $('#amountInput').value = '';
    $('#noteInput').value = '';
    $('#dateInput').value = todayLocalISO();
    $('#newCategoryInput').value = '';
    $('#newCategoryInput').hidden = true;
    $('#newCategoryInput').required = false;
}

/** Open the shared sheet in "add" mode. */
export function openAddTransaction() {
    editingId = null;
    renderCategoryOptions();
    resetAddForm();
    $('#addModalTitle').textContent = 'Add Transaction';
    $('#addSubmitBtn').textContent = 'Add';
    $('#clearBtn').hidden = false;
    openModal('modalAdd');
}

/** Open the same sheet prefilled, to edit an existing transaction. */
export function openEditTransaction(id) {
    const txn = getTransaction(id);
    if (!txn) return;
    editingId = id;
    renderCategoryOptions();
    resetAddForm();

    $('#titleInput').value = txn.name;
    $('#amountInput').value = String(txn.amount);
    $('#dateInput').value = txn.date;
    $('#noteInput').value = txn.note || '';
    if (state.categories.includes(txn.category)) $('#categoryInput').value = txn.category;

    $('#addModalTitle').textContent = 'Edit Transaction';
    $('#addSubmitBtn').textContent = 'Save';
    $('#clearBtn').hidden = true;
    openModal('modalAdd');
}

export function bindForms({ rerender, switchTab }) {
    renderCategoryOptions();
    $('#dateInput').value = todayLocalISO();

    $('#categoryInput').addEventListener('change', toggleNewCategoryField);
    $('#clearBtn').addEventListener('click', resetAddForm);

    $('#addForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#titleInput').value.trim();
        const amount = parseFloat($('#amountInput').value);
        const category = resolveCategory();
        if (!name || Number.isNaN(amount) || !category) return;

        const fields = {
            name,
            amount,
            category,
            date: $('#dateInput').value || todayLocalISO(),
            note: $('#noteInput').value.trim(),
        };

        if (editingId) updateTransaction(editingId, fields);
        else addTransaction(fields);

        const wasEditing = editingId !== null;
        editingId = null;
        resetAddForm();
        closeModal('modalAdd');
        rerender();
        if (!wasEditing) switchTab('transactions');
    });

    $('#addSavingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const goalId = $('#goalSelect').value;
        const amount = parseFloat($('#saveAmount').value);
        if (!goalId || Number.isNaN(amount) || amount <= 0) return;

        addContribution(goalId, amount);
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

        addGoal({ name, target, due });
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

        addBill({ name, amount, due });
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
        setMonthlyBudget(val);
        closeModal('modalEditBudget');
        rerender();
    });
}
