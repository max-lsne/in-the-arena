// Switchback — the long way is the way up.
// Twelve seeded legs from a fictional first ascent of an unnamed
// ridge in the eastern Sangres. The shape: a clean trailhead, a
// fast scree leg, a long bench to clear the south face, a gully
// that went nowhere and got redrawn, a hard pillar pitch, a
// storm pinned at the col, a false summit, and the real one.

const SEED = [
  { n: 1,  aspect: 'across', gain:  120, state: 'set',
    name: 'Trailhead at the creek',
    note: 'Gear check on the tailgate. Cut the pack by four pounds. Left the second rope.' },
  { n: 2,  aspect: 'up',     gain:  640, state: 'set',
    name: 'East scree',
    note: 'Loose for an hour, then solid. Sun came over the shoulder at the top.' },
  { n: 3,  aspect: 'across', gain:   80, state: 'set',
    name: 'The long bench',
    note: 'Walked sideways for two hours to clear the unclimbable south face. No view, no gain. The leg that lets the climb happen.' },
  { n: 4,  aspect: 'up',     gain:  420, state: 'set',
    name: 'Stair pitch above the bench',
    note: 'Found the line off a marker we did not place. Steep but holding.' },
  { n: 5,  aspect: 'up',     gain:  220, state: 'redrawn',
    name: 'The west gully',
    note: 'Looked like a fast pitch from below. Cliffed out at a rotten cornice. Backed down.' },
  { n: 6,  aspect: 'back',   gain: -180, state: 'set',
    name: 'Down to the bench again',
    note: 'A hundred and eighty feet of carefully losing altitude. The map said this was wrong. The map was wrong.' },
  { n: 7,  aspect: 'across', gain:   90, state: 'set',
    name: 'Re-route across the south rib',
    note: 'Two hours of patient sideways. Found the bench that goes up. Set a small cairn.' },
  { n: 8,  aspect: 'up',     gain:  780, state: 'set',
    name: 'The pillar',
    note: 'Ninety minutes of straight climb. The only leg of the day that looked like the planning doc.' },
  { n: 9,  aspect: 'across', gain:    0, state: 'set',
    name: 'Storm at the col',
    note: 'Pinned. Brewed tea on the stove twice. Read the map again. Slept four hours.' },
  { n: 10, aspect: 'up',     gain:  340, state: 'walking',
    name: 'Col to the false summit',
    note: 'Clearer at sunrise. Walking it now — feet are slow, mind is clear.' },
  { n: 11, aspect: 'across', gain:   60, state: 'scouted',
    name: 'False summit traverse',
    note: 'The cairn at the top of pitch ten is not the top. The map shows a half-day across.' },
  { n: 12, aspect: 'up',     gain:  280, state: 'scouted',
    name: 'The summit',
    note: 'Small. Plain. The sit-down before the long walk back down to the creek.' },
];

const ASPECT_GLYPH = {
  up:     '▲',
  across: '→',
  back:   '▼',
};

const ASPECT_LABEL = {
  up: 'Up',
  across: 'Across',
  back: 'Back',
};

const STATE_LABEL = {
  scouted: 'Scouted',
  walking: 'Walking',
  set:     'Set',
  redrawn: 'Redrawn',
};

const STATE_ORDER = ['scouted', 'walking', 'set', 'redrawn'];

// state held in memory for this session
let legs = SEED.map(l => ({ ...l }));
let project = 'An unnamed ridge · east Sangres · day 4 of about 5';
let activeFilter = 'all';

// ---------- formatting ----------

function fmtGain(n) {
  if (n === 0) return '0 ft';
  const s = n > 0 ? '+' : '−';
  return `${s}${Math.abs(n)} ft`;
}

function gainClass(n) {
  if (n > 0) return 'pos';
  if (n < 0) return 'neg';
  return '';
}

