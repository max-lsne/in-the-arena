// Stillroom — the slow keep as practice
// A small page for the slow preparations of a working life.

const SHELVES = {
  pickling:   { label: 'Pickling',   short: 'Pic' },
  drying:     { label: 'Drying',     short: 'Dry' },
  distilling: { label: 'Distilling', short: 'Dis' },
  curing:     { label: 'Curing',     short: 'Cur' },
};

const STATES = {
  laid:     { label: 'Laid down', order: 0 },
  settling: { label: 'Settling',  order: 1 },
  ready:    { label: 'Ready',     order: 2 },
  long:     { label: 'Long-kept', order: 3 },
};

// The seeded stillroom — twelve jars kept by no one in particular through
// a slow autumn of 2026. Months on shelf is how far back the jar was put up.
const SEED_JARS = [
  { name: 'A Friday close-out, sharp and small',         shelf: 'pickling',   state: 'long',     months: 134 },
  { name: 'A damson gin, laid down last September',      shelf: 'distilling', state: 'settling', months: 9 },
  { name: 'A long Russian novel, a chapter a season',    shelf: 'drying',     state: 'ready',    months: 28 },
  { name: 'The second-book manuscript, sealed for three',shelf: 'curing',     state: 'settling', months: 3 },
  { name: 'A weekly tidy of the workshop bench',         shelf: 'pickling',   state: 'long',     months: 86 },
  { name: 'A year of journals to a single page',         shelf: 'distilling', state: 'long',     months: 264 },
  { name: 'A castile soap on the rack twelve weeks',     shelf: 'curing',     state: 'ready',    months: 4 },
  { name: 'A correspondence with G., a letter a fortnight',shelf: 'drying',   state: 'ready',    months: 18 },
  { name: 'A small batch of rose vinegar, settling',     shelf: 'pickling',   state: 'settling', months: 2 },
  { name: 'A grief given its full season — autumn',      shelf: 'curing',     state: 'long',     months: 36 },
  { name: 'A shelf of source-language reading, slow',    shelf: 'drying',     state: 'long',     months: 132 },
  { name: "A friend's research distilled to one question",shelf: 'distilling',state: 'laid',     months: 0 },
];

const STORAGE_KEY = 'stillroom.jars.v1';

let jars = SEED_JARS.map((j, i) => ({ ...j, id: i + 1 }));
let nextId = jars.length + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleJars() {
  if (filter === 'all') return jars;
  return jars.filter(j => j.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { laid: 0, settling: 0, ready: 0, long: 0 };
  jars.forEach(j => { counts[j.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${jars.length}</strong> jars</span>
    <span class="tot"><strong>${counts.long}</strong> long-kept</span>
    <span class="tot"><strong>${counts.ready}</strong> ready</span>
    <span class="tot"><strong>${counts.settling + counts.laid}</strong> settling</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  // remove old bars
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(12, ...jars.map(j => j.months));
  visibleJars().forEach(j => {
    const bar = document.createElement('div');
    bar.className = `profile-bar shelf-${j.shelf}`;
    if (focused === j.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((j.months / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${j.name} — ${j.months} months on shelf`;
    bar.addEventListener('mouseenter', () => { focused = j.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#jars-list');
  ul.innerHTML = '';
  const shown = visibleJars().slice().sort((a, b) => {
    // by state descending, then by months descending
    const d = STATES[b.state].order - STATES[a.state].order;
    if (d !== 0) return d;
    return b.months - a.months;
  });
  shown.forEach(j => {
    const li = document.createElement('li');
    li.className = `leg shelf-${j.shelf}`;
    if (focused === j.id) li.classList.add('is-focused');
    li.dataset.id = j.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(j.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${j.state}">${STATES[j.state].label}</span>
        <span class="leg-months">${monthsLabel(j.months)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="age" title="Age the jar by a month">+1m</button>
        <button class="leg-btn" data-act="advance" title="Advance the state">→</button>
        <button class="leg-btn" data-act="open" title="Open the jar (remove)">open</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = j.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'age')      ageJar(j.id);
        if (act === 'advance')  advanceJar(j.id);
        if (act === 'open')     removeJar(j.id);
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

function monthsLabel(m) {
  if (m === 0) return 'just put up';
  if (m < 12)  return `${m}m on shelf`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (r === 0) return `${y}y on shelf`;
  return `${y}y ${r}m on shelf`;
}

// ---------- Actions ----------

function addJar({ shelf, months, name, state }) {
  jars.push({ id: nextId++, shelf, months, name, state });
  render();
}

function ageJar(id) {
  const j = jars.find(x => x.id === id);
  if (!j) return;
  j.months += 1;
  // gentle auto-advance with age
  if (j.state === 'laid' && j.months >= 1)  j.state = 'settling';
  if (j.state === 'settling' && j.months >= 6) j.state = 'ready';
  if (j.state === 'ready' && j.months >= 12) j.state = 'long';
  render();
}

function advanceJar(id) {
  const j = jars.find(x => x.id === id);
  if (!j) return;
  const order = ['laid', 'settling', 'ready', 'long'];
  const i = order.indexOf(j.state);
  j.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeJar(id) {
  jars = jars.filter(j => j.id !== id);
  render();
}

function resetJars() {
  jars = SEED_JARS.map((j, i) => ({ ...j, id: i + 1 }));
  nextId = jars.length + 1;
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
    const shelf  = $('#add-shelf').value;
    const months = Math.max(0, parseInt($('#add-months').value, 10) || 0);
    const name   = $('#add-name').value.trim();
    const state  = $('#add-state').value;
    if (!name) return;
    addJar({ shelf, months, name, state });
    $('#add-name').value = '';
    $('#add-months').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetJars();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Sealed. We will write once, when the stillrooms open. Good keeping.';
  });
});
