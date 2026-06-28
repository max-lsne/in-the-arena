/* Spile — the stillage.
 *
 * A small, sound cellar for the few works you are actually drawing down.
 * Each cask sits somewhere on two axes: how far it is drawn down
 * (bunged → spiled → drawing → racked) and what the cask is doing
 * (flat → working → clearing → sound). The cellar line reads the whole
 * cellar at once — level and clear when a few casks are drawn slow,
 * rolling and fretting as too many are broached at once.
 *
 * The stillage holds only so much. Six, and no more. When it is full the
 * next cask does not come down; it stays bunged in the back.
 */

(function () {
  'use strict';

  var STORE_KEY = 'spile.v1';
  var CAP = 6;

  var DEPTHS = [
    { key: 'bunged',  label: 'Bunged',  cls: 'depth-bunged',  chip: 'chip-bunged' },
    { key: 'spiled',  label: 'Spiled',  cls: 'depth-spiled',  chip: 'chip-spiled' },
    { key: 'drawing', label: 'Drawing', cls: 'depth-drawing', chip: 'chip-drawing' },
    { key: 'racked',  label: 'Racked',  cls: 'depth-racked',  chip: 'chip-racked' }
  ];

  var WEATHERS = [
    { key: 'flat',     label: 'Flat',     chip: 'chip-flat' },
    { key: 'working',  label: 'Working',  chip: 'chip-working' },
    { key: 'clearing', label: 'Clearing', chip: 'chip-clearing' },
    { key: 'sound',    label: 'Sound',    chip: 'chip-sound' }
  ];

  // how much air a cask lets reach the cellar, by condition and by stage
  var WEATHER_WIND = [1.0, 0.55, 0.2, 0.05];
  var DEPTH_WIND   = [1.0, 0.65, 0.35, 0.15];

  // a fictional cellar partway through a year — variety, not a full stillage
  var SEED = {
    name: 'Crabtree cellar',
    tendings: [
      { id: id(), title: "Bottle the year's cider",          depth: 3, weather: 3 },
      { id: id(), title: 'Finish the cellar-book memoir',     depth: 2, weather: 2 },
      { id: id(), title: 'Lay down the new orchard plan',     depth: 2, weather: 1 },
      { id: id(), title: 'Learn proper keeving',              depth: 1, weather: 1 },
      { id: id(), title: "Answer the cider-makers' guild",    depth: 0, weather: 0 }
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
  var $name = document.getElementById('cellar-name');
  var $hint = document.getElementById('board-hint');
  var $gaugePath = document.getElementById('gauge-path');
  var $gaugeRead = document.getElementById('gauge-read');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function markIcon(weather) {
    // a small glyph for what the cask is doing
    if (weather === 0) return svg('<path d="M2 8 H14" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M2 11 H14" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.5"/>'); // flat — a still, lifeless surface
    if (weather === 1) return svg('<circle cx="5" cy="11" r="1.3" fill="currentColor"/><circle cx="8.5" cy="8" r="1.6" fill="currentColor"/><circle cx="11.5" cy="5" r="1.1" fill="currentColor"/><circle cx="7" cy="4.5" r="0.9" fill="currentColor" opacity="0.7"/>'); // working — rising bubbles
    if (weather === 2) return svg('<path d="M3 4 H13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="8" r="1.1" fill="currentColor" opacity="0.8"/><circle cx="9.5" cy="10" r="1" fill="currentColor" opacity="0.6"/><circle cx="7.5" cy="12.5" r="0.9" fill="currentColor" opacity="0.45"/>'); // clearing — lees dropping
    return svg('<circle cx="8" cy="8" r="4.4" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/>'); // sound — a clear ringed glass
  }
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function depthGlyph(di) {
    // the same little cask on every button, shown further drawn down as the
    // stage increases — bunged → spiled (peg) → drawing (tap, drip) → racked
    var cask = '<ellipse cx="8" cy="9" rx="4.6" ry="5.6" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.55"/><path d="M3.7 7 H12.3 M3.4 9 H12.6 M3.7 11 H12.3" stroke="currentColor" stroke-width="0.8" opacity="0.4" stroke-linecap="round"/>';
    var marks = [
      '<circle cx="8" cy="3.2" r="1.3" fill="currentColor"/>',                                                              // bunged — stopper in the top
      '<path d="M8 3.4 V1.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><circle cx="8" cy="1.2" r="0.9" fill="currentColor"/>', // spiled — a peg in the top
      '<path d="M12.6 9 H14.4 V11" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="14.4" cy="13" r="0.9" fill="currentColor"/>', // drawing — a tap and a drip
      '<circle cx="8" cy="9" r="2" fill="currentColor"/><circle cx="8" cy="9" r="3.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.7"/>' // racked — dropped bright, ringed
    ];
    return svg(cask + marks[di]);
  }

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

  // --- the cellar line ---
  function windLevel() {
    var ts = state.tendings;
    if (!ts.length) return 0;
    var sum = 0;
    for (var i = 0; i < ts.length; i++) {
      sum += WEATHER_WIND[ts[i].weather] * DEPTH_WIND[ts[i].depth];
    }
    var avg = sum / ts.length;
    // a cellar runs a few casks clear; past that, the load lets air in
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
    // apple-leaf green #6f8154 (sound) → turning red-brown #9b4128 (souring)
    var a = [0x6f, 0x81, 0x54], b = [0x9b, 0x41, 0x28];
    return 'rgb(' + lerp(a[0], b[0], wind) + ',' + lerp(a[1], b[1], wind) + ',' + lerp(a[2], b[2], wind) + ')';
  }

  function windRead(wind) {
    if (wind < 0.001) return 'a dry cellar';
    if (wind < 0.13) return 'clear & level';
    if (wind < 0.32) return 'a faint fret';
    if (wind < 0.55) return 'the cellar working up';
    if (wind < 0.78) return 'fretting hard';
    return 'turning to vinegar';
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
    $count.textContent = n + ' / ' + CAP + ' on the stillage';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The stillage is full — rack one off before you lay another'
      : 'Lay down another cask…';

    paintGauge();
    save();
  }

  function row(t, i) {
    var depth = DEPTHS[t.depth];
    var weather = WEATHERS[t.weather];

    var li = document.createElement('li');
    li.className = 'tending ' + depth.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // condition mark — click to draw (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'tending-mark';
    mark.type = 'button';
    mark.innerHTML = markIcon(t.weather);
    mark.title = 'Draw it (' + weather.label + ')';
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

    // stage selector
    var states = document.createElement('div');
    states.className = 'tending-states';
    DEPTHS.forEach(function (d, di) {
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
    go.title = 'Pour it away';
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
    $hint.textContent = 'The stillage is full. Rack one off before you lay another cask down.';
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

  // --- keyboard: the cellar is keyboard-first ---
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

  // --- reset, double-click the count ---
  $count.addEventListener('dblclick', function () {
    if (window.confirm('Clear the cellar back to the example stillage?')) {
      state = clone(SEED);
      selected = 0;
      render();
    }
  });

  // gentle living ripple on the cellar line when the air is in
  var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduce) {
    setInterval(function () {
      // nudge the phase so a fretting line breathes; a level line stays flat
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
