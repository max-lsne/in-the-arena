/* Raise — the screw of Archimedes.
   An inclined plane wound round a cylinder, tilted into a reservoir. Hold the casing and turn
   the screw: each coil is a pocket that carries water up one pitch per turn and pours it out
   the top. Flat keeps pockets full but lifts little; steep lifts high but empties them; past
   the spill tilt they run back. The most water comes up at a tilt in the middle.
   No build, no network. State in localStorage; reduced-motion shows it settled, not spinning. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('c'), ctx = canvas.getContext('2d');
  const KEY = 'whorl-raise-v1';
  const DEG = 180 / Math.PI, TAU = Math.PI * 2;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const W = 560, H = 440;
  function fit() {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let C = {};
  function palette() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), ink: g('--ink'),
      inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'), rule: g('--rule'),
      brass: g('--brass'), brass2: g('--brass-2'), brassB: g('--brass-b'),
      steel: g('--steel'), steel2: g('--steel-2'),
      water: g('--water'), water2: g('--water-2'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }

  const state = { tilt: 28, pitch: 42, radius: 40, rpm: 30, spinning: false };
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o) for (const k of ['tilt', 'pitch', 'radius', 'rpm']) if (Number.isFinite(o[k])) state[k] = o[k];
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ tilt: state.tilt, pitch: state.pitch, radius: state.radius, rpm: state.rpm })); } catch (e) {}
  }

  function derive() {
    const th = state.tilt / DEG;
    const p = state.pitch, R = state.radius;
    const k = 0.38;
    const thc = Math.atan(k * (TAU * R) / p);            // spill tilt (geometry)
    const sinc = Math.sin(thc);
    const fill = Math.max(0, Math.min(0.98, 1 - Math.sin(th) / sinc));
    const liftPerTurn = p * Math.sin(th);                  // mm up per turn
    const best = Math.asin(Math.min(1, 0.5 * sinc));       // best tilt
    const diMax = sinc / 4;                                 // max of sinθ(1−sinθ/sinθc)
    const di = diMax > 0 ? Math.max(0, (Math.sin(th) * (1 - Math.sin(th) / sinc)) / diMax) : 0;
    // nominal flow L/min: pocket volume (cm^3) × rpm × fill
    const Rc = R / 10, pc = p / 10;
    const vPocket = 0.25 * Math.PI * Rc * Rc * pc;          // cm^3, one bucket full
    const flow = state.rpm * vPocket * fill / 1000;         // L/min
    return { th, thc, fill, liftPerTurn, best, di: Math.min(1, di), flow, spilling: th >= thc };
  }

  // ---- geometry of the drawn screw ----
  const P0 = { x: 86, y: 388 };     // lower end, in the reservoir
  const L = 330;                     // drawn axis length
  function axis(d) {
    const u = { x: Math.cos(d.th), y: -Math.sin(d.th) };
    const n = { x: Math.sin(d.th), y: Math.cos(d.th) };    // lower-side normal (down)
    const P1 = { x: P0.x + L * u.x, y: P0.y + L * u.y };
    const rDraw = 16 + (state.radius - 20) * 0.42;
    return { u, n, P1, rDraw };
  }

  let phase = 0;   // pocket travel phase along axis (0..1 per pitch)

  function render() {
    const d = derive(), A = axis(d);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.field; ctx.fillRect(0, 0, W, H);

    // sky/ground faint water level line
    const waterY = 360;
    // reservoir (source) bottom-left
    ctx.fillStyle = C.water; ctx.globalAlpha = 0.22;
    ctx.fillRect(0, waterY, 220, H - waterY);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.water2; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(0, waterY); ctx.lineTo(240, waterY); ctx.stroke();
    ctx.setLineDash([]);
    label('reservoir', 14, waterY + 24, C.water2, 11, 'left');

    // vertical lift indicator from water level to spout
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(A.P1.x, waterY); ctx.lineTo(A.P1.x, A.P1.y); ctx.stroke();
    ctx.setLineDash([]);
    const liftPx = waterY - A.P1.y;
    if (liftPx > 20) {
      ctx.save(); ctx.translate(A.P1.x + 10, (waterY + A.P1.y) / 2); ctx.rotate(-Math.PI / 2);
      label('lift', 0, 0, C.inkFaint, 10, 'center'); ctx.restore();
    }

    // the cylinder band
    drawCylinder(A, d);
    // threads + pockets
    drawThreadAndPockets(A, d);
    // spout + pour
    drawSpout(A, d);

    // tilt arc at P0
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(P0.x, P0.y, 34, -d.th, 0); ctx.stroke();
    ctx.strokeStyle = C.rule; ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P0.x + 50, P0.y); ctx.stroke();
    label('θ ' + state.tilt + '°', P0.x + 40, P0.y - 10, C.brass2, 11, 'left', '500');

    // delivery bar (right edge)
    const barX = 540, barY0 = 40, barH = 150;
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.strokeRect(barX - 10, barY0, 10, barH);
    const col = d.spilling ? C.dead : (d.di > 0.82 ? C.keep : C.drift);
    ctx.fillStyle = col; ctx.globalAlpha = 0.85;
    ctx.fillRect(barX - 10, barY0 + barH * (1 - d.di), 10, barH * d.di);
    ctx.globalAlpha = 1;
    label('delivery', barX - 5, barY0 - 6, C.inkFaint, 10, 'center');
    // best-tilt tick on bar is implicit (di=1 at best)
  }

  function drawCylinder(A, d) {
    const { u, n, P1, rDraw } = A;
    ctx.fillStyle = C.brassB; ctx.globalAlpha = 0.33;
    ctx.beginPath();
    poly([
      [P0.x - n.x * rDraw, P0.y - n.y * rDraw],
      [P1.x - n.x * rDraw, P1.y - n.y * rDraw],
      [P1.x + n.x * rDraw, P1.y + n.y * rDraw],
      [P0.x + n.x * rDraw, P0.y + n.y * rDraw],
    ]); ctx.fill(); ctx.globalAlpha = 1;
    // core axis
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P1.x, P1.y); ctx.stroke();
  }

  function drawThreadAndPockets(A, d) {
    const { u, n, rDraw } = A;
    const pitchPx = Math.max(16, (state.pitch / 90) * 64 + 10);
    const nWraps = Math.floor(L / pitchPx) + 2;
    // thread wraps (blades) — short perpendicular ticks across the band
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1.4;
    for (let i = 0; i < nWraps; i++) {
      const s = (i * pitchPx + (phase % 1) * pitchPx);
      if (s > L) continue;
      const cx = P0.x + u.x * s, cy = P0.y + u.y * s;
      ctx.beginPath();
      ctx.moveTo(cx - n.x * rDraw, cy - n.y * rDraw);
      ctx.lineTo(cx + n.x * rDraw, cy + n.y * rDraw);
      ctx.stroke();
    }
    // pockets of water, one per wrap, on the lower side, fill ∝ d.fill
    for (let i = 0; i < nWraps; i++) {
      const s = (i * pitchPx + (phase % 1) * pitchPx) + pitchPx * 0.5;
      if (s > L - 4 || s < 6) continue;
      const cx = P0.x + u.x * s, cy = P0.y + u.y * s;
      // pocket sits on lower side
      const px = cx + n.x * (rDraw * 0.42), py = cy + n.y * (rDraw * 0.42);
      const w = pitchPx * 0.44, hMax = rDraw * 0.9;
      const h = hMax * (d.spilling ? 0.0 : d.fill);
      if (h < 1.2) continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.atan2(u.y, u.x));
      ctx.fillStyle = C.water; ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.ellipse(0, hMax * 0.5 - h * 0.5, w * 0.5, h * 0.5, 0, 0, TAU);
      ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    }
    // if spilling, draw backward trickle near the bottom
    if (d.spilling) {
      label('pockets spill back', P0.x + 70, P0.y - 40, C.dead, 11, 'left', '500');
    }
  }

  function drawSpout(A, d) {
    const { u, n, P1, rDraw } = A;
    // spout lip
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 2;
    const lipx = P1.x + n.x * rDraw * 0.3, lipy = P1.y + n.y * rDraw * 0.3;
    // collecting trough at top right
    const tx = P1.x + 14, ty = P1.y + 6;
    ctx.fillStyle = C.steel; ctx.globalAlpha = 0.9;
    roundRect(tx, ty, 46, 30, 3); ctx.fill(); ctx.globalAlpha = 1;
    // pour stream if delivering
    if (!d.spilling && d.fill > 0.02 && (state.spinning || reduceMotion())) {
      ctx.strokeStyle = C.water; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(P1.x, P1.y + 2);
      ctx.quadraticCurveTo(P1.x + 8, P1.y + 14, tx + 12, ty + 4);
      ctx.stroke(); ctx.globalAlpha = 1;
      // a couple of droplets
      ctx.fillStyle = C.water;
      const t = (phase * 3) % 1;
      for (let j = 0; j < 2; j++) {
        const tt = (t + j * 0.5) % 1;
        const dx = P1.x + (tx + 12 - P1.x) * tt;
        const dy = (P1.y + 2) + (ty + 6 - (P1.y + 2)) * tt + 14 * tt * tt;
        ctx.beginPath(); ctx.arc(dx, dy, 2.2, 0, TAU); ctx.fill();
      }
    }
    label('spout', tx + 23, ty + 46, C.inkFaint, 10, 'center');
  }

  // ---- helpers ----
  function poly(pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(txt, x, y, col, size = 12, align = 'left', weight = '400') {
    ctx.fillStyle = col; ctx.font = `${weight} ${size}px "JetBrains Mono", monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(txt, x, y);
  }

  // ---- readings + verdict ----
  function syncReadings() {
    const d = derive();
    $('r-lift').textContent = d.liftPerTurn.toFixed(0) + ' mm';
    const fe = $('r-fill'); fe.textContent = (d.fill * 100).toFixed(0) + '%';
    fe.className = 'v ' + (d.spilling ? 'bad' : d.fill > 0.5 ? 'good' : 'warn');
    $('r-spill').textContent = (d.thc * DEG).toFixed(0) + '°';
    $('r-best').textContent = (d.best * DEG).toFixed(0) + '°';
    $('r-flow').textContent = d.flow.toFixed(2) + ' L/min';
    const de = $('r-deliv'); de.textContent = (d.di * 100).toFixed(0) + '%';
    de.className = 'v ' + (d.spilling ? 'bad' : d.di > 0.82 ? 'good' : 'warn');

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (d.spilling) { v.classList.add('v-dead'); vt.textContent = 'Too steep — the pockets spill back'; }
    else if (d.di > 0.9) { v.classList.add('v-keep'); vt.textContent = 'Near the best tilt — raising the most'; }
    else if (state.tilt < d.best * DEG) { v.classList.add('v-drift'); vt.textContent = 'Full pockets, but barely lifted'; }
    else { v.classList.add('v-drift'); vt.textContent = 'Lifting high, but the pockets ride low'; }
    vs.textContent = `best ≈ ${(d.best * DEG).toFixed(0)}° · spill ${(d.thc * DEG).toFixed(0)}°`;
  }

  function announce() {
    const d = derive();
    $('sr').textContent =
      `Tilt ${state.tilt} degrees, pitch ${state.pitch} millimetres, radius ${state.radius} millimetres. ` +
      (d.spilling
        ? `Past the spill tilt of ${(d.thc * DEG).toFixed(0)} degrees — the pockets empty backward and nothing is raised.`
        : `Pockets ${(d.fill * 100).toFixed(0)} per cent full, lifting ${d.liftPerTurn.toFixed(0)} millimetres per turn; ` +
          `delivery ${(d.di * 100).toFixed(0)} per cent of the best. Best tilt about ${(d.best * DEG).toFixed(0)} degrees. ` +
          `Raising ${d.flow.toFixed(2)} litres per minute.`);
  }

  // ---- animation ----
  let raf = null;
  function loop(now) {
    if (!state.spinning) { raf = null; return; }
    const dt = 1 / 60;
    const pitchPx = Math.max(16, (state.pitch / 90) * 64 + 10);
    const revPerSec = state.rpm / 60;
    phase += revPerSec * dt;
    render();
    raf = requestAnimationFrame(loop);
  }
  function setSpin(on) {
    if (reduceMotion()) {
      state.spinning = false; $('spin').setAttribute('aria-pressed', 'false');
      $('spin').textContent = 'Spin'; render(); return;
    }
    state.spinning = on;
    $('spin').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('spin').textContent = on ? 'Stop' : 'Spin';
    if (on && !raf) raf = requestAnimationFrame(loop);
    if (!on) render();
  }

  // ---- controls ----
  function wire() {
    const bind = (id, fn, fmt) => {
      const el = $(id), out = $(id + '-v');
      el.addEventListener('input', () => {
        const v = parseFloat(el.value); fn(v); out.textContent = fmt(v);
        save(); if (!state.spinning) render(); syncReadings(); announce();
      });
    };
    bind('tilt', (v) => state.tilt = v, (v) => v + '°');
    bind('pitch', (v) => state.pitch = v, (v) => v + ' mm');
    bind('radius', (v) => state.radius = v, (v) => v + ' mm');
    bind('rpm', (v) => state.rpm = v, (v) => v + ' rpm');

    $('spin').addEventListener('click', () => setSpin(!state.spinning));
    $('best').addEventListener('click', () => {
      const d = derive(); state.tilt = Math.round(d.best * DEG);
      reflect(); save(); render(); syncReadings(); announce();
    });
    $('reset').addEventListener('click', () => {
      state.tilt = 28; state.pitch = 42; state.radius = 40; state.rpm = 30;
      reflect(); save(); render(); syncReadings(); announce();
    });
  }
  function reflect() {
    $('tilt').value = state.tilt; $('tilt-v').textContent = state.tilt + '°';
    $('pitch').value = state.pitch; $('pitch-v').textContent = state.pitch + ' mm';
    $('radius').value = state.radius; $('radius-v').textContent = state.radius + ' mm';
    $('rpm').value = state.rpm; $('rpm-v').textContent = state.rpm + ' rpm';
  }

  function boot() {
    fit(); palette(); load(); reflect(); render(); syncReadings(); announce(); wire();
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { palette(); render(); });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fit(); render(); }, 120); });
  boot();
})();
