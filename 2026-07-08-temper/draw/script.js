/* Draw — the forge.
 *
 * A small, capped board for the few things you are bringing to a working
 * toughness by drawing the temper slow. Each iron sits on two axes: how far
 * along the steel has come (hard → bright → drawing → let) and what colour it
 * is running right now (cold → running → blued → tough). The two are not the
 * same reading: an iron can be well into the drawing and still only running —
 * the colour crawling up, not yet caught — or freshly hardened and left cold,
 * good hard steel waiting, not yet thrown back on and run soft.
 *
 * A smith draws only as many irons as he can watch run. Six, and no more. When
 * the forge is full the next blade waits hard and bright on the bench, out of
 * the fire, until one iron has been drawn and pulled and set aside — set more
 * on the heat than you can watch and the far ones run past blue unseen.
 */

(function () {
  'use strict';

  var STORE_KEY = 'draw.v1';
  var CAP = 6;

  var STAGES = [
    { key: 'hard',    label: 'Hard',    cls: 'stage-hard',    chip: 'chip-hard' },
    { key: 'bright',  label: 'Bright',  cls: 'stage-bright',  chip: 'chip-bright' },
    { key: 'drawing', label: 'Drawing', cls: 'stage-drawing', chip: 'chip-drawing' },
    { key: 'let',     label: 'Let',     cls: 'stage-let',     chip: 'chip-let' }
  ];

  var CONDS = [
    { key: 'cold',    label: 'Cold',    chip: 'chip-cold' },
    { key: 'running', label: 'Running', chip: 'chip-running' },
    { key: 'blued',   label: 'Blued',   chip: 'chip-blued' },
    { key: 'tough',   label: 'Tough',   chip: 'chip-tough' }
  ];

  // a fictional forge partway through a drawing — variety, not a full run of irons
  var SEED = {
    name: 'Coldharbour Forge',
    irons: [
      { id: id(), title: 'The paring knife for the kitchen',   stage: 2, cond: 1 },
      { id: id(), title: 'A temper, drawn before I answer',    stage: 3, cond: 2 },
      { id: id(), title: 'The spring for the door-latch',      stage: 1, cond: 0 },
      { id: id(), title: 'A hard reply, set back on a low heat', stage: 2, cond: 2 },
      { id: id(), title: 'The froe I chipped and must re-draw', stage: 0, cond: 0 }
    ]
  };

  var state = load();
  var selected = 0;

  // --- elements ---
  var $irons = document.getElementById('irons');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('iron-count');
  var $name = document.getElementById('forge-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function colourIcon(cond) {
    // a blade laid flat, and the temper colour it is running right now
    var blade = '<path d="M2.5 10.5 L11 8 L13.5 8.6 L13.5 9.4 L11 10 L2.5 11.5 Z" fill="currentColor" opacity="0.22"/>';
    var edge = '<path d="M2.5 11.5 L11 10" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.7"/>';
    if (cond === 0) return svg(blade + edge); // cold — bright, no colour
    if (cond === 1) return svg(blade + edge + '<path d="M6.4 6.8 C6.4 5.6 5.7 5.5 6.1 4.4" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M8.6 6.6 C8.6 5.6 8.1 5.4 8.4 4.5" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><circle cx="9.2" cy="9" r="0.9" fill="currentColor"/>'); // running — the colour racing up, heat
    if (cond === 2) return svg(blade + edge + '<path d="M6 9.4 L9.6 8.4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.6"/>'); // blued — a band of colour caught
    return svg(blade + '<path d="M2.5 10.5 L11 8 L13.5 8.6 L13.5 9.4 L11 10 L2.5 11.5 Z" fill="currentColor" opacity="0.45"/>' + edge); // tough — drawn even, settled through
  }

  function stageGlyph(si) {
    // the same iron taken along the drawing — hard bar, polished bright, over a
    // low heat with the colour running, then let down to a finished blade
    var ground = '<path d="M2 14 H14" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-linecap="round"/>';
    var forms = [
      '<path d="M3.5 11 L12.5 9 L12.8 10.6 L3.8 12.6 Z" fill="currentColor" opacity="0.55"/>',                                                                                                       // hard — a rough quenched bar
      '<path d="M3.5 11 L12.5 9 L12.8 10.6 L3.8 12.6 Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M5 10.6 L11 9.3" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.8"/>', // bright — polished, a line of shine
      '<path d="M3.5 11 L12.5 9 L12.8 10.6 L3.8 12.6 Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 8.6 C6 7.3 5.3 7.1 5.7 6" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M9 8.2 C9 7.1 8.4 6.9 8.8 5.9" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>', // drawing — over a low heat, colour running
      '<path d="M3 11.5 L11 9 L13.4 9.6 L13.4 10.2 L11 10.8 L3 12.4 Z" fill="currentColor" opacity="0.5" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/>' // let — a finished, tempered blade
    ];
    return svg(ground + forms[si]);
  }

  // --- model helpers ---
  function id() { return 'i' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clampInt(n, lo, hi) { n = parseInt(n, 10); if (isNaN(n)) return lo; return Math.max(lo, Math.min(hi, n)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(SEED);
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.irons)) return clone(SEED);
      parsed.irons = parsed.irons.slice(0, CAP).map(function (s) {
        return {
          id: s.id || id(),
          title: String(s.title || '').slice(0, 80),
          stage: clampInt(s.stage, 0, 3),
          cond: clampInt(s.cond, 0, 3)
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
    if (selected >= state.irons.length) selected = state.irons.length - 1;
    if (selected < 0) selected = 0;

    $irons.innerHTML = '';
    state.irons.forEach(function (s, i) {
      $irons.appendChild(row(s, i));
    });

    var n = state.irons.length;
    $count.textContent = n + ' / ' + CAP + ' on the heat';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The forge is full — pull an iron and set it aside first'
      : 'Set an iron in the fire…';

    save();
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'iron ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // colour mark — click to read it hotter (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'iron-mark';
    mark.type = 'button';
    mark.innerHTML = colourIcon(s.cond);
    mark.title = 'Read the colour (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'iron-body';
    var title = document.createElement('div');
    title.className = 'iron-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'iron-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the drawing
    var stages = document.createElement('div');
    stages.className = 'iron-stages';
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
    go.className = 'iron-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Pull it and set it aside';
    go.addEventListener('click', function (e) { e.stopPropagation(); pull(i); });
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
    var s = state.irons[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'iron-edit';
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
    var s = state.irons[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.irons[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function pull(i) {
    var s = state.irons[i];
    if (!s) return;
    var li = $irons.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.irons.splice(i, 1);
    if (selected >= state.irons.length) selected = state.irons.length - 1;
    render();
  }
  function add(text) {
    if (state.irons.length >= CAP) {
      flashFull();
      return;
    }
    state.irons.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.irons.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The forge is full. Pull an iron and set it aside before you set another on.';
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

  // --- reset: double-click the count to clear the forge back to the example ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the forge back to the example irons?')) {
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
