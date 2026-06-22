// Wether — the flock follows the one wearing the bell
// A small page for one hefted hill flock on a Cumbrian fell.

const LEVELS = {
  lamb:   { label: 'Lamb',   short: 'Lmb' },
  gimmer: { label: 'Gimmer', short: 'Gmr' },
  ewe:    { label: 'Ewe',    short: 'Ewe' },
  wether: { label: 'Wether', short: 'Wth' },
};

const STATES = {
  strange:   { label: 'Strange',   order: 0 },
  following: { label: 'Following', order: 1 },
  hefted:    { label: 'Hefted',    order: 2 },
  leading:   { label: 'Leading',   order: 3 },
};

// The seeded flock — twelve head across one fictional fell farm in the
// Cumbrian high country in the back-end of 2026. Seasons is how many
// seasons the sheep has run the heft; for one lost off the hill, how
// many seasons it held before it strayed or went over the wall.
const SEED_FLOCK = [
  { name: 'The old belled wether that leads the gather down to the intake', level: 'wether', state: 'leading',   seasons: 9  },
  { name: 'The grey-faced ewe hefted to the high ghyll since she was a gimmer', level: 'ewe',    state: 'hefted',    seasons: 7  },
  { name: 'This spring\'s twin lambs still at their dam\'s heel on the tops',     level: 'lamb',   state: 'strange',   seasons: 0  },
  { name: 'The second wether, calm in a gale, that wears the spare bell',        level: 'wether', state: 'leading',   seasons: 6  },
  { name: 'The gimmer learning the safe ford by running behind the ewes',        level: 'gimmer', state: 'following', seasons: 1  },
  { name: 'The draft ewe that knows which gill stays green in a drought',        level: 'ewe',    state: 'hefted',    seasons: 8  },
  { name: 'The shy lamb that hangs back at the fold gate and has to be fetched', level: 'lamb',   state: 'strange',   seasons: 0  },
  { name: 'The settled ewe that taught three crops of lambs the same ground',    level: 'ewe',    state: 'hefted',    seasons: 6  },
  { name: 'The young gimmer turned onto the heft off the in-bye this back-end',  level: 'gimmer', state: 'following', seasons: 2  },
  { name: 'The old ewe near the end of her teeth, last winter on the fell',      level: 'ewe',    state: 'hefted',    seasons: 11 },
  { name: 'The wether the whole flock finds by the bell in thick hill fog',      level: 'wether', state: 'leading',   seasons: 5  },
  { name: 'The gimmer that went over the wall in the last gale and never came back', level: 'gimmer', state: 'strange', seasons: 1 },
];

let flock = SEED_FLOCK.map((s, i) => ({ ...s, id: i + 1 }));
let nextId = flock.length + 1;
let filter = 'all';
let focused = null;

// ---------- Render ----------

const $ = (sel) => document.querySelector(sel);

function visibleFlock() {
  if (filter === 'all') return flock;
  return flock.filter(s => s.state === filter);
}

function renderTotals() {
  const totals = $('#chart-totals');
  const counts = { strange: 0, following: 0, hefted: 0, leading: 0 };
  flock.forEach(s => { counts[s.state] += 1; });
  totals.innerHTML = `
    <span class="tot"><strong>${flock.length}</strong> head</span>
    <span class="tot"><strong>${counts.hefted + counts.leading}</strong> hefted</span>
    <span class="tot"><strong>${counts.leading}</strong> on the bell</span>
    <span class="tot"><strong>${counts.strange}</strong> strange</span>
  `;
}

function renderProfile() {
  const profile = $('#profile');
  profile.querySelectorAll('.profile-line').forEach(n => n.remove());
  const line = document.createElement('div');
  line.className = 'profile-line';
  const max = Math.max(8, ...flock.map(s => s.seasons));
  visibleFlock().forEach(s => {
    const bar = document.createElement('div');
    bar.className = `profile-bar level-${s.level}`;
    if (focused === s.id) bar.classList.add('is-focused');
    const h = Math.max(6, Math.round((s.seasons / max) * 88));
    bar.style.height = h + '%';
    bar.title = `${s.name} — ${s.seasons} seasons on the heft`;
    bar.addEventListener('mouseenter', () => { focused = s.id; renderList(); });
    bar.addEventListener('mouseleave', () => { focused = null; renderList(); });
    line.appendChild(bar);
  });
  profile.appendChild(line);
}

function renderList() {
  const ul = $('#flock-list');
  ul.innerHTML = '';
  const shown = visibleFlock().slice().sort((a, b) => {
    const d = STATES[b.state].order - STATES[a.state].order;
    if (d !== 0) return d;
    return b.seasons - a.seasons;
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
        <span class="leg-passes">${seasonsLabel(s.seasons)}</span>
      </span>
      <span class="leg-actions">
        <button class="leg-btn" data-act="graze"   title="Run another season on the heft (+1 season)">+1s</button>
        <button class="leg-btn" data-act="advance" title="Settle the sheep — advance how hefted it is">→</button>
        <button class="leg-btn" data-act="stray"   title="Lose the sheep — strayed off the heft, gone over the wall">stray</button>
      </span>
    `;
    li.addEventListener('mouseenter', () => { focused = s.id; renderProfile(); });
    li.addEventListener('mouseleave', () => { focused = null; renderProfile(); });
    li.querySelectorAll('.leg-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'graze')   grazeSheep(s.id);
        if (act === 'advance') advanceSheep(s.id);
        if (act === 'stray')   removeSheep(s.id);
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
  if (n === 0) return 'this year\'s lamb';
  if (n === 1) return '1 season';
  if (n < 12) return `${n} seasons`;
  return `${n} seasons · old of the hill`;
}

// ---------- Actions ----------

function addSheep({ level, seasons, name, state }) {
  flock.push({ id: nextId++, level, seasons, name, state });
  render();
}

function grazeSheep(id) {
  const s = flock.find(x => x.id === id);
  if (!s) return;
  s.seasons += 1;
  // a sheep settles to its heft as the seasons run on
  if (s.state === 'strange'   && s.seasons >= 1) s.state = 'following';
  if (s.state === 'following' && s.seasons >= 3) s.state = 'hefted';
  if (s.state === 'hefted'    && s.seasons >= 8) s.state = 'leading';
  render();
}

function advanceSheep(id) {
  const s = flock.find(x => x.id === id);
  if (!s) return;
  const order = ['strange', 'following', 'hefted', 'leading'];
  const i = order.indexOf(s.state);
  s.state = order[Math.min(order.length - 1, i + 1)];
  render();
}

function removeSheep(id) {
  flock = flock.filter(s => s.id !== id);
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
    const level   = $('#add-level').value;
    const seasons = Math.max(0, parseInt($('#add-seasons').value, 10) || 0);
    const name    = $('#add-name').value.trim();
    const state   = $('#add-state').value;
    if (!name) return;
    addSheep({ level, seasons, name, state });
    $('#add-name').value = '';
    $('#add-seasons').value = '0';
  });

  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Bell taken. We will write once, when it is on the calmest neck in the flock and the whole hill has fallen in behind it.';
  });
});
