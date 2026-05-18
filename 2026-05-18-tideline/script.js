// Tideline — a daily mark for slow, tidal work.
// One hundred and twenty seeded marks across a fictional second-draft
// novel, in roughly the rhythm a real draft moves: a strong opening
// week, a recede in the third, a long pause in February for a flu, a
// storm at the end of March (a friend's funeral), and a slow climb
// out through April and into the bridge scenes of May.

const SEED = [
  // Month 1 — opening, cautious reaches
  { d: 1,  k: 'reach',  t: 'Re-read chapter one; wrote a new opening paragraph that finally sits still.' },
  { d: 2,  k: 'reach',  t: 'Three pages into the bridge scene. The voice is warmer than the first draft.' },
  { d: 3,  k: 'hold',   t: 'Read what I had aloud. Cut nothing. Added nothing.' },
  { d: 4,  k: 'reach',  t: 'Found the right name for the second sister. It was on the kitchen calendar all along.' },
  { d: 5,  k: 'reach',  t: 'A page about the porch. Probably stays.' },
  { d: 6,  k: 'pause',  t: 'Sunday. Walked the long way to the river. Did not open the file.' },
  { d: 7,  k: 'hold',   t: 'Wrote forty words. Stared at the rest. Closed the laptop without losing them.' },
  { d: 8,  k: 'reach',  t: 'Chapter two finally has a middle. The pivot is the letter, not the phone call.' },
  { d: 9,  k: 'reach',  t: 'A page and a half. The mother speaks for the first time.' },
  { d: 10, k: 'recede', t: 'Cut the mother\'s monologue. It was on the nose. Down 320 words.' },
  { d: 11, k: 'hold',   t: 'Re-read the cut. Did not put any of it back.' },
  { d: 12, k: 'reach',  t: 'New monologue, shorter, half spoken to the wall.' },
  { d: 13, k: 'pause',  t: 'Rest day with the work\'s blessing.' },
  { d: 14, k: 'reach',  t: 'Closed chapter two. Onto the train.' },
  { d: 15, k: 'reach',  t: 'The train scene wrote itself in an hour. Suspicious. We\'ll see.' },
  { d: 16, k: 'hold',   t: 'Read it back. Less suspicious. The hour earned it.' },
  { d: 17, k: 'recede', t: 'Pulled apart the ending of the train scene; the wrong character is awake.' },
  { d: 18, k: 'reach',  t: 'New ending: she is asleep, he is the one who sees the field.' },
  { d: 19, k: 'reach',  t: 'Page on the field. Hayfield, not pasture. The book is firmer about its land now.' },
  { d: 20, k: 'pause',  t: 'A friend\'s birthday. A long table, no laptop.' },
  { d: 21, k: 'reach',  t: 'Chapter three opens in the hayfield. Smaller than I planned, which is right.' },
  { d: 22, k: 'hold',   t: 'Edits on what I have. No new ground.' },
  { d: 23, k: 'reach',  t: 'A new minor character arrives — the carpenter from chapter eleven, early.' },
  { d: 24, k: 'reach',  t: 'Two pages in his voice. He sounds like my grandfather; I will not fix that.' },
  { d: 25, k: 'recede', t: 'Took out the carpenter scene. Too early. Saved to the drift folder.' },
  { d: 26, k: 'hold',   t: 'Sat with the chapter as it was before the carpenter walked in.' },
  { d: 27, k: 'reach',  t: 'New middle for chapter three: the letter from the sister.' },
  { d: 28, k: 'reach',  t: 'Letter arrived. Chapter has a heart now.' },
  { d: 29, k: 'pause',  t: 'A long walk. Notebooks closed.' },
  { d: 30, k: 'reach',  t: 'Closed chapter three. Onto winter.' },

  // Month 2 — the flu, then back in
  { d: 31, k: 'reach',  t: 'Winter scene started. Snow on the porch, no metaphor about it.' },
  { d: 32, k: 'reach',  t: 'A second page of winter. The dog finally has a name.' },
  { d: 33, k: 'storm',  t: 'Flu. Fever 102. Could not read my own handwriting.' },
  { d: 34, k: 'storm',  t: 'Flu, day two. Closed the laptop. Did not open it.' },
  { d: 35, k: 'storm',  t: 'Flu, day three. Sleep, water, broth. No mark on the line.' },
  { d: 36, k: 'pause',  t: 'Recovering. Read instead of wrote.' },
  { d: 37, k: 'pause',  t: 'A walk to the corner and back. That was the whole day.' },
  { d: 38, k: 'hold',   t: 'Opened the file. Read what I had. Did not write. That was enough.' },
  { d: 39, k: 'reach',  t: 'Half a page on the dog. The voice was waiting where I left it.' },
  { d: 40, k: 'reach',  t: 'Closed the winter scene. Onto the long February interior chapter.' },
  { d: 41, k: 'hold',   t: 'Three paragraphs. They held.' },
  { d: 42, k: 'reach',  t: 'A page on the kitchen. The boys are arguing about a sink.' },
  { d: 43, k: 'reach',  t: 'The argument becomes about the sister. As planned. Quicker than I planned.' },
  { d: 44, k: 'recede', t: 'Cut the second half of the argument. It was making a point I did not need to make.' },
  { d: 45, k: 'pause',  t: 'Snow day with the kids. No writing. Soup at six.' },
  { d: 46, k: 'reach',  t: 'New ending for the argument scene. Quieter. Better.' },
  { d: 47, k: 'reach',  t: 'A page on the cold attic. The book remembers its season now.' },
  { d: 48, k: 'hold',   t: 'Re-read the chapter. Marked four lines. Did not change them yet.' },
  { d: 49, k: 'reach',  t: 'Changed three of the four lines. Left the fourth.' },
  { d: 50, k: 'reach',  t: 'Half a chapter past the midpoint. The book is no longer a stack of notes.' },
  { d: 51, k: 'pause',  t: 'A weekend off, properly.' },
  { d: 52, k: 'reach',  t: 'Onto chapter six. The interior is starting to want a window.' },
  { d: 53, k: 'reach',  t: 'Window scene. The mother sees the sister in the snow. Probably stays.' },
  { d: 54, k: 'hold',   t: 'No new pages. Cleaned up the punctuation in last week\'s.' },
  { d: 55, k: 'recede', t: 'Pulled the window scene apart. The mother is not the right one to see her.' },
  { d: 56, k: 'reach',  t: 'New window: the youngest brother is the one at the glass.' },
  { d: 57, k: 'reach',  t: 'Brother\'s voice for two pages. Closer to the spine of the book than I expected.' },
  { d: 58, k: 'pause',  t: 'Long walk in the woods. Came back with two sentences in my pocket.' },
  { d: 59, k: 'reach',  t: 'Wrote down the two sentences. They knew where to go.' },
  { d: 60, k: 'reach',  t: 'Chapter six closes. Onto the funeral.' },

  // Month 3 — the storm
  { d: 61, k: 'hold',   t: 'Opened the funeral chapter. Wrote nothing. Sat with it.' },
  { d: 62, k: 'reach',  t: 'Two paragraphs. The carpenter is back. He is the one to bring the chair.' },
  { d: 63, k: 'reach',  t: 'A page on the road to the church.' },
  { d: 64, k: 'storm',  t: 'A friend died. Not in the book. No mark on the page.' },
  { d: 65, k: 'storm',  t: 'Funeral. Could not write. Did not try.' },
  { d: 66, k: 'storm',  t: 'A week of phone calls and casseroles.' },
  { d: 67, k: 'storm',  t: 'Closed the file. Was honest about why.' },
  { d: 68, k: 'pause',  t: 'A long quiet day. Read a different book.' },
  { d: 69, k: 'pause',  t: 'Walked. Cooked. Did not write.' },
  { d: 70, k: 'hold',   t: 'Opened the file. Re-read the funeral chapter as I had left it. Did not write.' },
  { d: 71, k: 'reach',  t: 'A paragraph. The carpenter brings the chair. He does not say anything.' },
  { d: 72, k: 'reach',  t: 'Half a page on the road home from the church.' },
  { d: 73, k: 'recede', t: 'Cut the road home. The chapter wants to end at the door.' },
  { d: 74, k: 'reach',  t: 'New ending at the door. The youngest brother is the last to come inside.' },
  { d: 75, k: 'hold',   t: 'No new pages. Read the chapter aloud. The line is where it needs to be.' },
  { d: 76, k: 'reach',  t: 'Closed the funeral chapter. Onto thaw.' },
  { d: 77, k: 'reach',  t: 'A page on the first warm day. The book is starting to breathe again.' },
  { d: 78, k: 'pause',  t: 'A planned rest day. The work is allowed.' },
  { d: 79, k: 'reach',  t: 'Two pages on the garden. The mother is the gardener.' },
  { d: 80, k: 'reach',  t: 'The garden becomes about the sister, of course. The book knew that.' },
  { d: 81, k: 'hold',   t: 'Read the last two chapters as a unit. They speak.' },
  { d: 82, k: 'reach',  t: 'New scene: the sister calls from far away. The garden listens.' },
  { d: 83, k: 'reach',  t: 'Half a page of the call. Mostly silence. Mostly right.' },
  { d: 84, k: 'recede', t: 'Cut a paragraph of the call. It was filling silence the book wanted to keep.' },
  { d: 85, k: 'hold',   t: 'Read back. The silence held.' },
  { d: 86, k: 'reach',  t: 'A page on the brother in the garden after the call.' },
  { d: 87, k: 'reach',  t: 'Closed the garden chapter. The line is past three quarters of where it needs to go.' },
  { d: 88, k: 'pause',  t: 'A weekend with no book in the bag.' },
  { d: 89, k: 'reach',  t: 'Onto the bridge scenes.' },
  { d: 90, k: 'hold',   t: 'Sat with the structure. Mapped the last four chapters in a notebook.' },

  // Month 4 — bridge scenes, steady climb
  { d: 91,  k: 'reach',  t: 'Bridge one. A road, a phone, a window. Three pages.' },
  { d: 92,  k: 'reach',  t: 'Bridge one closes. Cleaner than I dared.' },
  { d: 93,  k: 'recede', t: 'Re-read bridge one. Cut a page. The bridge is shorter now.' },
  { d: 94,  k: 'reach',  t: 'Bridge two opens. The carpenter is the one who picks up.' },
  { d: 95,  k: 'reach',  t: 'Two pages of bridge two. The phone call goes nowhere on purpose.' },
  { d: 96,  k: 'pause',  t: 'Sunday. River and bread.' },
  { d: 97,  k: 'reach',  t: 'Bridge two closes. The book is at chapter twelve of fourteen now.' },
  { d: 98,  k: 'hold',   t: 'Re-read everything since the funeral. The line holds.' },
  { d: 99,  k: 'reach',  t: 'A page on the return. The sister is on the train.' },
  { d: 100, k: 'reach',  t: 'Day one hundred. A small celebration. A page on the platform.' },
  { d: 101, k: 'reach',  t: 'Platform scene closes. The mother is the one who sees her first.' },
  { d: 102, k: 'recede', t: 'Cut the mother\'s first line at the platform. Less is more.' },
  { d: 103, k: 'hold',   t: 'A re-read day. The platform sits well.' },
  { d: 104, k: 'reach',  t: 'Onto the kitchen scene. Three pages.' },
  { d: 105, k: 'reach',  t: 'Kitchen closes. The carpenter is at the back door.' },
  { d: 106, k: 'pause',  t: 'A long walk after the kitchen. Bread again.' },
  { d: 107, k: 'reach',  t: 'Bridge three. The carpenter and the youngest brother in the workshop.' },
  { d: 108, k: 'reach',  t: 'Workshop scene closes. The book has its quiet center now.' },
  { d: 109, k: 'recede', t: 'Cut a page of workshop. Tightening, mostly.' },
  { d: 110, k: 'reach',  t: 'Onto the last chapter.' },
  { d: 111, k: 'reach',  t: 'Last chapter opens. The garden again, six months on.' },
  { d: 112, k: 'reach',  t: 'A page on the late summer light. Honest. Probably stays.' },
  { d: 113, k: 'hold',   t: 'Re-read the last chapter so far. Slept on it.' },
  { d: 114, k: 'reach',  t: 'Two pages on the dinner. The whole family at one table for the first time.' },
  { d: 115, k: 'reach',  t: 'Dinner closes. The carpenter brings the chair, again.' },
  { d: 116, k: 'pause',  t: 'A weekend with the family, not the book.' },
  { d: 117, k: 'reach',  t: 'A page on the porch after the dinner. The mother and the sister.' },
  { d: 118, k: 'reach',  t: 'The porch scene closes. The book is one scene from done.' },
  { d: 119, k: 'hold',   t: 'Sat with the ending. Did not write it.' },
  { d: 120, k: 'reach',  t: 'Wrote a first ending. It is not the right ending. But it is an ending.' },
];

