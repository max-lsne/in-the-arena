/* Couch — the floor.
 *
 * A small, capped board for the few things you are bringing to malt. Each
 * couch sits on two axes: how far through the floor it has come (steeped →
 * couched → floored → kilned) and how it is faring as it works (slack →
 * chitting → working → mellow). The two are not the same thing: a couch can
 * be well onto the floor and gone slack, or chitting hard but only just
 * steeped.
 *
 * The floor holds only so much that a pair of hands can turn. Six, and no
 * more. When it is full the next crop waits in the steep until a couch comes
 * off to the kiln — heap on more than you can turn and the floor heats and
 * mats.
 */

(function () {
  'use strict';

  var STORE_KEY = 'couch.v1';
  var CAP = 6;

  var STAGES = [
    { key: 'steeped', label: 'Steeped', cls: 'stage-steeped', chip: 'chip-steeped' },
    { key: 'couched', label: 'Couched', cls: 'stage-couched', chip: 'chip-couched' },
    { key: 'floored', label: 'Floored', cls: 'stage-floored', chip: 'chip-floored' },
    { key: 'kilned',  label: 'Kilned',  cls: 'stage-kilned',  chip: 'chip-kilned' }
  ];

  var CONDS = [
    { key: 'slack',    label: 'Slack',    chip: 'chip-slack' },
    { key: 'chitting', label: 'Chitting', chip: 'chip-chitting' },
    { key: 'working',  label: 'Working',  chip: 'chip-working' },
    { key: 'mellow',   label: 'Mellow',   chip: 'chip-mellow' }
  ];

  // a fictional floor partway through a working week — variety, not a full run
  var SEED = {
    name: 'Snape Floor',
    couches: [
      { id: id(), title: 'The book, second draft',        stage: 2, cond: 2 },
      { id: id(), title: 'Sourdough starter, kept awake',  stage: 3, cond: 3 },
      { id: id(), title: 'Learning to read music again',   stage: 1, cond: 1 },
      { id: id(), title: 'The garden bed by the wall',      stage: 1, cond: 2 },
      { id: id(), title: 'That course I keep half-opening', stage: 0, cond: 0 }
    ]
  };

  var state = load();
  var selected = 0;

  // --- elements ---
  var $couches = document.getElementById('couches');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('floor-count');
  var $name = document.getElementById('floor-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function condIcon(cond) {
    // a small glyph for how the couch is faring on the floor
    if (cond === 0) return svg('<path d="M3 8 H13" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M5 5 V11 M11 5 V11" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.5"/>'); // slack — a flat, dormant bed
    if (cond === 1) return svg('<path d="M8 13 V7" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M8 9 C6 8 5 6 6 5 C8 5 8 7 8 8" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'); // chitting — a single rootlet breaking
    if (cond === 2) return svg('<path d="M8 14 V6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M8 8 C5 7 4 5 5 3 C8 4 8 6 8 7 M8 9 C11 8 12 6 11 4 C8 5 8 7 8 8" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'); // working — the acrospire growing both ways
    return svg('<path d="M8 14 V4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M8 7 C5 6 4 4 5 2 C8 3 8 5 8 6 M8 8 C11 7 12 5 11 3 C8 4 8 6 8 7" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="12.5" r="1.1" fill="currentColor"/>'); // mellow — grown even, the grain sweet and ready
  }

  function stageGlyph(si) {
    // the same floor on every button, with the couch heaped and moving across
    // it as the stage advances — steeped low and wet, kilned dried off the far end
    var floor = '<path d="M2 12 H14" stroke="currentColor" stroke-width="1" opacity="0.5" stroke-linecap="round"/>';
    var heaps = [
      '<path d="M3 12 C4.5 9.5 6.5 9.5 8 12 Z" fill="currentColor" opacity="0.8"/>',                                   // steeped — heaped wet at the near end
      '<path d="M6 12 C7.5 8.5 9.5 8.5 11 12 Z" fill="currentColor" opacity="0.85"/>',                                 // couched — bigger heap, chitting
      '<path d="M4 12 C6 10 10 10 12 12 Z" fill="currentColor" opacity="0.9"/>',                                        // floored — spread thin and wide
      '<path d="M9 12 C10.5 9 12.5 9 14 12 Z" fill="currentColor"/><path d="M9.5 6 C9 5 10 4.5 9.5 3.5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6" stroke-linecap="round"/>' // kilned — dried at the kiln end, a wisp coming off
    ];
    return svg(floor + heaps[si]);
  }

  // --- model helpers ---
  function id() { return 'c' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clampInt(n, lo, hi) { n = parseInt(n, 10); if (isNaN(n)) return lo; return Math.max(lo, Math.min(hi, n)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(SEED);
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.couches)) return clone(SEED);
      parsed.couches = parsed.couches.slice(0, CAP).map(function (c) {
        return {
          id: c.id || id(),
          title: String(c.title || '').slice(0, 80),
          stage: clampInt(c.stage, 0, 3),
          cond: clampInt(c.cond, 0, 3)
        };
      });
      if (typeof parsed.name !== 'string' || !parsed.name) parsed.name = SEED.name;
      return parsed;
    } catch (e) {
      return clone(SEED);
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // --- render ---
  function render() {
    if (selected >= state.couches.length) selected = state.couches.length - 1;
    if (selected < 0) selected = 0;

    $couches.innerHTML = '';
    state.couches.forEach(function (c, i) {
      $couches.appendChild(row(c, i));
    });

    var n = state.couches.length;
    $count.textContent = n + ' / ' + CAP + ' on the floor';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The floor is full — take a couch off to the kiln first'
      : 'Steep something onto the floor…';

    save();
  }

  function row(c, i) {
    var stage = STAGES[c.stage];
    var cond = CONDS[c.cond];

    var li = document.createElement('li');
    li.className = 'couch ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to turn it (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'couch-mark';
    mark.type = 'button';
    mark.innerHTML = condIcon(c.cond);
    mark.title = 'Turn it (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'couch-body';
    var title = document.createElement('div');
    title.className = 'couch-title';
    title.textContent = c.title;
    var tags = document.createElement('div');
    tags.className = 'couch-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it across the floor
    var stages = document.createElement('div');
    stages.className = 'couch-stages';
    STAGES.forEach(function (s, si) {
      var b = document.createElement('button');
      b.className = 'stage-btn' + (si === c.stage ? ' on' : '');
      b.type = 'button';
      b.innerHTML = stageGlyph(si);
      b.title = 'Move to ' + s.label;
      b.setAttribute('aria-label', 'Move to ' + s.label);
      b.addEventListener('click', function (e) { e.stopPropagation(); selected = i; setStage(i, si); });
      stages.appendChild(b);
    });
    var go = document.createElement('button');
    go.className = 'couch-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Take it off to the kiln';
    go.addEventListener('click', function (e) { e.stopPropagation(); takeOff(i); });
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
    var c = state.couches[i];
    if (!c) return;
    var input = document.createElement('input');
    input.className = 'couch-edit';
    input.value = c.title;
    input.maxLength = 80;
    titleEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    var done = function (commit) {
      if (commit) {
        var v = input.value.trim();
        if (v) c.title = v.slice(0, 80);
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
    var c = state.couches[i];
    if (!c) return;
    c.cond = clamp(c.cond + dir, 0, 3);
    render();
  }
  function setStage(i, s) {
    var c = state.couches[i];
    if (!c) return;
    c.stage = clamp(s, 0, 3);
    render();
  }
  function takeOff(i) {
    var c = state.couches[i];
    if (!c) return;
    var li = $couches.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.couches.splice(i, 1);
    if (selected >= state.couches.length) selected = state.couches.length - 1;
    render();
  }
  function add(text) {
    if (state.couches.length >= CAP) {
      flashFull();
      return;
    }
    state.couches.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.couches.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The floor is overheating. Take a couch off to the kiln before you steep another.';
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
    save();
  });

  // --- reset: double-click the count to clear the floor back to the example ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the floor back to the example run?')) {
      state = clone(SEED);
      selected = 0;
      render();
    }
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
