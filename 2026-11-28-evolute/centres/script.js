/* Centres — the evolute of an ellipse, drawn two honest ways at once.
 *
 * The ellipse is P(t) = (a cos t, b sin t), with a = 1 fixed and b the shape control. At each t the curve
 * has a CENTRE OF CURVATURE — the centre of the osculating circle, the one that hugs the ellipse best there.
 * It is read straight off the derivatives, with no evolute equation assumed:
 *     P'  = (-a sin t,  b cos t)
 *     P'' = (-a cos t, -b sin t)
 *     D   = x'y'' - y'x''              (twice the signed area; = ab for the ellipse)
 *     s2  = x'^2 + y'^2
 *     C   = ( x - y'·s2/D ,  y + x'·s2/D )      ← the centre of curvature
 * Walk t round and C traces the EVOLUTE: a four-cusped stretched astroid. The SAME curve is the ENVELOPE of
 * the ellipse's NORMALS — the line dropped square to the curve at each point. A normal is {P, n} with n the
 * unit normal; the envelope is found with no closed form, as the meeting of each normal with its neighbour:
 *     envelope(t) = limit of  normal(t) ∩ normal(t+dt)  = C(t).
 * Both constructions are computed every frame from the ellipse alone and land on one copper curve. Flatten
 * toward a circle (b → a) and every normal passes through the centre: the evolute collapses to a point. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const A = 1;                            // long semi-axis, fixed

  const S = {
    b: 62,                               // hundredths: short semi-axis (0.20 .. 1.00)
    pt: 0,                               // degrees — the running point's angle parameter
    normals: 90,                         // normals drawn
    showNormals: true,
    showOsc: true,
    sweep: false, active: 0,
    dragging: false,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'evolute-centres';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ b: S.b, pt: S.pt, normals: S.normals, showNormals: S.showNormals, showOsc: S.showOsc })); } catch (_) {} };
  const stored = load();
  if (typeof stored.b === 'number') S.b = Math.max(20, Math.min(100, Math.round(stored.b)));
  if (typeof stored.pt === 'number') S.pt = ((Math.round(stored.pt) % 360) + 360) % 360;
  if (typeof stored.normals === 'number') S.normals = Math.max(12, Math.min(200, Math.round(stored.normals)));
  if (typeof stored.showNormals === 'boolean') S.showNormals = stored.showNormals;
  if (typeof stored.showOsc === 'boolean') S.showOsc = stored.showOsc;

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      base: g('--brass'), base2: g('--brass-2'),
      norm: g('--steel'), norm2: g('--steel-2'),
      evo: g('--spring'), evo2: g('--spring-2'),
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
  const bVal = () => S.b / 100;
  function meet(Pa, u, Pb, v) {                // intersection of line (Pa,u) with line (Pb,v)
    const den = u.x * v.y - u.y * v.x;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((Pb.x - Pa.x) * v.y - (Pb.y - Pa.y) * v.x) / den;
    return { x: Pa.x + t * u.x, y: Pa.y + t * u.y };
  }

  // ---------- the ellipse and its curvature ----------
  function pt(t) { return { x: A * Math.cos(t), y: bVal() * Math.sin(t) }; }
  function d1(t) { return { x: -A * Math.sin(t), y: bVal() * Math.cos(t) }; }
  function d2(t) { return { x: -A * Math.cos(t), y: -bVal() * Math.sin(t) }; }
  function tangentDir(t) { const v = d1(t), m = Math.hypot(v.x, v.y) || 1; return { x: v.x / m, y: v.y / m }; }
  function normalDir(t) { const T = tangentDir(t); return { x: -T.y, y: T.x }; }   // unit normal
  function centre(t) {                        // centre of curvature — read off the derivatives
    const P = pt(t), p = d1(t), q = d2(t);
    const D = p.x * q.y - p.y * q.x, s2 = p.x * p.x + p.y * p.y;
    if (Math.abs(D) < 1e-9) return null;
    return { x: P.x - p.y * s2 / D, y: P.y + p.x * s2 / D };
  }
  function rho(t) { const P = pt(t), c = centre(t); return c ? Math.hypot(c.x - P.x, c.y - P.y) : 0; }

  // the evolute, as the track of the centres of curvature (numeric, fine sampling)
  function evolute() {
    const N = 900, out = [];
    for (let i = 0; i <= N; i++) { const c = centre(TAU * i / N); out.push(c && Math.hypot(c.x, c.y) < 6 ? c : null); }
    return out;
  }
  // the same point, found instead as where a normal meets its neighbour (envelope of the normals)
  function envelopeAt(t) {
    const dt = 1e-3, Pa = pt(t), Pb = pt(t + dt);
    return meet(Pa, normalDir(t), Pb, normalDir(t + dt));
  }

  // ---------- fit ----------
  const WORLD = 1.5;
  function frame(w, h) {
    const cx = w / 2, cy = h / 2;
    const scale = (Math.min(w, h) / 2 - 18) / WORLD;
    return { cx, cy, scale, X: (x) => cx + x * scale, Y: (y) => cy - y * scale };
  }

  // ---------- naming ----------
  function kind() {
    const b = bVal();
    if (Math.abs(b - A) < 0.025) return { name: 'a point', note: 'a circle — every normal through one centre', cusps: 0, cls: 'rest' };
    if (b > 0.9) return { name: 'a small evolute', note: 'nearly round — the cusps still gathered', cusps: 4, cls: 'closed' };
    return { name: 'a four-cusped evolute', note: 'a stretched astroid, cusps on the axes', cusps: 4, cls: 'named' };
  }

  // ---------- drawing ----------
  function drawEllipse(ctx, F) {
    ctx.strokeStyle = withA(C.base, 0.92); ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) { const P = pt(TAU * i / 240); const x = F.X(P.x), y = F.Y(P.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = withA(C.ink, 0.4); ctx.beginPath(); ctx.arc(F.cx, F.cy, 2, 0, TAU); ctx.fill();
  }

  function drawNormals(ctx, F) {
    if (!S.showNormals) return;
    ctx.strokeStyle = withA(C.norm, 0.24); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < S.normals; i++) {
      const t = TAU * i / S.normals, P = pt(t), n = normalDir(t);
      // draw the normal as a chord across the working box, both ways from P
      const L = 2.4;
      ctx.moveTo(F.X(P.x - n.x * L * 0.15), F.Y(P.y - n.y * L * 0.15));
      ctx.lineTo(F.X(P.x + n.x * L), F.Y(P.y + n.y * L));
    }
    ctx.stroke();
  }

  function drawEvolute(ctx, F) {
    const pts = evolute();
    ctx.strokeStyle = C.evo; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); let pen = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p) { pen = false; continue; }
      const x = F.X(p.x), y = F.Y(p.y);
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
  }

  function drawKiss(ctx, F) {
    // a coarse sample of normals, each dotted where it touches the evolute: every normal is tangent to it,
    // and the point it touches is that point's centre of curvature — the envelope read off the family
    if (!S.showNormals) return;
    const M = 48;
    ctx.fillStyle = withA(C.evo2, 0.5);
    for (let i = 0; i < M; i++) {
      const c = centre(TAU * i / M);
      if (c && Math.hypot(c.x, c.y) < 6) { ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), 1.6, 0, TAU); ctx.fill(); }
    }
  }

  function drawCusps(ctx, F) {
    // the four cusps sit at the ends of the two axes (t = 0, π/2, π, 3π/2), where the curvature is
    // extremal and the centre pauses and reverses — placed analytically, not hunted on the drawn curve
    if (Math.abs(bVal() - A) < 0.025) return;        // a circle: the evolute is a point, no cusps to mark
    for (let k = 0; k < 4; k++) {
      const c = centre(k * Math.PI / 2);
      if (!c) continue;
      ctx.fillStyle = C.base; ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), 3.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), 3.2, 0, TAU); ctx.stroke();
    }
  }

  function drawActive(ctx, F) {
    const t = TAU * S.active, P = pt(t), c = centre(t);
    if (!c) return;
    const r = Math.hypot(c.x - P.x, c.y - P.y);
    // osculating circle
    if (S.showOsc && r < 6) {
      ctx.strokeStyle = withA(C.evo2, 0.5); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), r * F.scale, 0, TAU); ctx.stroke();
    }
    // the radius of curvature: the live normal segment from P to the centre
    ctx.strokeStyle = withA(C.norm2, 0.9); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(F.X(P.x), F.Y(P.y)); ctx.lineTo(F.X(c.x), F.Y(c.y)); ctx.stroke();
    // the running point on the ellipse
    ctx.fillStyle = C.base2; ctx.beginPath(); ctx.arc(F.X(P.x), F.Y(P.y), 3, 0, TAU); ctx.fill();
    // the centre of curvature — the point now being added to the evolute
    ctx.fillStyle = C.evo; ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), 4, 0, TAU); ctx.stroke();
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    const F = frame(w, h);
    drawNormals(ctx, F);
    drawEllipse(ctx, F);
    drawEvolute(ctx, F);
    drawKiss(ctx, F);
    drawCusps(ctx, F);
    drawActive(ctx, F);
    setVerdict();
  }

  // ---------- readings / verdict ----------
  function updateReading() {
    const k = kind();
    $('r-shape').textContent = 'b / a = ' + bVal().toFixed(2);
    $('r-kind').textContent = k.cusps === 0 ? 'a single point' : (bVal() > 0.9 ? 'a small astroid' : 'stretched astroid');
    $('r-cusps').textContent = k.cusps === 0 ? '—' : String(k.cusps);
    $('r-how').textContent = 'centres · envelope of normals';
  }
  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub'), k = kind();
    vEl.classList.remove('v-closed', 'v-named', 'v-open', 'v-rest');
    vEl.classList.add('v-' + k.cls);
    const lead = k.name[0] === 'a' && k.name[1] === ' ' ? '' : (/^[aeiou]/i.test(k.name) ? 'An ' : 'A ');
    vt.textContent = lead + k.name + ' — ' + k.note;
    vs.textContent = S.sweep ? 'rolling' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.sweep && !RM.matches) { S.active = (S.active + 1 / 520) % 1; S.pt = Math.round(S.active * 360) % 360; draw(); }
    requestAnimationFrame(tick);
  }
  function setSweep(p) {
    if (p && RM.matches) p = false;
    S.sweep = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Roll';
  }

  // ---------- controls ----------
  const shapeEl = $('shape'), ptEl = $('pt'), normEl = $('normals');
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('shape-v').textContent = bVal().toFixed(2);
    $('pt-v').textContent = S.pt + '°';
    $('normals-v').textContent = S.normals;
    shapeEl.value = S.b; ptEl.value = S.pt; normEl.value = S.normals;
    fillSlider(shapeEl, S.b, 20, 100); fillSlider(ptEl, S.pt, 0, 359); fillSlider(normEl, S.normals, 12, 200);
    $('norm-btn').setAttribute('aria-pressed', S.showNormals ? 'true' : 'false');
    $('osc-btn').setAttribute('aria-pressed', S.showOsc ? 'true' : 'false');
  }
  function changed() { syncLabels(); updateReading(); save(); draw(); }

  shapeEl.addEventListener('input', () => { S.b = +shapeEl.value; syncLabels(); updateReading(); save(); draw(); });
  ptEl.addEventListener('input', () => { S.pt = +ptEl.value; S.active = S.pt / 360; changed(); });
  normEl.addEventListener('input', () => { S.normals = +normEl.value; syncLabels(); save(); draw(); });
  $('norm-btn').addEventListener('click', () => { S.showNormals = !S.showNormals; save(); syncLabels(); draw(); });
  $('osc-btn').addEventListener('click', () => { S.showOsc = !S.showOsc; save(); syncLabels(); draw(); });
  $('run-btn').addEventListener('click', () => setSweep(!S.sweep));

  // ---------- drag: walk the point round ----------
  function worldFromEvent(e) {
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const F = frame(BASE_W, BASE_H);
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    const sy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / sc;
    return { x: (sx - F.cx) / F.scale, y: -(sy - F.cy) / F.scale };
  }
  function placeFrom(q) {
    // the ellipse parameter whose point lies along this direction (angle in the stretched frame)
    const a = Math.atan2(q.y / Math.max(bVal(), 1e-3), q.x / A);
    S.active = ((a / TAU) % 1 + 1) % 1; S.pt = Math.round(S.active * 360) % 360;
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
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); $('norm-btn').click(); }
    else if (e.key === 'o' || e.key === 'O') { e.preventDefault(); $('osc-btn').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); S.pt = (S.pt + 356) % 360; S.active = S.pt / 360; changed(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); S.pt = (S.pt + 4) % 360; S.active = S.pt / 360; changed(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); S.b = Math.min(100, S.b + 2); changed(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); S.b = Math.max(20, S.b - 2); changed(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setSweep(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  S.active = RM.matches ? 0.12 : S.pt / 360;
  syncLabels(); updateReading(); draw();
  if (live) {
    const k = kind();
    live.textContent = `An ellipse with short-to-long axis ${bVal().toFixed(2)}. A point runs round it, and at each point the best-fitting circle of curvature has its centre a little way in along the normal. The track of those centres is the evolute — here ${k.name}, ${k.note}${k.cusps ? ', its four cusps marked where the axes meet it' : ''} — and it is the same curve as the envelope of the ellipse's normals, drawn as the meeting of each normal with its neighbour. Press space to roll the point round, N to show or hide the normals, O the osculating circle, and the arrow keys to step the point or round and stretch the ellipse.`;
  }
  requestAnimationFrame(tick);
})();
