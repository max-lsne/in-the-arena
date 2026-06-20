// Fathom — understanding by depth, not by count
// A small page for one reader's working set of texts, sounded to the bottom.

const LEVELS = {
  surface:  { label: 'Surface',  short: 'Srf' },
  shallows: { label: 'Shallows', short: 'Shl' },
  reach:    { label: 'Reach',    short: 'Rch' },
  deep:     { label: 'Deep',     short: 'Dep' },
};

const STATES = {
  adrift:   { label: 'Adrift',   order: 0 },
  sounding: { label: 'Sounding', order: 1 },
  holding:  { label: 'Holding',  order: 2 },
  fathomed: { label: 'Fathomed', order: 3 },
};

// The seeded chart — twelve texts across one fictional reader's
// chart-table in the middle of June 2026. Soundings is how many times
// the reader has gone back down into the text; level is the depth
// reached; state is the present condition of the work.
const SEED_TEXTS = [
  { name: 'The nine-page proof she first copied out understanding nothing, reread for fifteen years', level: 'deep',     state: 'fathomed', soundings: 41 },
  { name: 'The dense canzone in translation, forty drafts deep and the bottom still shifting',        level: 'reach',    state: 'holding',  soundings: 23 },
  { name: 'The morning psalm said at first light some eleven thousand times since 1996',              level: 'deep',     state: 'fathomed', soundings: 96 },
  { name: 'The battered control-systems manual, spine taped twice, carried through four jobs',        level: 'deep',     state: 'holding',  soundings: 34 },
  { name: 'The conference paper on attention, skated once on the train this April',                   level: 'surface',  state: 'adrift',   soundings: 1  },
  { name: 'The late Beethoven quartet, the A-minor, read at the piano every winter since 2014',       level: 'reach',    state: 'holding',  soundings: 19 },
  { name: 'The short novel reread each autumn, the shape of it known now but not the bottom',         level: 'shallows', state: 'sounding', soundings: 6  },
  { name: 'The essay on grief she means to go back into when she has the nerve',                       level: 'surface',  state: 'adrift',   soundings: 2  },
  { name: 'The geometry textbook worked through twice, margins crowded, arguing with chapter four',    level: 'reach',    state: 'sounding', soundings: 11 },
  { name: 'The Gospel of Mark, gone over verse by verse in a slow Lent group this spring',            level: 'shallows', state: 'sounding', soundings: 7  },
  { name: 'The mathematics monograph bought with intent, opened once, drifting on the desk',          level: 'surface',  state: 'adrift',   soundings: 0  },
  { name: 'The collected Bishop, the one fish poem learned by heart and still not exhausted',         level: 'deep',     state: 'holding',  soundings: 52 },
];

const STORAGE_KEY = 'fathom.texts.v1';
const PROJECT_KEY = 'fathom.project.v1';
const DEFAULT_PROJECT = 'A reader\'s soundings · June 2026 · twelve texts';

function loadTexts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_TEXTS.map((s, i) => ({ ...s, id: i + 1 }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SEED_TEXTS.map((s, i) => ({ ...s, id: i + 1 }));
    }
    return parsed.map((s, i) => ({ ...s, id: s.id || i + 1 }));
  } catch {
    return SEED_TEXTS.map((s, i) => ({ ...s, id: i + 1 }));
  }
}

function saveTexts() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(texts)); } catch {}
}

function loadProject() {
  try { return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT; }
  catch { return DEFAULT_PROJECT; }
}

function saveProject(name) {
  try { localStorage.setItem(PROJECT_KEY, name); } catch {}
}

