// Espalier — a tree left alone is a thicket; trained, it is a wall of fruit
// A small page for one walled garden's board of limbs, trained against the wall.

const LEVELS = {
  whip:   { label: 'Whip',   short: 'Whp' },
  cordon: { label: 'Cordon', short: 'Crd' },
  tier:   { label: 'Tier',   short: 'Tir' },
  frame:  { label: 'Frame',  short: 'Frm' },
};

const STATES = {
  leggy:  { label: 'Leggy',  order: 0 },
  tied:   { label: 'Tied',   order: 1 },
  pruned: { label: 'Pruned', order: 2 },
  set:    { label: 'Set',    order: 3 },
};

// The seeded wall — twelve limbs trained against one fictional south wall
// in the back-end of 2026, the secateurs just sharpened. Seasons is how
// many seasons the limb has been trained in; for fresh maiden whip and
// leggy bolting growth, how little it has yet learned.
const SEED_WALL = [
  { name: 'The old pear that has fruited on the same spurs for years',         level: 'frame',  state: 'set',    seasons: 12 },
  { name: 'The apple laid in level along all three wires and lignified',        level: 'tier',   state: 'set',    seasons: 9  },
  { name: 'The maiden whip cut this spring, all sap and no shape',              level: 'whip',   state: 'leggy',  seasons: 0  },
  { name: 'The cordon bent down to the first wire last winter and tied',        level: 'cordon', state: 'tied',   seasons: 2  },
  { name: 'The water-shoot that bolted straight up and was never stopped',      level: 'whip',   state: 'leggy',  seasons: 1  },
  { name: 'The plum trained low since its first year against the warm brick',   level: 'tier',   state: 'pruned', seasons: 7  },
  { name: 'The second arm just laid in, waiting for the wood to set',           level: 'cordon', state: 'tied',   seasons: 3  },
  { name: 'The gage summer-pruned back to the spur to throw fruit, not leaf',   level: 'tier',   state: 'pruned', seasons: 5  },
  { name: 'The espalier a previous gardener let grow out into a bush',          level: 'frame',  state: 'leggy',  seasons: 8  },
  { name: 'The fig tied to the wall but never cut, all leggy reaching growth',  level: 'cordon', state: 'tied',   seasons: 1  },
  { name: 'The morello on the cold north wall, trained fan-flat and pruned',    level: 'tier',   state: 'pruned', seasons: 4  },
  { name: 'The first cordon ever planted here, now part of the wall itself',    level: 'frame',  state: 'set',    seasons: 11 },
];

const STORAGE_KEY = 'espalier.wall.v1';
const PROJECT_KEY = 'espalier.project.v1';
const DEFAULT_PROJECT = 'A south wall in the back-end of 2026 · twelve limbs';

function seedWall() {
  return SEED_WALL.map((w, i) => ({ ...w, id: i + 1 }));
}

function loadWall() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedWall();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedWall();
    return parsed.map((w, i) => ({ ...w, id: w.id || i + 1 }));
  } catch {
    return seedWall();
  }
}

function saveWall() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(wall)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let wall = loadWall();
let nextId = (wall.reduce((m, w) => Math.max(m, w.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleWall() {
  if (filter === 'all') return wall;
  return wall.filter(w => w.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { leggy: 0, tied: 0, pruned: 0, set: 0 };
  wall.forEach(w => { counts[w.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${wall.length}</strong> on the wall</span>
    <span class="tot"><strong>${counts.pruned + counts.set}</strong> trained in</span>
    <span class="tot"><strong>${counts.set}</strong> set</span>
    <span class="tot"><strong>${counts.leggy}</strong> leggy</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...wall.map(w => w.seasons));
  visibleWall().forEach(w => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${w.level}`;
    if (focused === w.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((w.seasons / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${w.name} — ${w.seasons} seasons trained`;
    bar.addEventListener('mouseenter', () => { focused = w.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#wall-list');
  ul.innerHTML = '';
  const shown = visibleWall().slice().sort((a, b) => {
    const d = STATES[b.state].order - STATES[a.state].order;
    if (d !== 0) return d;
    return b.seasons - a.seasons;
  });
  shown.forEach(w => {
    const li = document.createElement('li');
    li.className = `leg level-${w.level}`;
    if (focused === w.id) li.classList.add('is-focused');
    li.dataset.id = w.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(w.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${w.state}">${STATES[w.state].label}</span>
        <span class="leg-passes">${seasonsLabel(w.seasons)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="train" title="Train it on another season (+1 season)">+1s</button>
        <button class="leg-btn" data-act="advance" title="Bring the wood on — settle what it is doing">&darr;</button>
        <button class="leg-btn" data-act="grub"   title="Grub it out — gone for good">grub</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = w.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'train')   trainLimb(w.id);
        if (act === 'advance') advanceLimb(w.id);
        if (act === 'grub')    removeLimb(w.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveWall();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function seasonsLabel(n) {
  if (n === 0) return 'cut this spring';
  if (n === 1) return '1 season';
  if (n < 10) return `${n} seasons`;
  return `${n} seasons · part of the wall`;
}

// ---------- Actions ----------

function addLimb({ level, seasons, name, state }) {
  wall.push({ id: nextId++, level, seasons, name, state });
  render();
}

function trainLimb(id) {
  const w = wall.find(x => x.id === id);
  if (!w) return;
  w.seasons += 1;
  // the wood comes on through the seasons, from leggy growth to set
  if (w.state === 'leggy'  && w.seasons >= 1) w.state = 'tied';
  if (w.state === 'tied'   && w.seasons >= 3) w.state = 'pruned';
  if (w.state === 'pruned' && w.seasons >= 8) w.state = 'set';
  render();
}

function advanceLimb(id) {
  const w = wall.find(x => x.id === id);
  if (!w) return;
  const order = ['leggy', 'tied', 'pruned', 'set'];
  const i = order.indexOf(w.state);
  w.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeLimb(id) {
  wall = wall.filter(w => w.id !== id);
  render();
}

function resetWall() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  wall = seedWall();
  nextId = wall.length + 1;
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
    project.title = 'Click to rename the wall';
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
    const level   = $('#add-level').value;
    const seasons = Math.max(0, parseInt($('#add-seasons').value, 10) || 0);
    const name    = $('#add-name').value.trim();
    const state   = $('#add-state').value;
    if (!name) return;
    addLimb({ level, seasons, name, state });
    $('#add-name').value = '';
    $('#add-seasons').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetWall();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Tied in. We will write once, when the wood has set into the bend, the string is off, and the tree fruits flat against the wall on its own.';
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
  return visibleWall().slice().sort((a, b) => {
    const d = STATES[b.state].order - STATES[a.state].order;
    if (d !== 0) return d;
    return b.seasons - a.seasons;
  });
}

function focusedIndexInShown(shown) {
  if (focused == null) return -1;
  return shown.findIndex(w => w.id === focused);
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

function nudgeSeasons(delta) {
  if (focused == null) return;
  const w = wall.find(x => x.id === focused);
  if (!w) return;
  w.seasons = Math.max(0, w.seasons + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceLimb(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeLimb(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');    return; }
    if (k === '1') { e.preventDefault(); setFilter('leggy');  return; }
    if (k === '2') { e.preventDefault(); setFilter('tied');   return; }
    if (k === '3') { e.preventDefault(); setFilter('pruned'); return; }
    if (k === '4') { e.preventDefault(); setFilter('set');    return; }
    if (k === '[') { e.preventDefault(); nudgeSeasons(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeSeasons(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetWall(); return; }
  });
}
