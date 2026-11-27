/* Cup — the caustic a circular mirror folds its reflected light onto.
 *
 * A circle of radius 1 is a mirror. Light arrives either as a sheet of parallel rays (a source at
 * infinity, in direction A) or from a point source at distance d in direction A. At every point
 * P = (cosφ, sinφ) of the mirror the incident ray reflects about the outward normal n = P:
 *     u = incident unit direction   (parallel: u = −(cosA, sinA);  point: u = unit(P − S))
 *     r = u − 2(u·n) n              (reflected direction, "angle in = angle out")
 * Each reflected ray is a CHORD of the circle: from P it runs to the far wall at Q = P − 2(P·r)·r.
 * The CAUSTIC is the envelope of this family of reflected rays — the curve every ray touches and none
 * crosses, where neighbouring rays meet and the light bunches bright. It is computed here with no closed
 * form: sample φ finely, and for each adjacent pair of reflected rays mark where the two lines cross;
 * those crossing points ARE the caustic. For a circle it is named — parallel light gives a NEPHROID
 * (two cusps, the coffee-cup caustic), a source on the rim a CARDIOID (one cusp); both are epicycloids,
 * the curves a wheel on a wheel draws. Slide the source from the rim outward and the cardioid opens
 * through the Cayley family toward the nephroid the parallel limit draws. Everything is recomputed each
 * frame from the source and the mirror; nothing is canned. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  const S = {
    mode: 'point',          // 'point' | 'parallel'
    aim: 210,               // degrees — direction the light comes from
    dist: 100,              // hundredths of a radius: source distance (point mode)
    rays: 120,              // reflected chords drawn
    showRays: true,
    sweep: false, active: 0,
    dragging: false,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'caustic-cup';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ mode: S.mode, aim: S.aim, dist: S.dist, rays: S.rays, showRays: S.showRays })); } catch (_) {} };
  const stored = load();
  if (stored.mode === 'parallel' || stored.mode === 'point') S.mode = stored.mode;
  if (typeof stored.aim === 'number') S.aim = ((Math.round(stored.aim) % 360) + 360) % 360;
  if (typeof stored.dist === 'number') S.dist = Math.max(0, Math.min(600, Math.round(stored.dist)));
  if (typeof stored.rays === 'number') S.rays = Math.max(16, Math.min(220, Math.round(stored.rays)));
  if (typeof stored.showRays === 'boolean') S.showRays = stored.showRays;

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      mirror: g('--brass'), mirror2: g('--brass-2'),
      ray: g('--steel'), ray2: g('--steel-2'),
      caustic: g('--spring'), caustic2: g('--spring-2'),
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

  // ---------- vector helpers ----------
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  function reflect(u, n) { const d = 2 * dot(u, n); return { x: u.x - d * n.x, y: u.y - d * n.y }; }
  function norm(v) { const m = Math.hypot(v.x, v.y) || 1; return { x: v.x / m, y: v.y / m }; }
  function meet(A, u, B, v) {
    const den = u.x * v.y - u.y * v.x;
    if (Math.abs(den) < 1e-7) return null;
    const t = ((B.x - A.x) * v.y - (B.y - A.y) * v.x) / den;
    return { x: A.x + t * u.x, y: A.y + t * u.y };
  }

  // ---------- optics ----------
  const aimRad = () => S.aim * Math.PI / 180;
  const sourcePt = () => { const a = aimRad(), d = S.dist / 100; return { x: d * Math.cos(a), y: d * Math.sin(a) }; };
  function incident(P) {                          // unit direction of the incoming ray at mirror point P
    if (S.mode === 'parallel') { const a = aimRad(); return { x: -Math.cos(a), y: -Math.sin(a) }; }
    return norm({ x: P.x - sourcePt().x, y: P.y - sourcePt().y });
  }
  function reflectedRay(phi) {                     // {P, r} — point on mirror and reflected unit direction
    const P = { x: Math.cos(phi), y: Math.sin(phi) };
    const r = reflect(incident(P), P);            // outward normal n = P (unit circle)
    return { P, r };
  }
  function farHit(P, r) {                          // second intersection of the reflected ray with the circle
    const t = -2 * dot(P, r);
    return { x: P.x + t * r.x, y: P.y + t * r.y };
  }

  // ---------- caustic (envelope of the reflected rays) ----------
  function caustic() {
    const N = 1200, pts = [];
    let prev = reflectedRay(0);
    for (let i = 1; i <= N; i++) {
      const phi = TAU * i / N, cur = reflectedRay(phi);
      const m = meet(prev.P, prev.r, cur.P, cur.r);
      pts.push(m && Math.hypot(m.x, m.y) < 4 ? m : null);
      prev = cur;
    }
    return pts;
  }
  function causticAt(phi) {                         // the envelope point the ray at phi touches
    const d = 1e-3, a = reflectedRay(phi), b = reflectedRay(phi + d);
    return meet(a.P, a.r, b.P, b.r);
  }

  // ---------- geometry / fit ----------
  const WORLD = 1.32;
  function frame(w, h) {
    const cx = w / 2, cy = h / 2;
    const scale = (Math.min(w, h) / 2 - 20) / WORLD;
    return { cx, cy, scale, X: (x) => cx + x * scale, Y: (y) => cy - y * scale };
  }

  // ---------- naming ----------
  function kind() {
    if (S.mode === 'parallel') return { name: 'nephroid', note: 'parallel light — the coffee-cup caustic', cusps: 2, cls: 'named' };
    const d = S.dist / 100;
    if (d < 0.05) return { name: 'a point at the centre', note: 'the light returns on itself', cusps: 0, cls: 'rest' };
    if (Math.abs(d - 1) < 0.04) return { name: 'cardioid', note: 'the source on the rim', cusps: 1, cls: 'named' };
    if (d >= 5.4) return { name: 'a caustic, nearly a nephroid', note: 'the source far off, almost parallel', cusps: 2, cls: 'closed' };
    return { name: 'a caustic', note: 'source at ' + d.toFixed(2) + ' R', cusps: 2, cls: 'closed' };
  }

  // ---------- drawing ----------
  function drawMirror(ctx, F) {
    ctx.strokeStyle = withA(C.mirror, 0.9); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(F.cx, F.cy, F.scale, 0, TAU); ctx.stroke();
    ctx.fillStyle = withA(C.ink, 0.42); ctx.beginPath(); ctx.arc(F.cx, F.cy, 2, 0, TAU); ctx.fill();
  }

  function drawRays(ctx, F) {
    if (!S.showRays) return;
    ctx.strokeStyle = withA(C.ray, 0.26); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < S.rays; i++) {
      const phi = TAU * i / S.rays, { P, r } = reflectedRay(phi), Q = farHit(P, r);
      ctx.moveTo(F.X(P.x), F.Y(P.y)); ctx.lineTo(F.X(Q.x), F.Y(Q.y));
    }
    ctx.stroke();
  }

  function drawCaustic(ctx, F) {
    const pts = caustic();
    ctx.strokeStyle = C.caustic; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); let pen = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p) { pen = false; continue; }
      const x = F.X(p.x), y = F.Y(p.y);
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
  }

  function drawSource(ctx, F) {
    if (S.mode === 'parallel') {
      // incoming arrows on the lit side
      const a = aimRad(), d = { x: -Math.cos(a), y: -Math.sin(a) };
      ctx.strokeStyle = withA(C.mirror2, 0.8); ctx.lineWidth = 1.6;
      for (let k = -2; k <= 2; k++) {
        const off = k * 0.34, b = { x: -d.y, y: d.x };
        const s = { x: Math.cos(a) * WORLD + b.x * off, y: Math.sin(a) * WORLD + b.y * off };
        const e = { x: s.x + d.x * 0.3, y: s.y + d.y * 0.3 };
        ctx.beginPath(); ctx.moveTo(F.X(s.x), F.Y(s.y)); ctx.lineTo(F.X(e.x), F.Y(e.y)); ctx.stroke();
      }
      return;
    }
    const Sp = sourcePt();
    if (Math.hypot(Sp.x, Sp.y) <= WORLD) {
      ctx.fillStyle = C.mirror; ctx.beginPath(); ctx.arc(F.X(Sp.x), F.Y(Sp.y), 4.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(F.X(Sp.x), F.Y(Sp.y), 4.5, 0, TAU); ctx.stroke();
    } else {
      const a = aimRad();
      const s = { x: Math.cos(a) * WORLD, y: Math.sin(a) * WORLD };
      const e = { x: s.x - Math.cos(a) * 0.26, y: s.y - Math.sin(a) * 0.26 };
      ctx.strokeStyle = withA(C.mirror2, 0.85); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(F.X(s.x), F.Y(s.y)); ctx.lineTo(F.X(e.x), F.Y(e.y)); ctx.stroke();
    }
  }

  function drawActive(ctx, F) {
    const phi = TAU * S.active, { P, r } = reflectedRay(phi), Q = farHit(P, r);
    // incident leg
    let A0;
    if (S.mode === 'parallel') { const u = incident(P); A0 = { x: P.x - u.x * 0.42, y: P.y - u.y * 0.42 }; }
    else { const Sp = sourcePt(); A0 = Math.hypot(Sp.x, Sp.y) <= WORLD + 0.5 ? Sp : { x: P.x - incident(P).x * 0.42, y: P.y - incident(P).y * 0.42 }; }
    ctx.strokeStyle = withA(C.ray2, 0.9); ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(F.X(A0.x), F.Y(A0.y)); ctx.lineTo(F.X(P.x), F.Y(P.y)); ctx.stroke();
    // reflected chord, bright
    ctx.strokeStyle = C.caustic2; ctx.lineWidth = 2.3;
    ctx.beginPath(); ctx.moveTo(F.X(P.x), F.Y(P.y)); ctx.lineTo(F.X(Q.x), F.Y(Q.y)); ctx.stroke();
    // landing point
    ctx.fillStyle = C.mirror2; ctx.beginPath(); ctx.arc(F.X(P.x), F.Y(P.y), 2.8, 0, TAU); ctx.fill();
    // the point it kisses the caustic
    const t = causticAt(phi);
    if (t && Math.hypot(t.x, t.y) < 4) {
      ctx.fillStyle = C.caustic; ctx.beginPath(); ctx.arc(F.X(t.x), F.Y(t.y), 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(F.X(t.x), F.Y(t.y), 4, 0, TAU); ctx.stroke();
    }
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    const F = frame(w, h);
    drawRays(ctx, F);
    drawMirror(ctx, F);
    drawCaustic(ctx, F);
    drawSource(ctx, F);
    drawActive(ctx, F);
    setVerdict();
  }

  // ---------- readings / verdict ----------
  function updateReading() {
    const k = kind();
    $('r-source').textContent = S.mode === 'parallel' ? 'parallel · ∞' : 'point · ' + (S.dist / 100).toFixed(2) + ' R';
    $('r-kind').textContent = k.name;
    $('r-cusps').textContent = k.cusps === 0 ? '—' : String(k.cusps);
    $('r-how').textContent = 'envelope of chords';
  }
  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub'), k = kind();
    vEl.classList.remove('v-closed', 'v-named', 'v-open', 'v-rest');
    vEl.classList.add('v-' + k.cls);
    const lead = k.name[0] === 'a' && k.name[1] === ' ' ? '' : (/^[aeiou]/i.test(k.name) ? 'An ' : 'A ');
    vt.textContent = (lead + (lead ? k.name : k.name)) + ' — ' + k.note;
    vs.textContent = S.sweep ? 'sweeping' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.sweep && !RM.matches) { S.active = (S.active + 1 / 420) % 1; draw(); }
    requestAnimationFrame(tick);
  }
  function setSweep(p) {
    if (p && RM.matches) p = false;
    S.sweep = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Sweep';
  }

  // ---------- controls ----------
  const aimEl = $('aim'), distEl = $('dist'), raysEl = $('rays');
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('aim-v').textContent = S.aim + '°';
    $('dist-v').textContent = (S.dist / 100).toFixed(2) + ' R';
    $('rays-v').textContent = S.rays;
    aimEl.value = S.aim; distEl.value = S.dist; raysEl.value = S.rays;
    fillSlider(aimEl, S.aim, 0, 359); fillSlider(distEl, S.dist, 0, 600); fillSlider(raysEl, S.rays, 16, 220);
    $('dist-ctl').hidden = S.mode === 'parallel';
    $('mode-btn').textContent = S.mode === 'parallel' ? 'Parallel light' : 'Point source';
    $('mode-btn').setAttribute('aria-pressed', S.mode === 'parallel' ? 'true' : 'false');
    $('rays-btn').setAttribute('aria-pressed', S.showRays ? 'true' : 'false');
  }
  function changed() { syncLabels(); updateReading(); save(); draw(); }

  aimEl.addEventListener('input', () => { S.aim = +aimEl.value; changed(); });
  distEl.addEventListener('input', () => { S.dist = +distEl.value; changed(); });
  raysEl.addEventListener('input', () => { S.rays = +raysEl.value; syncLabels(); save(); draw(); });
  $('mode-btn').addEventListener('click', () => { S.mode = S.mode === 'parallel' ? 'point' : 'parallel'; changed(); });
  $('rays-btn').addEventListener('click', () => { S.showRays = !S.showRays; save(); syncLabels(); draw(); });
  $('run-btn').addEventListener('click', () => setSweep(!S.sweep));

  // ---------- drag: move the source / aim the sheet ----------
  function worldFromEvent(e) {
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const F = frame(BASE_W, BASE_H);
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    const sy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / sc;
    return { x: (sx - F.cx) / F.scale, y: -(sy - F.cy) / F.scale };
  }
  function placeFrom(q) {
    const a = Math.atan2(q.y, q.x);
    S.aim = ((Math.round(a * 180 / Math.PI) % 360) + 360) % 360;
    if (S.mode === 'point') S.dist = Math.max(0, Math.min(600, Math.round(Math.hypot(q.x, q.y) * 100)));
  }
  function startDrag(e) { S.dragging = true; placeFrom(worldFromEvent(e)); changed(); cv.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; placeFrom(worldFromEvent(e)); changed(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; cv.style.cursor = 'crosshair'; draw(); } }
  cv.style.cursor = 'crosshair';
  cv.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  cv.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setSweep(!S.sweep); }
    else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); $('mode-btn').click(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); $('rays-btn').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); S.aim = (S.aim + 354) % 360; changed(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); S.aim = (S.aim + 6) % 360; changed(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (S.mode === 'point') { S.dist = Math.min(600, S.dist + 10); changed(); } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (S.mode === 'point') { S.dist = Math.max(0, S.dist - 10); changed(); } }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setSweep(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  S.active = RM.matches ? 0.14 : 0;
  syncLabels(); updateReading(); draw();
  if (live) {
    const k = kind();
    const src = S.mode === 'parallel' ? 'A sheet of parallel light' : `A point source ${(S.dist / 100).toFixed(2)} radii from the centre`;
    live.textContent = `${src} thrown into a circular mirror. Each reflected ray is a chord, and the chords crowd onto a bright caustic — here ${k.name}, ${k.note}, with ${k.cusps === 0 ? 'no cusp' : k.cusps + (k.cusps === 1 ? ' cusp' : ' cusps')}. The curve is found as the envelope of the rays, where each chord meets its neighbour. Press space to sweep a single ray round and watch it kiss the caustic, P to switch between parallel light and a point source, R to show or hide the rays, and the arrow keys to aim the light and move the source in and out.`;
  }
  requestAnimationFrame(tick);
})();
