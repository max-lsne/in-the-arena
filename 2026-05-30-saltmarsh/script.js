// Saltmarsh — a slow ledger of the things that settle between the tides.
// Twelve seeded deposits kept by no one in particular through a slow
// turn of the spring of 2026. The marsh: a morning silence layered
// eight years, a cold-water swim just caught, a slow database project
// held six, a Tuesday tea on the wrack line of twelve.

const SEED = [
  { n:  1, zone: 'pan',     years:  8, state: 'layer',
    name: 'Morning silence at the kitchen window',
    note: 'Before the kettle, before the inbox. Eight winters now of fifteen quiet minutes. The layer is the year I stopped counting.' },
  { n:  2, zone: 'pan',     years:  1, state: 'catch',
    name: 'A cold-water swim on the days I dare',
    note: 'Caught last September. Most weeks a Tuesday, sometimes nothing for a fortnight. The cold is not the point. The going is the point.' },
  { n:  3, zone: 'pan',     years:  0, state: 'drift',
    name: 'Five minutes of breath before the inbox',
    note: 'Named in January. Drifts past every morning. The wrack line is right there, the deposit will not catch.' },
  { n:  4, zone: 'pan',     years:  3, state: 'hold',
    name: 'Pen-and-ink letter to my younger self, once a quarter',
    note: 'Three years of four letters a year. The hold is dense now. Some of the early ones are starting to layer.' },
  { n:  5, zone: 'channel', years:  6, state: 'layer',
    name: 'The slow database project, kept small on purpose',
    note: 'Built in 2020 across a winter of evenings. Kept since at the same small size. The layer is six summers of not adding features.' },
  { n:  6, zone: 'channel', years:  0, state: 'catch',
    name: 'The Sunday slow-essays newsletter',
    note: 'Caught at Easter after a year drifted. Three thousand words a fortnight, no oftener. The catch is fragile but it is catching.' },
  { n:  7, zone: 'channel', years:  4, state: 'hold',
    name: 'The open notebook of the carpenter habit',
    note: 'Four years of sketched joints and photographed mistakes. The hold is firm. Roots are in. Layers next, slow and quiet.' },
  { n:  8, zone: 'channel', years:  0, state: 'drift',
    name: 'The kitchen-table podcast about old craft',
    note: 'A name on the list since November. The microphone is in the cupboard. The catch has not come, and so the hold cannot.' },
  { n:  9, zone: 'wrack',   years: 12, state: 'layer',
    name: 'Tuesday tea with M, on the tideline at four',
    note: 'Twelve years and a few months. Has outlasted two jobs and the house move. The layer is the oldest thing in this marsh.' },
  { n: 10, zone: 'wrack',   years:  0, state: 'drift',
    name: 'A handwritten card to one person, on Sundays',
    note: 'Named the week after Christmas. The cards are bought. The pen is bought. The catch is the writing. The catch has not come.' },
  { n: 11, zone: 'wrack',   years:  2, state: 'hold',
    name: 'Long quiet walk with my father at Cley',
    note: 'Caught after the heart thing in 2023. Two years of slow holds, shorter walks, fewer hills. The hold is steady now.' },
  { n: 12, zone: 'wrack',   years:  0, state: 'catch',
    name: 'Letters to D, three pages each, abroad',
    note: 'Caught last week — first letter clumsy and overlong. The clumsiness is the catch. The hold will come or it will not.' },
];

const ZONE_GLYPH = {
  pan:     '◐',
  channel: '◑',
  wrack:   '◓',
};

const ZONE_LABEL = {
  pan:     'Pan',
  channel: 'Channel',
  wrack:   'Wrack',
};

const STATE_LABEL = {
  drift: 'Drift',
  catch: 'Catch',
  hold:  'Hold',
  layer: 'Layer',
};

const STATE_ORDER = ['drift', 'catch', 'hold', 'layer'];

const ZONE_COLOR = {
  pan:     '#7a5680',
  channel: '#6b8b9e',
  wrack:   '#b56a3c',
};

