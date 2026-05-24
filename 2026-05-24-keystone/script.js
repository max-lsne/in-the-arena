// Keystone — the one stone that holds the arch up.
// Nine seeded stones for an imaginary week in the late spring of 2026.
// The keystone is a thirty-minute talk to the team about the year so
// far; the voussoirs lean against it; the springers begin the curve.

const SEED = [
  { n: 1, position: 'springer', day: 'mon', state: 'placed',
    name: 'Open the lab notebook for May',
    note: 'A fresh page, the date at the top, and the keystone written in the margin so the week knows what it is for.' },
  { n: 2, position: 'voussoir', day: 'mon', state: 'placed',
    name: 'Re-read last year\'s November talk',
    note: 'It said less than I remembered, and the part that landed was not the part I worked hardest on. Useful.' },
  { n: 3, position: 'voussoir', day: 'tue', state: 'placed',
    name: 'Draft the spine on one page',
    note: 'The three things and the one thing. The one thing is the keystone. Anything that does not lean on it comes out.' },
  { n: 4, position: 'voussoir', day: 'wed', state: 'set',
    name: 'Cut the slides from thirty to fifteen',
    note: 'Half of them were a different talk. The half that survived the lane walk on Tuesday are the ones that stayed.' },
  { n: 5, position: 'keystone', day: 'thu', state: 'cut',
    name: 'Give the May talk to the team',
    note: 'Thirty minutes on the year so far and the one thing for the summer. If this lands the way it can, the week is the week.' },
  { n: 6, position: 'voussoir', day: 'wed', state: 'set',
    name: 'Send the room a one-line agenda',
    note: 'A line, not a deck. The deck is for me, not for the room. The line is the contract with everyone\'s thirty minutes.' },
  { n: 7, position: 'voussoir', day: 'thu', state: 'set',
    name: 'Rehearse the close into a kitchen wall',
    note: 'The close is the part that fails. Rehearse it last and most. The wall is honest in a way the slides are not.' },
  { n: 8, position: 'voussoir', day: 'fri', state: 'cut',
    name: 'Print the slides and walk the lane reading them',
    note: 'The lane is six hundred yards. If a slide cannot survive the lane it cannot survive the room either.' },
  { n: 9, position: 'springer', day: 'fri', state: 'cut',
    name: 'Close the week with a kettle and the dog',
    note: 'A small ritual. The week stops here whether the arch closed or not. The kettle does not know the difference.' },
];

const POS_GLYPH = {
  springer: '◣',
  voussoir: '◆',
  keystone: '◈',
};

const POS_LABEL = {
  springer: 'Springer',
  voussoir: 'Voussoir',
  keystone: 'Keystone',
};

const STATE_LABEL = {
  cut:     'Cut',
  set:     'Set',
  placed:  'Placed',
  removed: 'Removed',
};

const STATE_ORDER = ['cut', 'set', 'placed', 'removed'];

