// Withy — the work you grow a year and weave for a lifetime
// A small page for one withy-grower's bed on the Somerset Levels.

const LEVELS = {
  rod:    { label: 'Rod',    short: 'Rod' },
  bolt:   { label: 'Bolt',   short: 'Blt' },
  basket: { label: 'Basket', short: 'Bsk' },
  holt:   { label: 'Holt',   short: 'Hlt' },
};

const STATES = {
  green:    { label: 'Green',    order: 0 },
  soaking:  { label: 'Soaking',  order: 1 },
  weaving:  { label: 'Weaving',  order: 2 },
  seasoned: { label: 'Seasoned', order: 3 },
};

// The seeded withy-bed — twelve rods, bolts, baskets and the holt
// itself across one fictional withy-grower's moor on the Somerset
// Levels in the middle of January 2026. Winters is how many winters
// the withy has been cut or stood; for a lost or cracked withy, how
// many winters it held before the rot took it.
const SEED_WITHIES = [
  { name: 'The grandfather\'s osier holt on the moor, cut every winter since the 1940s', level: 'holt',   state: 'weaving',  winters: 84 },
  { name: 'The basket-maker\'s standing bolt, three weeks in the soak this January',     level: 'bolt',   state: 'soaking',  winters: 6  },
  { name: 'The market creel rewoven to her mother\'s pattern every autumn since 1976',   level: 'basket', state: 'seasoned', winters: 50 },
  { name: 'The young hand\'s first green rod, cut this midwinter',                       level: 'rod',    state: 'green',    winters: 1  },
  { name: 'The hurdle-maker\'s brown-withy holt below the rhyne, eighty winters cut',    level: 'holt',   state: 'weaving',  winters: 80 },
  { name: 'The eel-fisher\'s putcher, rewoven every close season since 1979',            level: 'basket', state: 'seasoned', winters: 47 },
  { name: 'The buff bolt boiling in the copper, the bark just starting to lift',         level: 'bolt',   state: 'weaving',  winters: 5  },
  { name: 'The white withy peeled clean at the brake this March',                        level: 'bolt',   state: 'seasoned', winters: 9  },
  { name: 'The chair-seater\'s bolt, sorted to length and sunk in the pit',              level: 'bolt',   state: 'soaking',  winters: 4  },
  { name: 'The frost-split rod left green too long up in the loft',                      level: 'rod',    state: 'green',    winters: 2  },
  { name: 'The three-generation holt by the pumping station, on the tithe map',          level: 'holt',   state: 'weaving',  winters: 120 },
  { name: 'The cracked creel that went to the bonfire last Candlemas',                   level: 'rod',    state: 'green',    winters: 1  },
];

const STORAGE_KEY = 'withy.withies.v1';
const PROJECT_KEY = 'withy.project.v1';
const DEFAULT_PROJECT = 'A withy-bed on the Levels · winter 2026 · twelve cut';

function loadWithies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_WITHIES.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_WITHIES.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_WITHIES.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveWithies() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(withies)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let withies = loadWithies();
let nextId = (withies.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleWithies() {
  if (filter === 'all') return withies;
  return withies.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { green: 0, soaking: 0, weaving: 0, seasoned: 0 };
  withies.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${withies.length}</strong> withies</span>
    <span class="tot"><strong>${counts.soaking + counts.weaving}</strong> in hand</span>
    <span class="tot"><strong>${counts.seasoned}</strong> seasoned</span>
    <span class="tot"><strong>${counts.green}</strong> green</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...withies.map(s => s.winters));
  visibleWithies().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.winters / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.winters} winters`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#withies-list');
  ul.innerHTML = '';
  const shown = visibleWithies().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.winters - a.winters;
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
        <span class="leg-passes">${wintersLabel(s.winters)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="cut"     title="Cut another winter (+1 winter)">+1w</button>
        <button class="leg-btn" data-act="advance" title="Advance the condition">→</button>
        <button class="leg-btn" data-act="crack"   title="Lose the withy — cracked, gone to the rot">crack</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'cut')     cutWithy(s.id);
        if (act === 'advance') advanceWithy(s.id);
        if (act === 'crack')   removeWithy(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveWithies();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function wintersLabel(w) {
  if (w === 0) return 'green rod';
  if (w === 1) return '1 winter';
  if (w < 100) return `${w} winters`;
  if (w < 200) return `${w}yr in the holt`;
  return `${Math.round(w / 10) * 10}yr in the holt`;
}

// ---------- Actions ----------

function addWithy({ level, winters, name, state }) {
  withies.push({ id: nextId++, level, winters, name, state });
  render();
}

function cutWithy(id) {
  const s = withies.find(x => x.id === id);
  if (!s) return;
  s.winters += 1;
  // a withy comes supple as the winters and the soak accrue
  if (s.state === 'green'   && s.winters >= 2)  s.state = 'soaking';
  if (s.state === 'soaking' && s.winters >= 4)  s.state = 'weaving';
  if (s.state === 'weaving' && s.winters >= 10) s.state = 'seasoned';
  render();
}

function advanceWithy(id) {
  const s = withies.find(x => x.id === id);
  if (!s) return;
  const order = ['green', 'soaking', 'weaving', 'seasoned'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeWithy(id) {
  withies = withies.filter(s => s.id !== id);
  render();
}

function resetWithies() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  withies = SEED_WITHIES.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = withies.length + 1;
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
    project.title = 'Click to rename the withy-bed';
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
    const winters = Math.max(0, parseInt($('#add-winters').value, 10) || 0);
    const name    = $('#add-name').value.trim();
    const state   = $('#add-state').value;
    if (!name) return;
    addWithy({ level, winters, name, state });
    $('#add-name').value = '';
    $('#add-winters').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetWithies();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Bolt sunk. We will write once, when the first rod has taken the soak and bends without a crack in it. You cannot hurry it.';
  });
});
