/** Tiny SVG element helpers shared by the charts. */

export const NS = 'http://www.w3.org/2000/svg';

export const mk = (tag) => document.createElementNS(NS, tag);

export function line(x1, y1, x2, y2, stroke) {
    const l = mk('line');
    l.setAttribute('x1', x1);
    l.setAttribute('y1', y1);
    l.setAttribute('x2', x2);
    l.setAttribute('y2', y2);
    l.setAttribute('stroke', stroke);
    l.setAttribute('stroke-width', '1');
    return l;
}

const PALETTE = ['#2563eb', '#ef4444', '#16a34a', '#f59e0b', '#7c3aed', '#059669', '#111827', '#a855f7'];

export const sliceColor = (i) => PALETTE[i % PALETTE.length];
