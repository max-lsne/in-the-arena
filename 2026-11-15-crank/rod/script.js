/* Rod — connecting-rod obliquity.
 *
 * Throw r, rod L = n*r. The exact slider position (from the shaft axis) is
 *     X(theta) = r*cos(theta) + sqrt(L^2 - r^2 sin^2 theta)
 * against the ideal infinite-rod value r*cos(theta) + L. Expanding the root,
 *     X ~ const + r*cos(theta) + (r^2/4L)*cos(2 theta) + ...
 * so a real rod adds a second harmonic of amplitude r/(4n). It makes the piston
 * peak before 90 degrees, dwell at the near end, and accelerate harder at the far
 * dead centre than the near in the ratio (n+1):(n-1). The rod leans by beta, with
 * sin beta = (r/L) sin theta. We plot travel, speed (dX/dtheta) or acceleration
 * (d2X/dtheta2) for the real rod against the ideal sine. (throw: ../throw/)
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;
  const r = 26;                 // throw, mm

  const S = {
    n: 3.5,                     // rod ratio
    view: 'pos',
    theta: 70 * DEG,
    running: true,
    dragging: false, dragA0: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'crank-rod';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ n: S.n, view: S.view })); } catch (_) {} };
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
    const w = canvas.clientWidth || baseW; const h = w * baseH / baseW;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const mech = $('mech'), plot = $('plot');

  const L = () => S.n * r;
  const Qf = (t) => Math.sqrt(Math.max(1e-6, L() * L() - r * r * Math.sin(t) * Math.sin(t)));
  const Xreal = (t) => r * Math.cos(t) + Qf(t);
  const Xideal = (t) => r * Math.cos(t) + L();
  const beta = (t) => Math.asin(Math.max(-1, Math.min(1, (r / L()) * Math.sin(t))));
  const velReal = (t) => -r * Math.sin(t) - (r * r * Math.sin(t) * Math.cos(t)) / Qf(t);
  const velIdeal = (t) => -r * Math.sin(t);
  // acceleration r*(cos t + cos2t / n) approx; compute via exact second difference for fidelity
  const accReal = (t) => { const h = 1e-3; return (Xreal(t + h) - 2 * Xreal(t) + Xreal(t - h)) / (h * h); };
  const accIdeal = (t) => -r * Math.cos(t);
  const norm = (t) => { let a = t % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a; };

  // peak speed crank angle (numeric)
  function vmaxAngle() { let best = 0, at = 0; for (let d = 1; d < 180; d++) { const v = Math.abs(velReal(d * DEG)); if (v > best) { best = v; at = d; } } return at; }
  // second-harmonic amplitude as % of stroke: the cos(2θ) term has amplitude
  // r/(4n); over a stroke of 2r that is (r/4n)/(2r) = 1/(8n).
  const h2pct = () => 100 / (8 * S.n);

  // ---- mechanism ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 240);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.24, cy = h * 0.5;
    const Rpix = Math.min(w * 0.13, h * 0.34);
    const scale = Rpix / r;
    const rpix = r * scale, Lpix = L() * scale;
    const t = S.theta;
    const pinX = cx + rpix * Math.cos(t), pinY = cy - rpix * Math.sin(t);
    const sxReal = cx + (rpix * Math.cos(t) + Math.sqrt(Math.max(1, Lpix * Lpix - rpix * rpix * Math.sin(t) * Math.sin(t))));
    const sxIdeal = cx + rpix * Math.cos(t) + Lpix;

    const railX0 = cx + Lpix - rpix - 24, railX1 = cx + Lpix + rpix + 46;
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(railX0, cy - 18); ctx.lineTo(railX1, cy - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railX0, cy + 18); ctx.lineTo(railX1, cy + 18); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = C.steel;
    ctx.beginPath(); ctx.moveTo(cx - rpix - 12, cy); ctx.lineTo(railX1, cy); ctx.stroke(); ctx.setLineDash([]);

    // crank circle
    ctx.strokeStyle = C.steelB; ctx.lineWidth = 1.1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, rpix, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);

    // ideal ghost marker (open circle on the guide)
    ctx.strokeStyle = C.rod; ctx.lineWidth = 1.6; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(sxIdeal, cy, 8, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    // tie between ideal and real to show the offset
    if (Math.abs(sxReal - sxIdeal) > 2) {
      ctx.strokeStyle = C.rod2; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sxIdeal, cy - 12); ctx.lineTo(sxReal, cy - 12); ctx.stroke();
      for (const xx of [sxIdeal, sxReal]) { ctx.beginPath(); ctx.moveTo(xx, cy - 15); ctx.lineTo(xx, cy - 9); ctx.stroke(); }
    }

    // crank web
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pinX, pinY); ctx.stroke(); ctx.lineCap = 'butt';
    // rod (copper) — visibly leaning
    ctx.strokeStyle = C.rod; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pinX, pinY); ctx.lineTo(sxReal, cy); ctx.stroke(); ctx.lineCap = 'butt';

    // hub, pin, block
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI); ctx.fillStyle = C.steel2; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fillStyle = C.field; ctx.fill();
    ballAt(ctx, pinX, pinY, 7);
    const bw = 32, bh = 28;
    ctx.fillStyle = C.field2; ctx.strokeStyle = C.brass2; ctx.lineWidth = 2;
    roundRect(ctx, sxReal - bw / 2, cy - bh / 2, bw, bh, 5); ctx.fill(); ctx.stroke();
    ballAt(ctx, sxReal, cy, 4.5);

    // labels
    ctx.font = '13px "JetBrains Mono", monospace'; ctx.fillStyle = C.inkFaint;
    ctx.textAlign = 'left'; ctx.fillText(`n = ${S.n.toFixed(1)}  ·  β = ${(beta(t) / DEG).toFixed(1)}°`, 14, 20);
    ctx.textAlign = 'right';
    const lead = (sxReal - sxIdeal) / scale;
    ctx.fillStyle = Math.abs(lead) < 0.5 ? C.inkFaint : C.rod2;
    ctx.fillText(`${lead >= 0 ? '+' : ''}${lead.toFixed(1)} mm off ideal`, w - 14, 20);
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

  // ---- plot: chosen quantity, real vs ideal ----
  function curves() {
    if (S.view === 'vel') return { real: velReal, ideal: velIdeal, zeroMid: true };
    if (S.view === 'acc') return { real: accReal, ideal: accIdeal, zeroMid: true };
    // travel from outer dead centre, normalized so range is symmetric about mid
    const real = (t) => ((r + L()) - Xreal(t)) - r;   // center on mid-stroke
    const ideal = (t) => (r * (1 - Math.cos(t))) - r;
    return { real, ideal, zeroMid: true };
  }
  function drawPlot() {
    const { ctx, w, h } = fit(plot, 560, 210);
    ctx.clearRect(0, 0, w, h);
    const padL = 22, padR = 16, padT = 16, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const midY = (y0 + y1) / 2, amp = (y1 - y0) / 2 - 6;

    const { real, ideal } = curves();
    let m = 1e-6;
    for (let d = 0; d <= 360; d += 2) { const t = d * DEG; m = Math.max(m, Math.abs(real(t)), Math.abs(ideal(t))); }

    // axes + dead-centre ticks
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke();
    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    for (const [frac, lab] of [[0, '0°'], [0.25, '90°'], [0.5, '180°'], [0.75, '270°'], [1, '360°']]) {
      const px = x0 + frac * (x1 - x0);
      ctx.strokeStyle = C.rule; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.inkFaint; ctx.fillText(lab, px, y1 + 15);
    }

    const plotLine = (fn, color, dash, wdt) => {
      ctx.beginPath();
      for (let px = x0; px <= x1; px += 2) {
        const t = (px - x0) / (x1 - x0) * 2 * Math.PI;
        const py = midY - (fn(t) / m) * amp;
        if (px === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineWidth = wdt; ctx.strokeStyle = color; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    };
    plotLine(ideal, C.rod, [5, 4], 1.8);       // ideal sine, dashed copper
    plotLine(real, C.steel, [], 2.4);          // real, solid steel

    // present marker on the real curve
    const a = norm(S.theta);
    const px = x0 + a / (2 * Math.PI) * (x1 - x0);
    const py = midY - (real(a) / m) * amp;
    ctx.strokeStyle = C.rule; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fillStyle = C.steel2; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();

    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'left';
    ctx.fillText(S.view === 'vel' ? 'speed' : S.view === 'acc' ? 'throw-off' : 'travel', x0 + 2, y0 + 9);
  }

  // ---- readouts ----
  function updateReadout() {
    const t = norm(S.theta);
    $('r-theta').textContent = `${(t / DEG).toFixed(0)}°`;
    $('r-beta').textContent = `${(beta(t) / DEG).toFixed(1)}°`;
    const h2 = h2pct();
    const h2el = $('r-h2'); h2el.textContent = `${h2.toFixed(1)}% stroke`;
    h2el.className = 'v ' + (h2 < 2.6 ? 'good' : h2 < 4.3 ? 'warn' : 'bad');
    $('r-vmax').textContent = `${vmaxAngle()}°`;
    const ratio = (S.n + 1) / (S.n - 1);
    const accel = $('r-accr'); accel.textContent = `${ratio.toFixed(2)} : 1`;
    accel.className = 'v ' + (ratio < 1.4 ? 'good' : ratio < 2 ? 'warn' : 'bad');
    $('leg-n').textContent = S.n.toFixed(1);

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    const lead = Xreal(t) - Xideal(t);
    const b = Math.abs(beta(t));
    if (b < 1.5 * DEG) {
      v.classList.add('v-keep'); vt.textContent = 'At a dead centre — rod straight, real and ideal agree';
      vs.textContent = 'in step';
    } else if (lead > 0.5) {
      v.classList.add('v-drift'); vt.textContent = 'The rod leaning — the real slider running ahead of the ideal';
      vs.textContent = 'ahead';
    } else {
      v.classList.add('v-drift'); vt.textContent = 'The rod leaning the other way — the real slider lagging the ideal';
      vs.textContent = 'behind';
    }
  }

  let liveT = 0;
  function announce(force) {
    const now = performance.now();
    if (!force && now - liveT < 1100) return; liveT = now;
    const t = norm(S.theta);
    live.textContent = `${(t / DEG).toFixed(0)} degrees. Rod leaning ${(beta(t) / DEG).toFixed(0)} degrees; second harmonic ${h2pct().toFixed(1)} percent of stroke.`;
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.033);
    if (S.running && !S.dragging && !RM.matches) S.theta = norm(S.theta + 1.8 * dt);
    drawMech(); drawPlot(); updateReadout(); announce(false);
    requestAnimationFrame(frame);
  }

  // ---- controls ----
  const ratioEl = $('ratio'), ratioOut = $('ratio-v');
  if (stored.n != null) ratioEl.value = stored.n;
  function syncRatio() { S.n = parseFloat(ratioEl.value); ratioOut.textContent = S.n.toFixed(1); save(); }
  ratioEl.addEventListener('input', syncRatio); syncRatio();

  const viewBtns = Array.from($('view').querySelectorAll('button'));
  function setView(v) {
    S.view = v; viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); save();
  }
  viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
  if (stored.view) setView(stored.view);

  function setRun(on) { S.running = on; const b = $('run'); b.textContent = on ? 'Pause' : 'Run'; b.setAttribute('aria-pressed', String(on)); }
  $('run').addEventListener('click', () => setRun(!S.running));
  $('long').addEventListener('click', () => { ratioEl.value = Math.min(8, S.n + 1.5).toFixed(1); syncRatio(); announce(true); });
  $('short').addEventListener('click', () => { ratioEl.value = Math.max(1.5, S.n - 1).toFixed(1); syncRatio(); announce(true); });

  // drag crank
  function pointA(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.24, cy = rect.top + rect.height * 0.5;
    return Math.atan2(cy - e.clientY, e.clientX - cx);
  }
  mech.addEventListener('pointerdown', (e) => { S.dragging = true; S.dragA0 = pointA(e); mech.setPointerCapture(e.pointerId); mech.style.cursor = 'grabbing'; });
  mech.addEventListener('pointermove', (e) => {
    if (!S.dragging) return; const a = pointA(e); let d = a - S.dragA0;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
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
  live.textContent = `A slider-crank with a real connecting rod, ratio n = ${S.n.toFixed(1)}. The rod tilts as it turns, adding a second harmonic of ${h2pct().toFixed(1)} percent of stroke, so the piston’s motion is not a pure sine. Let it run or drag it.`;
  requestAnimationFrame(frame);
})();
