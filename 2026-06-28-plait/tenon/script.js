/* Tenon — the frame.
 *
 * A small, true board for the few joints the whole frame stands on.
 * Each joint sits somewhere on two axes: how worked it is
 * (rough → cut → fitted → seated) and what the joint is doing
 * (loose → paring → driving → holding). The rack line reads the
 * whole frame at once — flat and true when the frame is few and seated,
 * leaning and racking as the joints work loose.
 *
 * The frame holds only so many. Six, and no more. When it is full the
 * next joint does not get cut; you knock one out first.
 */

(function () {
  'use strict';

  var STORE_KEY = 'tenon.v1';
  var CAP = 6;

  var LEVELS = [
    { key: 'rough',  label: 'Rough',  cls: 'depth-rough',  chip: 'chip-rough' },
    { key: 'cut',    label: 'Cut',    cls: 'depth-cut',    chip: 'chip-cut' },
    { key: 'fitted', label: 'Fitted', cls: 'depth-fitted', chip: 'chip-fitted' },
    { key: 'seated', label: 'Seated', cls: 'depth-seated', chip: 'chip-seated' }
  ];

  var CONDITIONS = [
    { key: 'loose',   label: 'Loose',   chip: 'chip-loose' },
    { key: 'paring',  label: 'Paring',  chip: 'chip-paring' },
    { key: 'driving', label: 'Driving', chip: 'chip-driving' },
    { key: 'holding', label: 'Holding', chip: 'chip-holding' }
  ];

  // how much rack a joint lets into the frame, by condition and by level
  var WEATHER_WIND = [1.0, 0.55, 0.2, 0.05];
  var DEPTH_WIND   = [1.0, 0.65, 0.35, 0.15];

  // a fictional frame partway through a build — variety, not a finished frame
  var SEED = {
    name: 'Oak trestle',
    tendings: [
      { id: id(), title: 'Ship the studio rebuild',     depth: 3, weather: 3 },
      { id: id(), title: "Cut the book's middle act",   depth: 2, weather: 2 },
      { id: id(), title: 'Re-rail the workshop bench',  depth: 2, weather: 1 },
      { id: id(), title: 'Learn proper sharpening',     depth: 1, weather: 1 },
      { id: id(), title: 'Answer the gallery email',    depth: 0, weather: 0 }
    ]
  };

  var state = load();
  var selected = 0;
  var seq = 0;

  // --- elements ---
  var $tendings = document.getElementById('tendings');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('floor-count');
  var $name = document.getElementById('frame-name');
  var $hint = document.getElementById('board-hint');
  var $gaugePath = document.getElementById('gauge-path');
  var $gaugeRead = document.getElementById('gauge-read');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function markIcon(weather) {
    // a small glyph for what the joint is doing
    if (weather === 0) return svg('<path d="M3 4 V12 M3 4 H7 M3 12 H7" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 4 V12 M10 4 H13.5 M10 12 H13.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'); // gapped joint, halves apart
    if (weather === 1) return svg('<path d="M12 3 L13 4 L6 11 L4.5 11.5 L5 10 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M3 13 H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'); // a chisel paring
    if (weather === 2) return svg('<path d="M8 2 V10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5 5 L8 2 L11 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12 H12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'); // a peg driven home
    return svg('<rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/>'); // tight pegged joint
  }
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function depthGlyph(di) {
    // the same little joint on every button, with the tenon seated deeper
    // into the mortise as the level rises — Cut and Seated no longer collide
    var post = '<rect x="2.5" y="2.5" width="4.5" height="11" rx="0.6" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.55"/>';
    // mortise mouth on the inner face of the post
    var mortise = '<path d="M7 5.5 V10.5" stroke="currentColor" stroke-width="1" opacity="0.45"/>';
    // the rail comes in from the right; the tenon (the short stub) seats progressively deeper
    var depths = [3.0, 1.2, -0.6, -0.6];
    var tx = depths[di];
    var rail = '<rect x="' + (7.6 + (di < 3 ? tx : tx)) + '" y="6.2" width="' + (6 - (di < 3 ? tx : tx)) + '" height="3.6" rx="0.6" fill="none" stroke="currentColor" stroke-width="1.1"/>';
    // the projecting tenon stub, into the mortise
    var tenon = '<rect x="' + (5.5 + tx) + '" y="6.9" width="' + (2.2 - (tx < 0 ? 0 : 0)) + '" height="2.2" fill="currentColor" opacity="0.85"/>';
    // a drawbore peg through the seated joint (only at Seated)
    var peg = di === 3 ? '<circle cx="6.4" cy="8" r="0.95" fill="currentColor"/>' : '';
    return svg(post + mortise + rail + tenon + peg);
  }

  // --- model helpers ---
  function id() { return 't' + Math.random().toString(36).slice(2, 9); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(SEED);
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tendings)) return clone(SEED);
      parsed.tendings = parsed.tendings.slice(0, CAP).map(function (t) {
        return {
          id: t.id || id(),
          title: String(t.title || '').slice(0, 80),
          depth: clampInt(t.depth, 0, 3),
          weather: clampInt(t.weather, 0, 3)
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

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clampInt(n, lo, hi) { n = parseInt(n, 10); if (isNaN(n)) return lo; return Math.max(lo, Math.min(hi, n)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // --- the rack line ---
  function windLevel() {
    var ts = state.tendings;
    if (!ts.length) return 0;
    var sum = 0;
    for (var i = 0; i < ts.length; i++) {
      sum += WEATHER_WIND[ts[i].weather] * DEPTH_WIND[ts[i].depth];
    }
    var avg = sum / ts.length;
    // a frame carries a few joints true; past that, the load racks it
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
      // taper the lean to nothing at both pinned ends
      var y = mid + Math.sin(t * Math.PI * freq) * amp * Math.sin(t * Math.PI);
      d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function windColor(wind) {
    // true workshop green-grey #6b7e74 → split-heartwood red #9c4b2e
    var a = [0x6b, 0x7e, 0x74], b = [0x9c, 0x4b, 0x2e];
    return 'rgb(' + lerp(a[0], b[0], wind) + ',' + lerp(a[1], b[1], wind) + ',' + lerp(a[2], b[2], wind) + ')';
  }

  function windRead(wind) {
    if (wind < 0.001) return 'true — bare frame';
    if (wind < 0.13) return 'true';
    if (wind < 0.32) return 'barely out of true';
    if (wind < 0.55) return 'a lean getting in';
    if (wind < 0.78) return 'racking on the floor';
    return 'racked right over';
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
    $count.textContent = n + ' / ' + CAP + ' in the frame';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The frame is full — knock a joint out before you cut another'
      : 'Mark out another joint…';

    paintGauge();
    save();
  }

  function row(t, i) {
    var depth = LEVELS[t.depth];
    var weather = CONDITIONS[t.weather];

    var li = document.createElement('li');
    li.className = 'tending ' + depth.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to drive it on (advance the condition)
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
      b.title = 'Work to ' + d.label;
      b.setAttribute('aria-label', 'Work to ' + d.label);
      b.addEventListener('click', function (e) { e.stopPropagation(); selected = i; setDepth(i, di); });
      states.appendChild(b);
    });
    var go = document.createElement('button');
    go.className = 'tending-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Knock it out of the frame';
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
    $hint.textContent = 'The frame is full. Knock a joint out before you cut another.';
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

  // --- add form ---
  $form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $input.value.trim();
    if (!v) return;
    add(v);
    $input.value = '';
  });

  // --- keyboard: the frame is keyboard-first ---
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if (typing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var n = state.tendings.length;
    switch (e.key) {
      case 'n': case 'N':
        e.preventDefault(); $input.focus(); break;
      case 'j': case 'J': case 'ArrowDown':
        if (n) { selected = (selected + 1) % n; render(); scrollToSel(); } e.preventDefault(); break;
      case 'k': case 'K': case 'ArrowUp':
        if (n) { selected = (selected - 1 + n) % n; render(); scrollToSel(); } e.preventDefault(); break;
      case ']':
        if (n) bumpWeather(selected, +1); e.preventDefault(); break;
      case '[':
        if (n) bumpWeather(selected, -1); e.preventDefault(); break;
      case 'Enter':
        if (n) bumpWeather(selected, +1); e.preventDefault(); break;
      case '0': case '1': case '2': case '3':
        if (n) setDepth(selected, parseInt(e.key, 10)); e.preventDefault(); break;
      case 'r': case 'R': case 'Delete': case 'Backspace':
        if (n) letGoOver(selected); e.preventDefault(); break;
    }
  });

  function scrollToSel() {
    var li = $tendings.querySelector('.sel');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
  }

  // --- reset, double-click the joint count ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the frame back to the example build?')) {
      state = clone(SEED);
      selected = 0;
      render();
    }
  });

  render();
})();
