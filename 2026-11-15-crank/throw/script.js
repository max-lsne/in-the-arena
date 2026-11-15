/* Throw — a crank as a circle-to-line converter.
 *
 * A pin fixed a distance r (the throw) from the shaft axis rides a circle as the
 * shaft turns through angle theta. A slider is held to one straight guide through
 * the axis. With an ideal, infinitely long connecting rod the rod stays parallel to
 * the stroke, so the slider takes only the pin's component along the guide:
 *     x(theta) = r * cos(theta)                         [mm]
 * — the projection of uniform circular motion onto a line, i.e. simple harmonic
 * motion. Speed is x' = -r*omega*sin(theta), greatest at mid-stroke and zero at the
 * two ends; stroke is 2r. This page shows the ideal; the finite rod lives in ../rod/.
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;

  const S = {
    r: 26,                 // throw, mm
    rpm: 34,               // crank speed
    theta: 50 * Math.PI / 180,  // crank angle, rad (open on a representative, lively angle)
    running: true,
    dragging: false, dragA0: 0, dragX0: 0, lastX: 0, lastT: 0, dragW: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'crank-throw';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ r: S.r, rpm: S.rpm })); } catch (_) {} };
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
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const mech = $('mech'), trace = $('trace');

  const omega = () => S.rpm * 2 * Math.PI / 60;     // rad/s
  const xOf = (t) => S.r * Math.cos(t);             // mm, slider position about axis
  const speedOf = (t, w) => -S.r * w * Math.sin(t); // mm/s
  const norm = (t) => { let a = t % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a; };

  // ---- the mechanism ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.30, cy = h * 0.52;             // shaft axis
    const Rpix = Math.min(w * 0.17, h * 0.32);      // crank circle radius at r=46
    const scale = Rpix / 46;                        // mm -> px
    const rpix = S.r * scale;
    const guideY = cy;
    const rodLen = w * 0.46;                          // long rod (the ideal: near-parallel)

    const t = S.theta;
    const pinX = cx + rpix * Math.cos(t);
    const pinY = cy - rpix * Math.sin(t);
    // ideal: slider x tracks the pin's horizontal shadow, carried out along the guide
    const sliderX = cx + rodLen + rpix * Math.cos(t);

    // guide rail
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    const railX0 = cx + rodLen - rpix - 20, railX1 = cx + rodLen + rpix + 44;
    ctx.beginPath(); ctx.moveTo(railX0, guideY - 20); ctx.lineTo(railX1, guideY - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railX0, guideY + 20); ctx.lineTo(railX1, guideY + 20); ctx.stroke();
    // stroke-line (axis of motion)
    ctx.setLineDash([3, 5]); ctx.strokeStyle = C.steel;
    ctx.beginPath(); ctx.moveTo(cx, guideY); ctx.lineTo(railX1, guideY); ctx.stroke();
    ctx.setLineDash([]);

    // crank circle (the path of the pin)
    ctx.strokeStyle = C.steelB; ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, rpix, 0, 2 * Math.PI); ctx.stroke();
    ctx.setLineDash([]);

    // end markers on the stroke line (+r and -r shadows)
    for (const sgn of [1, -1]) {
      const ex = cx + rodLen + sgn * rpix;
      ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, guideY - 26); ctx.lineTo(ex, guideY + 26); ctx.stroke();
    }

    // crank web (axis -> pin)
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pinX, pinY); ctx.stroke();
    ctx.lineCap = 'butt';

    // connecting rod (pin -> slider), copper
    ctx.strokeStyle = C.rod; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pinX, pinY); ctx.lineTo(sliderX, guideY); ctx.stroke();
    ctx.lineCap = 'butt';

    // projection tie: pin down to the stroke line (its shadow)
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(pinX, pinY); ctx.lineTo(pinX, guideY); ctx.stroke();
    ctx.setLineDash([]);

    // shaft hub
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fillStyle = C.steel2; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fillStyle = C.field; ctx.fill();

    // crank pin (brass)
    ball(ctx, pinX, pinY, 7);

    // slider block (brass)
    const bw = 34, bh = 30;
    ctx.fillStyle = C.field2; ctx.strokeStyle = C.brass2; ctx.lineWidth = 2;
    roundRect(ctx, sliderX - bw / 2, guideY - bh / 2, bw, bh, 5); ctx.fill(); ctx.stroke();
    ball(ctx, sliderX, guideY, 4.5);

    // labels
    ctx.font = '13px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = C.inkFaint;
    ctx.fillText(`throw r = ${S.r} mm`, 14, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.inkFaint;
    ctx.fillText(`x = ${xOf(t) >= 0 ? '+' : ''}${xOf(t).toFixed(0)} mm`, w - 14, 22);
  }

  function ball(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    g.addColorStop(0, C.brassB); g.addColorStop(1, C.brass2);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = C.brass2; ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---- the position trace ----
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 40, padR = 16, padT = 16, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const midY = (y0 + y1) / 2;
    const amp = (y1 - y0) / 2 - 4;

    // axes
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke();
    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('+r', x0 - 5, y0 + 9);
    ctx.fillText('0', x0 - 5, midY + 3);
    ctx.fillText('−r', x0 - 5, y1 + 2);
    ctx.textAlign = 'center';
    for (const [frac, lab] of [[0, '0°'], [0.25, '90°'], [0.5, '180°'], [0.75, '270°'], [1, '360°']]) {
      const px = x0 + frac * (x1 - x0);
      ctx.strokeStyle = C.rule; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.inkFaint; ctx.fillText(lab, px, y1 + 15);
    }

    // the cosine
    ctx.beginPath();
    for (let px = x0; px <= x1; px += 2) {
      const a = (px - x0) / (x1 - x0) * 2 * Math.PI;
      const py = midY - Math.cos(a) * amp;
      if (px === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.4; ctx.strokeStyle = C.steel; ctx.stroke();

    // present marker
    const a = norm(S.theta);
    const mxp = x0 + a / (2 * Math.PI) * (x1 - x0);
    const myp = midY - Math.cos(a) * amp;
    ctx.strokeStyle = C.rule; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(mxp, y0); ctx.lineTo(mxp, y1); ctx.stroke();
    ctx.setLineDash([]);
    const sp = Math.abs(Math.sin(a));
    const col = sp > 0.7 ? C.keep : (sp > 0.15 ? C.drift : C.dead);
    ctx.beginPath(); ctx.arc(mxp, myp, 6, 0, 2 * Math.PI);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();
  }

  // ---- readouts ----
  function updateReadout() {
    const t = norm(S.theta);
    const w = S.dragging ? S.dragW : (S.running ? omega() : 0);
    const pos = xOf(t), spd = speedOf(t, w);
    $('r-theta').textContent = `${(t / DEG).toFixed(0)}°`;
    $('r-pos').textContent = `${pos >= 0 ? '+' : ''}${pos.toFixed(0)} mm`;
    $('r-stroke').textContent = `${(2 * S.r).toFixed(0)} mm`;
    const spdEl = $('r-speed');
    spdEl.textContent = `${spd >= 0 ? '+' : ''}${spd.toFixed(0)} mm/s`;
    const frac = Math.abs(Math.sin(t));
    spdEl.className = 'v ' + (frac > 0.7 ? 'good' : frac > 0.15 ? 'warn' : 'bad');
    $('r-peak').textContent = `${(S.r * omega()).toFixed(0)} mm/s`;

    // verdict by where on the stroke we are
    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (frac > 0.7) {
      v.classList.add('v-keep'); vt.textContent = 'Mid-stroke — the pin crossing square-on, the slider at full speed';
      vs.textContent = 'fastest';
    } else if (frac > 0.15) {
      v.classList.add('v-drift'); vt.textContent = 'On the flank — the slider slowing as the pin rounds toward an end';
      vs.textContent = 'slowing';
    } else {
      v.classList.add('v-dead'); vt.textContent = 'At an end — the slider still for an instant, reversing';
      vs.textContent = pos >= 0 ? 'far end' : 'near end';
    }
  }

  let liveT = 0;
  function announce(force) {
    const now = performance.now();
    if (!force && now - liveT < 1100) return; liveT = now;
    const t = norm(S.theta), frac = Math.abs(Math.sin(t));
    if (frac < 0.15) live.textContent = `At the ${xOf(t) >= 0 ? 'far' : 'near'} end of the stroke, momentarily still.`;
    else live.textContent = `${(t / DEG).toFixed(0)} degrees. Slider ${xOf(t) >= 0 ? 'plus' : 'minus'} ${Math.abs(xOf(t)).toFixed(0)} millimetres.`;
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.033);
    if (S.running && !S.dragging && !RM.matches) S.theta = norm(S.theta + omega() * dt);
    drawMech(); drawTrace(); updateReadout(); announce(false);
    requestAnimationFrame(frame);
  }

  // ---- controls ----
  function bindRange(id, prop, fmt, after) {
    const el = $(id), out = $(id + '-v');
    if (stored[prop] != null) el.value = stored[prop];
    const sync = () => { S[prop] = parseFloat(el.value); out.textContent = fmt(S[prop]); if (after) after(); save(); };
    el.addEventListener('input', sync); sync();
  }
  bindRange('throw', 'r', (v) => v.toFixed(0));
  bindRange('rpm', 'rpm', (v) => v.toFixed(0));

  function setRun(on) {
    S.running = on; const b = $('run');
    b.textContent = on ? 'Pause' : 'Run'; b.setAttribute('aria-pressed', String(on));
  }
  $('run').addEventListener('click', () => setRun(!S.running));
  $('tdc').addEventListener('click', () => { S.theta = 0; setRun(false); announce(true); });
  $('mid').addEventListener('click', () => { S.theta = Math.PI / 2; setRun(false); announce(true); });

  // drag the crank
  function pointA(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.30, cy = rect.top + rect.height * 0.52;
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
    if (e.key === 'ArrowRight') { S.theta = norm(S.theta + 6 * DEG); setRun(false); e.preventDefault(); announce(true); }
    else if (e.key === 'ArrowLeft') { S.theta = norm(S.theta - 6 * DEG); setRun(false); e.preventDefault(); announce(true); }
    else if (e.key === ' ') { setRun(!S.running); e.preventDefault(); }
  });

  window.addEventListener('resize', () => { drawMech(); drawTrace(); });
  if (RM.matches) setRun(false);
  live.textContent = `A crank turning a pin round a circle, driving a slider along one guide. Stroke ${(2 * S.r).toFixed(0)} millimetres, peak speed ${(S.r * omega()).toFixed(0)} millimetres per second. Let it run, or drag it by hand.`;
  requestAnimationFrame(frame);
})();
