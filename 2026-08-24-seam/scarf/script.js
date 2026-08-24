// Scarf — the join in a beam, lapped not butted.
// A shipwright's day on the trestles at Ferrymead.

const LEVELS = {
  butt:   { label: 'Butt',   short: 'But' },
  lapped: { label: 'Lapped', short: 'Lap' },
  keyed:  { label: 'Keyed',  short: 'Key' },
  pegged: { label: 'Pegged', short: 'Peg' },
};

const STATES = {
  dry:     { label: 'Dry',     order: 0 },
  glued:   { label: 'Glued',   order: 1 },
  cramped: { label: 'Cramped', order: 2 },
  faired:  { label: 'Faired',  order: 3 },
};

// The seeded yard — twelve beams on the trestles on a fictional day in
// the boatyard at Ferrymead in late August 2026. `years` is how many
// years the joint has carried its load; for a butt that broke, how many
// it carried before it snapped at the seam.
const SEED_ITEMS = [
  { name: 'The keel scarf tabled, keyed and pegged, thirty years at sea and never worked loose', level: 'pegged', state: 'faired',  years: 30 },
  { name: 'The two ends butted and glued on the signing date to save six wasted months',          level: 'butt',   state: 'dry',     years: 0  },
  { name: 'The head staying two terms on the hard governance while the new head runs the day',    level: 'pegged', state: 'cramped', years: 1  },
  { name: 'The stem-piece butt that broke clean at the seam, cut back now to a proper scarf',     level: 'lapped', state: 'dry',     years: 0  },
  { name: 'The surgeon lapping a season of theatre, registrar cutting while he holds the hook',   level: 'keyed',  state: 'cramped', years: 3  },
  { name: 'The clean Friday-to-Monday handover the trustees wanted, no overlap cut at all',       level: 'butt',   state: 'dry',     years: 1  },
  { name: 'The two firms merged over six months with both names answering every call',            level: 'keyed',  state: 'glued',   years: 0  },
  { name: 'The gunwale scarf the shipwright\'s master cut, eight times the depth, forty years on', level: 'pegged', state: 'faired',  years: 42 },
  { name: 'The registrar starting a month before the last consultant\'s notice is up',             level: 'lapped', state: 'glued',   years: 1  },
  { name: 'The apprentice\'s first tabled scarf, a little proud of the line but genuinely hooked', level: 'keyed',  state: 'glued',   years: 0  },
  { name: 'The mentor still answering the hard calls while the protégé already signs them off',   level: 'pegged', state: 'cramped', years: 4  },
  { name: 'The founder\'s last day set as the new lead\'s first, the load resting on one seam',     level: 'butt',   state: 'dry',     years: 0  },
];

const DEFAULT_PROJECT = 'Ferrymead · August 2026 · twelve on the trestles';
const STORAGE_KEY = 'seam.scarf.items.v1';
const PROJECT_KEY = 'seam.scarf.yard.v1';

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_ITEMS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_ITEMS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_ITEMS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveItems() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let items = loadItems();
let nextId = (items.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleItems() {
  if (filter === 'all') return items;
  return items.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { dry: 0, glued: 0, cramped: 0, faired: 0 };
  items.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${items.length}</strong> on the trestles</span>
    <span class="tot"><strong>${counts.glued + counts.cramped}</strong> drawing up</span>
    <span class="tot"><strong>${counts.faired}</strong> planed fair</span>
    <span class="tot"><strong>${counts.dry}</strong> still dry</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...items.map(s => s.years));
  visibleItems().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.years / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${yearsLabel(s.years)}`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#items-list');
  ul.innerHTML = '';
  const shown = sortedShown();
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
        <span class="leg-passes">${yearsLabel(s.years)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="stand"   title="Carry another year of load (+1 year)">+1y</button>
        <button class="leg-btn" data-act="advance" title="Draw it up (advance the condition)">draw</button>
        <button class="leg-btn" data-act="cut"     title="Saw the joint back — down to a dry butt">saw</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'stand')   standItem(s.id);
        if (act === 'advance') advanceItem(s.id);
        if (act === 'cut')     cutItem(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveItems();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function yearsLabel(n) {
  if (n === 0) return 'just offered up';
  if (n === 1) return '1 year';
  if (n < 100) return `${n} years`;
  return `${n} years carried`;
}

function sortedShown() {
  return visibleItems().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.years - a.years;
  });
}

// ---------- Actions ----------

function addItem({ level, years, name, state }) {
  items.push({ id: nextId++, level, years, name, state });
  render();
}

function standItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.years += 1;
  // the joint proves and beds down as it carries more years of load
  if (s.state === 'dry'     && s.years >= 1) s.state = 'glued';
  if (s.state === 'glued'   && s.years >= 3) s.state = 'cramped';
  if (s.state === 'cramped' && s.years >= 6) s.state = 'faired';
  render();
}

function advanceItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  const order = ['dry', 'glued', 'cramped', 'faired'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function cutItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.state = 'dry';
  render();
}

function resetItems() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  items = SEED_ITEMS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = items.length + 1;
  filter = 'all';
  focused = null;
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
    project.title = 'Click to rename the yard';
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
    const years = Math.max(0, parseInt($('#add-metric').value, 10) || 0);
    const name  = $('#add-name').value.trim();
    const state = $('#add-state').value;
    if (!name) return;
    addItem({ level, years, name, state });
    $('#add-name').value = '';
    $('#add-metric').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetItems();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Line taken. We will write once, when the first scarf has carried a year and the beam never felt the join. A scarf is cut slow.';
  });
});