function altitudeOf(index) {
  // cumulative gain of all set/walking legs up to and including index
  let alt = 0;
  for (let i = 0; i <= index; i++) {
    const l = legs[i];
    if (!l) continue;
    if (l.state === 'redrawn') continue;
    alt += l.gain;
  }
  return alt;
}

function summitAltitude() {
  let alt = 0;
  for (const l of legs) {
    if (l.state === 'redrawn') continue;
    alt += l.gain;
  }
  return alt;
}

// ---------- rendering ----------

function renderTotals() {
  const host = document.getElementById('chart-totals');
  if (!host) return;
  const walked = legs.filter(l => l.state === 'set' || l.state === 'walking').length;
  const scouted = legs.filter(l => l.state === 'scouted').length;
  const redrawn = legs.filter(l => l.state === 'redrawn').length;
  const alt = legs
    .filter(l => l.state === 'set' || l.state === 'walking')
    .reduce((s, l) => s + l.gain, 0);
  host.innerHTML = `
    <div class="total">
      <span class="total-num">${alt}<span class="unit">ft</span></span>
      <span class="total-label">Altitude</span>
    </div>
    <div class="total">
      <span class="total-num">${walked}<span class="unit">/${legs.length}</span></span>
      <span class="total-label">Legs walked</span>
    </div>
    <div class="total">
      <span class="total-num">${redrawn}<span class="unit">redrawn</span></span>
      <span class="total-label">Off the map</span>
    </div>
  `;
}

function renderProject() {
  const el = document.getElementById('chart-project');
  if (el) el.textContent = project;
}

