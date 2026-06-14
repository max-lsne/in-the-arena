// Holloway — the lane worn deep by patient feet
// A small page for the sunken way that the centuries make.

const CUTS = {
  trace:     { label: 'Trace',     short: 'Trc' },
  hollow:    { label: 'Hollow',    short: 'Hlw' },
  sunken:    { label: 'Sunken',    short: 'Snk' },
  cathedral: { label: 'Cathedral', short: 'Cth' },
};

const STATES = {
  untrodden: { label: 'Untrodden today', order: 0 },
  walked:    { label: 'Walked',          order: 1 },
  deepening: { label: 'Worn deeper',     order: 2 },
  closed:    { label: 'Closed in',       order: 3 },
};

// The seeded parish — twelve lanes walked in by no one in particular,
// somewhere in the middle of June 2026. Passes is how many times the
// lane has been walked (or, for a closed-in lane, how many it counted
// before the brambles came back).
const SEED_LANES = [
  { name: 'The drovers\' road over the down, head-deep under the beeches',  cut: 'cathedral', state: 'deepening', passes: 4800 },
  { name: 'The pasture-gate trace from the kitchen door, walked since 1903', cut: 'trace',     state: 'walked',    passes: 380  },
  { name: 'The translator\'s line from window to desk, four years in',       cut: 'hollow',    state: 'walked',    passes: 1240 },
  { name: 'The half-mile sunken way to the hayfield, banks knee-deep',       cut: 'sunken',    state: 'untrodden', passes: 720  },
  { name: 'The cellist\'s morning forty seconds, since 2019',                cut: 'trace',     state: 'deepening', passes: 2400 },
  { name: 'The shepherd\'s line along the parish boundary, every Tuesday',   cut: 'hollow',    state: 'untrodden', passes: 410  },
  { name: 'The path to the post-box at the bend of the lane',                cut: 'trace',     state: 'walked',    passes: 96   },
  { name: 'The Saturday walk to the long meadow, since the move in 2014',    cut: 'hollow',    state: 'walked',    passes: 612  },
  { name: 'The track from cold-frame to kitchen, four times a day, 30 yr',   cut: 'cathedral', state: 'deepening', passes: 38000 },
  { name: 'The runner\'s five-mile loop out the back gate',                  cut: 'sunken',    state: 'untrodden', passes: 1664 },
  { name: 'The way over the stile by the orchard, now lost to brambles',     cut: 'sunken',    state: 'closed',    passes: 920  },
  { name: 'The lane from the chapel to the bell-pull, walked Sunday',        cut: 'sunken',    state: 'deepening', passes: 3120 },
];

const STORAGE_KEY = 'holloway.lanes.v1';
const PROJECT_KEY = 'holloway.project.v1';
const DEFAULT_PROJECT = 'A small parish · June 2026 · twelve worn lines';

function loadLanes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_LANES.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_LANES.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_LANES.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveLanes() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lanes)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let lanes = loadLanes();
let nextId = (lanes.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleLanes() {
  if (filter === 'all') return lanes;
  return lanes.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { untrodden: 0, walked: 0, deepening: 0, closed: 0 };
  lanes.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${lanes.length}</strong> lanes</span>
    <span class="tot"><strong>${counts.walked + counts.deepening}</strong> walked</span>
    <span class="tot"><strong>${counts.untrodden}</strong> resting</span>
    <span class="tot"><strong>${counts.closed}</strong> closed in</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(12, ...lanes.map(s => s.passes));
  visibleLanes().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar cut-${s.cut}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.passes / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.passes} passes`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#lanes-list');
  ul.innerHTML = '';
  const shown = visibleLanes().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.passes - a.passes;
  });
  shown.forEach(s => {
    const li = document.createElement('li');
    li.className = `leg cut-${s.cut}`;
    if (focused === s.id) li.classList.add('is-focused');
    li.dataset.id = s.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(s.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${s.state}">${STATES[s.state].label}</span>
        <span class="leg-passes">${passesLabel(s.passes)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="pass" title="Count one more pass">+1p</button>
        <button class="leg-btn" data-act="advance" title="Advance state">→</button>
        <button class="leg-btn" data-act="close" title="Let the lane close in (remove)">close</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'pass')    countPass(s.id);
        if (act === 'advance') advanceLane(s.id);
        if (act === 'close')   removeLane(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveLanes();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function passesLabel(p) {
  if (p === 0) return 'untrodden';
  if (p === 1) return '1 pass';
  if (p < 50)  return `${p} passes`;
  if (p < 365) return `${p} passes`;
  const y = (p / 365);
  if (y < 2)  return `${y.toFixed(1)}yr of feet`;
  if (y < 10) return `${Math.round(y)}yr of feet`;
  if (y < 100) return `${Math.round(y)}yr of feet`;
  return `${Math.round(y / 10) * 10}yr of feet`;
}

// ---------- Actions ----------

function addLane({ cut, passes, name, state }) {
  lanes.push({ id: nextId++, cut, passes, name, state });
  render();
}

function countPass(id) {
  const s = lanes.find(x => x.id === id);
  if (!s) return;
  s.passes += 1;
  // gentle auto-advance once the lane has been walked a while
  if (s.state === 'untrodden' && s.passes >= 1) s.state = 'walked';
  if (s.state === 'walked' && s.passes >= 6) s.state = 'deepening';
  render();
}

function advanceLane(id) {
  const s = lanes.find(x => x.id === id);
  if (!s) return;
  const order = ['untrodden', 'walked', 'deepening', 'closed'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeLane(id) {
  lanes = lanes.filter(s => s.id !== id);
  render();
}

function resetLanes() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  lanes = SEED_LANES.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = lanes.length + 1;
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
    project.title = 'Click to rename the parish';
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
    const cut    = $('#add-cut').value;
    const passes = Math.max(0, parseInt($('#add-passes').value, 10) || 0);
    const name   = $('#add-name').value.trim();
    const state  = $('#add-state').value;
    if (!name) return;
    addLane({ cut, passes, name, state });
    $('#add-name').value = '';
    $('#add-passes').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetLanes();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Foot set in. We will write once, when the first lanes are worn in. Keep walking.';
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
  return visibleLanes().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.passes - a.passes;
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

function nudgePasses(delta) {
  if (focused == null) return;
  const s = lanes.find(x => x.id === focused);
  if (!s) return;
  s.passes = Math.max(0, s.passes + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceLane(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeLane(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');       return; }
    if (k === '1') { e.preventDefault(); setFilter('untrodden'); return; }
    if (k === '2') { e.preventDefault(); setFilter('walked');    return; }
    if (k === '3') { e.preventDefault(); setFilter('deepening'); return; }
    if (k === '4') { e.preventDefault(); setFilter('closed');    return; }
    if (k === '[') { e.preventDefault(); nudgePasses(-1); return; }
    if (k === ']') { e.preventDefault(); nudgePasses(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetLanes(); return; }
  });
}
