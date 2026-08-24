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
const STORAGE_KEY = 'seam.bond.items.v1';
const PROJECT_KEY = 'seam.bond.wall.v1';

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
  announce(`Laid in "${shortName(name)}" as a ${LEVELS[level].label.toLowerCase()} bond, ${STATES[state].label.toLowerCase()}. ${items.length} courses.`);
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
  announce(`"${shortName(s.name)}" weathered another winter — ${wintersLabel(s.winters)}, now ${STATES[s.state].label.toLowerCase()}.`);
}

function advanceItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  const order = ['green', 'set', 'pointed', 'weathered'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
  announce(`"${shortName(s.name)}" pointed up to ${STATES[s.state].label.toLowerCase()}.`);
}

function cutItem(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  s.state = 'green';
  render();
  announce(`"${shortName(s.name)}" raked back to green.`);
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
  announce('Wall reset to the twelve courses laid on the site this morning.');
}

// ---------- Wire up ----------

document.addEventListener('DOMContentLoaded', () => {
  const project = $('#chart-project');
  if (project) {
    project.textContent = loadProject();
    project.setAttribute('contenteditable', 'true');
    project.setAttribute('spellcheck', 'false');
    project.title = 'Click to rename the wall';
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
      const label = filter === 'all' ? 'all courses' : STATES[filter].label.toLowerCase();
      announce(`Showing ${label} — ${visibleItems().length} of ${items.length} courses.`);
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
  const label = f === 'all' ? 'all courses' : STATES[f].label.toLowerCase();
  announce(`Showing ${label} — ${visibleItems().length} of ${items.length} courses.`);
}

function nudgeWinters(delta) {
  if (focused == null) return;
  const s = items.find(x => x.id === focused);
  if (!s) return;
  s.winters = Math.max(0, s.winters + delta);
  render();
  announce(`"${shortName(s.name)}" — ${wintersLabel(s.winters)}.`);
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
    if (k === '0') { e.preventDefault(); setFilter('all');       return; }
    if (k === '1') { e.preventDefault(); setFilter('green');     return; }
    if (k === '2') { e.preventDefault(); setFilter('set');       return; }
    if (k === '3') { e.preventDefault(); setFilter('pointed');   return; }
    if (k === '4') { e.preventDefault(); setFilter('weathered'); return; }
    if (k === '[') { e.preventDefault(); nudgeWinters(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeWinters(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetItems(); return; }
  });
}
