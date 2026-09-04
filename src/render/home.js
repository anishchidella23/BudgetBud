/** Home screen: balance, monthly budget, bills, category chart, recent activity. */

import { drawDonutWithLeaders } from '../charts/donut.js';
import { sliceColor } from '../charts/svg.js';
import { computeTotals, spendingByCategory, state } from '../state.js';
import { save } from '../storage.js';
import { $ } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { addDaysLocalISO, addMonthsLocalISO, parseLocalDate, todayLocalISO } from '../utils/date.js';
import { escapeHtml, fmt, fmt2 } from '../utils/format.js';

let onChange = () => {};

function shiftView(delta) {
    const today = parseLocalDate(todayLocalISO());
    state.viewDate =
        state.period === 'month'
            ? addMonthsLocalISO(state.viewDate, delta)
            : addDaysLocalISO(state.viewDate, delta);
    // Never navigate into the future.
    if (parseLocalDate(state.viewDate) > today) state.viewDate = todayLocalISO();
    save();
    onChange();
}

export function bindHome(rerender) {
    onChange = rerender;

    $('#prevPeriod').addEventListener('click', () => shiftView(-1));
    $('#nextPeriod').addEventListener('click', () => shiftView(1));
    $('#togglePeriod').addEventListener('click', () => {
        state.period = state.period === 'month' ? 'day' : 'month';
        save();
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
            const bill = state.bills[+toggle.dataset.toggleBill];
            bill.paid = !bill.paid;
            save();
            onChange();
            return;
        }
        const del = e.target.closest('[data-del-bill]');
        if (del) {
            const idx = +del.dataset.delBill;
            const bill = state.bills[idx];
            if (confirm(`Remove bill "${bill.name}" for $${fmt(bill.amount)}?`)) {
                state.bills.splice(idx, 1);
                save();
                onChange();
            }
        }
    });

    $('#recentTbody').addEventListener('click', (e) => {
        const del = e.target.closest('[data-del]');
        if (!del) return;
        const idx = +del.dataset.del;
        const tx = state.transactions[idx];
        if (confirm(`Remove "${tx.name}" on ${parseLocalDate(tx.date).toLocaleDateString()} for ${fmt2(tx.amount)}?`)) {
            state.transactions.splice(idx, 1);
            save();
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
    const list = $('#billsList');
    list.innerHTML = state.bills
        .map(
            (b, i) => `
      <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div>
          <div><strong>${escapeHtml(b.name)}</strong> · $${fmt(b.amount)}</div>
          <div class="subtle">${parseLocalDate(b.due).toLocaleDateString()}</div>
        </div>
        <div class="row" style="gap:8px; align-items:center;">
          <button class="pill ${b.paid ? 'paid' : 'action'}" data-toggle-bill="${i}" title="${b.paid ? 'Mark unpaid' : 'Mark paid'}">
            ${b.paid ? 'Paid' : 'Mark paid'}
          </button>
          <button class="pill danger" data-del-bill="${i}" title="Remove bill">🗑</button>
        </div>
      </div>`
        )
        .join('');

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
    $('#recentTbody').innerHTML = state.transactions
        .map((t, index) => ({ ...t, index }))
        .slice(-10)
        .reverse()
        .map(
            (t) => `
      <tr>
        <td>${parseLocalDate(t.date).toLocaleDateString()}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.category)}</td>
        <td class="right ${t.amount < 0 ? 'money-neg' : 'money-pos'}">${fmt2(t.amount)}</td>
        <td class="actions"><button class="pill danger" data-del="${t.index}" title="Remove transaction">🗑</button></td>
      </tr>`
        )
        .join('');
}
