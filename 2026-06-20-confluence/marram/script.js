// Marram — binding what drifts, one tuft at a time
// A small page for one stretch of dune coast on the Gwendra Warren.

const LEVELS = {
  seed:  { label: 'Seed',  short: 'Sd'  },
  tuft:  { label: 'Tuft',  short: 'Tft' },
  sward: { label: 'Sward', short: 'Swd' },
  dune:  { label: 'Dune',  short: 'Dun' },
};

const STATES = {
  loose:    { label: 'Loose',    order: 0 },
  rooting:  { label: 'Rooting',  order: 1 },
  knitting: { label: 'Knitting', order: 2 },
  bound:    { label: 'Bound',    order: 3 },
};

// The seeded dune — twelve plantings across one fictional stretch of
// links and foredune on the Gwendra Warren coast in the middle of June
// 2026. Gales is how many winter gales the planting has stood against
// the wind; for a planting lost to a blowout, how many it held before
// the storm took it.
const SEED_PLANTINGS = [
  { name: 'The warden\'s grandfather\'s foredune above the town, planted tuft by tuft since 1958', level: 'dune',  state: 'bound',    gales: 67 },
  { name: 'The single seed pushed into the bare slip-face this March, nothing showing yet',        level: 'seed',  state: 'loose',    gales: 0  },
  { name: 'The dawn page held every morning since a wet January four winters back',                level: 'sward', state: 'bound',    gales: 4  },
  { name: 'The ten quiet minutes before the house wakes, eighteen months sober and rooting',       level: 'tuft',  state: 'rooting',  gales: 1  },
  { name: 'The marram knitting across the lee of the chestnut paling by the third groyne',         level: 'sward', state: 'knitting', gales: 6  },
  { name: 'The blowout where a good sward was lost in one March storm, four years to heal',         level: 'seed',  state: 'loose',    gales: 0  },
  { name: 'The Sunday call home, kept since the spring, still on its own and unsure',              level: 'tuft',  state: 'rooting',  gales: 1  },
  { name: 'The whole coast\'s dune wall planted across four generations to hold back the tide',     level: 'dune',  state: 'bound',    gales: 92 },
  { name: 'The cold sea-swim every dawn, taken eleven winters now and holding its shape',          level: 'sward', state: 'bound',    gales: 11 },
  { name: 'The handful of tufts planted this November in the shelter of the banked drift',         level: 'tuft',  state: 'rooting',  gales: 0  },
  { name: 'The evening walk that knits to the early night and the morning page',                   level: 'sward', state: 'knitting', gales: 3  },
  { name: 'The resolution said out loud once on New Year and never planted low enough',            level: 'seed',  state: 'loose',    gales: 1  },
];

let plantings = SEED_PLANTINGS.map((s, i) => ({ ...s, id: i + 1 }));
let nextId = plantings.length + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visiblePlantings() {
  if (filter === 'all') return plantings;
  return plantings.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { loose: 0, rooting: 0, knitting: 0, bound: 0 };
  plantings.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${plantings.length}</strong> plantings</span>
    <span class="tot"><strong>${counts.rooting + counts.knitting}</strong> taking hold</span>
    <span class="tot"><strong>${counts.bound}</strong> bound</span>
    <span class="tot"><strong>${counts.loose}</strong> loose</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...plantings.map(s => s.gales));
  visiblePlantings().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.gales / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${galesLabel(s.gales)}`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#plantings-list');
  ul.innerHTML = '';
  const shown = visiblePlantings().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.gales - a.gales;
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
        <span class="leg-passes">${galesLabel(s.gales)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="stand"   title="Stand another winter gale (+1 gale)">+1g</button>
        <button class="leg-btn" data-act="advance" title="Advance the condition">→</button>
        <button class="leg-btn" data-act="blow"    title="Lose the planting — blown out, taken by the wind">blow</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'stand')   standPlanting(s.id);
        if (act === 'advance') advancePlanting(s.id);
        if (act === 'blow')    removePlanting(s.id);
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

function galesLabel(g) {
  if (g === 0) return 'just planted';
  if (g === 1) return '1 gale';
  if (g < 100) return `${g} gales`;
  return `${g} gales held`;
}

// ---------- Actions ----------

function addPlanting({ level, gales, name, state }) {
  plantings.push({ id: nextId++, level, gales, name, state });
  render();
}

function standPlanting(id) {
  const s = plantings.find(x => x.id === id);
  if (!s) return;
  s.gales += 1;
  // a planting takes hold as it stands more winter gales
  if (s.state === 'loose'    && s.gales >= 1) s.state = 'rooting';
  if (s.state === 'rooting'  && s.gales >= 3) s.state = 'knitting';
  if (s.state === 'knitting' && s.gales >= 6) s.state = 'bound';
  render();
}

function advancePlanting(id) {
  const s = plantings.find(x => x.id === id);
  if (!s) return;
  const order = ['loose', 'rooting', 'knitting', 'bound'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removePlanting(id) {
  plantings = plantings.filter(s => s.id !== id);
  render();
}

function resetPlantings() {
  plantings = SEED_PLANTINGS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = plantings.length + 1;
  filter = 'all';
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
    const level = $('#add-level').value;
    const gales = Math.max(0, parseInt($('#add-gales').value, 10) || 0);
    const name  = $('#add-name').value.trim();
    const state = $('#add-state').value;
    if (!name) return;
    addPlanting({ level, gales, name, state });
    $('#add-name').value = '';
    $('#add-gales').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetPlantings();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Tuft planted. We will write once, when the first one has stood a winter gale and its runners have taken hold. You cannot hurry it.';
  });
});
