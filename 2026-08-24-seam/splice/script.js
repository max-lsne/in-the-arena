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
const STORAGE_KEY = 'seam.splice.items.v1';
const PROJECT_KEY = 'seam.splice.bench.v1';

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
  saveItems();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Announce the latest change to screen readers via the aria-live region.
function announce(msg) {
  const el = $('#bench-status');
  if (el) el.textContent = msg;
}

function shortName(name) {
  const s = String(name).trim();
  return s.length > 52 ? s.slice(0, 51).trimEnd() + '…' : s;
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
  announce(`Tucked in "${shortName(name)}" as a ${LEVELS[level].label.toLowerCase()}, ${STATES[state].label.toLowerCase()}. ${items.length} on the bench.`);
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
  announce(`"${shortName(s.name)}" stood another season — ${seasonsLabel(s.seasons)}, now ${STATES[s.state].label.toLowerCase()}.`);
}

function advanceItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  const order = ['slack', 'tucked', 'set', 'fair'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
  announce(`"${shortName(s.name)}" tucked on to ${STATES[s.state].label.toLowerCase()}.`);
}

function cutItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.state = 'slack';
  render();
  announce(`"${shortName(s.name)}" cut back to slack.`);
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
  announce('Bench reset to the twelve joins the rigger started the afternoon with.');
}

// ---------- Wire up ----------

document.addEventListener('DOMContentLoaded', () => {
  const project = $('#chart-project');
  if (project) {
    project.textContent = loadProject();
    project.setAttribute('contenteditable', 'true');
    project.setAttribute('spellcheck', 'false');
    project.title = 'Click to rename the bench';
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
      const label = filter === 'all' ? 'all joins' : STATES[filter].label.toLowerCase();
      announce(`Showing ${label} — ${visibleItems().length} of ${items.length} on the bench.`);
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

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function focusedIndexInShown(shown) {
  if (focused == null) return -1;
  return shown.findIndex(s => s.id === focused);
}

function moveFocus(delta) {
  const shown = sortedShown();
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
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function setFilter(f) {
  filter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  render();
  const label = f === 'all' ? 'all joins' : STATES[f].label.toLowerCase();
  announce(`Showing ${label} — ${visibleItems().length} of ${items.length} on the bench.`);
}

function nudgeSeasons(delta) {
  if (focused == null) return;
  const s = items.find(x => x.id === focused);
  if (!s) return;
  s.seasons = Math.max(0, s.seasons + delta);
  render();
  announce(`"${shortName(s.name)}" — ${seasonsLabel(s.seasons)}.`);
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') { if (focused != null) { e.preventDefault(); advanceItem(focused); } return; }
    if (k === 'Delete' || k === 'Backspace') { if (focused != null) { e.preventDefault(); cutItem(focused); } return; }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');    return; }
    if (k === '1') { e.preventDefault(); setFilter('slack');  return; }
    if (k === '2') { e.preventDefault(); setFilter('tucked'); return; }
    if (k === '3') { e.preventDefault(); setFilter('set');    return; }
    if (k === '4') { e.preventDefault(); setFilter('fair');   return; }
    if (k === '[') { e.preventDefault(); nudgeSeasons(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeSeasons(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetItems(); return; }
  });
}
