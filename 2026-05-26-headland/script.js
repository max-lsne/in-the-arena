// Headland — where the land looks ahead.
// Ten seeded sightings for an imaginary first week of June 2026
// at a small design studio on a quiet coast. The sails lean toward
// a Friday visit from a long-quiet client; the squalls and flotsam
// lean around it.

const SEED = [
  { n: 1, kind: 'sail', day: 'mon', state: 'sighted',
    name: 'The Friday return of the river-house client',
    note: 'Three years quiet. The note was four sentences and read as if no time had passed. The week is built around the boat that letter is on.' },
  { n: 2, kind: 'squall', day: 'mon', state: 'closing',
    name: 'The invoice that has been late twice',
    note: 'Not catastrophic, but worth naming. A storm with a known direction. Send the second note Tuesday morning before it grows into a third.' },
  { n: 3, kind: 'flotsam', day: 'tue', state: 'sighted',
    name: 'Three cold emails for a logo refresh',
    note: 'The same week as every May. Pleasant. Worth answering once with the small page that says no kindly.' },
  { n: 4, kind: 'sail', day: 'wed', state: 'sighted',
    name: 'A studio visit from the typography fellow',
    note: 'Coming up from the south for a day. Bringing two specimens and a question about a kerning pair we never solved.' },
  { n: 5, kind: 'squall', day: 'wed', state: 'sighted',
    name: 'A weather warning for the long weekend',
    note: 'A storm twenty kilometres offshore, sliding. Could land or pass. The studio is on the leeward side either way, but the visit Friday will not be.' },
  { n: 6, kind: 'flotsam', day: 'thu', state: 'sighted',
    name: 'A newsletter from the printer with a price change',
    note: 'Up four percent on long-grain stock. Small enough to absorb. Worth marking only because the river-house job will lean on long-grain.' },
  { n: 7, kind: 'sail', day: 'thu', state: 'closing',
    name: 'The proof for the museum catalogue, due back',
    note: 'A small boat. Reliable. Has tied up at this dock six times already. Read the last six pages aloud before sending the proof in.' },
  { n: 8, kind: 'squall', day: 'fri', state: 'sighted',
    name: 'A morning of three meetings before the visit',
    note: 'A self-made storm. Move one to Monday. Move one to next week. Keep the third because it is the one the visit will want to talk about.' },
  { n: 9, kind: 'sail', day: 'fri', state: 'sighted',
    name: 'The river-house client at the studio at three',
    note: 'The Friday visit. The studio is honest at three. The studio is honest because the light comes in sideways and nothing hides in the corners.' },
  { n: 10, kind: 'flotsam', day: 'fri', state: 'sighted',
    name: 'A request to give a talk at a small conference',
    note: 'A kind ask. Worth a kind no this season. Worth a kind yes the season after. Write the no on Monday so it does not drift into Tuesday.' },
];

const KIND_GLYPH = {
  squall:  '⛈',
  sail:    '⛵',
  flotsam: '·',
};

const KIND_LABEL = {
  squall:  'Squall',
  sail:    'Sail',
  flotsam: 'Flotsam',
};

const STATE_LABEL = {
  sighted: 'Sighted',
  closing: 'Closing',
  landed:  'Landed',
  passed:  'Passed',
};

const STATE_ORDER = ['sighted', 'closing', 'landed', 'passed'];

