// Ridgeline — the line where the project tips.
// Nine seeded crossings for an imaginary launch week in late May 2026.
// The summit is shipping to ten people the week before the rest of the
// world sees it; the saddles and approaches lean toward that one call.

const SEED = [
  { n: 1, position: 'approach', day: 'mon', state: 'crossed',
    name: 'Walk the demo end to end with the cold-laptop test',
    note: 'Booted a fresh machine, opened the URL, did the thing. The cold path is the only path a stranger will ever see.' },
  { n: 2, position: 'saddle', day: 'mon', state: 'crossed',
    name: 'Pick the one story for the launch post',
    note: 'Not the most accurate story. The one that holds the post together. The accuracy lives in the docs and the changelog.' },
  { n: 3, position: 'approach', day: 'tue', state: 'crossed',
    name: 'Stand the staging cluster up under May load',
    note: 'A doubled-up replay of the last quiet week. The pager stayed dark and the latency held. That is enough to keep walking.' },
  { n: 4, position: 'saddle', day: 'tue', state: 'sighted',
    name: 'Decide pricing — the small page or the table',
    note: 'A table reads honest to engineers. A small page reads honest to everyone else. The audience picks the page this time.' },
  { n: 5, position: 'saddle', day: 'wed', state: 'sighted',
    name: 'Lock the changelog format for the next two quarters',
    note: 'A line per change, the reason in italics, the link to the commit at the end. Boring. Forty weeks of the same shape.' },
  { n: 6, position: 'summit', day: 'thu', state: 'sighted',
    name: 'Ship to ten people the week before the rest',
    note: 'The one call the launch is built around. Ten people will read it as a private letter; everyone else will read it as a product.' },
  { n: 7, position: 'saddle', day: 'thu', state: 'sighted',
    name: 'Choose the one screenshot for the open-graph card',
    note: 'A screenshot is the whole post for the half the readers who never click. Pick it like the cover, not the page.' },
  { n: 8, position: 'approach', day: 'fri', state: 'sighted',
    name: 'Read the launch post aloud in the kitchen',
    note: 'The kitchen is honest. If a sentence cannot survive being spoken into the cabinets it will not survive on a public timeline.' },
  { n: 9, position: 'saddle', day: 'fri', state: 'sighted',
    name: 'Send the early-ten a thank-you note before the public note',
    note: 'They read it as a letter. The letter ends with a sentence that names them, and the public note does not. The order matters.' },
];

const POS_GLYPH = {
  approach: '↗',
  saddle:   '⌒',
  summit:   '▲',
};

const POS_LABEL = {
  approach: 'Approach',
  saddle:   'Saddle',
  summit:   'Summit',
};

const STATE_LABEL = {
  sighted:  'Sighted',
  crossed:  'Crossed',
  skirted:  'Skirted',
  returned: 'Returned',
};

const STATE_ORDER = ['sighted', 'crossed', 'skirted', 'returned'];