const KINDS = ['reach', 'hold', 'recede', 'pause', 'storm'];
const KIND_LABELS = {
  reach: 'Reach',
  hold: 'Hold',
  recede: 'Recede',
  pause: 'Pause',
  storm: 'Storm',
};

// Each kind has a "height" the mark contributes to the chart's running
// line. Reaches climb. Recedes dip. Pauses and storms hold the line
// flat. Holds slightly settle (think low tide).
const KIND_DELTA = {
  reach: 1.6,
  hold: 0.1,
  recede: -1.3,
  pause: 0,
  storm: -0.2,
};

const STORAGE_KEY = 'tideline:v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.marks)) return null;
    const marks = data.marks
      .filter((m) => m && typeof m.d === 'number' && KINDS.includes(m.k) && typeof m.t === 'string')
      .map((m) => ({ d: m.d, k: m.k, t: m.t, id: m.id || 'm' + m.d }));
    const projectLength = Number.isFinite(data.projectLength) ? data.projectLength : 180;
    return { marks, projectLength };
  } catch (_e) {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      marks: state.marks,
      projectLength: state.projectLength,
    }));
  } catch (_e) {
    // storage full, private mode, etc. — silently drop.
  }
}

function clearStored() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_e) { /* noop */ }
}

const persisted = loadState();
const state = {
  marks: persisted ? persisted.marks : SEED.map((m) => ({ ...m, id: 'm' + m.d })),
  projectLength: persisted ? persisted.projectLength : 180,
  filter: 'all',
  selectedId: null,
};

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function lineSeries() {
  // running cumulative line, smoothed
  let h = 0;
  return state.marks
    .slice()
    .sort((a, b) => a.d - b.d)
    .map((m) => {
      h += KIND_DELTA[m.k] ?? 0;
      return { d: m.d, h, k: m.k };
    });
}