const KIND_COLOR = {
  squall:  '#3e525c',
  sail:    '#e8b074',
  flotsam: '#6c8a5a',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const STORAGE_KEY = 'headland.v1';
const DEFAULT_PROJECT = 'The first week of June · a small coast studio';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sightings)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sightings, project }));
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
let sightings = _saved ? _saved.sightings.map(s => ({ ...s })) : SEED.map(s => ({ ...s }));
let project = _saved && typeof _saved.project === 'string' ? _saved.project : DEFAULT_PROJECT;
let activeFilter = 'all';
let selectedN = sightings.length ? sightings[0].n : null;

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
  const closing = sightings.filter(s => s.state === 'closing').length;
  const sighted = sightings.filter(s => s.state === 'sighted').length;
  const passed  = sightings.filter(s => s.state === 'passed').length;
  const landed  = sightings.filter(s => s.state === 'landed').length;
  const standing = sightings.length - passed;

  host.innerHTML = `
    <div class="total">
      <span class="total-num">${closing}<span class="unit">/${standing}</span></span>
      <span class="total-label">Closing</span>
    </div>
    <div class="total">
      <span class="total-num">${sighted}<span class="unit">far</span></span>
      <span class="total-label">Still sighted</span>
    </div>
    <div class="total">
      <span class="total-num">${landed}<span class="unit">on shore</span></span>
      <span class="total-label">Landed</span>
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

  // sightings that are still on the horizon (not passed)
  const active = sightings.filter(s => s.state !== 'passed');
  const w = 1000;
  const h = 220;

  // a horizon band: y around 80 is "far", y around 200 is "shore"
  const yForState = (state) => {
    switch (state) {
      case 'sighted': return 70;
      case 'closing': return 130;
      case 'landed':  return 188;
      default:        return 130;
    }
  };

  // horizontal placement by index across the week
  const padX = 36;
  const n = Math.max(active.length, 1);
  const xFor = (i) => padX + (i / Math.max(1, n - 1)) * (w - padX * 2);

  // a thin horizon line
  const horizonY = 96;
  const horizonLine = `
    <line x1="0" y1="${horizonY}" x2="${w}" y2="${horizonY}"
          stroke="rgba(250,246,236,0.55)" stroke-width="0.7" />
  `;

  // a softly suggested far range behind the horizon
  const farRange = `
    <path d="M0 92 L80 89 L160 91 L240 87 L320 91 L400 88 L500 92 L600 88 L700 92 L800 89 L900 92 L1000 90 L1000 96 L0 96 Z"
          fill="rgba(250,246,236,0.18)" />
  `;

  // a soft glow where the sun would be at this time of year
  const sunGlow = `
    <circle cx="820" cy="56" r="36"
            fill="rgba(241, 201, 146, 0.45)" />
    <circle cx="820" cy="56" r="14"
            fill="rgba(246, 211, 156, 0.85)" />
  `;

  // markers per kind
  const markerFor = (s, x, y) => {
    const stateAlpha = {
      sighted: 0.55,
      closing: 1.0,
      landed:  1.0,
      passed:  0.0,
    }[s.state];
    const dashed = s.state === 'sighted' ? 'stroke-dasharray="2 2"' : '';
    const stroke = '#1e2228';

    if (s.kind === 'sail') {
      // a small sail triangle on the water
      const sailH = 18;
      const sailW = 12;
      return `
        <g opacity="${stateAlpha}">
          <path d="M ${x.toFixed(1)} ${(y - sailH).toFixed(1)}
                   L ${x.toFixed(1)} ${y.toFixed(1)}
                   L ${(x + sailW).toFixed(1)} ${y.toFixed(1)} Z"
                fill="#fbf6e9" stroke="${stroke}" stroke-width="0.6"
                ${dashed} />
          <line x1="${x.toFixed(1)}" y1="${(y - sailH).toFixed(1)}"
                x2="${x.toFixed(1)}" y2="${(y + 2).toFixed(1)}"
                stroke="${stroke}" stroke-width="0.6" />
          <line x1="${(x - 4).toFixed(1)}" y1="${(y + 2).toFixed(1)}"
                x2="${(x + 6).toFixed(1)}" y2="${(y + 2).toFixed(1)}"
                stroke="${stroke}" stroke-width="0.8" />
        </g>
      `;
    }

    if (s.kind === 'squall') {
      // a small dark cloud with a hint of rain
      const cloudY = y - 12;
      const cloudW = 22;
      return `
        <g opacity="${stateAlpha}">
          <ellipse cx="${x.toFixed(1)}" cy="${cloudY.toFixed(1)}"
                   rx="${(cloudW).toFixed(1)}" ry="6"
                   fill="${KIND_COLOR.squall}" stroke="${stroke}" stroke-width="0.5"
                   ${dashed} />
          <ellipse cx="${(x - 6).toFixed(1)}" cy="${(cloudY - 4).toFixed(1)}"
                   rx="9" ry="5"
                   fill="${KIND_COLOR.squall}" opacity="0.75" />
          <line x1="${(x - 8).toFixed(1)}" y1="${(cloudY + 6).toFixed(1)}"
                x2="${(x - 10).toFixed(1)}" y2="${(cloudY + 16).toFixed(1)}"
                stroke="${KIND_COLOR.squall}" stroke-width="0.7" />
          <line x1="${(x).toFixed(1)}" y1="${(cloudY + 6).toFixed(1)}"
                x2="${(x - 2).toFixed(1)}" y2="${(cloudY + 16).toFixed(1)}"
                stroke="${KIND_COLOR.squall}" stroke-width="0.7" />
          <line x1="${(x + 8).toFixed(1)}" y1="${(cloudY + 6).toFixed(1)}"
                x2="${(x + 6).toFixed(1)}" y2="${(cloudY + 16).toFixed(1)}"
                stroke="${KIND_COLOR.squall}" stroke-width="0.7" />
        </g>
      `;
    }

    // flotsam: a small mark, low on the water
    return `
      <g opacity="${stateAlpha}">
        <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
                 rx="5" ry="1.6"
                 fill="${KIND_COLOR.flotsam}" stroke="${stroke}" stroke-width="0.5"
                 ${dashed} />
        <line x1="${(x - 4).toFixed(1)}" y1="${(y - 1).toFixed(1)}"
              x2="${(x + 4).toFixed(1)}" y2="${(y - 1).toFixed(1)}"
              stroke="${stroke}" stroke-width="0.3" opacity="0.6" />
      </g>
    `;
  };

  const markers = active.map((s, i) => {
    const x = xFor(i);
    const y = yForState(s.state);
    return markerFor(s, x, y);
  }).join('');

  // a small figure on the shore at the right, watching
  const watcher = `
    <g opacity="0.7">
      <circle cx="${(w - 30).toFixed(1)}" cy="206" r="2.4" fill="#fbf6e9" />
      <line x1="${(w - 30).toFixed(1)}" y1="208" x2="${(w - 30).toFixed(1)}" y2="218"
            stroke="#fbf6e9" stroke-width="0.9" />
    </g>
  `;

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${sunGlow}
      ${farRange}
      ${horizonLine}
      ${markers}
      ${watcher}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function classFor(s) {
  const c = [];
  c.push('sighting');
  if (s.kind === 'sail' && s.state === 'closing')   c.push('is-sail-closing');
  if (s.kind === 'squall' && s.state === 'closing') c.push('is-squall-closing');
  if (s.state === 'closing') c.push('is-current');
  if (s.state === 'passed')  c.push('passed');
  if (s.n === selectedN)     c.push('is-selected');
  return c.join(' ');
}

function renderSightings() {
  const host = document.getElementById('sightings');
  if (!host) return;
  const filtered = sightings.filter(s => activeFilter === 'all' || s.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--gull);font-family:'JetBrains Mono',monospace;font-size:12px;">No sightings in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(s => `
    <li class="${classFor(s)}" data-n="${s.n}">
      <span class="sighting-num">${String(s.n).padStart(2, '0')}</span>
      <span class="sighting-kind ${s.kind}">
        <span class="glyph" aria-hidden="true">${KIND_GLYPH[s.kind]}</span>
        ${KIND_LABEL[s.kind]}
      </span>
      <div class="sighting-body">
        <p class="sighting-name">${escapeHtml(s.name)}</p>
        <p class="sighting-note">${escapeHtml(s.note)}</p>
      </div>
      <span class="sighting-day"><span class="num">${normalizeDay(s.day)}</span></span>
      <span class="sighting-state ${s.state}" data-action="cycle-state" data-n="${s.n}" title="Click to change state">${STATE_LABEL[s.state]}</span>
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
  renderSightings();
}

