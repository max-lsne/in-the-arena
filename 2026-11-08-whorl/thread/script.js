/* Thread — the screw as fastener.
   A bolt is an inclined plane wound round a post. Above, the thread is drawn wound onto the
   shaft, driving into a clamp; below, the same thread is unwound into its triangle, with the
   nut riding the slope and friction drawn as a cone about the surface normal. It holds —
   self-locks — exactly when the lead angle sits inside the friction angle: lambda < phi.
   No build, no network. State in localStorage; reduced-motion settles it at once. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('c'), ctx = canvas.getContext('2d');
  const KEY = 'whorl-thread-v1';
  const TAU = Math.PI * 2, DEG = 180 / Math.PI;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- logical canvas size + DPR crispness ----
  const W = 560, H = 440;
  function fit() {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- palette from CSS (re-read on theme change) ----
  let C = {};
  function palette() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), ink: g('--ink'),
      inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'), rule: g('--rule'),
      brass: g('--brass'), brass2: g('--brass-2'), brassB: g('--brass-b'),
      steel: g('--steel'), steel2: g('--steel-2'), steelB: g('--steel-b'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }

  // ---- state ----
  const state = { pitch: 1.5, radius: 5, mu: 0.15, torque: 8, seat: 0, phase: 'rest' };
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o && typeof o === 'object') {
        for (const k of ['pitch', 'radius', 'mu', 'torque']) if (Number.isFinite(o[k])) state[k] = o[k];
      }
    } catch (e) { /* ignore */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ pitch: state.pitch, radius: state.radius, mu: state.mu, torque: state.torque })); } catch (e) {}
  }

  // ---- physics ----
  function derive() {
    const p = state.pitch, r = state.radius, mu = state.mu;
    const lead = Math.atan(p / (TAU * r));           // lead angle, rad
    const fric = Math.atan(mu);                        // friction angle, rad
    const locking = lead < fric;
    const ma = (TAU * r) / p;                           // ideal mechanical advantage
    // clamp force for the chosen torque T (N·m), r in metres: F = T / (r·tan(λ+φ))
    const rM = r / 1000;
    const clamp = state.torque / (rM * Math.tan(lead + fric)); // N
    // square-thread raising efficiency
    const eff = Math.tan(lead) * (1 - mu * Math.tan(lead)) / (Math.tan(lead) + mu);
    return { lead, fric, locking, ma, clamp, eff, margin: fric - lead };
  }

  // ---- drawing helpers ----
  function arrow(x1, y1, x2, y2, col, wd, head = 9) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  }
  function label(txt, x, y, col, size = 12, align = 'left', weight = '400') {
    ctx.fillStyle = col; ctx.font = `${weight} ${size}px "JetBrains Mono", monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, x, y);
  }

  // ---- the wound bolt, driving into a clamp (top band) ----
  function drawBolt(d) {
    const topY = 40, shaftH = 26, cy = topY + shaftH / 2;
    const clampX = 420;                                  // face of the clamped plates
    const travel = 54;                                    // max axial advance drawn
    const adv = d_seat() * travel;
    const headX = 70 + adv, shaftX0 = headX, shaftX1 = clampX; // shaft from head to clamp face

    // band label
    label('THE THREAD, WOUND', 24, 26, C.inkFaint, 11, 'left', '500');

    // clamped plates (fixed, steel) at right
    ctx.fillStyle = C.steel; ctx.globalAlpha = 0.9;
    roundRect(clampX, cy - 46, 70, 92, 5); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(clampX + 23, cy - 46); ctx.lineTo(clampX + 23, cy + 46); ctx.stroke();
    label('nut + work', clampX + 35, cy + 64, C.inkFaint, 10, 'center');

    // bolt head (hex) at left
    ctx.fillStyle = C.brass;
    roundRect(headX - 34, cy - 22, 34, 44, 4); ctx.fill();
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1;
    roundRect(headX - 34, cy - 22, 34, 44, 4); ctx.stroke();

    // shaft core
    ctx.fillStyle = C.brassB;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(shaftX0, cy - shaftH / 2, shaftX1 - shaftX0 + 4, shaftH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1.2;
    ctx.strokeRect(shaftX0, cy - shaftH / 2, shaftX1 - shaftX0 + 4, shaftH);

    // thread lines — slant set by the lead angle; phase animates rotation
    const n = 11;
    const slant = Math.tan(d.lead) * 22 * 6;             // visual slant exaggeration
    const span = shaftX1 - shaftX0;
    const step = span / n;
    const ph = (rotPhase % 1) * step;
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1.3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(shaftX0, cy - shaftH / 2, span + 4, shaftH);
    ctx.clip();
    for (let i = -1; i <= n + 1; i++) {
      const x = shaftX0 + i * step + ph;
      ctx.beginPath();
      ctx.moveTo(x, cy + shaftH / 2);
      ctx.lineTo(x + Math.min(slant, step * 0.9), cy - shaftH / 2);
      ctx.stroke();
    }
    ctx.restore();

    // clamp-force bar (right edge)
    const barX = 540, barY0 = topY - 4, barH = shaftH + 48;
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.strokeRect(barX - 10, barY0, 10, barH);
    const frac = d_seat();
    const fillCol = d.locking ? C.keep : (d.margin > -0.02 ? C.drift : C.dead);
    ctx.fillStyle = fillCol; ctx.globalAlpha = 0.85;
    ctx.fillRect(barX - 10, barY0 + barH * (1 - frac), 10, barH * frac);
    ctx.globalAlpha = 1;
    label('clamp', barX - 5, barY0 - 6, C.inkFaint, 10, 'center');

    // advance tick caption
    const turns = (d_seat() * travel) / Math.max(6, state.pitch * 6);
  }

  // seat value, possibly mid-animation
  let animSeat = 0, rotPhase = 0;
  function d_seat() { return animSeat; }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- the unwound triangle + block + friction cone (bottom) ----
  function drawRamp(d) {
    const baseY = 404, Ax = 62, baseLen = 436;
    // rise exaggerated for legibility but proportional to tan(lead)
    const riseVis = Math.min(150, Math.tan(d.lead) * baseLen * 4.2);
    const Bx = Ax + baseLen, Cy = baseY - riseVis;
    const lead = Math.atan2(riseVis, baseLen); // the drawn slope angle (visual)
    const trueLead = d.lead;

    label('THE THREAD, UNWOUND — one coil, flattened', 24, baseY - 170, C.inkFaint, 11, 'left', '500');

    // ground
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Ax - 10, baseY); ctx.lineTo(Bx + 30, baseY); ctx.stroke();

    // triangle (ramp solid)
    ctx.fillStyle = C.field2;
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Ax, baseY); ctx.lineTo(Bx, baseY); ctx.lineTo(Bx, Cy); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // base + rise captions
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.steel2;
    ctx.beginPath(); ctx.moveTo(Bx, baseY); ctx.lineTo(Bx, Cy); ctx.stroke();
    ctx.setLineDash([]);
    label('base = 2πr — one turn round', Ax + 4, baseY + 18, C.inkFaint, 10, 'left');
    ctx.save(); ctx.translate(Bx + 14, (baseY + Cy) / 2); ctx.rotate(-Math.PI / 2);
    label('rise = pitch', 0, 0, C.inkFaint, 10, 'center'); ctx.restore();

    // lead-angle arc at A
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(Ax, baseY, 36, -lead, 0); ctx.stroke();
    label('λ ' + (trueLead * DEG).toFixed(1) + '°', Ax + 44, baseY - 8, C.brass2, 11, 'left', '500');

    // block riding the slope
    const t = 0.32 + 0.30 * animSeat;                      // position along hypotenuse
    const bx = Ax + (Bx - Ax) * t, by = baseY - riseVis * t;
    const u = { x: Math.cos(lead), y: -Math.sin(lead) };    // up-slope
    const dn = { x: Math.sin(lead), y: Math.cos(lead) };    // into-surface normal (down-right)
    const bw = 30, bh = 20;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-lead);
    ctx.fillStyle = C.brass; ctx.globalAlpha = 0.92;
    roundRect(-bw / 2, -bh, bw, bh, 3); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = C.brass2; ctx.lineWidth = 1;
    roundRect(-bw / 2, -bh, bw, bh, 3); ctx.stroke();
    ctx.restore();

    // contact point under block centre
    const cxp = bx, cyp = by;

    // friction cone about the into-surface normal, half-angle phi
    const phi = d.fric;
    const L = 88;
    const baseAng = Math.atan2(dn.y, dn.x);
    const e1 = baseAng - phi, e2 = baseAng + phi;
    ctx.fillStyle = C.steel; ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.moveTo(cxp, cyp);
    ctx.arc(cxp, cyp, L, e1, e2);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + L * Math.cos(e1), cyp + L * Math.sin(e1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + L * Math.cos(e2), cyp + L * Math.sin(e2)); ctx.stroke();
    // normal centre line
    ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + (L + 6) * dn.x, cyp + (L + 6) * dn.y); ctx.stroke();
    ctx.setLineDash([]);
    label('friction cone ±φ ' + (phi * DEG).toFixed(1) + '°', cxp + (L + 10) * dn.x, cyp + (L + 10) * dn.y + 4, C.steel2, 10, 'left');

    // weight vector straight down — inside cone => holds
    const inside = trueLead < phi;
    const wcol = inside ? C.keep : C.dead;
    const wlen = Math.min(56, baseY - cyp - 8);
    arrow(cxp, cyp, cxp, cyp + wlen, wcol, 2.4, 10);
    label('weight', cxp - 10, cyp + wlen * 0.6, wcol, 10, 'right');

    // verdict glyph near block
    label(inside ? 'holds' : 'slides', bx, by - 26, wcol, 12, 'center', '500');
  }

  // ---- compose ----
  function render() {
    const d = derive();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.field; ctx.fillRect(0, 0, W, H);
    // divider between bands
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, 150); ctx.lineTo(W - 20, 150); ctx.stroke();
    drawBolt(d);
    drawRamp(d);
  }

  // ---- readings + verdict ----
  function syncReadings() {
    const d = derive();
    $('r-lead').textContent = (d.lead * DEG).toFixed(1) + '°';
    $('r-fric').textContent = (d.fric * DEG).toFixed(1) + '°';
    $('r-ma').textContent = d.ma.toFixed(1) + '×';
    $('r-clamp').textContent = fmtForce(d.clamp);
    $('r-eff').textContent = (d.eff * 100).toFixed(0) + '%';
    const lock = $('r-lock');
    lock.textContent = d.locking ? 'yes — holds' : 'no — backs out';
    lock.className = 'v ' + (d.locking ? 'good' : 'bad');

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (d.locking && d.margin > 0.035) {
      v.classList.add('v-keep'); vt.textContent = 'Holds — self-locking';
    } else if (d.locking) {
      v.classList.add('v-drift'); vt.textContent = 'Holds, but near the line';
    } else {
      v.classList.add('v-dead'); vt.textContent = 'Backs out under its own clamp';
    }
    vs.textContent = `λ ${(d.lead * DEG).toFixed(1)}° vs φ ${(d.fric * DEG).toFixed(1)}°`;
  }
  function fmtForce(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + ' kN';
    return Math.round(n) + ' N';
  }

  function announce() {
    const d = derive();
    const locktxt = d.locking
      ? `self-locking with ${(d.margin * DEG).toFixed(1)} degrees of margin — it holds`
      : `not self-locking — it backs out under load`;
    $('sr').textContent =
      `Pitch ${state.pitch.toFixed(1)} millimetres, radius ${state.radius} millimetres, friction ${state.mu.toFixed(2)}. ` +
      `Lead angle ${(d.lead * DEG).toFixed(1)} degrees, friction angle ${(d.fric * DEG).toFixed(1)} degrees. ${locktxt}. ` +
      `Ideal advantage ${d.ma.toFixed(0)} times; clamp force ${fmtForce(d.clamp)}.`;
  }

  // ---- animation ----
  let raf = null, anim = null;
  function startAnim(kind) {
    const d = derive();
    if (reduceMotion()) {
      if (kind === 'turn') animSeat = 1;
      else if (kind === 'letgo') animSeat = d.locking ? 1 : 0;
      state.phase = kind === 'letgo' && !d.locking ? 'loose' : 'seated';
      rotPhase = 0; render(); syncReadings(); return;
    }
    const from = animSeat;
    let to = from, dir = 1;
    if (kind === 'turn') { to = 1; }
    else if (kind === 'letgo') { to = d.locking ? from : 0; dir = -1; }
    if (to === from) { flash(kind, d); return; }
    const t0 = performance.now(), dur = 900 * Math.abs(to - from) + 250;
    cancelAnimationFrame(raf);
    const loop = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      animSeat = from + (to - from) * e;
      rotPhase += dir * 0.06 * (1 - k * 0.3);
      render();
      if (k < 1) { raf = requestAnimationFrame(loop); }
      else { state.phase = (kind === 'letgo' && to === 0) ? 'loose' : 'seated'; }
    };
    raf = requestAnimationFrame(loop);
  }
  function flash(kind, d) {
    // self-locking "let go" — it simply holds; a gentle nudge of the thread lines
    if (kind === 'letgo') {
      const t0 = performance.now();
      cancelAnimationFrame(raf);
      const loop = (now) => {
        const k = Math.min(1, (now - t0) / 500);
        rotPhase = Math.sin(k * Math.PI) * 0.05;
        render();
        if (k < 1) raf = requestAnimationFrame(loop); else { rotPhase = 0; render(); }
      };
      raf = requestAnimationFrame(loop);
    }
  }

  // ---- controls ----
  const muWord = (mu) => mu <= 0.08 ? 'greased' : mu <= 0.14 ? 'oiled' : mu <= 0.22 ? 'dry' : 'rough';
  function wire() {
    const bind = (id, fn, fmt) => {
      const el = $(id), out = $(id + '-v');
      const upd = () => {
        const val = parseFloat(el.value); fn(val);
        out.textContent = fmt(val);
        save(); render(); syncReadings(); announce();
      };
      el.addEventListener('input', upd);
    };
    bind('pitch', (v) => state.pitch = v, (v) => v.toFixed(1) + ' mm');
    bind('radius', (v) => state.radius = v, (v) => v + ' mm');
    bind('mu', (v) => state.mu = v, (v) => v.toFixed(2) + ' · ' + muWord(v));
    bind('torque', (v) => state.torque = v, (v) => v.toFixed(1).replace(/\.0$/, '') + ' N·m');

    $('turn').addEventListener('click', () => { startAnim('turn'); setTimeout(() => { syncReadings(); announce(); }, 50); });
    $('letgo').addEventListener('click', () => { startAnim('letgo'); setTimeout(() => { syncReadings(); announce(); }, 50); });
    $('reset').addEventListener('click', () => {
      state.pitch = 1.5; state.radius = 5; state.mu = 0.15; state.torque = 8; animSeat = 0; rotPhase = 0;
      reflect(); save(); render(); syncReadings(); announce();
    });
  }
  function reflect() {
    $('pitch').value = state.pitch; $('pitch-v').textContent = state.pitch.toFixed(1) + ' mm';
    $('radius').value = state.radius; $('radius-v').textContent = state.radius + ' mm';
    $('mu').value = state.mu; $('mu-v').textContent = state.mu.toFixed(2) + ' · ' + muWord(state.mu);
    $('torque').value = state.torque; $('torque-v').textContent = state.torque.toFixed(1).replace(/\.0$/, '') + ' N·m';
  }

  // ---- boot ----
  function boot() {
    fit(); palette(); load(); reflect();
    animSeat = 0; render(); syncReadings(); announce(); wire();
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { palette(); render(); });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fit(); render(); }, 120); });
  boot();
})();
