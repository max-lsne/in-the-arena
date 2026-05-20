// Sounding — a weekly note from where the work is, deep down.
// Twenty seeded soundings across a fictional five-month build of
// a single writing desk, by hand, by one person. The shape: a
// careful opening, a deep dive after a workshop visit, a tangle
// in the dovetails, a storm when a panel cracks, a long wait on
// new lumber, and a slow climb back into the deep.

const SEED = [
  { w: 1,  bearing: 4, reader: 4, fit: 3, instinct: 2, hold: 3, bottom: 'sand',
    t: 'Drew the plans on the kitchen table. Three sheets, taped together.' },
  { w: 2,  bearing: 4, reader: 4, fit: 4, instinct: 2, hold: 4, bottom: 'sand',
    t: 'Picked the lumber. White oak for the top, walnut for the drawer fronts.' },
  { w: 3,  bearing: 3, reader: 4, fit: 4, instinct: 3, hold: 4, bottom: 'sand',
    t: 'Milled the boards flat. The shop smells right again.' },
  { w: 4,  bearing: 5, reader: 4, fit: 4, instinct: 3, hold: 4, bottom: 'sand',
    t: 'Drove to the Hartz workshop. Stood with a finished one for an hour. Came home different.' },
  { w: 5,  bearing: 5, reader: 5, fit: 4, instinct: 4, hold: 5, bottom: 'rock',
    t: 'Deepest week yet. Cut the breadboard ends. Refused to answer the phone.' },
  { w: 6,  bearing: 4, reader: 5, fit: 4, instinct: 4, hold: 4, bottom: 'rock',
    t: 'Glued up the top. Eight clamps, a level, and patience.' },
  { w: 7,  bearing: 3, reader: 4, fit: 5, instinct: 5, hold: 4, bottom: 'rock',
    t: 'Stopped planning, started cutting. The mortises came out clean on the first try.' },
  { w: 8,  bearing: 3, reader: 4, fit: 5, instinct: 4, hold: 3, bottom: 'kelp',
    t: 'The dovetails are not sitting. Re-cut one half-blind three times.' },
  { w: 9,  bearing: 2, reader: 3, fit: 3, instinct: 3, hold: 3, bottom: 'kelp',
    t: 'Tried a router jig. Tried a hand saw. Both wrong for this drawer.' },
  { w: 10, bearing: 2, reader: 3, fit: 3, instinct: 2, hold: 2, bottom: 'kelp',
    t: 'A week of pulling at the same knot. Closed the shop early on Friday.' },
  { w: 11, bearing: 1, reader: 2, fit: 2, instinct: 2, hold: 1, bottom: 'none',
    t: 'The drawer-front panel cracked across the grain. Not at a joint. Mid-board.' },
  { w: 12, bearing: 1, reader: 2, fit: 1, instinct: 1, hold: 1, bottom: 'none',
    t: 'Waiting on the new walnut to come in. The shop is quiet in a way I do not love.' },
  { w: 13, bearing: 1, reader: 2, fit: 2, instinct: 1, hold: 1, bottom: 'none',
    t: 'Still waiting. Read about cracked-grain repairs. Did not start one.' },
  { w: 14, bearing: 2, reader: 3, fit: 2, instinct: 2, hold: 2, bottom: 'kelp',
    t: 'New boards arrived. Acclimated. Stared at them on the bench for a long time.' },
  { w: 15, bearing: 3, reader: 4, fit: 3, instinct: 3, hold: 3, bottom: 'sand',
    t: 'Re-milled. Re-cut the drawer fronts. The shop sounded normal again.' },
  { w: 16, bearing: 4, reader: 4, fit: 4, instinct: 4, hold: 3, bottom: 'sand',
    t: 'Dry-fit the drawers. They closed with the right small thunk.' },
  { w: 17, bearing: 4, reader: 4, fit: 4, instinct: 4, hold: 4, bottom: 'sand',
    t: 'Back at depth. Surfaced just enough to take Sunday off.' },
  { w: 18, bearing: 5, reader: 5, fit: 5, instinct: 4, hold: 4, bottom: 'rock',
    t: 'Cut the through-dovetails for the case sides by hand. Slow. Right.' },
  { w: 19, bearing: 5, reader: 5, fit: 5, instinct: 5, hold: 5, bottom: 'rock',
    t: 'The deepest week of the build. Did not look up. Ate at the bench.' },
  { w: 20, bearing: 4, reader: 5, fit: 5, instinct: 4, hold: 4, bottom: 'rock',
    t: 'Surfacing. The desk is in the room now, on its feet, no finish yet. It is a desk.' },
];

const BOTTOM_COLORS = {
  sand: '#c9a974',
  rock: '#6b7682',
  kelp: '#4f7a5d',
  none: '#b25a3c',
};

const BOTTOM_LABEL = {
  sand: 'Sand',
  rock: 'Rock',
  kelp: 'Kelp',
  none: 'No bottom',
};

const state = {
  soundings: SEED.map((s) => ({ ...s })),
  filter: 'all',
  activeWeek: null,
};

function depthOf(s) {
  return s.bearing + s.reader + s.fit + s.instinct + s.hold;
}

function totalsByBottom() {
  const totals = { sand: 0, rock: 0, kelp: 0, none: 0 };
  for (const s of state.soundings) totals[s.bottom]++;
  return totals;
}

function meanDepth() {
  if (!state.soundings.length) return 0;
  const sum = state.soundings.reduce((acc, s) => acc + depthOf(s), 0);
  return Math.round((sum / state.soundings.length) * 10) / 10;
}