// ---------- actions ----------

function cycleState(n) {
  const s = sightings.find(s => s.n === n);
  if (!s) return;
  const i = STATE_ORDER.indexOf(s.state);
  s.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  saveState();
  renderAll();
}

function removeSighting(n) {
  sightings = sightings.filter(s => s.n !== n);
  sightings.forEach((s, i) => { s.n = i + 1; });
  saveState();
  renderAll();
}

function addSighting({ kind, day, name, state }) {
  const n = sightings.length + 1;
  sightings.push({
    n,
    kind: kind || 'flotsam',
    day: normalizeDay(day),
    state: state || 'sighted',
    name: name || 'Unnamed sighting',
    note: '',
  });
  sightings.sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  sightings.forEach((s, i) => { s.n = i + 1; });
  saveState();
  renderAll();
}

function resetToSeed() {
  sightings = SEED.map(s => ({ ...s }));
  project = DEFAULT_PROJECT;
  activeFilter = 'all';
  selectedN = sightings.length ? sightings[0].n : null;
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
  renderSightings();
}

function visibleSightings() {
  return sightings.filter(s => activeFilter === 'all' || s.state === activeFilter);
}

// ---------- wiring ----------

function wire() {
  const host = document.getElementById('sightings');
  host.addEventListener('click', (e) => {
    const row = e.target.closest('.sighting');
    if (row) {
      selectedN = Number(row.dataset.n);
      renderSightings();
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
    const kind  = document.getElementById('add-kind').value;
    const day   = document.getElementById('add-day').value;
    const name  = document.getElementById('add-name').value.trim();
    const state = document.getElementById('add-state').value;
    if (!name) return;
    addSighting({ kind, day, name, state });
    document.getElementById('add-name').value = '';
  });

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
      if (foot) foot.textContent = 'Got it. One quiet email when the first horizons open.';
      hold.reset();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  wire();
});