const POS_COLOR = {
  approach: '#6b8e5a',
  saddle:   '#7a8a9e',
  summit:   '#c97a4a',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DEFAULT_PROJECT = 'The June launch · last week of May 2026';

let crossings = SEED.map(c => ({ ...c }));
let project = DEFAULT_PROJECT;
let activeFilter = 'all';

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
  const crossed  = crossings.filter(c => c.state === 'crossed').length;
  const sighted  = crossings.filter(c => c.state === 'sighted').length;
  const skirted  = crossings.filter(c => c.state === 'skirted').length;
  const standing = crossings.length - skirted;
  const summit   = crossings.find(c => c.position === 'summit');
  const sumState = summit ? STATE_LABEL[summit.state].toLowerCase() : '—';

  host.innerHTML = `
    <div class="total">
      <span class="total-num">${crossed}<span class="unit">/${standing}</span></span>
      <span class="total-label">Crossed</span>
    </div>
    <div class="total">
      <span class="total-num">${sighted}<span class="unit">ahead</span></span>
      <span class="total-label">Still sighted</span>
    </div>
    <div class="total">
      <span class="total-num"><span style="font-family:'Fraunces',serif;">${sumState}</span></span>
      <span class="total-label">The summit</span>
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

  // crossings that are still on the ridge (not skirted)
  const active = crossings.filter(c => c.state !== 'skirted');
  if (active.length === 0) {
    host.querySelectorAll('svg').forEach(s => s.remove());
    return;
  }

  const w = 1000;
  const h = 220;
  const padX = 36;
  const baseY = h - 22;

  // y for each position: summit is highest, approaches are lowest
  const yFor = (c) => {
    if (c.position === 'summit')   return 44;
    if (c.position === 'saddle')   return 112;
    return 168; // approach
  };

  const n = active.length;
  const xFor = (i) => padX + (i / Math.max(1, n - 1)) * (w - padX * 2);

  // build the ridge polyline
  const pts = active.map((c, i) => [xFor(i), yFor(c)]);

  // a soft "distant range" curve behind the main ridge — derived from
  // the main ridge but offset downward, with smoothing
  const distant = pts.map(([x, y]) => [x, y + 30 + Math.sin(x / 90) * 6]);

  const polyToPath = (points) => {
    if (points.length === 0) return '';
    let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const [px, py] = points[i - 1];
      const [x, y] = points[i];
      const cx1 = px + (x - px) * 0.5;
      const cy1 = py;
      const cx2 = px + (x - px) * 0.5;
      const cy2 = y;
      d += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  const ridgePath = polyToPath(pts);
  const distantPath = polyToPath(distant);

  // fills: extend the path to the ground for filled mountain silhouettes
  const closeToGround = (pathD, leftX, rightX) =>
    `${pathD} L ${rightX.toFixed(1)} ${baseY} L ${leftX.toFixed(1)} ${baseY} Z`;

  const ridgeFill   = closeToGround(ridgePath, pts[0][0], pts[pts.length - 1][0]);
  const distantFill = closeToGround(distantPath, distant[0][0], distant[distant.length - 1][0]);

  // ground line
  const ground = `<line x1="0" y1="${baseY + 4}" x2="${w}" y2="${baseY + 4}" stroke="rgba(30,34,40,0.18)" stroke-width="1" />`;

  // markers for each crossing
  const markers = active.map((c, i) => {
    const [x, y] = pts[i];
    const color = POS_COLOR[c.position] || '#7a8a9e';
    const stateOpacity = {
      sighted:  0.55,
      crossed:  1.0,
      skirted:  0.0,
      returned: 0.85,
    }[c.state];
    const stateStroke = c.state === 'crossed' ? '#1e2228' : c.position === 'summit' ? '#a55a30' : '#3c4451';
    const isSummit = c.position === 'summit';
    const r = isSummit ? 7 : 4.2;
    const isSighted = c.state === 'sighted';
    return `
      <g opacity="${stateOpacity}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"
                fill="${color}" stroke="${stateStroke}"
                stroke-width="${isSummit ? 1.2 : 0.8}"
                ${isSighted ? 'stroke-dasharray="2 2"' : ''} />
        ${isSummit ? `<line x1="${x.toFixed(1)}" y1="${(y - 30).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - r - 1).toFixed(1)}" stroke="#c97a4a" stroke-width="0.7" stroke-dasharray="2 3" opacity="0.7" />` : ''}
      </g>
    `;
  }).join('');

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${ground}
      <path d="${distantFill}" fill="rgba(122,138,158,0.35)" stroke="none" />
      <path d="${ridgeFill}" fill="rgba(60,68,81,0.85)" stroke="none" />
      <path d="${ridgePath}" stroke="#1e2228" stroke-width="1" fill="none" opacity="0.5" />
      ${markers}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderCrossings() {
  const host = document.getElementById('crossings');
  if (!host) return;
  const filtered = crossings.filter(c => activeFilter === 'all' || c.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--granite);font-family:'JetBrains Mono',monospace;font-size:12px;">No crossings in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(c => `
    <li class="crossing ${c.position === 'summit' ? 'is-summit' : ''} ${c.state === 'crossed' ? 'is-current' : ''} ${c.state === 'skirted' ? 'skirted' : ''}" data-n="${c.n}">
      <span class="crossing-num">${String(c.n).padStart(2, '0')}</span>
      <span class="crossing-pos ${c.position}">
        <span class="glyph" aria-hidden="true">${POS_GLYPH[c.position]}</span>
        ${POS_LABEL[c.position]}
      </span>
      <div class="crossing-body">
        <p class="crossing-name">${escapeHtml(c.name)}</p>
        <p class="crossing-note">${escapeHtml(c.note)}</p>
      </div>
      <span class="crossing-day"><span class="num">${normalizeDay(c.day)}</span></span>
      <span class="crossing-state ${c.state}" data-action="cycle-state" data-n="${c.n}" title="Click to change state">${STATE_LABEL[c.state]}</span>
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
  renderCrossings();
}

// ---------- actions ----------

function cycleState(n) {
  const c = crossings.find(c => c.n === n);
  if (!c) return;
  const i = STATE_ORDER.indexOf(c.state);
  c.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  renderAll();
}

function removeCrossing(n) {
  crossings = crossings.filter(c => c.n !== n);
  crossings.forEach((c, i) => { c.n = i + 1; });
  renderAll();
}

function addCrossing({ position, day, name, state }) {
  // enforce: only one summit at a time
  if (position === 'summit' && crossings.some(c => c.position === 'summit' && c.state !== 'skirted')) {
    position = 'saddle';
  }
  const n = crossings.length + 1;
  crossings.push({
    n,
    position: position || 'saddle',
    day: normalizeDay(day),
    state: state || 'sighted',
    name: name || 'Unnamed crossing',
    note: '',
  });
  crossings.sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  crossings.forEach((c, i) => { c.n = i + 1; });
  renderAll();
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('#filters button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.filter === f);
  });
  renderCrossings();
}

// ---------- wiring ----------

function wire() {
  const host = document.getElementById('crossings');
  host.addEventListener('click', (e) => {
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
    addCrossing({ position, day, name, state });
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
  });
  proj.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      proj.blur();
    }
  });

  const hold = document.getElementById('hold-form');
  if (hold) {
    hold.addEventListener('submit', (e) => {
      e.preventDefault();
      const foot = document.getElementById('hold-foot');
      if (foot) foot.textContent = 'Got it. One quiet email when the first ridges open.';
      hold.reset();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  wire();
});
