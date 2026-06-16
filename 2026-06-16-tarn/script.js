// Tarn — the high water the hill keeps for itself
// A small page for the mountain lakes and feeder pools of one parish.

const LEVELS = {
  drop:   { label: 'Drop',   short: 'Drp' },
  pool:   { label: 'Pool',   short: 'Pol' },
  tarn:   { label: 'Tarn',   short: 'Trn' },
  cirque: { label: 'Cirque', short: 'Crq' },
};

const STATES = {
  glassed:  { label: 'Glassed',  order: 0 },
  riffled:  { label: 'Riffled',  order: 1 },
  spawning: { label: 'Spawning', order: 2 },
  frozen:   { label: 'Frozen',   order: 3 },
};

// The seeded fellside parish — twelve tarns and pools across one
// fictional fellside in the middle of June 2026. Summers is how
// many years the tarn has been on the parish map; for a lost or
// frozen tarn, how many summers it held before it was lost.
const SEED_TARNS = [
  { name: 'The cathedral tarn at the head of the cirque, on every map since 1872', level: 'cirque', state: 'spawning', summers: 154 },
  { name: 'The cartographer\'s far tarn, walked to every August since 2014',        level: 'tarn',   state: 'riffled',  summers: 12  },
  { name: 'The shallow by the col, named on the parish map in 2018',                level: 'pool',   state: 'spawning', summers: 8   },
  { name: 'The young walker\'s first drop in the upper bowl, this snowmelt',       level: 'drop',   state: 'riffled',  summers: 1   },
  { name: 'The shepherd\'s high tarn, watering ewes for forty summers',             level: 'cirque', state: 'spawning', summers: 40  },
  { name: 'The pair-of-tarns in the lee of the fell, since the 1932 survey',        level: 'tarn',   state: 'glassed',  summers: 94  },
  { name: 'The mending pool in the saddle, refilled by the late June rain',         level: 'pool',   state: 'spawning', summers: 6   },
  { name: 'The fell-walker\'s morning tarn, twenty-eight summers above the col',    level: 'tarn',   state: 'glassed',  summers: 28  },
  { name: 'The frozen tarn in the north bowl — still iced over in late June',       level: 'pool',   state: 'frozen',   summers: 22  },
  { name: 'The boy\'s back-gate drop, second summer this year',                     level: 'drop',   state: 'glassed',  summers: 2   },
  { name: 'The chain of three pools above the col, on every map since 1968',        level: 'tarn',   state: 'glassed',  summers: 58  },
  { name: 'The lost tarn in the dry valley — gone since the August of 2019',        level: 'drop',   state: 'frozen',   summers: 1   },
];

const STORAGE_KEY = 'tarn.tarns.v1';
const PROJECT_KEY = 'tarn.project.v1';
const DEFAULT_PROJECT = 'A fellside parish · June 2026 · twelve mapped tarns';

function loadTarns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_TARNS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_TARNS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_TARNS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveTarns() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tarns)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let tarns = loadTarns();
let nextId = (tarns.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleTarns() {
  if (filter === 'all') return tarns;
  return tarns.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { glassed: 0, riffled: 0, spawning: 0, frozen: 0 };
  tarns.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${tarns.length}</strong> tarns</span>
    <span class="tot"><strong>${counts.riffled + counts.spawning}</strong> active</span>
    <span class="tot"><strong>${counts.glassed}</strong> glassed</span>
    <span class="tot"><strong>${counts.frozen}</strong> frozen</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...tarns.map(s => s.summers));
  visibleTarns().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.summers / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.summers} summers`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#tarns-list');
  ul.innerHTML = '';
  const shown = visibleTarns().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.summers - a.summers;
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
        <span class="leg-passes">${summersLabel(s.summers)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="deepen" title="Deepen the tarn (+1 summer)">+1s</button>
        <button class="leg-btn" data-act="advance" title="Advance the surface state">→</button>
        <button class="leg-btn" data-act="lose"    title="Lose the tarn in a dry summer">lose</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'deepen')  deepenTarn(s.id);
        if (act === 'advance') advanceTarn(s.id);
        if (act === 'lose')    removeTarn(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveTarns();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function summersLabel(s) {
  if (s === 0) return 'first drop';
  if (s === 1) return '1 summer';
  if (s < 100) return `${s} summers`;
  if (s < 200) return `${s}yr on the map`;
  return `${Math.round(s / 10) * 10}yr on the map`;
}

// ---------- Actions ----------

function addTarn({ level, summers, name, state }) {
  tarns.push({ id: nextId++, level, summers, name, state });
  render();
}

function deepenTarn(id) {
  const s = tarns.find(x => x.id === id);
  if (!s) return;
  s.summers += 1;
  // gentle auto-advance as the tarn holds a few summers
  if (s.state === 'frozen' && s.summers >= 2) s.state = 'glassed';
  if (s.state === 'glassed' && s.summers >= 3) s.state = 'riffled';
  if (s.state === 'riffled' && s.summers >= 8) s.state = 'spawning';
  render();
}

function advanceTarn(id) {
  const s = tarns.find(x => x.id === id);
  if (!s) return;
  const order = ['glassed', 'riffled', 'spawning', 'frozen'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeTarn(id) {
  tarns = tarns.filter(s => s.id !== id);
  render();
}

function resetTarns() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  tarns = SEED_TARNS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = tarns.length + 1;
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
    project.title = 'Click to rename the fellside parish';
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
    const summers = Math.max(0, parseInt($('#add-summers').value, 10) || 0);
    const name    = $('#add-name').value.trim();
    const state   = $('#add-state').value;
    if (!name) return;
    addTarn({ level, summers, name, state });
    $('#add-name').value = '';
    $('#add-summers').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetTarns();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Drop caught. We will write once, when the first pool has held through an August. The hill keeps it.';
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
  return visibleTarns().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.summers - a.summers;
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

function nudgeSummers(delta) {
  if (focused == null) return;
  const s = tarns.find(x => x.id === focused);
  if (!s) return;
  s.summers = Math.max(0, s.summers + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceTarn(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeTarn(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');      return; }
    if (k === '1') { e.preventDefault(); setFilter('glassed');  return; }
    if (k === '2') { e.preventDefault(); setFilter('riffled');  return; }
    if (k === '3') { e.preventDefault(); setFilter('spawning'); return; }
    if (k === '4') { e.preventDefault(); setFilter('frozen');   return; }
    if (k === '[') { e.preventDefault(); nudgeSummers(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeSummers(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetTarns(); return; }
  });
}
