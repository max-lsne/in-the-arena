/* Peaucellier–Lipkin — the first linkage to draw an exactly straight line (1864).
 *
 * Seven bars, two fixed pins. A fixed pin O is the centre of a geometric inversion. From O two equal
 * long arms of length d reach to the two side corners A, B of a rhombus of four equal bars of side b;
 * the inner diagonal corner P and the outer corner P' (the pen) are therefore collinear with O, and a
 * little Pythagoras on the rhombus gives the invariant
 *       OP · OP' = d^2 - b^2   (constant),
 * so P' is the inverse of P in the circle of radius sqrt(d^2 - b^2) about O. A crank on a second fixed
 * pin O2 drives P around a circle. Inversion's one magic fact — the image of a circle THROUGH the
 * centre O is a straight line — means that when the crank circle passes through O (crank radius rc equal
 * to |O2 - O|), the pen P' is forced onto an exact straight line, perpendicular to O O2. Push the crank
 * radius off that value and P's circle misses O; its image is then another circle, so the pen bows into
 * an arc. Every frame we solve the true closure: P from the crank, P' = inverse(P), and the rhombus
 * corners A, B as the intersection of circle(P, b) and circle(P', b) — nothing faked. World units are
 * O-centred (x right, y up) and mapped to the canvas by project(). */
