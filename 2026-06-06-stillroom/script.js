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
const PROJECT_KEY = 'stillroom.project.v1';

function loadJars() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_JARS.map((j, i) => ({ ...j, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_JARS.map((j, i) => ({ ...j, id: i + 1 }));
    }
    return parsed.map((j, i) => ({ ...j, id: j.id || i + 1 }));
  } catch {
    return SEED_JARS.map((j, i) => ({ ...j, id: i + 1 }));
  }
}

function saveJars() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(jars)); } catch {}
}

function loadProject() {
  try {
    return localStorage.getItem(PROJECT_KEY)
      || 'A small upland stillroom · autumn 2026 · the slow keep';
  } catch {
    return 'A small upland stillroom · autumn 2026 · the slow keep';
  }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let jars = loadJars();
let nextId = (jars.reduce((m, j) => Math.max(m, j.id || 0), 0)) + 1;
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
  saveJars();
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
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  jars = SEED_JARS.map((j, i) => ({ ...j, id: i + 1 }));
  nextId = jars.length + 1;
  filter = 'all';
  const project = $('#chart-project');
  if (project) {
    project.textContent = 'A small upland stillroom · autumn 2026 · the slow keep';
  }
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
    project.title = 'Click to rename the stillroom';
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

  wireKeyboard();
});

// ---------- Keyboard ----------

function isTypingInForm() {
  const t = document.activeElement;
  if (!t) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}

function focusedIndexInShown(shown) {
  if (focused == null) return -1;
  return shown.findIndex(j => j.id === focused);
}

function moveFocus(delta) {
  const shown = visibleJars().slice().sort((a, b) => {
    const d = STATES[b.state].order - STATES[a.state].order;
    if (d !== 0) return d;
    return b.months - a.months;
  });
  if (shown.length === 0) { focused = null; render(); return; }
  let i = focusedIndexInShown(shown);
  if (i === -1) {
    focused = delta > 0 ? shown[0].id : shown[shown.length - 1].id;
  } else {
    i = (i + delta + shown.length) % shown.length;
    focused = shown[i].id;
  }
  render();
  const el = document.querySelector(`.leg[data-id="${focused}"]`);
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setFilter(f) {
  filter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  focused = null;
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;

    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }

    if (focused != null) {
      if (k === 'Enter')                       { e.preventDefault(); advanceJar(focused); return; }
      if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); const id = focused; focused = null; removeJar(id); return; }
      if (k === ']')                           { e.preventDefault(); ageJar(focused); return; }
      if (k === '[')                           {
        e.preventDefault();
        const j = jars.find(x => x.id === focused);
        if (j) { j.months = Math.max(0, j.months - 1); render(); }
        return;
      }
    }

    if (k === 'n' || k === 'N') {
      e.preventDefault();
      const name = $('#add-name');
      if (name) { name.focus(); name.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }

    if (k === 'r' || k === 'R') { e.preventDefault(); resetJars(); return; }

    if (k === '0') { e.preventDefault(); setFilter('all'); return; }
    if (k === '1') { e.preventDefault(); setFilter('laid'); return; }
    if (k === '2') { e.preventDefault(); setFilter('settling'); return; }
    if (k === '3') { e.preventDefault(); setFilter('ready'); return; }
    if (k === '4') { e.preventDefault(); setFilter('long'); return; }
  });
}