const STORAGE_KEY = 'saltmarsh.v1';
const DEFAULT_PROJECT = 'A small north-coast marsh · spring 2026 · the slow turn';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.deposits)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ deposits, project }));
  } catch {
    // quota or private mode — fail quietly, the session still works
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const _saved = loadState();
let deposits = _saved ? _saved.deposits.map(d => ({ ...d })) : SEED.map(d => ({ ...d }));
let project = _saved && typeof _saved.project === 'string' ? _saved.project : DEFAULT_PROJECT;
let activeFilter = 'all';
let selectedN = deposits.length ? deposits[0].n : null;

const FILTER_BY_KEY = { '0': 'all', '1': 'drift', '2': 'catch', '3': 'hold', '4': 'layer' };

// ---------- formatting ----------

function fmtYears(n) {
  if (n === 0) return 'drift';
  if (n === 1) return '1 year';
  return `${n} years`;
}

function yearsClass(n) {
  return n === 0 ? 'zero' : '';
}

// ---------- rendering ----------

function renderTotals() {
  const host = document.getElementById('chart-totals');
  if (!host) return;
  const layered = deposits.filter(d => d.state === 'layer').length;
  const settled = deposits.filter(d => d.state === 'hold' || d.state === 'layer').length;
  const drifting = deposits.filter(d => d.state === 'drift').length;
  const totalYears = deposits
    .filter(d => d.state !== 'drift')
    .reduce((sum, d) => sum + (d.years || 0), 0);
  host.innerHTML = `
    <div class="total">
      <span class="total-num">${settled}<span class="unit">/${deposits.length - drifting}</span></span>
      <span class="total-label">Held</span>
    </div>
    <div class="total">
      <span class="total-num">${layered}<span class="unit">layer</span></span>
      <span class="total-label">Layered</span>
    </div>
    <div class="total">
      <span class="total-num">${totalYears}<span class="unit">yr</span></span>
      <span class="total-label">Marsh age</span>
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

  const active = deposits.filter(d => d.state !== 'drift');
  if (active.length === 0) {
    host.querySelectorAll('svg').forEach(s => s.remove());
    return;
  }

  const w = 1000;
  const h = 220;
  const padX = 28;
  const padY = 28;
  const maxX = Math.max(1, active.length - 1);
  const maxYears = Math.max(4, ...active.map(d => d.years || 0));

  const sx = i => padX + (i / maxX) * (w - padX * 2);
  // y grows upward = deeper layered / older
  const sy = y => (h - padY) - (Math.min(y, maxYears) / maxYears) * (h - padY * 2);

  // gridlines at quarters — soft layer marks
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const y = padY + (i / 4) * (h - padY * 2);
    grid.push(`<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="rgba(31,29,20,0.06)" stroke-width="1" />`);
  }

  // a tide line at the top — gentle wave like a high water mark
  const tideY = padY - 4;
  const tidePts = [];
  for (let x = 0; x <= w; x += 16) {
    const off = Math.sin(x / 36) * 2.2 + Math.cos(x / 18) * 1.2;
    tidePts.push(`${x},${(tideY + off).toFixed(2)}`);
  }

  // stems: vertical lines from the mud up to each deposit's height
  const mudY = h - 10;
  const stems = active.map((d, i) => {
    const x = sx(i);
    const y = sy(d.years || 0);
    const color = ZONE_COLOR[d.zone] || '#5a4828';
    const opacity = d.state === 'drift' ? 0.35 : 0.85;
    return `
      <line x1="${x.toFixed(1)}" y1="${mudY.toFixed(1)}"
            x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
            stroke="${color}" stroke-width="1.8"
            stroke-dasharray="${d.state === 'drift' ? '3 4' : '0'}"
            opacity="${opacity}" />
    `;
  }).join('');

  // the deposit marks — bigger when layered, smaller when catching
  const marks = active.map((d, i) => {
    const x = sx(i);
    const y = sy(d.years || 0);
    const color = ZONE_COLOR[d.zone] || '#5a4828';
    const r = d.state === 'layer' ? 8 : d.state === 'hold' ? 5.5 : 3.8;
    const ring = d.state === 'hold' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.5" />` : '';
    const leaf = d.state === 'layer'
      ? `<ellipse cx="${x.toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="11" ry="8" fill="${color}" opacity="0.28" />`
      : '';
    return `
      ${leaf}
      ${ring}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" />
    `;
  }).join('');

  // the mud line — soft uneven
  const mudPts = [];
  for (let x = 0; x <= w; x += 40) {
    const off = Math.sin(x / 60) * 3 - 1;
    mudPts.push(`${x},${(mudY + off).toFixed(1)}`);
  }

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${grid.join('')}
      <polyline points="${tidePts.join(' ')}" stroke="#6b8b9e" stroke-width="1.2" fill="none" opacity="0.65" />
      <polyline points="${mudPts.join(' ')}" stroke="rgba(31,29,20,0.4)" stroke-width="1.2" fill="none" />
      ${stems}
      ${marks}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderDeposits() {
  const host = document.getElementById('deposits');
  if (!host) return;
  const filtered = deposits.filter(d => activeFilter === 'all' || d.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--stone);font-family:'JetBrains Mono',monospace;font-size:12px;">No deposits in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(d => `
    <li class="deposit ${d.state === 'catch' ? 'is-current' : ''} ${d.n === selectedN ? 'is-selected' : ''}" data-n="${d.n}">
      <span class="deposit-num">${String(d.n).padStart(2, '0')}</span>
      <span class="deposit-zone ${d.zone}">
        <span class="glyph" aria-hidden="true">${ZONE_GLYPH[d.zone]}</span>
        ${ZONE_LABEL[d.zone]}
      </span>
      <div class="deposit-body">
        <p class="deposit-name">${escapeHtml(d.name)}</p>
        <p class="deposit-note">${escapeHtml(d.note)}</p>
      </div>
      <span class="deposit-years ${yearsClass(d.years)}"><span class="num">${d.years}</span> ${fmtYears(d.years)}</span>
      <span class="deposit-state ${d.state}" data-action="cycle-state" data-n="${d.n}" title="Click to change state">${STATE_LABEL[d.state]}</span>
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
  renderDeposits();
}

