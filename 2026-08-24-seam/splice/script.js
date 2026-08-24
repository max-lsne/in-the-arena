// Splice — the join in a rope, woven not tied.
// A rigger's afternoon on the bench at Bircham Quay.

const LEVELS = {
  knot:    { label: 'Knot',    short: 'Knt' },
  seizing: { label: 'Seizing', short: 'Szg' },
  short:   { label: 'Short',   short: 'Sht' },
  eye:     { label: 'Eye',     short: 'Eye' },
};

const STATES = {
  slack:  { label: 'Slack',  order: 0 },
  tucked: { label: 'Tucked', order: 1 },
  set:    { label: 'Set',    order: 2 },
  fair:   { label: 'Fair',   order: 3 },
};

// The seeded bench — twelve joins on a fictional afternoon in the
// rigging loft at Bircham Quay in late August 2026. `seasons` is how
// many winters the join has stood under load; for a join that spilled,
// how many it held before it let go.
const SEED_ITEMS = [
  { name: 'The topsail halyard eye served and rolled fair, eleven seasons on the same block', level: 'eye',     state: 'fair',   seasons: 11 },
  { name: 'The bowline tied in a hurry on the towline when the squall came through',          level: 'knot',    state: 'slack',  seasons: 0  },
  { name: 'The founder sitting the new lead through six weeks of the hard, ruleless calls',   level: 'eye',     state: 'set',    seasons: 1  },
  { name: 'The mooring strop unlaid to splice again after it spilled under a snatch load',    level: 'short',   state: 'slack',  seasons: 0  },
  { name: 'The night nurse walking the bay bed by bed, the worry told with the numbers',      level: 'short',   state: 'set',    seasons: 3  },
  { name: 'The account handed over as a forwarded folder and a wave on the Friday',           level: 'knot',    state: 'slack',  seasons: 1  },
  { name: 'The maintainer pairing a month to tuck the reasons back through the two who stay', level: 'short',   state: 'tucked', seasons: 0  },
  { name: 'The old anchor rode spliced by the rigger\'s father, forty seasons and holding',   level: 'eye',     state: 'fair',   seasons: 40 },
  { name: 'The seizing put on the two running jobs while the overlap week is still going',    level: 'seizing', state: 'tucked', seasons: 1  },
  { name: 'The apprentice\'s first short splice, thick at the join but genuinely woven',       level: 'short',   state: 'tucked', seasons: 0  },
  { name: 'The customer relationship carried across by name, never once by ticket number',    level: 'eye',     state: 'set',    seasons: 4  },
  { name: 'The clean Friday exit the board wanted, tied off and walked away from',            level: 'knot',    state: 'slack',  seasons: 0  },
];

const DEFAULT_PROJECT = 'Bircham Quay · August 2026 · twelve on the bench';

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
  const counts = { slack: 0, tucked: 0, set: 0, fair: 0 };
  items.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${items.length}</strong> on the bench</span>
    <span class="tot"><strong>${counts.tucked + counts.set}</strong> being woven</span>
    <span class="tot"><strong>${counts.fair}</strong> rolled fair</span>
    <span class="tot"><strong>${counts.slack}</strong> still slack</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...items.map(s => s.seasons));
  visibleItems().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.seasons / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${seasonsLabel(s.seasons)}`;
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
        <span class="leg-passes">${seasonsLabel(s.seasons)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="stand"   title="Stand another season under load (+1 season)">+1s</button>
        <button class="leg-btn" data-act="advance" title="Take another tuck (advance the condition)">tuck</button>
        <button class="leg-btn" data-act="cut"     title="Cut the join back — unlay it to slack">cut</button>
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

function seasonsLabel(n) {
  if (n === 0) return 'just tied';
  if (n === 1) return '1 season';
  if (n < 100) return `${n} seasons`;
  return `${n} seasons held`;
}

function sortedShown() {
  return visibleItems().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.seasons - a.seasons;
  });
}

// ---------- Actions ----------

function addItem({ level, seasons, name, state }) {
  items.push({ id: nextId++, level, seasons, name, state });
  render();
}

function standItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.seasons += 1;
  // a join beds down as it stands more seasons under load
  if (s.state === 'slack'  && s.seasons >= 1) s.state = 'tucked';
  if (s.state === 'tucked' && s.seasons >= 3) s.state = 'set';
  if (s.state === 'set'    && s.seasons >= 6) s.state = 'fair';
  render();
}

function advanceItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  const order = ['slack', 'tucked', 'set', 'fair'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function cutItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.state = 'slack';
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
    const seasons = Math.max(0, parseInt($('#add-metric').value, 10) || 0);
    const name  = $('#add-name').value.trim();
    const state = $('#add-state').value;
    if (!name) return;
    addItem({ level, seasons, name, state });
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
    foot.textContent = 'Line taken. We will write once, when the first splice has stood a season under load and held. You cannot hurry a splice.';
  });
});
