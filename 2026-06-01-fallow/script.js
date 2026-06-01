// Fallow — a small page for the work you have set down on purpose.
// Twelve seeded fields kept by no one in particular through a slow
// turn of the spring of 2026. The land: a second book set down a
// year, a small company resting four, a photo feed gone sward, a
// Sunday with no work standing eleven years uncut.

const SEED = [
  { n:  1, land: 'field',    years:  1, state: 'set',
    name: 'The second book, between drafts',
    note: 'Set down at the equinox after the first one came back from copyedits. The fallow is the year the next sentence is allowed to be slow.' },
  { n:  2, land: 'field',    years:  4, state: 'resting',
    name: 'The small company, a year after the sale',
    note: 'Sold in 2022. Four years of fallow on the founder fields. The hedges have grown in. The skylarks are back.' },
  { n:  3, land: 'field',    years:  0, state: 'standing',
    name: 'The slow research paper waiting on slow data',
    note: 'Named in the autumn. The data is two more winters off. Standing for now. Will be set down when the dataset arrives.' },
  { n:  4, land: 'field',    years:  2, state: 'resting',
    name: 'The teaching, paused after a tired spring',
    note: 'Set down in 2024 after a tired spring. Two years of rest now. The students have other teachers. The lecture notes have not been opened.' },
  { n:  5, land: 'margin',   years:  3, state: 'resting',
    name: 'The Tuesday newsletter, rested over a winter',
    note: 'Rested in winter 2023 for a season. The season has become three years. The list has shrunk. The remaining readers have grown quieter.' },
  { n:  6, land: 'margin',   years:  5, state: 'sward',
    name: 'The photography Instagram, gone over to grass',
    note: 'Last post April 2021. The handle is still there. The grid is its own slow archive. The sward is five summers deep.' },
  { n:  7, land: 'margin',   years:  0, state: 'set',
    name: 'The conference circuit, set down in January',
    note: 'Said no to the spring keynote at New Year. The first refused conferences feel raw. The fallow is the months of not booking flights.' },
  { n:  8, land: 'margin',   years:  0, state: 'standing',
    name: 'The Substack drafts folder, not yet rested',
    note: 'Means to rest it. The drafts folder is open. Standing. The cut has not been made and so the fallow has not begun.' },
  { n:  9, land: 'hedgerow', years: 11, state: 'sward',
    name: 'A Sunday with no work, uncut since 2015',
    note: 'Eleven years of Sundays. The boundary practice. The hedge is so thick now nothing crosses it. The oldest sward in the fallow.' },
  { n: 10, land: 'hedgerow', years:  6, state: 'resting',
    name: 'The quarterly call with a co-author',
    note: 'Six years of four calls a year. The hedgerow that keeps the long paper in sight without entering the field.' },
  { n: 11, land: 'hedgerow', years:  2, state: 'resting',
    name: 'The long walk where the field is in sight',
    note: 'Two years of monthly walks past the company gate. Looking. Not entering. The hedgerow that holds the fallow honest.' },
  { n: 12, land: 'hedgerow', years:  0, state: 'set',
    name: 'A no-screens evening, twice a week',
    note: 'Cut at Easter. The first weeks were clumsy. The hedge is just planted. Will it hold past the autumn? The hedge is the question.' },
];

const LAND_GLYPH = {
  field:    '◧',
  margin:   '◨',
  hedgerow: '◫',
};

const LAND_LABEL = {
  field:    'Field',
  margin:   'Margin',
  hedgerow: 'Hedgerow',
};

const STATE_LABEL = {
  standing: 'Standing',
  set:      'Set down',
  resting:  'Resting',
  sward:    'Sward',
};

const STATE_ORDER = ['standing', 'set', 'resting', 'sward'];

const LAND_COLOR = {
  field:    '#8b6f47',
  margin:   '#c08552',
  hedgerow: '#6b7d4f',
};

const STORAGE_KEY = 'fallow.v1';
const DEFAULT_PROJECT = 'A small inland fallow · spring 2026 · the slow rest';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.fields)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fields, project }));
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
let fields = _saved ? _saved.fields.map(d => ({ ...d })) : SEED.map(d => ({ ...d }));
let project = _saved && typeof _saved.project === 'string' ? _saved.project : DEFAULT_PROJECT;
let activeFilter = 'all';
let selectedN = fields.length ? fields[0].n : null;

const FILTER_BY_KEY = { '0': 'all', '1': 'standing', '2': 'set', '3': 'resting', '4': 'sward' };

// ---------- formatting ----------

