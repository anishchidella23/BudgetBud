/** Entry point: load persisted state, wire the shell, render. */

import './styles.css';

import { loadDemoData } from './demo.js';
import { bindForms, openAddTransaction, renderCategoryOptions } from './forms.js';
import { bindHome, renderHome } from './render/home.js';
import { bindSavings, renderSavings } from './render/savings.js';
import { bindTransactions, renderTransactions } from './render/transactions.js';
import { state } from './state.js';
import { clear, load } from './storage.js';
import { $, $$ } from './ui/dom.js';
import { bindModals } from './ui/modal.js';

const SCREENS = ['home', 'transactions', 'savings'];
const TITLES = { home: 'BudgetBud', transactions: 'Transactions', savings: 'Savings' };

let currentTab = 'home';

/** True when there is nothing at all to show — drives the demo-data prompt. */
const isEmpty = () => state.transactions.length === 0 && state.bills.length === 0 && state.goals.length === 0;

/** Repaint every screen. Cheap at this data size and keeps the tabs in sync. */
function renderAll() {
    renderHeader();
    renderCategoryOptions();
    renderHome();
    renderTransactions();
    renderSavings();
    $('#demoBanner').hidden = !isEmpty();
    $('#clearDataBtn').hidden = isEmpty();
}

function renderHeader() {
    $('#exportBtn').style.display = currentTab === 'transactions' ? 'inline-block' : 'none';
    $('#addBtn').style.display =
        currentTab === 'home' || currentTab === 'transactions' ? 'inline-block' : 'none';
}

function switchTab(tab) {
    currentTab = tab;
    SCREENS.forEach((name) => {
        const screen = document.getElementById(`screen-${name}`);
        const isActive = name === tab;
        screen.toggleAttribute('hidden', !isActive);

        const tabEl = document.querySelector(`.tab[data-tab="${name}"]`);
        if (tabEl) {
            tabEl.classList.toggle('active', isActive);
            tabEl.setAttribute('aria-selected', String(isActive));
        }
    });
    $('#title').textContent = TITLES[tab] || 'BudgetBud';
    renderAll();
}

function bindShell() {
    $('#addBtn').addEventListener('click', openAddTransaction);

    $('.bottom').addEventListener('click', (e) => {
        const tabEl = e.target.closest('.tab');
        const tab = tabEl?.getAttribute('data-tab');
        if (!tab) return;
        // "Add" is an action, not a destination.
        if (tab === 'add') openAddTransaction();
        else switchTab(tab);
    });

    // Bottom tabs are focusable controls, so support Enter/Space too.
    $$('.tab').forEach((tabEl) => {
        tabEl.setAttribute('tabindex', '0');
        tabEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            tabEl.click();
        });
    });

    $('#loadDemoBtn').addEventListener('click', () => {
        loadDemoData();
        switchTab('home');
    });

    $('#clearDataBtn').addEventListener('click', () => {
        if (!confirm('Delete all transactions, bills, and savings goals? This cannot be undone.')) return;
        clear();
        switchTab('home');
    });
}

function init() {
    load();
    bindModals();
    bindShell();
    bindHome(renderAll);
    bindTransactions(renderAll);
    bindSavings(renderAll);
    bindForms({ rerender: renderAll, switchTab });
    switchTab('home');
}

init();
