/** Savings screen: goal cards with progress, and the savings-over-time chart. */

import { removeGoal } from '../actions.js';
import { drawLineChart } from '../charts/line.js';
import { sliceColor } from '../charts/svg.js';
import { goalSaved, savingsSeries, state, totalSaved } from '../state.js';
import { $ } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { parseLocalDate, todayLocalISO } from '../utils/date.js';
import { escapeHtml, fmt } from '../utils/format.js';

let onChange = () => {};

export function bindSavings(rerender) {
    onChange = rerender;

    $('#openAddSaving').addEventListener('click', () => {
        $('#goalSelect').innerHTML = state.goals
            .map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`)
            .join('');
        openModal('modalAddSaving');
    });

    $('#openNewGoal').addEventListener('click', () => {
        $('#goalName').value = '';
        $('#goalTarget').value = '';
        $('#goalDue').value = todayLocalISO();
        openModal('modalNewGoal');
    });

    $('#goals').addEventListener('click', (e) => {
        const del = e.target.closest('[data-del-goal]');
        if (!del) return;
        const goal = state.goals.find((g) => g.id === del.dataset.delGoal);
        if (!goal) return;
        const saved = goalSaved(state, goal.id);
        const extra = saved > 0 ? ` Its $${fmt(saved)} in contributions will be removed too.` : '';
        if (confirm(`Remove goal "${goal.name}"?${extra}`)) {
            removeGoal(goal.id);
            onChange();
        }
    });
}

export function renderSavings() {
    $('#goals').innerHTML = state.goals
        .map((g, i) => {
            const saved = goalSaved(state, g.id);
            const pct = g.target > 0 ? Math.min(100, Math.round((saved * 100) / g.target)) : 0;
            return `
        <div class="card goal">
          <div class="goal-header">
            <div class="goal-title">
              <strong>${escapeHtml(g.name)}</strong>
              <span class="goal-target">Target: $${fmt(g.target)} by ${parseLocalDate(g.due).toLocaleDateString()}</span>
            </div>
            <div class="goal-pct">${pct}%</div>
            <button class="pill danger goal-remove" data-del-goal="${g.id}" title="Remove goal">🗑</button>
          </div>

          <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${g.target}" aria-valuenow="${saved}">
            <div class="progress-fill" style="width:${pct}%; background:${sliceColor(i)}"></div>
          </div>

          <div class="goal-stats">
            <span>Min: $0</span>
            <span>Saved: $${fmt(saved)}</span>
            <span>Max: $${fmt(g.target)}</span>
          </div>
        </div>`;
        })
        .join('');

    $('#goalsEmpty').hidden = state.goals.length > 0;
    $('#openAddSaving').disabled = state.goals.length === 0;
    $('#savedTotal').textContent = `$${fmt(totalSaved(state))}`;

    drawLineChart($('#lineChart'), savingsSeries(state));
}
