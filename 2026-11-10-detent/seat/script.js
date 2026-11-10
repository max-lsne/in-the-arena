/* Seat — a detent as a potential well.
 *
 * A spring of preload F0 and stiffness k presses a ball into a wheel whose rim is
 * notched every P radians. The plunger's lift out of a seat, as the wheel turns by
 * an angle phi, is
 *     x(phi) = (d/2) * (1 - cos(2*pi*phi/P))        [mm], one period = P
 * so the ball sits deepest (x=0) at a seat and rides to the crest (x=d) halfway to
 * the next one. The stored spring energy is
 *     U(phi) = F0*x + (1/2)*k*x^2                   [N*mm]
 * and the torque the detent puts on the wheel is -dU/dphi: zero at the seat (stable),
 * zero at the crest (unstable), restoring in between. Near the seat U is a parabola,
 * so a nudged wheel returns like a torsional pendulum. We integrate a wheel of
 * illustrative inertia J with light viscous damping c so the return is visible.
 */
(() => {
  'use strict';

  const k = 4.0;                 // spring stiffness, N/mm (fixed for this page)
  const J = 8.0, c = 2.6;        // illustrative wheel inertia and damping
  const DEG = Math.PI / 180;

  // ---- state ----
  const S = {
    F0: 8, d: 3, Pdeg: 44,       // controls
    nSeats: 8, P: 45 * DEG,      // snapped notch count / period
    phi: 0, omega: 0,            // wheel angle (rad) and rate
    dragging: false, dragPhi0: 0, dragX0: 0, lastX: 0, lastT: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- persistence ----
  const KEY = 'detent-seat';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ F0: S.F0, d: S.d, Pdeg: S.Pdeg })); } catch (_) {} };
  const stored = load();

  // ---- palette, theme-aware ----
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
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', () => { readColors(); });

  // ---- canvases ----
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
  const mech = $('mech'), well = $('well');

  // ---- model helpers ----
  function snap() {
    const Ptarget = S.Pdeg * DEG;
    S.nSeats = Math.max(4, Math.min(20, Math.round(2 * Math.PI / Ptarget)));
    S.P = 2 * Math.PI / S.nSeats;
  }
  const liftFrac = (phi) => 0.5 * (1 - Math.cos(2 * Math.PI * phi / S.P)); // 0..1 seat->crest
  const xOf = (phi) => S.d * liftFrac(phi);                                 // mm
  const forceOf = (phi) => S.F0 + k * xOf(phi);                             // N
  // dU/dphi, the torque the wheel must overcome (N*mm); restoring torque = -this
  function dU(phi) {
    const x = xOf(phi);
    const dx = (Math.PI * S.d / S.P) * Math.sin(2 * Math.PI * phi / S.P);   // dx/dphi [mm/rad]
    return (S.F0 + k * x) * dx;
  }
  const energy = (phi) => { const x = xOf(phi); return S.F0 * x + 0.5 * k * x * x; };
  // small-angle seat stiffness, N*mm/rad
  function seatStiffness() {
    // kappa0 = F0 * 2*pi^2*d / P^2  (k-term vanishes at the seat)
    return S.F0 * 2 * Math.PI * Math.PI * S.d / (S.P * S.P);
  }

  function nearestSeat(phi) { return Math.round(phi / S.P) * S.P; }

  // ---- drawing: the mechanism ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 320);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.66;
    const R0 = Math.min(w * 0.28, h * 0.40, cy - 92);
    const Dpix = Math.max(6, Math.min(R0 * 0.18, R0 * (S.d / 6) * 0.9)); // notch depth in px

    // rim radius in wheel frame at wheel-frame angle a (seats at multiples of P at a=0)
    const rimR = (a) => R0 - Dpix * (1 - liftFrac(a));

    // --- wheel body (rotated by phi) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(S.phi);
    // notched rim as a filled disc
    ctx.beginPath();
    const steps = 360;
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * 2 * Math.PI;
      const r = rimR(a);
      const px = r * Math.cos(a - Math.PI / 2), py = r * Math.sin(a - Math.PI / 2);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = C.field2;
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.steel; ctx.stroke();

    // spokes + hub
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1.2;
    for (let i = 0; i < S.nSeats; i++) {
      const a = i * S.P - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo((R0 - Dpix - 4) * Math.cos(a), (R0 - Dpix - 4) * Math.sin(a));
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, R0 * 0.16, 0, 2 * Math.PI);
    ctx.fillStyle = C.steel2; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R0 * 0.055, 0, 2 * Math.PI);
    ctx.fillStyle = C.field; ctx.fill();
    ctx.restore();

    // --- follower: ball at the top, pressed down by a spring ---
    // contact profile under the follower depends on phi (top = wheel-frame angle -phi)
    const contactR = rimR(-S.phi);
    const ballR = Math.max(10, Dpix * 1.15);
    const ballY = cy - (contactR + ballR * 0.78);
    const ballX = cx;

    // spring (copper coil) from a fixed anchor down to the ball
    const anchorY = cy - (R0 + ballR + 46);
    drawSpring(ctx, ballX, anchorY, ballX, ballY - ballR, forceOf(S.phi));

    // anchor bar
    ctx.fillStyle = C.inkFaint;
    ctx.fillRect(ballX - 26, anchorY - 8, 52, 8);

    // ball
    const grad = ctx.createRadialGradient(ballX - ballR * 0.3, ballY - ballR * 0.3, ballR * 0.2, ballX, ballY, ballR);
    grad.addColorStop(0, C.brassB); grad.addColorStop(1, C.brass2);
    ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, 2 * Math.PI);
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.brass2; ctx.stroke();

    // contact spark line
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx - R0 - 10, cy); ctx.lineTo(cx + R0 + 10, cy); ctx.stroke();
    ctx.setLineDash([]);

    // offset label
    const off = (S.phi - nearestSeat(S.phi)) / DEG;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'left';
    ctx.fillText(`${S.nSeats} seats · ${(360 / S.nSeats).toFixed(0)}° apart`, 14, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = Math.abs(off) < 1.5 ? C.keep : (Math.abs(off) < (S.P / DEG) / 2 ? C.drift : C.dead);
    ctx.fillText(`${off >= 0 ? '+' : ''}${off.toFixed(1)}° off seat`, w - 14, 22);
  }

  function drawSpring(ctx, x0, y0, x1, y1, force) {
    const n = 9, len = y1 - y0;
    const amp = 11 + Math.max(0, (force - 8)) * 0.25;
    ctx.strokeStyle = C.spring; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 0; i <= n; i++) {
      const t = i / n; const y = y0 + len * t;
      const x = x0 + (i === 0 || i === n ? 0 : (i % 2 ? amp : -amp));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x1, y1); ctx.stroke();
  }

  // ---- drawing: the energy well ----
  function drawWell() {
    const { ctx, w, h } = fit(well, 560, 190);
    ctx.clearRect(0, 0, w, h);
    const padL = 16, padR = 16, padT = 20, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;

    const seat = nearestSeat(S.phi);
    const span = S.P * 1.15;                 // show one well and both crests
    const toX = (off) => x0 + (off + span) / (2 * span) * (x1 - x0);
    // energy scale
    let umax = energy(S.P / 2) * 1.05 + 1e-6;
    const toY = (u) => y1 - (u / umax) * (y1 - y0 - 6);

    // baseline + crest markers
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    for (const cr of [-S.P / 2, S.P / 2]) {
      const xx = toX(cr);
      ctx.setLineDash([2, 4]); ctx.strokeStyle = C.rule;
      ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = cr < 0 ? 'left' : 'right';
      ctx.fillText('crest', xx + (cr < 0 ? 3 : -3), y0 + 10);
    }

    // the well curve
    ctx.beginPath();
    for (let px = x0; px <= x1; px += 2) {
      const off = (px - x0) / (x1 - x0) * (2 * span) - span;
      const u = energy(off);
      const py = toY(u);
      if (px === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2.4; ctx.strokeStyle = C.steel; ctx.stroke();

    // seat label
    ctx.fillStyle = C.inkFaint; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.fillText('seat', toX(0), y1 + 15);
    ctx.textAlign = 'left'; ctx.fillStyle = C.inkFaint;
    ctx.fillText('energy', x0, y0 + 2);

    // the marble
    const off = S.phi - seat;
    const clamped = Math.max(-span, Math.min(span, off));
    const mx = toX(clamped), my = toY(energy(off));
    const ab = Math.abs(off);
    const col = ab < 1.5 * DEG ? C.keep : (ab < S.P / 2 ? C.drift : C.dead);
    ctx.beginPath(); ctx.arc(mx, my - 7, 7, 0, 2 * Math.PI);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = C.field; ctx.stroke();
  }

  // ---- readouts + verdict ----
  function updateReadout() {
    const off = S.phi - nearestSeat(S.phi);
    const restoring = -dU(S.phi);
    const kappa = seatStiffness();
    const climb = Math.min(100, Math.abs(off) / (S.P / 2) * 100);

    $('r-angle').textContent = `${off >= 0 ? '+' : ''}${(off / DEG).toFixed(1)}°`;
    $('r-torque').textContent = `${Math.abs(restoring).toFixed(0)} N·mm`;
    $('r-force').textContent = `${forceOf(S.phi).toFixed(1)} N`;
    $('r-stiff').textContent = `${(kappa * DEG).toFixed(1)} N·mm/°`;
    const climbEl = $('r-climb');
    climbEl.textContent = `${climb.toFixed(0)}%`;
    climbEl.className = 'v ' + (climb < 10 ? 'good' : climb < 100 ? 'warn' : 'bad');

    // verdict
    const atRest = Math.abs(S.omega) < 0.05;
    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (Math.abs(off) < 1.5 * DEG && atRest && !S.dragging) {
      v.classList.add('v-keep'); vt.textContent = 'Seated — resting at the bottom, no torque'; vs.textContent = 'at rest';
    } else if (Math.abs(off) >= S.P / 2 - 1e-6) {
      v.classList.add('v-dead'); vt.textContent = 'Over the crest — falling to the next seat'; vs.textContent = 'crossed';
    } else if (S.dragging) {
      v.classList.add('v-drift'); vt.textContent = 'Climbing the flank — the spring is pushing back'; vs.textContent = 'held off-seat';
    } else {
      v.classList.add('v-rest'); vt.textContent = 'Returning — swinging back to the bottom'; vs.textContent = 'settling';
    }
  }

  let liveT = 0;
  function announce() {
    const now = performance.now();
    if (now - liveT < 900) return; liveT = now;
    const off = (S.phi - nearestSeat(S.phi)) / DEG;
    if (Math.abs(off) < 1.5 && Math.abs(S.omega) < 0.05)
      live.textContent = `Seated. Seat stiffness ${(seatStiffness() * DEG).toFixed(1)} newton-millimetres per degree.`;
    else
      live.textContent = `${Math.abs(off).toFixed(0)} degrees off the seat, ${off >= 0 ? 'ahead' : 'behind'}.`;
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    dt = Math.min(dt, 0.033);
    if (!S.dragging) {
      if (RM.matches) {
        // reduced motion: show it settled, no oscillation
        S.phi = nearestSeat(S.phi); S.omega = 0;
      } else {
        // J*phi'' = -dU/dphi - c*omega
        const torque = -dU(S.phi) - c * S.omega;
        S.omega += (torque / J) * dt;
        S.phi += S.omega * dt;
        if (Math.abs(S.omega) < 0.02 && Math.abs(S.phi - nearestSeat(S.phi)) < 0.6 * DEG) {
          S.phi = nearestSeat(S.phi); S.omega = 0;
        }
      }
    }
    drawMech(); drawWell(); updateReadout(); announce();
    requestAnimationFrame(frame);
  }

  // ---- controls ----
  function bindRange(id, prop, fmt, after) {
    const el = $(id), out = $(id + '-v');
    if (stored[prop] != null) el.value = stored[prop];
    const sync = () => { S[prop] = parseFloat(el.value); out.textContent = fmt(S[prop]); if (after) after(); save(); };
    el.addEventListener('input', sync); sync();
  }
  bindRange('preload', 'F0', (v) => v.toFixed(1));
  bindRange('depth', 'd', (v) => v.toFixed(1));
  bindRange('pitch', 'Pdeg', (v) => `${(360 / Math.max(4, Math.min(20, Math.round(2 * Math.PI / (v * DEG))))).toFixed(0)}`, snap);
  snap();

  // pointer drag
  function clientToPhi(dx) { return S.dragPhi0 + dx * 0.009; }
  mech.addEventListener('pointerdown', (e) => {
    S.dragging = true; S.omega = 0; S.dragPhi0 = S.phi; S.dragX0 = e.clientX;
    S.lastX = e.clientX; S.lastT = performance.now();
    mech.setPointerCapture(e.pointerId); mech.style.cursor = 'grabbing';
  });
  mech.addEventListener('pointermove', (e) => {
    if (!S.dragging) return;
    S.phi = clientToPhi(e.clientX - S.dragX0);
    const t = performance.now();
    if (t > S.lastT) S.omega = ((e.clientX - S.lastX) * 0.009) / ((t - S.lastT) / 1000);
    S.lastX = e.clientX; S.lastT = t;
  });
  function endDrag(e) {
    if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab';
    try { mech.releasePointerCapture(e.pointerId); } catch (_) {}
    if (RM.matches) { S.phi = nearestSeat(S.phi); S.omega = 0; }
    else S.omega = Math.max(-18, Math.min(18, S.omega));
  }
  mech.addEventListener('pointerup', endDrag);
  mech.addEventListener('pointercancel', endDrag);
  mech.style.cursor = 'grab';
  mech.tabIndex = 0;
  mech.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { S.omega += 2.5; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { S.omega -= 2.5; e.preventDefault(); }
    else if (e.key === ' ') { S.omega += (Math.random() < 0.5 ? -1 : 1) * 9; e.preventDefault(); }
  });

  $('nudge').addEventListener('click', () => { S.omega += 3.2; });
  $('kick').addEventListener('click', () => { S.omega += 11; });
  $('reset').addEventListener('click', () => { S.phi = nearestSeat(S.phi); S.omega = 0; });

  window.addEventListener('resize', () => { drawMech(); drawWell(); });
  requestAnimationFrame(frame);
})();