(() => {
  'use strict';

  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const WORLD = { ox: 182, oy: 185, k: 1.45 };   // O at (ox,oy) on canvas; y flipped (math up)
  const O = { x: 0, y: 0 };                       // inversion centre, math frame
  const E = 46;                                   // |O2 - O| = base crank radius (circle through O)
  const O2 = { x: E, y: 0 };                       // crank fixed pin
  const PHI_MAX = 116 * DEG;                       // crank rocks within +/- this

  const S = {
    d: 104, b: 58, off: 0,
    phi: 0, dir: 1, playing: false, dragging: false,
    trace: [], traced: false,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'linkage-peaucellier';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ d: S.d, b: S.b, off: S.off })); } catch (_) {} };
  const stored = load();
  if (typeof stored.d === 'number') S.d = Math.max(88, Math.min(118, stored.d));
  if (typeof stored.b === 'number') S.b = Math.max(42, Math.min(74, stored.b));
  if (typeof stored.off === 'number') S.off = Math.max(-28, Math.min(28, stored.off));

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      brass: g('--brass'), brass2: g('--brass-2'), brassB: g('--brass-b'),
      steel: g('--steel'), steel2: g('--steel-2'), steelB: g('--steel-b'),
      copper: g('--spring'), copper2: g('--spring-2'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }
  readColors();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', readColors);

  const mech = $('mech'), errc = $('err');

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

  // ---------- geometry ----------
  function circInt(c0, r0, c1, r1) {
    const dx = c1.x - c0.x, dy = c1.y - c0.y, dd = Math.hypot(dx, dy);
    if (dd > r0 + r1 || dd < Math.abs(r0 - r1) || dd === 0) return null;
    const a = (r0 * r0 - r1 * r1 + dd * dd) / (2 * dd), h2 = r0 * r0 - a * a;
    if (h2 < 0) return null;
    const h = Math.sqrt(h2), xm = c0.x + a * dx / dd, ym = c0.y + a * dy / dd;
    return [{ x: xm + h * dy / dd, y: ym - h * dx / dd }, { x: xm - h * dy / dd, y: ym + h * dx / dd }];
  }

  const rho2 = () => S.d * S.d - S.b * S.b;
  const rc = () => E + S.off;                       // crank radius; = E (through O) when off = 0
  const xTrue = () => rho2() / (2 * E);             // exact line x (off = 0 reference)

  // full closure from a crank angle; null if the bars cannot close there
  function solve(phi) {
    const P = { x: O2.x + rc() * Math.cos(phi), y: O2.y + rc() * Math.sin(phi) };
    const r2 = P.x * P.x + P.y * P.y;
    if (r2 < 36) return null;                        // P too near O: inverse runs away
    const Pp = { x: rho2() / r2 * P.x, y: rho2() / r2 * P.y };
    const opp = Math.hypot(P.x - Pp.x, P.y - Pp.y);  // the rhombus long diagonal
    const AB = circInt(P, S.b, Pp, S.b);
    if (!AB || opp < 1) return null;
    return { P, Pp, A: AB[0], B: AB[1], opP: Math.hypot(P.x, P.y), opPp: Math.hypot(Pp.x, Pp.y) };
  }
  const feasible = (phi) => !!solve(phi);

  // ---------- trace: sweep the feasible crank arc, record the pen ----------
  let penPath = [], devMax = 0, kind = 'exact line';
  function rebuild() {
    penPath = []; devMax = 0;
    const N = 240, xt = xTrue();
    for (let i = 0; i <= N; i++) {
      const phi = -PHI_MAX + (2 * PHI_MAX) * i / N;
      const r = solve(phi);
      if (!r) { penPath.push(null); continue; }
      penPath.push({ x: r.Pp.x, y: r.Pp.y });
      const dev = Math.abs(r.Pp.x - xt);
      if (dev > devMax && Math.abs(r.Pp.y) < 150) devMax = dev;
    }
    kind = S.off === 0 ? 'exact line' : (devMax < 0.4 ? 'nearly straight' : 'bowed arc');
    updateReading();
  }

  // ---------- drawing ----------
  const SX = (x) => WORLD.ox + WORLD.k * x;
  const SY = (y) => WORLD.oy - WORLD.k * y;

  function bar(ctx, p, q, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(SX(p.x), SY(p.y)); ctx.lineTo(SX(q.x), SY(q.y)); ctx.stroke();
  }
  function pin(ctx, p, col, r) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), r, 0, TAU); ctx.fill();
  }
  function ground(ctx, p) {
    const x = SX(p.x), y = SY(p.y);
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, y + 6); ctx.lineTo(x + 8, y + 6); ctx.stroke();
    for (let i = -8; i <= 6; i += 4.5) { ctx.beginPath(); ctx.moveTo(x + i, y + 6); ctx.lineTo(x + i - 4, y + 11); ctx.stroke(); }
  }
  function label(ctx, t, x, y, col, align) {
    ctx.fillStyle = col; ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }

  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 360);
    ctx.clearRect(0, 0, w, h);
    const xt = xTrue();

    // the ideal straight line (reference) + crank circle
    ctx.strokeStyle = withA(C.keep, S.off === 0 ? 0.85 : 0.4); ctx.lineWidth = S.off === 0 ? 2 : 1.4;
    ctx.setLineDash(S.off === 0 ? [] : [3, 4]);
    ctx.beginPath(); ctx.moveTo(SX(xt), 10); ctx.lineTo(SX(xt), h - 10); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, S.off === 0 ? 'true line' : 'true line (off)', SX(xt) + 6, 16, S.off === 0 ? C.keep : C.inkFaint, 'left');

    ctx.strokeStyle = withA(C.steel, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(SX(O2.x), SY(O2.y), WORLD.k * rc(), 0, TAU); ctx.stroke(); ctx.setLineDash([]);

    // the circle of inversion, radius sqrt(d^2 - b^2) about O: P and the pen are inverse in it
    const rInv = Math.sqrt(Math.max(0, rho2()));
    ctx.strokeStyle = withA(C.inkFaint, 0.55); ctx.lineWidth = 1; ctx.setLineDash([1, 4]);
    ctx.beginPath(); ctx.arc(SX(O.x), SY(O.y), WORLD.k * rInv, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, '√(d²−b²)', SX(O.x) + WORLD.k * rInv * 0.71 + 2, SY(O.y) - WORLD.k * rInv * 0.71, C.inkFaint, 'left');

    // pen trail
    if (penPath.length) {
      ctx.strokeStyle = withA(C.copper, 0.5); ctx.lineWidth = 1.6; ctx.beginPath();
      let pen = false;
      penPath.forEach((p) => { if (!p) { pen = false; return; } const X = SX(p.x), Y = SY(p.y); if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); pen = true; });
      ctx.stroke();
    }

    const r = solve(S.phi) || solve(nearestFeasible(S.phi));
    if (r) {
      // bars: arms O-A, O-B (brass), rhombus (brass-b), crank O2-P (steel)
      bar(ctx, O2, r.P, C.steel, 3.4);
      bar(ctx, O, r.A, C.brass, 3.2); bar(ctx, O, r.B, C.brass, 3.2);
      bar(ctx, r.A, r.P, C.brassB, 2.6); bar(ctx, r.A, r.Pp, C.brassB, 2.6);
      bar(ctx, r.B, r.P, C.brassB, 2.6); bar(ctx, r.B, r.Pp, C.brassB, 2.6);
      // faint collinear ray O-P-P'
      ctx.strokeStyle = withA(C.inkFaint, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(SX(O.x), SY(O.y)); ctx.lineTo(SX(r.Pp.x), SY(r.Pp.y)); ctx.stroke(); ctx.setLineDash([]);
      // moving pins
      pin(ctx, r.A, C.brass2, 3.6); pin(ctx, r.B, C.brass2, 3.6);
      pin(ctx, r.P, C.steel2, 4); label(ctx, 'P', SX(r.P.x), SY(r.P.y) - 11, C.steel2, 'center');
      // the pen
      pin(ctx, r.Pp, C.copper2, 6);
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(SX(r.Pp.x), SY(r.Pp.y), 6, 0, TAU); ctx.stroke();
      label(ctx, "P'", SX(r.Pp.x) + 13, SY(r.Pp.y), C.copper2, 'center');
    }

    ground(ctx, O); label(ctx, 'O', SX(O.x) - 13, SY(O.y) - 2, C.steel2, 'center');
    ground(ctx, O2); label(ctx, 'crank', SX(O2.x), SY(O2.y) + 20, C.inkFaint, 'center');
  }

  function nearestFeasible(phi) {
    for (let step = 0; step < 60; step++) {
      const a = phi - step * DEG, b = phi + step * DEG;
      if (a > -PHI_MAX && feasible(a)) return a;
      if (b < PHI_MAX && feasible(b)) return b;
    }
    return 0;
  }

  // ---------- straightness strip ----------
  function drawErr() {
    const { ctx, w, h } = fit(errc, 560, 120);
    ctx.clearRect(0, 0, w, h);
    const padX = 40, yc = h / 2;
    const xt = xTrue();
    // vertical extent of the pen (world y) -> horizontal strip axis
    let ymin = 1e9, ymax = -1e9;
    penPath.forEach((p) => { if (p && Math.abs(p.y) < 170) { if (p.y < ymin) ymin = p.y; if (p.y > ymax) ymax = p.y; } });
    if (ymin > ymax) { ymin = -100; ymax = 100; }
    const YX = (y) => padX + (w - 2 * padX) * (y - ymin) / ((ymax - ymin) || 1);
    const mag = Math.max(1, Math.min(600, (h / 2 - 14) / (devMax || 0.0001)));

    // zero line = the true straight line
    ctx.strokeStyle = withA(C.keep, 0.7); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(padX, yc); ctx.lineTo(w - padX, yc); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'true', padX - 4, yc, C.keep, 'right');

    // deviation curve
    ctx.strokeStyle = S.off === 0 ? C.keep : C.dead; ctx.lineWidth = 2.2; ctx.beginPath();
    let pen = false;
    penPath.forEach((p) => {
      if (!p || Math.abs(p.y) > 170) { pen = false; return; }
      const X = YX(p.y), Y = yc - (p.x - xt) * mag;
      if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); pen = true;
    });
    ctx.stroke();

    // current pen marker
    const r = solve(S.phi);
    if (r && Math.abs(r.Pp.y) < 170) {
      const X = YX(r.Pp.y), Y = yc - (r.Pp.x - xt) * mag;
      ctx.fillStyle = C.copper2; ctx.beginPath(); ctx.arc(X, Math.max(6, Math.min(h - 6, Y)), 3.6, 0, TAU); ctx.fill();
    }
    label(ctx, '↑ pen height →', w - padX, h - 8, C.inkFaint, 'right');
    $('mag-label').textContent = Math.round(mag) + '×';
  }

  function draw() { drawMech(); drawErr(); setVerdict(); }

  // ---------- readouts ----------
  function updateReading() {
    $('r-kind').textContent = kind;
    $('r-dev').textContent = devMax < 0.005 ? '0.00 px (exact)' : devMax.toFixed(2) + ' px';
    const r = solve(S.phi) || solve(nearestFeasible(S.phi));
    $('r-prod').textContent = r ? (r.opP * r.opPp).toFixed(0) : '—';
    $('r-const').textContent = rho2().toFixed(0);
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-exact', 'v-near', 'v-bow', 'v-rest');
    if (S.off === 0) { vEl.classList.add('v-exact'); vt.textContent = 'The pen runs exactly straight — deviation zero'; }
    else if (devMax < 0.4) { vEl.classList.add('v-near'); vt.textContent = 'Almost — the crank circle just misses O'; }
    else { vEl.classList.add('v-bow'); vt.textContent = 'Bowed — the circle misses O, so its image is an arc'; }
    vs.textContent = S.playing ? 'turning' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.playing && !RM.matches) {
      let next = S.phi + S.dir * 0.016;
      if (next > PHI_MAX || next < -PHI_MAX || !feasible(next)) { S.dir *= -1; next = S.phi + S.dir * 0.016; }
      S.phi = next;
      recordPen();
      draw();
    }
    requestAnimationFrame(tick);
  }
  function recordPen() {
    const r = solve(S.phi); if (!r) return;
    S.trace.push({ x: r.Pp.x, y: r.Pp.y });
    if (S.trace.length > 2000) S.trace.shift();
  }

  function setPlaying(p) {
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Turn the crank';
    if (p && RM.matches) { S.playing = false; $('run-btn').setAttribute('aria-pressed', 'false'); $('run-btn').textContent = 'Turn the crank'; }
  }

  // ---------- controls ----------
  const offEl = $('offset'), armEl = $('arm'), rhoEl = $('rho');
  offEl.value = S.off; armEl.value = S.d; rhoEl.value = S.b;
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('offset-v').textContent = S.off; $('arm-v').textContent = S.d; $('rho-v').textContent = S.b;
    fillSlider(offEl, S.off, -28, 28); fillSlider(armEl, S.d, 88, 118); fillSlider(rhoEl, S.b, 42, 74);
  }
  function clampB() { if (S.b > S.d - 18) { S.b = S.d - 18; rhoEl.value = S.b; } }
  offEl.addEventListener('input', () => { S.off = +offEl.value; syncLabels(); save(); rebuild(); draw(); });
  armEl.addEventListener('input', () => { S.d = +armEl.value; clampB(); syncLabels(); save(); rebuild(); draw(); });
  rhoEl.addEventListener('input', () => { S.b = +rhoEl.value; clampB(); syncLabels(); save(); rebuild(); draw(); });

  $('run-btn').addEventListener('click', () => { setPlaying(!S.playing); });
  $('clear').addEventListener('click', () => { S.trace = []; draw(); });

  // ---------- drag the pen: scrub the crank to the nearest reachable pen position ----------
  function ptFromEvent(e) {
    const rect = mech.getBoundingClientRect(); const sc = rect.width / 560;
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: (px / sc - WORLD.ox) / WORLD.k, y: -(py / sc - WORLD.oy) / WORLD.k };
  }
  function scrubTo(pt) {
    let best = S.phi, bd = 1e9;
    for (let i = 0; i <= 240; i++) {
      const phi = -PHI_MAX + (2 * PHI_MAX) * i / 240;
      const r = solve(phi); if (!r) continue;
      const dd = Math.hypot(r.Pp.x - pt.x, r.Pp.y - pt.y);
      if (dd < bd) { bd = dd; best = phi; }
    }
    S.phi = best;
  }
  function nearPen(e) {
    const pt = ptFromEvent(e); const r = solve(S.phi) || solve(nearestFeasible(S.phi));
    return r && Math.hypot(r.Pp.x - pt.x, r.Pp.y - pt.y) < 24;
  }
  function startDrag(e) { if (!nearPen(e)) return; S.dragging = true; setPlaying(false); mech.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; scrubTo(ptFromEvent(e)); recordPen(); draw(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; mech.style.cursor = 'grab'; } }
  mech.style.cursor = 'grab';
  mech.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  mech.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  // ---------- keyboard ----------
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!S.playing); }
    else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); S.trace = []; draw(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setPlaying(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  if (RM.matches) S.phi = -PHI_MAX * 0.5;           // a settled mid-stroke still
  syncLabels(); rebuild(); draw();
  if (live) {
    live.textContent = `A Peaucellier linkage of seven bars. The crank on the right pin swings an inner point P around a circle through the fixed pin O; two long arms and a four-bar rhombus place the pen P-prime on the line through O and P, keeping the product O-P times O-P-prime equal to ${rho2().toFixed(0)}. Because that circle passes through O, the pen traces an exactly straight line — deviation zero. Press space to turn the crank, or move the crank off true to watch the line bow.`;
  }
  requestAnimationFrame(tick);
})();
