// Kindling — the dry keep as practice
// A small page for the small starters you keep against the cold morning.

const PILES = {
  tinder: { label: 'Tinder', short: 'Tin' },
  twigs:  { label: 'Twigs',  short: 'Twg' },
  splits: { label: 'Splits', short: 'Spl' },
  logs:   { label: 'Logs',   short: 'Log' },
};

const STATES = {
  gathered: { label: 'Gathered', order: 0 },
  drying:   { label: 'Drying',   order: 1 },
  ready:    { label: 'Ready',    order: 2 },
  spent:    { label: 'Spent',    order: 3 },
};

// The seeded pile — twelve sticks kept by no one in particular through
// a slow turn of the spring of 2026. Weeks is how long the stick has
// been on the pile (or, for spent, how long it sat there before catching).
const SEED_STICKS = [
  { name: 'A one-sentence draft, laid Sunday nights for years', pile: 'tinder', state: 'ready',    weeks: 132 },
  { name: 'A five-minute warm-up at the workbench',             pile: 'twigs',  state: 'ready',    weeks: 86  },
  { name: 'The second book opened at last night\'s line',       pile: 'splits', state: 'drying',   weeks: 9   },
  { name: 'A single deep breath at the back door',              pile: 'tinder', state: 'ready',    weeks: 264 },
  { name: 'A rough outline of the long essay, three pages',     pile: 'twigs',  state: 'drying',   weeks: 14  },
  { name: 'The first eighty steps of the morning run',          pile: 'tinder', state: 'ready',    weeks: 178 },
  { name: 'A draft three-quarters through, waiting on its end', pile: 'splits', state: 'ready',    weeks: 22  },
  { name: 'A dissertation chapter, paragraph by paragraph',     pile: 'logs',   state: 'gathered', weeks: 2   },
  { name: 'A returned letter half-written on the desk',         pile: 'splits', state: 'ready',    weeks: 6   },
  { name: 'A single scale, untimed, before the first piece',    pile: 'twigs',  state: 'ready',    weeks: 56  },
  { name: 'A translation, the next paragraph already marked',   pile: 'logs',   state: 'drying',   weeks: 28  },
  { name: 'The opening line that lit the first novel, 2017',    pile: 'tinder', state: 'spent',    weeks: 488 },
];

const STORAGE_KEY = 'kindling.sticks.v1';
const PROJECT_KEY = 'kindling.project.v1';
const DEFAULT_PROJECT = 'A small kindling pile · spring 2026 · the dry keep';

function loadSticks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_STICKS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_STICKS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_STICKS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveSticks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sticks)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let sticks = loadSticks();
let nextId = (sticks.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleSticks() {
  if (filter === 'all') return sticks;
  return sticks.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { gathered: 0, drying: 0, ready: 0, spent: 0 };
  sticks.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${sticks.length}</strong> sticks</span>
    <span class="tot"><strong>${counts.ready}</strong> ready</span>
    <span class="tot"><strong>${counts.drying + counts.gathered}</strong> drying</span>
    <span class="tot"><strong>${counts.spent}</strong> spent</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(12, ...sticks.map(s => s.weeks));
  visibleSticks().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar pile-${s.pile}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.weeks / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.weeks} weeks on the pile`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#sticks-list');
  ul.innerHTML = '';
  const shown = visibleSticks().slice().sort((a, b) => {
    // by state ascending (gathered first), then by weeks descending
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.weeks - a.weeks;
  });
  shown.forEach(s => {
    const li = document.createElement('li');
    li.className = `leg pile-${s.pile}`;
    if (focused === s.id) li.classList.add('is-focused');
    li.dataset.id = s.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(s.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${s.state}">${STATES[s.state].label}</span>
        <span class="leg-weeks">${weeksLabel(s.weeks)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="age" title="Age the stick by a week">+1w</button>
        <button class="leg-btn" data-act="advance" title="Advance the state">→</button>
        <button class="leg-btn" data-act="give" title="Give the stick to the fire (remove)">give</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'age')     ageStick(s.id);
        if (act === 'advance') advanceStick(s.id);
        if (act === 'give')    removeStick(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveSticks();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function weeksLabel(w) {
  if (w === 0)  return 'just cut';
  if (w === 1)  return '1w on pile';
  if (w < 12)   return `${w}w on pile`;
  const m = Math.floor(w / 4.345);
  if (m < 12)   return `${m}m on pile`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (r === 0)  return `${y}y on pile`;
  return `${y}y ${r}m on pile`;
}

// ---------- Actions ----------

function addStick({ pile, weeks, name, state }) {
  sticks.push({ id: nextId++, pile, weeks, name, state });
  render();
}

function ageStick(id) {
  const s = sticks.find(x => x.id === id);
  if (!s) return;
  s.weeks += 1;
  // gentle auto-advance with weeks on the pile
  if (s.state === 'gathered' && s.weeks >= 1)  s.state = 'drying';
  if (s.state === 'drying'   && s.weeks >= 6)  s.state = 'ready';
  render();
}

function advanceStick(id) {
  const s = sticks.find(x => x.id === id);
  if (!s) return;
  const order = ['gathered', 'drying', 'ready', 'spent'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeStick(id) {
  sticks = sticks.filter(s => s.id !== id);
  render();
}

function resetSticks() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  sticks = SEED_STICKS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = sticks.length + 1;
  filter = 'all';
  const project = $('#chart-project');
  if (project) project.textContent = DEFAULT_PROJECT;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === 'all');
  });
  render();
}

// ---------- Wire up ----------

document.addEventListener('DOMContentLoaded', () => {
  const project = $('#chart-project');
  if (project) {
    project.textContent = loadProject();
    project.setAttribute('contenteditable', 'true');
    project.setAttribute('spellcheck', 'false');
    project.title = 'Click to rename the pile';
    project.addEventListener('blur', () => saveProject(project.textContent.trim()));
    project.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); project.blur(); }
    });
  }

  render();

  document.querySelectorAll('#filters button').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document.querySelectorAll('#filters button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      render();
    });
  });

  $('#add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pile   = $('#add-pile').value;
    const weeks  = Math.max(0, parseInt($('#add-weeks').value, 10) || 0);
    const name   = $('#add-name').value.trim();
    const state  = $('#add-state').value;
    if (!name) return;
    addStick({ pile, weeks, name, state });
    $('#add-name').value = '';
    $('#add-weeks').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetSticks();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Laid on. We will write once, when the first piles are dry. Keep one small dry stick.';
  });
});