// ---------- actions ----------

function cycleState(n) {
  const deposit = deposits.find(d => d.n === n);
  if (!deposit) return;
  const i = STATE_ORDER.indexOf(deposit.state);
  deposit.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  saveState();
  renderAll();
}

function removeDeposit(n) {
  deposits = deposits.filter(d => d.n !== n);
  deposits.forEach((d, i) => { d.n = i + 1; });
  saveState();
  renderAll();
}

function addDeposit({ zone, years, name, state }) {
  const n = deposits.length + 1;
  deposits.push({
    n,
    zone,
    years: Math.max(0, Number(years) || 0),
    state: state || 'drift',
    name: name || 'Unnamed deposit',
    note: '',
  });
  saveState();
  renderAll();
}

function resetToSeed() {
  deposits = SEED.map(d => ({ ...d }));
  project = DEFAULT_PROJECT;
  activeFilter = 'all';
  clearState();
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === 'all');
  });
  renderAll();
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  // keep selection valid for the new filter
  const v = visibleDeposits();
  if (v.length && !v.find(d => d.n === selectedN)) selectedN = v[0].n;
  renderDeposits();
}

function visibleDeposits() {
  return deposits.filter(d => activeFilter === 'all' || d.state === activeFilter);
}

function selectByOffset(delta) {
  const v = visibleDeposits();
  if (v.length === 0) return;
  const idx = v.findIndex(d => d.n === selectedN);
  const next = idx === -1
    ? (delta > 0 ? 0 : v.length - 1)
    : Math.max(0, Math.min(v.length - 1, idx + delta));
  selectedN = v[next].n;
  renderDeposits();
  scrollSelectedIntoView();
}

function scrollSelectedIntoView() {
  const el = document.querySelector(`.deposit[data-n="${selectedN}"]`);
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}

function nudgeYears(delta) {
  const deposit = deposits.find(d => d.n === selectedN);
  if (!deposit) return;
  deposit.years = Math.max(0, (deposit.years || 0) + delta);
  saveState();
  renderAll();
}