function renderChart() {
  const wrap = $('#line-chart');
  wrap.innerHTML = '';

  const series = lineSeries();
  if (!series.length) return;

  const dMax = state.projectLength;
  const padX = 14;
  const padY = 16;

  const hMin = Math.min(0, ...series.map((p) => p.h));
  const hMax = Math.max(2, ...series.map((p) => p.h));
  const range = Math.max(1, hMax - hMin);

  const w = wrap.clientWidth || 800;
  const h = wrap.clientHeight || 160;

  const xOf = (d) => padX + ((d - 1) / Math.max(1, dMax - 1)) * (w - padX * 2);
  const yOf = (hv) => padY + (1 - (hv - hMin) / range) * (h - padY * 2);

  // baseline (the strand itself)
  const baseline = el('span', { class: 'chart-baseline' });
  wrap.appendChild(baseline);

  // line svg
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'chart-line');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(svgNS, 'path');
  let dAttr = '';
  series.forEach((p, i) => {
    const x = xOf(p.d);
    const y = yOf(p.h);
    dAttr += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  });
  path.setAttribute('d', dAttr.trim());
  svg.appendChild(path);
  wrap.appendChild(svg);

  // points
  series.forEach((p) => {
    const point = el('span', { class: `chart-point ${p.k}` });
    point.style.left = xOf(p.d) + 'px';
    point.style.bottom = (h - yOf(p.h)) + 'px';
    point.title = `Day ${p.d} · ${KIND_LABELS[p.k]}`;
    wrap.appendChild(point);
  });
}

