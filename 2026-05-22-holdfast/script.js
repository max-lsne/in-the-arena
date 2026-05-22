// Holdfast — the small grip that keeps the wave from carrying you off.
// Twelve seeded grips kept by no one in particular through the slow
// spring of 2026. The bed: a kettle grip held for a year, a midday
// candle just gripping, a card-writing practice loosed on purpose in
// March, a tide-out walk that has held since November.

const SEED = [
  { n:  1, tide: 'tide-in',  days:  214, state: 'anchor',
    name: 'Twenty minutes with the blue notebook',
    note: 'Ink, not pencil. No phone within reach. The list ends when the page fills, not when I think of more.' },
  { n:  2, tide: 'tide-in',  days:    7, state: 'hold',
    name: 'Boil the kettle, drink half before standing up',
    note: 'A small slow start. Not the day plan. Not the inbox. Just the kettle and the chair and the cooling time.' },
  { n:  3, tide: 'tide-in',  days:    0, state: 'drift',
    name: 'Read one page of something old',
    note: 'Marcus Aurelius, the Tao, or whatever is on the small shelf. One page. The book is on the kettle counter on purpose.' },
  { n:  4, tide: 'tide-in',  days:   84, state: 'anchor',
    name: 'Walk to the end of the lane before opening a tab',
    note: 'Six hundred yards in the cold. The end of the lane has a hawthorn. The hawthorn is the line.' },
  { n:  5, tide: 'slack',    days:    4, state: 'hold',
    name: 'Two minutes of nothing at the threshold of work',
    note: 'A hand on the door. Eyes closed. Two breaths in, three out. Then sit down.' },
  { n:  6, tide: 'slack',    days:    0, state: 'drift',
    name: 'Stand and look out the window at the hour-line',
    note: 'When the kettle clock chimes the next hour, I stand and walk to the window for a minute. No phone. No coffee. Just look.' },
  { n:  7, tide: 'slack',    days:   62, state: 'anchor',
    name: 'One handwritten card before lunch',
    note: 'A note to one person I have not written to. The card goes in the small drawer if the post office is closed.' },
  { n:  8, tide: 'slack',    days:    0, state: 'loosed',
    name: 'Five minutes of slow drawing after the last call',
    note: 'Tried to make it a habit. Could not stop the calls from running through it. Let it go in March. The right thing.' },
  { n:  9, tide: 'tide-out', days:  198, state: 'anchor',
    name: 'Put the laptop in the kitchen drawer at the dim hour',
    note: 'The drawer below the bread. When the lamp goes on in the front room, the laptop goes in. The drawer closes. That is the day.' },
  { n: 10, tide: 'tide-out', days:    9, state: 'hold',
    name: 'Walk the loop with the dog and no headphones',
    note: 'A mile and a quarter past the river. The river is loud enough. The dog is fast enough. Nothing in the ears.' },
  { n: 11, tide: 'tide-out', days:    0, state: 'drift',
    name: 'Re-read the morning page before sleep',
    note: 'The same blue notebook. The page from six. A small ritual of closing the day on the loop it opened.' },
  { n: 12, tide: 'tide-out', days:  340, state: 'anchor',
    name: 'Light the small candle on the table before the meal',
    note: 'A beeswax taper from the market on Tuesdays. The candle is lit until the meal is done and the plates are stacked.' },
];

const TIDE_GLYPH = {
  'tide-in':  '◐',
  'slack':    '◑',
  'tide-out': '◓',
};

const TIDE_LABEL = {
  'tide-in':  'Tide-in',
  'slack':    'Slack',
  'tide-out': 'Tide-out',
};

const STATE_LABEL = {
  drift:  'Drift',
  hold:   'Hold',
  anchor: 'Anchor',
  loosed: 'Loosed',
};

const STATE_ORDER = ['drift', 'hold', 'anchor', 'loosed'];

const TIDE_COLOR = {
  'tide-in':  '#c89557',
  'slack':    '#4a8a86',
  'tide-out': '#1d4a45',
};

let grips = SEED.map(g => ({ ...g }));
let project = 'A small kelp bed · spring 2026 · the slow tides';
let activeFilter = 'all';
let selectedN = grips.length ? grips[0].n : null;

// ---------- formatting ----------

