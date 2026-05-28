// Coppice — the deliberate cut that lets a thing come back stronger.
// Twelve seeded stools kept by no one in particular through a slow
// turn of the spring of 2026. The wood: a morning page standing
// eight years uncut, a 5K cut last winter and just shooting, a side
// novel left to grow as a standard, a postcard habit named but not
// yet cut, a Tuesday call held for twelve years.

const SEED = [
  { n:  1, stand: 'inner',   years:  8, state: 'standard',
    name: 'Morning page in the blue notebook',
    note: 'Ink, not pencil. The page that fills before the kettle finishes. Has stood uncut since the second child was small.' },
  { n:  2, stand: 'inner',   years:  1, state: 'shoot',
    name: 'A slow 5K on the river path',
    note: 'Cut last winter when the back went. The first shoot in March. Two miles, easy. The point is not the time. The point is the running again.' },
  { n:  3, stand: 'inner',   years:  0, state: 'drift',
    name: 'Five minutes of stillness at the threshold',
    note: 'Named in January. Never quite cut. The stillness sits at the edge of the day, waiting for me to clear a stand for it.' },
  { n:  4, stand: 'inner',   years:  3, state: 'pole',
    name: 'No inbox before the second coffee',
    note: 'Cut and regrown twice. The pole is straight now. The day reads differently when the inbox waits half a morning.' },
  { n:  5, stand: 'working', years:  6, state: 'standard',
    name: 'The side novel about the kept river',
    note: 'Started in 2020. Left as a standard on purpose. Not cut, not finished, just there above the canopy, quiet and growing.' },
  { n:  6, stand: 'working', years:  0, state: 'shoot',
    name: 'The Sunday letter to subscribers',
    note: 'Cut for a whole year — felt false to keep sending. Shooting again since Easter. Shorter now. Less of a performance.' },
  { n:  7, stand: 'working', years:  4, state: 'pole',
    name: 'The open-source library, kept small on purpose',
    note: 'Cut hard in 2022, down to the bare interface. Four years of slow regrowth. The pole is straight and useful. Still small.' },
  { n:  8, stand: 'working', years:  0, state: 'drift',
    name: 'The kitchen-table podcast about old work',
    note: 'A name on the list since November. The microphone is in the cupboard. The cut has not come, and so the shoot cannot.' },
  { n:  9, stand: 'edge',    years: 12, state: 'standard',
    name: 'Tuesday call with K, eight in the morning',
    note: 'Twelve years and a few months. The longest standard in the wood. Has outlasted three jobs and a marriage. Will outlast me.' },
  { n: 10, stand: 'edge',    years:  0, state: 'drift',
    name: 'A postcard to one person, on Sundays',
    note: 'Named the week after Christmas. The cards are bought. The pen is bought. The cut is the writing. The cut has not come.' },
  { n: 11, stand: 'edge',    years:  2, state: 'pole',
    name: 'Long Sunday walk with father, near the canal',
    note: 'Cut after the heart thing in 2023. Regrown carefully — shorter walks, fewer hills. Two years on, the pole is doing its work.' },
  { n: 12, stand: 'edge',    years:  0, state: 'shoot',
    name: 'Long handwritten letters to D, abroad',
    note: 'Cut in the move. Started again last week. The first letter was three pages and clumsy. The clumsiness is the shoot.' },
];

const STAND_GLYPH = {
  inner:   '◐',
  working: '◑',
  edge:    '◓',
};

const STAND_LABEL = {
  inner:   'Inner',
  working: 'Working',
  edge:    'Edge',
};

const STATE_LABEL = {
  drift:    'Drift',
  shoot:    'Shoot',
  pole:     'Pole',
  standard: 'Standard',
};

const STATE_ORDER = ['drift', 'shoot', 'pole', 'standard'];

const STAND_COLOR = {
  inner:   '#a64a2e',
  working: '#8a6c3e',
  edge:    '#4a6432',
};

const STORAGE_KEY = 'coppice.v1';
const DEFAULT_PROJECT = 'A small hazel wood · spring 2026 · the slow turn';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.stools)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stools, project }));
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
let stools = _saved ? _saved.stools.map(s => ({ ...s })) : SEED.map(s => ({ ...s }));
let project = _saved && typeof _saved.project === 'string' ? _saved.project : DEFAULT_PROJECT;
let activeFilter = 'all';
let selectedN = stools.length ? stools[0].n : null;

