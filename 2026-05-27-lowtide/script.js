// Lowtide — the shore tells the truth.
// Ten seeded finds for an imaginary last week of May 2026
// at a bookbinder's bench in a coast town. The keepers lean
// toward two threads worth pulling into next week; the
// strandings and shells lean around them.

const SEED = [
  { n: 1, kind: 'find', day: 'mon', state: 'kept',
    name: 'A 1908 binder used a thread the supplier no longer lists',
    note: 'Found in two margin notes in the back of the shop ledger. The thread was a 30/3 linen in a dyelot the modern catalog skips. Worth the call to the small mill in Vermont this week.' },
  { n: 2, kind: 'stranding', day: 'mon', state: 'picked',
    name: 'The catalogue copy that has been on the bench three weeks',
    note: 'Two paragraphs the publisher needed last Friday. Not hard. Not interesting. Drag this back to water on Monday before it grows a third week of dust.' },
  { n: 3, kind: 'shell', day: 'tue', state: 'kept',
    name: 'The postcard from a customer in Halifax',
    note: 'A photograph of a book she bound herself, on the kitchen table where she finally tried the case binding from the workshop. No reply needed. Pinned above the press.' },
  { n: 4, kind: 'find', day: 'tue', state: 'kept',
    name: 'The poet wants the cover to be the shape of the page inside',
    note: 'Came up in the Tuesday call almost as an aside. Reframes the whole job. A square book, not a rectangle. Worth a sketch on Wednesday and a single email.' },
  { n: 5, kind: 'stranding', day: 'wed', state: 'noticed',
    name: 'The Wednesday glue order that did not ship',
    note: 'The supplier site says shipped; the post office says no. Could be either. Worth a single email and then nothing until Friday.' },
  { n: 6, kind: 'shell', day: 'wed', state: 'noticed',
    name: 'A student walked in to ask what awl I use',
    note: 'A high school junior, very serious, taking notes in a small book. Showed her the John James #4. Sold her one for a dollar. Worth remembering.' },
  { n: 7, kind: 'find', day: 'thu', state: 'picked',
    name: 'The museum proof has a hairline crack along the spine',
    note: 'Only visible at the angle the afternoon light comes in. Caught it because the light came in. Send a note to the binder upstream before the second proof goes through.' },
  { n: 8, kind: 'stranding', day: 'thu', state: 'returned',
    name: 'The Etsy listing has been at draft since March',
    note: 'It would not have sold. The photos are wrong and the title says nothing. Returned to the tide for now; the river-house job is the work this season.' },
  { n: 9, kind: 'shell', day: 'fri', state: 'noticed',
    name: 'The first swallows came back to the eave above the door',
    note: 'Two of them, on Thursday, busy. Nothing to do about it. Worth marking only because some Fridays it is the swallows that make the week read true.' },
  { n: 10, kind: 'find', day: 'fri', state: 'noticed',
    name: 'The river-house client wants the endpapers from her mother\'s atlas',
    note: 'Mentioned at the end of the Friday call almost in apology. A small ask that is actually the whole job. Worth a half hour on Saturday with the atlas in good light.' },
];

const KIND_GLYPH = {
  find:      '◆',
  stranding: '⌇',
  shell:     '◐',
};

const KIND_LABEL = {
  find:      'Find',
  stranding: 'Stranding',
  shell:     'Shell',
};

const STATE_LABEL = {
  noticed:  'Noticed',
  picked:   'Picked up',
  kept:     'Kept',
  returned: 'Returned',
};

const STATE_ORDER = ['noticed', 'picked', 'kept', 'returned'];

const KIND_COLOR = {
  find:      '#e9b87c',
  stranding: '#6f5a3a',
  shell:     '#7c9aa0',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const STORAGE_KEY = 'lowtide.v1';
const DEFAULT_PROJECT = 'The last week of May · a bookbinder\'s bench in a coast town';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.finds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ finds, project }));
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
let finds = _saved ? _saved.finds.map(s => ({ ...s })) : SEED.map(s => ({ ...s }));
let project = _saved && typeof _saved.project === 'string' ? _saved.project : DEFAULT_PROJECT;
let activeFilter = 'all';
let selectedN = finds.length ? finds[0].n : null;

// ---------- formatting ----------

