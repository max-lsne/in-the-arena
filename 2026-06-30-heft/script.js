/* Heft — the fell.
 *
 * A small, capped board for the few things you are keeping on learned
 * ground. Each hefting sits on two axes: how far it has settled into the
 * fell (stray → grazing → settled → hefted) and how it is faring under
 * your minding (lean → minded → thriving → fettle). The two are not the
 * same thing: a thing can be deeply hefted and going lean, or thriving
 * but still a stray.
 *
 * The fell carries only so much in good heart. Six, and no more. When it
 * is full the next thing stays off the hill until something goes off for
 * good — overstock it and the whole flock starts to drift.
 */

(function () {
  'use strict';

  var STORE_KEY = 'heft.v1';
  var CAP = 6;

  var DEPTHS = [
    { key: 'stray',   label: 'Stray',   cls: 'depth-stray',   chip: 'chip-stray' },
    { key: 'grazing', label: 'Grazing', cls: 'depth-grazing', chip: 'chip-grazing' },
    { key: 'settled', label: 'Settled', cls: 'depth-settled', chip: 'chip-settled' },
    { key: 'hefted',  label: 'Hefted',  cls: 'depth-hefted',  chip: 'chip-hefted' }
  ];

  var CONDS = [
    { key: 'lean',     label: 'Lean',     chip: 'chip-lean' },
    { key: 'minded',   label: 'Minded',   chip: 'chip-minded' },
    { key: 'thriving', label: 'Thriving', chip: 'chip-thriving' },
    { key: 'fettle',   label: 'Fettle',   chip: 'chip-fettle' }
  ];

  // how much a thing wants to drift, by condition and by depth — a lean
  // stray pulls hard off the ground; a hefted thing in fettle barely moves
  var COND_DRIFT  = [1.0, 0.55, 0.25, 0.05];
  var DEPTH_DRIFT = [1.0, 0.6, 0.3, 0.1];

  // a fictional fell partway through a season — variety, not a full flock
  var SEED = {
    name: 'Cawdale Fell',
    heftings: [
      { id: id(), title: 'The Saturday morning ride',     depth: 3, cond: 3 },
      { id: id(), title: 'Learning to set type by hand',  depth: 2, cond: 2 },
      { id: id(), title: 'The long letters to Jonah',     depth: 2, cond: 1 },
      { id: id(), title: 'Getting back in the river',     depth: 1, cond: 1 },
      { id: id(), title: 'That half-built side project',  depth: 0, cond: 0 }
    ]
  };

  var state = load();
  var selected = 0;

  // --- elements ---
  var $heftings = document.getElementById('heftings');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('floor-count');
  var $name = document.getElementById('fell-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');
  var $gaugePath = document.getElementById('gauge-path');
  var $gaugeRead = document.getElementById('gauge-read');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function condIcon(cond) {
    // a small glyph for how the hefting is faring
    if (cond === 0) return svg('<path d="M3 12 C5 9 6 11 8 9 C10 7 11 9 13 6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'); // lean — a thin, dropping line
    if (cond === 1) return svg('<path d="M8 2 V14 M8 7 L4 4 M8 9 L12 6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>'); // minded — a tended sprig
    if (cond === 2) return svg('<path d="M8 14 V6 M8 6 C8 3 5 3 5 5 C5 7 8 6 8 6 C8 6 11 7 11 5 C11 3 8 3 8 6" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'); // thriving — open growth
    return svg('<circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.5 V3 M8 13 V14.5 M1.5 8 H3 M13 8 H14.5 M3.5 3.5 L4.6 4.6 M12.5 3.5 L11.4 4.6 M3.5 12.5 L4.6 11.4 M12.5 12.5 L11.4 11.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'); // fettle — in full sun, needs nothing
  }

  function depthGlyph(di) {
    // the same fell on every button, with the sheep settled lower onto the
    // learned ground as the depth increases — stray up on the bare line,
    // hefted down on the green
    var fell = '<path d="M2 11 L6 7 L9 9.5 L13 5.5" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/>';
    var marks = [
      '<circle cx="12.3" cy="6" r="1.7" fill="currentColor"/>',                                       // stray, up on the bare line
      '<circle cx="9" cy="9" r="1.7" fill="currentColor"/>',                                           // grazing, partway down
      '<circle cx="6" cy="11" r="1.7" fill="currentColor"/>',                                          // settled, low on the ground
      '<circle cx="6" cy="11" r="1.5" fill="currentColor"/><path d="M2.5 13.5 H10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>' // hefted, rooted to the line
    ];
    return svg(fell + marks[di]);
  }

  // --- model helpers ---
  function id() { return 'h' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clampInt(n, lo, hi) { n = parseInt(n, 10); if (isNaN(n)) return lo; return Math.max(lo, Math.min(hi, n)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(SEED);
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.heftings)) return clone(SEED);
      parsed.heftings = parsed.heftings.slice(0, CAP).map(function (h) {
        return {
          id: h.id || id(),
          title: String(h.title || '').slice(0, 80),
          depth: clampInt(h.depth, 0, 3),
          cond: clampInt(h.cond, 0, 3)
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

  // --- the drift line ---
  function driftLevel() {
    var hs = state.heftings;
    if (!hs.length) return 0;
    var sum = 0;
    for (var i = 0; i < hs.length; i++) {
      sum += COND_DRIFT[hs[i].cond] * DEPTH_DRIFT[hs[i].depth];
    }
    var avg = sum / hs.length;
    // a fell carries a few in good heart; past that, the overstock pulls
    // the whole flock looser
    var overstock = Math.max(0, hs.length - 4) / (CAP - 4) * 0.28;
    return clamp(avg + overstock, 0, 1);
  }

  function gaugePath(drift, phase) {
    var W = 600, mid = 32, steps = 64;
    var amp = drift * 17;
    var freq = 2 + drift * 5;
    var d = 'M0 ' + mid;
    for (var i = 1; i <= steps; i++) {
      var x = (W / steps) * i;
      var t = i / steps;
      // taper the scatter to nothing at both pinned ends; a second, slower
      // wave lets a high-drift line look ragged rather than tidy
      var env = Math.sin(t * Math.PI);
      var y = mid + env * amp * (
        Math.sin(t * Math.PI * freq + phase) * 0.8 +
        Math.sin(t * Math.PI * (freq * 1.9) + phase * 1.3) * 0.2
      );
      d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function driftColor(drift) {
    // hefted-green #6f8a6a → loose-heather #9c6a86
    var a = [0x6f, 0x8a, 0x6a], b = [0x9c, 0x6a, 0x86];
    return 'rgb(' + lerp(a[0], b[0], drift) + ',' + lerp(a[1], b[1], drift) + ',' + lerp(a[2], b[2], drift) + ')';
  }

  function driftRead(drift) {
    if (drift < 0.001) return 'steady — empty fell';
    if (drift < 0.13) return 'hefted — the flock holds';
    if (drift < 0.32) return 'settled';
    if (drift < 0.55) return 'a few starting to drift';
    if (drift < 0.78) return 'scattering off the ground';
    return 'loose on the open fell';
  }

  function paintGauge() {
    var drift = driftLevel();
    $gaugePath.setAttribute('d', gaugePath(drift, 0));
    $gaugePath.setAttribute('stroke', driftColor(drift));
    $gaugeRead.textContent = driftRead(drift);
    $gaugeRead.style.color = driftColor(drift);
  }

  // --- render ---
  function render() {
    if (selected >= state.heftings.length) selected = state.heftings.length - 1;
    if (selected < 0) selected = 0;

    $heftings.innerHTML = '';
    state.heftings.forEach(function (h, i) {
      $heftings.appendChild(row(h, i));
    });

    var n = state.heftings.length;
    $count.textContent = n + ' / ' + CAP + ' hefted';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The fell is full — something has to go off the hill'
      : 'Walk something onto the fell…';

    paintGauge();
    save();
  }

  function row(h, i) {
    var depth = DEPTHS[h.depth];
    var cond = CONDS[h.cond];

    var li = document.createElement('li');
    li.className = 'hefting ' + depth.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to mind it (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'hefting-mark';
    mark.type = 'button';
    mark.innerHTML = condIcon(h.cond);
    mark.title = 'Mind it (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'hefting-body';
    var title = document.createElement('div');
    title.className = 'hefting-title';
    title.textContent = h.title;
    var tags = document.createElement('div');
    tags.className = 'hefting-tags';
    tags.appendChild(chip(depth.label, depth.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // depth selector — walk it down the fell
    var states = document.createElement('div');
    states.className = 'hefting-states';
    DEPTHS.forEach(function (d, di) {
      var b = document.createElement('button');
      b.className = 'state-btn' + (di === h.depth ? ' on' : '');
      b.type = 'button';
      b.innerHTML = depthGlyph(di);
      b.title = 'Move to ' + d.label;
      b.setAttribute('aria-label', 'Move to ' + d.label);
      b.addEventListener('click', function (e) { e.stopPropagation(); selected = i; setDepth(i, di); });
      states.appendChild(b);
    });
    var go = document.createElement('button');
    go.className = 'hefting-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Walk it off the hill';
    go.addEventListener('click', function (e) { e.stopPropagation(); walkOff(i); });
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
    var h = state.heftings[i];
    if (!h) return;
    var input = document.createElement('input');
    input.className = 'hefting-edit';
    input.value = h.title;
    input.maxLength = 80;
    titleEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    var done = function (commit) {
      if (commit) {
        var v = input.value.trim();
        if (v) h.title = v.slice(0, 80);
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
    var h = state.heftings[i];
    if (!h) return;
    h.cond = clamp(h.cond + dir, 0, 3);
    render();
  }
  function setDepth(i, d) {
    var h = state.heftings[i];
    if (!h) return;
    h.depth = clamp(d, 0, 3);
    render();
  }
  function walkOff(i) {
    var h = state.heftings[i];
    if (!h) return;
    var li = $heftings.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.heftings.splice(i, 1);
    if (selected >= state.heftings.length) selected = state.heftings.length - 1;
    render();
  }
  function add(text) {
    if (state.heftings.length >= CAP) {
      flashFull();
      return;
    }
    state.heftings.push({ id: id(), title: text.slice(0, 80), depth: 0, cond: 0 });
    selected = state.heftings.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The fell is overstocked. Walk something off the hill before you bring another on.';
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

  // --- reset: double-click the count to clear the fell back to the example ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the fell back to the example flock?')) {
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

  // --- keyboard: the fell is keyboard-first ---
  // N add · J/K move the dog along the line · ]/[ or Enter mind the condition
  // 0–3 walk it down the fell · R or Del send it off the hill
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if (typing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var n = state.heftings.length;
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
        if (n) setDepth(selected, parseInt(e.key, 10)); e.preventDefault(); break;
      case 'r': case 'R': case 'Delete': case 'Backspace':
        if (n) walkOff(selected); e.preventDefault(); break;
    }
  });

  function scrollToSel() {
    var li = $heftings.querySelector('.sel');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
  }

  // a living drift on the line when the flock is loose: a settled heft lies
  // flat and still, a drifting one keeps moving. Held still for reduced-motion.
  var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduce) {
    var phase = 0;
    setInterval(function () {
      var drift = driftLevel();
      if (drift < 0.13) return; // a held flock does not wander
      phase = (phase + 0.32) % (Math.PI * 200);
      $gaugePath.setAttribute('d', gaugePath(drift, phase));
    }, 1300);
  }

  render();
})();
