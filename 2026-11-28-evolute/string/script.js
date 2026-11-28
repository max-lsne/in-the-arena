/* String — the involute of a curve, as a taut thread let out by real arc length.
 *
 * Pin a thread at the start of a base curve B(u) and peel it off keeping it tight. When the thread has let
 * go of the arc from the pin to the foot F = B(u), that released length is let(u) = ∫|B'| du, and the thread
 * runs straight from F along the unit tangent T(u) for exactly that length. Its tip — the free end — is
 *     I(u) = B(u) − let(u)·T(u).
 * As u advances, I(u) traces the INVOLUTE. The thread is tangent to the base at F and perpendicular to the
 * involute at I, so each thread is one of the involute's NORMALS, and every thread touches the base: the base
 * is the ENVELOPE of the involute's normals — its EVOLUTE. Unwinding is the evolute run backwards.
 * Everything is numeric: the base is sampled, arc length accumulated as the running sum of segment lengths,
 * the tangent taken by central difference. No involute is drawn from a closed form — the curve follows the
 * string's end. Bases: a circle (→ the gear-tooth involute spiral), a cycloid (→ an equal cycloid, Huygens'
 * isochrone), an astroid (→ a larger astroid). */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  const BASES = [
    { key: 'circle',  label: 'circle',  R: 0.52, span: 1.80 * Math.PI,
      B: (u, R) => ({ x: R * Math.cos(u), y: R * Math.sin(u) }),
      kind: 'a spiral', note: 'the gear-tooth involute of a circle' },
    { key: 'cycloid', label: 'cycloid', R: 0.42, span: TAU,
      B: (u, R) => ({ x: R * (u - Math.sin(u)) - R * Math.PI, y: R * (1 - Math.cos(u)) - R }),
      kind: 'an equal cycloid', note: "a congruent cycloid — Huygens' isochrone" },
    { key: 'astroid', label: 'astroid', R: 0.86, span: TAU,
      B: (u, R) => ({ x: R * Math.cos(u) ** 3, y: R * Math.sin(u) ** 3 }),
      kind: 'a larger astroid', note: 'an astroid twice the size' },
  ];

  const S = {
    base: 0,                 // index into BASES
    wind: 100,               // percent of the string let out
    threads: 22,             // taut threads drawn
    showThreads: true,
    sweep: false,
    dragging: false,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'evolute-string';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ base: S.base, wind: S.wind, threads: S.threads, showThreads: S.showThreads })); } catch (_) {} };
  const stored = load();
  if (typeof stored.base === 'number' && stored.base >= 0 && stored.base < BASES.length) S.base = stored.base | 0;
  if (typeof stored.wind === 'number') S.wind = Math.max(0, Math.min(100, Math.round(stored.wind)));
  if (typeof stored.threads === 'number') S.threads = Math.max(4, Math.min(80, Math.round(stored.threads)));
  if (typeof stored.showThreads === 'boolean') S.showThreads = stored.showThreads;

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      base: g('--brass'), base2: g('--brass-2'),
      thread: g('--steel'), thread2: g('--steel-2'),
      invo: g('--spring'), invo2: g('--spring-2'),
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
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }

  // ---------- sample the base, its arc length, and the involute ----------
  const K = 1000;
  let SMP = null;        // { base:[{x,y}], len:[], tan:[{x,y}], invo:[{x,y}], bbox:{...} }
  function buildSamples() {
    const def = BASES[S.base], R = def.R, span = def.span;
    const base = [], len = [0], tan = [], invo = [];
    for (let i = 0; i <= K; i++) base.push(def.B(span * i / K, R));
    for (let i = 1; i <= K; i++) len.push(len[i - 1] + Math.hypot(base[i].x - base[i - 1].x, base[i].y - base[i - 1].y));
    for (let i = 0; i <= K; i++) {
      const a = base[Math.max(0, i - 1)], b = base[Math.min(K, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1;
      tan.push({ x: dx / m, y: dy / m });
    }
    for (let i = 0; i <= K; i++) invo.push({ x: base[i].x - len[i] * tan[i].x, y: base[i].y - len[i] * tan[i].y });
    // bounding box over base + full involute, for a stable fit as the string lets out
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const eat = (p) => { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; };
    base.forEach(eat); invo.forEach(eat);
    SMP = { base, len, tan, invo, bbox: { x0, y0, x1, y1 } };
  }

  function frame(w, h) {
    const bb = SMP.bbox, bw = bb.x1 - bb.x0 || 1, bh = bb.y1 - bb.y0 || 1;
    const cx = w / 2, cy = h / 2;
    const scale = Math.min((w - 40) / bw, (h - 40) / bh);
    const mx = (bb.x0 + bb.x1) / 2, my = (bb.y0 + bb.y1) / 2;
    return { cx, cy, scale, X: (x) => cx + (x - mx) * scale, Y: (y) => cy - (y - my) * scale };
  }

  const windIdx = () => Math.max(0, Math.min(K, Math.round(S.wind / 100 * K)));

  // ---------- drawing ----------
  function drawBase(ctx, F) {
    const b = SMP.base;
    ctx.strokeStyle = withA(C.base, 0.92); ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= K; i++) { const x = F.X(b[i].x), y = F.Y(b[i].y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function drawThreads(ctx, F) {
    if (!S.showThreads) return;
    const w = windIdx(); if (w < 1) return;
    ctx.strokeStyle = withA(C.thread, 0.26); ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 1; k <= S.threads; k++) {
      const i = Math.round(k / S.threads * w); if (i < 1) continue;
      ctx.moveTo(F.X(SMP.base[i].x), F.Y(SMP.base[i].y));
      ctx.lineTo(F.X(SMP.invo[i].x), F.Y(SMP.invo[i].y));
    }
    ctx.stroke();
  }
  function drawInvolute(ctx, F) {
    const w = windIdx(); if (w < 1) return;
    const iv = SMP.invo;
    ctx.strokeStyle = C.invo; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= w; i++) { const x = F.X(iv[i].x), y = F.Y(iv[i].y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function drawActive(ctx, F) {
    const w = windIdx();
    const foot = SMP.base[w], tip = SMP.invo[w];
    // the live taut thread
    ctx.strokeStyle = withA(C.thread2, 0.95); ctx.lineWidth = 1.9;
    ctx.beginPath(); ctx.moveTo(F.X(foot.x), F.Y(foot.y)); ctx.lineTo(F.X(tip.x), F.Y(tip.y)); ctx.stroke();
    // the pin, where the string starts
    const pin = SMP.base[0];
    ctx.fillStyle = withA(C.ink, 0.5); ctx.beginPath(); ctx.arc(F.X(pin.x), F.Y(pin.y), 2.6, 0, TAU); ctx.fill();
    // the foot — where the thread leaves the base, tangent there
    ctx.fillStyle = C.base2; ctx.beginPath(); ctx.arc(F.X(foot.x), F.Y(foot.y), 3, 0, TAU); ctx.fill();
    // the free end, drawing the involute
    ctx.fillStyle = C.invo; ctx.beginPath(); ctx.arc(F.X(tip.x), F.Y(tip.y), 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(F.X(tip.x), F.Y(tip.y), 4, 0, TAU); ctx.stroke();
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    const F = frame(w, h);
    drawThreads(ctx, F);
    drawBase(ctx, F);
    drawInvolute(ctx, F);
    drawActive(ctx, F);
    setVerdict();
  }

  // ---------- readings / verdict ----------
  function updateReading() {
    const def = BASES[S.base], w = windIdx();
    $('r-base').textContent = def.label;
    $('r-kind').textContent = def.kind;
    $('r-len').textContent = SMP.len[w].toFixed(2) + ' r';
    $('r-how').textContent = 'tangent, by arc length';
  }
  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub'), def = BASES[S.base];
    vEl.classList.remove('v-closed', 'v-named', 'v-open', 'v-rest');
    vEl.classList.add(S.wind < 2 ? 'v-rest' : 'v-named');
    vt.textContent = S.wind < 2 ? 'The tip rests on the base' : 'The involute of ' + (def.key === 'astroid' ? 'an astroid' : 'a ' + def.key) + ' — ' + def.note;
    vs.textContent = S.sweep ? 'unwinding' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.sweep && !RM.matches) {
      S.wind += 0.6; if (S.wind >= 100) { S.wind = 100; setSweep(false); }
      syncLabels(); updateReading(); draw();
    }
    requestAnimationFrame(tick);
  }
  function setSweep(p) {
    if (p && RM.matches) p = false;
    if (p && S.wind >= 100) S.wind = 0;        // restart from the pin
    S.sweep = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Unwind';
  }

  // ---------- controls ----------
  const baseEl = $('base'), windEl = $('wind'), threadsEl = $('threads');
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    const def = BASES[S.base];
    $('base-v').textContent = def.label;
    $('wind-v').textContent = S.wind + '%';
    $('threads-v').textContent = S.threads;
    baseEl.value = S.base; windEl.value = S.wind; threadsEl.value = S.threads;
    fillSlider(baseEl, S.base, 0, 2); fillSlider(windEl, S.wind, 0, 100); fillSlider(threadsEl, S.threads, 4, 80);
    $('base-btn').textContent = 'Base: ' + def.label;
    $('thread-btn').setAttribute('aria-pressed', S.showThreads ? 'true' : 'false');
  }
  function setBase(i) { S.base = ((i % BASES.length) + BASES.length) % BASES.length; buildSamples(); syncLabels(); updateReading(); save(); draw(); }
  function changed() { syncLabels(); updateReading(); save(); draw(); }

  baseEl.addEventListener('input', () => setBase(+baseEl.value));
  windEl.addEventListener('input', () => { S.wind = +windEl.value; if (S.sweep) setSweep(false); changed(); });
  threadsEl.addEventListener('input', () => { S.threads = +threadsEl.value; syncLabels(); save(); draw(); });
  $('base-btn').addEventListener('click', () => setBase(S.base + 1));
  $('thread-btn').addEventListener('click', () => { S.showThreads = !S.showThreads; save(); syncLabels(); draw(); });
  $('run-btn').addEventListener('click', () => setSweep(!S.sweep));

  // ---------- drag: let the string out by hand ----------
  function windFromEvent(e) {
    const rect = cv.getBoundingClientRect();
    const sx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return Math.max(0, Math.min(100, Math.round(sx / rect.width * 100)));
  }
  function startDrag(e) { S.dragging = true; if (S.sweep) setSweep(false); S.wind = windFromEvent(e); changed(); e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; S.wind = windFromEvent(e); changed(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; draw(); } }
  cv.style.cursor = 'ew-resize';
  cv.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  cv.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setSweep(!S.sweep); }
    else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); setBase(S.base + 1); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); $('thread-btn').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (S.sweep) setSweep(false); S.wind = Math.max(0, S.wind - 2); changed(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (S.sweep) setSweep(false); S.wind = Math.min(100, S.wind + 2); changed(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setSweep(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  buildSamples();
  if (RM.matches && S.wind >= 100) S.wind = 68;
  syncLabels(); updateReading(); draw();
  if (live) {
    const def = BASES[S.base];
    live.textContent = `A taut string unwound from a ${def.label}. The free end traces an involute — here ${def.kind}, ${def.note} — while every taut thread stays tangent to the base, so the base is the evolute of the curve the string draws. Press space to unwind the string, B to change the base curve, T to show or hide the threads, and the arrow keys to let the string out or reel it in by hand.`;
  }
  requestAnimationFrame(tick);
})();
