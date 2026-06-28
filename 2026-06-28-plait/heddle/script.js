/* Heddle — the shed.
 *
 * A small, disciplined board for the few ends you are actually raising and
 * crossing this hour. Each end sits somewhere on two axes: how far through
 * the loom it has come (slack → threaded → raised → crossed) and what the
 * condition of the work is (loose → drawn → picked → beaten). The selvage
 * line reads the whole web at once — it runs straight and even when a few
 * ends are raised and beaten, and puckers and waves as too many are raised
 * at once or left slack.
 *
 * The shed holds only so much. Six raised ends, and no more. When it is
 * full the next end is not raised; it stays slack off the beam.
 */

(function () {
  'use strict';

  var STORE_KEY = 'heddle.v1';
  var CAP = 6;

  var LEVELS = [
    { key: 'slack',    label: 'Slack',    cls: 'depth-slack',    chip: 'chip-slack' },
    { key: 'threaded', label: 'Threaded', cls: 'depth-threaded', chip: 'chip-threaded' },
    { key: 'raised',   label: 'Raised',   cls: 'depth-raised',   chip: 'chip-raised' },
    { key: 'crossed',  label: 'Crossed',  cls: 'depth-crossed',  chip: 'chip-crossed' }
  ];

  var CONDITIONS = [
    { key: 'loose',  label: 'Loose',  chip: 'chip-loose' },
    { key: 'drawn',  label: 'Drawn',  chip: 'chip-drawn' },
    { key: 'picked', label: 'Picked', chip: 'chip-picked' },
    { key: 'beaten', label: 'Beaten', chip: 'chip-beaten' }
  ];

  // how much agitation a thing lets into the web, by condition and by level
  var WEATHER_WIND = [1.0, 0.55, 0.2, 0.05];
  var DEPTH_WIND   = [1.0, 0.65, 0.35, 0.15];

  // a fictional warp partway through the cloth — variety, not a full shed
  var SEED = {
    name: 'Madder runner',
    tendings: [
      { id: id(), title: 'Finish the commissioned throw', depth: 3, weather: 3 },
      { id: id(), title: 'Re-draft the long essay',       depth: 2, weather: 2 },
      { id: id(), title: 'Warp the next sampler',         depth: 2, weather: 1 },
      { id: id(), title: 'Learn to spin worsted',         depth: 1, weather: 1 },
      { id: id(), title: "Reply to the weavers' guild",   depth: 0, weather: 0 }
    ]
  };

  var state = clone(SEED);
  var selected = 0;
  var seq = 0;

  // --- elements ---
  var $tendings = document.getElementById('tendings');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('floor-count');
  var $name = document.getElementById('web-name');
  var $hint = document.getElementById('board-hint');
  var $gaugePath = document.getElementById('gauge-path');
  var $gaugeRead = document.getElementById('gauge-read');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function markIcon(weather) {
    // a small glyph for the condition of the work
    if (weather === 0) return svg('<path d="M2 8 C4 4 5 12 7 8 C9 4 10 12 12 8 C13 6 14 8 14 8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>'); // loose — a tangled slack thread
    if (weather === 1) return svg('<path d="M2 8 H14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M2 5 V11 M14 5 V11" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>'); // drawn — a tensioned straight thread between two pins
    if (weather === 2) return svg('<rect x="4" y="6.4" width="8" height="3.2" rx="1.4" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M2 8 H4 M12 8 H14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'); // picked — a shuttle passing
    return svg('<path d="M3 5 H13 M3 8 H13 M3 11 H13" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>'); // beaten — a beaten weft bar (set picks)
  }
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function depthGlyph(di) {
    // warp threads with the heddle/weft rising progressively through the loom
    // as the level increases — slack end → threaded → lifted into a shed →
    // crossed and woven
    var warp = '<path d="M5 2 V14 M8 2 V14 M11 2 V14" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4" stroke-linecap="round"/>';
    var marks = [
      // slack — an end hanging loose off the beam, untensioned
      '<path d="M8 2 C8 5 10 6 9 9 C8 12 10 13 8 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      // threaded — drawn straight through its eye (a small heddle eye on the line)
      '<path d="M8 2 V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="1.4" fill="none" stroke="currentColor" stroke-width="1"/>',
      // raised — lifted into an open triangular shed
      warp + '<path d="M3 12 L8 4 L13 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      // crossed — woven, weft crossing the warp into cloth
      warp + '<path d="M3 6 H13 M3 10 H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
    ];
    return svg(marks[di]);
  }

  // --- model helpers ---
  function id() { return 'c' + Math.random().toString(36).slice(2, 9); }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clampInt(n, lo, hi) { n = parseInt(n, 10); if (isNaN(n)) return lo; return Math.max(lo, Math.min(hi, n)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // --- the selvage line ---
  function windLevel() {
    var ts = state.tendings;
    if (!ts.length) return 0;
    var sum = 0;
    for (var i = 0; i < ts.length; i++) {
      sum += WEATHER_WIND[ts[i].weather] * DEPTH_WIND[ts[i].depth];
    }
    var avg = sum / ts.length;
    // a shed takes a few ends cleanly; past that, the edge starts to draw in
    var loadPenalty = Math.max(0, ts.length - 4) / (CAP - 4) * 0.3;
    return clamp(avg + loadPenalty, 0, 1);
  }

  function gaugePath(wind) {
    var W = 600, mid = 32, steps = 60;
    var amp = wind * 16;
    var freq = 2 + wind * 5;
    var d = 'M0 ' + mid;
    for (var i = 1; i <= steps; i++) {
      var x = (W / steps) * i;
      var t = i / steps;
      // taper the ripple to nothing at both pinned ends
      var y = mid + Math.sin(t * Math.PI * freq) * amp * Math.sin(t * Math.PI);
      d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function windColor(wind) {
    // flax-water teal #4f7470 → madder red #a8432f
    var a = [0x4f, 0x74, 0x70], b = [0xa8, 0x43, 0x2f];
    return 'rgb(' + lerp(a[0], b[0], wind) + ',' + lerp(a[1], b[1], wind) + ',' + lerp(a[2], b[2], wind) + ')';
  }

  function windRead(wind) {
    if (wind < 0.001) return 'a bare warp';
    if (wind < 0.13) return 'a true selvage';
    if (wind < 0.32) return 'a slight draw-in';
    if (wind < 0.55) return 'the edge waving';
    if (wind < 0.78) return 'puckering badly';
    return 'fraying off the edge';
  }

  function paintGauge() {
    var wind = windLevel();
    $gaugePath.setAttribute('d', gaugePath(wind));
    $gaugePath.setAttribute('stroke', windColor(wind));
    $gaugeRead.textContent = windRead(wind);
    $gaugeRead.style.color = windColor(wind);
  }

  // --- render ---
  function render() {
    if (selected >= state.tendings.length) selected = state.tendings.length - 1;
    if (selected < 0) selected = 0;

    $tendings.innerHTML = '';
    state.tendings.forEach(function (t, i) {
      $tendings.appendChild(row(t, i));
    });

    var n = state.tendings.length;
    $count.textContent = n + ' / ' + CAP + ' in the shed';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The shed is full — beat one in before you raise another'
      : 'Thread another end…';

    paintGauge();
  }

  function row(t, i) {
    var depth = LEVELS[t.depth];
    var weather = CONDITIONS[t.weather];

    var li = document.createElement('li');
    li.className = 'tending ' + depth.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to advance the condition
    var mark = document.createElement('button');
    mark.className = 'tending-mark';
    mark.type = 'button';
    mark.innerHTML = markIcon(t.weather);
    mark.title = 'Work it on (' + weather.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpWeather(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'tending-body';
    var title = document.createElement('div');
    title.className = 'tending-title';
    title.textContent = t.title;
    var tags = document.createElement('div');
    tags.className = 'tending-tags';
    tags.appendChild(chip(depth.label, depth.chip));
    tags.appendChild(chip(weather.label, weather.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // level selector
    var states = document.createElement('div');
    states.className = 'tending-states';
    LEVELS.forEach(function (d, di) {
      var b = document.createElement('button');
      b.className = 'state-btn' + (di === t.depth ? ' on' : '');
      b.type = 'button';
      b.innerHTML = depthGlyph(di);
      b.title = 'Move to ' + d.label;
      b.setAttribute('aria-label', 'Move to ' + d.label);
      b.addEventListener('click', function (e) { e.stopPropagation(); selected = i; setDepth(i, di); });
      states.appendChild(b);
    });
    var go = document.createElement('button');
    go.className = 'tending-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Cut it from the warp';
    go.addEventListener('click', function (e) { e.stopPropagation(); letGoOver(i); });
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
    var t = state.tendings[i];
    if (!t) return;
    var input = document.createElement('input');
    input.className = 'tending-edit';
    input.value = t.title;
    input.maxLength = 80;
    titleEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    var done = function (commit) {
      if (commit) {
        var v = input.value.trim();
        if (v) t.title = v.slice(0, 80);
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
  function bumpWeather(i, dir) {
    var t = state.tendings[i];
    if (!t) return;
    t.weather = clamp(t.weather + dir, 0, 3);
    render();
  }
  function setDepth(i, d) {
    var t = state.tendings[i];
    if (!t) return;
    t.depth = clamp(d, 0, 3);
    render();
  }
  function letGoOver(i) {
    var t = state.tendings[i];
    if (!t) return;
    var li = $tendings.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 280);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.tendings.splice(i, 1);
    if (selected >= state.tendings.length) selected = state.tendings.length - 1;
    render();
  }
  function add(text) {
    if (state.tendings.length >= CAP) {
      flashFull();
      return;
    }
    state.tendings.push({ id: id(), title: text.slice(0, 80), depth: 0, weather: 0 });
    selected = state.tendings.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The shed is full. Beat one end in before you raise another.';
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
