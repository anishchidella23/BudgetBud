/** Home screen: balance, monthly budget, bills, category chart, recent activity. */

import { removeBill, removeTransaction, setBillPaid, setPeriod, setViewDate } from '../actions.js';
import { drawDonutWithLeaders } from '../charts/donut.js';
import { sliceColor } from '../charts/svg.js';
import { computeTotals, spendingByCategory, state } from '../state.js';
import { $ } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { openEditTransaction } from '../forms.js';
import { addDaysLocalISO, addMonthsLocalISO, parseLocalDate, todayLocalISO } from '../utils/date.js';
import { escapeHtml, fmt, fmt2 } from '../utils/format.js';

let onChange = () => {};

function shiftView(delta) {
    const today = parseLocalDate(todayLocalISO());
    const next =
        state.period === 'month'
            ? addMonthsLocalISO(state.viewDate, delta)
            : addDaysLocalISO(state.viewDate, delta);
    // Never navigate into the future.
    setViewDate(parseLocalDate(next) > today ? todayLocalISO() : next);
    onChange();
}

export function bindHome(rerender) {
    onChange = rerender;

    $('#prevPeriod').addEventListener('click', () => shiftView(-1));
    $('#nextPeriod').addEventListener('click', () => shiftView(1));
    $('#togglePeriod').addEventListener('click', () => {
        setPeriod(state.period === 'month' ? 'day' : 'month');
        onChange();
    });

    $('#openAddBill').addEventListener('click', () => openModal('modalAddBill'));
    $('#editBudgetBtn').addEventListener('click', () => {
        $('#budgetInput').value = String(state.monthlyBudget);
        openModal('modalEditBudget');
    });

    // Bill rows are rebuilt on every render, so their actions are delegated.
    $('#billsList').addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-toggle-bill]');
        if (toggle) {
            const bill = state.bills.find((b) => b.id === toggle.dataset.toggleBill);
            if (bill) setBillPaid(bill.id, !bill.paid);
            onChange();
            return;
        }
        const del = e.target.closest('[data-del-bill]');
        if (del) {
            const bill = state.bills.find((b) => b.id === del.dataset.delBill);
            if (!bill) return;
            const extra = bill.paid ? ' This also removes its payment from your transactions.' : '';
            if (confirm(`Remove bill "${bill.name}" for $${fmt(bill.amount)}?${extra}`)) {
                removeBill(bill.id);
                onChange();
            }
        }
    });

    $('#recentTbody').addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit]');
        if (edit) {
            openEditTransaction(edit.dataset.edit);
            return;
        }
        const del = e.target.closest('[data-del]');
        if (!del) return;
        const txn = state.transactions.find((t) => t.id === del.dataset.del);
        if (!txn) return;
        if (
            confirm(
                `Remove "${txn.name}" on ${parseLocalDate(txn.date).toLocaleDateString()} for ${fmt2(txn.amount)}?`
            )
        ) {
            removeTransaction(txn.id);
            onChange();
        }
    });
}

export function renderHome() {
    const { balance, pct, remaining } = computeTotals();
    $('#totalBalance').textContent = `$${fmt2(balance)}`;
    $('#budgetPct').textContent = pct;
    $('#budgetBar').style.width = `${pct}%`;
    $('#remainingNote').textContent = `$${fmt(remaining)} left`;

    const bar = $('#budgetProgress');
    bar.setAttribute('aria-valuemax', String(state.monthlyBudget));
    bar.setAttribute('aria-valuenow', String(state.monthlyBudget - remaining));

    renderBills();
    renderPeriodControls();
    renderCategoryChart();
    renderRecent();
}

function renderBills() {
    $('#billsList').innerHTML = state.bills
        .map(
            (b) => `
      <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div>
          <div><strong>${escapeHtml(b.name)}</strong> · $${fmt(b.amount)}</div>
          <div class="subtle">${parseLocalDate(b.due).toLocaleDateString()}</div>
        </div>
        <div class="row" style="gap:8px; align-items:center;">
          <button class="pill ${b.paid ? 'paid' : 'action'}" data-toggle-bill="${b.id}" title="${b.paid ? 'Mark unpaid' : 'Mark paid'}">
            ${b.paid ? 'Paid' : 'Mark paid'}
          </button>
          <button class="pill danger" data-del-bill="${b.id}" title="Remove bill">🗑</button>
        </div>
      </div>`
        )
        .join('');

    $('#billsEmpty').hidden = state.bills.length > 0;
    $('#billsCount').textContent = `${state.bills.filter((b) => !b.paid).length} due`;
}

function renderPeriodControls() {
    const ref = parseLocalDate(state.viewDate);
    const today = parseLocalDate(todayLocalISO());

    $('#periodLabel').textContent = state.period === 'month' ? 'Month' : 'Day';
    $('#periodRange').textContent =
        state.period === 'month'
            ? ref.toLocaleString('default', { month: 'long', year: 'numeric' })
            : ref.toLocaleDateString();

    const atNewest =
        state.period === 'month'
            ? ref.getFullYear() === today.getFullYear() && ref.getMonth() === today.getMonth()
            : ref.toDateString() === today.toDateString();
    $('#nextPeriod').disabled = atNewest;
}

function renderCategoryChart() {
    const entries = spendingByCategory();
    const total = entries.reduce((sum, e) => sum + e.value, 0);
    drawDonutWithLeaders($('#pie'), entries, total);

    $('#category-legend').innerHTML = entries
        .map((e, i) => {
            const pct = total ? Math.round((e.value * 100) / total) : 0;
            return `<div class="category-item">
        <div class="color-block" style="background:${sliceColor(i)}"></div>
        <div>${escapeHtml(e.name)}: $${fmt(e.value)} (${pct}%)</div>
      </div>`;
        })
        .join('');
}

function renderRecent() {
    const recent = [...state.transactions].slice(-10).reverse();
    $('#recentTbody').innerHTML = recent
        .map(
            (t) => `
      <tr>
        <td>${parseLocalDate(t.date).toLocaleDateString()}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.category)}</td>
        <td class="right ${t.amount < 0 ? 'money-neg' : 'money-pos'}">${fmt2(t.amount)}</td>
        <td class="actions">
          <button class="pill" data-edit="${t.id}" title="Edit transaction">✎</button>
          <button class="pill danger" data-del="${t.id}" title="Remove transaction">🗑</button>
        </td>
      </tr>`
        )
        .join('');

    $('#recentEmpty').hidden = recent.length > 0;
}
