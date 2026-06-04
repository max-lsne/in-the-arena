// Drystone — a small page for the practices that hold by careful fit.
// Twelve seeded stones kept by no one in particular through a slow
// turn of the summer of 2026. The wall: a 6am run lichened nine
// winters, a Sunday with no work settled three seasons, an end-of-day
// broom foundation-set twenty-two years against the same workshop floor.

const SEED = [
  { n:  1, course: 'foundation', years:  9, state: 'lichened',
    name: 'The 6am run, nine winters in',
    note: 'Placed in 2017 in a wet October. Lichened thick now. The wall stands because this stone has not moved.' },
  { n:  2, course: 'foundation', years: 22, state: 'lichened',
    name: 'The end-of-day broom in the workshop',
    note: 'Twenty-two years against the same floor. The broom knows the corners by heart. The deepest foundation stone in the wall.' },
  { n:  3, course: 'foundation', years:  3, state: 'settled',
    name: 'The Sunday with no screens, three seasons in',
    note: 'Set in spring 2023. Three settled seasons. The hedge has not yet thickened to lichen but the seat has stopped shifting.' },
  { n:  4, course: 'foundation', years:  0, state: 'set',
    name: 'The 200 words before coffee, set this equinox',
    note: 'Placed at the spring equinox. Still bedding in. The first weeks were clumsy. Now it sits — for now.' },
  { n:  5, course: 'wall',       years:  6, state: 'lichened',
    name: 'The Tuesday supervision call, six years held',
    note: 'A wall stone, lichened. Six years of an hour on a Tuesday with the same supervisor. The middle of the wall, where it carries the most weight.' },
  { n:  6, course: 'wall',       years:  3, state: 'settled',
    name: 'The Wednesday yoga, three years',
    note: 'Set in 2023. Three settled years. The hour does not get moved for meetings. The wall is fitted around this stone, not against it.' },
  { n:  7, course: 'wall',       years:  1, state: 'set',
    name: 'The Friday close-of-week, set last autumn',
    note: 'Placed in October 2025. One year in. Still finding its seat between the morning and the weekend. The fit is what is being tested.' },
  { n:  8, course: 'wall',       years:  0, state: 'found',
    name: 'A monthly mentoring call, weighed in the hand',
    note: 'Found this spring. Considered. Not yet placed. The right course is wall — but the seat has not been chosen, and so the stone is still in the field.' },
  { n:  9, course: 'coping',     years:  7, state: 'lichened',
    name: 'The December week off email, since 2019',
    note: 'Coping. Seven years of a week locked tight at the top in deep midwinter. Lichened thick enough that nothing crosses it now. The wall breathes because of this.' },
  { n: 10, course: 'coping',     years:  4, state: 'settled',
    name: 'The long walk after a hard week',
    note: 'Set in 2022. Four settled years. The coping stone that lets the wall breathe at the end of a heavy course. Always Saturday. Always alone.' },
  { n: 11, course: 'coping',     years:  0, state: 'set',
    name: 'The annual fortnight where the manuscript stays closed',
    note: 'Cut at the start of the year. The first one is in the books. Set, not yet settled. The coping that lets the next book come back better.' },
  { n: 12, course: 'coping',     years:  0, state: 'found',
    name: 'A quarterly tool-sharpening Saturday',
    note: 'Found in the workshop this winter. Weighed. The course is coping. The seat has not been picked. Standing in the field still.' },
];

const COURSE_GLYPH = {
  foundation: '◼',
  wall:       '◧',
  coping:     '◫',
};

const COURSE_LABEL = {
  foundation: 'Foundation',
  wall:       'Wall',
  coping:     'Coping',
};

const STATE_LABEL = {
  found:    'Found',
  set:      'Set',
  settled:  'Settled',
  lichened: 'Lichened',
};

const STATE_ORDER = ['found', 'set', 'settled', 'lichened'];

const COURSE_COLOR = {
  foundation: '#46443e',
  wall:       '#6e6b62',
  coping:     '#6b7d4f',
};

const STORAGE_KEY = 'drystone.v1';
const DEFAULT_PROJECT = 'A small upland wall · summer 2026 · the slow fit';

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
let stones = _saved ? _saved.stones.map(d => ({ ...d })) : SEED.map(d => ({ ...d }));
let project = _saved && typeof _saved.project === 'string' ? _saved.project : DEFAULT_PROJECT;
let activeFilter = 'all';

