/**
 * Persistence. The prototype kept everything in memory, so a refresh wiped the
 * user's data; state is now mirrored into localStorage on every mutation.
 */

import { createDefaultState, replaceState, state } from './state.js';

const KEY = 'budgetbud.state.v1';

export function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return replaceState(createDefaultState());
        // Merge over defaults so a state saved by an older build still loads.
        const parsed = JSON.parse(raw);
        return replaceState({ ...createDefaultState(), ...parsed });
    } catch {
        return replaceState(createDefaultState());
    }
}

export function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        // Private browsing or a full quota: the app still works for this session.
    }
}

export function clear() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
    return replaceState(createDefaultState());
}