function fmtDays(n) {
  if (n === 0) return '—';
  if (n === 1) return '1 day';
  if (n < 30) return `${n} days`;
  const months = (n / 30).toFixed(n < 90 ? 1 : 0);
  return `${months} mo`;
}

function daysClass(n) {
  return n === 0 ? 'zero' : '';
}

// ---------- rendering ----------

function renderTotals() {
  const host = document.getElementById('chart-totals');
  if (!host) return;
  const held    = grips.filter(g => g.state === 'hold' || g.state === 'anchor').length;
  const anchors = grips.filter(g => g.state === 'anchor').length;
  const loosed  = grips.filter(g => g.state === 'loosed').length;
  const totalDays = grips
    .filter(g => g.state !== 'loosed')
    .reduce((s, g) => s + (g.days || 0), 0);
  host.innerHTML = `
    <div class="total">
      <span class="total-num">${held}<span class="unit">/${grips.length - loosed}</span></span>
      <span class="total-label">Holding</span>
    </div>
    <div class="total">
      <span class="total-num">${anchors}<span class="unit">anchor</span></span>
      <span class="total-label">Set deep</span>
    </div>
    <div class="total">
      <span class="total-num">${totalDays}<span class="unit">d</span></span>
      <span class="total-label">Bed depth</span>
    </div>
  `;
}

function renderProject() {
  const el = document.getElementById('chart-project');
  if (el) el.textContent = project;
}

