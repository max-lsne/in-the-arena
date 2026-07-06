/* Fettle — the bench.
 *
 * A small, capped bench for the few castings you are dressing by hand. Each
 * one sits on two axes: how far it has been dressed (cast → shaken →
 * fettled → passed) and how it is faring under the file right now (rough →
 * grinding → trued → sound). The two are not the same reading: a casting
 * can be well fettled and still only trued — dressed, but not yet struck and
 * rung sound — or freshly cast and already grinding, because someone started
 * on it before it was even shaken out.
 *
 * A pair of hands can only true so many. Six, and no more. When the bench is
 * full the next casting waits by the furnace until one is passed and sent on
 * — load it past that and the rough goes out with the good.
 */

(function () {
  'use strict';

  var STORE_KEY = 'fettle.v1';
  var CAP = 6;

  var STAGES = [
    { key: 'cast',    label: 'Cast',    cls: 'stage-cast',    chip: 'chip-cast' },
    { key: 'shaken',  label: 'Shaken',  cls: 'stage-shaken',  chip: 'chip-shaken' },
    { key: 'fettled', label: 'Fettled', cls: 'stage-fettled', chip: 'chip-fettled' },
    { key: 'passed',  label: 'Passed',  cls: 'stage-passed',  chip: 'chip-passed' }
  ];

  var CONDS = [
    { key: 'rough',    label: 'Rough',    chip: 'chip-rough' },
    { key: 'grinding', label: 'Grinding', chip: 'chip-grinding' },
    { key: 'trued',    label: 'Trued',    chip: 'chip-trued' },
    { key: 'sound',    label: 'Sound',    chip: 'chip-sound' }
  ];

  // how rough a casting still rings, by condition and by stage — a rough,
  // just-cast piece rattles dead; a passed one struck sound barely buzzes
  var COND_ROUGH  = [1.0, 0.6, 0.28, 0.05];
  var STAGE_ROUGH = [1.0, 0.62, 0.3, 0.1];

  // a fictional bench partway through a heat — variety, not a full load
  var SEED = {
    name: 'Coldbrook Foundry',
    castings: [
      { id: id(), title: 'The talk, cut down to twenty minutes', stage: 2, cond: 2 },
      { id: id(), title: 'Chapter three, read aloud once',       stage: 3, cond: 3 },
      { id: id(), title: 'The kitchen table, second coat',       stage: 1, cond: 1 },
      { id: id(), title: 'The résumé nobody has proofed',        stage: 1, cond: 0 },
      { id: id(), title: 'That plugin, minus the debug logs',    stage: 0, cond: 0 }
    ]
  };

  var state = load();
  var selected = 0;

  // --- elements ---
  var $castings = document.getElementById('castings');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('bench-count');
  var $name = document.getElementById('bench-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');
  var $ringPath = document.getElementById('ring-path');
  var $ringRead = document.getElementById('ring-read');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function condIcon(cond) {
    // a small glyph for how the casting is faring under the file
    if (cond === 0) return svg('<path d="M2 12 L4 7 L6 10 L8 4 L10 9 L12 6 L14 11" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'); // rough — a jagged burr of flash
    if (cond === 1) return svg('<circle cx="8" cy="8" r="1.4" fill="currentColor"/><path d="M8 2 V4.5 M8 11.5 V14 M2 8 H4.5 M11.5 8 H14 M3.8 3.8 L5.5 5.5 M12.2 3.8 L10.5 5.5 M3.8 12.2 L5.5 10.5 M12.2 12.2 L10.5 10.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'); // grinding — a spark thrown off
    if (cond === 2) return svg('<rect x="2" y="6" width="12" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 6 V8 M8 6 V8.4 M11 6 V8" stroke="currentColor" stroke-width="1"/>'); // trued — filed flat, checked with a rule
    return svg('<path d="M8 3 C10.4 3 11 5.6 11 8 C11 10 12 11 12 11 H4 C4 11 5 10 5 8 C5 5.6 5.6 3 8 3 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.8 11 C6.8 12.4 9.2 12.4 9.2 11" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M13 6 C14 7.2 14 8.8 13 10" fill="none" stroke="currentColor" stroke-width="1" opacity="0.7"/>'); // sound — a bell, rings true
  }

  function stageGlyph(si) {
    // the same casting on every button, coming cleaner as the stage advances
    // — spurs of gate and flash sawn off, then a true line, then struck sound
    var blob = '<path d="M4 11 C3 8 5 6 8 6 C11 6 13 8 12 11 C11 12.4 5 12.4 4 11 Z"';
    if (si === 0) return svg(blob + ' fill="currentColor" opacity="0.85"/><path d="M8 6 V3 M12.2 8 L14 7 M3.8 9 L2 8.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'); // cast — gates and flash still on
    if (si === 1) return svg(blob + ' fill="currentColor" opacity="0.85"/><path d="M8 6 V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="11" cy="9" r="0.7" fill="currentColor" opacity="0.6"/><circle cx="6" cy="10" r="0.6" fill="currentColor" opacity="0.6"/>'); // shaken — one gate left, sand specks
    if (si === 2) return svg(blob + ' fill="none" stroke="currentColor" stroke-width="1.3"/>'); // fettled — dressed to a clean line
    return svg(blob + ' fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 9 L7.5 10.6 L10.4 7.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'); // passed — struck sound, marked off
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
      if (!parsed || !Array.isArray(parsed.castings)) return clone(SEED);
      parsed.castings = parsed.castings.slice(0, CAP).map(function (c) {
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

  // --- the ring ---
  function roughLevel() {
    var cs = state.castings;
    if (!cs.length) return 0;
    var sum = 0;
    for (var i = 0; i < cs.length; i++) {
      sum += COND_ROUGH[cs[i].cond] * STAGE_ROUGH[cs[i].stage];
    }
    var avg = sum / cs.length;
    // a bench trues a few in good order; past that, rushing leaves flash on
    // and the whole bench rings rougher
    var overload = Math.max(0, cs.length - 4) / (CAP - 4) * 0.28;
    return clamp(avg + overload, 0, 1);
  }

  function ringPath(rough, phase) {
    var W = 600, mid = 32, steps = 72;
    var baseAmp = 15;
    var baseFreq = 3.2;
    var d = 'M0 ' + mid;
    for (var i = 1; i <= steps; i++) {
      var x = (W / steps) * i;
      var t = i / steps;
      // a struck note rings out and decays left to right; a sound casting
      // rings a clean tone, a rough one buzzes with hard high harmonics
      var decay = Math.exp(-2.4 * t);
      var clean = Math.sin(t * Math.PI * 2 * baseFreq + phase);
      var buzz = rough * (
        Math.sin(t * Math.PI * 2 * baseFreq * 4.3 + phase * 1.7) * 0.6 +
        Math.sin(t * Math.PI * 2 * baseFreq * 7.1 + phase * 0.5) * 0.4
      );
      var y = mid + baseAmp * decay * (clean * (1 - rough * 0.35) + buzz);
      d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function ringColor(rough) {
    // clean-ring #5f8f93 → dead-rattle #a8583c
    var a = [0x5f, 0x8f, 0x93], b = [0xa8, 0x58, 0x3c];
    return 'rgb(' + lerp(a[0], b[0], rough) + ',' + lerp(a[1], b[1], rough) + ',' + lerp(a[2], b[2], rough) + ')';
  }

  function ringRead(rough) {
    if (rough < 0.001) return 'silent — cold bench';
    if (rough < 0.13) return 'rings true — in fine fettle';
    if (rough < 0.32) return 'rings clean';
    if (rough < 0.55) return 'a burr in the note';
    if (rough < 0.78) return 'buzzing — flash left on';
    return 'dead — rough off the mould';
  }

  function paintRing() {
    var rough = roughLevel();
    $ringPath.setAttribute('d', ringPath(rough, 0));
    $ringPath.setAttribute('stroke', ringColor(rough));
    $ringRead.textContent = ringRead(rough);
    $ringRead.style.color = ringColor(rough);
  }

  // --- render ---
  function render() {
    if (selected >= state.castings.length) selected = state.castings.length - 1;
    if (selected < 0) selected = 0;

    $castings.innerHTML = '';
    state.castings.forEach(function (c, i) {
      $castings.appendChild(row(c, i));
    });

    var n = state.castings.length;
    $count.textContent = n + ' / ' + CAP + ' passed';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The bench is full — pass one off before another goes on'
      : 'Set a casting on the bench…';

    paintRing();
    save();
  }

  function row(c, i) {
    var stage = STAGES[c.stage];
    var cond = CONDS[c.cond];

    var li = document.createElement('li');
    li.className = 'casting ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to work it (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'casting-mark';
    mark.type = 'button';
    mark.innerHTML = condIcon(c.cond);
    mark.title = 'Work it (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'casting-body';
    var title = document.createElement('div');
    title.className = 'casting-title';
    title.textContent = c.title;
    var tags = document.createElement('div');
    tags.className = 'casting-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the bench
    var states = document.createElement('div');
    states.className = 'casting-states';
    STAGES.forEach(function (s, si) {
      var b = document.createElement('button');
      b.className = 'state-btn' + (si === c.stage ? ' on' : '');
      b.type = 'button';
      b.innerHTML = stageGlyph(si);
      b.title = 'Move to ' + s.label;
      b.setAttribute('aria-label', 'Move to ' + s.label);
      b.addEventListener('click', function (e) { e.stopPropagation(); selected = i; setStage(i, si); });
      states.appendChild(b);
    });
    var go = document.createElement('button');
    go.className = 'casting-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Take it off the bench';
    go.addEventListener('click', function (e) { e.stopPropagation(); takeOff(i); });
    states.appendChild(go);

    li.appendChild(mark);
    li.appendChild(body);
    li.appendChild(states);
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
    var c = state.castings[i];
    if (!c) return;
    var input = document.createElement('input');
    input.className = 'casting-edit';
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
    var c = state.castings[i];
    if (!c) return;
    c.cond = clamp(c.cond + dir, 0, 3);
    render();
  }
  function setStage(i, s) {
    var c = state.castings[i];
    if (!c) return;
    c.stage = clamp(s, 0, 3);
    render();
  }
  function takeOff(i) {
    var c = state.castings[i];
    if (!c) return;
    var li = $castings.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.castings.splice(i, 1);
    if (selected >= state.castings.length) selected = state.castings.length - 1;
    render();
  }
  function add(text) {
    if (state.castings.length >= CAP) {
      flashFull();
      return;
    }
    state.castings.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.castings.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The bench is loaded full. Pass a casting off before you set another on.';
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

  // --- reset: double-click the count to clear the bench back to the example ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the bench back to the example castings?')) {
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

  // --- keyboard: the bench is keyboard-first ---
  // N set on · J/K move the file along the bench · ]/[ or Enter work the
  // condition · 0–3 move it through the stages · R or Del take it off
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if (typing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var n = state.castings.length;
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
        if (n) takeOff(selected); e.preventDefault(); break;
    }
  });

  function scrollToSel() {
    var li = $castings.querySelector('.sel');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
  }

  // a struck note keeps ringing while the bench is rough: a sound bench rings
  // out clean and settles still, a rough one buzzes on and on. Held still for
  // reduced-motion.
  var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduce) {
    var phase = 0;
    setInterval(function () {
      var rough = roughLevel();
      if (rough < 0.13) return; // a sound casting rings out and settles
      phase = (phase + 0.34) % (Math.PI * 200);
      $ringPath.setAttribute('d', ringPath(rough, phase));
    }, 1200);
  }

  render();
})();