const FILTER_BY_KEY = { '0': 'all', '1': 'drift', '2': 'shoot', '3': 'pole', '4': 'standard' };

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
  const standing = stools.filter(s => s.state === 'standard').length;
  const shooting = stools.filter(s => s.state === 'shoot' || s.state === 'pole').length;
  const drifting = stools.filter(s => s.state === 'drift').length;
  const totalYears = stools
    .filter(s => s.state !== 'drift')
    .reduce((sum, s) => sum + (s.years || 0), 0);
  host.innerHTML = `
    <div class="total">
      <span class="total-num">${shooting}<span class="unit">/${stools.length - drifting}</span></span>
      <span class="total-label">Regrowing</span>
    </div>
    <div class="total">
      <span class="total-num">${standing}<span class="unit">standard</span></span>
      <span class="total-label">Left to grow</span>
    </div>
    <div class="total">
      <span class="total-num">${totalYears}<span class="unit">yr</span></span>
      <span class="total-label">Wood age</span>
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

  const active = stools.filter(s => s.state !== 'drift');
  if (active.length === 0) {
    host.querySelectorAll('svg').forEach(s => s.remove());
    return;
  }

  const w = 1000;
  const h = 220;
  const padX = 28;
  const padY = 28;
  const maxX = Math.max(1, active.length - 1);
  const maxYears = Math.max(4, ...active.map(s => s.years || 0));

  const sx = i => padX + (i / maxX) * (w - padX * 2);
  // y grows upward = taller / older
  const sy = y => (h - padY) - (Math.min(y, maxYears) / maxYears) * (h - padY * 2);

  // gridlines at quarters
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const y = padY + (i / 4) * (h - padY * 2);
    grid.push(`<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="rgba(31,29,20,0.06)" stroke-width="1" />`);
  }

  // a canopy line at the top — gentle wave like a treeline
  const canopyY = padY - 4;
  const canopyPts = [];
  for (let x = 0; x <= w; x += 16) {
    const off = Math.sin(x / 36) * 2.2 + Math.cos(x / 18) * 1.2;
    canopyPts.push(`${x},${(canopyY + off).toFixed(2)}`);
  }

  // stems: vertical lines from the ground up to each stool's height
  const groundY = h - 10;
  const stems = active.map((s, i) => {
    const x = sx(i);
    const y = sy(s.years || 0);
    const color = STAND_COLOR[s.stand] || '#5b4528';
    const opacity = s.state === 'drift' ? 0.35 : 0.85;
    return `
      <line x1="${x.toFixed(1)}" y1="${groundY.toFixed(1)}"
            x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
            stroke="${color}" stroke-width="1.8"
            stroke-dasharray="${s.state === 'drift' ? '3 4' : '0'}"
            opacity="${opacity}" />
    `;
  }).join('');

  // the crown dots — bigger when standard, smaller when shooting
  const crowns = active.map((s, i) => {
    const x = sx(i);
    const y = sy(s.years || 0);
    const color = STAND_COLOR[s.stand] || '#5b4528';
    const r = s.state === 'standard' ? 8 : s.state === 'pole' ? 5.5 : 3.8;
    const ring = s.state === 'pole' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.5" />` : '';
    const leaf = s.state === 'standard'
      ? `<ellipse cx="${x.toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="11" ry="8" fill="${color}" opacity="0.28" />`
      : '';
    return `
      ${leaf}
      ${ring}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" />
    `;
  }).join('');

  // the ground line — soft uneven
  const groundPts = [];
  for (let x = 0; x <= w; x += 40) {
    const off = Math.sin(x / 60) * 3 - 1;
    groundPts.push(`${x},${(groundY + off).toFixed(1)}`);
  }

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${grid.join('')}
      <polyline points="${canopyPts.join(' ')}" stroke="#7d8a52" stroke-width="1.2" fill="none" opacity="0.65" />
      <polyline points="${groundPts.join(' ')}" stroke="rgba(31,29,20,0.4)" stroke-width="1.2" fill="none" />
      ${stems}
      ${crowns}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderStools() {
  const host = document.getElementById('stools');
  if (!host) return;
  const filtered = stools.filter(s => activeFilter === 'all' || s.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--stone);font-family:'JetBrains Mono',monospace;font-size:12px;">No stools in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(s => `
    <li class="stool ${s.state === 'shoot' ? 'is-current' : ''} ${s.n === selectedN ? 'is-selected' : ''}" data-n="${s.n}">
      <span class="stool-num">${String(s.n).padStart(2, '0')}</span>
      <span class="stool-stand ${s.stand}">
        <span class="glyph" aria-hidden="true">${STAND_GLYPH[s.stand]}</span>
        ${STAND_LABEL[s.stand]}
      </span>
      <div class="stool-body">
        <p class="stool-name">${escapeHtml(s.name)}</p>
        <p class="stool-note">${escapeHtml(s.note)}</p>
      </div>
      <span class="stool-years ${yearsClass(s.years)}"><span class="num">${s.years}</span> ${fmtYears(s.years)}</span>
      <span class="stool-state ${s.state}" data-action="cycle-state" data-n="${s.n}" title="Click to change state">${STATE_LABEL[s.state]}</span>
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
  renderStools();
}