function renderTotals() {
  const el = document.getElementById('chart-totals');
  const totals = totalsByBottom();
  const mean = meanDepth();
  el.innerHTML = `
    <span class="total-pill"><span class="sw sw-depth"></span>mean depth · ${mean}/25</span>
    <span class="total-pill"><span class="sw sw-sand"></span>${totals.sand} sand</span>
    <span class="total-pill"><span class="sw sw-rock"></span>${totals.rock} rock</span>
    <span class="total-pill"><span class="sw sw-kelp"></span>${totals.kelp} kelp</span>
    <span class="total-pill"><span class="sw sw-none"></span>${totals.none} no bottom</span>
  `;
}

function renderSeabed() {
  const el = document.getElementById('seabed');
  const w = 800;
  const h = 280;
  const padL = 36;
  const padR = 18;
  const padT = 18;
  const padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const sorted = [...state.soundings].sort((a, b) => a.w - b.w);
  const maxW = Math.max(20, ...sorted.map((s) => s.w));

  // y: 0 at top, 25 at bottom (depth grows downward — sounding chart)
  const xFor = (week) => padL + (innerW * (week - 1)) / (maxW - 1 || 1);
  const yFor = (depth) => padT + (innerH * depth) / 25;

  let path = '';
  sorted.forEach((s, i) => {
    const x = xFor(s.w);
    const y = yFor(depthOf(s));
    path += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  });

  // axes ticks
  const yTicks = [5, 10, 15, 20, 25];
  const yTickLines = yTicks.map((d) => {
    const y = yFor(d);
    return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="rgba(18,38,56,0.16)" stroke-dasharray="2 4" />`;
  }).join('');
  const yTickLabels = yTicks.map((d) => {
    const y = yFor(d);
    return `<text x="${padL - 6}" y="${y + 3.5}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="#122638" opacity="0.7">${d}</text>`;
  }).join('');

  const xTicks = [1, 5, 10, 15, 20].filter((wk) => wk <= maxW);
  const xTickLabels = xTicks.map((wk) => {
    const x = xFor(wk);
    return `<text x="${x}" y="${h - 10}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#122638" opacity="0.7">w${wk}</text>`;
  }).join('');

  const points = sorted.map((s) => {
    const x = xFor(s.w);
    const y = yFor(depthOf(s));
    const color = BOTTOM_COLORS[s.bottom];
    const active = state.activeWeek === s.w ? ' is-active' : '';
    return `<circle class="seabed-point${active}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${color}" data-week="${s.w}" />`;
  }).join('');

  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${yTickLines}
      <path d="${path}" stroke="#122638" stroke-width="2" fill="none" stroke-linejoin="round" />
      <path d="${path} L ${xFor(maxW).toFixed(1)} ${(h - padB).toFixed(1)} L ${padL} ${(h - padB).toFixed(1)} Z"
            fill="rgba(18,38,56,0.08)" stroke="none" />
      ${points}
      ${yTickLabels}
      ${xTickLabels}
    </svg>
  `;

  el.querySelectorAll('.seabed-point').forEach((node) => {
    node.addEventListener('click', () => {
      const wk = Number(node.dataset.week);
      state.activeWeek = state.activeWeek === wk ? null : wk;
      renderSeabed();
      renderList();
    });
  });
}

function renderList() {
  const el = document.getElementById('soundings');
  const sorted = [...state.soundings].sort((a, b) => b.w - a.w);
  const filtered = state.filter === 'all' ? sorted : sorted.filter((s) => s.bottom === state.filter);

  el.innerHTML = filtered.map((s) => {
    const active = state.activeWeek === s.w ? ' is-active' : '';
    return `
      <li class="sounding${active}" data-week="${s.w}">
        <span class="sounding-week">w${String(s.w).padStart(2, '0')}</span>
        <span class="sounding-text">${escapeHtml(s.t)}</span>
        <span class="sounding-depth">${depthOf(s)}/25</span>
        <span class="sounding-bottom is-${s.bottom}"><span class="sw"></span>${BOTTOM_LABEL[s.bottom]}</span>
      </li>
    `;
  }).join('');

  el.querySelectorAll('.sounding').forEach((node) => {
    node.addEventListener('click', () => {
      const wk = Number(node.dataset.week);
      state.activeWeek = state.activeWeek === wk ? null : wk;
      renderSeabed();
      renderList();
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAll() {
  renderTotals();
  renderSeabed();
  renderList();
}

// filters
document.getElementById('filters').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  state.filter = btn.dataset.filter;
  document.querySelectorAll('#filters button').forEach((b) => b.classList.toggle('is-active', b === btn));
  renderList();
});

// add form
document.getElementById('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const facetInputs = document.querySelectorAll('#add-facets input[type="range"]');
  const facets = {};
  facetInputs.forEach((input) => {
    facets[input.dataset.facet] = Number(input.value);
  });
  const text = document.getElementById('add-text').value.trim() || 'A line for the week.';
  const bottom = document.getElementById('add-bottom').value;
  const nextWeek = Math.max(...state.soundings.map((s) => s.w)) + 1;
  state.soundings.push({ w: nextWeek, ...facets, bottom, t: text });
  document.getElementById('add-text').value = '';
  state.activeWeek = nextWeek;
  renderAll();
});

// reset
document.getElementById('reset-demo').addEventListener('click', (e) => {
  e.preventDefault();
  state.soundings = SEED.map((s) => ({ ...s }));
  state.activeWeek = null;
  state.filter = 'all';
  document.querySelectorAll('#filters button').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === 'all'));
  renderAll();
});

// hold form (signup)
document.getElementById('hold-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  if (!email) return;
  document.getElementById('hold-foot').textContent = "Held. We'll write once, in winter.";
  e.target.querySelector('input').value = '';
});

renderAll();
