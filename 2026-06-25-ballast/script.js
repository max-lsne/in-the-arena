// Ballast — what keeps you upright is the weight no one sees
// A small page for one hull's manifest of ballast and deck-cargo.

const LEVELS = {
  shingle: { label: 'Shingle', short: 'Shg' },
  stone:   { label: 'Stone',   short: 'Stn' },
  iron:    { label: 'Iron',    short: 'Irn' },
  keel:    { label: 'Keel',    short: 'Kel' },
};

const STATES = {
  loose:    { label: 'Loose',    order: 0 },
  stowed:   { label: 'Stowed',   order: 1 },
  lashed:   { label: 'Lashed',   order: 2 },
  righting: { label: 'Righting', order: 3 },
};

// The seeded manifest — twelve entries on one fictional wooden ketch in
// the Western Approaches in the back-end of 2026, the glass falling.
// Gales is how many gales the weight has weathered low in the hull; for
// loose deck-cargo and fresh shingle, how little it has yet seen.
const SEED_MANIFEST = [
  { name: 'The lead run into the keel when she was first laid down',            level: 'keel',    state: 'righting', gales: 12 },
  { name: 'The pig-iron struck down in the bilge that no passenger ever sees',  level: 'iron',    state: 'righting', gales: 9  },
  { name: 'The fresh beach shingle shovelled in loose this morning for trim',   level: 'shingle', state: 'loose',    gales: 0  },
  { name: 'The rubble stone chocked under the cabin sole years ago',            level: 'stone',   state: 'lashed',   gales: 7  },
  { name: 'The drinking-water tanks kept full and low on purpose',             level: 'iron',    state: 'lashed',   gales: 5  },
  { name: 'The new deck cargo lashed high where everyone can admire it',        level: 'shingle', state: 'loose',    gales: 0  },
  { name: 'The sandbags carried low since her very first crossing',             level: 'stone',   state: 'lashed',   gales: 8  },
  { name: 'The ton of lead that has righted her in every gale since launch',    level: 'keel',    state: 'righting', gales: 11 },
  { name: 'The spare anchor chain flaked down in the chain locker',             level: 'stone',   state: 'stowed',   gales: 2  },
  { name: 'The loose dunnage that ran to leeward in the last knockdown',        level: 'shingle', state: 'loose',    gales: 1  },
  { name: 'The water ballast pumped into the double-bottom tanks',              level: 'iron',    state: 'stowed',   gales: 3  },
  { name: 'The ballast a previous owner landed to go faster, and never replaced', level: 'stone', state: 'loose',    gales: 3  },
];

const STORAGE_KEY = 'ballast.manifest.v1';
const PROJECT_KEY = 'ballast.project.v1';
const DEFAULT_PROJECT = 'A ketch in the Western Approaches · back-end 2026 · twelve entries';

function seedManifest() {
  return SEED_MANIFEST.map((w, i) => ({ ...w, id: i + 1 }));
}

function loadManifest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedManifest();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedManifest();
    return parsed.map((w, i) => ({ ...w, id: w.id || i + 1 }));
  } catch {
    return seedManifest();
  }
}

