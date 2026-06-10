// Millrace — the narrow cut as practice
// A small page for the channel that powers the work.

const CUTS = {
  trickle:  { label: 'Trickle',  short: 'Trk' },
  leat:     { label: 'Leat',     short: 'Lea' },
  race:     { label: 'Race',     short: 'Rce' },
  penstock: { label: 'Penstock', short: 'Pen' },
};

const STATES = {
  spring: { label: 'At the spring',    order: 0 },
  head:   { label: 'In the head',      order: 1 },
  race:   { label: 'Running the race', order: 2 },
  tail:   { label: 'Tailrace',         order: 3 },
};

// The seeded race — twelve channels cut by no one in particular along
// a slow turn of the spring of 2026. Paddles is how many paddles of
// the wheel the channel has turned (or, for a tailrace, how many it
// turned before being let out).
const SEED_CHANNELS = [
  { name: 'The long proof, a lemma a fortnight',                 cut: 'race',     state: 'race',   paddles: 86  },
  { name: 'The new violin, belly carved a month at a time',      cut: 'penstock', state: 'head',   paddles: 42  },
  { name: 'An index card of an evening paper',                   cut: 'trickle',  state: 'tail',   paddles: 18  },
  { name: 'Sixteen bars of the slow quartet',                    cut: 'leat',     state: 'race',   paddles: 58  },
  { name: 'The workshop floor swept after lunch',                cut: 'trickle',  state: 'spring', paddles: 2   },
  { name: 'The thesis chapter, paragraph by paragraph',          cut: 'penstock', state: 'head',   paddles: 28  },
  { name: 'A clean varnish coat, two months of single strokes',  cut: 'leat',     state: 'race',   paddles: 40  },
  { name: 'A single slow breath before each set',                cut: 'trickle',  state: 'tail',   paddles: 220 },
  { name: 'The kitchen-garden bed turned for the autumn',        cut: 'trickle',  state: 'spring', paddles: 1   },
  { name: 'A short translation, two pages a morning',            cut: 'race',     state: 'head',   paddles: 14  },
  { name: 'The marathon trained for in single-mile additions',   cut: 'race',     state: 'race',   paddles: 32  },
  { name: 'The fifteen-year symphony, head still half empty',    cut: 'penstock', state: 'tail',   paddles: 312 },
];

const DEFAULT_PROJECT = 'A small race · spring 2026 · the narrow cut';

let channels = SEED_CHANNELS.map((s, i) => ({ ...s, id: i + 1 }));
let nextId = channels.length + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleChannels() {
  if (filter === 'all') return channels;
  return channels.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { spring: 0, head: 0, race: 0, tail: 0 };
  channels.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${channels.length}</strong> channels</span>
    <span class="tot"><strong>${counts.race}</strong> running</span>
    <span class="tot"><strong>${counts.spring + counts.head}</strong> gathering</span>
    <span class="tot"><strong>${counts.tail}</strong> let out</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(12, ...channels.map(s => s.paddles));
  visibleChannels().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar cut-${s.cut}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.paddles / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.paddles} paddles turned`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#channels-list');
  ul.innerHTML = '';
  const shown = visibleChannels().slice().sort((a, b) => {
    const d = STATES[a.state].order - STATES[b.state].order;
    if (d !== 0) return d;
    return b.paddles - a.paddles;
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
        <span class="leg-paddles">${paddlesLabel(s.paddles)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="turn" title="Turn one more paddle">+1p</button>
        <button class="leg-btn" data-act="advance" title="Open the next sluice">→</button>
        <button class="leg-btn" data-act="close" title="Close the sluice (remove)">close</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'turn')    turnPaddle(s.id);
        if (act === 'advance') advanceChannel(s.id);
        if (act === 'close')   removeChannel(s.id);
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

function paddlesLabel(p) {
  if (p === 0) return 'unrun';
  if (p === 1) return '1 paddle';
  if (p < 24)  return `${p} paddles`;
  const m = Math.floor(p / 4.345);
  if (m < 12)  return `${m}m turning`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (r === 0) return `${y}y turning`;
  return `${y}y ${r}m turning`;
}

// ---------- Actions ----------

function addChannel({ cut, paddles, name, state }) {
  channels.push({ id: nextId++, cut, paddles, name, state });
  render();
}

function turnPaddle(id) {
  const s = channels.find(x => x.id === id);
  if (!s) return;
  s.paddles += 1;
  // gentle auto-advance once the head has filled a while
  if (s.state === 'spring' && s.paddles >= 1) s.state = 'head';
  if (s.state === 'head'   && s.paddles >= 6) s.state = 'race';
  render();
}

function advanceChannel(id) {
  const s = channels.find(x => x.id === id);
  if (!s) return;
  const order = ['spring', 'head', 'race', 'tail'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeChannel(id) {
  channels = channels.filter(s => s.id !== id);
  render();
}

function resetChannels() {
  channels = SEED_CHANNELS.map((s, i) => ({ ...s, id: i + 1 }));
  nextId = channels.length + 1;
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
    project.textContent = DEFAULT_PROJECT;
    project.setAttribute('contenteditable', 'true');
    project.setAttribute('spellcheck', 'false');
    project.title = 'Click to rename the race';
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
    const cut     = $('#add-cut').value;
    const paddles = Math.max(0, parseInt($('#add-paddles').value, 10) || 0);
    const name    = $('#add-name').value.trim();
    const state   = $('#add-state').value;
    if (!name) return;
    addChannel({ cut, paddles, name, state });
    $('#add-name').value = '';
    $('#add-paddles').value = '0';
  });

  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetChannels();
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Sluice raised. We will write once, when the first races are cut. Keep the channel clear.';
  });
});
