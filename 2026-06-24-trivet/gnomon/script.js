// Gnomon — siting the one fixed thing your day reads off
// A small page for one keeper's dial: the anchor points set true and
// held, day on day, until the whole travelling day reads off them.

const LEVELS = {
  loose: { label: 'Loose', short: 'Loose' },
  sited: { label: 'Sited', short: 'Sited' },
  trued: { label: 'Trued', short: 'Trued' },
  fixed: { label: 'Fixed', short: 'Fixed' },
};

const STATES = {
  adrift:  { label: 'Adrift',  order: 0 },
  setting: { label: 'Setting', order: 1 },
  holding: { label: 'Holding', order: 2 },
  true:    { label: 'True',    order: 3 },
};

// The seeded dial — twelve anchor points across one fictional keeper's
// day in the middle of June 2026. Turns is how many days the point has
// been held true on the dial; for one let go, how many days it held
// before it was dropped off the dial.
const SEED_MARKS = [
  { name: 'The 6am desk held before the house wakes, two hours every morning',         level: 'fixed', state: 'true',    turns: 400 },
  { name: 'The noon walk the whole afternoon hangs on, the meridian of the day',       level: 'fixed', state: 'true',    turns: 220 },
  { name: 'The evening shutdown still adrift, set only last week',                      level: 'loose', state: 'adrift',  turns: 0   },
  { name: 'The meridian line cut in the old churchyard dial, trued to the pole',       level: 'fixed', state: 'true',    turns: 365 },
  { name: 'The Sunday hour that sites the week, kept since the spring',                 level: 'trued', state: 'holding', turns: 14  },
  { name: 'The dawn run sited a fortnight back, holding through the wet mornings',      level: 'sited', state: 'holding', turns: 9   },
  { name: 'The lights-out at ten, set true and steadying after a month',               level: 'trued', state: 'holding', turns: 31  },
  { name: 'The first-coffee-then-page habit found its hour only this week',            level: 'sited', state: 'setting', turns: 3   },
  { name: 'The phone left in the other room at supper, newly set, still drifting',     level: 'loose', state: 'setting', turns: 1   },
  { name: 'The Friday close-the-week review chosen but not yet pinned to an hour',     level: 'loose', state: 'adrift',  turns: 0   },
  { name: 'The bench swept and tools racked at six, mortared in for years',            level: 'fixed', state: 'true',    turns: 510 },
  { name: 'The midnight scroll that was let drift and dropped off the dial at Whitsun',level: 'loose', state: 'adrift',  turns: 2   },
];

const STORAGE_KEY = 'gnomon.marks.v1';
const PROJECT_KEY = 'gnomon.project.v1';
const DEFAULT_PROJECT = 'A keeper\'s dial · June 2026 · twelve marks';

function loadMarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_MARKS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_MARKS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_MARKS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveMarks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(marks)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let marks = loadMarks();
let nextId = (marks.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleMarks() {
  if (filter === 'all') return marks;
  return marks.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { adrift: 0, setting: 0, holding: 0, true: 0 };
  marks.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${marks.length}</strong> marks</span>
    <span class="tot"><strong>${counts.setting + counts.holding}</strong> holding</span>
    <span class="tot"><strong>${counts.true}</strong> true</span>
    <span class="tot"><strong>${counts.adrift}</strong> adrift</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...marks.map(s => s.turns));
  visibleMarks().forEach(s => {
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
  const ul = $('#marks-list');
  ul.innerHTML = '';
  const shown = visibleMarks().slice().sort((a, b) => {
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
        <button class="leg-btn" data-act="turn"    title="Hold it true today (+1 day)">+1d</button>
        <button class="leg-btn" data-act="advance" title="Advance the condition">→</button>
        <button class="leg-btn" data-act="off"     title="Let it drift — off the dial">drop</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'turn')    turnMark(s.id);
        if (act === 'advance') advanceMark(s.id);
        if (act === 'off')     removeMark(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveMarks();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function turnsLabel(t) {
  if (t === 0) return 'not yet set';
  if (t === 1) return 'held 1 day';
  if (t < 100) return `held ${t} days`;
  return `held ${t} days, a fixture`;
}

// ---------- Actions ----------

function addMark({ level, turns, name, state }) {
  marks.push({ id: nextId++, level, turns, name, state });
  render();
}

function turnMark(id) {
  const s = marks.find(x => x.id === id);
  if (!s) return;
  s.turns += 1;
  // a point trues up slow as the days it is held true accrue on the dial
  if (s.state === 'adrift'  && s.turns >= 1)  s.state = 'setting';
  if (s.state === 'setting' && s.turns >= 5)  s.state = 'holding';
  if (s.state === 'holding' && s.turns >= 12) s.state = 'true';
  render();
}

function advanceMark(id) {
  const s = marks.find(x => x.id === id);
  if (!s) return;
  const order = ['adrift', 'setting', 'holding', 'true'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeMark(id) {
  marks = marks.filter(s => s.id !== id);
  render();
}

function resetMarks() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  marks = SEED_MARKS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = marks.length + 1;
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
    project.title = 'Click to rename the dial';
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
    addMark({ level, turns, name, state });
    $('#add-name').value = '';
    $('#add-turns').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetMarks();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Set. We will write once, when the first point has held true a season on the dial and become a fixture the day reads off. You cannot hurry a thing into being fixed.';
  });
});