function removeSelected() {
  if (selectedN == null) return;
  const v = visibleDeposits();
  const idx = v.findIndex(d => d.n === selectedN);
  removeDeposit(selectedN);
  const v2 = visibleDeposits();
  selectedN = v2.length === 0
    ? null
    : v2[Math.min(idx, v2.length - 1)].n;
  renderDeposits();
}

function cycleSelectedState() {
  if (selectedN == null) return;
  cycleState(selectedN);
}

// ---------- wiring ----------

document.addEventListener('click', (e) => {
  const cycle = e.target.closest('[data-action="cycle-state"]');
  if (cycle) {
    selectedN = Number(cycle.dataset.n);
    cycleState(selectedN);
    return;
  }
  const filterBtn = e.target.closest('#filters button');
  if (filterBtn) {
    setFilter(filterBtn.dataset.filter);
    return;
  }
  const depositRow = e.target.closest('.deposit');
  if (depositRow) {
    selectedN = Number(depositRow.dataset.n);
    renderDeposits();
  }
});

function isTypingInField(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

document.addEventListener('keydown', (e) => {
  if (isTypingInField(e.target)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  switch (e.key) {
    case 'j':
    case 'J':
    case 'ArrowDown':
      e.preventDefault(); selectByOffset(1); break;
    case 'k':
    case 'K':
    case 'ArrowUp':
      e.preventDefault(); selectByOffset(-1); break;
    case 'Enter':
      e.preventDefault(); cycleSelectedState(); break;
    case 'Delete':
    case 'Backspace':
      e.preventDefault(); removeSelected(); break;
    case 'n':
    case 'N': {
      e.preventDefault();
      const nameField = document.getElementById('add-name');
      if (nameField) nameField.focus();
      break;
    }
    case '[':
      e.preventDefault(); nudgeYears(-1); break;
    case ']':
      e.preventDefault(); nudgeYears(1); break;
    case 'r':
    case 'R':
      e.preventDefault();
      if (confirm('Reset the marsh to the original twelve deposits?')) resetToSeed();
      break;
    default:
      if (FILTER_BY_KEY[e.key] !== undefined) {
        e.preventDefault();
        setFilter(FILTER_BY_KEY[e.key]);
      }
  }
});

document.addEventListener('dblclick', (e) => {
  const deposit = e.target.closest('.deposit');
  if (deposit) {
    const n = Number(deposit.dataset.n);
    if (confirm('Remove this deposit from the marsh?')) removeDeposit(n);
  }
});

const projectEl = document.getElementById('chart-project');
if (projectEl) {
  projectEl.addEventListener('click', () => {
    projectEl.setAttribute('contenteditable', 'true');
    projectEl.focus();
    const range = document.createRange();
    range.selectNodeContents(projectEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  projectEl.addEventListener('blur', () => {
    const v = projectEl.textContent.trim();
    project = v || DEFAULT_PROJECT;
    projectEl.removeAttribute('contenteditable');
    saveState();
    renderProject();
  });
  projectEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); projectEl.blur(); }
    if (e.key === 'Escape') { projectEl.textContent = project; projectEl.blur(); }
  });
}

const form = document.getElementById('add-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const zone  = document.getElementById('add-zone').value;
    const years = document.getElementById('add-years').value;
    const name  = document.getElementById('add-name').value.trim();
    const state = document.getElementById('add-state').value;
    if (!name) return;
    addDeposit({ zone, years, name, state });
    form.reset();
    document.getElementById('add-name').focus();
  });
}

const resetLink = document.getElementById('reset-demo');
if (resetLink) {
  resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Reset the marsh to the original twelve deposits? Any changes you have made will be lost.')) {
      resetToSeed();
    }
  });
}

const holdForm = document.getElementById('hold-form');
if (holdForm) {
  holdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = document.getElementById('hold-foot');
    if (foot) foot.textContent = 'Noted. One quiet email when the first marshes open.';
    holdForm.reset();
  });
}

renderAll();
