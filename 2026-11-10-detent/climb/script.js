/* Climb — the breakaway torque of a detent.
 *
 * Same sprung ball, same notched wheel, same one curve. The detent resists forward
 * turning with a torque equal to the slope of its stored energy:
 *     dU/dphi = (F0 + k*x) * dx/dphi,   x(phi) = (d/2)(1 - cos 2*pi*phi/P)
 * which runs from zero at the seat up to a PEAK partway up the flank and back to zero
 * at the crest. Drive the wheel with an applied torque tau:
 *     J*phi'' = tau - dU/dphi - c*phi'
 * Below the peak there is a stable resting angle on the rising flank; above it there is
 * none short of the crest, so the wheel snaps over and clicks into the next seat. Hold
 * tau well above the peak and it ratchets through notch after notch.
 */
(() => {
  'use strict';

  const k = 4.0;                 // spring stiffness, N/mm
  const Rp = 24;                 // nominal pitch radius, mm (for the flank-angle reading)
  const J = 7.0, c = 3.4;        // illustrative wheel inertia and damping
  const DEG = Math.PI / 180;

  const S = {
    F0: 8, d: 3, N: 12, tau: 0,
    P: 2 * Math.PI / 12,
    phi: 0, omega: 0,
    seatIdx: 0, clicks: 0, flash: 0, turning: false,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'detent-climb';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ F0: S.F0, d: S.d, N: S.N })); } catch (_) {} };
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
    const w = canvas.clientWidth || baseW;
    const h = w * baseH / baseW;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const mech = $('mech'), curve = $('curve');

  // ---- model ----
  const liftFrac = (phi) => 0.5 * (1 - Math.cos(2 * Math.PI * phi / S.P));
  const xOf = (phi) => S.d * liftFrac(phi);
  const forceOf = (phi) => S.F0 + k * xOf(phi);
  function dU(phi) { // detent resisting torque, N*mm
    const x = xOf(phi);
    const dx = (Math.PI * S.d / S.P) * Math.sin(2 * Math.PI * phi / S.P);
    return (S.F0 + k * x) * dx;
  }
  function breakaway() { // peak of dU over the rising flank
    let m = 0;
    const n = 240;
    for (let i = 1; i < n; i++) { const phi = (i / n) * (S.P / 2); const t = dU(phi); if (t > m) m = t; }
    return m;
  }
  const flankMax = () => Math.atan((Math.PI * S.d / S.P) / Rp) / DEG; // deg
  const nearestSeat = (phi) => Math.round(phi / S.P) * S.P;

  // ---- mechanism drawing ----
  function drawSpring(ctx, x0, y0, x1, y1, force) {
    const n = 9, len = y1 - y0, amp = 11 + Math.max(0, force - 8) * 0.25;
    ctx.strokeStyle = C.spring; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = y0 + len * t;
      const x = x0 + (i === 0 || i === n ? 0 : (i % 2 ? amp : -amp));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x1, y1); ctx.stroke();
  }

  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.66;
    const R0 = Math.min(w * 0.27, h * 0.40, cy - 88);
    const Dpix = Math.max(6, Math.min(R0 * 0.18, R0 * (S.d / 6) * 0.9));
    const rimR = (a) => R0 - Dpix * (1 - liftFrac(a));

    // applied-torque arc (around the hub)
    const b = breakaway();
    const frac = b > 0 ? Math.min(1.3, S.tau / b) : 0;
    if (frac > 0.01) {
      ctx.save(); ctx.translate(cx, cy);
      const ar = R0 * 0.42, a0 = -Math.PI / 2 + 0.3, a1 = a0 + Math.min(5.0, 0.6 + frac * 3.5);
      ctx.strokeStyle = frac >= 1 ? C.dead : (frac > 0.9 ? C.drift : C.steel2);
      ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(0, 0, ar, a0, a1); ctx.stroke();
      // arrowhead
      const ax = ar * Math.cos(a1), ay = ar * Math.sin(a1);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a1 + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, -9); ctx.lineTo(5, -9); ctx.closePath();
      ctx.fillStyle = frac >= 1 ? C.dead : (frac > 0.9 ? C.drift : C.steel2); ctx.fill();
      ctx.restore(); ctx.restore();
    }

    // wheel
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.phi);
    ctx.beginPath();
    const steps = 360;
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * 2 * Math.PI, r = rimR(a);
      const px = r * Math.cos(a - Math.PI / 2), py = r * Math.sin(a - Math.PI / 2);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = C.field2; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.steel; ctx.stroke();
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1.1;
    for (let i = 0; i < S.N; i++) {
      const a = i * S.P - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo((R0 - Dpix - 4) * Math.cos(a), (R0 - Dpix - 4) * Math.sin(a)); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, R0 * 0.16, 0, 2 * Math.PI); ctx.fillStyle = C.steel2; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R0 * 0.055, 0, 2 * Math.PI); ctx.fillStyle = C.field; ctx.fill();
    ctx.restore();

    // follower
    const contactR = rimR(-S.phi);
    const ballR = Math.max(10, Dpix * 1.15);
    const ballY = cy - (contactR + ballR * 0.78);
    const anchorY = cy - (R0 + ballR + 42);
    drawSpring(ctx, cx, anchorY, cx, ballY - ballR, forceOf(S.phi));
    ctx.fillStyle = C.inkFaint; ctx.fillRect(cx - 26, anchorY - 8, 52, 8);
    const grad = ctx.createRadialGradient(cx - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.2, cx, ballY, ballR);
    grad.addColorStop(0, C.brassB); grad.addColorStop(1, C.brass2);
    ctx.beginPath(); ctx.arc(cx, ballY, ballR, 0, 2 * Math.PI); ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.brass2; ctx.stroke();

    // click flash ring
    if (S.flash > 0.01) {
      ctx.globalAlpha = S.flash;
      ctx.strokeStyle = C.brass; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, ballY, ballR + 6 + (1 - S.flash) * 10, 0, 2 * Math.PI); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.font = '13px "JetBrains Mono", monospace'; ctx.fillStyle = C.inkFaint;
    ctx.textAlign = 'left'; ctx.fillText(`${S.N} notches`, 14, 22);
    ctx.textAlign = 'right';
    const off = (S.phi - nearestSeat(S.phi)) / DEG;
    ctx.fillText(`${off >= 0 ? '+' : ''}${off.toFixed(1)}° off seat`, w - 14, 22);
  }

  // ---- torque curve ----
  function drawCurve() {
    const { ctx, w, h } = fit(curve, 560, 200);
    ctx.clearRect(0, 0, w, h);
    const padL = 18, padR = 16, padT = 22, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const b = breakaway();
    const ymax = Math.max(b * 1.45, S.tau * 1.1, 1);
    const toX = (phi) => x0 + (phi / S.P) * (x1 - x0);
    const toY = (t) => y1 - (t / ymax) * (y1 - y0);

    // axes
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    // crest marker at P/2
    const xc = toX(S.P / 2);
    ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(xc, y0); ctx.lineTo(xc, y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.fillText('crest', xc, y1 + 15);
    ctx.textAlign = 'left'; ctx.fillText('seat', x0, y1 + 15);
    ctx.fillText('resistance', x0, y0 - 6);

    // the resistance curve over one period
    ctx.beginPath();
    for (let px = x0; px <= x1; px += 2) {
      const phi = (px - x0) / (x1 - x0) * S.P;
      const py = toY(Math.max(0, dU(phi)));
      px === x0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.4; ctx.strokeStyle = C.steel; ctx.stroke();

    // breakaway peak marker
    // find peak angle
    let pa = 0, pm = 0; const n = 240;
    for (let i = 1; i < n; i++) { const phi = (i / n) * (S.P / 2); const t = dU(phi); if (t > pm) { pm = t; pa = phi; } }
    const pX = toX(pa), pY = toY(pm);
    ctx.beginPath(); ctx.arc(pX, pY, 3.5, 0, 2 * Math.PI); ctx.fillStyle = C.drift; ctx.fill();
    ctx.fillStyle = C.drift; ctx.textAlign = 'center';
    ctx.fillText('breakaway', pX, pY - 8);

    // applied-torque line
    const ay = toY(S.tau);
    const over = S.tau >= pm;
    ctx.strokeStyle = over ? C.dead : (S.tau > 0.9 * pm ? C.drift : C.keep);
    ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle; ctx.textAlign = 'right';
    ctx.fillText('applied', x1, ay - 5);

    // operating dot (current phi folded into one period)
    let fp = ((S.phi % S.P) + S.P) % S.P;
    const opX = toX(fp), opY = toY(Math.max(0, dU(fp)));
    ctx.beginPath(); ctx.arc(opX, opY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = over ? C.dead : C.brass; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();
  }

  // ---- readout ----
  function updateReadout() {
    const b = breakaway();
    $('r-break').textContent = `${b.toFixed(0)} N·mm`;
    $('r-applied').textContent = `${S.tau.toFixed(0)} N·mm`;
    const margin = b > 0 ? Math.max(0, (1 - S.tau / b) * 100) : 0;
    const mEl = $('r-margin'); mEl.textContent = `${margin.toFixed(0)}%`;
    mEl.className = 'v ' + (S.tau >= b ? 'bad' : (S.tau > 0.9 * b ? 'warn' : 'good'));
    $('r-angle').textContent = `${flankMax().toFixed(1)}°`;
    $('r-clicks').textContent = `${S.clicks}`;

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    const ratcheting = S.tau >= b && Math.abs(S.omega) > 0.4;
    if (ratcheting) { v.classList.add('v-dead'); vt.textContent = 'Clicking over — past breakaway'; vs.textContent = 'ratcheting'; }
    else if (S.tau >= b) { v.classList.add('v-dead'); vt.textContent = 'Over breakaway — it will not hold'; vs.textContent = 'giving'; }
    else if (S.tau > 0.9 * b) { v.classList.add('v-drift'); vt.textContent = 'At the edge — a hair from breaking'; vs.textContent = 'near the crest'; }
    else { v.classList.add('v-keep'); vt.textContent = 'Holding — below breakaway'; vs.textContent = 'resting on the flank'; }
  }

  let liveT = 0;
  function announce() {
    const now = performance.now(); if (now - liveT < 1000) return; liveT = now;
    const b = breakaway();
    live.textContent = S.tau >= b
      ? `Over breakaway. ${S.clicks} clicks.`
      : `Holding at ${S.tau.toFixed(0)} of ${b.toFixed(0)} newton-millimetres breakaway.`;
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.033);

    if (S.turning) {
      const el = $('applied');
      S.tau = Math.min(parseFloat(el.max), S.tau + parseFloat(el.max) * 0.5 * dt);
      el.value = S.tau; $('applied-v').textContent = S.tau.toFixed(0);
    }

    if (RM.matches && !S.turning) {
      // reduced motion: resolve to a static holding angle, no runaway animation
      const b = breakaway();
      if (S.tau < b) {
        // bisect rising flank for dU=tau
        let lo = 0, hi = findPeakAngle();
        for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (dU(mid) < S.tau) lo = mid; else hi = mid; }
        S.phi = nearestSeat(S.phi) + (lo + hi) / 2; S.omega = 0;
      } else {
        S.phi = nearestSeat(S.phi); S.omega = 0;
      }
    } else {
      const prevIdx = Math.round(S.phi / S.P);
      const torque = S.tau - dU(S.phi) - c * S.omega;
      S.omega += (torque / J) * dt;
      // cap runaway speed so ratcheting reads as clicks, not a blur
      S.omega = Math.max(-14, Math.min(14, S.omega));
      S.phi += S.omega * dt;
      if (S.tau < breakaway() && Math.abs(S.omega) < 0.02) {
        // settle: snap tiny residual
        if (Math.abs(S.phi - nearestSeat(S.phi)) < 0.3 * DEG) { S.phi = nearestSeat(S.phi); S.omega = 0; }
      }
      const idx = Math.round(S.phi / S.P);
      if (idx !== prevIdx) { S.clicks += Math.abs(idx - prevIdx); S.flash = 1; }
    }
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.2);

    drawMech(); drawCurve(); updateReadout(); announce();
    requestAnimationFrame(frame);
  }
  function findPeakAngle() { let pa = 0, pm = 0; const n = 200; for (let i = 1; i < n; i++) { const phi = (i / n) * (S.P / 2); const t = dU(phi); if (t > pm) { pm = t; pa = phi; } } return pa; }

  // the stable holding offset on the rising flank for a given applied torque (null if past breakaway)
  function stableOffset(tau) {
    const pk = findPeakAngle(); if (tau >= dU(pk)) return null;
    let lo = 0, hi = pk;
    for (let i = 0; i < 34; i++) { const mid = (lo + hi) / 2; if (dU(mid) < tau) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  // set the wheel to its static holding angle (used when the torque is dialled, not ramped)
  function quasiStatic() {
    const off = stableOffset(S.tau);
    if (off != null) { S.phi = nearestSeat(S.phi) + off; S.omega = 0; }
  }

  // ---- controls ----
  function setMaxTorque() {
    const b = breakaway();
    const el = $('applied');
    const mx = Math.max(50, Math.round(b * 1.4 / 10) * 10);
    el.max = mx; el.step = Math.max(1, Math.round(mx / 400));
    if (S.tau > mx) { S.tau = mx; el.value = mx; $('applied-v').textContent = mx.toFixed(0); }
  }
  function bindRange(id, prop, fmt, after) {
    const el = $(id), out = $(id + '-v');
    if (stored[prop] != null) el.value = stored[prop];
    const sync = () => { S[prop] = parseFloat(el.value); out.textContent = fmt(S[prop]); if (after) after(); save(); };
    el.addEventListener('input', sync); sync();
  }
  function onGeom() { S.P = 2 * Math.PI / S.N; setMaxTorque(); if (!S.turning) quasiStatic(); }
  bindRange('notches', 'N', (v) => `${v}`, onGeom);
  bindRange('depth', 'd', (v) => v.toFixed(1), onGeom);
  bindRange('preload', 'F0', (v) => v.toFixed(1), onGeom);
  // applied torque slider (not persisted)
  (() => {
    const el = $('applied'); setMaxTorque();
    const sync = () => { S.tau = parseFloat(el.value); $('applied-v').textContent = S.tau.toFixed(0); quasiStatic(); };
    el.addEventListener('input', () => { S.turning = false; sync(); }); sync();
  })();

  // hold-to-turn
  const turn = $('turn');
  const startTurn = (e) => { S.turning = true; e && e.preventDefault(); };
  const stopTurn = () => { S.turning = false; };
  turn.addEventListener('pointerdown', startTurn);
  turn.addEventListener('pointerup', stopTurn);
  turn.addEventListener('pointerleave', stopTurn);
  turn.addEventListener('pointercancel', stopTurn);

  $('applied').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') S.turning = false;
  });
  $('reset').addEventListener('click', () => {
    S.phi = nearestSeat(S.phi); S.omega = 0; S.tau = 0; S.clicks = 0;
    const el = $('applied'); el.value = 0; $('applied-v').textContent = '0';
  });

  window.addEventListener('resize', () => { drawMech(); drawCurve(); });
  requestAnimationFrame(frame);
})();