function normalizeDay(d) {
  const v = String(d || '').toLowerCase().slice(0, 3);
  return DAY_ORDER.includes(v) ? v : 'fri';
}
function dayIndex(d) {
  const i = DAY_ORDER.indexOf(normalizeDay(d));
  return i === -1 ? 0 : i;
}

// ---------- rendering ----------

function renderTotals() {
  const host = document.getElementById('chart-totals');
  if (!host) return;
  const kept    = finds.filter(s => s.state === 'kept').length;
  const picked  = finds.filter(s => s.state === 'picked').length;
  const noticed = finds.filter(s => s.state === 'noticed').length;
  const returned = finds.filter(s => s.state === 'returned').length;
  const onshore = finds.length - returned;

  host.innerHTML = `
    <div class="total">
      <span class="total-num">${kept}<span class="unit">/${onshore}</span></span>
      <span class="total-label">In the basket</span>
    </div>
    <div class="total">
      <span class="total-num">${picked}<span class="unit">in hand</span></span>
      <span class="total-label">Picked up</span>
    </div>
    <div class="total">
      <span class="total-num">${noticed}<span class="unit">on shore</span></span>
      <span class="total-label">Noticed</span>
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

  // finds that are still on the shore (not returned)
  const active = finds.filter(s => s.state !== 'returned');
  const w = 1000;
  const h = 220;

  // a strand band: y around 50 is "high water", y around 200 is "low water"
  const yForState = (state) => {
    switch (state) {
      case 'noticed':  return 60;
      case 'picked':   return 118;
      case 'kept':     return 178;
      default:         return 118;
    }
  };

  // horizontal placement by index across the week
  const padX = 40;
  const n = Math.max(active.length, 1);
  const xFor = (i) => padX + (i / Math.max(1, n - 1)) * (w - padX * 2);

  // the wrack line, where the high tide left things
  const wrackLine = `
    <path d="M0 88 Q120 84 240 88 Q360 92 500 88 Q620 84 760 90 Q880 92 1000 88"
          stroke="rgba(29,34,40,0.32)" stroke-width="0.6"
          stroke-dasharray="2 4" fill="none" />
  `;

  // two large tide pools on the flat
  const pools = `
    <ellipse cx="320" cy="158" rx="92" ry="14" fill="rgba(124, 154, 160, 0.42)" />
    <ellipse cx="320" cy="158" rx="92" ry="14" fill="none" stroke="rgba(29,34,40,0.18)" stroke-width="0.5" />
    <ellipse cx="720" cy="172" rx="120" ry="16" fill="rgba(124, 154, 160, 0.38)" />
    <ellipse cx="720" cy="172" rx="120" ry="16" fill="none" stroke="rgba(29,34,40,0.18)" stroke-width="0.5" />
  `;

  // the present water, pulled all the way to the right edge
  const water = `
    <path d="M940 196 Q970 200 1000 196 L1000 220 L940 220 Z"
          fill="rgba(70, 96, 108, 0.85)" />
    <line x1="940" y1="196" x2="1000" y2="196" stroke="rgba(29,34,40,0.4)" stroke-width="0.5" />
  `;

  // markers per kind
  const markerFor = (s, x, y) => {
    const stateAlpha = {
      noticed:  0.55,
      picked:   1.0,
      kept:     1.0,
      returned: 0.0,
    }[s.state];
    const dashed = s.state === 'noticed' ? 'stroke-dasharray="2 2"' : '';
    const stroke = '#1d2228';

    if (s.kind === 'find') {
      // a small bright shell — a scallop
      return `
        <g opacity="${stateAlpha}">
          <path d="M ${(x - 7).toFixed(1)} ${y.toFixed(1)}
                   q 7 -9 14 0
                   l -1 4 l -2 -2 l -1.4 2 l -1.4 -2 l -1.4 2 l -1.4 -2 l -2 2 Z"
                fill="${KIND_COLOR.find}" stroke="${stroke}" stroke-width="0.5"
                ${dashed} />
        </g>
      `;
    }

    if (s.kind === 'stranding') {
      // a small piece of driftwood, on its side
      return `
        <g opacity="${stateAlpha}">
          <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
                   rx="12" ry="2.4"
                   fill="${KIND_COLOR.stranding}" stroke="${stroke}" stroke-width="0.5"
                   ${dashed} />
          <line x1="${(x - 10).toFixed(1)}" y1="${y.toFixed(1)}"
                x2="${(x + 10).toFixed(1)}" y2="${y.toFixed(1)}"
                stroke="#3a2e1c" stroke-width="0.4" opacity="0.7" />
        </g>
      `;
    }

    // shell: a small periwinkle
    return `
      <g opacity="${stateAlpha}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
                r="4"
                fill="${KIND_COLOR.shell}" stroke="${stroke}" stroke-width="0.5"
                ${dashed} />
        <circle cx="${(x + 0.6).toFixed(1)}" cy="${(y - 0.8).toFixed(1)}"
                r="1.6"
                fill="#3e525c" opacity="0.7" />
      </g>
    `;
  };

  const markers = active.map((s, i) => {
    const x = xFor(i);
    const y = yForState(s.state);
    return markerFor(s, x, y);
  }).join('');

  // a small figure with a basket on the flat
  const walker = `
    <g opacity="0.75">
      <circle cx="60" cy="186" r="2.6" fill="#1d2228" />
      <line x1="60" y1="188" x2="60" y2="198" stroke="#1d2228" stroke-width="0.9" />
      <line x1="60" y1="198" x2="57" y2="204" stroke="#1d2228" stroke-width="0.9" />
      <line x1="60" y1="198" x2="63" y2="204" stroke="#1d2228" stroke-width="0.9" />
      <line x1="60" y1="192" x2="65" y2="195" stroke="#1d2228" stroke-width="0.7" />
      <path d="M65 193 l4 0 l-0.6 4 l-2.8 0 Z"
            fill="#a8853d" stroke="#5a4a2a" stroke-width="0.4" />
    </g>
  `;

  // a couple of gulls
  const gulls = `
    <path d="M180 110 q3 -2 6 0 m0 0 q3 -2 6 0"
          stroke="rgba(29,34,40,0.6)" stroke-width="0.7" fill="none" />
    <path d="M540 96 q3 -2 6 0 m0 0 q3 -2 6 0"
          stroke="rgba(29,34,40,0.5)" stroke-width="0.7" fill="none" />
  `;

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${wrackLine}
      ${pools}
      ${water}
      ${gulls}
      ${markers}
      ${walker}
    </svg>
  `;

  host.querySelectorAll('svg').forEach(s => s.remove());
  host.insertAdjacentHTML('beforeend', svg);
}