// ---------- formatting ----------

function fmtYears(n) {
  if (n === 0) return 'found';
  if (n === 1) return '1 year';
  return `${n} years`;
}

function yearsClass(n) {
  return n === 0 ? 'zero' : '';
}

// ---------- rendering ----------

function renderTotals() {
  const host = document.getElementById('chart-totals');
  if (!host) return;
  const lichened = stones.filter(d => d.state === 'lichened').length;
  const placed = stones.filter(d => d.state !== 'found').length;
  const found = stones.filter(d => d.state === 'found').length;
  const totalYears = stones
    .filter(d => d.state !== 'found')
    .reduce((sum, d) => sum + (d.years || 0), 0);
  host.innerHTML = `
    <div class="total">
      <span class="total-num">${placed}<span class="unit">/${stones.length - found}</span></span>
      <span class="total-label">Placed</span>
    </div>
    <div class="total">
      <span class="total-num">${lichened}<span class="unit">lichened</span></span>
      <span class="total-label">Long-held</span>
    </div>
    <div class="total">
      <span class="total-num">${totalYears}<span class="unit">yr</span></span>
      <span class="total-label">Wall age</span>
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

  const active = stones.filter(d => d.state !== 'found');
  if (active.length === 0) {
    host.querySelectorAll('svg').forEach(s => s.remove());
    return;
  }

  const w = 1000;
  const h = 220;
  const padX = 28;
  const padY = 28;
  const maxX = Math.max(1, active.length - 1);
  const maxYears = Math.max(6, ...active.map(d => d.years || 0));

  const sx = i => padX + (i / maxX) * (w - padX * 2);
  // y grows upward = longer held / deeper lichen
  const sy = y => (h - padY) - (Math.min(y, maxYears) / maxYears) * (h - padY * 2);

  // gridlines at quarters
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const y = padY + (i / 4) * (h - padY * 2);
    grid.push(`<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="rgba(31,28,18,0.06)" stroke-width="1" />`);
  }

  // a coping line at the top — a course of capstones
  const copingY = padY - 4;
  const copingStones = [];
  for (let x = padX; x <= w - padX; x += 22) {
    const ww = 14;
    const off = Math.sin(x / 30) * 1.5;
    copingStones.push(`<rect x="${x.toFixed(1)}" y="${(copingY + off - 6).toFixed(1)}" width="${ww}" height="10" fill="#6e6b62" opacity="0.55" rx="1.5" />`);
  }

  // posts: vertical lines from the ground up to each stone's height
  const groundY = h - 10;
  const stems = active.map((d, i) => {
    const x = sx(i);
    const y = sy(d.years || 0);
    const color = COURSE_COLOR[d.course] || '#6e6b62';
    const opacity = d.state === 'found' ? 0.35 : 0.85;
    return `
      <line x1="${x.toFixed(1)}" y1="${groundY.toFixed(1)}"
            x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
            stroke="${color}" stroke-width="1.8"
            stroke-dasharray="${d.state === 'found' ? '3 4' : '0'}"
            opacity="${opacity}" />
    `;
  }).join('');

  // the stone marks — bigger and mossier when lichened
  const marks = active.map((d, i) => {
    const x = sx(i);
    const y = sy(d.years || 0);
    const color = COURSE_COLOR[d.course] || '#6e6b62';
    const r = d.state === 'lichened' ? 8 : d.state === 'settled' ? 5.5 : 3.8;
    const ring = d.state === 'settled' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.5" />` : '';
    const moss = d.state === 'lichened'
      ? `<ellipse cx="${x.toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="11" ry="6" fill="#c4ca8b" opacity="0.5" />`
      : '';
    return `
      ${moss}
      ${ring}
      <rect x="${(x - r).toFixed(1)}" y="${(y - r * 0.75).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 1.5).toFixed(1)}" rx="2" fill="${color}" />
    `;
  }).join('');

  // the ground line — soft uneven
  const groundPts = [];
  for (let x = 0; x <= w; x += 40) {
    const off = Math.sin(x / 60) * 3 - 1;
    groundPts.push(`${x},${(groundY + off).toFixed(1)}`);
  }

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${grid.join('')}
      ${copingStones.join('')}
      <polyline points="${groundPts.join(' ')}" stroke="rgba(31,28,18,0.4)" stroke-width="1.2" fill="none" />
      ${stems}
      ${marks}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function renderStones() {
  const host = document.getElementById('stones-list');
  if (!host) return;
  const filtered = stones.filter(d => activeFilter === 'all' || d.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--stone);font-family:'JetBrains Mono',monospace;font-size:12px;">No stones in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(d => `
    <li class="stone ${d.state === 'set' ? 'is-current' : ''}" data-n="${d.n}">
      <span class="stone-num">${String(d.n).padStart(2, '0')}</span>
      <span class="stone-course stone-course-${d.course}">
        <span class="glyph" aria-hidden="true">${COURSE_GLYPH[d.course]}</span>
        ${COURSE_LABEL[d.course]}
      </span>
      <div class="stone-body">
        <p class="stone-name">${escapeHtml(d.name)}</p>
        <p class="stone-note">${escapeHtml(d.note)}</p>
      </div>
      <span class="stone-years ${yearsClass(d.years)}"><span class="num">${d.years}</span> ${fmtYears(d.years)}</span>
      <span class="stone-state ${d.state}" data-action="cycle-state" data-n="${d.n}" title="Click to change state">${STATE_LABEL[d.state]}</span>
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
  const stone = stones.find(d => d.n === n);
  if (!stone) return;
  const i = STATE_ORDER.indexOf(stone.state);
  stone.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  saveState();
  renderAll();
}

