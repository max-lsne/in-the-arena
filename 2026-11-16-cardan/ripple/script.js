/* Ripple — the velocity flutter of a universal (Cardan) joint.
 *
 * Differentiate the angle law tan(phi) = tan(theta)/cos(beta) and the output rate is
 *     omega2/omega1 = cos(beta) / (1 - sin^2(beta) * cos^2(theta))
 * — fastest 1/cos(beta) at theta = 0, 180 (driving yoke in the plane of the bend),
 * slowest cos(beta) at theta = 90, 270. Because cos^2(theta) repeats every half turn,
 * the ratio swings TWICE per revolution: a second harmonic. The joint is drawn on the
 * left (its arms taken straight from the geometry, as in ../angle/); a needle gauge on
 * the right reports the instantaneous output speed; the lower plot is the whole cycle.
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;

  const S = {
    beta: 30 * Math.PI / 180,
    rpm: 26,
    theta: 0,                       // open at the fast extreme
    running: true,
    dragging: false, dragA0: 0, lastT: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'cardan-ripple';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ beta: S.beta, rpm: S.rpm })); } catch (_) {} };
  const stored = load();

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      brass: g('--brass'), brass2: g('--brass-2'), brassB: g('--brass-b'),
      steel: g('--steel'), steel2: g('--steel-2'), steelB: g('--steel-b'),
      cross: g('--spring'), cross2: g('--spring-2'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }
  readColors();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', readColors);

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
  const mech = $('mech'), trace = $('trace');

  const omega = () => S.rpm * 2 * Math.PI / 60;
  const norm = (t) => { let a = t % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a; };
  const ratioOf = (t) => Math.cos(S.beta) / (1 - Math.sin(S.beta) ** 2 * Math.cos(t) ** 2);
  const rMax = () => 1 / Math.cos(S.beta);     // at theta 0,180
  const rMin = () => Math.cos(S.beta);         // at theta 90,270

  // ---------- joint drawing (left region), faithful to the geometry ----------
  function project(p, O, sc) {
    return [O[0] + (p[0] - p[2] * 0.42) * sc, O[1] + (-p[1] - p[2] * 0.16) * sc];
  }
  function drawArm(ctx, O, sc, base, axis, len, col, lw) {
    const a = project([base[0] + axis[0] * len, base[1] + axis[1] * len, base[2] + axis[2] * len], O, sc);
    const b = project([base[0] - axis[0] * len, base[1] - axis[1] * len, base[2] - axis[2] * len], O, sc);
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function drawYoke(ctx, O, sc, collar, armAxis, ra, col) {
    const Pc = project(collar, O, sc);
    const Pt1 = project([armAxis[0] * ra, armAxis[1] * ra, armAxis[2] * ra], O, sc);
    const Pt2 = project([-armAxis[0] * ra, -armAxis[1] * ra, -armAxis[2] * ra], O, sc);
    ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(Pt1[0], Pt1[1]); ctx.lineTo(Pc[0], Pc[1]); ctx.lineTo(Pt2[0], Pt2[1]); ctx.stroke();
    for (const T of [Pt1, Pt2]) {
      ctx.beginPath(); ctx.arc(T[0], T[1], 4.2, 0, 2 * Math.PI);
      ctx.fillStyle = C.brassB; ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = col; ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  function drawJoint(ctx, O, sc, t) {
    const b = S.beta;
    const d = [Math.cos(b), -Math.sin(b), 0];
    const drive = [-1, 0, 0];
    const p1 = [0, Math.cos(t), Math.sin(t)];
    let p2 = [d[1] * p1[2] - d[2] * p1[1], d[2] * p1[0] - d[0] * p1[2], d[0] * p1[1] - d[1] * p1[0]];
    const n2 = Math.hypot(p2[0], p2[1], p2[2]) || 1; p2 = p2.map((x) => x / n2);
    const ra = 0.5;
    const PO = project([0, 0, 0], O, sc);
    const end = (ax, s) => [ax[0] * s, ax[1] * s, ax[2] * s];

    for (const [ax, col] of [[drive, C.steel2], [d, C.steel]]) {
      const P = project(end(ax, 1.5), O, sc);
      ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(PO[0], PO[1]); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    drawArm(ctx, O, sc, [0, 0, 0], p1, ra, C.cross, 5.5);
    drawArm(ctx, O, sc, [0, 0, 0], p2, ra, C.cross2, 5.5);
    drawYoke(ctx, O, sc, end(drive, 0.32), p1, ra, C.brass2);
    drawYoke(ctx, O, sc, end(d, 0.32), p2, ra, C.brass);
    ctx.beginPath(); ctx.arc(PO[0], PO[1], 5.5, 0, 2 * Math.PI); ctx.fillStyle = C.cross2; ctx.fill();
    ctx.beginPath(); ctx.arc(PO[0], PO[1], 2.2, 0, 2 * Math.PI); ctx.fillStyle = C.field; ctx.fill();
  }

  // ---------- the needle gauge (right region) ----------
  function drawGauge(ctx, cx, cy, R, t) {
    const r = ratioOf(t), lo = rMin(), hi = rMax();
    // arc from a0 (slow, lower-left) sweeping through top to a1 (fast, lower-right)
    const a0 = Math.PI * 0.80, a1 = Math.PI * 0.20;   // measured CCW from +x, drawn clockwise top
    // map a ratio value to an angle along the arc (lo->a0, hi->a1)
    const span = (hi - lo) < 1e-6 ? 1 : (hi - lo);
    const toAng = (val) => a0 + (a1 - a0) * ((val - lo) / span);

    // arc track
    ctx.lineWidth = 7; ctx.strokeStyle = C.rule; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, -a0, -a1, true); ctx.stroke();

    // marks: slow, even(1.0), fast
    const marks = [[lo, 'slow', C.dead], [1.0, 'even', C.keep], [hi, 'fast', C.drift]];
    ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    for (const [val, lab, col] of marks) {
      if (val < lo - 1e-6 || val > hi + 1e-6) continue;
      const ang = toAng(val);
      const x1 = cx + Math.cos(ang) * (R - 10), y1 = cy - Math.sin(ang) * (R - 10);
      const x2 = cx + Math.cos(ang) * (R + 6), y2 = cy - Math.sin(ang) * (R + 6);
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const lx = cx + Math.cos(ang) * (R + 20), ly = cy - Math.sin(ang) * (R + 20);
      ctx.fillStyle = C.inkFaint; ctx.fillText(lab, lx, ly + 3);
    }

    // needle
    const ang = toAng(Math.max(lo, Math.min(hi, r)));
    const near = Math.abs(r - 1) < 0.015 * Math.max(1, hi - 1 || 1);
    const col = Math.abs(r - 1) < 0.01 ? C.keep : (r > 1 ? C.drift : C.dead);
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * (R - 6), cy - Math.sin(ang) * (R - 6)); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 2 * Math.PI); ctx.fillStyle = C.field; ctx.fill();

    ctx.fillStyle = C.inkFaint; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('output speed', cx, cy + 26);
    ctx.fillStyle = col; ctx.font = '15px "JetBrains Mono", monospace';
    ctx.fillText(`×${r.toFixed(2)}`, cx, cy + 46);
  }

  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);
    const t = S.theta;
    // joint on the left
    drawJoint(ctx, [w * 0.30, h * 0.52], Math.min(w * 0.16, h * 0.32), t);
    // divider
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(w * 0.595, 24); ctx.lineTo(w * 0.595, h - 24); ctx.stroke();
    ctx.setLineDash([]);
    // gauge on the right
    drawGauge(ctx, w * 0.79, h * 0.50, Math.min(w * 0.13, h * 0.30), t);
    // labels
    ctx.font = '13px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = C.inkFaint; ctx.fillText(`β = ${(S.beta / DEG).toFixed(0)}°`, 14, 22);
  }

  // ---------- the ratio trace ----------
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 42, padR = 14, padT = 14, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const lo = rMin(), hi = rMax();
    const ylo = Math.min(lo, 0.98) - 0.04, yhi = Math.max(hi, 1.02) + 0.04;
    const X = (f) => x0 + f * (x1 - x0);
    const Y = (v) => y1 - (v - ylo) / (yhi - ylo) * (y1 - y0);

    // angle grid
    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    for (const [frac, lab] of [[0, '0'], [0.25, '90'], [0.5, '180'], [0.75, '270'], [1, '360']]) {
      ctx.strokeStyle = C.rule; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(frac), y0); ctx.lineTo(X(frac), y1); ctx.stroke();
      ctx.setLineDash([]); ctx.fillText(lab, X(frac), y1 + 15);
    }
    // even line (ratio 1), fast & slow guides
    ctx.textAlign = 'right';
    for (const [v, col, lab] of [[1, C.ink, '1.0'], [hi, C.drift, hi.toFixed(2)], [lo, C.dead, lo.toFixed(2)]]) {
      ctx.strokeStyle = (v === 1) ? C.rule : col; ctx.globalAlpha = (v === 1) ? 1 : 0.4; ctx.lineWidth = (v === 1) ? 1.4 : 1;
      if (v !== 1) ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x1, Y(v)); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = (v === 1) ? C.inkFaint : col; ctx.fillText(lab, x0 - 6, Y(v) + 3);
    }

    // the ratio curve
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const th = i / 240 * 2 * Math.PI, rr = Math.cos(S.beta) / (1 - Math.sin(S.beta) ** 2 * Math.cos(th) ** 2);
      const px = X(th / (2 * Math.PI)), py = Y(rr);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.4; ctx.strokeStyle = C.brass; ctx.stroke();

    // present marker
    const th = norm(S.theta), rr = ratioOf(th);
    const mx = X(th / (2 * Math.PI)), my = Y(rr);
    const col = Math.abs(rr - 1) < 0.01 ? C.keep : (rr > 1 ? C.drift : C.dead);
    ctx.strokeStyle = C.rule; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(mx, y0); ctx.lineTo(mx, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(mx, my, 6, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();
  }

  // ---------- readouts ----------
  function updateReadout() {
    const t = norm(S.theta), rr = ratioOf(t), lo = rMin(), hi = rMax();
    $('r-in').textContent = `${S.rpm.toFixed(0)} rpm`;
    const outEl = $('r-out');
    outEl.textContent = `${(S.rpm * rr).toFixed(1)} rpm`;
    const ratioEl = $('r-ratio'); ratioEl.textContent = `×${rr.toFixed(3)}`;
    const near = Math.abs(rr - 1) < 0.01;
    ratioEl.className = 'v ' + (near ? 'good' : rr > 1 ? 'warn' : 'bad');
    $('r-span').textContent = `${hi.toFixed(2)} · ${lo.toFixed(2)}`;
    $('r-depth').textContent = `±${((hi - lo) / 2 * 100).toFixed(0)}%`;

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (near) { v.classList.add('v-keep'); vt.textContent = 'Even — the output speed crossing the input rate'; vs.textContent = 'in step'; }
    else if (rr > 1) { v.classList.add('v-drift'); vt.textContent = 'Surging — the output running faster than the drive'; vs.textContent = 'fast'; }
    else { v.classList.add('v-dead'); vt.textContent = 'Dragging — the output running slower than the drive'; vs.textContent = 'slow'; }
  }

  let liveT = 0;
  function announce(force) {
    const now = performance.now();
    if (!force && now - liveT < 1200) return; liveT = now;
    const rr = ratioOf(norm(S.theta));
    if (Math.abs(rr - 1) < 0.01) live.textContent = `Output speed even with the input.`;
    else live.textContent = `Output at ${rr.toFixed(2)} times the input rate, ${rr > 1 ? 'surging' : 'dragging'}.`;
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.033);
    if (S.running && !S.dragging && !RM.matches) S.theta = norm(S.theta + omega() * dt);
    drawMech(); drawTrace(); updateReadout(); announce(false);
    requestAnimationFrame(frame);
  }

  // ---------- controls ----------
  function bindRange(id, prop, scale, fmt) {
    const el = $(id), out = $(id + '-v');
    if (stored[prop] != null) el.value = String(stored[prop] / scale);
    const sync = () => { const raw = parseFloat(el.value); S[prop] = raw * scale; out.textContent = fmt(raw); save(); };
    el.addEventListener('input', sync); sync();
  }
  bindRange('beta', 'beta', DEG, (v) => v.toFixed(0));
  bindRange('rpm', 'rpm', 1, (v) => v.toFixed(0));

  function setRun(on) { S.running = on; const b = $('run'); b.textContent = on ? 'Pause' : 'Run'; b.setAttribute('aria-pressed', String(on)); }
  $('run').addEventListener('click', () => setRun(!S.running));
  $('fast').addEventListener('click', () => { S.theta = 0; setRun(false); announce(true); });
  $('slow').addEventListener('click', () => { S.theta = Math.PI / 2; setRun(false); announce(true); });

  function pointA(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.30, cy = rect.top + rect.height * 0.52;
    return Math.atan2(cy - e.clientY, e.clientX - cx);
  }
  mech.addEventListener('pointerdown', (e) => { S.dragging = true; S.dragA0 = pointA(e); mech.setPointerCapture(e.pointerId); mech.style.cursor = 'grabbing'; });
  mech.addEventListener('pointermove', (e) => {
    if (!S.dragging) return;
    const a = pointA(e); let d = a - S.dragA0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    S.theta = norm(S.theta + d); S.dragA0 = a;
  });
  function endDrag(e) { if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab'; try { mech.releasePointerCapture(e.pointerId); } catch (_) {} }
  mech.addEventListener('pointerup', endDrag);
  mech.addEventListener('pointercancel', endDrag);
  mech.style.cursor = 'grab';
  mech.tabIndex = 0;
  mech.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { S.theta = norm(S.theta + 5 * DEG); setRun(false); e.preventDefault(); announce(true); }
    else if (e.key === 'ArrowLeft') { S.theta = norm(S.theta - 5 * DEG); setRun(false); e.preventDefault(); announce(true); }
    else if (e.key === ' ') { setRun(!S.running); e.preventDefault(); }
  });

  window.addEventListener('resize', () => { drawMech(); drawTrace(); });
  if (RM.matches) { setRun(false); S.theta = 0; }
  live.textContent = `A universal joint at a ${(S.beta / DEG).toFixed(0)} degree bend running steadily. The output speed swings between ${rMax().toFixed(2)} and ${rMin().toFixed(2)} times the input, twice a turn. Let it run, or drag it.`;
  requestAnimationFrame(frame);
})();