function renderProfile() {
  const host = document.getElementById('profile');
  if (!host) return;

  // collect grips that count (not loosed)
  const active = grips.filter(g => g.state !== 'loosed');
  if (active.length === 0) {
    host.querySelectorAll('svg').forEach(s => s.remove());
    return;
  }

  const w = 1000;
  const h = 220;
  const padX = 28;
  const padY = 28;
  const maxX = Math.max(1, active.length - 1);
  const maxDays = Math.max(30, ...active.map(g => g.days || 0));

  const sx = i => padX + (i / maxX) * (w - padX * 2);
  // y grows downward = deeper set
  const sy = d => padY + (Math.min(d, maxDays) / maxDays) * (h - padY * 2);

  // gridlines at quarters
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const y = padY + (i / 4) * (h - padY * 2);
    grid.push(`<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="rgba(22,37,42,0.06)" stroke-width="1" />`);
  }

  // the tide line at the top
  const tideY = padY - 4;
  const tideWave = [];
  for (let x = 0; x <= w; x += 16) {
    const off = Math.sin(x / 28) * 1.6;
    tideWave.push(`${x},${(tideY + off).toFixed(2)}`);
  }

  // stalks: vertical lines from the tide-line down to each grip's depth
  const stalks = active.map((g, i) => {
    const x = sx(i);
    const y = sy(g.days || 0);
    const color = TIDE_COLOR[g.tide] || '#386963';
    const opacity = g.state === 'drift' ? 0.35 : 0.85;
    return `
      <line x1="${x.toFixed(1)}" y1="${tideY.toFixed(1)}"
            x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
            stroke="${color}" stroke-width="1.6"
            stroke-dasharray="${g.state === 'drift' ? '3 4' : '0'}"
            opacity="${opacity}" />
    `;
  }).join('');

  // the holdfast dots — bigger and brighter when anchored, smaller when drifting
  const dots = active.map((g, i) => {
    const x = sx(i);
    const y = sy(g.days || 0);
    const color = TIDE_COLOR[g.tide] || '#386963';
    const r = g.state === 'anchor' ? 6.5 : g.state === 'hold' ? 5 : 3.6;
    const ring = g.state === 'hold' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.5" />` : '';
    return `
      ${ring}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" />
    `;
  }).join('');

  // the bedrock floor — soft uneven line
  const floorPts = [];
  for (let x = 0; x <= w; x += 40) {
    const off = Math.sin(x / 60) * 4 - 2;
    floorPts.push(`${x},${(h - 8 + off).toFixed(1)}`);
  }

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${grid.join('')}
      <polyline points="${tideWave.join(' ')}" stroke="#7eaaa6" stroke-width="1.2" fill="none" opacity="0.7" />
      <polyline points="${floorPts.join(' ')}" stroke="rgba(22,37,42,0.4)" stroke-width="1.2" fill="none" />
      ${stalks}
      ${dots}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderGrips() {
  const host = document.getElementById('grips');
  if (!host) return;
  const filtered = grips.filter(g => activeFilter === 'all' || g.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--stone);font-family:'JetBrains Mono',monospace;font-size:12px;">No grips in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(g => `
    <li class="grip ${g.state === 'hold' ? 'is-current' : ''} ${g.state === 'loosed' ? 'loosed' : ''} ${g.n === selectedN ? 'is-selected' : ''}" data-n="${g.n}">
      <span class="grip-num">${String(g.n).padStart(2, '0')}</span>
      <span class="grip-tide ${g.tide}">
        <span class="glyph" aria-hidden="true">${TIDE_GLYPH[g.tide]}</span>
        ${TIDE_LABEL[g.tide]}
      </span>
      <div class="grip-body">
        <p class="grip-name">${escapeHtml(g.name)}</p>
        <p class="grip-note">${escapeHtml(g.note)}</p>
      </div>
      <span class="grip-days ${daysClass(g.days)}"><span class="num">${g.days}</span> ${fmtDays(g.days)}</span>
      <span class="grip-state ${g.state}" data-action="cycle-state" data-n="${g.n}" title="Click to change state">${STATE_LABEL[g.state]}</span>
    </li>
  `).join('');
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
  renderProject();
  renderTotals();
  renderProfile();
  renderGrips();
}

// ---------- actions ----------

function cycleState(n) {
  const grip = grips.find(g => g.n === n);
  if (!grip) return;
  const i = STATE_ORDER.indexOf(grip.state);
  grip.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  renderAll();
}

function removeGrip(n) {
  grips = grips.filter(g => g.n !== n);
  grips.forEach((g, i) => { g.n = i + 1; });
  renderAll();
}

function addGrip({ tide, days, name, state }) {
  const n = grips.length + 1;
  grips.push({
    n,
    tide,
    days: Math.max(0, Number(days) || 0),
    state: state || 'drift',
    name: name || 'Unnamed grip',
    note: '',
  });
  renderAll();
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  renderGrips();
}

function resetToSeed() {
  grips = SEED.map(g => ({ ...g }));
  project = 'A small kelp bed · spring 2026 · the slow tides';
  activeFilter = 'all';
  selectedN = grips.length ? grips[0].n : null;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === 'all');
  });
  renderAll();
}

// ---------- wiring ----------

function wire() {
  const gripHost = document.getElementById('grips');
  gripHost.addEventListener('click', (e) => {
    const row = e.target.closest('.grip');
    if (row) {
      selectedN = Number(row.dataset.n);
      renderGrips();
    }
    const t = e.target.closest('[data-action="cycle-state"]');
    if (!t) return;
    cycleState(Number(t.dataset.n));
  });

  document.getElementById('filters').addEventListener('click', (e) => {
    const t = e.target.closest('button[data-filter]');
    if (!t) return;
    setFilter(t.dataset.filter);
  });

  const form = document.getElementById('add-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tide  = document.getElementById('add-tide').value;
    const days  = document.getElementById('add-days').value;
    const name  = document.getElementById('add-name').value.trim();
    const state = document.getElementById('add-state').value;
    if (!name) return;
    addGrip({ tide, days, name, state });
    document.getElementById('add-name').value = '';
    document.getElementById('add-days').value = '0';
  });

  // rename project on click (contenteditable)
  const proj = document.getElementById('chart-project');
  proj.addEventListener('click', () => {
    proj.setAttribute('contenteditable', 'true');
    proj.focus();
    const r = document.createRange();
    r.selectNodeContents(proj);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  });
  proj.addEventListener('blur', () => {
    proj.removeAttribute('contenteditable');
    const v = proj.textContent.trim();
    project = v || project;
    proj.textContent = project;
  });
  proj.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      proj.blur();
    }
  });

  document.getElementById('reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetToSeed();
  });

  const hold = document.getElementById('hold-form');
  if (hold) {
    hold.addEventListener('submit', (e) => {
      e.preventDefault();
      const foot = document.getElementById('hold-foot');
      if (foot) foot.textContent = 'Got it. One quiet email when the first beds open.';
      hold.reset();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  wire();
});
