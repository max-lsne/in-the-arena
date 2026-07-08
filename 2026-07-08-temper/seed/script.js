/* Seed — the bench.
 *
 * A small, capped board for the few things you are bringing to a glossy, sound
 * set by tempering them slow. Each bowl sits on two axes: how far along the
 * chocolate has come (raw → melted → seeded → set) and how it is behaving in
 * the window right now (dull → loose → satin → snap). The two are not the same
 * reading: a bowl can be well seeded and still only loose — the crystal taking,
 * but the bowl run warm and drifting — or freshly melted and left dull, good
 * chocolate waiting, not yet seeded or spoiled.
 *
 * A chocolatier tempers only as many bowls as he can hold in the window. Six,
 * and no more. When the bench is full the next batch waits raw and solid, out
 * of the pan, until one bowl has set to a snap and been used — temper more than
 * you can hold and the far bowls drift out of the window and bloom.
 */

(function () {
  'use strict';

  var STORE_KEY = 'seed.v1';
  var CAP = 6;

  var STAGES = [
    { key: 'raw',    label: 'Raw',    cls: 'stage-raw',    chip: 'chip-raw' },
    { key: 'melted', label: 'Melted', cls: 'stage-melted', chip: 'chip-melted' },
    { key: 'seeded', label: 'Seeded', cls: 'stage-seeded', chip: 'chip-seeded' },
    { key: 'set',    label: 'Set',    cls: 'stage-set',    chip: 'chip-set' }
  ];

  var CONDS = [
    { key: 'dull',  label: 'Dull',  chip: 'chip-dull' },
    { key: 'loose', label: 'Loose', chip: 'chip-loose' },
    { key: 'satin', label: 'Satin', chip: 'chip-satin' },
    { key: 'snap',  label: 'Snap',  chip: 'chip-snap' }
  ];

  // a fictional bench partway through a tempering — variety, not a full run of bowls
  var SEED = {
    name: 'Marble Slab',
    bowls: [
      { id: id(), title: 'The couverture for the shop window',    stage: 2, cond: 1 },
      { id: id(), title: 'A reply, seeded before I send it',       stage: 3, cond: 3 },
      { id: id(), title: 'The bar I moulded dull and must re-temper', stage: 1, cond: 0 },
      { id: id(), title: 'A hard thing, cooled slow and held',      stage: 2, cond: 2 },
      { id: id(), title: 'The dipped fruit for Saturday',           stage: 0, cond: 0 }
    ]
  };

  var state = load();
  var selected = 0;

  // --- elements ---
  var $bowls = document.getElementById('bowls');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('bowl-count');
  var $name = document.getElementById('bench-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');
  var $gaugePath = document.getElementById('gauge-path');
  var $glossRead = document.getElementById('gloss-read');

  // how near a bowl is to blooming, by condition and by stage. A bowl run warm
  // and loose is the danger; a bowl set to a snap barely troubles the line, and
  // solid raw chocolate not at all.
  var COND_GLOSS  = [0.28, 1.0, 0.4, 0.1];
  var STAGE_GLOSS = [0.14, 1.0, 0.42, 0.1];

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function glossIcon(cond) {
    // a pool of chocolate in a bowl, and the gloss it is reading right now
    var bowl = '<path d="M3.5 7 H12.5 C12.5 10.5 10.5 12.4 8 12.4 C5.5 12.4 3.5 10.5 3.5 7 Z" fill="currentColor" opacity="0.24"/>';
    var rim = '<path d="M3 7 H13" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.7"/>';
    if (cond === 0) return svg(bowl + rim + '<circle cx="6.4" cy="8.8" r="0.5" fill="currentColor"/><circle cx="8.6" cy="9.4" r="0.5" fill="currentColor"/><circle cx="9.4" cy="8.2" r="0.5" fill="currentColor"/>'); // dull — a matte, speckled bloom
    if (cond === 1) return svg(bowl + rim + '<path d="M6.4 6.6 C6.4 5.4 5.7 5.3 6.1 4.2" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M9 6.4 C9 5.4 8.5 5.2 8.8 4.3" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>'); // loose — warm, wisping out of the window
    if (cond === 2) return svg(bowl + rim + '<path d="M5.2 8.4 C7 7.7 9 7.7 10.8 8.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>'); // satin — a sheen across the pool
    return svg('<path d="M3.5 6.5 L7.3 5.6 L7 12.4 L4 11 Z" fill="currentColor" opacity="0.4"/><path d="M8.7 5.6 L12.5 6.5 L12 11 L9 12.4 Z" fill="currentColor" opacity="0.4"/><path d="M7.3 5.6 L8.7 5.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'); // snap — a clean break, two glossy halves
  }

  function stageGlyph(si) {
    // the same bowl taken along the tempering — a solid block, melted right down,
    // cooled and seeded, then set to a snap
    var forms = [
      '<path d="M4.5 7 H11.5 V12 H4.5 Z" fill="currentColor" opacity="0.5"/><path d="M4.5 7 L6 5.5 H13 L11.5 7 Z" fill="currentColor" opacity="0.3"/><path d="M11.5 7 L13 5.5 V10.5 L11.5 12 Z" fill="currentColor" opacity="0.2"/>', // raw — a solid block
      '<path d="M3.5 8 H12.5 C12.5 11 10.7 12.6 8 12.6 C5.3 12.6 3.5 11 3.5 8 Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><path d="M5.5 7 C5.5 5.8 4.9 5.7 5.2 4.7" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M8 6.6 C8 5.6 7.5 5.4 7.8 4.5" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>', // melted — a bowl of liquid, warm
      '<path d="M3.5 8 H12.5 C12.5 11 10.7 12.6 8 12.6 C5.3 12.6 3.5 11 3.5 8 Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><circle cx="8" cy="9.6" r="1" fill="currentColor"/><path d="M5.5 9.4 C6.6 8.9 9.4 8.9 10.5 9.4" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.7"/>', // seeded — the seed dropped in, a swirl
      '<path d="M3.8 6.5 L7.4 5.7 L7.1 12.2 L4.2 11 Z" fill="currentColor" opacity="0.5"/><path d="M8.6 5.7 L12.2 6.5 L11.8 11 L8.9 12.2 Z" fill="currentColor" opacity="0.5"/>' // set — a bar snapped clean in two
    ];
    return svg(forms[si]);
  }

  // --- model helpers ---
  function id() { return 'b' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clampInt(n, lo, hi) { n = parseInt(n, 10); if (isNaN(n)) return lo; return Math.max(lo, Math.min(hi, n)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(SEED);
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.bowls)) return clone(SEED);
      parsed.bowls = parsed.bowls.slice(0, CAP).map(function (s) {
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

  // --- the gloss line ---
  function glossLevel() {
    var xs = state.bowls;
    if (!xs.length) return 0;
    var sum = 0;
    for (var i = 0; i < xs.length; i++) {
      sum += COND_GLOSS[xs[i].cond] * STAGE_GLOSS[xs[i].stage];
    }
    var avg = sum / xs.length;
    // a bench held in good order sets satin; past a tended few the far bowls
    // drift out of the window unwatched and the whole bench reads nearer bloom
    var overrun = Math.max(0, xs.length - 3) / (CAP - 3) * 0.3;
    return clamp(avg + overrun, 0, 1);
  }

  function gaugePath(bloom, phase) {
    var W = 600, mid = 32, steps = 64;
    var amp = bloom * 18;
    var freq = 2 + bloom * 5;
    var d = 'M0 ' + mid;
    for (var i = 1; i <= steps; i++) {
      var x = (W / steps) * i;
      var t = i / steps;
      // both ends pinned level; a second faster wave makes a bench near bloom
      // read ragged and streaky rather than a satin line
      var env = Math.sin(t * Math.PI);
      var y = mid - env * amp * (
        Math.sin(t * Math.PI * freq + phase) * 0.76 +
        Math.sin(t * Math.PI * (freq * 2.1) + phase * 1.4) * 0.24
      );
      d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function glossColor(bloom) {
    // a deep satin mahogany #8a5028 → a pale grey bloom #b3a794
    var a = [0x8a, 0x50, 0x28], b = [0xb3, 0xa7, 0x94];
    return 'rgb(' + lerp(a[0], b[0], bloom) + ',' + lerp(a[1], b[1], bloom) + ',' + lerp(a[2], b[2], bloom) + ')';
  }

  function glossRead(bloom) {
    if (bloom < 0.001) return 'satin — the bench is empty';
    if (bloom < 0.12) return 'satin — nothing tempering';
    if (bloom < 0.32) return 'setting slow — a good gloss';
    if (bloom < 0.55) return 'warm — hold the window';
    if (bloom < 0.78) return 'drifting loose — it will bloom';
    return 'blooming — you are running it hot';
  }

  function paintGauge() {
    var bloom = glossLevel();
    $gaugePath.setAttribute('d', gaugePath(bloom, 0));
    $gaugePath.setAttribute('stroke', glossColor(bloom));
    $glossRead.textContent = glossRead(bloom);
    $glossRead.style.color = glossColor(bloom);
  }

  // --- render ---
  function render() {
    if (selected >= state.bowls.length) selected = state.bowls.length - 1;
    if (selected < 0) selected = 0;

    $bowls.innerHTML = '';
    state.bowls.forEach(function (s, i) {
      $bowls.appendChild(row(s, i));
    });

    var n = state.bowls.length;
    $count.textContent = n + ' / ' + CAP + ' on the slab';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The bench is full — set a bowl to a snap and use it first'
      : 'Set a bowl to temper…';

    save();
    paintGauge();
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'bowl ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // gloss mark — click to read it hotter (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'bowl-mark';
    mark.type = 'button';
    mark.innerHTML = glossIcon(s.cond);
    mark.title = 'Read the gloss (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'bowl-body';
    var title = document.createElement('div');
    title.className = 'bowl-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'bowl-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the tempering
    var stages = document.createElement('div');
    stages.className = 'bowl-stages';
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
    go.className = 'bowl-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Take it off, set to a snap';
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
    var s = state.bowls[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'bowl-edit';
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
    var s = state.bowls[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.bowls[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function takeOff(i) {
    var s = state.bowls[i];
    if (!s) return;
    var li = $bowls.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.bowls.splice(i, 1);
    if (selected >= state.bowls.length) selected = state.bowls.length - 1;
    render();
  }
  function add(text) {
    if (state.bowls.length >= CAP) {
      flashFull();
      return;
    }
    state.bowls.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.bowls.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The bench is full. Set a bowl to a snap and use it before you temper another.';
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
    if (window.confirm('Clear the bench back to the example bowls?')) {
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

  // --- keyboard: the bench is held, not clicked ---
  // N set a bowl · J/K walk the bowls · ]/[ or Enter read the gloss hotter/cooler
  // 0–3 move it along the tempering · R or Del take it off, set to a snap
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if (typing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var n = state.bowls.length;
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
    var li = $bowls.querySelector('.sel');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
  }

  // a living streak on the gloss line when the bench nears bloom: a satin,
  // well-held bench lies level and still; a bench run warm keeps shivering.
  // Driven off the frame clock and throttled to a slow crawl; held still for
  // reduced-motion.
  var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduce) {
    var phase = 0, last = 0;
    var tick = function (ts) {
      requestAnimationFrame(tick);
      var bloom = glossLevel();
      if (bloom < 0.12) return;         // a satin bench does not stir
      if (ts - last < 95) return;       // throttle to a slow, streaking crawl
      last = ts;
      phase = (phase + 0.28) % (Math.PI * 200);
      $gaugePath.setAttribute('d', gaugePath(bloom, phase));
    };
    requestAnimationFrame(tick);
  }

  render();
})();