function renderMarks() {
  const list = $('#marks');
  list.innerHTML = '';
  const sorted = state.marks.slice().sort((a, b) => b.d - a.d);
  const filtered = state.filter === 'all' ? sorted : sorted.filter((m) => m.k === state.filter);
  if (!filtered.length) {
    list.appendChild(el('li', { class: 'is-empty' },
      el('span', { class: 'mark-swatch', style: 'opacity:0' }),
      el('span', { class: 'mark-text', style: 'color: var(--stone)' }, 'No marks of this kind yet.'),
      el('span', { class: 'mark-day' }, ''),
      el('span', { class: 'mark-actions' })
    ));
    return;
  }
  for (const m of filtered) {
    const isSelected = m.id === state.selectedId;
    const cls = 'kind-' + m.k + (isSelected ? ' is-selected' : '');
    const li = el('li', { class: cls, dataset: { id: m.id } },
      el('span', { class: 'mark-swatch' }),
      el('span', { class: 'mark-text' }, m.t),
      el('span', { class: 'mark-day' }, 'Day ' + m.d),
      el('span', { class: 'mark-actions' },
        el('button', { type: 'button', dataset: { action: 'cycle' }, title: 'Change kind' }, KIND_LABELS[m.k]),
        el('button', { type: 'button', dataset: { action: 'remove' }, title: 'Remove' }, '×')
      )
    );
    list.appendChild(li);
  }
  if (state.selectedId) {
    const sel = list.querySelector('li.is-selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
}

function renderTotals() {
  const totals = KINDS.map((k) => ({ k, n: state.marks.filter((m) => m.k === k).length }));
  const wrap = $('#strand-totals');
  wrap.innerHTML = '';
  for (const { k, n } of totals) {
    if (!n) continue;
    wrap.appendChild(el('span', { class: 'tot ' + k }, n + ' ' + KIND_LABELS[k].toLowerCase()));
  }
}

function renderProject() {
  const len = state.projectLength;
  const day = Math.min(state.marks.length ? Math.max(...state.marks.map((m) => m.d)) : 0, len);
  $('#project-length-value').textContent = len + ' days';
  $('#line-day').textContent = 'Day ' + day + ' of ' + len;

  const longest = len <= 120 ? 'A short novel' : len <= 180 ? 'A second-draft novel' : 'A long, slow project';
  $('#strand-project').textContent = longest + ' · ' + len + ' days';
}

function renderAll() {
  renderProject();
  renderTotals();
  renderMarks();
  renderChart();
}

function nextDay() {
  if (!state.marks.length) return 1;
  return Math.min(Math.max(...state.marks.map((m) => m.d)) + 1, state.projectLength);
}

function cycleKind(k) {
  const i = KINDS.indexOf(k);
  return KINDS[(i + 1) % KINDS.length];
}

function attachMarkActions() {
  $('#marks').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    const m = state.marks.find((x) => x.id === id);
    if (!m) return;
    const btn = e.target.closest('button[data-action]');
    if (btn) {
      if (btn.dataset.action === 'remove') {
        state.marks = state.marks.filter((x) => x.id !== id);
        if (state.selectedId === id) state.selectedId = null;
      } else if (btn.dataset.action === 'cycle') {
        m.k = cycleKind(m.k);
        state.selectedId = id;
      }
      saveState();
      renderAll();
      return;
    }
    state.selectedId = id;
    renderMarks();
  });
}

