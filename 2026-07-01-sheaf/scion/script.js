/* Scion — the bench.
 *
 * A small, capped board for the few things you are grafting onto good stock.
 * Each graft sits on two axes: how far the union has come (cut → bound →
 * taking → knit) and how it is faring in itself (dormant → swelling → leafing
 * → bearing). The two are not the same thing: a graft can be well knitted and
 * still dormant, or pushing leaf hard on a union that has not yet taken.
 *
 * A grafter walks only as many unions as he can mind. Six, and no more. When
 * the bench is full the next scion waits in the cool, wrapped and dormant,
 * until one has knitted and grown away on its own — set more than you can walk
 * and the unions dry and the lot is lost.
 */

(function () {
  'use strict';

  var CAP = 6;

  var STAGES = [
    { key: 'cut',    label: 'Cut',    cls: 'stage-cut',    chip: 'chip-cut' },
    { key: 'bound',  label: 'Bound',  cls: 'stage-bound',  chip: 'chip-bound' },
    { key: 'taking', label: 'Taking', cls: 'stage-taking', chip: 'chip-taking' },
    { key: 'knit',   label: 'Knit',   cls: 'stage-knit',   chip: 'chip-knit' }
  ];

  var CONDS = [
    { key: 'dormant',  label: 'Dormant',  chip: 'chip-dormant' },
    { key: 'swelling', label: 'Swelling', chip: 'chip-swelling' },
    { key: 'leafing',  label: 'Leafing',  chip: 'chip-leafing' },
    { key: 'bearing',  label: 'Bearing',  chip: 'chip-bearing' }
  ];

  // a fictional bench partway through a grafting spring — variety, not a full nursery
  var SEED = {
    name: 'Brogdale Row',
    scions: [
      { id: id(), title: 'The daily writing habit',      stage: 3, cond: 3 },
      { id: id(), title: 'Mother tongue, kept up nightly', stage: 2, cond: 2 },
      { id: id(), title: 'The half-restored bicycle',      stage: 2, cond: 1 },
      { id: id(), title: 'Running, the third attempt',      stage: 1, cond: 1 },
      { id: id(), title: 'That instrument in the corner',   stage: 0, cond: 0 }
    ]
  };

  var state = clone(SEED);
  var selected = 0;

  // --- elements ---
  var $scions = document.getElementById('scions');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('stock-count');
  var $name = document.getElementById('stock-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function condIcon(cond) {
    // a small glyph for how the graft itself is faring
    if (cond === 0) return svg('<path d="M8 14 V6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M6 6 H10" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/>'); // dormant — a bare cut stub, sealed
    if (cond === 1) return svg('<path d="M8 14 V7" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M8 7 C5.6 7 5.6 3.6 8 3.6 C10.4 3.6 10.4 7 8 7 Z" fill="currentColor"/>'); // swelling — a fat bud at the tip
    if (cond === 2) return svg('<path d="M8 14 V5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M8 9 C4.5 9 3.5 5.5 5 4 C7 4.5 8 6.5 8 9 M8 8 C11 8 12 5 11 3.5 C9 4 8 6 8 8" fill="currentColor" opacity="0.9"/>'); // leafing — first leaves opening
    return svg('<path d="M8 14 V8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="8" cy="5.4" r="3.1" fill="currentColor"/><path d="M8 2.3 V4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'); // bearing — a fruit set and hanging
  }

  function stageGlyph(si) {
    // the same rootstock on every button, the scion joining and growing away as
    // the union advances — cut and separate, bound on, callusing, then knitted
    var stock = '<path d="M8 14 V9" stroke="currentColor" stroke-width="1.5" opacity="0.55" stroke-linecap="round"/>';
    var forms = [
      '<path d="M8 9 L6 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M9 5 L11 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',                                  // cut — stock sliced, scion held apart above
      '<path d="M8 9 L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6.4 8 H9.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',                                    // bound — scion set on, a band at the union
      '<path d="M8 9 L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="1.7" fill="currentColor"/>',                                                                        // taking — callus swelling at the join
      '<path d="M8 14 L8 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 5 C10.4 5 11.4 2.6 10.4 1.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'     // knit — one continuous stem, a shoot grown away above
    ];
    return svg(stock + forms[si]);
  }

  // --- model helpers ---
  function id() { return 'g' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // --- render ---
  function render() {
    if (selected >= state.scions.length) selected = state.scions.length - 1;
    if (selected < 0) selected = 0;

    $scions.innerHTML = '';
    state.scions.forEach(function (s, i) {
      $scions.appendChild(row(s, i));
    });

    var n = state.scions.length;
    $count.textContent = n + ' / ' + CAP + ' grafted';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The bench is full — let a union knit and grow away first'
      : 'Set a scion on the bench…';
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'scion ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to mind it (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'scion-mark';
    mark.type = 'button';
    mark.innerHTML = condIcon(s.cond);
    mark.title = 'Mind it (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'scion-body';
    var title = document.createElement('div');
    title.className = 'scion-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'scion-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the union
    var stages = document.createElement('div');
    stages.className = 'scion-stages';
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
    go.className = 'scion-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Lift it off the bench';
    go.addEventListener('click', function (e) { e.stopPropagation(); lift(i); });
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
    var s = state.scions[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'scion-edit';
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
    var s = state.scions[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.scions[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function lift(i) {
    var s = state.scions[i];
    if (!s) return;
    var li = $scions.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.scions.splice(i, 1);
    if (selected >= state.scions.length) selected = state.scions.length - 1;
    render();
  }
  function add(text) {
    if (state.scions.length >= CAP) {
      flashFull();
      return;
    }
    state.scions.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.scions.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The bench is full. Let a union knit and grow away before you set another scion.';
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
