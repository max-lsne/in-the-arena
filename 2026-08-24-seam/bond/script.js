// Bond — the join in a wall, offset not stacked.
// A bricklayer's day, course by course, at Coalpit Row.

const LEVELS = {
  stack:     { label: 'Stack',     short: 'Stk' },
  stretcher: { label: 'Stretcher', short: 'Str' },
  english:   { label: 'English',   short: 'Eng' },
  flemish:   { label: 'Flemish',   short: 'Flm' },
};

const STATES = {
  green:     { label: 'Green',     order: 0 },
  set:       { label: 'Set',       order: 1 },
  pointed:   { label: 'Pointed',   order: 2 },
  weathered: { label: 'Weathered', order: 3 },
};

// The seeded wall — twelve stretches on a fictional site at Coalpit Row
// in late August 2026. `winters` is how many winters the stretch has
// weathered; for a stacked panel a crack has found, how many it stood
// before it split.
const SEED_ITEMS = [
  { name: 'The old canal lock wall in Staffordshire blue, thirty winters and never moved',       level: 'flemish',   state: 'weathered', winters: 30 },
  { name: 'The garden panel run up stack-bonded to save an hour, a crack down it already',        level: 'stack',     state: 'green',     winters: 0  },
  { name: 'The founder\'s three mid clients laid across two people instead of one whale',          level: 'flemish',   state: 'pointed',   winters: 2  },
  { name: 'The launch stacked on one hire on one contract on one client, joints all aligned',     level: 'stack',     state: 'green',     winters: 1  },
  { name: 'The on-call paired and the runbook written so two can carry the one service',          level: 'english',   state: 'pointed',   winters: 3  },
  { name: 'The revenue crossing two quarters instead of resting on one good December',            level: 'stretcher', state: 'set',       winters: 1  },
  { name: 'The smallholding lapping sheep over hay over the campsite over the winter logs',       level: 'flemish',   state: 'weathered', winters: 18 },
  { name: 'The pier the bricklayer\'s father laid, blue headers threaded through, still true',     level: 'flemish',   state: 'weathered', winters: 41 },
  { name: 'The new dependency laid green this week, mortar still wet and unbonded',                level: 'stretcher', state: 'green',     winters: 0  },
  { name: 'The English-bonded footing under the whole plan, headers tying both skins',            level: 'english',   state: 'set',       winters: 1  },
  { name: 'The single point of failure raked out at last and re-laid across two engineers',       level: 'english',   state: 'set',       winters: 0  },
  { name: 'The tidy org chart the board loved, one column of joints running top to bottom',       level: 'stack',     state: 'green',     winters: 0  },
];

const DEFAULT_PROJECT = 'Coalpit Row · August 2026 · twelve courses';

let items = SEED_ITEMS.map((s, i) => ({ ...s, id: i + 1 }));
let nextId = items.length + 1;
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
  const counts = { green: 0, set: 0, pointed: 0, weathered: 0 };
  items.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${items.length}</strong> courses</span>
    <span class="tot"><strong>${counts.set + counts.pointed}</strong> setting up</span>
    <span class="tot"><strong>${counts.weathered}</strong> weathered</span>
    <span class="tot"><strong>${counts.green}</strong> still green</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...items.map(s => s.winters));
  visibleItems().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.winters / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${wintersLabel(s.winters)}`;
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
        <span class="leg-passes">${wintersLabel(s.winters)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="stand"   title="Weather another winter (+1 winter)">+1w</button>
        <button class="leg-btn" data-act="advance" title="Point it up (advance the condition)">point</button>
        <button class="leg-btn" data-act="cut"     title="Rake the joints back to green">rake</button>
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
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function wintersLabel(n) {
  if (n === 0) return 'just laid';
  if (n === 1) return '1 winter';
  if (n < 100) return `${n} winters`;
  return `${n} winters stood`;
}

function sortedShown() {
  return visibleItems().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.winters - a.winters;
  });
}

// ---------- Actions ----------

function addItem({ level, winters, name, state }) {
  items.push({ id: nextId++, level, winters, name, state });
  render();
}

function standItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.winters += 1;
  // mortar cures and the wall proves itself as it weathers more winters
  if (s.state === 'green'   && s.winters >= 1) s.state = 'set';
  if (s.state === 'set'     && s.winters >= 3) s.state = 'pointed';
  if (s.state === 'pointed' && s.winters >= 6) s.state = 'weathered';
  render();
}

function advanceItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  const order = ['green', 'set', 'pointed', 'weathered'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function cutItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.state = 'green';
  render();
}

function resetItems() {
  items = SEED_ITEMS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = items.length + 1;
  filter = 'all';
  focused = null;
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
    const winters = Math.max(0, parseInt($('#add-metric').value, 10) || 0);
    const name  = $('#add-name').value.trim();
    const state = $('#add-state').value;
    if (!name) return;
    addItem({ level, winters, name, state });
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
    foot.textContent = 'Line taken. We will write once, when the first bonded course has weathered a winter and held where the stack came down. Bonds prove slow.';
  });
});
