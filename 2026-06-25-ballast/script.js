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

function seedManifest() {
  return SEED_MANIFEST.map((w, i) => ({ ...w, id: i + 1 }));
}

let manifest = seedManifest();
let nextId = manifest.length + 1;
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
  manifest = seedManifest();
  nextId = manifest.length + 1;
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
});
