/**
 * Transactions screen: search, category filter, sort toggle, edit, delete,
 * CSV export.
 *
 * Search text, filter and sort mode live here rather than inside the render
 * function — in the prototype the sort mode was a local that a re-render reset,
 * so adding or deleting a row silently reverted the user's sort.
 */

import { removeTransaction } from '../actions.js';
import { openEditTransaction } from '../forms.js';
import { filterTransactions, state, transactionsToCsv } from '../state.js';
import { $ } from '../ui/dom.js';
import { parseLocalDate } from '../utils/date.js';
import { escapeHtml, fmt2 } from '../utils/format.js';

const SORT_MODES = ['date', 'amount'];
let sortMode = 'date';
let onChange = () => {};

/** The list currently on screen — what Export writes out. */
let visible = [];

export function bindTransactions(rerender) {
    onChange = rerender;

    $('#search').addEventListener('input', renderTxList);
    $('#catFilter').addEventListener('change', renderTxList);

    $('#sortBtn').addEventListener('click', () => {
        sortMode = SORT_MODES[(SORT_MODES.indexOf(sortMode) + 1) % SORT_MODES.length];
        renderTransactions();
    });

    $('#txTbody').addEventListener('click', (e) => {
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
    const query = $('#search').value || '';
    const category = $('#catFilter').value || '';
    visible = filterTransactions(state, { query, category, mode: sortMode });

    $('#txTbody').innerHTML = visible
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

    // "Nothing here yet" and "nothing matched your search" are different
    // problems, and the fix for each is different.
    const filtering = Boolean(query || category);
    const empty = $('#txEmpty');
    empty.hidden = visible.length > 0;
    empty.textContent =
        state.transactions.length === 0
            ? 'No transactions yet. Tap Add to record your first one.'
            : 'No transactions match this search.';

    $('#resultCount').textContent = `${visible.length} result${visible.length !== 1 ? 's' : ''}${
        filtering && visible.length ? ' (filtered)' : ''
    }`;
    $('#exportBtn').title = filtering ? 'Export the filtered list as CSV' : 'Export all transactions as CSV';
}

/** Exports exactly what's on screen, so a filtered view exports that subset. */
function exportCsv() {
    const blob = new Blob([transactionsToCsv(visible)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}