let texts = loadTexts();
let nextId = (texts.reduce((m, s) => Math.max(m, s.id || 0), 0)) + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleTexts() {
  if (filter === 'all') return texts;
  return texts.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { adrift: 0, sounding: 0, holding: 0, fathomed: 0 };
  texts.forEach(s => { counts[s.state] += 1; });
  const total = texts.reduce((n, s) => n + s.soundings, 0);
  totals.innerHTML = `
    <span class="tot"><strong>${texts.length}</strong> texts</span>
    <span class="tot"><strong>${total}</strong> soundings</span>
    <span class="tot"><strong>${counts.fathomed}</strong> fathomed</span>
    <span class="tot"><strong>${counts.adrift}</strong> adrift</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...texts.map(s => s.soundings));
  visibleTexts().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.soundings / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${soundingsLabel(s.soundings)}`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#texts-list');
  ul.innerHTML = '';
  const shown = visibleTexts().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.soundings - a.soundings;
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
        <span class="leg-passes">${soundingsLabel(s.soundings)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="sound"   title="Take another sounding (+1 sounding)">+1</button>
        <button class="leg-btn" data-act="advance" title="Advance the condition">→</button>
        <button class="leg-btn" data-act="drift"   title="Let it drift away — set it aside">drift</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'sound')   soundText(s.id);
        if (act === 'advance') advanceText(s.id);
        if (act === 'drift')   removeText(s.id);
      });
    });
    ul.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderProfile();
  renderList();
  saveTexts();
}

// ---------- Helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function soundingsLabel(n) {
  if (n === 0) return 'not yet sounded';
  if (n === 1) return '1 sounding';
  return `${n} soundings`;
}

// ---------- Actions ----------

function addText({ level, soundings, name, state }) {
  texts.push({ id: nextId++, level, soundings, name, state });
  render();
}

function soundText(id) {
  const s = texts.find(x => x.id === id);
  if (!s) return;
  s.soundings += 1;
  // a text comes into condition as the soundings accrue
  if (s.state === 'adrift'   && s.soundings >= 1)  s.state = 'sounding';
  if (s.state === 'sounding' && s.soundings >= 8)  s.state = 'holding';
  if (s.state === 'holding'  && s.soundings >= 30) s.state = 'fathomed';
  render();
}

function advanceText(id) {
  const s = texts.find(x => x.id === id);
  if (!s) return;
  const order = ['adrift', 'sounding', 'holding', 'fathomed'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeText(id) {
  texts = texts.filter(s => s.id !== id);
  render();
}

function resetTexts() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { localStorage.removeItem(PROJECT_KEY); } catch {}
  texts = SEED_TEXTS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = texts.length + 1;
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
    project.title = 'Click to rename the chart';
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
    const level     = $('#add-level').value;
    const soundings = Math.max(0, parseInt($('#add-soundings').value, 10) || 0);
    const name      = $('#add-name').value.trim();
    const state     = $('#add-state').value;
    if (!name) return;
    addText({ level, soundings, name, state });
    $('#add-name').value = '';
    $('#add-soundings').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetTexts();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Line dropped. We will write once, when the first line has paid all the way out and the tallow has come up with the bottom on it. You cannot hurry it.';
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
  return visibleTexts().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.soundings - a.soundings;
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

function nudgeSoundings(delta) {
  if (focused == null) return;
  const s = texts.find(x => x.id === focused);
  if (!s) return;
  s.soundings = Math.max(0, s.soundings + delta);
  render();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (isTypingInForm()) return;
    const k = e.key;
    if (k === 'j' || k === 'J' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (k === 'k' || k === 'K' || k === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (k === 'Enter') {
      if (focused != null) { e.preventDefault(); advanceText(focused); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      if (focused != null) { e.preventDefault(); removeText(focused); focused = null; }
      return;
    }
    if (k === 'n' || k === 'N') { e.preventDefault(); const el = $('#add-name'); if (el) el.focus(); return; }
    if (k === '0') { e.preventDefault(); setFilter('all');      return; }
    if (k === '1') { e.preventDefault(); setFilter('adrift');   return; }
    if (k === '2') { e.preventDefault(); setFilter('sounding'); return; }
    if (k === '3') { e.preventDefault(); setFilter('holding');  return; }
    if (k === '4') { e.preventDefault(); setFilter('fathomed'); return; }
    if (k === '[') { e.preventDefault(); nudgeSoundings(-1); return; }
    if (k === ']') { e.preventDefault(); nudgeSoundings(1);  return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); resetTexts(); return; }
  });
}
