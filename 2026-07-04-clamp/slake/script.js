/* Slake — the yard.
 *
 * A small, capped board for the few things you are bringing right by slaking
 * slow and letting them fat. Each tub sits on two axes: how far along the lime
 * has come (stone → burnt → slaked → fat) and how it is tempering right now
 * (cold → boiling → fatting → rich). The two are not the same thing: a batch
 * can be well slaked and still only boiling — knocked up, but not settled — or
 * freshly burnt and left cold, good quicklime waiting, not yet spoiled by a
 * rushed quench.
 *
 * A limeburner minds only as many tubs as he can keep from flashing off. Six,
 * and no more. When the yard is full the next barrow waits as quicklime, dry
 * and covered, until one tub has fatted and been knocked up and used — slake
 * more than you can walk and the far tubs boil over and set dead.
 */

(function () {
  'use strict';

  var STORE_KEY = 'slake.v1';
  var CAP = 6;

  var STAGES = [
    { key: 'stone',  label: 'Stone',  cls: 'stage-stone',  chip: 'chip-stone' },
    { key: 'burnt',  label: 'Burnt',  cls: 'stage-burnt',  chip: 'chip-burnt' },
    { key: 'slaked', label: 'Slaked', cls: 'stage-slaked', chip: 'chip-slaked' },
    { key: 'fat',    label: 'Fat',    cls: 'stage-fat',    chip: 'chip-fat' }
  ];

  var CONDS = [
    { key: 'cold',    label: 'Cold',    chip: 'chip-cold' },
    { key: 'boiling', label: 'Boiling', chip: 'chip-boiling' },
    { key: 'fatting', label: 'Fatting', chip: 'chip-fatting' },
    { key: 'rich',    label: 'Rich',    chip: 'chip-rich' }
  ];

  // a fictional yard partway through a slaking — variety, not a full run of tubs
  var SEED = {
    name: 'Clunch Yard',
    tubs: [
      { id: id(), title: 'Mortar for the churchyard wall', stage: 2, cond: 1 },
      { id: id(), title: 'Temper, slaked before I answer',  stage: 3, cond: 2 },
      { id: id(), title: 'The lime-plaster ceiling',         stage: 1, cond: 1 },
      { id: id(), title: 'A reply, left to fat in the tub',  stage: 2, cond: 2 },
      { id: id(), title: 'The house-move, knocked up slow',  stage: 0, cond: 0 }
    ]
  };

  var state = load();
  var selected = 0;

  // --- elements ---
  var $tubs = document.getElementById('tubs');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('tub-count');
  var $name = document.getElementById('yard-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function temperIcon(cond) {
    // the tub and how the lime in it is tempering
    var tub = '<path d="M4 7.5 H12 L11 13.6 C10.9 14 10.5 14 10.2 14 H5.8 C5.5 14 5.1 14 5 13.6 Z" fill="currentColor" opacity="0.26"/>';
    var rim = '<path d="M3.4 7.5 H12.6" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.7"/>';
    if (cond === 0) return svg(tub + rim + '<path d="M5 9 H11" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"/>'); // cold — a still, flat surface
    if (cond === 1) return svg(tub + rim + '<path d="M6.6 7 C6.6 5.6 5.8 5.4 6.2 4.1" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M9.4 7 C9.4 5.8 8.8 5.5 9.1 4.4" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="7.4" cy="10.2" r="0.8" fill="currentColor"/><circle cx="9.6" cy="9.5" r="0.6" fill="currentColor"/>'); // boiling — steam and bubbles
    if (cond === 2) return svg(tub + rim + '<path d="M4.9 9.2 C7 8.4 9 8.4 11.1 9.2 L10.7 11 C8.8 10.4 7.2 10.4 5.3 11 Z" fill="currentColor" opacity="0.55"/>'); // fatting — a thick fat layer knocked up
    return svg(tub + rim + '<path d="M4.7 8.4 H11.3 L10.8 12.4 C10.7 12.8 10.4 12.8 10.1 12.8 H5.9 C5.6 12.8 5.3 12.8 5.2 12.4 Z" fill="currentColor" opacity="0.5"/>'); // rich — the tub full of settled fat putty
  }

  function stageGlyph(si) {
    // the same batch taken along the lime — raw stone, burnt hot to quicklime,
    // slaked to a boil, then knocked up to a settled fat putty
    var ground = '<path d="M2 14 H14" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-linecap="round"/>';
    var forms = [
      '<path d="M5.5 13.5 L4.5 10 L7 8.2 L10.5 9 L11.5 12 L9 13.8 Z" fill="currentColor" opacity="0.55"/>',                                                                                              // stone — a raw angular rock
      '<path d="M5.5 13.5 L4.5 10 L7 8.2 L10.5 9 L11.5 12 L9 13.8 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8" cy="11.4" r="1.3" fill="currentColor"/>', // burnt — the stone drawn hot as quicklime
      '<path d="M4.5 9 H11.5 L10.6 13.6 C10.5 14 10.1 14 9.8 14 H6.2 C5.9 14 5.5 14 5.4 13.6 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M7 8.6 C7 7.2 6.2 7 6.6 5.8" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M9.2 8.6 C9.2 7.4 8.6 7.2 8.9 6.2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>', // slaked — a tub on the boil
      '<path d="M4.5 9 H11.5 L10.6 13.6 C10.5 14 10.1 14 9.8 14 H6.2 C5.9 14 5.5 14 5.4 13.6 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.4 10.6 C7 10 9 10 10.6 10.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' // fat — the tub settled to a smooth fat surface
    ];
    return svg(ground + forms[si]);
  }

  // --- model helpers ---
  function id() { return 't' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clampInt(n, lo, hi) { n = parseInt(n, 10); if (isNaN(n)) return lo; return Math.max(lo, Math.min(hi, n)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(SEED);
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tubs)) return clone(SEED);
      parsed.tubs = parsed.tubs.slice(0, CAP).map(function (s) {
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
    if (selected >= state.tubs.length) selected = state.tubs.length - 1;
    if (selected < 0) selected = 0;

    $tubs.innerHTML = '';
    state.tubs.forEach(function (s, i) {
      $tubs.appendChild(row(s, i));
    });

    var n = state.tubs.length;
    $count.textContent = n + ' / ' + CAP + ' slaked';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The yard is full — knock a tub up and use it first'
      : 'Set a batch in the tub…';

    save();
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'tub ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // temper mark — click to read it hotter (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'tub-mark';
    mark.type = 'button';
    mark.innerHTML = temperIcon(s.cond);
    mark.title = 'Read the temper (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'tub-body';
    var title = document.createElement('div');
    title.className = 'tub-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'tub-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the slaking
    var stages = document.createElement('div');
    stages.className = 'tub-stages';
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
    go.className = 'tub-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Knock it up and take it off';
    go.addEventListener('click', function (e) { e.stopPropagation(); knockUp(i); });
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
    var s = state.tubs[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'tub-edit';
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
    var s = state.tubs[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.tubs[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function knockUp(i) {
    var s = state.tubs[i];
    if (!s) return;
    var li = $tubs.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.tubs.splice(i, 1);
    if (selected >= state.tubs.length) selected = state.tubs.length - 1;
    render();
  }
  function add(text) {
    if (state.tubs.length >= CAP) {
      flashFull();
      return;
    }
    state.tubs.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.tubs.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The yard is full. Knock a tub up and use it before you slake another.';
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

  // --- reset: double-click the count to clear the yard back to the example ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the yard back to the example tubs?')) {
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

  // --- keyboard: the yard is walked, not clicked ---
  // N slake · J/K walk the tubs · ]/[ or Enter read the temper hotter/cooler
  // 0–3 move it along the slaking · R or Del knock it up and take it off
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if (typing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var n = state.tubs.length;
    switch (e.key) {
      case 'n': case 'N':
        e.preventDefault(); $input.focus(); break;
      case 'j': case 'J': case 'ArrowDown':
        if (n) { selected = (selected + 1) % n; render(); scrollToSel(); } e.preventDefault(); break;
      case 'k': case 'K': case 'ArrowUp':
        if (n) { selected = (selected - 1 + n) % n; render(); scrollToSel(); } e.preventDefault(); break;
      case ']':
        if (n) bumpCond(selected, +1); e.preventDefault(); break;
      case '[':
        if (n) bumpCond(selected, -1); e.preventDefault(); break;
      case 'Enter':
        if (n) bumpCond(selected, +1); e.preventDefault(); break;
      case '0': case '1': case '2': case '3':
        if (n) setStage(selected, parseInt(e.key, 10)); e.preventDefault(); break;
      case 'r': case 'R': case 'Delete': case 'Backspace':
        if (n) knockUp(selected); e.preventDefault(); break;
    }
  });

  function scrollToSel() {
    var li = $tubs.querySelector('.sel');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
  }

  render();
})();
