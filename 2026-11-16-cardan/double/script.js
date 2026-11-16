/* Double — the double-Cardan constant-velocity drive.
 *
 * Two universal joints in series through an intermediate shaft. Each joint maps its
 * input roll a to output roll atan2(sin a, cos a cos beta) and multiplies speed by
 * r(a,beta) = cos(beta)/(1 - sin^2(beta) cos^2(a)). The net speed ratio is the product
 *     omega3/omega1 = r(theta, b1) * r(gamma_m + phase, b2),   gamma_m = joint1 output roll.
 * With b2 = b1 and the intermediate yokes squared (phase = 90 deg) the second factor is
 * the reciprocal of the first at every angle, so the product is 1: constant velocity.
 * Wrong phase (0) makes the ripples ADD; unequal bends leave a residue. All drawn arms
 * are taken from the geometry (p1 in the in-shaft frame; p2 = out-axis x p1).
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;

  const S = {
    b1: 30 * Math.PI / 180,
    b2: 30 * Math.PI / 180,
    phased: true,
    rpm: 24,
    theta: 30 * Math.PI / 180,
    running: true,
    dragging: false, dragA0: 0, lastT: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'cardan-double';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ b1: S.b1, b2: S.b2, phased: S.phased })); } catch (_) {} };
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
  // one joint
  const jOut = (a, b) => Math.atan2(Math.sin(a), Math.cos(a) * Math.cos(b));
  const jRatio = (a, b) => Math.cos(b) / (1 - Math.sin(b) ** 2 * Math.cos(a) ** 2);
  const phase = () => (S.phased ? Math.PI / 2 : 0);
  function netRatio(t) {
    const gm = jOut(t, S.b1);
    return jRatio(t, S.b1) * jRatio(gm + phase(), S.b2);
  }
  // span of the net ratio over a turn (sampled)
  function netSpan() {
    let mn = Infinity, mx = -Infinity;
    for (let a = 0; a < 2 * Math.PI; a += 0.01) { const v = netRatio(a); if (v < mn) mn = v; if (v > mx) mx = v; }
    return [mn, mx];
  }

  // ---------- vector helpers & a general joint drawer ----------
  const V = {
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
    add: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  };
  function project(p, O, sc) { return [O[0] + (p[0] - p[2] * 0.42) * sc, O[1] + (-p[1] - p[2] * 0.16) * sc]; }
  // orthonormal frame perpendicular to axis A
  function perpFrame(A) {
    let u = V.cross(A, [0, 0, 1]);
    if (Math.hypot(u[0], u[1], u[2]) < 1e-5) u = V.cross(A, [0, 1, 0]);
    u = V.norm(u);
    const v = V.norm(V.cross(A, u));
    return [u, v];
  }
  function drawArm(ctx, O, sc, axis, len, col, lw) {
    const a = project([axis[0] * len, axis[1] * len, axis[2] * len], O, sc);
    const b = project([-axis[0] * len, -axis[1] * len, -axis[2] * len], O, sc);
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineCap = 'butt';
  }
  function drawYoke(ctx, O, sc, collarAxis, collarDist, armAxis, ra, col) {
    const Pc = project([collarAxis[0] * collarDist, collarAxis[1] * collarDist, collarAxis[2] * collarDist], O, sc);
    const Pt1 = project([armAxis[0] * ra, armAxis[1] * ra, armAxis[2] * ra], O, sc);
    const Pt2 = project([-armAxis[0] * ra, -armAxis[1] * ra, -armAxis[2] * ra], O, sc);
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(Pt1[0], Pt1[1]); ctx.lineTo(Pc[0], Pc[1]); ctx.lineTo(Pt2[0], Pt2[1]); ctx.stroke();
    for (const T of [Pt1, Pt2]) { ctx.beginPath(); ctx.arc(T[0], T[1], 3.8, 0, 2 * Math.PI); ctx.fillStyle = C.brassB; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = col; ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  // a joint at O: inAxis (points from the joint back along the driving shaft, unit),
  // outAxis (points along the driven shaft), rollIn roll of the input yoke about inAxis
  function drawJoint(ctx, O, sc, inAxis, outAxis, rollIn, inCol, outCol) {
    const [u, v] = perpFrame(inAxis);
    const p1 = V.norm([u[0] * Math.cos(rollIn) + v[0] * Math.sin(rollIn),
      u[1] * Math.cos(rollIn) + v[1] * Math.sin(rollIn),
      u[2] * Math.cos(rollIn) + v[2] * Math.sin(rollIn)]);
    const p2 = V.norm(V.cross(outAxis, p1));
    const ra = 0.46;
    drawArm(ctx, O, sc, p1, ra, C.cross, 5);
    drawArm(ctx, O, sc, p2, ra, C.cross2, 5);
    drawYoke(ctx, O, sc, inAxis, 0.30, p1, ra, inCol);
    drawYoke(ctx, O, sc, outAxis, 0.30, p2, ra, outCol);
    const PO = project([0, 0, 0], O, sc);
    ctx.beginPath(); ctx.arc(PO[0], PO[1], 5, 0, 2 * Math.PI); ctx.fillStyle = C.cross2; ctx.fill();
    ctx.beginPath(); ctx.arc(PO[0], PO[1], 2, 0, 2 * Math.PI); ctx.fillStyle = C.field; ctx.fill();
    return p2;
  }

  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);
    const t = S.theta;
    const sc = Math.min(w * 0.145, h * 0.28);

    // --- the Z backbone, in model space (model-y up). Shafts meet at O1, O2. ---
    const drive = [-1, 0, 0];                               // drive points left from O1
    const mid = V.norm([Math.cos(S.b1), -Math.sin(S.b1), 0]); // intermediate: down-right
    // output makes bend b2 with the intermediate, bending back up toward horizontal
    const outDir = V.norm([Math.cos(S.b1 - S.b2), -Math.sin(S.b1 - S.b2), 0]);

    // screen anchors
    const O1 = [w * 0.30, h * 0.36];
    const Pmid = project([mid[0], mid[1], mid[2]], [0, 0], sc);  // screen delta per unit along mid
    const Lm = 1.7;
    const O2 = [O1[0] + Pmid[0] * Lm, O1[1] + Pmid[1] * Lm];

    // backbone shafts
    function shaft(O, axis, len, col) {
      const P = project([axis[0] * len, axis[1] * len, axis[2] * len], O, sc);
      const PO = project([0, 0, 0], O, sc);
      ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(PO[0], PO[1]); ctx.lineTo(P[0], P[1]); ctx.stroke(); ctx.lineCap = 'butt';
    }
    shaft(O1, drive, 1.6, C.steel2);                 // drive
    shaft(O1, mid, Lm, C.steel);                     // intermediate (from O1)
    shaft(O2, outDir, 1.6, C.steel2);                // output

    // --- joint 1 at O1: drive -> intermediate, input roll theta ---
    drawJoint(ctx, O1, sc, drive, mid, t, C.brass2, C.brass);
    // --- joint 2 at O2: intermediate -> output, input roll gamma_m + phase ---
    const gm = jOut(t, S.b1);
    drawJoint(ctx, O2, sc, [-mid[0], -mid[1], -mid[2]], outDir, gm + phase(), C.brass, C.brass2);

    // labels
    ctx.font = '12px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = C.inkFaint;
    ctx.fillText(`β₁ ${(S.b1 / DEG).toFixed(0)}°`, O1[0] - 34, O1[1] - 30);
    ctx.fillText(`β₂ ${(S.b2 / DEG).toFixed(0)}°`, O2[0] - 6, O2[1] + 40);
    ctx.textAlign = 'right';
    const ph = S.phased && Math.abs(S.b1 - S.b2) < 1e-6;
    ctx.fillStyle = ph ? C.keep : C.drift;
    ctx.fillText(S.phased ? 'phased' : 'crossed', w - 14, 22);
    ctx.textAlign = 'left'; ctx.fillStyle = C.inkFaint;
    ctx.fillText('drive', project(drive, O1, sc)[0] - 4, O1[1] - 10);
  }

  // ---------- the net-ratio trace ----------
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 42, padR = 14, padT = 14, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const [mn, mx] = netSpan();
    // single-joint reference flutter for the faint curve, over the larger bend
    const bRef = Math.max(S.b1, S.b2);
    const sMax = 1 / Math.cos(bRef), sMin = Math.cos(bRef);
    const ylo = Math.min(mn, sMin, 0.98) - 0.05, yhi = Math.max(mx, sMax, 1.02) + 0.05;
    const X = (f) => x0 + f * (x1 - x0);
    const Y = (vv) => y1 - (vv - ylo) / (yhi - ylo) * (y1 - y0);

    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    for (const [frac, lab] of [[0, '0'], [0.25, '90'], [0.5, '180'], [0.75, '270'], [1, '360']]) {
      ctx.strokeStyle = C.rule; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(frac), y0); ctx.lineTo(X(frac), y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText(lab, X(frac), y1 + 15);
    }
    // the band a single joint would wander through, for the pair to sit against
    ctx.fillStyle = C.inkFaint; ctx.globalAlpha = 0.09;
    ctx.fillRect(x0, Y(sMax), x1 - x0, Y(sMin) - Y(sMax));
    ctx.globalAlpha = 1;

    // even line
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0, Y(1)); ctx.lineTo(x1, Y(1)); ctx.stroke();
    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'right'; ctx.fillText('1.0', x0 - 6, Y(1) + 3);

    // faint single-joint reference (the larger bend)
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const th = i / 240 * 2 * Math.PI, rr = jRatio(th, bRef);
      const px = X(th / (2 * Math.PI)), py = Y(rr);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 1.4; ctx.strokeStyle = C.inkFaint; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 4]);
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

    // the net curve
    const flat = (mx - mn) < 0.004;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const th = i / 240 * 2 * Math.PI, rr = netRatio(th);
      const px = X(th / (2 * Math.PI)), py = Y(rr);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.6; ctx.strokeStyle = flat ? C.keep : C.brass; ctx.stroke();

    // present marker
    const th = norm(S.theta), rr = netRatio(th);
    const mxp = X(th / (2 * Math.PI)), myp = Y(rr);
    const col = Math.abs(rr - 1) < 0.01 ? C.keep : (rr > 1 ? C.drift : C.dead);
    ctx.strokeStyle = C.rule; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(mxp, y0); ctx.lineTo(mxp, y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(mxp, myp, 6, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = C.inkFaint; ctx.fillText('· · one joint', x0 + 4, y0 + 10);
    ctx.fillStyle = flat ? C.keep : C.brass; ctx.fillText('—— the pair', x0 + 90, y0 + 10);
  }

  // ---------- readouts ----------
  function updateReadout() {
    const t = norm(S.theta), rr = netRatio(t), [mn, mx] = netSpan();
    const ratioEl = $('r-ratio'); ratioEl.textContent = `×${rr.toFixed(3)}`;
    const near = Math.abs(rr - 1) < 0.01;
    ratioEl.className = 'v ' + (near ? 'good' : rr > 1 ? 'warn' : 'bad');
    $('r-span').textContent = `${mx.toFixed(2)} · ${mn.toFixed(2)}`;
    const depth = (mx - mn) / 2 * 100;
    const depthEl = $('r-depth'); depthEl.textContent = `±${depth.toFixed(0)}%`;
    const flat = (mx - mn) < 0.004;
    depthEl.className = 'v ' + (flat ? 'good' : depth > 20 ? 'bad' : 'warn');
    const bRef = Math.max(S.b1, S.b2);
    $('r-one').textContent = `±${((1 / Math.cos(bRef) - Math.cos(bRef)) / 2 * 100).toFixed(0)}%`;
    const vEl = $('r-verdict');
    vEl.textContent = flat ? 'constant' : (depth > (1 / Math.cos(bRef) - Math.cos(bRef)) / 2 * 100 + 0.5 ? 'worse' : 'partial');
    vEl.className = 'v ' + (flat ? 'good' : vEl.textContent === 'worse' ? 'bad' : 'warn');

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (flat) { v.classList.add('v-keep'); vt.textContent = 'Constant velocity — the net output dead even, every instant'; vs.textContent = 'cancelled'; }
    else if (!S.phased) { v.classList.add('v-dead'); vt.textContent = 'Crossed — the two ripples adding, the shudder doubled'; vs.textContent = 'worse'; }
    else { v.classList.add('v-drift'); vt.textContent = 'Unequal bends — most of the flutter gone, a residue left'; vs.textContent = 'partial'; }
  }

  let liveT = 0;
  function announce(force) {
    const now = performance.now();
    if (!force && now - liveT < 1300) return; liveT = now;
    const [mn, mx] = netSpan(); const flat = (mx - mn) < 0.004;
    if (flat) live.textContent = `Phased, bends equal. The net output is constant — no flutter.`;
    else if (!S.phased) live.textContent = `Crossed phase. The two ripples add; net flutter plus or minus ${((mx - mn) / 2 * 100).toFixed(0)} percent.`;
    else live.textContent = `Bends unequal. A residual flutter of plus or minus ${((mx - mn) / 2 * 100).toFixed(0)} percent remains.`;
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
  bindRange('b1', 'b1', DEG, (v) => v.toFixed(0));
  bindRange('b2', 'b2', DEG, (v) => v.toFixed(0));

  // phase segmented control
  const phaseBtns = Array.from($('phase').querySelectorAll('button'));
  if (stored.phased != null) S.phased = stored.phased;
  function syncPhase() {
    phaseBtns.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === S.phased)));
  }
  phaseBtns.forEach((b) => b.addEventListener('click', () => { S.phased = b.dataset.v === '1'; syncPhase(); save(); announce(true); }));
  syncPhase();

  function setRun(on) { S.running = on; const b = $('run'); b.textContent = on ? 'Pause' : 'Run'; b.setAttribute('aria-pressed', String(on)); }
  $('run').addEventListener('click', () => setRun(!S.running));
  $('match').addEventListener('click', () => {
    S.b2 = S.b1; $('b2').value = String(S.b2 / DEG); $('b2-v').textContent = (S.b2 / DEG).toFixed(0);
    S.phased = true; syncPhase(); save(); announce(true);
  });

  function pointA(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.30, cy = rect.top + rect.height * 0.36;
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
  if (RM.matches) { setRun(false); S.theta = 30 * DEG; }
  {
    const [mn0, mx0] = netSpan(); const flat0 = (mx0 - mn0) < 0.004;
    const s0 = flat0 ? 'phased with equal bends, the net output constant — no flutter'
      : (!S.phased ? `crossed, the two flutters adding to plus or minus ${((mx0 - mn0) / 2 * 100).toFixed(0)} percent`
        : `bends unequal, a residual flutter of plus or minus ${((mx0 - mn0) / 2 * 100).toFixed(0)} percent`);
    live.textContent = `Two universal joints in line, opening ${s0}. Phased with equal bends their flutters cancel; crossed or mismatched, a flutter remains. Let it run, or drag it.`;
  }
  requestAnimationFrame(frame);
})();
