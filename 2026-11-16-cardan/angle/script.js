/* Angle — a universal (Cardan / Hooke's) joint as an angle transformer.
 *
 * Two shafts meet at a bend angle beta. A cross (four-armed spider) is gripped at one
 * pair of arms by the drive yoke, at the other pair by the driven yoke. The arm axes
 * are mutually perpendicular and each is perpendicular to its own shaft, so once the
 * input roll theta is fixed the whole cross is fixed, and the output roll works out to
 *     phi(theta) = atan2( sin theta, cos theta * cos beta )
 * i.e. tan phi = tan theta / cos beta. Over a full turn the output advances exactly
 * once, but within the turn it leads then lags the input by up to ~beta^2/4, zero at
 * the four quarter points. The drawn cross arms are taken straight from the geometry
 * (p1 from theta; p2 = d x p1), so the picture and the formula are the same mechanism.
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;

  const S = {
    beta: 30 * Math.PI / 180,     // bend angle, rad
    rpm: 26,                       // drive speed
    theta: 40 * Math.PI / 180,     // input roll, rad (open on a lively leading angle)
    running: true,
    dragging: false, dragA0: 0, lastT: 0, dragW: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'cardan-angle';
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

  const omega = () => S.rpm * 2 * Math.PI / 60;          // rad/s
  const norm = (t) => { let a = t % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a; };
  const phiOf = (t) => norm(Math.atan2(Math.sin(t), Math.cos(t) * Math.cos(S.beta)));
  const wrap = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  // largest lead/lag over a turn for the current bend
  const maxDev = () => {
    const b = S.beta; if (b < 1e-4) return 0;
    // occurs near theta where d/dtheta(phi - theta)=0; sample densely, it is cheap and exact enough
    let m = 0;
    for (let a = 0; a < Math.PI / 2; a += 0.004) {
      const d = Math.abs(wrap(norm(Math.atan2(Math.sin(a), Math.cos(a) * Math.cos(b))) - a));
      if (d > m) m = d;
    }
    return m;
  };

  // ---------- the mechanism (three-quarter view) ----------
  // model axes: X along the drive shaft, Y up, Z out of the bench. Output shaft is
  // bent down in the X-Y plane by beta. A light axonometric bleeds Z into the picture
  // so the cross is seen to tumble.
  function project(p, O, sc) {
    return [O[0] + (p[0] - p[2] * 0.42) * sc, O[1] + (-p[1] - p[2] * 0.16) * sc];
  }
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);
    const O = [w * 0.46, h * 0.52];
    const sc = Math.min(w * 0.19, h * 0.34);
    const b = S.beta, t = S.theta;

    const d = [Math.cos(b), -Math.sin(b), 0];           // output shaft axis (bent down)
    const drive = [-1, 0, 0];                            // drive shaft axis (to the left)
    const p1 = [0, Math.cos(t), Math.sin(t)];            // drive-yoke arm axis
    // output-yoke arm axis = d x p1 (perp to both shafts and to p1), normalised
    let p2 = [
      d[1] * p1[2] - d[2] * p1[1],
      d[2] * p1[0] - d[0] * p1[2],
      d[0] * p1[1] - d[1] * p1[0],
    ];
    const n2 = Math.hypot(p2[0], p2[1], p2[2]) || 1; p2 = p2.map((x) => x / n2);
    const ra = 0.52;                                     // cross arm length

    const PO = project([0, 0, 0], O, sc);
    const add = (u, v, s) => [u[0] + v[0] * s, u[1] + v[1] * s, u[2] + v[2] * s];

    // --- shafts ---
    const driveEnd = add([0, 0, 0], drive, 1.7);
    const outEnd = add([0, 0, 0], d, 1.7);
    function shaft(axisEnd, col) {
      const P = project(axisEnd, O, sc);
      ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(PO[0], PO[1]); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    shaft(driveEnd, C.steel2);
    shaft(outEnd, C.steel);
    // bend-plane hint: the straight line the output would keep if beta were 0
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
    const straight = project(add([0, 0, 0], drive, -1.7), O, sc);
    ctx.beginPath(); ctx.moveTo(PO[0], PO[1]); ctx.lineTo(straight[0], straight[1]); ctx.stroke();
    ctx.setLineDash([]);

    // --- ghost output yoke: where an even turn would point (phi = theta) ---
    const pe = (ang) => {
      // even-reference arm in the output frame at roll = theta
      const e1 = [Math.sin(b), Math.cos(b), 0], e2 = [0, 0, 1];
      return [
        e1[0] * Math.cos(ang) + e2[0] * Math.sin(ang),
        e1[1] * Math.cos(ang) + e2[1] * Math.sin(ang),
        e1[2] * Math.cos(ang) + e2[2] * Math.sin(ang),
      ];
    };
    const gArm = pe(t);
    drawArm(ctx, O, sc, add([0, 0, 0], d, 0.30), gArm, ra * 0.92, C.rule, 3, true);

    // --- the cross (copper), four arms ---
    const nearInput = p1[2] >= 0;                         // z-sort for a touch of depth
    const drawCross = () => {
      drawArm(ctx, O, sc, [0, 0, 0], p1, ra, C.cross, 6, false);
      drawArm(ctx, O, sc, [0, 0, 0], p2, ra, C.cross2, 6, false);
    };
    drawCross();

    // --- yokes (brass): prongs gripping the arm tips ---
    // drive yoke: collar on the drive axis, two prongs to +/- p1 tips
    drawYoke(ctx, O, sc, add([0, 0, 0], drive, 0.34), p1, ra, C.brass2);
    // driven yoke: collar on the output axis, two prongs to +/- p2 tips
    drawYoke(ctx, O, sc, add([0, 0, 0], d, 0.34), p2, ra, C.brass);

    // cross hub
    ctx.beginPath(); ctx.arc(PO[0], PO[1], 6, 0, 2 * Math.PI);
    ctx.fillStyle = C.cross2; ctx.fill();
    ctx.beginPath(); ctx.arc(PO[0], PO[1], 2.4, 0, 2 * Math.PI);
    ctx.fillStyle = C.field; ctx.fill();

    // labels
    ctx.font = '13px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = C.inkFaint;
    ctx.fillText(`β = ${(b / DEG).toFixed(0)}°`, 14, 22);
    ctx.textAlign = 'right';
    const dev = wrap(phiOf(t) - t);
    ctx.fillStyle = Math.abs(dev) < 1.2 * DEG ? C.keep : (Math.abs(dev) > maxDev() * 0.75 ? C.drift : C.inkFaint);
    ctx.fillText(`${dev >= 0 ? 'lead' : 'lag'} ${Math.abs(dev / DEG).toFixed(1)}°`, w - 14, 22);
    ctx.textAlign = 'left'; ctx.fillStyle = C.inkFaint;
    ctx.fillText('drive', project(add([0, 0, 0], drive, 1.55), O, sc)[0] - 10, PO[1] - 16);
  }

  function drawArm(ctx, O, sc, base, axis, len, col, lw, dashed) {
    const a = project([base[0] + axis[0] * len, base[1] + axis[1] * len, base[2] + axis[2] * len], O, sc);
    const b = project([base[0] - axis[0] * len, base[1] - axis[1] * len, base[2] - axis[2] * len], O, sc);
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]); ctx.lineCap = 'butt';
  }

  function drawYoke(ctx, O, sc, collar, armAxis, ra, col) {
    const tip1 = [armAxis[0] * ra, armAxis[1] * ra, armAxis[2] * ra];
    const tip2 = [-armAxis[0] * ra, -armAxis[1] * ra, -armAxis[2] * ra];
    const Pc = project(collar, O, sc);
    const Pt1 = project(tip1, O, sc), Pt2 = project(tip2, O, sc);
    ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(Pt1[0], Pt1[1]); ctx.lineTo(Pc[0], Pc[1]); ctx.lineTo(Pt2[0], Pt2[1]); ctx.stroke();
    // knuckle balls at the tips
    for (const T of [Pt1, Pt2]) {
      ctx.beginPath(); ctx.arc(T[0], T[1], 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = C.brassB; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = col; ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // ---------- the output-vs-input trace ----------
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 36, padR = 14, padT = 12, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const X = (f) => x0 + f * (x1 - x0);
    const Y = (f) => y1 - f * (y1 - y0);   // f in 0..1 maps 0..360 output

    // grid + the perfect-step diagonal
    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const [frac, lab] of [[0, '0'], [0.25, '90'], [0.5, '180'], [0.75, '270'], [1, '360']]) {
      ctx.strokeStyle = C.rule; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(frac), y0); ctx.lineTo(X(frac), y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(lab, X(frac), y1 + 15);
    }
    ctx.textAlign = 'right';
    ctx.fillText('φ', x0 - 6, y0 + 8); ctx.fillText('θ', x1, y1 + 15);
    // diagonal = even turn
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke();

    // the four quarter points, where drive and driven agree exactly (phi = theta)
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath(); ctx.arc(X(f), Y(f), 3, 0, 2 * Math.PI);
      ctx.fillStyle = C.field; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = C.steel2; ctx.stroke();
    }

    // the S-curve phi(theta)
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const th = i / 240 * 2 * Math.PI;
      const ph = norm(Math.atan2(Math.sin(th), Math.cos(th) * Math.cos(S.beta)));
      const px = X(th / (2 * Math.PI)), py = Y(ph / (2 * Math.PI));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.4; ctx.strokeStyle = C.brass; ctx.stroke();

    // present marker
    const th = norm(S.theta), ph = phiOf(th);
    const mx = X(th / (2 * Math.PI)), my = Y(ph / (2 * Math.PI));
    const dev = Math.abs(wrap(ph - th));
    const md = Math.max(maxDev(), 1e-6);
    const col = dev < 1.2 * DEG ? C.keep : (dev > md * 0.7 ? C.dead : C.drift);
    ctx.strokeStyle = C.rule; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(mx, y0); ctx.lineTo(mx, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(mx, my, 6, 0, 2 * Math.PI);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();
  }

  // ---------- readouts ----------
  function updateReadout() {
    const t = norm(S.theta), ph = phiOf(t), dev = wrap(ph - t);
    $('r-in').textContent = `${(t / DEG).toFixed(0)}°`;
    $('r-out').textContent = `${(ph / DEG).toFixed(0)}°`;
    const md = maxDev();
    const devEl = $('r-dev');
    devEl.textContent = `${dev >= 0 ? '+' : '−'}${Math.abs(dev / DEG).toFixed(1)}° ${dev >= 0 ? 'lead' : 'lag'}`;
    const near = Math.abs(dev) < 1.2 * DEG, far = Math.abs(dev) > md * 0.7;
    devEl.className = 'v ' + (near ? 'good' : far ? 'bad' : 'warn');
    $('r-max').textContent = `±${(md / DEG).toFixed(1)}°`;

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (near) {
      v.classList.add('v-keep'); vt.textContent = 'Square on — the output caught up with the drive';
      vs.textContent = 'in step';
    } else if (dev > 0) {
      v.classList.add('v-drift'); vt.textContent = 'Running ahead — the output leading the steady turn';
      vs.textContent = 'leading';
    } else {
      v.classList.add(far ? 'v-dead' : 'v-drift'); vt.textContent = 'Falling behind — the output lagging the steady turn';
      vs.textContent = 'lagging';
    }
  }

  let liveT = 0;
  function announce(force) {
    const now = performance.now();
    if (!force && now - liveT < 1200) return; liveT = now;
    const t = norm(S.theta), ph = phiOf(t), dev = wrap(ph - t);
    if (Math.abs(dev) < 1.2 * DEG) live.textContent = `Input ${(t / DEG).toFixed(0)} degrees. Output in step with the drive.`;
    else live.textContent = `Input ${(t / DEG).toFixed(0)} degrees, output ${(ph / DEG).toFixed(0)}, ${Math.abs(dev / DEG).toFixed(0)} degrees ${dev >= 0 ? 'ahead' : 'behind'}.`;
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
  // scale maps slider value -> stored S value (beta is held in radians, rpm plainly)
  function bindRange(id, prop, scale, fmt) {
    const el = $(id), out = $(id + '-v');
    if (stored[prop] != null) el.value = String(stored[prop] / scale);
    const sync = () => { const raw = parseFloat(el.value); S[prop] = raw * scale; out.textContent = fmt(raw); save(); };
    el.addEventListener('input', sync); sync();
  }
  bindRange('beta', 'beta', DEG, (v) => v.toFixed(0));
  bindRange('rpm', 'rpm', 1, (v) => v.toFixed(0));

  function setRun(on) {
    S.running = on; const btn = $('run');
    btn.textContent = on ? 'Pause' : 'Run'; btn.setAttribute('aria-pressed', String(on));
  }
  $('run').addEventListener('click', () => setRun(!S.running));
  $('lead').addEventListener('click', () => {
    // move to the input angle of worst lead for this bend
    let best = 0, bestD = -1;
    for (let a = 0; a < Math.PI / 2; a += 0.004) { const dd = wrap(phiOf(a) - a); if (dd > bestD) { bestD = dd; best = a; } }
    S.theta = best; setRun(false); announce(true);
  });
  $('agree').addEventListener('click', () => { S.theta = Math.PI / 2; setRun(false); announce(true); });

  // drag the drive shaft about the joint centre
  function pointA(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.46, cy = rect.top + rect.height * 0.52;
    return Math.atan2(cy - e.clientY, e.clientX - cx);
  }
  mech.addEventListener('pointerdown', (e) => {
    S.dragging = true; S.dragA0 = pointA(e); S.lastT = performance.now(); S.dragW = 0;
    mech.setPointerCapture(e.pointerId); mech.style.cursor = 'grabbing';
  });
  mech.addEventListener('pointermove', (e) => {
    if (!S.dragging) return;
    const a = pointA(e);
    let d = a - S.dragA0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const t = performance.now(), dtr = (t - S.lastT) / 1000;
    if (dtr > 0) S.dragW = d / dtr;
    S.theta = norm(S.theta + d); S.dragA0 = a; S.lastT = t;
  });
  function endDrag(e) {
    if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab';
    try { mech.releasePointerCapture(e.pointerId); } catch (_) {}
  }
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
  if (RM.matches) setRun(false);
  {
    const dev0 = wrap(phiOf(S.theta) - S.theta);
    const state0 = Math.abs(dev0) < 1.2 * DEG ? 'in step with the drive'
      : `the output ${Math.abs(dev0 / DEG).toFixed(0)} degrees ${dev0 >= 0 ? 'ahead of' : 'behind'} the steady turn`;
    live.textContent = `A universal joint at a ${(S.beta / DEG).toFixed(0)} degree bend, opening with ${state0}. The drive turns steadily; the output turns once for once but leads and lags within the turn. Let it run, or drag it by hand.`;
  }
  requestAnimationFrame(frame);
})();
