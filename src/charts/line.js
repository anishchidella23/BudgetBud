/** Savings-over-time line chart: axes, gridlines, polyline, point markers. */

import { fmt } from '../utils/format.js';
import { monthLabel } from '../utils/date.js';
import { line, mk } from './svg.js';

export function drawLineChart(svg, data) {
    svg.innerHTML = '';
    const padL = 40;
    const padR = 20;
    const padT = 10;
    const padB = 30;
    const W = 520;
    const H = svg.viewBox.baseVal.height || 220;
    const x0 = padL;
    const y0 = H - padB;
    const x1 = W - padR;
    const y1 = padT;

    const max = Math.max(50, ...data.map((d) => d.saved));
    const sx = (x1 - x0) / Math.max(1, data.length - 1);
    const sy = (y0 - y1) / max;

    const g = mk('g');
    g.appendChild(line(x0, y0, x1, y0, '#9ca3af'));
    g.appendChild(line(x0, y0, x0, y1, '#9ca3af'));
    for (let i = 0; i <= 4; i++) {
        const y = y0 - (i * (y0 - y1)) / 4;
        g.appendChild(line(x0, y, x1, y, '#E2E8F5'));
        const t = mk('text');
        t.setAttribute('x', 4);
        t.setAttribute('y', y + 4);
        t.textContent = `$${fmt(Math.round((i * max) / 4))}`;
        svg.appendChild(t);
    }
    svg.appendChild(g);

    const pts = data.map((d, i) => [x0 + i * sx, y0 - d.saved * sy]);
    const pl = mk('polyline');
    pl.setAttribute('fill', 'none');
    pl.setAttribute('stroke', '#2563eb');
    pl.setAttribute('stroke-width', '2.2');
    pl.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    svg.appendChild(pl);

    pts.forEach((p, i) => {
        const c = mk('circle');
        c.setAttribute('cx', p[0]);
        c.setAttribute('cy', p[1]);
        c.setAttribute('r', 3.5);
        c.setAttribute('fill', '#2563eb');
        svg.appendChild(c);

        const tx = mk('text');
        tx.setAttribute('x', p[0]);
        tx.setAttribute('y', y0 + 18);
        tx.setAttribute('text-anchor', 'middle');
        tx.textContent = monthLabel(data[i].month);
        svg.appendChild(tx);
    });
}
