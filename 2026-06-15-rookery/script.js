// Rookery — the colony that comes back to the same elms
// A small page for the parliament of returning birds.

const PERCHES = {
  twig:    { label: 'Twig',    short: 'Twg' },
  cup:     { label: 'Cup',     short: 'Cup' },
  bough:   { label: 'Bough',   short: 'Bgh' },
  rookery: { label: 'Rookery', short: 'Rky' },
};

const STATES = {
  roosting: { label: 'Roosting', order: 0 },
  calling:  { label: 'Calling',  order: 1 },
  mending:  { label: 'Mending',  order: 2 },
  empty:    { label: 'Empty',    order: 3 },
};

// The seeded parish rookery — twelve nests patched (or not) by no
// one in particular, somewhere in the middle of June 2026. Seasons
// is how many Marches the nest has been patched. For an empty nest,
// how many seasons it was kept before the birds stopped coming back.
const SEED_NESTS = [
  { name: 'The cathedral nest in the old elm by the church tower, since 1842',  perch: 'rookery', state: 'mending',  seasons: 184 },
  { name: 'The translator\'s topmost cup, patched fourteen Marches running',     perch: 'bough',   state: 'calling',  seasons: 14  },
  { name: 'The cellist\'s first cup on the bough above, completed in 2019',     perch: 'cup',     state: 'mending',  seasons: 7   },
  { name: 'The young rook\'s first twig in the corner ash, this March',         perch: 'twig',    state: 'calling',  seasons: 1   },
  { name: 'The gardener\'s long-bed bough, three hundred clutches in forty years', perch: 'rookery', state: 'mending', seasons: 40 },
  { name: 'The pair in the high beech by the cricket pavilion, since 1996',     perch: 'bough',   state: 'roosting', seasons: 30  },
  { name: 'The mending cup in the rectory garden chestnut, patched April',      perch: 'cup',     state: 'mending',  seasons: 9   },
  { name: 'The poet\'s morning notebook cup, patched twenty-eight Marches',     perch: 'bough',   state: 'roosting', seasons: 28  },
  { name: 'The empty cup in the felled hawthorn — no one will patch it again', perch: 'cup',     state: 'empty',    seasons: 12  },
  { name: 'The runner\'s back-gate twig, second season this March',            perch: 'twig',    state: 'roosting', seasons: 2   },
  { name: 'The bough in the old ash above the kissing-gate, three nests',       perch: 'bough',   state: 'roosting', seasons: 22  },
  { name: 'The lone twig in the lightning-struck oak, blew down in February',   perch: 'twig',    state: 'empty',    seasons: 1   },
];

const STORAGE_KEY = 'rookery.nests.v1';
const PROJECT_KEY = 'rookery.project.v1';
const DEFAULT_PROJECT = 'A small parish · June 2026 · twelve returning nests';

function loadNests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_NESTS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_NESTS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_NESTS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveNests() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nests)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let nests = loadNests();
let nextId = (nests.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleNests() {
  if (filter === 'all') return nests;
  return nests.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { roosting: 0, calling: 0, mending: 0, empty: 0 };
  nests.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${nests.length}</strong> nests</span>
    <span class="tot"><strong>${counts.calling + counts.mending}</strong> active</span>
    <span class="tot"><strong>${counts.roosting}</strong> roosting</span>
    <span class="tot"><strong>${counts.empty}</strong> empty</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...nests.map(s => s.seasons));
  visibleNests().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar perch-${s.perch}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.seasons / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.seasons} seasons`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#nests-list');
  ul.innerHTML = '';
  const shown = visibleNests().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.seasons - a.seasons;
  });
  shown.forEach(s => {
    const li = document.createElement('li');
    li.className = `leg perch-${s.perch}`;
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
        <button class="leg-btn" data-act="patch" title="Patch with a fresh twig (+1 season)">+1s</button>
        <button class="leg-btn" data-act="advance" title="Advance state">→</button>
        <button class="leg-btn" data-act="leave" title="Let the nest be left for the season">leave</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'patch')   patchNest(s.id);
        if (act === 'advance') advanceNest(s.id);
        if (act === 'leave')   removeNest(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveNests();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function seasonsLabel(s) {
  if (s === 0) return 'first twig';
  if (s === 1) return '1 season';
  if (s < 10)  return `${s} seasons`;
  if (s < 100) return `${s} seasons`;
  if (s < 200) return `${s}yr of birds`;
  return `${Math.round(s / 10) * 10}yr of birds`;
}

// ---------- Actions ----------

function addNest({ perch, seasons, name, state }) {
  nests.push({ id: nextId++, perch, seasons, name, state });
  render();
}

function patchNest(id) {
  const s = nests.find(x => x.id === id);
  if (!s) return;
  s.seasons += 1;
  // gentle auto-advance once the nest has been patched a while
  if (s.state === 'empty') s.state = 'roosting';
  if (s.state === 'roosting' && s.seasons >= 2) s.state = 'calling';
  if (s.state === 'calling' && s.seasons >= 6) s.state = 'mending';
  render();
}

function advanceNest(id) {
  const s = nests.find(x => x.id === id);
  if (!s) return;
  const order = ['roosting', 'calling', 'mending', 'empty'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeNest(id) {
  nests = nests.filter(s => s.id !== id);
  render();
}

function resetNests() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  nests = SEED_NESTS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = nests.length + 1;
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
    project.title = 'Click to rename the parish rookery';
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
    const perch   = $('#add-perch').value;
    const seasons = Math.max(0, parseInt($('#add-seasons').value, 10) || 0);
    const name    = $('#add-name').value.trim();
    const state   = $('#add-state').value;
    if (!name) return;
    addNest({ perch, seasons, name, state });
    $('#add-name').value = '';
    $('#add-seasons').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetNests();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Twig wedged. We will write once, when the first cups are patched. Keep coming back.';
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
  return visibleNests().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.seasons - a.seasons;
  });
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
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setFilter(f) {
  filter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  render();
}

function nudgeSeasons(delta) {
  if (focused == null) return;
  const s = nests.find(x => x.id === focused);
  if (!s) return;
  s.seasons = Math.max(0, s.seasons + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceNest(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeNest(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');      return; }
    if (k === '1') { e.preventDefault(); setFilter('roosting'); return; }
    if (k === '2') { e.preventDefault(); setFilter('calling');  return; }
    if (k === '3') { e.preventDefault(); setFilter('mending');  return; }
    if (k === '4') { e.preventDefault(); setFilter('empty');    return; }
    if (k === '[') { e.preventDefault(); nudgeSeasons(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeSeasons(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetNests(); return; }
  });
}
