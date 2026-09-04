/**
 * Transactions screen: search, category filter, sort toggle, delete, CSV export.
 *
 * Search text, filter and sort mode live here rather than inside the render
 * function — in the prototype the sort mode was a local that a re-render reset,
 * so adding or deleting a row silently reverted the user's sort.
 */

import { filterTransactions, state, transactionsToCsv } from '../state.js';
import { save } from '../storage.js';
import { $ } from '../ui/dom.js';
import { parseLocalDate } from '../utils/date.js';
import { escapeHtml, fmt2 } from '../utils/format.js';

const SORT_MODES = ['date', 'amount'];
let sortMode = 'date';
let onChange = () => {};

export function bindTransactions(rerender) {
    onChange = rerender;

    $('#search').addEventListener('input', renderTxList);
    $('#catFilter').addEventListener('change', renderTxList);

    $('#sortBtn').addEventListener('click', () => {
        sortMode = SORT_MODES[(SORT_MODES.indexOf(sortMode) + 1) % SORT_MODES.length];
        renderTransactions();
    });

    $('#txTbody').addEventListener('click', (e) => {
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

    $('#exportBtn').addEventListener('click', exportCsv);
}

export function renderTransactions() {
    const sel = $('#catFilter');
    const selected = sel.value;
    sel.innerHTML =
        '<option value="">All categories</option>' +
        state.categories.map((c) => `<option>${escapeHtml(c)}</option>`).join('');
    // Rebuilding the options drops the selection, so restore it.
    if (state.categories.includes(selected)) sel.value = selected;

    $('#sortBtn').textContent = sortMode === 'date' ? 'Sort (Date)' : 'Sort (Amount)';
    renderTxList();
}

function renderTxList() {
    const list = filterTransactions(state, {
        query: $('#search').value || '',
        category: $('#catFilter').value || '',
        mode: sortMode,
    });

    $('#txTbody').innerHTML = list
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

    $('#resultCount').textContent = `${list.length} result${list.length !== 1 ? 's' : ''}`;
}

function exportCsv() {
    const blob = new Blob([transactionsToCsv(state)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}
