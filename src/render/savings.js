/** Savings screen: goal cards with progress, and the savings-over-time chart. */

import { drawLineChart } from '../charts/line.js';
import { sliceColor } from '../charts/svg.js';
import { extendHistoryToCurrent, state } from '../state.js';
import { save } from '../storage.js';
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
        const id = Number(del.dataset.delGoal);
        const goal = state.goals.find((g) => g.id === id);
        if (goal && confirm(`Remove goal "${goal.name}"?`)) {
            state.goals = state.goals.filter((g) => g.id !== id);
            save();
            onChange();
        }
    });
}

export function renderSavings() {
    $('#goals').innerHTML = state.goals
        .map((g, i) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.saved * 100) / g.target)) : 0;
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

          <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${g.target}" aria-valuenow="${g.saved}">
            <div class="progress-fill" style="width:${pct}%; background:${sliceColor(i)}"></div>
          </div>

          <div class="goal-stats">
            <span>Min: $0</span>
            <span>Saved: $${fmt(g.saved)}</span>
            <span>Max: $${fmt(g.target)}</span>
          </div>
        </div>`;
        })
        .join('');

    drawLineChart($('#lineChart'), extendHistoryToCurrent(state.savingsHistory));
}