// ---------- actions ----------

function cycleState(n) {
  const stool = stools.find(s => s.n === n);
  if (!stool) return;
  const i = STATE_ORDER.indexOf(stool.state);
  stool.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  saveState();
  renderAll();
}

function removeStool(n) {
  stools = stools.filter(s => s.n !== n);
  stools.forEach((s, i) => { s.n = i + 1; });
  saveState();
  renderAll();
}

function addStool({ stand, years, name, state }) {
  const n = stools.length + 1;
  stools.push({
    n,
    stand,
    years: Math.max(0, Number(years) || 0),
    state: state || 'drift',
    name: name || 'Unnamed stool',
    note: '',
  });
  saveState();
  renderAll();
}

function resetToSeed() {
  stools = SEED.map(s => ({ ...s }));
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
  const v = visibleStools();
  if (v.length && !v.find(s => s.n === selectedN)) selectedN = v[0].n;
  renderStools();
}

function visibleStools() {
  return stools.filter(s => activeFilter === 'all' || s.state === activeFilter);
}

function selectByOffset(delta) {
  const v = visibleStools();
  if (v.length === 0) return;
  const idx = v.findIndex(s => s.n === selectedN);
  const next = idx === -1
    ? (delta > 0 ? 0 : v.length - 1)
    : Math.max(0, Math.min(v.length - 1, idx + delta));
  selectedN = v[next].n;
  renderStools();
  scrollSelectedIntoView();
}

function scrollSelectedIntoView() {
  const el = document.querySelector(`.stool[data-n="${selectedN}"]`);
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}

function nudgeYears(delta) {
  const stool = stools.find(s => s.n === selectedN);
  if (!stool) return;
  stool.years = Math.max(0, (stool.years || 0) + delta);
  saveState();
  renderAll();
}

function removeSelected() {
  if (selectedN == null) return;
  const v = visibleStools();
  const idx = v.findIndex(s => s.n === selectedN);
  removeStool(selectedN);
  const v2 = visibleStools();
  selectedN = v2.length === 0
    ? null
    : v2[Math.min(idx, v2.length - 1)].n;
  renderStools();
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
  const stoolRow = e.target.closest('.stool');
  if (stoolRow) {
    selectedN = Number(stoolRow.dataset.n);
    renderStools();
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
      if (confirm('Reset the wood to the original twelve stools?')) resetToSeed();
      break;
    default:
      if (FILTER_BY_KEY[e.key] !== undefined) {
        e.preventDefault();
        setFilter(FILTER_BY_KEY[e.key]);
      }
  }
});

document.addEventListener('dblclick', (e) => {
  const stool = e.target.closest('.stool');
  if (stool) {
    const n = Number(stool.dataset.n);
    if (confirm('Remove this stool from the wood?')) removeStool(n);
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
    const stand = document.getElementById('add-stand').value;
    const years = document.getElementById('add-years').value;
    const name  = document.getElementById('add-name').value.trim();
    const state = document.getElementById('add-state').value;
    if (!name) return;
    addStool({ stand, years, name, state });
    form.reset();
    document.getElementById('add-name').focus();
  });
}

const resetLink = document.getElementById('reset-demo');
if (resetLink) {
  resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Reset the wood to the original twelve stools? Any changes you have made will be lost.')) {
      resetToSeed();
    }
  });
}

const holdForm = document.getElementById('hold-form');
if (holdForm) {
  holdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = document.getElementById('hold-foot');
    if (foot) foot.textContent = 'Noted. One quiet email when the first woods open.';
    holdForm.reset();
  });
}

renderAll();
