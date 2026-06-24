// Whetstone — keeping the few tools you use keen
// A small page for one maker's rack: the few edges kept sharp by small
// frequent strokes on the stone, instead of hoarded and left to rust.

const LEVELS = {
  blunt:    { label: 'Blunt',    short: 'Blt' },
  ground:   { label: 'Ground',   short: 'Grd' },
  honed:    { label: 'Honed',    short: 'Hnd' },
  stropped: { label: 'Stropped', short: 'Str' },
};

const STATES = {
  dull:    { label: 'Dull',    order: 0 },
  setting: { label: 'Setting', order: 1 },
  keening: { label: 'Keening', order: 2 },
  cutting: { label: 'Cutting', order: 3 },
};

// The seeded rack — twelve edges across one fictional maker's rack in
// the middle of June 2026. turns is how many times the blade has been
// taken to the stone and given a stroke; for one let to rust, how many
// strokes it had held before it was neglected.
const SEED_BLADES = [
  { name: 'The chef\'s knife honed every morning before service since 2011',          level: 'stropped', state: 'cutting', turns: 188 },
  { name: 'The second language kept up ten minutes a day for a decade',               level: 'stropped', state: 'cutting', turns: 142 },
  { name: 'The new paring knife bought last week, still in its box',                   level: 'blunt',    state: 'dull',    turns: 0   },
  { name: 'The plane iron reset on the stone and coming good this month',             level: 'honed',    state: 'keening', turns: 9   },
  { name: 'The bench chisel honed before every mortise for forty years',             level: 'stropped', state: 'cutting', turns: 96  },
  { name: 'The half-learned guitar gone to rust in its case under the bed',          level: 'blunt',    state: 'dull',    turns: 3   },
  { name: 'The mental arithmetic kept keen by skipping the calculator',              level: 'honed',    state: 'keening', turns: 7   },
  { name: 'The carving gouge reground after the seasoned oak turned its edge',       level: 'ground',   state: 'setting', turns: 4   },
  { name: 'The sketchbook hand, a few lines drawn most mornings',                    level: 'ground',   state: 'setting', turns: 5   },
  { name: 'The framework bookmarked to learn Monday, never opened',                  level: 'blunt',    state: 'dull',    turns: 0   },
  { name: 'The straight razor stropped daily and kept to a hair\'s edge',            level: 'stropped', state: 'cutting', turns: 124 },
  { name: 'The axe ground bright last spring and dull again by autumn',              level: 'blunt',    state: 'dull',    turns: 2   },
];

let blades = SEED_BLADES.map((s, i) => ({ ...s, id: i + 1 }));
let nextId = (blades.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleBlades() {
  if (filter === 'all') return blades;
  return blades.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { dull: 0, setting: 0, keening: 0, cutting: 0 };
  blades.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${blades.length}</strong> edges</span>
    <span class="tot"><strong>${counts.setting + counts.keening}</strong> on the stone</span>
    <span class="tot"><strong>${counts.cutting}</strong> cutting</span>
    <span class="tot"><strong>${counts.dull}</strong> dull</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...blades.map(s => s.turns));
  visibleBlades().forEach(s => {
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
  const ul = $('#blades-list');
  ul.innerHTML = '';
  const shown = visibleBlades().slice().sort((a, b) => {
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
        <button class="leg-btn" data-act="turn"    title="Take it to the stone (+1 stroke)">+1s</button>
        <button class="leg-btn" data-act="advance" title="Advance the condition">→</button>
        <button class="leg-btn" data-act="off"     title="Let it rust — out of the rack">rust</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'turn')    turnBlade(s.id);
        if (act === 'advance') advanceBlade(s.id);
        if (act === 'off')     removeBlade(s.id);
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

function turnsLabel(t) {
  if (t === 0) return 'never honed';
  if (t === 1) return '1 stroke';
  if (t < 100) return `${t} strokes`;
  return `${t} strokes, kept razor`;
}

// ---------- Actions ----------

function addBlade({ level, turns, name, state }) {
  blades.push({ id: nextId++, level, turns, name, state });
  render();
}

function turnBlade(id) {
  const s = blades.find(x => x.id === id);
  if (!s) return;
  s.turns += 1;
  // an edge keens slow as the strokes accrue on the stone
  if (s.state === 'dull'    && s.turns >= 1)  s.state = 'setting';
  if (s.state === 'setting' && s.turns >= 5)  s.state = 'keening';
  if (s.state === 'keening' && s.turns >= 12) s.state = 'cutting';
  render();
}

function advanceBlade(id) {
  const s = blades.find(x => x.id === id);
  if (!s) return;
  const order = ['dull', 'setting', 'keening', 'cutting'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeBlade(id) {
  blades = blades.filter(s => s.id !== id);
  render();
}

function resetBlades() {
  blades = SEED_BLADES.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = blades.length + 1;
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
    const turns = Math.max(0, parseInt($('#add-turns').value, 10) || 0);
    const name  = $('#add-name').value.trim();
    const state = $('#add-state').value;
    if (!name) return;
    addBlade({ level, turns, name, state });
    $('#add-name').value = '';
    $('#add-turns').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetBlades();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'On the rack. We will write once, when the first edge has been kept keen a season by a stroke a day and holds true. You cannot stockpile sharpness; you can only keep it.';
  });
});