function classFor(s) {
  const c = [];
  c.push('find');
  if (s.state === 'kept')                              c.push('is-kept');
  if (s.kind === 'stranding' && s.state === 'noticed') c.push('is-stranding-noticed');
  if (s.state === 'picked')                            c.push('is-current');
  if (s.state === 'returned')                          c.push('returned');
  if (s.n === selectedN)                               c.push('is-selected');
  return c.join(' ');
}

function renderFinds() {
  const host = document.getElementById('finds');
  if (!host) return;
  const filtered = finds.filter(s => activeFilter === 'all' || s.state === activeFilter);

  if (filtered.length === 0) {
    host.innerHTML = `<li style="padding:18px;color:var(--gull);font-family:'JetBrains Mono',monospace;font-size:12px;">No finds in this state.</li>`;
    return;
  }

  host.innerHTML = filtered.map(s => `
    <li class="${classFor(s)}" data-n="${s.n}">
      <span class="find-num">${String(s.n).padStart(2, '0')}</span>
      <span class="find-kind ${s.kind}">
        <span class="glyph" aria-hidden="true">${KIND_GLYPH[s.kind]}</span>
        ${KIND_LABEL[s.kind]}
      </span>
      <div class="find-body">
        <p class="find-name">${escapeHtml(s.name)}</p>
        <p class="find-note">${escapeHtml(s.note)}</p>
      </div>
      <span class="find-day"><span class="num">${normalizeDay(s.day)}</span></span>
      <span class="find-state ${s.state}" data-action="cycle-state" data-n="${s.n}" title="Click to change state">${STATE_LABEL[s.state]}</span>
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
  renderFinds();
}

// ---------- actions ----------

function cycleState(n) {
  const s = finds.find(s => s.n === n);
  if (!s) return;
  const i = STATE_ORDER.indexOf(s.state);
  s.state = STATE_ORDER[(i + 1) % STATE_ORDER.length];
  saveState();
  renderAll();
}

function removeFind(n) {
  finds = finds.filter(s => s.n !== n);
  finds.forEach((s, i) => { s.n = i + 1; });
  saveState();
  renderAll();
}

function addFind({ kind, day, name, state }) {
  const n = finds.length + 1;
  finds.push({
    n,
    kind: kind || 'shell',
    day: normalizeDay(day),
    state: state || 'noticed',
    name: name || 'Unnamed find',
    note: '',
  });
  finds.sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  finds.forEach((s, i) => { s.n = i + 1; });
  saveState();
  renderAll();
}

function resetToSeed() {
  finds = SEED.map(s => ({ ...s }));
  project = DEFAULT_PROJECT;
  activeFilter = 'all';
  selectedN = finds.length ? finds[0].n : null;
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
  renderFinds();
}

function visibleFinds() {
  return finds.filter(s => activeFilter === 'all' || s.state === activeFilter);
}

const FILTER_BY_KEY = { '0': 'all', '1': 'noticed', '2': 'picked', '3': 'kept', '4': 'returned' };

function selectByOffset(delta) {
  const v = visibleFinds();
  if (v.length === 0) return;
  const idx = v.findIndex(s => s.n === selectedN);
  const next = idx === -1
    ? (delta > 0 ? 0 : v.length - 1)
    : Math.max(0, Math.min(v.length - 1, idx + delta));
  selectedN = v[next].n;
  renderFinds();
  scrollSelectedIntoView();
}

function scrollSelectedIntoView() {
  const el = document.querySelector(`.find[data-n="${selectedN}"]`);
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}

function shiftDay(delta) {
  const s = finds.find(s => s.n === selectedN);
  if (!s) return;
  const i = dayIndex(s.day);
  const next = Math.max(0, Math.min(DAY_ORDER.length - 1, i + delta));
  s.day = DAY_ORDER[next];
  finds.sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  finds.forEach((x, j) => { x.n = j + 1; });
  selectedN = finds.indexOf(s) + 1;
  saveState();
  renderAll();
}

function removeSelected() {
  if (selectedN == null) return;
  const v = visibleFinds();
  const idx = v.findIndex(s => s.n === selectedN);
  removeFind(selectedN);
  const v2 = visibleFinds();
  if (v2.length === 0) {
    selectedN = null;
  } else {
    selectedN = v2[Math.min(idx, v2.length - 1)].n;
  }
  renderFinds();
}

function cycleSelectedState() {
  if (selectedN == null) return;
  cycleState(selectedN);
}

// ---------- wiring ----------

function wire() {
  const host = document.getElementById('finds');
  host.addEventListener('click', (e) => {
    const row = e.target.closest('.find');
    if (row) {
      selectedN = Number(row.dataset.n);
      renderFinds();
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
    addFind({ kind, day, name, state });
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
      if (foot) foot.textContent = 'Got it. One quiet email when the first shores open.';
      hold.reset();
    });
  }

  // keyboard shortcuts — skip when typing in an input/contenteditable
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const inField = t && (
      t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      (t.isContentEditable === true)
    );
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const k = e.key;

    if (!inField && (k === 'n' || k === 'N')) {
      e.preventDefault();
      const n = document.getElementById('add-name');
      if (n) n.focus();
      return;
    }

    if (inField) return;

    if (k === 'j' || k === 'J' || k === 'ArrowDown') {
      e.preventDefault();
      selectByOffset(1);
    } else if (k === 'k' || k === 'K' || k === 'ArrowUp') {
      e.preventDefault();
      selectByOffset(-1);
    } else if (k === 'Enter') {
      e.preventDefault();
      cycleSelectedState();
    } else if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      removeSelected();
    } else if (k === '[') {
      e.preventDefault();
      shiftDay(-1);
    } else if (k === ']') {
      e.preventDefault();
      shiftDay(+1);
    } else if (k === 'r' || k === 'R') {
      e.preventDefault();
      resetToSeed();
    } else if (FILTER_BY_KEY[k] !== undefined) {
      e.preventDefault();
      setFilter(FILTER_BY_KEY[k]);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  wire();
});
