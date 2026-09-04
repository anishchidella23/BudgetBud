/**
 * Donut chart with leader-line labels.
 *
 * Slices are drawn as annular paths (two arcs joined by radial lines) starting
 * at 12 o'clock. Each label is pushed out past the ring, then clamped to the
 * viewBox so long labels on the far left or right stay on canvas.
 */

import { mk, sliceColor } from './svg.js';

export function drawDonutWithLeaders(svg, entries, total) {
    svg.innerHTML = '';
    const vb = svg.viewBox.baseVal;
    const W = (vb && vb.width) || 260;
    const H = (vb && vb.height) || 260;

    if (!entries.length || total <= 0) {
        const t = mk('text');
        t.setAttribute('x', W / 2);
        t.setAttribute('y', H / 2);
        t.setAttribute('text-anchor', 'middle');
        t.textContent = 'No spending';
        svg.appendChild(t);
        return;
    }

    const cx = W / 2 + 10;
    const cy = H / 2;
    const rOuter = 110;
    const ring = 34;
    const rInner = rOuter - ring;
    const sidePadding = 28;
    const minX = sidePadding;
    const maxX = W - sidePadding;
    const twoPi = Math.PI * 2;
    const EPS = 1e-4;

    const polar = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

    const donutPath = (r0, r1, a0, a1) => {
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const [x0, y0] = polar(r1, a0);
        const [x1, y1] = polar(r1, a1);
        const [x2, y2] = polar(r0, a1);
        const [x3, y3] = polar(r0, a0);
        return `M ${x0} ${y0} A ${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
    };

    const leaderTo = (mid, labelText, index) => {
        const [sX, sY] = polar((rInner + rOuter) / 2, mid);
        const [mX, mY] = polar(rOuter + 8, mid);
        const dir = Math.cos(mid) >= 0 ? 1 : -1;
        const endX = Math.max(minX, Math.min(maxX, mX + dir * 30));

        const leader = mk('path');
        leader.setAttribute('d', `M ${sX} ${sY} L ${mX} ${mY} L ${endX} ${mY}`);
        leader.setAttribute('class', 'leader-line');
        svg.appendChild(leader);

        const label = mk('text');
        label.setAttribute('class', 'leader-label');
        label.setAttribute('text-anchor', dir > 0 ? 'start' : 'end');
        label.setAttribute('x', endX + dir * 6);
        label.setAttribute('y', mY);
        label.textContent = labelText;
        svg.appendChild(label);
        return index;
    };

    // A single category can't be drawn as an arc (start and end angle coincide),
    // so it becomes a full stroked circle instead.
    if (entries.length === 1) {
        const ringCircle = mk('circle');
        ringCircle.setAttribute('cx', cx);
        ringCircle.setAttribute('cy', cy);
        ringCircle.setAttribute('r', rInner + ring / 2);
        ringCircle.setAttribute('fill', 'none');
        ringCircle.setAttribute('stroke', sliceColor(0));
        ringCircle.setAttribute('stroke-width', ring);
        svg.appendChild(ringCircle);
        leaderTo(-Math.PI / 2, '100%', 0);
        return;
    }

    let a0 = -Math.PI / 2;
    entries.forEach((e, i) => {
        const frac = e.value / total;
        const angle = Math.min(frac * twoPi, twoPi - EPS);
        const a1 = a0 + angle;

        const slice = mk('path');
        slice.setAttribute('d', donutPath(rInner, rOuter, a0, a1));
        slice.setAttribute('fill', sliceColor(i));
        svg.appendChild(slice);

        leaderTo((a0 + a1) / 2, `${Math.round(frac * 100)}%`, i);
        a0 = a1;
    });

    const hole = mk('circle');
    hole.setAttribute('cx', cx);
    hole.setAttribute('cy', cy);
    hole.setAttribute('r', rInner);
    hole.setAttribute('fill', '#fff');
    svg.appendChild(hole);
}
