// Weir — the long shallow stone as practice
// A small page for the barrier that lifts the water two feet.

const CUTS = {
  notch:    { label: 'Notch',    short: 'Ntc' },
  sill:     { label: 'Sill',     short: 'Sil' },
  crest:    { label: 'Crest',    short: 'Crs' },
  compound: { label: 'Compound', short: 'Cmp' },
};

const STATES = {
  below: { label: 'Below the sill', order: 0 },
  crest: { label: 'At the crest',   order: 1 },
  spill: { label: 'Spilling',       order: 2 },
  drawn: { label: 'Drawn off',      order: 3 },
};

// The seeded weir — twelve holds laid by no one in particular along
// a slow turn of the spring of 2026. Spills is how many times the
// hold has spilled over the crest (or, for a drawn-off pool, how
// many spills it counted before the water was taken out).
const SEED_HOLDS = [
  { name: 'The thesis chapter, two paragraphs an evening',       cut: 'crest',    state: 'spill', spills: 92  },
  { name: 'A new violin, belly graduated a millimetre a week',   cut: 'compound', state: 'crest', spills: 38  },
  { name: 'An index card from each evening paper',               cut: 'notch',    state: 'drawn', spills: 22  },
  { name: 'Sixteen bars of the slow quartet',                    cut: 'sill',     state: 'spill', spills: 64  },
  { name: 'The workshop floor swept after lunch',                cut: 'notch',    state: 'below', spills: 2   },
  { name: 'The translation, two pages a morning',                cut: 'crest',    state: 'crest', spills: 18  },
  { name: 'A single clean varnish coat per fortnight',           cut: 'sill',     state: 'spill', spills: 44  },
  { name: 'A single open-string scale, forty seconds at dawn',   cut: 'notch',    state: 'spill', spills: 280 },
  { name: 'The kitchen-garden bed turned for the autumn',        cut: 'notch',    state: 'below', spills: 1   },
  { name: 'A short letter posted on a Wednesday',                cut: 'sill',     state: 'drawn', spills: 36  },
  { name: 'The marathon built in single-mile additions',         cut: 'crest',    state: 'spill', spills: 34  },
  { name: 'The fifteen-year symphony, three steps cut so far',   cut: 'compound', state: 'drawn', spills: 312 },
];

const STORAGE_KEY = 'weir.holds.v1';
const PROJECT_KEY = 'weir.project.v1';
const DEFAULT_PROJECT = 'A small weir · spring 2026 · two feet held';

function loadHolds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_HOLDS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_HOLDS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_HOLDS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveHolds() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(holds)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let holds = loadHolds();
let nextId = (holds.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleHolds() {
  if (filter === 'all') return holds;
  return holds.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { below: 0, crest: 0, spill: 0, drawn: 0 };
  holds.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${holds.length}</strong> holds</span>
    <span class="tot"><strong>${counts.spill}</strong> spilling</span>
    <span class="tot"><strong>${counts.below + counts.crest}</strong> filling</span>
    <span class="tot"><strong>${counts.drawn}</strong> drawn off</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(12, ...holds.map(s => s.spills));
  visibleHolds().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar cut-${s.cut}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.spills / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.spills} spills`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#holds-list');
  ul.innerHTML = '';
  const shown = visibleHolds().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.spills - a.spills;
  });
  shown.forEach(s => {
    const li = document.createElement('li');
    li.className = `leg cut-${s.cut}`;
    if (focused === s.id) li.classList.add('is-focused');
    li.dataset.id = s.id;
    li.innerHTML = `
      <span class="leg-swatch" aria-hidden="true"></span>
      <span class="leg-name">${escapeHtml(s.name)}</span>
      <span class="leg-meta">
        <span class="leg-state state-${s.state}">${STATES[s.state].label}</span>
        <span class="leg-spills">${spillsLabel(s.spills)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="spill" title="Count one more spill">+1s</button>
        <button class="leg-btn" data-act="advance" title="Advance state">→</button>
        <button class="leg-btn" data-act="draw" title="Draw the hold off (remove)">draw</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'spill')   countSpill(s.id);
        if (act === 'advance') advanceHold(s.id);
        if (act === 'draw')    removeHold(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveHolds();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function spillsLabel(p) {
  if (p === 0) return 'unspilled';
  if (p === 1) return '1 spill';
  if (p < 24)  return `${p} spills`;
  const m = Math.floor(p / 4.345);
  if (m < 12)  return `${m}m brimming`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (r === 0) return `${y}y brimming`;
  return `${y}y ${r}m brimming`;
}

// ---------- Actions ----------

function addHold({ cut, spills, name, state }) {
  holds.push({ id: nextId++, cut, spills, name, state });
  render();
}

function countSpill(id) {
  const s = holds.find(x => x.id === id);
  if (!s) return;
  s.spills += 1;
  // gentle auto-advance once the pool has filled a while
  if (s.state === 'below' && s.spills >= 1) s.state = 'crest';
  if (s.state === 'crest' && s.spills >= 6) s.state = 'spill';
  render();
}

function advanceHold(id) {
  const s = holds.find(x => x.id === id);
  if (!s) return;
  const order = ['below', 'crest', 'spill', 'drawn'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeHold(id) {
  holds = holds.filter(s => s.id !== id);
  render();
}

function resetHolds() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  holds = SEED_HOLDS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = holds.length + 1;
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
    project.title = 'Click to rename the weir';
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
    const cut    = $('#add-cut').value;
    const spills = Math.max(0, parseInt($('#add-spills').value, 10) || 0);
    const name   = $('#add-name').value.trim();
    const state  = $('#add-state').value;
    if (!name) return;
    addHold({ cut, spills, name, state });
    $('#add-name').value = '';
    $('#add-spills').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetHolds();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Stone laid. We will write once, when the first weirs hold the level. Keep the crest level.';
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
  return visibleHolds().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.spills - a.spills;
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

function nudgeSpills(delta) {
  if (focused == null) return;
  const s = holds.find(x => x.id === focused);
  if (!s) return;
  s.spills = Math.max(0, s.spills + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceHold(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeHold(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');   return; }
    if (k === '1') { e.preventDefault(); setFilter('below'); return; }
    if (k === '2') { e.preventDefault(); setFilter('crest'); return; }
    if (k === '3') { e.preventDefault(); setFilter('spill'); return; }
    if (k === '4') { e.preventDefault(); setFilter('drawn'); return; }
    if (k === '[') { e.preventDefault(); nudgeSpills(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeSpills(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetHolds(); return; }
  });
}
