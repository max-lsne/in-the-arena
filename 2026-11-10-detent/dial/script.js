/* Dial — a ring of detents, and the counted stops it turns through.
 *
 * The same one curve, now tiled round a wheel: seats every P = 2*pi/N. The detent
 * torque toward the nearest seat is -dU/dphi. Turning the dial is free dynamics with
 * three torques: the detent, viscous damping, and Coulomb friction tau_f that sticks
 * the wheel when the detent's pull near a seat falls below it. That stick is the
 * dead-band: within +/- delta = tau_f / kappa of a seat the knob holds wherever it was
 * left, so friction both stiffens the click and loosens the landing.
 */
(() => {
  'use strict';

  const k = 4.0, F0 = 8.0;       // spring stiffness (N/mm), preload (N)
  const Rp = 24;                 // nominal pitch radius, mm
  const J = 6.0, cvis = 1.4;     // inertia, viscous damping
  const DEG = Math.PI / 180;

  const S = {
    N: 12, d: 3, tauF: 10,
    P: 2 * Math.PI / 12,
    phi: 0, omega: 0, zeroPhi: 0,
    clicks: 0, flash: 0,
    dragging: false, lastA: 0, lastT: 0,
    center: { x: 0, y: 0, r: 0 },
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'detent-dial';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ N: S.N, d: S.d, tauF: S.tauF })); } catch (_) {} };
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
      spring: g('--spring'), spring2: g('--spring-2'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }
  readColors();
  const mqD = matchMedia('(prefers-color-scheme: dark)');
  mqD.addEventListener && mqD.addEventListener('change', readColors);

  function fit(canvas, baseW, baseH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth || baseW, h = w * baseH / baseW;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const mech = $('mech'), wash = $('wash');

  // ---- model ----
  const liftFrac = (phi) => 0.5 * (1 - Math.cos(2 * Math.PI * phi / S.P));
  const xOf = (phi) => S.d * liftFrac(phi);
  function dU(phi) { // detent torque, N*mm (positive resists forward)
    const x = xOf(phi);
    const dx = (Math.PI * S.d / S.P) * Math.sin(2 * Math.PI * phi / S.P);
    return (F0 + k * x) * dx;
  }
  function peakDetent() { let m = 0; const n = 200; for (let i = 1; i < n; i++) { const t = dU((i / n) * (S.P / 2)); if (t > m) m = t; } return m; }
  const kappa0 = () => F0 * 2 * Math.PI * Math.PI * S.d / (S.P * S.P); // seat stiffness, N*mm/rad
  const deadBand = () => S.tauF / Math.max(1e-6, kappa0());           // rad (half-width)
  const nearestSeat = (phi) => Math.round(phi / S.P) * S.P;
  const stopIndex = (phi) => ((Math.round(phi / S.P) % S.N) + S.N) % S.N;

  // ---- dial drawing ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 320);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.52, R = Math.min(w * 0.30, h * 0.40);
    S.center = { x: cx, y: cy, r: R };

    // outer fixed index marks (stops) + numbers
    ctx.save(); ctx.translate(cx, cy);
    for (let i = 0; i < S.N; i++) {
      const a = i * S.P - Math.PI / 2;
      const atSeat = (i === stopIndex(S.phi));
      ctx.strokeStyle = atSeat ? C.brass : C.rule;
      ctx.lineWidth = atSeat ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.moveTo((R + 6) * Math.cos(a), (R + 6) * Math.sin(a));
      ctx.lineTo((R + (atSeat ? 18 : 13)) * Math.cos(a), (R + (atSeat ? 18 : 13)) * Math.sin(a));
      ctx.stroke();
      if (S.N <= 24 && (S.N <= 12 || i % 2 === 0)) {
        ctx.fillStyle = atSeat ? C.brass2 : C.inkFaint;
        ctx.font = `${atSeat ? '600 12' : '11'}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i), (R + 30) * Math.cos(a), (R + 30) * Math.sin(a));
      }
    }
    ctx.restore();

    // the knob (rotating): body + grip flutes + pointer
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.phi);
    const kg = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    kg.addColorStop(0, C.field2); kg.addColorStop(1, C.field);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.fillStyle = kg; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.steel; ctx.stroke();
    // grip flutes
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1.1;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(R * 0.80 * Math.cos(a), R * 0.80 * Math.sin(a));
      ctx.lineTo(R * 0.94 * Math.cos(a), R * 0.94 * Math.sin(a));
      ctx.stroke();
    }
    // pointer (points up at phi=0)
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.86); ctx.lineTo(-R * 0.055, -R * 0.2); ctx.lineTo(R * 0.055, -R * 0.2); ctx.closePath();
    ctx.fillStyle = C.brass; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, 2 * Math.PI); ctx.fillStyle = C.steel2; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.04, 0, 2 * Math.PI); ctx.fillStyle = C.field; ctx.fill();
    ctx.restore();

    // flash ring on a click
    if (S.flash > 0.01) {
      ctx.globalAlpha = S.flash; ctx.strokeStyle = C.brass; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R + 24 + (1 - S.flash) * 8, 0, 2 * Math.PI); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // labels
    ctx.font = '13px "JetBrains Mono", monospace'; ctx.fillStyle = C.inkFaint;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${S.N} stops`, 14, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.brass2; ctx.fillText(`stop ${stopIndex(S.phi)}`, w - 14, 22);
    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'center';
    ctx.fillText('drag to turn', cx, cy + R + 44);
  }

  // ---- washboard ----
  function drawWash() {
    const { ctx, w, h } = fit(wash, 560, 180);
    ctx.clearRect(0, 0, w, h);
    const padL = 16, padR = 16, padT = 16, padB = 22;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const midY = (y0 + y1) / 2;
    const span = S.P * 2.5;                 // show ~5 seats
    const center = S.phi;
    const peak = peakDetent();
    const ymax = Math.max(peak * 1.15, S.tauF * 1.2, 1);
    const toX = (phi) => x0 + (phi - (center - span)) / (2 * span) * (x1 - x0);
    const toY = (t) => midY - (t / ymax) * ((y1 - y0) / 2 - 4);

    // friction band
    ctx.fillStyle = C.drift; ctx.globalAlpha = 0.14;
    ctx.fillRect(x0, toY(S.tauF), x1 - x0, toY(-S.tauF) - toY(S.tauF));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.drift; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, toY(S.tauF)); ctx.lineTo(x1, toY(S.tauF)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, toY(-S.tauF)); ctx.lineTo(x1, toY(-S.tauF)); ctx.stroke();
    ctx.setLineDash([]);

    // zero axis
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke();

    // seats within view (ticks)
    const firstSeat = Math.round((center - span) / S.P) * S.P;
    for (let s = firstSeat; s <= center + span; s += S.P) {
      const xx = toX(s);
      if (xx < x0 || xx > x1) continue;
      ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xx, y1); ctx.lineTo(xx, y1 + 4); ctx.stroke();
    }

    // the washboard curve: detent torque -dU across the view
    ctx.beginPath();
    for (let px = x0; px <= x1; px += 2) {
      const phi = (center - span) + (px - x0) / (x1 - x0) * (2 * span);
      const py = toY(-dU(phi));   // restoring torque toward seats
      px === x0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.2; ctx.strokeStyle = C.steel; ctx.stroke();

    // current position marker
    const opX = toX(center), opY = toY(-dU(center));
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(opX, y0); ctx.lineTo(opX, y1); ctx.stroke(); ctx.setLineDash([]);
    const inBand = Math.abs(dU(center)) <= S.tauF;
    ctx.beginPath(); ctx.arc(opX, opY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = (Math.abs(center - nearestSeat(center)) < 1.5 * DEG) ? C.keep : (inBand ? C.drift : C.brass);
    ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();

    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left'; ctx.fillText('detent torque', x0, y0 + 2);
    ctx.textAlign = 'right'; ctx.fillStyle = C.drift; ctx.fillText('friction band', x1, y0 + 2);
  }

  // ---- readouts ----
  function updateReadout() {
    const idx = stopIndex(S.phi);
    const net = S.phi - S.zeroPhi;
    const shown = ((Math.round(net / S.P) % S.N) + S.N) % S.N;
    $('r-stop').textContent = `${shown} / ${S.N}`;
    $('r-clicks').textContent = `${S.clicks}`;
    $('r-break').textContent = `${(peakDetent() + S.tauF).toFixed(0)} N·mm`;
    $('r-band').textContent = `±${(deadBand() / DEG).toFixed(1)}°`;
    $('r-step').textContent = `${(360 / S.N).toFixed(1)}°`;

    const off = S.phi - nearestSeat(S.phi);
    const seated = Math.abs(off) < Math.max(1.0 * DEG, deadBand()) && Math.abs(S.omega) < 0.05 && !S.dragging;
    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (seated) {
      v.classList.add('v-keep'); vt.textContent = `Seated — stop ${shown}`;
      vs.textContent = deadBand() > 1.5 * DEG ? 'held in the dead-band' : 'resting on a stop';
    } else if (S.dragging) {
      v.classList.add('v-rest'); vt.textContent = 'Turning — riding the washboard'; vs.textContent = 'dragging';
    } else {
      v.classList.add('v-drift'); vt.textContent = 'Between stops — settling to one'; vs.textContent = 'rolling in';
    }
  }

  let liveT = 0, lastStop = 0;
  function announce(force) {
    const now = performance.now(); if (!force && now - liveT < 700) return; liveT = now;
    const shown = ((Math.round((S.phi - S.zeroPhi) / S.P) % S.N) + S.N) % S.N;
    if (shown !== lastStop || force) { lastStop = shown; live.textContent = `Stop ${shown} of ${S.N}.`; }
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.033);
    if (!S.dragging) {
      const prevIdx = Math.round(S.phi / S.P);
      const restoring = -dU(S.phi);           // toward nearest seat
      let fric;
      const stick = Math.abs(S.omega) < 0.06;
      if (stick && Math.abs(restoring) <= S.tauF) {
        // dead-band: friction holds it, no motion
        S.omega = 0; fric = -restoring;
      } else {
        fric = -S.tauF * (stick ? Math.sign(restoring) : Math.sign(S.omega));
      }
      const net = restoring + fric - cvis * S.omega;
      S.omega += (net / J) * dt;
      S.omega = Math.max(-16, Math.min(16, S.omega));
      S.phi += S.omega * dt;
      const idx = Math.round(S.phi / S.P);
      if (idx !== prevIdx) { S.clicks += Math.abs(idx - prevIdx); S.flash = 1; }
    }
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.4);
    drawMech(); drawWash(); updateReadout(); announce(false);
    requestAnimationFrame(frame);
  }

  // ---- controls ----
  function bindRange(id, prop, fmt, after) {
    const el = $(id), out = $(id + '-v');
    if (stored[prop] != null) el.value = stored[prop];
    const sync = () => { S[prop] = parseFloat(el.value); out.textContent = fmt(S[prop]); if (after) after(); save(); };
    el.addEventListener('input', sync); sync();
  }
  function onN() { S.P = 2 * Math.PI / S.N; }
  bindRange('notches', 'N', (v) => `${v}`, onN);
  bindRange('depth', 'd', (v) => v.toFixed(1));
  bindRange('friction', 'tauF', (v) => `${v}`);
  onN();

  // ---- angular drag ----
  const angleAt = (e) => {
    const r = mech.getBoundingClientRect();
    const sx = r.left + S.center.x * (r.width / mech.clientWidth);
    const sy = r.top + S.center.y * (r.height / mech.clientHeight);
    return Math.atan2(e.clientY - sy, e.clientX - sx);
  };
  const shortest = (da) => { while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; return da; };
  mech.addEventListener('pointerdown', (e) => {
    S.dragging = true; S.omega = 0; S.lastA = angleAt(e); S.lastT = performance.now();
    mech.setPointerCapture(e.pointerId); mech.style.cursor = 'grabbing'; e.preventDefault();
  });
  mech.addEventListener('pointermove', (e) => {
    if (!S.dragging) return;
    const a = angleAt(e), da = shortest(a - S.lastA), t = performance.now();
    const prevIdx = Math.round(S.phi / S.P);
    S.phi += da;
    if (t > S.lastT) S.omega = da / ((t - S.lastT) / 1000);
    S.lastA = a; S.lastT = t;
    const idx = Math.round(S.phi / S.P);
    if (idx !== prevIdx) { S.clicks += Math.abs(idx - prevIdx); S.flash = 1; }
  });
  function endDrag(e) {
    if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab';
    try { mech.releasePointerCapture(e.pointerId); } catch (_) {}
    if (RM.matches) { S.phi = nearestSeat(S.phi); S.omega = 0; }
    else S.omega = Math.max(-12, Math.min(12, S.omega));
  }
  mech.addEventListener('pointerup', endDrag);
  mech.addEventListener('pointercancel', endDrag);
  mech.style.cursor = 'grab'; mech.tabIndex = 0;

  function step(dir) {
    if (RM.matches) { S.phi = nearestSeat(S.phi) + dir * S.P; S.omega = 0; return; }
    S.phi = nearestSeat(S.phi);
    // kinetic energy to clear one crest: energy barrier (full depth) + friction work over the climb
    const barrier = (F0 * S.d + 0.5 * k * S.d * S.d) + S.tauF * (S.P / 2);
    S.omega = dir * Math.sqrt(2 * barrier / J) * 1.08;
  }
  mech.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
    else if (e.key === 'Home') { S.phi = S.zeroPhi; S.omega = 0; e.preventDefault(); }
  });
  $('cw').addEventListener('click', () => step(1));
  $('ccw').addEventListener('click', () => step(-1));
  $('zero').addEventListener('click', () => { S.zeroPhi = nearestSeat(S.phi); S.clicks = 0; announce(true); });

  window.addEventListener('resize', () => { drawMech(); drawWash(); });
  live.textContent = `A dial of ${S.N} stops, resting on stop 0. Drag it round, or use the arrow keys to click from stop to stop.`;
  requestAnimationFrame(frame);
})();