function removeStone(n) {
  stones = stones.filter(d => d.n !== n);
  stones.forEach((d, i) => { d.n = i + 1; });
  saveState();
  renderAll();
}

function addStone({ course, years, name, state }) {
  const n = stones.length + 1;
  stones.push({
    n,
    course,
    years: Math.max(0, Number(years) || 0),
    state: state || 'found',
    name: name || 'Unnamed stone',
    note: '',
  });
  saveState();
  renderAll();
}

function resetToSeed() {
  stones = SEED.map(d => ({ ...d }));
  project = DEFAULT_PROJECT;
  activeFilter = 'all';
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

document.addEventListener('click', (e) => {
  const cycle = e.target.closest('[data-action="cycle-state"]');
  if (cycle) {
    cycleState(Number(cycle.dataset.n));
    return;
  }
  const filterBtn = e.target.closest('#filters button');
  if (filterBtn) {
    setFilter(filterBtn.dataset.filter);
    return;
  }
});

document.addEventListener('dblclick', (e) => {
  const stone = e.target.closest('.stone');
  if (stone) {
    const n = Number(stone.dataset.n);
    if (confirm('Take this stone off the wall?')) removeStone(n);
  }
});

const projectEl = document.getElementById('chart-project');
if (projectEl) {
  projectEl.addEventListener('click', () => {
    projectEl.setAttribute('contenteditable', 'true');
    projectEl.focus();
    const range = document.createRange();
    range.selectNodeContents(projectEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  projectEl.addEventListener('blur', () => {
    const v = projectEl.textContent.trim();
    project = v || DEFAULT_PROJECT;
    projectEl.removeAttribute('contenteditable');
    saveState();
    renderProject();
  });
  projectEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); projectEl.blur(); }
    if (e.key === 'Escape') { projectEl.textContent = project; projectEl.blur(); }
  });
}

const form = document.getElementById('add-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const course = document.getElementById('add-course').value;
    const years  = document.getElementById('add-years').value;
    const name   = document.getElementById('add-name').value.trim();
    const state  = document.getElementById('add-state').value;
    if (!name) return;
    addStone({ course, years, name, state });
    form.reset();
    document.getElementById('add-name').focus();
  });
}

const resetLink = document.getElementById('reset-demo');
if (resetLink) {
  resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Reset the wall to the original twelve stones? Any changes you have made will be lost.')) {
      resetToSeed();
    }
  });
}

const holdForm = document.getElementById('hold-form');
if (holdForm) {
  holdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = document.getElementById('hold-foot');
    if (foot) foot.textContent = 'Noted. One quiet email when the first walls open.';
    holdForm.reset();
  });
}

renderAll();
