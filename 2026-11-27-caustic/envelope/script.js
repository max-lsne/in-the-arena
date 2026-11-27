/* Envelope — the curve a family of straight lines wraps itself around.
 *
 * A family of lines is a line L(t) for each value of a parameter t. As t advances the line turns and
 * slides, and two lines a hair apart cross close by; the limit of those crossings as the pair draws
 * together is the point where the line is TANGENT to the family's ENVELOPE — the curve every line
 * touches and none crosses. It is computed here with no closed form: sample t finely, and for each
 * adjacent pair of lines mark where they meet; those meeting points ARE the envelope.
 *
 * Two families:
 *   ladder — a segment of length L with ends on the two axes: A = (L cos t, 0), B = (0, L sin t).
 *            Its envelope is an ASTROID, x^(2/3)+y^(2/3) = L^(2/3), a four-cusped hypocycloid.
 *   chords — the times-table on a circle: each point A(t) = (cos t, sin t) joined to its m-th multiple
 *            B = (cos mt, sin mt). The envelope is an EPICYCLOID of m−1 cusps — a cardioid at m=2, a
 *            nephroid at m=3 — the same curves the cup folds its light onto and a wheel on a wheel rolls.
 *            A non-whole m never closes and the figure precesses.
 * Everything is recomputed each frame from the family; nothing is canned. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  const S = {
    mode: 'ladder',          // 'ladder' | 'chords'
    len: 160,                // hundredths — ladder length
    mult: 200,               // hundredths — chord multiplier
    lines: 90,
    showLines: true,
    sweep: false, active: 0,
    dragging: false,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'caustic-envelope';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ mode: S.mode, len: S.len, mult: S.mult, lines: S.lines, showLines: S.showLines })); } catch (_) {} };
  const stored = load();
  if (stored.mode === 'ladder' || stored.mode === 'chords') S.mode = stored.mode;
  if (typeof stored.len === 'number') S.len = Math.max(60, Math.min(240, Math.round(stored.len)));
  if (typeof stored.mult === 'number') S.mult = Math.max(200, Math.min(700, Math.round(stored.mult)));
  if (typeof stored.lines === 'number') S.lines = Math.max(12, Math.min(200, Math.round(stored.lines)));
  if (typeof stored.showLines === 'boolean') S.showLines = stored.showLines;

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      guide: g('--brass'), guide2: g('--brass-2'),
      line: g('--steel'), line2: g('--steel-2'),
      env: g('--spring'), env2: g('--spring-2'),
      keep: g('--keep'), drift: g('--drift'),
    };
  }
  readColors();
  const mqD = matchMedia('(prefers-color-scheme: dark)');
  mqD.addEventListener && mqD.addEventListener('change', readColors);

  const cv = $('fig');
  const BASE_W = 520, BASE_H = 460;
  function fit(canvas, baseW, baseH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth || baseW;
    const h = w * baseH / baseW;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // ---------- helpers ----------
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }
  function meet(A, u, B, v) {
    const den = u.x * v.y - u.y * v.x;
    if (Math.abs(den) < 1e-7) return null;
    const t = ((B.x - A.x) * v.y - (B.y - A.y) * v.x) / den;
    return { x: A.x + t * u.x, y: A.y + t * u.y };
  }

  // ---------- the family ----------
  const L = () => S.len / 100;
  const M = () => S.mult / 100;
  function seg(t) {                                   // {A, B} — the drawn segment at parameter t
    if (S.mode === 'ladder') return { A: { x: L() * Math.cos(t), y: 0 }, B: { x: 0, y: L() * Math.sin(t) } };
    return { A: { x: Math.cos(t), y: Math.sin(t) }, B: { x: Math.cos(M() * t), y: Math.sin(M() * t) } };
  }
  function lineAt(t) { const { A, B } = seg(t); return { A, u: { x: B.x - A.x, y: B.y - A.y } }; }
  const wholeMult = () => Math.abs(M() - Math.round(M())) < 0.02;

  // ---------- envelope (intersection of adjacent lines) ----------
  function envPoints() {
    const precess = S.mode === 'chords' && !wholeMult();
    const tMax = precess ? TAU * 8 : TAU;
    const N = precess ? 2600 : 1500, pts = [];
    let prev = lineAt(0);
    for (let i = 1; i <= N; i++) {
      const t = tMax * i / N, cur = lineAt(t);
      const m = meet(prev.A, prev.u, cur.A, cur.u);
      pts.push(m && Math.hypot(m.x, m.y) < 6 ? m : null);
      prev = cur;
    }
    return pts;
  }
  function envAt(t) { const d = 1e-3, a = lineAt(t), b = lineAt(t + d); return meet(a.A, a.u, b.A, b.u); }

  // ---------- geometry / fit ----------
  function worldMax() { return S.mode === 'ladder' ? Math.max(L(), 0.6) * 1.08 : 1.12; }
  function frame(w, h) {
    const cx = w / 2, cy = h / 2;
    const scale = (Math.min(w, h) / 2 - 18) / worldMax();
    return { cx, cy, scale, X: (x) => cx + x * scale, Y: (y) => cy - y * scale };
  }

  // ---------- naming ----------
  function kind() {
    if (S.mode === 'ladder') return { family: 'sliding ladder', name: 'astroid', cusps: 4, closes: 'one turn', cls: 'named', note: 'a ladder on two walls' };
    const m = M();
    if (!wholeMult()) return { family: 'times-table of chords', name: 'an open figure', cusps: 0, closes: 'never — precesses', cls: 'open', note: 'the multiplier is not whole' };
    const mi = Math.round(m);
    if (mi === 2) return { family: 'times-table of chords', name: 'cardioid', cusps: 1, closes: 'one turn', cls: 'named', note: 'each point joined to its double' };
    if (mi === 3) return { family: 'times-table of chords', name: 'nephroid', cusps: 2, closes: 'one turn', cls: 'named', note: 'each point joined to its triple' };
    return { family: 'times-table of chords', name: 'epicycloid, ' + (mi - 1) + ' cusps', cusps: mi - 1, closes: 'one turn', cls: 'closed', note: 'each point joined to its ' + mi + '×' };
  }

  // ---------- drawing ----------
  function drawGuide(ctx, F) {
    ctx.strokeStyle = withA(C.guide, 0.3); ctx.lineWidth = 1;
    if (S.mode === 'ladder') {
      const e = worldMax();
      ctx.beginPath(); ctx.moveTo(F.X(-e), F.Y(0)); ctx.lineTo(F.X(e), F.Y(0));
      ctx.moveTo(F.X(0), F.Y(-e)); ctx.lineTo(F.X(0), F.Y(e)); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(F.cx, F.cy, F.scale, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = withA(C.ink, 0.4); ctx.beginPath(); ctx.arc(F.cx, F.cy, 2, 0, TAU); ctx.fill();
  }

  function drawFamily(ctx, F) {
    if (!S.showLines) return;
    ctx.strokeStyle = withA(C.line, 0.3); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < S.lines; i++) {
      const { A, B } = seg(TAU * i / S.lines);
      ctx.moveTo(F.X(A.x), F.Y(A.y)); ctx.lineTo(F.X(B.x), F.Y(B.y));
    }
    ctx.stroke();
  }

  function drawEnvelope(ctx, F) {
    const pts = envPoints();
    ctx.strokeStyle = C.env; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); let pen = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p) { pen = false; continue; }
      const x = F.X(p.x), y = F.Y(p.y);
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
  }

  function drawActive(ctx, F) {
    const t = TAU * S.active, { A, B } = seg(t);
    ctx.strokeStyle = C.env2; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(F.X(A.x), F.Y(A.y)); ctx.lineTo(F.X(B.x), F.Y(B.y)); ctx.stroke();
    ctx.fillStyle = C.line2;
    ctx.beginPath(); ctx.arc(F.X(A.x), F.Y(A.y), 2.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(F.X(B.x), F.Y(B.y), 2.8, 0, TAU); ctx.fill();
    const e = envAt(t);
    if (e && Math.hypot(e.x, e.y) < 6) {
      ctx.fillStyle = C.env; ctx.beginPath(); ctx.arc(F.X(e.x), F.Y(e.y), 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(F.X(e.x), F.Y(e.y), 4, 0, TAU); ctx.stroke();
    }
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    const F = frame(w, h);
    drawGuide(ctx, F);
    drawFamily(ctx, F);
    drawEnvelope(ctx, F);
    drawActive(ctx, F);
    setVerdict();
  }

  // ---------- readings / verdict ----------
  function updateReading() {
    const k = kind();
    $('r-family').textContent = k.family;
    $('r-kind').textContent = k.name;
    $('r-cusps').textContent = k.cusps === 0 ? '—' : String(k.cusps);
    $('r-close').textContent = k.closes;
  }
  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub'), k = kind();
    vEl.classList.remove('v-closed', 'v-named', 'v-open', 'v-rest');
    vEl.classList.add('v-' + k.cls);
    if (k.cls === 'open') vt.textContent = 'Open — ' + k.note + ', the figure precesses';
    else { const art = /^[aeiou]/i.test(k.name) ? 'An ' : 'A '; vt.textContent = art + k.name + ' — ' + k.note; }
    vs.textContent = S.sweep ? 'sweeping' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.sweep && !RM.matches) { S.active = (S.active + 1 / 480) % 1; draw(); }
    requestAnimationFrame(tick);
  }
  function setSweep(p) {
    if (p && RM.matches) p = false;
    S.sweep = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Sweep';
  }

  // ---------- controls ----------
  const lenEl = $('len'), multEl = $('mult'), linesEl = $('lines');
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('len-v').textContent = (S.len / 100).toFixed(2);
    $('mult-v').textContent = (S.mult / 100).toFixed(2);
    $('lines-v').textContent = S.lines;
    lenEl.value = S.len; multEl.value = S.mult; linesEl.value = S.lines;
    fillSlider(lenEl, S.len, 60, 240); fillSlider(multEl, S.mult, 200, 700); fillSlider(linesEl, S.lines, 12, 200);
    $('len-ctl').hidden = S.mode !== 'ladder';
    $('mult-ctl').hidden = S.mode !== 'chords';
    $('mode-btn').textContent = S.mode === 'ladder' ? 'Sliding ladder' : 'Times-table';
    $('mode-btn').setAttribute('aria-pressed', S.mode === 'chords' ? 'true' : 'false');
    $('lines-btn').setAttribute('aria-pressed', S.showLines ? 'true' : 'false');
  }
  function changed() { syncLabels(); updateReading(); save(); draw(); }

  lenEl.addEventListener('input', () => { S.len = +lenEl.value; changed(); });
  multEl.addEventListener('input', () => { S.mult = +multEl.value; changed(); });
  linesEl.addEventListener('input', () => { S.lines = +linesEl.value; syncLabels(); save(); draw(); });
  $('mode-btn').addEventListener('click', () => { S.mode = S.mode === 'ladder' ? 'chords' : 'ladder'; changed(); });
  $('lines-btn').addEventListener('click', () => { S.showLines = !S.showLines; save(); syncLabels(); draw(); });
  $('run-btn').addEventListener('click', () => setSweep(!S.sweep));

  // ---------- drag: scrub the active line round ----------
  function worldFromEvent(e) {
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const F = frame(BASE_W, BASE_H);
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    const sy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / sc;
    return { x: (sx - F.cx) / F.scale, y: -(sy - F.cy) / F.scale };
  }
  function scrubTo(q) {
    let best = S.active, bd = 1e18; const N = 720;
    for (let i = 0; i <= N; i++) {
      const t = TAU * i / N, e = envAt(t);
      if (!e) continue;
      const dd = (e.x - q.x) ** 2 + (e.y - q.y) ** 2;
      if (dd < bd) { bd = dd; best = i / N; }
    }
    S.active = best;
  }
  function startDrag(e) { S.dragging = true; setSweep(false); scrubTo(worldFromEvent(e)); draw(); cv.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; scrubTo(worldFromEvent(e)); draw(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; cv.style.cursor = 'crosshair'; draw(); } }
  cv.style.cursor = 'crosshair';
  cv.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  cv.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setSweep(!S.sweep); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); $('mode-btn').click(); }
    else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); $('lines-btn').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (S.mode === 'ladder') S.len = Math.max(60, S.len - 4); else S.mult = Math.max(200, S.mult - 2); changed(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (S.mode === 'ladder') S.len = Math.min(240, S.len + 4); else S.mult = Math.min(700, S.mult + 2); changed(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); S.lines = Math.min(200, S.lines + 4); syncLabels(); save(); draw(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); S.lines = Math.max(12, S.lines - 4); syncLabels(); save(); draw(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setSweep(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  S.active = RM.matches ? 0.13 : 0;
  syncLabels(); updateReading(); draw();
  if (live) {
    const k = kind();
    const fam = S.mode === 'ladder'
      ? `A ladder of length ${(S.len / 100).toFixed(2)} sliding with its ends on the two axes`
      : `Chords joining each point of a circle to its ${(S.mult / 100).toFixed(2)}× multiple`;
    live.textContent = `${fam}. The straight lines all lean against one curve — here ${k.name}, ${k.note}${k.cusps ? ', ' + k.cusps + (k.cusps === 1 ? ' cusp' : ' cusps') : ''}. The curve is found as the envelope of the lines, where each meets its neighbour. Press space to sweep a single line round and watch it kiss the curve, F to switch between the sliding ladder and the times-table of chords, L to show or hide the lines, and the arrow keys to change the ${S.mode === 'ladder' ? 'length' : 'multiplier'} and the number of lines.`;
  }
  requestAnimationFrame(tick);
})();
