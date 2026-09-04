/**
 * Persistence. The prototype kept everything in memory, so a refresh wiped the
 * user's data; state is now mirrored into localStorage on every mutation.
 */

import { SCHEMA_VERSION, createDefaultState, migrate, replaceState, state } from './state.js';

const KEY = 'budgetbud.state.v1';

export function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return replaceState(createDefaultState());

        const parsed = JSON.parse(raw);
        // migrate() also fills in anything a newer build added.
        const next = replaceState(migrate(parsed));
        // Write the upgraded shape back straight away, so what is on disk never
        // lags the schema the code expects.
        if (parsed.version !== SCHEMA_VERSION) save();
        return next;
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

export const hasSavedState = () => {
    try {
        return localStorage.getItem(KEY) !== null;
    } catch {
        return false;
    }
};
