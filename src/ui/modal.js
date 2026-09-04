/**
 * Modal open/close. Every modal is in the markup up front and toggled with a
 * `show` class; opening one moves focus into the sheet, keeps Tab inside it,
 * and Escape closes it, so the sheets are usable from the keyboard.
 */

import { $, $$ } from './dom.js';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let lastFocused = null;

const openSheets = () => $$('.modal-backdrop.show');

export function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    lastFocused = document.activeElement;
    el.classList.add('show');
    const first = $(FOCUSABLE, el);
    if (first) first.focus();
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}

export const closeAllModals = () => openSheets().forEach((el) => el.classList.remove('show'));

/** Keep Tab cycling within the sheet on top instead of escaping to the page. */
function trapTab(e) {
    const sheets = openSheets();
    if (!sheets.length) return;
    const active = sheets[sheets.length - 1];
    const items = $$(FOCUSABLE, active).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

export function bindModals() {
    // Any [data-close="modalId"] control dismisses its sheet.
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-close]');
        if (btn) closeModal(btn.getAttribute('data-close'));
    });

    // Clicking the dimmed backdrop (but not the sheet itself) dismisses too.
    $$('.modal-backdrop').forEach((backdrop) => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.classList.remove('show');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
        else if (e.key === 'Tab') trapTab(e);
    });
}
