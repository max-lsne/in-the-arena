/* Coombe — the hollow.
 *
 * A small, sheltered board for the few things you are actually tending.
 * Each tending sits somewhere on two axes: how deep in the fold it is
 * (rim → slope → floor → spring) and what the weather is doing to it
 * (exposed → sheltered → tended → still). The shelter line reads the
 * whole coombe at once — flat and still when the fold is few and tended,
 * lifting and rippling as the wind gets in.
 *
 * The coombe holds only so much. Six, and no more. When it is full the
 * next thing does not come down; it goes over the ridge.
 */

(function () {
  'use strict';

  var STORE_KEY = 'coombe.v1';
  var CAP = 6;

  var DEPTHS = [
    { key: 'rim',    label: 'Rim',    cls: 'depth-rim',    chip: 'chip-rim' },
    { key: 'slope',  label: 'Slope',  cls: 'depth-slope',  chip: 'chip-slope' },
    { key: 'floor',  label: 'Floor',  cls: 'depth-floor',  chip: 'chip-floor' },
    { key: 'spring', label: 'Spring', cls: 'depth-spring', chip: 'chip-spring' }
  ];

  var WEATHERS = [
    { key: 'exposed',   label: 'Exposed',   chip: 'chip-exposed' },
    { key: 'sheltered', label: 'Sheltered', chip: 'chip-sheltered' },
    { key: 'tended',    label: 'Tended',    chip: 'chip-tended' },
    { key: 'still',     label: 'Still',     chip: 'chip-still' }
  ];

  // how much wind a thing lets reach the floor, by weather and by depth
  var WEATHER_WIND = [1.0, 0.55, 0.2, 0.05];
  var DEPTH_WIND   = [1.0, 0.65, 0.35, 0.15];

  // a fictional coombe partway through a year — variety, not a full fold
  var SEED = {
    name: 'Nettlecombe',
    tendings: [
      { id: id(), title: 'Sunday calls with Mum',        depth: 3, weather: 3 },
      { id: id(), title: "Finish the novel's second draft", depth: 2, weather: 2 },
      { id: id(), title: 'Rebuild the studio site',       depth: 2, weather: 1 },
      { id: id(), title: 'Learn to swim properly',        depth: 1, weather: 1 },
      { id: id(), title: 'Reply to the recruiter',        depth: 0, weather: 0 }
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
  var $name = document.getElementById('coombe-name');
  var $hint = document.getElementById('board-hint');
  var $gaugePath = document.getElementById('gauge-path');
  var $gaugeRead = document.getElementById('gauge-read');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function markIcon(weather) {
    // a small glyph for what the weather is doing
    if (weather === 0) return svg('<path d="M3 6 H13 M3 9 H11 M3 12 H13" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>'); // wind lines
    if (weather === 1) return svg('<path d="M2 11 C5 11 6 6 8 6 C10 6 11 11 14 11" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>'); // a fold
    if (weather === 2) return svg('<path d="M8 3 V13 M5 6 L8 3 L11 6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="13" r="0" /><path d="M3 13 H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'); // watered / grounded
    return svg('<circle cx="8" cy="8" r="4.4" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/>'); // still — the spring
  }
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  // --- model helpers ---
  function id() { return 'c' + Math.random().toString(36).slice(2, 9); }

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

  // --- the shelter line ---
  function windLevel() {
    var ts = state.tendings;
    if (!ts.length) return 0;
    var sum = 0;
    for (var i = 0; i < ts.length; i++) {
      sum += WEATHER_WIND[ts[i].weather] * DEPTH_WIND[ts[i].depth];
    }
    var avg = sum / ts.length;
    // a coombe holds a few comfortably; past that, the load lets wind in
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
    // water-calm #6f8a8c → heather-windy #8a6a86
    var a = [0x6f, 0x8a, 0x8c], b = [0x8a, 0x6a, 0x86];
    return 'rgb(' + lerp(a[0], b[0], wind) + ',' + lerp(a[1], b[1], wind) + ',' + lerp(a[2], b[2], wind) + ')';
  }

  function windRead(wind) {
    if (wind < 0.001) return 'still — empty fold';
    if (wind < 0.13) return 'still';
    if (wind < 0.32) return 'sheltered';
    if (wind < 0.55) return 'a breeze getting in';
    if (wind < 0.78) return 'gusting on the floor';
    return 'scoured — wind right down';
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
    $count.textContent = n + ' / ' + CAP + ' in the fold';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The coombe is full — something has to go over the ridge'
      : 'Bring something down off the top…';

    paintGauge();
    save();
  }

  function row(t, i) {
    var depth = DEPTHS[t.depth];
    var weather = WEATHERS[t.weather];

    var li = document.createElement('li');
    li.className = 'tending ' + depth.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // weather mark — click to tend (advance the weather)
    var mark = document.createElement('button');
    mark.className = 'tending-mark';
    mark.type = 'button';
    mark.innerHTML = markIcon(t.weather);
    mark.title = 'Tend it (' + weather.label + ')';
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

    // depth selector
    var states = document.createElement('div');
    states.className = 'tending-states';
    DEPTHS.forEach(function (d, di) {
      var b = document.createElement('button');
      b.className = 'state-btn' + (di === t.depth ? ' on' : '');
      b.type = 'button';
      b.textContent = d.label.charAt(0);
      b.title = 'Move to ' + d.label;
      b.addEventListener('click', function (e) { e.stopPropagation(); selected = i; setDepth(i, di); });
      states.appendChild(b);
    });
    var go = document.createElement('button');
    go.className = 'tending-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Let it go over the ridge';
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
    $hint.textContent = 'The coombe is full. Let something go over the ridge before you bring another down.';
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

  // --- keyboard: the coombe is keyboard-first ---
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

  // --- reset, double-click the floor count ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the coombe back to the example fold?')) {
      state = clone(SEED);
      selected = 0;
      render();
    }
  });

  // gentle living ripple on the shelter line when the wind is up
  var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduce) {
    setInterval(function () {
      // nudge the phase so a windy line breathes; a still line stays flat
      var wind = windLevel();
      if (wind < 0.13) return;
      seq = (seq + 1) % 1000;
      var W = 600, mid = 32, steps = 60;
      var amp = wind * 16, freq = 2 + wind * 5, ph = seq * 0.35;
      var d = 'M0 ' + mid;
      for (var i = 1; i <= steps; i++) {
        var x = (W / steps) * i, t = i / steps;
        var y = mid + Math.sin(t * Math.PI * freq + ph) * amp * Math.sin(t * Math.PI);
        d += ' L' + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      $gaugePath.setAttribute('d', d);
    }, 1400);
  }

  render();
})();
