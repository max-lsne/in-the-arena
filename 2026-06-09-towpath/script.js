// Towpath — the slow rope as practice
// A small page for the slow steady haul.

const BOATS = {
  skiff:      { label: 'Skiff',      short: 'Skf' },
  wherry:     { label: 'Wherry',     short: 'Whr' },
  narrowboat: { label: 'Narrowboat', short: 'Nrw' },
  barge:      { label: 'Barge',      short: 'Brg' },
};

const STATES = {
  cast:   { label: 'Cast off',    order: 0 },
  tow:    { label: 'In tow',      order: 1 },
  steady: { label: 'Steady haul', order: 2 },
  fast:   { label: 'Made fast',   order: 3 },
};

// The seeded haul — twelve loads kept by no one in particular along
// a slow turn of the spring of 2026. Leagues is how long the load has
// been under tow (or, for made-fast, how long the haul took before
// being tied up).
const SEED_LOADS = [
  { name: 'A translation of the long Russian novel, chapter by chapter', boat: 'narrowboat', state: 'steady', leagues: 84  },
  { name: 'The garden rebuilt over five seasons',                        boat: 'barge',      state: 'tow',    leagues: 42  },
  { name: 'A letter to an old friend, a paragraph a week',               boat: 'skiff',      state: 'fast',   leagues: 18  },
  { name: 'The Bach suites, learned bar by bar',                         boat: 'wherry',     state: 'steady', leagues: 56  },
  { name: 'The workshop swept and squared after lunch',                  boat: 'skiff',      state: 'cast',   leagues: 2   },
  { name: 'A doctoral thesis, the third chapter',                        boat: 'barge',      state: 'tow',    leagues: 28  },
  { name: 'The slow restoration of the old wireless set',                boat: 'wherry',     state: 'steady', leagues: 38  },
  { name: 'A single deep breath at the start of each set',               boat: 'skiff',      state: 'fast',   leagues: 220 },
  { name: 'The pond cleared of the year\'s leaves',                      boat: 'skiff',      state: 'cast',   leagues: 1   },
  { name: 'The long essay, paragraph by paragraph',                      boat: 'narrowboat', state: 'tow',    leagues: 14  },
  { name: 'The marathon prepared for in single-mile additions',          boat: 'narrowboat', state: 'steady', leagues: 32  },
  { name: 'The novel begun in 2014, now on its second draft',            boat: 'barge',      state: 'fast',   leagues: 312 },
];

const DEFAULT_PROJECT = 'A small haul · spring 2026 · the slow rope';

let loads = SEED_LOADS.map((s, i) => ({ ...s, id: i + 1 }));
let nextId = loads.length + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleLoads() {
  if (filter === 'all') return loads;
  return loads.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { cast: 0, tow: 0, steady: 0, fast: 0 };
  loads.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${loads.length}</strong> loads</span>
    <span class="tot"><strong>${counts.steady}</strong> steady</span>
    <span class="tot"><strong>${counts.tow + counts.cast}</strong> under way</span>
    <span class="tot"><strong>${counts.fast}</strong> made fast</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(12, ...loads.map(s => s.leagues));
  visibleLoads().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar boat-${s.boat}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.leagues / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.leagues} leagues under tow`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#loads-list');
  ul.innerHTML = '';
  const shown = visibleLoads().slice().sort((a, b) => {
    // by state ascending (cast off first), then by leagues descending
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.leagues - a.leagues;
  });
  shown.forEach(s => {
    const li = document.createElement('li');
    li.className = `leg boat-${s.boat}`;
    if (focused === s.id) li.classList.add('is-focused');
    li.dataset.id = s.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(s.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${s.state}">${STATES[s.state].label}</span>
        <span class="leg-leagues">${leaguesLabel(s.leagues)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="walk" title="Walk a league further">+1l</button>
        <button class="leg-btn" data-act="advance" title="Advance the state">→</button>
        <button class="leg-btn" data-act="cast-off" title="Tie up at the wharf (remove)">cast off</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'walk')     walkLeague(s.id);
        if (act === 'advance')  advanceLoad(s.id);
        if (act === 'cast-off') removeLoad(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function leaguesLabel(l) {
  if (l === 0)  return 'just cast off';
  if (l === 1)  return '1 league';
  if (l < 24)   return `${l} leagues`;
  const m = Math.floor(l / 4.345);
  if (m < 12)   return `${m}m hauled`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (r === 0)  return `${y}y hauled`;
  return `${y}y ${r}m hauled`;
}

// ---------- Actions ----------

function addLoad({ boat, leagues, name, state }) {
  loads.push({ id: nextId++, boat, leagues, name, state });
  render();
}

function walkLeague(id) {
  const s = loads.find(x => x.id === id);
  if (!s) return;
  s.leagues += 1;
  // gentle auto-advance once the rope has been taut a while
  if (s.state === 'cast' && s.leagues >= 1) s.state = 'tow';
  if (s.state === 'tow'  && s.leagues >= 6) s.state = 'steady';
  render();
}

function advanceLoad(id) {
  const s = loads.find(x => x.id === id);
  if (!s) return;
  const order = ['cast', 'tow', 'steady', 'fast'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeLoad(id) {
  loads = loads.filter(s => s.id !== id);
  render();
}

function resetLoads() {
  loads = SEED_LOADS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = loads.length + 1;
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
    const boat    = $('#add-boat').value;
    const leagues = Math.max(0, parseInt($('#add-leagues').value, 10) || 0);
    const name    = $('#add-name').value.trim();
    const state   = $('#add-state').value;
    if (!name) return;
    addLoad({ boat, leagues, name, state });
    $('#add-name').value = '';
    $('#add-leagues').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetLoads();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Tied on. We will write once, when the first ropes are laid. Keep the line taut.';
  });
});
