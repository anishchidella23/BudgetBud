/**
 * Modal open/close. Every modal is in the markup up front and toggled with a
 * `show` class; opening one moves focus to its first field and Escape closes
 * whatever is on top, so the sheets are usable from the keyboard.
 */

import { $, $$ } from './dom.js';

let lastFocused = null;

export function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    lastFocused = document.activeElement;
    el.classList.add('show');
    const focusable = $('input, select, textarea, button', el);
    if (focusable) focusable.focus();
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}

export const closeAllModals = () => $$('.modal-backdrop.show').forEach((el) => el.classList.remove('show'));

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
    });
}