function saveManifest() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(manifest)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let manifest = loadManifest();
let nextId = (manifest.reduce((m, w) => Math.max(m, w.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleManifest() {
  if (filter === 'all') return manifest;
  return manifest.filter(w => w.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { loose: 0, stowed: 0, lashed: 0, righting: 0 };
  manifest.forEach(w => { counts[w.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${manifest.length}</strong> aboard</span>
    <span class="tot"><strong>${counts.lashed + counts.righting}</strong> lashed low</span>
    <span class="tot"><strong>${counts.righting}</strong> righting</span>
    <span class="tot"><strong>${counts.loose}</strong> loose</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...manifest.map(w => w.gales));
  visibleManifest().forEach(w => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${w.level}`;
    if (focused === w.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((w.gales / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${w.name} — ${w.gales} gales weathered`;
    bar.addEventListener('mouseenter', () => { focused = w.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#manifest-list');
  ul.innerHTML = '';
  const shown = visibleManifest().slice().sort((a, b) => {
    const d = STATES[b.state].order - STATES[a.state].order;
    if (d !== 0) return d;
    return b.gales - a.gales;
  });
  shown.forEach(w => {
    const li = document.createElement('li');
    li.className = `leg level-${w.level}`;
    if (focused === w.id) li.classList.add('is-focused');
    li.dataset.id = w.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(w.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${w.state}">${STATES[w.state].label}</span>
        <span class="leg-passes">${galesLabel(w.gales)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="weather" title="Weather another gale low in the hull (+1 gale)">+1g</button>
        <button class="leg-btn" data-act="advance" title="Stow it lower — settle how it is secured">&darr;</button>
        <button class="leg-btn" data-act="heave"   title="Heave it overboard — land the weight, gone">heave</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = w.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'weather') weatherWeight(w.id);
        if (act === 'advance') advanceWeight(w.id);
        if (act === 'heave')   removeWeight(w.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveManifest();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function galesLabel(n) {
  if (n === 0) return 'shipped this morning';
  if (n === 1) return '1 gale';
  if (n < 10) return `${n} gales`;
  return `${n} gales · part of the boat`;
}

// ---------- Actions ----------

function addWeight({ level, gales, name, state }) {
  manifest.push({ id: nextId++, level, gales, name, state });
  render();
}

function weatherWeight(id) {
  const w = manifest.find(x => x.id === id);
  if (!w) return;
  w.gales += 1;
  // weight settles lower in the hull as the gales mount
  if (w.state === 'loose'  && w.gales >= 1) w.state = 'stowed';
  if (w.state === 'stowed' && w.gales >= 3) w.state = 'lashed';
  if (w.state === 'lashed' && w.gales >= 8) w.state = 'righting';
  render();
}

function advanceWeight(id) {
  const w = manifest.find(x => x.id === id);
  if (!w) return;
  const order = ['loose', 'stowed', 'lashed', 'righting'];
  const i = order.indexOf(w.state);
  w.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeWeight(id) {
  manifest = manifest.filter(w => w.id !== id);
  render();
}

function resetManifest() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  manifest = seedManifest();
  nextId = manifest.length + 1;
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
    project.title = 'Click to rename the manifest';
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
    const gales = Math.max(0, parseInt($('#add-gales').value, 10) || 0);
    const name  = $('#add-name').value.trim();
    const state = $('#add-state').value;
    if (!name) return;
    addWeight({ level, gales, name, state });
    $('#add-name').value = '';
    $('#add-gales').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetManifest();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Stowed low. We will write once, when the weight is down in the dark, lashed in fair weather, and the boat rights herself in the worst of it.';
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

function sortedShown() {
  return visibleManifest().slice().sort((a, b) => {
    const d = STATES[b.state].order - STATES[a.state].order;
    if (d !== 0) return d;
    return b.gales - a.gales;
  });
}

function focusedIndexInShown(shown) {
  if (focused == null) return -1;
  return shown.findIndex(w => w.id === focused);
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
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setFilter(f) {
  filter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  render();
}

function nudgeGales(delta) {
  if (focused == null) return;
  const w = manifest.find(x => x.id === focused);
  if (!w) return;
  w.gales = Math.max(0, w.gales + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceWeight(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeWeight(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');      return; }
    if (k === '1') { e.preventDefault(); setFilter('loose');    return; }
    if (k === '2') { e.preventDefault(); setFilter('stowed');   return; }
    if (k === '3') { e.preventDefault(); setFilter('lashed');   return; }
    if (k === '4') { e.preventDefault(); setFilter('righting'); return; }
    if (k === '[') { e.preventDefault(); nudgeGales(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeGales(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetManifest(); return; }
  });
}
