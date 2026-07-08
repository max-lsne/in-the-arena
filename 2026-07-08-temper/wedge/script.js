/* Wedge — the board.
 *
 * A small, capped board for the few things you are making sound by wedging the
 * body whole before the wheel. Each ball sits on two axes: how far along the
 * clay has come (wet → wedging → evened → thrown) and how the body is working
 * right now (short → airy → slack → plastic). The two are not the same reading:
 * a ball can be well into the wedging and still airy — worked, but not yet clear
 * of its trapped air — or freshly reclaimed and left short, good clay waiting,
 * not yet evened and not yet slammed together wet.
 *
 * A potter wedges only as many balls as his arms can truly even. Six, and no
 * more. When the board is full the next lump waits wet and covered, off the
 * board, until one ball has been wedged even and thrown — set out more than you
 * can even and the far balls go to the wheel full of hidden air.
 */

(function () {
  'use strict';

  var CAP = 6;

  var STAGES = [
    { key: 'wet',     label: 'Wet',     cls: 'stage-wet',     chip: 'chip-wet' },
    { key: 'wedging', label: 'Wedging', cls: 'stage-wedging', chip: 'chip-wedging' },
    { key: 'evened',  label: 'Evened',  cls: 'stage-evened',  chip: 'chip-evened' },
    { key: 'thrown',  label: 'Thrown',  cls: 'stage-thrown',  chip: 'chip-thrown' }
  ];

  var CONDS = [
    { key: 'short',   label: 'Short',   chip: 'chip-short' },
    { key: 'airy',    label: 'Airy',    chip: 'chip-airy' },
    { key: 'slack',   label: 'Slack',   chip: 'chip-slack' },
    { key: 'plastic', label: 'Plastic', chip: 'chip-plastic' }
  ];

  // a fictional board partway through a wedging — variety, not a full run of balls
  var SEED = {
    name: 'Wedging Board',
    balls: [
      { id: id(), title: 'The mugs for the market stall',        stage: 2, cond: 3 },
      { id: id(), title: 'A reply, wedged before I answer',      stage: 1, cond: 1 },
      { id: id(), title: 'The bowl I threw off-true on hidden air', stage: 0, cond: 1 },
      { id: id(), title: 'A hard week, wedged whole and slow',    stage: 2, cond: 3 },
      { id: id(), title: 'The reclaim bucket, still too slack',   stage: 0, cond: 2 }
    ]
  };

  var state = clone(SEED);
  var selected = 0;

  // --- elements ---
  var $balls = document.getElementById('balls');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('ball-count');
  var $name = document.getElementById('board-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function bodyIcon(cond) {
    // a ball of clay on the board, and how the body is working right now
    var base = '<path d="M2.5 13 H13.5" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.6"/>';
    if (cond === 0) return svg(base + '<path d="M4 13 C4 8.5 6 6.5 8 6.5 C10 6.5 12 8.5 12 13 Z" fill="currentColor" opacity="0.24"/><path d="M8 7 L7 10 L9 10.6 L8 13" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>'); // short — a dry mound, cracked
    if (cond === 1) return svg(base + '<path d="M4 13 C4 8.5 6 6.5 8 6.5 C10 6.5 12 8.5 12 13 Z" fill="currentColor" opacity="0.24"/><circle cx="8.6" cy="10" r="1.7" fill="none" stroke="currentColor" stroke-width="1"/>'); // airy — a mound with a pocket of trapped air
    if (cond === 2) return svg(base + '<path d="M2.6 13 C2.6 10.5 5 9.2 8 9.2 C11 9.2 13.4 10.5 13.4 13 Z" fill="currentColor" opacity="0.3"/>'); // slack — a wet, slumping puddle
    return svg(base + '<path d="M3.8 13 C3.8 8.2 6 6 8 6 C10 6 12.2 8.2 12.2 13 Z" fill="currentColor" opacity="0.4"/>'); // plastic — a smooth, firm, even ball
  }

  function stageGlyph(si) {
    // the same ball taken along the wedging — a rough wet lump, cut and worked,
    // evened to a smooth body, then thrown up into a pot
    var ground = '<path d="M2 14 H14" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-linecap="round"/>';
    var forms = [
      '<path d="M4.5 13.5 L4 10 L6.5 8.5 L10 9 L11.8 11.5 L9 13.6 Z" fill="currentColor" opacity="0.55"/>',                                                                                     // wet — a rough, lumpen mass
      '<path d="M4.2 13.5 C4.2 9.5 6 7.8 8 7.8 C10 7.8 11.8 9.5 11.8 13.5 Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 12 C7 10.5 9 10.5 10 11.6" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>', // wedging — a mound with the wedging spiral worked in
      '<path d="M4 13.5 C4 9 6.2 7 8 7 C9.8 7 12 9 12 13.5 Z" fill="currentColor" opacity="0.5" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/>',                             // evened — a smooth, even ball
      '<path d="M4.5 13.5 C4.5 11 5.5 10 6 9 L5.4 7 H10.6 L10 9 C10.5 10 11.5 11 11.5 13.5 Z" fill="currentColor" opacity="0.5" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/>' // thrown — a pot come up on the wheel
    ];
    return svg(ground + forms[si]);
  }

  // --- model helpers ---
  function id() { return 'w' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // --- render ---
  function render() {
    if (selected >= state.balls.length) selected = state.balls.length - 1;
    if (selected < 0) selected = 0;

    $balls.innerHTML = '';
    state.balls.forEach(function (s, i) {
      $balls.appendChild(row(s, i));
    });

    var n = state.balls.length;
    $count.textContent = n + ' / ' + CAP + ' on the board';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The board is full — throw a ball and take it off first'
      : 'Set a ball on the board…';
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'ball ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // body mark — click to read the body on (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'ball-mark';
    mark.type = 'button';
    mark.innerHTML = bodyIcon(s.cond);
    mark.title = 'Read the body (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'ball-body';
    var title = document.createElement('div');
    title.className = 'ball-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'ball-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the wedging
    var stages = document.createElement('div');
    stages.className = 'ball-stages';
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
    go.className = 'ball-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Throw it and take it off';
    go.addEventListener('click', function (e) { e.stopPropagation(); throwOff(i); });
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
    var s = state.balls[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'ball-edit';
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
    var s = state.balls[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.balls[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function throwOff(i) {
    var s = state.balls[i];
    if (!s) return;
    var li = $balls.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.balls.splice(i, 1);
    if (selected >= state.balls.length) selected = state.balls.length - 1;
    render();
  }
  function add(text) {
    if (state.balls.length >= CAP) {
      flashFull();
      return;
    }
    state.balls.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.balls.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The board is full. Throw a ball and take it off before you set another on.';
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