const POS_COLOR = {
  springer: '#8a7e6e',
  voussoir: '#1f3a5f',
  keystone: '#c89a3d',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const STORAGE_KEY = 'keystone.v1';
const DEFAULT_PROJECT = 'The May talk · week of the 18th · late spring 2026';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.stones)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stones, project }));
  } catch {
    // quota or private mode — fail quietly, the session still works
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const _saved = loadState();
let stones = _saved ? _saved.stones.map(s => ({ ...s })) : SEED.map(s => ({ ...s }));
let project = _saved && typeof _saved.project === 'string' ? _saved.project : DEFAULT_PROJECT;
let activeFilter = 'all';
let selectedN = stones.length ? stones[0].n : null;

// ---------- formatting ----------

function normalizeDay(d) {
  const v = String(d || '').toLowerCase().slice(0, 3);
  return DAY_ORDER.includes(v) ? v : 'mon';
}

function dayIndex(d) {
  const i = DAY_ORDER.indexOf(normalizeDay(d));
  return i === -1 ? 0 : i;
}

// ---------- rendering ----------

function renderTotals() {
  const host = document.getElementById('chart-totals');
  if (!host) return;
  const placed   = stones.filter(s => s.state === 'placed').length;
  const set      = stones.filter(s => s.state === 'set').length;
  const removed  = stones.filter(s => s.state === 'removed').length;
  const standing = stones.length - removed;
  const keystone = stones.find(s => s.position === 'keystone');
  const keyState = keystone ? STATE_LABEL[keystone.state].toLowerCase() : '—';

  host.innerHTML = `
    <div class="total">
      <span class="total-num">${placed + set}<span class="unit">/${standing}</span></span>
      <span class="total-label">In the arch</span>
    </div>
    <div class="total">
      <span class="total-num">${placed}<span class="unit">placed</span></span>
      <span class="total-label">Mortar dry</span>
    </div>
    <div class="total">
      <span class="total-num"><span style="font-family:'Fraunces',serif;">${keyState}</span></span>
      <span class="total-label">The keystone</span>
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

  // standing stones, in the order they appear in the arch
  const active = stones.filter(s => s.state !== 'removed');
  if (active.length === 0) {
    host.querySelectorAll('svg').forEach(s => s.remove());
    return;
  }

  // arch geometry: a semicircle from (cx-r, cy) sweeping up to (cx+r, cy)
  const w = 1000;
  const h = 220;
  const cx = w / 2;
  const cy = h - 30;
  const rOuter = Math.min(cx - 40, h - 50);
  const rInner = rOuter - 30;

  // distribute stones across the arch, with the keystone at the apex
  const keyIndex = active.findIndex(s => s.position === 'keystone');
  const n = active.length;
  // angles: 180° (left base) to 0° (right base), keystone at 90° (apex)
  const angleFor = (i) => {
    if (n === 1) return Math.PI / 2;
    if (keyIndex === -1) {
      // even spread
      return Math.PI - (i / (n - 1)) * Math.PI;
    }
    // place keystone at apex (PI/2), spread the rest evenly on each side
    const leftCount = keyIndex;
    const rightCount = n - 1 - keyIndex;
    if (i < keyIndex) {
      // from PI down to PI/2
      const t = leftCount === 0 ? 0 : (i + 1) / (leftCount + 1);
      return Math.PI - t * (Math.PI / 2);
    } else if (i === keyIndex) {
      return Math.PI / 2;
    } else {
      // from PI/2 down to 0
      const t = rightCount === 0 ? 0 : (i - keyIndex) / (rightCount + 1);
      return Math.PI / 2 - t * (Math.PI / 2);
    }
  };

  // gridline: ground
  const ground = `<line x1="0" y1="${cy + 4}" x2="${w}" y2="${cy + 4}" stroke="rgba(31,26,22,0.18)" stroke-width="1" />`;

  // the arch curve (faint, both inner and outer)
  const archPath = (radius) => {
    const x1 = cx - radius, x2 = cx + radius;
    return `M ${x1} ${cy} A ${radius} ${radius} 0 0 1 ${x2} ${cy}`;
  };
  const archGuide = `
    <path d="${archPath(rOuter)}" stroke="rgba(31,26,22,0.12)" stroke-width="1" fill="none" />
    <path d="${archPath(rInner)}" stroke="rgba(31,26,22,0.08)" stroke-width="1" fill="none" stroke-dasharray="3 4" />
  `;

  // each stone: a small wedge between inner and outer radius at the stone's angle
  const wedges = active.map((s, i) => {
    const a = angleFor(i);
    const wedgeHalf = (Math.PI / 2) / Math.max(2, n - 1) * 0.46;
    const a1 = a + wedgeHalf;
    const a2 = a - wedgeHalf;
    const oi = (r, ang) => [cx + r * Math.cos(ang), cy - r * Math.sin(ang)];
    const [ox1, oy1] = oi(rOuter, a1);
    const [ox2, oy2] = oi(rOuter, a2);
    const [ix1, iy1] = oi(rInner, a1);
    const [ix2, iy2] = oi(rInner, a2);
    const color = POS_COLOR[s.position] || '#8a7e6e';
    const stateFill = {
      cut:    'rgba(237,228,208,0.85)',
      set:    'rgba(216,179,90,0.55)',
      placed: color,
      removed:'transparent',
    }[s.state];
    const stateStroke = s.position === 'keystone' ? '#a37c2b' : '#5e564a';
    const isKey = s.position === 'keystone';
    return `
      <path d="M ${ox1.toFixed(1)} ${oy1.toFixed(1)}
               L ${ox2.toFixed(1)} ${oy2.toFixed(1)}
               L ${ix2.toFixed(1)} ${iy2.toFixed(1)}
               L ${ix1.toFixed(1)} ${iy1.toFixed(1)} Z"
            fill="${stateFill}" stroke="${stateStroke}"
            stroke-width="${isKey ? 1.2 : 0.8}"
            opacity="${s.state === 'cut' ? 0.85 : 1}" />
      ${isKey ? `<line x1="${cx}" y1="${cy - rOuter - 6}" x2="${cx}" y2="${cy + 4}" stroke="#1f3a5f" stroke-width="0.6" stroke-dasharray="2 3" opacity="0.55" />` : ''}
    `;
  }).join('');

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${ground}
      ${archGuide}
      ${wedges}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderStones() {
  const host = document.getElementById('stones');
  if (!host) return;
  const filtered = stones.filter(s => activeFilter === 'all' || s.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--mortar);font-family:'JetBrains Mono',monospace;font-size:12px;">No stones in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(s => `
    <li class="stone ${s.position === 'keystone' ? 'is-keystone' : ''} ${s.state === 'set' ? 'is-current' : ''} ${s.state === 'removed' ? 'removed' : ''} ${s.n === selectedN ? 'is-selected' : ''}" data-n="${s.n}">
      <span class="stone-num">${String(s.n).padStart(2, '0')}</span>
      <span class="stone-pos ${s.position}">
        <span class="glyph" aria-hidden="true">${POS_GLYPH[s.position]}</span>
        ${POS_LABEL[s.position]}
      </span>
      <div class="stone-body">
        <p class="stone-name">${escapeHtml(s.name)}</p>
        <p class="stone-note">${escapeHtml(s.note)}</p>
      </div>
      <span class="stone-day"><span class="num">${normalizeDay(s.day)}</span></span>
      <span class="stone-state ${s.state}" data-action="cycle-state" data-n="${s.n}" title="Click to change state">${STATE_LABEL[s.state]}</span>
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
  renderStones();
}

// ---------- actions ----------

function cycleState(n) {
  const stone = stones.find(s => s.n === n);
  if (!stone) return;
  const i = STATE_ORDER.indexOf(stone.state);
  stone.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  saveState();
  renderAll();
}

function removeStone(n) {
  stones = stones.filter(s => s.n !== n);
  stones.forEach((s, i) => { s.n = i + 1; });
  saveState();
  renderAll();
}

function addStone({ position, day, name, state }) {
  // enforce: only one keystone at a time
  if (position === 'keystone' && stones.some(s => s.position === 'keystone' && s.state !== 'removed')) {
    position = 'voussoir';
  }
  const n = stones.length + 1;
  stones.push({
    n,
    position: position || 'voussoir',
    day: normalizeDay(day),
    state: state || 'cut',
    name: name || 'Unnamed stone',
    note: '',
  });
  // re-sort by day, keeping keystone position-marker stable
  stones.sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  stones.forEach((s, i) => { s.n = i + 1; });
  saveState();
  renderAll();
}

function resetToSeed() {
  stones = SEED.map(s => ({ ...s }));
  project = DEFAULT_PROJECT;
  activeFilter = 'all';
  selectedN = stones.length ? stones[0].n : null;
  clearState();
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === 'all');
  });
  renderAll();
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  renderStones();
}