function renderProfile() {
  const host = document.getElementById('profile');
  if (!host) return;

  // collect cumulative altitudes for legs that count (not redrawn)
  const active = legs.filter(l => l.state !== 'redrawn');
  if (active.length === 0) {
    host.querySelectorAll('svg').forEach(s => s.remove());
    return;
  }

  let alt = 0;
  const points = [{ x: 0, alt: 0 }];
  active.forEach((l, i) => {
    alt += l.gain;
    points.push({ x: i + 1, alt });
  });

  const w = 1000;
  const h = 220;
  const padX = 18;
  const padY = 16;
  const maxX = points.length - 1;
  const minA = Math.min(0, ...points.map(p => p.alt));
  const maxA = Math.max(0, ...points.map(p => p.alt));
  const span = Math.max(100, maxA - minA);

  const sx = i => padX + (i / maxX) * (w - padX * 2);
  const sy = a => h - padY - ((a - minA) / span) * (h - padY * 2);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.alt).toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L ${sx(maxX).toFixed(1)} ${(h - padY).toFixed(1)} L ${sx(0).toFixed(1)} ${(h - padY).toFixed(1)} Z`;

  // gridlines at quarters
  const lines = [];
  for (let i = 1; i < 4; i++) {
    const y = padY + (i / 4) * (h - padY * 2);
    lines.push(`<line class="profile-grid-line" x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="rgba(24,27,30,0.06)" stroke-width="1" />`);
  }

  // dots, colored by aspect of the leg leading into this point
  const dots = points.map((p, i) => {
    if (i === 0) {
      return `<circle cx="${sx(0).toFixed(1)}" cy="${sy(0).toFixed(1)}" r="3.6" fill="#4a5560" />`;
    }
    const leg = active[i - 1];
    const fill = leg.aspect === 'up' ? '#c46a4a' : leg.aspect === 'across' ? '#6b8aa5' : '#4a5560';
    const isWalking = leg.state === 'walking';
    return `
      <circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.alt).toFixed(1)}" r="${isWalking ? 5 : 3.6}" fill="${fill}" ${isWalking ? 'stroke="#c46a4a" stroke-width="1.5"' : ''} />
    `;
  }).join('');

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${lines.join('')}
      <path d="${fillPath}" fill="#1f3a2c" opacity="0.08" />
      <path d="${linePath}" stroke="#1f3a2c" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
    </svg>
  `;

  // replace existing svg if any
  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderLegs() {
  const host = document.getElementById('legs');
  if (!host) return;
  const filtered = legs.filter(l => activeFilter === 'all' || l.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--granite);font-family:'JetBrains Mono',monospace;font-size:12px;">No legs in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(l => `
    <li class="leg ${l.state === 'walking' ? 'is-current' : ''} ${l.state === 'redrawn' ? 'redrawn' : ''}" data-n="${l.n}">
      <span class="leg-num">${String(l.n).padStart(2, '0')}</span>
      <span class="leg-aspect ${l.aspect}">
        <span class="glyph" aria-hidden="true">${ASPECT_GLYPH[l.aspect]}</span>
        ${ASPECT_LABEL[l.aspect]}
      </span>
      <div class="leg-body">
        <p class="leg-name">${escapeHtml(l.name)}</p>
        <p class="leg-note">${escapeHtml(l.note)}</p>
      </div>
      <span class="leg-gain ${gainClass(l.gain)}">${fmtGain(l.gain)}</span>
      <span class="leg-state ${l.state}" data-action="cycle-state" data-n="${l.n}" title="Click to change state">${STATE_LABEL[l.state]}</span>
    </li>
  `).join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAll() {
  renderProject();
  renderTotals();
  renderProfile();
  renderLegs();
}

// ---------- actions ----------

function cycleState(n) {
  const leg = legs.find(l => l.n === n);
  if (!leg) return;
  const i = STATE_ORDER.indexOf(leg.state);
  leg.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  renderAll();
}

function removeLeg(n) {
  legs = legs.filter(l => l.n !== n);
  // renumber
  legs.forEach((l, i) => { l.n = i + 1; });
  renderAll();
}

function addLeg({ aspect, gain, name, state }) {
  const n = legs.length + 1;
  legs.push({
    n,
    aspect,
    gain: Number(gain) || 0,
    state: state || 'scouted',
    name: name || 'Unnamed leg',
    note: '',
  });
  renderAll();
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  renderLegs();
}

function resetToSeed() {
  legs = SEED.map(l => ({ ...l }));
  project = 'An unnamed ridge · east Sangres · day 4 of about 5';
  activeFilter = 'all';
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === 'all');
  });
  renderAll();
}

// ---------- wiring ----------

function wire() {
  // cycle state on click
  document.getElementById('legs').addEventListener('click', (e) => {
    const t = e.target.closest('[data-action="cycle-state"]');
    if (!t) return;
    cycleState(Number(t.dataset.n));
  });

  // filters
  document.getElementById('filters').addEventListener('click', (e) => {
    const t = e.target.closest('button[data-filter]');
    if (!t) return;
    setFilter(t.dataset.filter);
  });

  // add leg
  const form = document.getElementById('add-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const aspect = document.getElementById('add-aspect').value;
    const gain   = document.getElementById('add-gain').value;
    const name   = document.getElementById('add-name').value.trim();
    const state  = document.getElementById('add-state').value;
    if (!name) return;
    addLeg({ aspect, gain, name, state });
    document.getElementById('add-name').value = '';
  });

  // rename project (contenteditable on click)
  const proj = document.getElementById('chart-project');
  proj.addEventListener('click', () => {
    proj.setAttribute('contenteditable', 'true');
    proj.focus();
    // select all
    const r = document.createRange();
    r.selectNodeContents(proj);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  });
  proj.addEventListener('blur', () => {
    proj.removeAttribute('contenteditable');
    const v = proj.textContent.trim();
    project = v || project;
    proj.textContent = project;
  });
  proj.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      proj.blur();
    }
  });

  // reset
  document.getElementById('reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    resetToSeed();
  });

  // hold form — fake submit, no network
  const hold = document.getElementById('hold-form');
  if (hold) {
    hold.addEventListener('submit', (e) => {
      e.preventDefault();
      const foot = document.getElementById('hold-foot');
      if (foot) foot.textContent = 'Got it. One quiet email when the first trails open.';
      hold.reset();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  wire();
});