function fmtYears(n) {
  if (n === 0) return 'standing';
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
  const sward = fields.filter(d => d.state === 'sward').length;
  const rested = fields.filter(d => d.state === 'resting' || d.state === 'sward').length;
  const standing = fields.filter(d => d.state === 'standing').length;
  const totalYears = fields
    .filter(d => d.state !== 'standing')
    .reduce((sum, d) => sum + (d.years || 0), 0);
  host.innerHTML = `
    <div class="total">
      <span class="total-num">${rested}<span class="unit">/${fields.length - standing}</span></span>
      <span class="total-label">Rested</span>
    </div>
    <div class="total">
      <span class="total-num">${sward}<span class="unit">sward</span></span>
      <span class="total-label">Long-fallow</span>
    </div>
    <div class="total">
      <span class="total-num">${totalYears}<span class="unit">yr</span></span>
      <span class="total-label">Fallow age</span>
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

  const active = fields.filter(d => d.state !== 'standing');
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
  // y grows upward = deeper sward / longer fallow
  const sy = y => (h - padY) - (Math.min(y, maxYears) / maxYears) * (h - padY * 2);

  // gridlines at quarters — soft furrow marks
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const y = padY + (i / 4) * (h - padY * 2);
    grid.push(`<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="rgba(31,28,18,0.06)" stroke-width="1" />`);
  }

  // a hedgerow line at the top — gentle wave like a high boundary hedge
  const hedgeY = padY - 4;
  const hedgePts = [];
  for (let x = 0; x <= w; x += 16) {
    const off = Math.sin(x / 36) * 2.2 + Math.cos(x / 18) * 1.2;
    hedgePts.push(`${x},${(hedgeY + off).toFixed(2)}`);
  }

  // stems: vertical lines from the soil up to each field's height
  const soilY = h - 10;
  const stems = active.map((d, i) => {
    const x = sx(i);
    const y = sy(d.years || 0);
    const color = LAND_COLOR[d.land] || '#8b6f47';
    const opacity = d.state === 'standing' ? 0.35 : 0.85;
    return `
      <line x1="${x.toFixed(1)}" y1="${soilY.toFixed(1)}"
            x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
            stroke="${color}" stroke-width="1.8"
            stroke-dasharray="${d.state === 'standing' ? '3 4' : '0'}"
            opacity="${opacity}" />
    `;
  }).join('');

  // the field marks — bigger when sward, smaller when just set down
  const marks = active.map((d, i) => {
    const x = sx(i);
    const y = sy(d.years || 0);
    const color = LAND_COLOR[d.land] || '#8b6f47';
    const r = d.state === 'sward' ? 8 : d.state === 'resting' ? 5.5 : 3.8;
    const ring = d.state === 'resting' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.5" />` : '';
    const crown = d.state === 'sward'
      ? `<ellipse cx="${x.toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="11" ry="8" fill="${color}" opacity="0.28" />`
      : '';
    return `
      ${crown}
      ${ring}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" />
    `;
  }).join('');

  // the soil line — soft uneven
  const soilPts = [];
  for (let x = 0; x <= w; x += 40) {
    const off = Math.sin(x / 60) * 3 - 1;
    soilPts.push(`${x},${(soilY + off).toFixed(1)}`);
  }

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${grid.join('')}
      <polyline points="${hedgePts.join(' ')}" stroke="#6b7d4f" stroke-width="1.2" fill="none" opacity="0.65" />
      <polyline points="${soilPts.join(' ')}" stroke="rgba(31,28,18,0.4)" stroke-width="1.2" fill="none" />
      ${stems}
      ${marks}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderFields() {
  const host = document.getElementById('fields-list');
  if (!host) return;
  const filtered = fields.filter(d => activeFilter === 'all' || d.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--stone);font-family:'JetBrains Mono',monospace;font-size:12px;">No fields in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(d => `
    <li class="field ${d.state === 'set' ? 'is-current' : ''} ${d.n === selectedN ? 'is-selected' : ''}" data-n="${d.n}">
      <span class="field-num">${String(d.n).padStart(2, '0')}</span>
      <span class="field-land field-land-${d.land}">
        <span class="glyph" aria-hidden="true">${LAND_GLYPH[d.land]}</span>
        ${LAND_LABEL[d.land]}
      </span>
      <div class="field-body">
        <p class="field-name">${escapeHtml(d.name)}</p>
        <p class="field-note">${escapeHtml(d.note)}</p>
      </div>
      <span class="field-years ${yearsClass(d.years)}"><span class="num">${d.years}</span> ${fmtYears(d.years)}</span>
      <span class="field-state ${d.state}" data-action="cycle-state" data-n="${d.n}" title="Click to change state">${STATE_LABEL[d.state]}</span>
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
  renderFields();
}

// ---------- actions ----------

function cycleState(n) {
  const field = fields.find(d => d.n === n);
  if (!field) return;
  const i = STATE_ORDER.indexOf(field.state);
  field.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  saveState();
  renderAll();
}

function removeField(n) {
  fields = fields.filter(d => d.n !== n);
  fields.forEach((d, i) => { d.n = i + 1; });
  saveState();
  renderAll();
}

function addField({ land, years, name, state }) {
  const n = fields.length + 1;
  fields.push({
    n,
    land,
    years: Math.max(0, Number(years) || 0),
    state: state || 'standing',
    name: name || 'Unnamed field',
    note: '',
  });
  saveState();
  renderAll();
}

function resetToSeed() {
  fields = SEED.map(d => ({ ...d }));
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
  const v = visibleFields();
  if (v.length && !v.find(d => d.n === selectedN)) selectedN = v[0].n;
  renderFields();
}

function visibleFields() {
  return fields.filter(d => activeFilter === 'all' || d.state === activeFilter);
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
  const row = e.target.closest('.field');
  if (row) {
    selectedN = Number(row.dataset.n);
    renderFields();
  }
});

document.addEventListener('dblclick', (e) => {
  const field = e.target.closest('.field');
  if (field) {
    const n = Number(field.dataset.n);
    if (confirm('Remove this field from the fallow?')) removeField(n);
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
    const land  = document.getElementById('add-land').value;
    const years = document.getElementById('add-years').value;
    const name  = document.getElementById('add-name').value.trim();
    const state = document.getElementById('add-state').value;
    if (!name) return;
    addField({ land, years, name, state });
    form.reset();
    document.getElementById('add-name').focus();
  });
}

const resetLink = document.getElementById('reset-demo');
if (resetLink) {
  resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Reset the fallow to the original twelve fields? Any changes you have made will be lost.')) {
      resetToSeed();
    }
  });
}

const holdForm = document.getElementById('hold-form');
if (holdForm) {
  holdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = document.getElementById('hold-foot');
    if (foot) foot.textContent = 'Noted. One quiet email when the first fallows open.';
    holdForm.reset();
  });
}

renderAll();
