(function () {
  'use strict';

  const SEED = [
    { kind: 'walk',   text: 'The long way home along the canal, after dark, no headphones.' },
    { kind: 'table',  text: 'A pour-over at the corner cafe, with the owner who keeps asking when the book is out.' },
    { kind: 'people', text: 'Coffee with Mira before she moves the studio across town.' },
    { kind: 'quiet',  text: 'The roof above the library, the hour before sunset, alone.' },
    { kind: 'errand', text: 'The Polish grocery on the side street I never went into.' },
    { kind: 'walk',   text: 'Sunday morning at the old market — just the lap, not the shopping.' },
    { kind: 'table',  text: 'One more proper dinner at the place with the wooden booths.' },
    { kind: 'people', text: 'A long phone call with R., on a bench near the bridge.' },
    { kind: 'quiet',  text: 'The chapel courtyard at 7am, when nobody else is in it.' },
    { kind: 'errand', text: 'A real haircut at the place I keep walking past.' },
    { kind: 'walk',   text: 'The hill behind the station, at the hour the city goes orange.' },
    { kind: 'table',  text: 'The pastry I always told myself I would order one day.' },
    { kind: 'people', text: 'A short visit to the neighbours upstairs — the ones who fed the cat.' },
    { kind: 'quiet',  text: 'The reading room at the museum, mid-week, with a notebook and nothing to do.' },
    { kind: 'errand', text: 'Returning the second-hand book that has been on my shelf for two years.' },
    { kind: 'walk',   text: 'A slow loop through the park, in the rain, on purpose.' },
    { kind: 'table',  text: 'Saturday lunch with the family who took me in at the start.' },
    { kind: 'people', text: 'A drink with the old roommate I have not properly seen in a year.' },
    { kind: 'quiet',  text: 'An hour on the bench near the small fountain, just listening.' },
    { kind: 'errand', text: 'The framing shop, finally, for the print my mother gave me.' },
    { kind: 'walk',   text: 'The last morning run along the river, slow, with stops.' },
  ];

  const KIND_LABEL = {
    walk:   'Walk',
    table:  'Table',
    people: 'People',
    errand: 'Errand',
    quiet:  'Quiet',
  };

  const KEPT = 'kept';
  const PASSED = 'passed';
  const OPEN = 'open';
  const STORE_KEY = 'lastlight:v1';

  let entries = loadEntries();
  let activeFilter = 'all';
  let leaveDays = loadLeaveDays();
  let selectedId = null;

  const FILTER_KEYS = {
    '0': 'all',
    '1': 'walk',
    '2': 'table',
    '3': 'people',
    '4': 'errand',
    '5': 'quiet',
  };

  function freshEntries() {
    return SEED.map((row, idx) => ({
      id: 'seed-' + idx,
      kind: row.kind,
      text: row.text,
      state: OPEN,
      seeded: true,
    }));
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return freshEntries();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.entries)) return freshEntries();
      return parsed.entries.map(e => ({
        id: String(e.id || ''),
        kind: String(e.kind || 'walk'),
        text: String(e.text || ''),
        state: e.state === KEPT || e.state === PASSED ? e.state : OPEN,
        seeded: !!e.seeded,
      }));
    } catch (_) {
      return freshEntries();
    }
  }

  function loadLeaveDays() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return 21;
      const parsed = JSON.parse(raw);
      const n = parseInt(parsed && parsed.leaveDays, 10);
      if (!Number.isFinite(n) || n < 3 || n > 30) return 21;
      return n;
    } catch (_) {
      return 21;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        entries: entries,
        leaveDays: leaveDays,
      }));
    } catch (_) {
      /* quota or private mode — ignore */
    }
  }

  function clearStore() {
    try { localStorage.removeItem(STORE_KEY); } catch (_) {}
  }

  // ------------------------------------------------------------------
  // Rendering

  const entriesEl = document.getElementById('entries');
  const totalsEl = document.getElementById('list-totals');
  const filtersEl = document.getElementById('filters');
  const lightFillEl = document.getElementById('light-strip-fill');
  const lightSunEl = document.getElementById('light-strip-sun');
  const lightRemainingEl = document.getElementById('light-remaining');
  const leaveDateInput = document.getElementById('leave-date');
  const leaveDateValueEl = document.getElementById('leave-date-value');
  const addForm = document.getElementById('add-form');
  const addKindEl = document.getElementById('add-kind');
  const addTextEl = document.getElementById('add-text');
  const resetLink = document.getElementById('reset-demo');
  const holdForm = document.getElementById('hold-form');
  const holdFoot = document.getElementById('hold-foot');

  function render() {
    renderEntries();
    renderTotals();
    renderLight();
  }

  function renderEntries() {
    entriesEl.innerHTML = '';
    const visible = entries.filter(e =>
      activeFilter === 'all' ? true : e.kind === activeFilter
    );
    if (visible.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'entry entry-empty';
      empty.textContent = 'Nothing in this kind of light. Add something below.';
      entriesEl.appendChild(empty);
      return;
    }
    for (const entry of visible) {
      entriesEl.appendChild(entryNode(entry));
    }
  }

  function entryNode(entry) {
    const li = document.createElement('li');
    li.className = 'entry entry-' + entry.kind + ' state-' + entry.state;
    if (entry.id === selectedId) li.classList.add('is-selected');
    li.dataset.id = entry.id;
    li.addEventListener('click', evt => {
      if (evt.target.closest('button')) return;
      selectedId = entry.id;
      renderEntries();
    });

    const tag = document.createElement('span');
    tag.className = 'entry-tag';
    tag.textContent = KIND_LABEL[entry.kind];

    const text = document.createElement('p');
    text.className = 'entry-text';
    text.textContent = entry.text;

    const actions = document.createElement('div');
    actions.className = 'entry-actions';

    const keep = document.createElement('button');
    keep.type = 'button';
    keep.className = 'entry-act entry-act-keep';
    keep.textContent = entry.state === KEPT ? 'Kept' : 'Keep';
    keep.setAttribute('aria-pressed', entry.state === KEPT ? 'true' : 'false');
    keep.addEventListener('click', () => toggleState(entry.id, KEPT));

    const pass = document.createElement('button');
    pass.type = 'button';
    pass.className = 'entry-act entry-act-pass';
    pass.textContent = entry.state === PASSED ? 'Passed' : 'Pass';
    pass.setAttribute('aria-pressed', entry.state === PASSED ? 'true' : 'false');
    pass.addEventListener('click', () => toggleState(entry.id, PASSED));

    actions.appendChild(keep);
    actions.appendChild(pass);

    li.appendChild(tag);
    li.appendChild(text);
    li.appendChild(actions);
    return li;
  }

  function renderTotals() {
    const kept = entries.filter(e => e.state === KEPT).length;
    const passed = entries.filter(e => e.state === PASSED).length;
    const open = entries.length - kept - passed;
    totalsEl.innerHTML = '';
    const tot = (label, value, klass) => {
      const block = document.createElement('div');
      block.className = 'totals-tile ' + (klass || '');
      block.innerHTML =
        '<span class="totals-value">' + value + '</span>' +
        '<span class="totals-label">' + label + '</span>';
      totalsEl.appendChild(block);
    };
    tot('open',   open,   'totals-open');
    tot('kept',   kept,   'totals-kept');
    tot('passed', passed, 'totals-passed');
  }

  function renderLight() {
    const pct = Math.max(0, Math.min(100, (leaveDays / 30) * 100));
    lightFillEl.style.width = pct + '%';
    lightSunEl.style.left = pct + '%';
    leaveDateValueEl.textContent = leaveDays + (leaveDays === 1 ? ' day' : ' days');
    lightRemainingEl.textContent = phraseFor(leaveDays);
    if (parseInt(leaveDateInput.value, 10) !== leaveDays) {
      leaveDateInput.value = String(leaveDays);
    }
  }

  function phraseFor(days) {
    if (days <= 3)  return 'almost done';
    if (days <= 7)  return 'this last week';
    if (days <= 14) return 'about two weeks';
    if (days <= 21) return 'about three weeks';
    return 'a long month';
  }

  // ------------------------------------------------------------------
  // Interactions

  function toggleState(id, target) {
    entries = entries.map(e => {
      if (e.id !== id) return e;
      return Object.assign({}, e, {
        state: e.state === target ? OPEN : target,
      });
    });
    persist();
    render();
  }

  filtersEl.addEventListener('click', evt => {
    const btn = evt.target.closest('button[data-filter]');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    [...filtersEl.querySelectorAll('button')].forEach(b => {
      b.classList.toggle('is-active', b === btn);
    });
    renderEntries();
  });

  leaveDateInput.addEventListener('input', evt => {
    leaveDays = parseInt(evt.target.value, 10) || 21;
    persist();
    renderLight();
  });

  addForm.addEventListener('submit', evt => {
    evt.preventDefault();
    const text = addTextEl.value.trim();
    if (!text) return;
    const kind = addKindEl.value;
    entries.push({
      id: 'mine-' + Date.now(),
      kind: kind,
      text: text,
      state: OPEN,
      seeded: false,
    });
    addTextEl.value = '';
    persist();
    render();
  });

  resetLink.addEventListener('click', evt => {
    evt.preventDefault();
    resetDemo();
  });

  // ------------------------------------------------------------------
  // Keyboard shortcuts
  //
  //   J / ArrowDown   next entry            K / ArrowUp     prev entry
  //   Enter           keep selected         P               pass selected
  //   N               focus the add input   Esc             clear selection
  //   1-5             filter by kind        0               all kinds
  //   [ / ]           -/+ one day on leave  R               reset demo
  //
  // Shortcuts are ignored while typing in form fields.

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return target.isContentEditable === true;
  }

  function visibleEntries() {
    return entries.filter(e =>
      activeFilter === 'all' ? true : e.kind === activeFilter
    );
  }

  function moveSelection(step) {
    const v = visibleEntries();
    if (v.length === 0) { selectedId = null; renderEntries(); return; }
    const idx = v.findIndex(e => e.id === selectedId);
    let next;
    if (idx === -1) next = step > 0 ? 0 : v.length - 1;
    else next = (idx + step + v.length) % v.length;
    selectedId = v[next].id;
    renderEntries();
    const el = entriesEl.querySelector('[data-id="' + selectedId + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function setFilter(name) {
    activeFilter = name;
    [...filtersEl.querySelectorAll('button')].forEach(b => {
      b.classList.toggle('is-active', b.dataset.filter === name);
    });
    if (selectedId && !visibleEntries().some(e => e.id === selectedId)) {
      selectedId = null;
    }
    renderEntries();
  }

  function nudgeLeaveDays(delta) {
    const next = Math.max(3, Math.min(30, leaveDays + delta));
    if (next === leaveDays) return;
    leaveDays = next;
    persist();
    renderLight();
  }

  function resetDemo() {
    entries = freshEntries();
    leaveDays = 21;
    activeFilter = 'all';
    selectedId = null;
    [...filtersEl.querySelectorAll('button')].forEach(b => {
      b.classList.toggle('is-active', b.dataset.filter === 'all');
    });
    clearStore();
    render();
  }

  document.addEventListener('keydown', evt => {
    if (evt.metaKey || evt.ctrlKey || evt.altKey) return;
    if (isTyping(evt.target)) return;

    const key = evt.key;

    if (key === 'j' || key === 'ArrowDown') { evt.preventDefault(); moveSelection(1); return; }
    if (key === 'k' || key === 'ArrowUp')   { evt.preventDefault(); moveSelection(-1); return; }

    if (key === 'Enter') {
      if (selectedId) { evt.preventDefault(); toggleState(selectedId, KEPT); }
      return;
    }
    if (key === 'p' || key === 'P') {
      if (selectedId) { evt.preventDefault(); toggleState(selectedId, PASSED); }
      return;
    }
    if (key === 'Escape') {
      if (selectedId) { evt.preventDefault(); selectedId = null; renderEntries(); }
      return;
    }
    if (key === 'n' || key === 'N') {
      evt.preventDefault();
      addTextEl.focus();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(FILTER_KEYS, key)) {
      evt.preventDefault();
      setFilter(FILTER_KEYS[key]);
      return;
    }
    if (key === '[') { evt.preventDefault(); nudgeLeaveDays(-1); return; }
    if (key === ']') { evt.preventDefault(); nudgeLeaveDays(1); return; }
    if (key === 'r' || key === 'R') { evt.preventDefault(); resetDemo(); return; }
  });

  // ------------------------------------------------------------------
  // Hold-a-date form (no network)

  holdForm.addEventListener('submit', evt => {
    evt.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) return;
    holdForm.classList.add('is-held');
    holdFoot.textContent = "Held. We'll email " + email + " once, when the first dates open.";
  });

  // ------------------------------------------------------------------

  render();
})();