function attachFilters() {
  $('#filters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    $$('#filters button').forEach((b) => b.classList.toggle('is-active', b === btn));
    renderMarks();
  });
}

function attachAdd() {
  $('#add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const kind = $('#add-kind').value;
    const text = $('#add-text').value.trim();
    if (!text) return;
    const d = nextDay();
    state.marks.push({ id: 'm' + Date.now(), d, k: kind, t: text });
    $('#add-text').value = '';
    saveState();
    renderAll();
  });
}

function attachLength() {
  $('#project-length').addEventListener('input', (e) => {
    state.projectLength = parseInt(e.target.value, 10) || 180;
    state.marks = state.marks.filter((m) => m.d <= state.projectLength);
    saveState();
    renderAll();
  });
}

function attachReset() {
  $('#reset-demo').addEventListener('click', (e) => {
    e.preventDefault();
    state.marks = SEED.map((m) => ({ ...m, id: 'm' + m.d }));
    state.projectLength = 180;
    state.filter = 'all';
    $('#project-length').value = 180;
    $$('#filters button').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === 'all'));
    clearStored();
    renderAll();
  });
}

function attachHold() {
  $('#hold-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const foot = $('#hold-foot');
    foot.textContent = 'Held. We will write once, when the first strands open. No newsletter.';
  });
}

