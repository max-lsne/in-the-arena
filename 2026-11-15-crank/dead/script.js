/* Dead — the dead centres of a slider-crank.
 *
 * Throw r, rod L = n*r. The slider (pin side) sits at
 *     x(theta) = r*cos(theta) + sqrt(L^2 - r^2 sin^2 theta)        [mm]
 * A steady force F along the stroke delivers a torque to the shaft equal to the force
 * times the slope of the slider's travel (virtual work, F*dx = T*dtheta):
 *     T(theta) = F * dx/dtheta,
 *     dx/dtheta = -r sin t - (r^2 sin t cos t)/sqrt(L^2 - r^2 sin^2 t).
 * That slope is also the perpendicular distance from the shaft axis to the line of the
 * connecting rod — the moment arm — and it goes to zero at theta = 0 and 180 degrees,
 * where rod, crank and stroke line are collinear. Those are the two dead centres: no
 * torque, at any force. A single cylinder cannot start from one; a flywheel carries it
 * through. (../2026-09-25-flywheel/)
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;
  const r = 26;                 // throw, mm (fixed for this page)

  const S = {
    n: 3.5,                     // rod ratio L/r
    F: 100,                     // gas force, N
    theta: 70 * DEG,
    running: true,
    pushing: false,
    dragging: false, dragA0: 0, lastT: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'crank-dead';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ n: S.n, F: S.F })); } catch (_) {} };
  const stored = load();

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (x) => s.getPropertyValue(x).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      brass: g('--brass'), brass2: g('--brass-2'), brassB: g('--brass-b'),
      steel: g('--steel'), steel2: g('--steel-2'), steelB: g('--steel-b'),
      rod: g('--spring'), rod2: g('--spring-2'),
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
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const mech = $('mech'), plot = $('plot');

  const L = () => S.n * r;
  const Q = (t) => Math.sqrt(Math.max(1e-6, L() * L() - r * r * Math.sin(t) * Math.sin(t)));
  const xOf = (t) => r * Math.cos(t) + Q(t);
  // dx/dtheta (mm) — the velocity ratio and the moment arm
  const slope = (t) => -r * Math.sin(t) - (r * r * Math.sin(t) * Math.cos(t)) / Q(t);
  const torque = (t) => S.F * slope(t);      // N·mm (signed)
  const norm = (t) => { let a = t % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a; };
  const nearestDead = (t) => (norm(t) < Math.PI / 2 || norm(t) > 3 * Math.PI / 2) ? 0 : Math.PI;

  // peak |torque| and its angle, numerically
  function peak() {
    let best = 0, at = 0;
    for (let d = 1; d < 180; d++) { const tq = Math.abs(torque(d * DEG)); if (tq > best) { best = tq; at = d; } }
    return { tq: best, at };
  }

  // ---- mechanism ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.26, cy = h * 0.52;
    const Rpix = Math.min(w * 0.15, h * 0.30);
    const scale = Rpix / r;
    const rpix = r * scale, Lpix = L() * scale;
    const t = S.theta;
    const pinX = cx + rpix * Math.cos(t), pinY = cy - rpix * Math.sin(t);
    const sliderX = cx + (rpix * Math.cos(t) + Math.sqrt(Math.max(1, Lpix * Lpix - rpix * rpix * Math.sin(t) * Math.sin(t))));

    // guide + stroke line
    const railX0 = cx + Lpix - rpix - 24, railX1 = cx + Lpix + rpix + 46;
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(railX0, cy - 20); ctx.lineTo(railX1, cy - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railX0, cy + 20); ctx.lineTo(railX1, cy + 20); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = C.steel;
    ctx.beginPath(); ctx.moveTo(cx - rpix - 12, cy); ctx.lineTo(railX1, cy); ctx.stroke();
    ctx.setLineDash([]);

    // crank circle
    ctx.strokeStyle = C.steelB; ctx.lineWidth = 1.1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, rpix, 0, 2 * Math.PI); ctx.stroke();
    ctx.setLineDash([]);

    const onDead = Math.abs(Math.sin(t)) < 0.06;

    // moment arm: perpendicular from axis to the rod line (pin -> slider)
    const ax = sliderX - pinX, ay = cy - pinY;
    const len2 = ax * ax + ay * ay;
    const tt = len2 > 0 ? ((cx - pinX) * ax + (cy - pinY) * ay) / len2 : 0;
    const footX = pinX + tt * ax, footY = pinY + tt * ay;
    const armPix = Math.hypot(cx - footX, cy - footY);
    // extend rod line faintly to show it passing the axis at dead centre
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(pinX - ax * 0.6, pinY - ay * 0.6);
    ctx.lineTo(sliderX + ax * 0.1, cy + ay * 0.1);
    ctx.stroke(); ctx.setLineDash([]);
    // the arm itself
    const armCol = armPix * (1 / scale) < 4 ? C.dead : (armPix * (1 / scale) < 13 ? C.drift : C.keep);
    ctx.strokeStyle = armCol; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(footX, footY); ctx.stroke();
    // right-angle tick at foot
    if (armPix > 8) {
      const ux = (footX - cx) / armPix, uy = (footY - cy) / armPix;
      const vx = ax / Math.sqrt(len2), vy = ay / Math.sqrt(len2);
      const s0 = 6;
      ctx.lineWidth = 1; ctx.strokeStyle = armCol;
      ctx.beginPath();
      ctx.moveTo(footX - ux * s0, footY - uy * s0);
      ctx.lineTo(footX - ux * s0 + vx * s0, footY - uy * s0 + vy * s0);
      ctx.lineTo(footX + vx * s0, footY + vy * s0);
      ctx.stroke();
    }

    // crank web
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pinX, pinY); ctx.stroke(); ctx.lineCap = 'butt';
    // rod (copper, thicker when pushing)
    ctx.strokeStyle = C.rod; ctx.lineWidth = S.pushing ? 7 : 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pinX, pinY); ctx.lineTo(sliderX, cy); ctx.stroke(); ctx.lineCap = 'butt';

    // push arrow on the slider when forcing
    if (S.pushing) {
      const dir = Math.cos(t) >= 0 ? -1 : 1; // push toward the shaft along stroke
      ctx.strokeStyle = C.dead; ctx.fillStyle = C.dead; ctx.lineWidth = 3;
      const ax0 = sliderX - dir * 2, ax1 = sliderX - dir * 30;
      ctx.beginPath(); ctx.moveTo(sliderX + dir * 24, cy); ctx.lineTo(ax0, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax0, cy); ctx.lineTo(ax0 + dir * 8, cy - 5); ctx.lineTo(ax0 + dir * 8, cy + 5); ctx.closePath(); ctx.fill();
    }

    // hub
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI); ctx.fillStyle = C.steel2; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fillStyle = C.field; ctx.fill();
    // pin
    ballAt(ctx, pinX, pinY, 7);
    // slider block
    const bw = 34, bh = 30;
    ctx.fillStyle = C.field2; ctx.strokeStyle = C.brass2; ctx.lineWidth = 2;
    roundRect(ctx, sliderX - bw / 2, cy - bh / 2, bw, bh, 5); ctx.fill(); ctx.stroke();
    ballAt(ctx, sliderX, cy, 4.5);

    // labels
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'left';
    ctx.fillText(`n = ${S.n.toFixed(1)}`, 14, 22);
    ctx.textAlign = 'right';
    if (onDead) { ctx.fillStyle = C.dead; ctx.fillText('dead centre · arm 0', w - 14, 22); }
    else { ctx.fillStyle = C.inkFaint; ctx.fillText(`arm ${(armPix / scale).toFixed(0)} mm`, w - 14, 22); }
  }

  function ballAt(ctx, x, y, rr) {
    const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.2, x, y, rr);
    g.addColorStop(0, C.brassB); g.addColorStop(1, C.brass2);
    ctx.beginPath(); ctx.arc(x, y, rr, 0, 2 * Math.PI); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = C.brass2; ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, rr) {
    ctx.beginPath(); ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
  }

  // ---- torque plot over one revolution ----
  function drawPlot() {
    const { ctx, w, h } = fit(plot, 560, 180);
    ctx.clearRect(0, 0, w, h);
    const padL = 20, padR = 16, padT = 16, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const midY = (y0 + y1) / 2;
    const pk = peak();
    const amp = (y1 - y0) / 2 - 4;
    const tmax = Math.max(1, pk.tq);

    // zero axis
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke();

    // dead-centre verticals at 0/180/360
    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    for (const [frac, lab] of [[0, 'dead'], [0.5, 'dead'], [1, 'dead']]) {
      const px = x0 + frac * (x1 - x0);
      ctx.strokeStyle = C.dead; ctx.setLineDash([2, 3]); ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke();
      ctx.globalAlpha = 1; ctx.setLineDash([]);
      ctx.fillStyle = C.dead; ctx.fillText(lab, px, y1 + 15);
    }
    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'center';
    ctx.fillText('90°', x0 + 0.25 * (x1 - x0), y1 + 15);
    ctx.fillText('270°', x0 + 0.75 * (x1 - x0), y1 + 15);

    // fill lobes + curve
    ctx.beginPath();
    for (let px = x0; px <= x1; px += 2) {
      const a = (px - x0) / (x1 - x0) * 2 * Math.PI;
      const py = midY - (torque(a) / tmax) * amp;
      if (px === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.4; ctx.strokeStyle = C.steel; ctx.stroke();

    // mark the two peaks
    for (const d of [pk.at, 360 - pk.at]) {
      const px = x0 + d / 360 * (x1 - x0);
      const py = midY - (torque(d * DEG) / tmax) * amp;
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 2 * Math.PI); ctx.fillStyle = C.keep; ctx.fill();
    }
    // axis label
    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'left'; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('torque', x0 + 2, y0 + 9);

    // present marker
    const a = norm(S.theta);
    const px = x0 + a / (2 * Math.PI) * (x1 - x0);
    const py = midY - (torque(a) / tmax) * amp;
    ctx.strokeStyle = C.rule; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke(); ctx.setLineDash([]);
    const onDead = Math.abs(Math.sin(a)) < 0.06;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI);
    ctx.fillStyle = onDead ? C.dead : (Math.abs(torque(a)) > 0.5 * tmax ? C.keep : C.drift);
    ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();
  }

  // ---- readouts ----
  function updateReadout() {
    const t = norm(S.theta);
    const arm = Math.abs(slope(t));
    const tq = Math.abs(torque(t));
    const pk = peak();
    $('r-theta').textContent = `${(t / DEG).toFixed(0)}°`;
    const armEl = $('r-arm'); armEl.textContent = `${arm.toFixed(1)} mm`;
    armEl.className = 'v ' + (arm < 4 ? 'bad' : arm < 13 ? 'warn' : 'good');
    const tqEl = $('r-torque'); tqEl.textContent = `${tq.toFixed(0)} N·mm`;
    tqEl.className = 'v ' + (tq < 0.12 * pk.tq ? 'bad' : tq < 0.5 * pk.tq ? 'warn' : 'good');
    $('r-peak').textContent = `${pk.tq.toFixed(0)} N·mm @ ${pk.at}°`;

    const onDead = Math.abs(Math.sin(t)) < 0.06;
    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (onDead) {
      v.classList.add('v-dead');
      vt.textContent = S.pushing ? 'Dead centre — full force on the slider, and the shaft will not turn'
        : 'Dead centre — rod, crank and stroke in one line; no arm, no turn';
      vs.textContent = t < Math.PI / 2 || t > 3 * Math.PI / 2 ? 'outer' : 'inner';
    } else if (tq > 0.5 * pk.tq) {
      v.classList.add('v-keep'); vt.textContent = 'Driving — the rod’s thrust well off the axis, torque near its peak';
      vs.textContent = 'strong';
    } else {
      v.classList.add('v-drift'); vt.textContent = 'Near a dead point — the arm shortening, the push going slack';
      vs.textContent = 'weak';
    }
  }

  let liveT = 0;
  function announce(force) {
    const now = performance.now();
    if (!force && now - liveT < 1100) return; liveT = now;
    const t = norm(S.theta);
    if (Math.abs(Math.sin(t)) < 0.06) live.textContent = `Dead centre at ${(t / DEG).toFixed(0)} degrees. Moment arm zero; no torque at any force.`;
    else live.textContent = `${(t / DEG).toFixed(0)} degrees. Moment arm ${Math.abs(slope(t)).toFixed(0)} millimetres, torque ${Math.abs(torque(t)).toFixed(0)} newton-millimetres.`;
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.033);
    if (S.running && !S.dragging && !RM.matches) S.theta = norm(S.theta + 1.9 * dt);
    drawMech(); drawPlot(); updateReadout(); announce(false);
    requestAnimationFrame(frame);
  }

  // ---- controls ----
  function bindRange(id, prop, fmt, after) {
    const el = $(id), out = $(id + '-v');
    if (stored[prop] != null) el.value = stored[prop];
    const sync = () => { S[prop] = parseFloat(el.value); out.textContent = fmt(S[prop]); if (after) after(); save(); };
    el.addEventListener('input', sync); sync();
  }
  bindRange('ratio', 'n', (v) => v.toFixed(1));
  bindRange('force', 'F', (v) => v.toFixed(0));

  function setRun(on) { S.running = on; const b = $('run'); b.textContent = on ? 'Pause' : 'Run'; b.setAttribute('aria-pressed', String(on)); }
  $('run').addEventListener('click', () => setRun(!S.running));
  const pushBtn = $('push');
  function setPush(on) { S.pushing = on; pushBtn.setAttribute('aria-pressed', String(on)); pushBtn.textContent = on ? 'Pushing' : 'Push'; }
  pushBtn.addEventListener('pointerdown', () => { setPush(true); setRun(false); announce(true); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => pushBtn.addEventListener(ev, () => setPush(false)));
  $('todead').addEventListener('click', () => { S.theta = nearestDead(S.theta); setRun(false); announce(true); });

  // drag crank
  function pointA(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.26, cy = rect.top + rect.height * 0.52;
    return Math.atan2(cy - e.clientY, e.clientX - cx);
  }
  mech.addEventListener('pointerdown', (e) => { S.dragging = true; S.dragA0 = pointA(e); mech.setPointerCapture(e.pointerId); mech.style.cursor = 'grabbing'; });
  mech.addEventListener('pointermove', (e) => {
    if (!S.dragging) return;
    const a = pointA(e); let d = a - S.dragA0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    S.theta = norm(S.theta + d); S.dragA0 = a;
  });
  function endDrag(e) { if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab'; try { mech.releasePointerCapture(e.pointerId); } catch (_) {} }
  mech.addEventListener('pointerup', endDrag); mech.addEventListener('pointercancel', endDrag);
  mech.style.cursor = 'grab'; mech.tabIndex = 0;
  mech.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { S.theta = norm(S.theta + 5 * DEG); setRun(false); e.preventDefault(); announce(true); }
    else if (e.key === 'ArrowLeft') { S.theta = norm(S.theta - 5 * DEG); setRun(false); e.preventDefault(); announce(true); }
    else if (e.key === ' ') { setRun(!S.running); e.preventDefault(); }
  });

  window.addEventListener('resize', () => { drawMech(); drawPlot(); });
  if (RM.matches) setRun(false);
  live.textContent = 'A slider-crank with a steady force on the slider. The moment arm — and the torque — fall to zero at the two dead centres. Turn it by hand or let it run.';
  requestAnimationFrame(frame);
})();
