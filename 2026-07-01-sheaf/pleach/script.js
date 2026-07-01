/* Pleach — the line.
 *
 * A small, capped board for the few things you are laying into something
 * living. Each stem sits on two axes: how far along the line it has been
 * worked (standing → cut → laid → bound) and how well it has taken (whippy →
 * set → knitting → stockproof). The two are not the same thing: a stem can be
 * bound into the line and still whippy, or knitting hard but never yet cut.
 *
 * A layer works only the length he can bind before the sap rises. Six stems,
 * and no more. When the line is full the next stem stays standing until one is
 * bound and knitting on its own — take on more than you can bind and the whole
 * line dies back in the spring.
 */

(function () {
  'use strict';

  var CAP = 6;

  var STAGES = [
    { key: 'standing', label: 'Standing', cls: 'stage-standing', chip: 'chip-standing' },
    { key: 'cut',      label: 'Cut',      cls: 'stage-cut',      chip: 'chip-cut' },
    { key: 'laid',     label: 'Laid',     cls: 'stage-laid',     chip: 'chip-laid' },
    { key: 'bound',    label: 'Bound',    cls: 'stage-bound',    chip: 'chip-bound' }
  ];

  var CONDS = [
    { key: 'whippy',     label: 'Whippy',     chip: 'chip-whippy' },
    { key: 'set',        label: 'Set',        chip: 'chip-set' },
    { key: 'knitting',   label: 'Knitting',   chip: 'chip-knitting' },
    { key: 'stockproof', label: 'Stockproof', chip: 'chip-stockproof' }
  ];

  // a fictional hedge partway through a winter's laying — variety, not a full line
  var SEED = {
    name: 'Long Meadow',
    stems: [
      { id: id(), title: 'The marriage, twelve years in',   stage: 3, cond: 3 },
      { id: id(), title: 'Teaching the boy to fish',         stage: 2, cond: 2 },
      { id: id(), title: 'The allotment down the lane',      stage: 2, cond: 1 },
      { id: id(), title: 'Getting the knee strong again',    stage: 1, cond: 1 },
      { id: id(), title: 'That friendship I keep meaning to', stage: 0, cond: 0 }
    ]
  };

  var state = clone(SEED);
  var selected = 0;

  // --- elements ---
  var $stems = document.getElementById('stems');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('line-count');
  var $name = document.getElementById('line-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function condIcon(cond) {
    // a small glyph for how the stem has taken
    if (cond === 0) return svg('<path d="M8 14 C8 9 6 7 9 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'); // whippy — a single loose upright, no side growth
    if (cond === 1) return svg('<path d="M8 14 V4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="4" r="1.3" fill="currentColor"/>'); // set — grown a leader with a live bud
    if (cond === 2) return svg('<path d="M8 14 V3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 9 C5 8 4 6 4 5 M8 7 C11 6 12 4 12 3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'); // knitting — throwing side shoots into the line
    return svg('<path d="M8 14 V3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M8 10 C5 9 4 7 4 6 M8 8 C11 7 12 5 12 4 M8 12 C6 11.5 5 10.5 5 9 M8 6 C10 5.5 11 4.5 11 3" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'); // stockproof — dense, woven, a bullock won't push through
  }

  function stageGlyph(si) {
    // the same line on every button, the stem moving from standing upright at
    // the near end to laid and bound down along the line as the stage advances
    var ground = '<path d="M2 13 H14" stroke="currentColor" stroke-width="1" opacity="0.5" stroke-linecap="round"/>';
    var forms = [
      '<path d="M4 13 V4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',                                                  // standing — upright at the near end
      '<path d="M4 13 L4 8 L8 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',       // cut — half-cut low and beginning to lean
      '<path d="M4 13 C7 9 11 8 14 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',                          // laid — bent right down along the line
      '<path d="M4 13 C7 9 11 8 14 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 6 L11 10" stroke="currentColor" stroke-width="1" opacity="0.7" stroke-linecap="round"/>' // bound — laid, with a binder woven across the top
    ];
    return svg(ground + forms[si]);
  }

  // --- model helpers ---
  function id() { return 's' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // --- render ---
  function render() {
    if (selected >= state.stems.length) selected = state.stems.length - 1;
    if (selected < 0) selected = 0;

    $stems.innerHTML = '';
    state.stems.forEach(function (s, i) {
      $stems.appendChild(row(s, i));
    });

    var n = state.stems.length;
    $count.textContent = n + ' / ' + CAP + ' in the line';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The line is full — bind one in before you set another'
      : 'Bring a stem into the line…';
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'stem ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to work it (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'stem-mark';
    mark.type = 'button';
    mark.innerHTML = condIcon(s.cond);
    mark.title = 'Work it (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'stem-body';
    var title = document.createElement('div');
    title.className = 'stem-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'stem-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the line
    var stages = document.createElement('div');
    stages.className = 'stem-stages';
    STAGES.forEach(function (st, si) {
      var b = document.createElement('button');
      b.className = 'stage-btn' + (si === s.stage ? ' on' : '');
      b.type = 'button';
      b.innerHTML = stageGlyph(si);
      b.title = 'Move to ' + st.label;
      b.setAttribute('aria-label', 'Move to ' + st.label);
      b.addEventListener('click', function (e) { e.stopPropagation(); selected = i; setStage(i, si); });
      stages.appendChild(b);
    });
    var go = document.createElement('button');
    go.className = 'stem-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Take it out of the line';
    go.addEventListener('click', function (e) { e.stopPropagation(); pullOut(i); });
    stages.appendChild(go);

    li.appendChild(mark);
    li.appendChild(body);
    li.appendChild(stages);
    return li;
  }

  function chip(text, cls) {
    var s = document.createElement('span');
    s.className = 'chip ' + cls;
    s.textContent = text;
    return s;
  }

  // --- edit a title in place ---
  function edit(i, titleEl) {
    var s = state.stems[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'stem-edit';
    input.value = s.title;
    input.maxLength = 80;
    titleEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    var done = function (commit) {
      if (commit) {
        var v = input.value.trim();
        if (v) s.title = v.slice(0, 80);
      }
      render();
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); done(true); }
      else if (e.key === 'Escape') { e.preventDefault(); done(false); }
      e.stopPropagation();
    });
    input.addEventListener('blur', function () { done(true); });
  }

  // --- mutations ---
  function bumpCond(i, dir) {
    var s = state.stems[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.stems[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function pullOut(i) {
    var s = state.stems[i];
    if (!s) return;
    var li = $stems.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.stems.splice(i, 1);
    if (selected >= state.stems.length) selected = state.stems.length - 1;
    render();
  }
  function add(text) {
    if (state.stems.length >= CAP) {
      flashFull();
      return;
    }
    state.stems.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.stems.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The line is full. Bind a stem in and let it knit before you set another.';
    setTimeout(function () { $hint.textContent = old; }, 2600);
  }

  // --- name rename ---
  $name.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); $name.blur(); }
  });
  $name.addEventListener('blur', function () {
    var v = $name.textContent.trim().slice(0, 40);
    state.name = v || SEED.name;
    $name.textContent = state.name;
  });

  // --- add form ---
  $form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $input.value.trim();
    if (!v) return;
    add(v);
    $input.value = '';
  });

  render();
})();