// ---------- wiring ----------

function wire() {
  const stoneHost = document.getElementById('stones');
  stoneHost.addEventListener('click', (e) => {
    const row = e.target.closest('.stone');
    if (row) {
      selectedN = Number(row.dataset.n);
      renderStones();
    }
    const t = e.target.closest('[data-action="cycle-state"]');
    if (!t) return;
    cycleState(Number(t.dataset.n));
  });

  document.getElementById('filters').addEventListener('click', (e) => {
    const t = e.target.closest('button[data-filter]');
    if (!t) return;
    setFilter(t.dataset.filter);
  });

  const form = document.getElementById('add-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const position = document.getElementById('add-position').value;
    const day      = document.getElementById('add-day').value;
    const name     = document.getElementById('add-name').value.trim();
    const state    = document.getElementById('add-state').value;
    if (!name) return;
    addStone({ position, day, name, state });
    document.getElementById('add-name').value = '';
  });

  // rename project on click (contenteditable)
  const proj = document.getElementById('chart-project');
  proj.addEventListener('click', () => {
    proj.setAttribute('contenteditable', 'true');
    proj.focus();
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
    saveState();
  });
  proj.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      proj.blur();
    }
  });

  const resetLink = document.getElementById('reset-demo');
  if (resetLink) {
    resetLink.addEventListener('click', (e) => {
      e.preventDefault();
      resetToSeed();
    });
  }

  const hold = document.getElementById('hold-form');
  if (hold) {
    hold.addEventListener('submit', (e) => {
      e.preventDefault();
      const foot = document.getElementById('hold-foot');
      if (foot) foot.textContent = 'Got it. One quiet email when the first arches open.';
      hold.reset();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  wire();
});
