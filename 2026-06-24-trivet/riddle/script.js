// Riddle — shaking the heap down to what holds
// A small page for one gardener's riddle: the many small asks and ideas
// tipped on the mesh and shaken until only the few that won't pass remain.

const LEVELS = {
  heap:    { label: 'Heap',    short: 'Hep' },
  riddled: { label: 'Riddled', short: 'Rid' },
  caught:  { label: 'Caught',  short: 'Cgt' },
  kept:    { label: 'Kept',    short: 'Kep' },
};

const STATES = {
  loose:   { label: 'Loose',   order: 0 },
  shaking: { label: 'Shaking', order: 1 },
  holding: { label: 'Holding', order: 2 },
  cleared: { label: 'Cleared', order: 3 },
};

// The seeded heap — twelve things across one fictional plot in the middle
// of June 2026. Turns is how many shakes the thing has been given on the
// riddle; for one that fell through after all, how many shakes it held
// before it broke and passed.
const SEED_CLODS = [
  { name: 'The dozen "maybe" meetings shaken down to the two that hold',            level: 'kept',    state: 'cleared', turns: 16 },
  { name: 'The inbox of asks shaken till only three wouldn\'t fall through',        level: 'caught',  state: 'holding', turns: 9  },
  { name: 'The loose pile of someday-projects straight off the spade',             level: 'heap',    state: 'loose',   turns: 0  },
  { name: 'The new bed of turned earth just tipped onto the mesh',                  level: 'riddled', state: 'shaking', turns: 3  },
  { name: 'The stone the spade keeps turning up, kept for the rockery',            level: 'kept',    state: 'cleared', turns: 21 },
  { name: 'The seedling roots caught and saved from the riddled compost',          level: 'kept',    state: 'cleared', turns: 14 },
  { name: 'The quarter\'s favours half-shaken, the chaff starting to fall',        level: 'caught',  state: 'holding', turns: 6  },
  { name: 'The pit-sand for mortar being worked through the coarse grade',         level: 'riddled', state: 'shaking', turns: 4  },
  { name: 'The threshed seed-heads set on the sieve, not yet worked in the wind',  level: 'riddled', state: 'shaking', turns: 2  },
  { name: 'The week\'s small yeses shovelled on, none of them sorted yet',         level: 'heap',    state: 'loose',   turns: 0  },
  { name: 'The flint and bindweed long since flung into the keep-bucket',          level: 'kept',    state: 'cleared', turns: 19 },
  { name: 'The clod that looked solid but broke and fell through at last',         level: 'heap',    state: 'loose',   turns: 1  },
];

const STORAGE_KEY = 'riddle.clods.v1';
const PROJECT_KEY = 'riddle.project.v1';
const DEFAULT_PROJECT = 'A gardener\'s riddle · June 2026 · twelve in the heap';

function loadClods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CLODS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_CLODS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_CLODS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveClods() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clods)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let clods = loadClods();
let nextId = (clods.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleClods() {
  if (filter === 'all') return clods;
  return clods.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { loose: 0, shaking: 0, holding: 0, cleared: 0 };
  clods.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${clods.length}</strong> in the heap</span>
    <span class="tot"><strong>${counts.shaking + counts.holding}</strong> on the mesh</span>
    <span class="tot"><strong>${counts.cleared}</strong> kept</span>
    <span class="tot"><strong>${counts.loose}</strong> loose</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...clods.map(s => s.turns));
  visibleClods().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.turns / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${turnsLabel(s.turns)}`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#clods-list');
  ul.innerHTML = '';
  const shown = visibleClods().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.turns - a.turns;
  });
  shown.forEach(s => {
    const li = document.createElement('li');
    li.className = `leg level-${s.level}`;
    if (focused === s.id) li.classList.add('is-focused');
    li.dataset.id = s.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(s.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${s.state}">${STATES[s.state].label}</span>
        <span class="leg-passes">${turnsLabel(s.turns)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="turn"    title="Shake the riddle (+1 shake)">+1s</button>
        <button class="leg-btn" data-act="advance" title="Advance the condition">→</button>
        <button class="leg-btn" data-act="off"     title="Let it fall through — sifted out">sift</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'turn')    turnClod(s.id);
        if (act === 'advance') advanceClod(s.id);
        if (act === 'off')     removeClod(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveClods();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function turnsLabel(t) {
  if (t === 0) return 'not yet shaken';
  if (t === 1) return '1 shake';
  if (t < 100) return `${t} shakes`;
  return `${t} shakes, riddled clean`;
}

// ---------- Actions ----------

function addClod({ level, turns, name, state }) {
  clods.push({ id: nextId++, level, turns, name, state });
  render();
}

function turnClod(id) {
  const s = clods.find(x => x.id === id);
  if (!s) return;
  s.turns += 1;
  // a thing rides further up the mesh as the shakes accrue
  if (s.state === 'loose'   && s.turns >= 1)  s.state = 'shaking';
  if (s.state === 'shaking' && s.turns >= 5)  s.state = 'holding';
  if (s.state === 'holding' && s.turns >= 12) s.state = 'cleared';
  render();
}

function advanceClod(id) {
  const s = clods.find(x => x.id === id);
  if (!s) return;
  const order = ['loose', 'shaking', 'holding', 'cleared'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeClod(id) {
  clods = clods.filter(s => s.id !== id);
  render();
}

function resetClods() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  clods = SEED_CLODS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = clods.length + 1;
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
    project.title = 'Click to rename the riddle';
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
    const level = $('#add-level').value;
    const turns = Math.max(0, parseInt($('#add-turns').value, 10) || 0);
    const name  = $('#add-name').value.trim();
    const state = $('#add-state').value;
    if (!name) return;
    addClod({ level, turns, name, state });
    $('#add-name').value = '';
    $('#add-turns').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetClods();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Shaken. We will write once, when the first heap has been riddled down to the few that wouldn\'t fall through. You cannot keep every clod.';
  });

  wireKeyboard();
});

// ---------- Keyboard ----------

function isTypingInForm() {
  const t = document.activeElement;
  if (!t) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}

function sortedShown() {
  return visibleClods().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.turns - a.turns;
  });
}

function focusedIndexInShown(shown) {
  if (focused == null) return -1;
  return shown.findIndex(s => s.id === focused);
}

function moveFocus(delta) {
  const shown = sortedShown();
  if (shown.length === 0) { focused = null; render(); return; }
  let i = focusedIndexInShown(shown);
  if (i === -1) {
    focused = delta > 0 ? shown[0].id : shown[shown.length - 1].id;
  } else {
    i = (i + delta + shown.length) % shown.length;
    focused = shown[i].id;
  }
  render();
  const el = document.querySelector(`.leg[data-id="${focused}"]`);
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setFilter(f) {
  filter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  render();
}

function nudgeTurns(delta) {
  if (focused == null) return;
  const s = clods.find(x => x.id === focused);
  if (!s) return;
  s.turns = Math.max(0, s.turns + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceClod(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeClod(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');     return; }
    if (k === '1') { e.preventDefault(); setFilter('loose');   return; }
    if (k === '2') { e.preventDefault(); setFilter('shaking'); return; }
    if (k === '3') { e.preventDefault(); setFilter('holding'); return; }
    if (k === '4') { e.preventDefault(); setFilter('cleared'); return; }
    if (k === '[') { e.preventDefault(); nudgeTurns(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeTurns(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetClods(); return; }
  });
}
