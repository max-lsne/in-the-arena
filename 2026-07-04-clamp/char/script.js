/* Char — the hearth.
 *
 * A small, capped board for the few things you are turning by slow, starved
 * heat. Each clamp sits on two axes: how far the burn has come (raised → fired
 * → charring → drawn) and how hard it is burning right now (cold → smouldering
 * → reeking → firing). The two are not the same thing: a clamp can be well into
 * charring and only smouldering — slow but safe — or freshly fired and already
 * firing through, a blow-hole in the wind before the char had set.
 *
 * A collier walks only as many clamps as he can reach the top of in a night.
 * Five, and no more. When the hearth is full the next stack waits in the cord,
 * cut and dry, until one has charred through and been drawn — light more than
 * you can walk and the far heaps find air and burn to ash.
 */

(function () {
  'use strict';

  var STORE_KEY = 'char.v1';
  var CAP = 5;

  var STAGES = [
    { key: 'raised',   label: 'Raised',   cls: 'stage-raised',   chip: 'chip-raised' },
    { key: 'fired',    label: 'Fired',    cls: 'stage-fired',    chip: 'chip-fired' },
    { key: 'charring', label: 'Charring', cls: 'stage-charring', chip: 'chip-charring' },
    { key: 'drawn',    label: 'Drawn',    cls: 'stage-drawn',    chip: 'chip-drawn' }
  ];

  var CONDS = [
    { key: 'cold',        label: 'Cold',        chip: 'chip-cold' },
    { key: 'smouldering', label: 'Smouldering', chip: 'chip-smouldering' },
    { key: 'reeking',     label: 'Reeking',     chip: 'chip-reeking' },
    { key: 'firing',      label: 'Firing',      chip: 'chip-firing' }
  ];

  // a fictional hearth partway through a night's burn — variety, not a full run
  var SEED = {
    name: 'Wyre Hearth',
    clamps: [
      { id: id(), title: 'The novel, on its third winter',  stage: 2, cond: 2 },
      { id: id(), title: 'Sourdough, kept alive on the sill', stage: 3, cond: 1 },
      { id: id(), title: 'Learning to actually listen',      stage: 1, cond: 3 },
      { id: id(), title: 'The workshop, cleared by the yard', stage: 0, cond: 0 }
    ]
  };

  var state = load();
  var selected = 0;

  // --- elements ---
  var $clamps = document.getElementById('clamps');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('clamp-count');
  var $name = document.getElementById('hearth-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');
  var $gaugePath = document.getElementById('gauge-path');
  var $reekRead = document.getElementById('reek-read');

  // how much reek a clamp throws, by condition and by stage. A clamp firing
  // through throws the hot white plume; a good blue reek is the working middle.
  // A drawn, cooled clamp barely stirs the line.
  var COND_REEK  = [0.05, 0.3, 0.55, 1.0];
  var STAGE_REEK = [0.15, 0.9, 1.0, 0.05];

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function reekIcon(cond) {
    // a covered mound, and how much smoke is coming off the crown
    var mound = '<path d="M3.5 13 C3.5 9.5 5.5 8 8 8 C10.5 8 12.5 9.5 12.5 13 Z" fill="currentColor" opacity="0.32"/>';
    if (cond === 0) return svg(mound); // cold — no smoke, the fire is out or unlit
    if (cond === 1) return svg(mound + '<path d="M8 8 C8 6.4 7 6 7.4 4.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'); // smouldering — a thin wisp
    if (cond === 2) return svg(mound + '<path d="M8 8 C8 6.4 6.8 6 7.6 4.6 C8.2 5.7 9.2 5.4 8.4 3.7 C8 2.9 8.9 2.5 8.6 1.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'); // reeking — a curling blue reek
    return svg(mound + '<path d="M8 8 V2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M6.6 3.4 L8 1.4 L9.4 3.4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'); // firing — a sharp plume shooting up
  }

  function stageGlyph(si) {
    // the same clamp on every button, taken through the burn — covered and cold,
    // lit at the core, charring on a reek, then opened and drawn as charcoal
    var dome = '<path d="M3.6 13 C3.6 8 5.8 6 8 6 C10.2 6 12.4 8 12.4 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
    var ground = '<path d="M2.5 13 H13.5" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-linecap="round"/>';
    var forms = [
      dome,                                                                                                                                    // raised — a covered dome, unlit
      dome + '<circle cx="8" cy="11" r="1.4" fill="currentColor"/>',                                                                            // fired — the core lit
      dome + '<circle cx="8" cy="11" r="1.7" fill="currentColor"/><path d="M8 6 C8 4.6 7.2 4.4 7.6 3.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>', // charring — ember core, a reek at the crown
      '<path d="M3.6 13 C3.6 9 5.2 7.2 7 6.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/><path d="M9.5 7 L13 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' // drawn — dome opened, a billet drawn out
    ];
    return svg(ground + forms[si]);
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
      if (!parsed || !Array.isArray(parsed.clamps)) return clone(SEED);
      parsed.clamps = parsed.clamps.slice(0, CAP).map(function (s) {
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

  // --- the reek line ---
  function reekLevel() {
    var cs = state.clamps;
    if (!cs.length) return 0;
    var sum = 0;
    for (var i = 0; i < cs.length; i++) {
      sum += COND_REEK[cs[i].cond] * STAGE_REEK[cs[i].stage];
    }
    var avg = sum / cs.length;
    // a hearth walked in good order runs slow; past a tended few the far heaps
    // find air unwatched and the whole hearth runs hotter
    var overrun = Math.max(0, cs.length - 3) / (CAP - 3) * 0.28;
    return clamp(avg + overrun, 0, 1);
  }

  function gaugePath(reek, phase) {
    var W = 600, mid = 32, steps = 64;
    var amp = reek * 18;
    var freq = 2 + reek * 5;
    var d = 'M0 ' + mid;
    for (var i = 1; i <= steps; i++) {
      var x = (W / steps) * i;
      var t = i / steps;
      // both ends pinned flat; a second faster wave makes a firing hearth read
      // ragged and roiling rather than a tidy sine
      var env = Math.sin(t * Math.PI);
      var y = mid - env * amp * (
        Math.sin(t * Math.PI * freq + phase) * 0.78 +
        Math.sin(t * Math.PI * (freq * 1.9) + phase * 1.3) * 0.22
      );
      d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function reekColor(reek) {
    // slow blue reek #7b8794 → hot white-orange plume #d9683a
    var a = [0x7b, 0x87, 0x94], b = [0xd9, 0x68, 0x3a];
    return 'rgb(' + lerp(a[0], b[0], reek) + ',' + lerp(a[1], b[1], reek) + ',' + lerp(a[2], b[2], reek) + ')';
  }

  function reekRead(reek) {
    if (reek < 0.001) return 'cold — the hearth is empty';
    if (reek < 0.12) return 'cold — nothing charring yet';
    if (reek < 0.32) return 'a slow blue reek';
    if (reek < 0.55) return 'charring — keep them starved';
    if (reek < 0.78) return 'reeking hard — dust the leaks';
    return 'firing through — draw one now';
  }

  function paintGauge() {
    var reek = reekLevel();
    $gaugePath.setAttribute('d', gaugePath(reek, 0));
    $gaugePath.setAttribute('stroke', reekColor(reek));
    $reekRead.textContent = reekRead(reek);
    $reekRead.style.color = reekColor(reek);
  }

  // --- render ---
  function render() {
    if (selected >= state.clamps.length) selected = state.clamps.length - 1;
    if (selected < 0) selected = 0;

    $clamps.innerHTML = '';
    state.clamps.forEach(function (s, i) {
      $clamps.appendChild(row(s, i));
    });

    var n = state.clamps.length;
    $count.textContent = n + ' / ' + CAP + ' raised';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The hearth is full — let a clamp char through and draw it first'
      : 'Raise a clamp on the hearth…';

    save();
    paintGauge();
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'clamp ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // reek mark — click to read it hotter (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'clamp-mark';
    mark.type = 'button';
    mark.innerHTML = reekIcon(s.cond);
    mark.title = 'Read the reek (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'clamp-body';
    var title = document.createElement('div');
    title.className = 'clamp-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'clamp-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the burn
    var stages = document.createElement('div');
    stages.className = 'clamp-stages';
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
    go.className = 'clamp-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Draw it off the hearth';
    go.addEventListener('click', function (e) { e.stopPropagation(); draw(i); });
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
    var s = state.clamps[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'clamp-edit';
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
    var s = state.clamps[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.clamps[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function draw(i) {
    var s = state.clamps[i];
    if (!s) return;
    var li = $clamps.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.clamps.splice(i, 1);
    if (selected >= state.clamps.length) selected = state.clamps.length - 1;
    render();
  }
  function add(text) {
    if (state.clamps.length >= CAP) {
      flashFull();
      return;
    }
    state.clamps.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.clamps.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The hearth is full. Let a clamp char through and draw it before you raise another.';
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

  // --- reset: double-click the count to clear the hearth back to the example ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the hearth back to the example run?')) {
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

  // --- keyboard: the hearth is walked, not clicked ---
  // N raise · J/K walk the hearth · ]/[ or Enter read the reek hotter/cooler
  // 0–3 move it along the burn · R or Del draw it off the hearth
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if (typing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var n = state.clamps.length;
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
        if (n) draw(selected); e.preventDefault(); break;
    }
  });

  function scrollToSel() {
    var li = $clamps.querySelector('.sel');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
  }

  // a living roil on the reek line when the hearth runs hot: a slow, well-walked
  // hearth lies flat and calm; a firing one keeps moving. Held still for
  // reduced-motion.
  var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduce) {
    var phase = 0;
    setInterval(function () {
      var reek = reekLevel();
      if (reek < 0.12) return; // a cold hearth does not stir
      phase = (phase + 0.36) % (Math.PI * 200);
      $gaugePath.setAttribute('d', gaugePath(reek, phase));
    }, 1200);
  }

  render();
})();
