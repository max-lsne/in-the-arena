// Brine — keeping what you don't act on green
// A small page for one keeper's note cellar: the raw ideas put down
// in salt and turned slow until they cure.

const LEVELS = {
  raw:    { label: 'Raw',    short: 'Raw' },
  crock:  { label: 'Crock',  short: 'Crk' },
  cellar: { label: 'Cellar', short: 'Cel' },
  larder: { label: 'Larder', short: 'Lar' },
};

const STATES = {
  fresh:   { label: 'Fresh',   order: 0 },
  salting: { label: 'Salting', order: 1 },
  souring: { label: 'Souring', order: 2 },
  cured:   { label: 'Cured',   order: 3 },
};

// The seeded cellar — twelve crocks across one fictional keeper's note
// cellar in the middle of June 2026. Turns is how many times you have
// gone down to the cellar and turned and skimmed the crock; for one
// thrown out, how many turns it held before it went off.
const SEED_CROCKS = [
  { name: 'The sourdough mother kept and fed in the same crock since 2016',            level: 'larder', state: 'cured',   turns: 124 },
  { name: 'The cold novel draft put down two winters ago, souring well',              level: 'cellar', state: 'souring', turns: 9   },
  { name: 'The raw business idea salted only this week, lid just on',                 level: 'raw',    state: 'fresh',   turns: 0   },
  { name: 'The sauerkraut crock blooming on top and wanting a skim',                  level: 'crock',  state: 'salting', turns: 3   },
  { name: 'The cask laid down the cold spring the daughter was born',                 level: 'larder', state: 'cured',   turns: 64  },
  { name: 'The luthier\'s spruce billet stickered in the loft, marked 2019',          level: 'larder', state: 'cured',   turns: 28  },
  { name: 'The half-formed essay turned twice and starting to come good',             level: 'cellar', state: 'souring', turns: 6   },
  { name: 'The career change put down last autumn, drawing its water slow',           level: 'crock',  state: 'salting', turns: 4   },
  { name: 'The preserved-lemon jar set down at midwinter, salt barely up',            level: 'crock',  state: 'salting', turns: 2   },
  { name: 'The talk outline scribbled on a train, not yet under the salt',            level: 'raw',    state: 'fresh',   turns: 0   },
  { name: 'The miso put down in the deep crock three summers back, long cured',       level: 'larder', state: 'cured',   turns: 41  },
  { name: 'The bad idea that went off in the warm and was thrown out at Whitsun',     level: 'raw',    state: 'fresh',   turns: 1   },
];

const STORAGE_KEY = 'brine.crocks.v1';
const PROJECT_KEY = 'brine.project.v1';
const DEFAULT_PROJECT = 'A keeper\'s cellar · June 2026 · twelve down';

function loadCrocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CROCKS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_CROCKS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_CROCKS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveCrocks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(crocks)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let crocks = loadCrocks();
let nextId = (crocks.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleCrocks() {
  if (filter === 'all') return crocks;
  return crocks.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { fresh: 0, salting: 0, souring: 0, cured: 0 };
  crocks.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${crocks.length}</strong> crocks</span>
    <span class="tot"><strong>${counts.salting + counts.souring}</strong> working</span>
    <span class="tot"><strong>${counts.cured}</strong> cured</span>
    <span class="tot"><strong>${counts.fresh}</strong> fresh</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...crocks.map(s => s.turns));
  visibleCrocks().forEach(s => {
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
  const ul = $('#crocks-list');
  ul.innerHTML = '';
  const shown = visibleCrocks().slice().sort((a, b) => {
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
        <button class="leg-btn" data-act="turn"    title="Go down and turn it (+1 turn)">+1t</button>
        <button class="leg-btn" data-act="advance" title="Advance the condition">→</button>
        <button class="leg-btn" data-act="off"     title="Threw it out — went off, gone">off</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'turn')    turnCrock(s.id);
        if (act === 'advance') advanceCrock(s.id);
        if (act === 'off')     removeCrock(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveCrocks();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function turnsLabel(t) {
  if (t === 0) return 'just put down';
  if (t === 1) return '1 turn';
  if (t < 100) return `${t} turns`;
  return `${t} turns, years down`;
}

// ---------- Actions ----------

function addCrock({ level, turns, name, state }) {
  crocks.push({ id: nextId++, level, turns, name, state });
  render();
}

function turnCrock(id) {
  const s = crocks.find(x => x.id === id);
  if (!s) return;
  s.turns += 1;
  // a crock sours slow as the turns accrue down in the cool dark
  if (s.state === 'fresh'   && s.turns >= 1)  s.state = 'salting';
  if (s.state === 'salting' && s.turns >= 5)  s.state = 'souring';
  if (s.state === 'souring' && s.turns >= 12) s.state = 'cured';
  render();
}

function advanceCrock(id) {
  const s = crocks.find(x => x.id === id);
  if (!s) return;
  const order = ['fresh', 'salting', 'souring', 'cured'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeCrock(id) {
  crocks = crocks.filter(s => s.id !== id);
  render();
}

function resetCrocks() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  crocks = SEED_CROCKS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = crocks.length + 1;
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
    project.title = 'Click to rename the cellar';
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
    addCrock({ level, turns, name, state });
    $('#add-name').value = '';
    $('#add-turns').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetCrocks();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Put down. We will write once, when the first crock has soured a season in the cool dark and is ready to take down. You cannot hurry a cure.';
  });
});
