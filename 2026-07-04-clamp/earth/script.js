/* Earth — the clamp.
 *
 * A small, capped board for the few things you are keeping through a fallow
 * season. Each root sits on two axes: how far into keeping it has come (pulled
 * → strawed → earthed → opened) and how it is faring in there right now (damp →
 * sweating → keeping → sound). The two are not the same thing: a root can be
 * well earthed and still only damp — stored, but not settled — or freshly
 * pulled and already sweating, lifted wet on a warm day and heating before it
 * was ever laid up.
 *
 * A farmer walks only as many ridges as he can feel the length of. Seven, and
 * no more. When the clamp is full the next root waits in the field, topped and
 * drying, until one has been opened and taken in — heap in more than you can
 * walk and the middle goes unread, sweats, and rots outward.
 */

(function () {
  'use strict';

  var CAP = 7;

  var STAGES = [
    { key: 'pulled',  label: 'Pulled',  cls: 'stage-pulled',  chip: 'chip-pulled' },
    { key: 'strawed', label: 'Strawed', cls: 'stage-strawed', chip: 'chip-strawed' },
    { key: 'earthed', label: 'Earthed', cls: 'stage-earthed', chip: 'chip-earthed' },
    { key: 'opened',  label: 'Opened',  cls: 'stage-opened',  chip: 'chip-opened' }
  ];

  var CONDS = [
    { key: 'damp',     label: 'Damp',     chip: 'chip-damp' },
    { key: 'sweating', label: 'Sweating', chip: 'chip-sweating' },
    { key: 'keeping',  label: 'Keeping',  chip: 'chip-keeping' },
    { key: 'sound',    label: 'Sound',    chip: 'chip-sound' }
  ];

  // a fictional clamp partway through a winter's keeping — variety, not a full pit
  var SEED = {
    name: 'Headland',
    roots: [
      { id: id(), title: 'The half-written thesis, laid by', stage: 2, cond: 2 },
      { id: id(), title: 'Seed potatoes for next spring',    stage: 1, cond: 0 },
      { id: id(), title: 'A friendship kept warm by letter', stage: 2, cond: 3 },
      { id: id(), title: 'That idea, buried till there is time', stage: 0, cond: 1 },
      { id: id(), title: 'The house-move fund, not touched', stage: 2, cond: 2 }
    ]
  };

  var state = clone(SEED);
  var selected = 0;

  // --- elements ---
  var $roots = document.getElementById('roots');
  var $form = document.getElementById('add-form');
  var $input = document.getElementById('add-input');
  var $count = document.getElementById('root-count');
  var $name = document.getElementById('clamp-name');
  var $hint = document.getElementById('board-hint');
  var $addBtn = $form.querySelector('.add-btn');

  // --- icons ---
  function svg(inner) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + inner + '</svg>'; }

  function ridgeIcon(cond) {
    // the ridge and how it is faring under the earth
    var ridge = '<path d="M2.5 12.5 C2.5 8.8 5 7.2 8 7.2 C11 7.2 13.5 8.8 13.5 12.5 Z" fill="currentColor" opacity="0.3"/>';
    var breather = '<path d="M8 7.2 V4.2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M6.7 5.4 L8 3.6 L9.3 5.4" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>';
    if (cond === 0) return svg(ridge + breather + '<circle cx="8" cy="10.6" r="1.1" fill="currentColor" opacity="0.7"/>'); // damp — a bead of wet under the ridge
    if (cond === 1) return svg(ridge + '<path d="M6 5.6 C5.4 4.8 6.2 4.4 5.6 3.3" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M10 5.6 C10.6 4.8 9.8 4.4 10.4 3.3" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'); // sweating — heat breathing off the crown
    if (cond === 2) return svg(ridge + breather); // keeping — settled, just the breather
    return svg('<path d="M2.5 12.5 C2.5 9.6 4 8.1 5.6 7.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.5"/><path d="M8.6 4.6 C6.8 6.8 6.8 9.4 8.6 12.2 C10.4 9.4 10.4 6.8 8.6 4.6 Z" fill="currentColor"/><path d="M8.6 12.2 V13.8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'); // sound — ridge opened, a whole root drawn out
  }

  function stageGlyph(si) {
    // the same root taken through the keeping — lying to dry, laid up on straw,
    // earthed over with a breather, then broached and drawn out sound
    var ground = '<path d="M2 13.5 H14" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-linecap="round"/>';
    var forms = [
      '<path d="M4.5 12 C6.5 10.4 9.5 10.4 11.5 12 C9.5 13.2 6.5 13.2 4.5 12 Z" fill="currentColor" opacity="0.6"/>',                                                                                   // pulled — a root lying to dry
      '<path d="M3.6 13 C3.6 9.4 6 7.8 8 7.8 C10 7.8 12.4 9.4 12.4 13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="1.5 1.5" stroke-linecap="round"/>',                        // strawed — a ridge laid, not yet earthed
      '<path d="M3.6 13 C3.6 9.4 6 7.8 8 7.8 C10 7.8 12.4 9.4 12.4 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 7.8 V5.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>', // earthed — ridge closed, a breather at the crown
      '<path d="M3.6 13 C3.6 10.2 4.8 8.8 6 8.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/><circle cx="10.4" cy="11" r="1.9" fill="currentColor"/><path d="M10.4 12.9 V14.2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' // opened — ridge broached, a sound root drawn out
    ];
    return svg(ground + forms[si]);
  }

  // --- model helpers ---
  function id() { return 'r' + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  // --- render ---
  function render() {
    if (selected >= state.roots.length) selected = state.roots.length - 1;
    if (selected < 0) selected = 0;

    $roots.innerHTML = '';
    state.roots.forEach(function (s, i) {
      $roots.appendChild(row(s, i));
    });

    var n = state.roots.length;
    $count.textContent = n + ' / ' + CAP + ' clamped';
    $count.classList.toggle('full', n >= CAP);
    $name.textContent = state.name;

    var full = n >= CAP;
    $addBtn.disabled = full;
    $input.placeholder = full
      ? 'The clamp is full — open a root and take it in first'
      : 'Clamp a root under the ridge…';
  }

  function row(s, i) {
    var stage = STAGES[s.stage];
    var cond = CONDS[s.cond];

    var li = document.createElement('li');
    li.className = 'root ' + stage.cls + (i === selected ? ' sel' : '');
    li.setAttribute('data-i', i);

    // ridge mark — click to read how it's faring (advance the condition)
    var mark = document.createElement('button');
    mark.className = 'root-mark';
    mark.type = 'button';
    mark.innerHTML = ridgeIcon(s.cond);
    mark.title = 'Read the ridge (' + cond.label + ')';
    mark.addEventListener('click', function (e) { e.stopPropagation(); selected = i; bumpCond(i, +1); });

    // body — title + chips, click to edit
    var body = document.createElement('div');
    body.className = 'root-body';
    var title = document.createElement('div');
    title.className = 'root-title';
    title.textContent = s.title;
    var tags = document.createElement('div');
    tags.className = 'root-tags';
    tags.appendChild(chip(stage.label, stage.chip));
    tags.appendChild(chip(cond.label, cond.chip));
    body.appendChild(title);
    body.appendChild(tags);
    body.addEventListener('click', function () { selected = i; edit(i, title); });

    // stage selector — move it along the keeping
    var stages = document.createElement('div');
    stages.className = 'root-stages';
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
    go.className = 'root-go';
    go.type = 'button';
    go.innerHTML = '&times;';
    go.title = 'Open it and take it in';
    go.addEventListener('click', function (e) { e.stopPropagation(); open_(i); });
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
    var s = state.roots[i];
    if (!s) return;
    var input = document.createElement('input');
    input.className = 'root-edit';
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
    var s = state.roots[i];
    if (!s) return;
    s.cond = clamp(s.cond + dir, 0, 3);
    render();
  }
  function setStage(i, st) {
    var s = state.roots[i];
    if (!s) return;
    s.stage = clamp(st, 0, 3);
    render();
  }
  function open_(i) {
    var s = state.roots[i];
    if (!s) return;
    var li = $roots.querySelector('[data-i="' + i + '"]');
    var prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (li && !prefersReduce) {
      li.classList.add('going');
      setTimeout(function () { remove(i); }, 240);
    } else {
      remove(i);
    }
  }
  function remove(i) {
    state.roots.splice(i, 1);
    if (selected >= state.roots.length) selected = state.roots.length - 1;
    render();
  }
  function add(text) {
    if (state.roots.length >= CAP) {
      flashFull();
      return;
    }
    state.roots.push({ id: id(), title: text.slice(0, 80), stage: 0, cond: 0 });
    selected = state.roots.length - 1;
    render();
  }
  function flashFull() {
    $count.classList.add('full');
    var old = $hint.textContent;
    $hint.textContent = 'The clamp is full. Open a root and take it in before you clamp another.';
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