function visibleMarks() {
  const sorted = state.marks.slice().sort((a, b) => b.d - a.d);
  return state.filter === 'all' ? sorted : sorted.filter((m) => m.k === state.filter);
}

function moveSelection(delta) {
  const list = visibleMarks();
  if (!list.length) { state.selectedId = null; return; }
  const i = state.selectedId ? list.findIndex((m) => m.id === state.selectedId) : -1;
  let next;
  if (i === -1) {
    next = delta > 0 ? 0 : list.length - 1;
  } else {
    next = Math.max(0, Math.min(list.length - 1, i + delta));
  }
  state.selectedId = list[next].id;
}

function setFilter(name) {
  state.filter = name;
  $$('#filters button').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === name));
  const list = visibleMarks();
  if (state.selectedId && !list.some((m) => m.id === state.selectedId)) {
    state.selectedId = null;
  }
  renderMarks();
}

function nudgeLength(delta) {
  const input = $('#project-length');
  const step = parseInt(input.step, 10) || 10;
  const min = parseInt(input.min, 10) || 90;
  const max = parseInt(input.max, 10) || 240;
  const next = Math.max(min, Math.min(max, state.projectLength + delta * step));
  if (next === state.projectLength) return;
  state.projectLength = next;
  state.marks = state.marks.filter((m) => m.d <= state.projectLength);
  input.value = next;
  saveState();
  renderAll();
}

function resetEverything() {
  state.marks = SEED.map((m) => ({ ...m, id: 'm' + m.d }));
  state.projectLength = 180;
  state.filter = 'all';
  state.selectedId = null;
  $('#project-length').value = 180;
  $$('#filters button').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === 'all'));
  clearStored();
  renderAll();
}

const FILTER_KEYS = { '0': 'all', '1': 'reach', '2': 'hold', '3': 'recede', '4': 'pause', '5': 'storm' };

function attachKeys() {
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const key = e.key;
    if (key === 'j' || key === 'J' || key === 'ArrowDown') {
      e.preventDefault(); moveSelection(1); renderMarks(); return;
    }
    if (key === 'k' || key === 'K' || key === 'ArrowUp') {
      e.preventDefault(); moveSelection(-1); renderMarks(); return;
    }
    if (key === 'Enter') {
      if (!state.selectedId) return;
      const m = state.marks.find((x) => x.id === state.selectedId);
      if (!m) return;
      e.preventDefault();
      m.k = cycleKind(m.k);
      saveState();
      renderAll();
      return;
    }
    if (key === 'Backspace' || key === 'Delete') {
      if (!state.selectedId) return;
      e.preventDefault();
      const id = state.selectedId;
      const list = visibleMarks();
      const i = list.findIndex((m) => m.id === id);
      state.marks = state.marks.filter((x) => x.id !== id);
      const after = visibleMarks();
      state.selectedId = after.length ? after[Math.min(i, after.length - 1)].id : null;
      saveState();
      renderAll();
      return;
    }
    if (key === 'n' || key === 'N') {
      e.preventDefault();
      $('#add-text').focus();
      return;
    }
    if (key === '[') { e.preventDefault(); nudgeLength(-1); return; }
    if (key === ']') { e.preventDefault(); nudgeLength(1); return; }
    if (key === 'r' || key === 'R') { e.preventDefault(); resetEverything(); return; }
    if (FILTER_KEYS[key] != null) { e.preventDefault(); setFilter(FILTER_KEYS[key]); }
  });
}

function bootstrap() {
  $('#project-length').value = state.projectLength;
  attachFilters();
  attachAdd();
  attachLength();
  attachReset();
  attachMarkActions();
  attachHold();
  attachKeys();
  renderAll();
  window.addEventListener('resize', renderChart);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
