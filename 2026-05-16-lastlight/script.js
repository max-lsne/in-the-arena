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

  let entries = freshEntries();
  let activeFilter = 'all';
  let leaveDays = 21;

  function freshEntries() {
    return SEED.map((row, idx) => ({
      id: 'seed-' + idx,
      kind: row.kind,
      text: row.text,
      state: OPEN,
      seeded: true,
    }));
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
    li.dataset.id = entry.id;

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
    render();
  });

  resetLink.addEventListener('click', evt => {
    evt.preventDefault();
    entries = freshEntries();
    leaveDays = 21;
    leaveDateInput.value = '21';
    activeFilter = 'all';
    [...filtersEl.querySelectorAll('button')].forEach(b => {
      b.classList.toggle('is-active', b.dataset.filter === 'all');
    });
    render();
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
