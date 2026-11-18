/* Stroke — a swashplate as a rotation-to-reciprocation converter.
 *
 * A disc is fixed to a shaft but tilted off square by the tilt angle alpha. Build it as
 *     P(u) = Rz(theta) . Rx(alpha) . (Rp cos u, Rp sin u, 0)
 * so the plate's normal is n = (sin a sin th, -sin a cos th, cos a). A follower rides the
 * plate's face at world point (r, 0, z); barred from turning, it only slides along the shaft.
 * The plate plane through the origin forces n.(r,0,z)=0, so
 *     z = -(n_x / n_z) r = -r tan(alpha) sin(theta)
 * a PURE sine: amplitude r tan a, stroke 2 r tan a, with no second-harmonic bulge, because
 * (unlike a slider-crank) there is no finite rod to foreshorten the travel. The drawn plate rim
 * and the drawn follower contact are taken straight from the same transform, so the picture and
 * the number z = r tan a sin th are one mechanism. The faint ghost curve is the lopsided sine a
 * short-rodded crank would draw for the same stroke: sin th + (lambda/2) sin 2th, lambda=r/L.
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;
  const S = {
    alpha: 22 * DEG,     // plate tilt
    r: 1.0,              // follower stand-off radius (plate units)
    rpm: 24,
    theta: 28 * DEG,     // open on a lively mid-stroke-ish angle
    running: true,
    dragging: false, dragA0: 0, lastT: 0, dragW: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'swash-stroke';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ alpha: S.alpha, r: S.r, rpm: S.rpm })); } catch (_) {} };
  const stored = load();
  if (typeof stored.alpha === 'number') S.alpha = stored.alpha;
  if (typeof stored.r === 'number') S.r = stored.r;
  if (typeof stored.rpm === 'number') S.rpm = stored.rpm;

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      brass: g('--brass'), brass2: g('--brass-2'), brassB: g('--brass-b'),
      steel: g('--steel'), steel2: g('--steel-2'), steelB: g('--steel-b'),
      copper: g('--spring'), copper2: g('--spring-2'),
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

  // ---- geometry helpers ----
  const amp = () => S.r * Math.tan(S.alpha);          // sine amplitude, plate units
  const zOf = (th) => amp() * Math.sin(th);           // follower displacement (+ up)
  const velOf = (th) => amp() * Math.cos(th);         // d z / d theta  (speed per unit omega)

  // oblique projection of a 3D point (x right, y depth, z up) to screen
  function makeProj(cx, cy, sc) {
    return (x, y, z) => ({ x: cx + x * sc - y * 0.42 * sc, y: cy - z * sc - y * 0.17 * sc });
  }

  // plate point at plate-azimuth u, with current theta/alpha, radius Rp
  function platePoint(u, Rp) {
    const ca = Math.cos(S.alpha), sa = Math.sin(S.alpha);
    const ct = Math.cos(S.theta), st = Math.sin(S.theta);
    // Rx(alpha) . (Rp cos u, Rp sin u, 0)
    const x1 = Rp * Math.cos(u);
    const y1 = Rp * Math.sin(u) * ca;
    const z1 = Rp * Math.sin(u) * sa;
    // Rz(theta)
    return { x: x1 * ct - y1 * st, y: x1 * st + y1 * ct, z: z1 };
  }

  // ---- the mechanism view ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.44, cy = h * 0.52;
    const sc = Math.min(w, h) * 0.30;
    const proj = makeProj(cx, cy, sc);
    const Rp = 1.0;                 // plate radius in plate units
    const rr = Math.max(0.42, Math.min(1.0, S.r)); // follower radius drawn (clamped to plate)

    // shaft axis (vertical)
    const top = proj(0, 0, 1.55), bot = proj(0, 0, -1.55);
    ctx.strokeStyle = C.steel; ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
    // square reference plane (faint ellipse where plate would sit if flat)
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const u = i / 48 * Math.PI * 2;
      const p = proj(Rp * Math.cos(u), Rp * Math.sin(u), 0);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // the tilted plate: filled rim polygon
    const rim = [];
    for (let i = 0; i <= 64; i++) rim.push(platePoint(i / 64 * Math.PI * 2, Rp));
    const pr = rim.map(p => proj(p.x, p.y, p.z));
    ctx.beginPath();
    pr.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    const grad = ctx.createLinearGradient(cx - sc, cy - sc, cx + sc, cy + sc);
    grad.addColorStop(0, withA(C.brassB, 0.42));
    grad.addColorStop(1, withA(C.brass, 0.30));
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = C.brass; ctx.lineWidth = 2; ctx.stroke();

    // hub
    const hub = proj(0, 0, 0);
    ctx.fillStyle = C.brass2; ctx.beginPath(); ctx.arc(hub.x, hub.y, 5, 0, 7); ctx.fill();

    // follower: vertical rod on +x side at radius rr, tip on plate
    const zc = S.r * Math.tan(S.alpha) * Math.sin(S.theta); // true contact height for drawn radius uses S.r; draw at rr
    const zDraw = rr * Math.tan(S.alpha) * Math.sin(S.theta);
    const tip = proj(rr, 0, zDraw);
    const rodTop = proj(rr, 0, 1.75);
    // guide slot
    const gTop = proj(rr, 0, 1.95), gBot = proj(rr, 0, -0.35);
    ctx.strokeStyle = C.rule; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gTop.x, gTop.y); ctx.lineTo(gBot.x, gBot.y); ctx.stroke();
    // rod
    const spd = Math.abs(Math.cos(S.theta));
    const atDead = spd < 0.12;
    ctx.strokeStyle = atDead ? C.dead : (spd > 0.86 ? C.keep : C.copper);
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rodTop.x, rodTop.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    // shoe at contact
    ctx.fillStyle = C.copper2; ctx.beginPath(); ctx.arc(tip.x, tip.y, 4.5, 0, 7); ctx.fill();
    ctx.lineCap = 'butt';

    // travel gauge on the right
    const gx = w - 40, g0 = cy, gH = sc * 1.05;
    const A = Math.tan(S.alpha) * S.r;                 // amplitude, plate units (use S.r)
    const Amax = Math.tan(45 * DEG) * 1.3;             // gauge full scale
    const scaleG = gH / (Amax || 1);
    ctx.strokeStyle = C.rule; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx, g0 - A * scaleG); ctx.lineTo(gx, g0 + A * scaleG); ctx.stroke();
    // end ticks
    [-A, A].forEach(v => {
      ctx.strokeStyle = C.drift; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx - 6, g0 - v * scaleG); ctx.lineTo(gx + 6, g0 - v * scaleG); ctx.stroke();
    });
    // current marker
    const my = g0 - (A * Math.sin(S.theta)) * scaleG;
    ctx.fillStyle = atDead ? C.dead : (spd > 0.86 ? C.keep : C.copper);
    ctx.beginPath(); ctx.arc(gx, my, 5, 0, 7); ctx.fill();
    label(ctx, 'stroke', gx, g0 + A * scaleG + 16, C.inkFaint, 'center');

    // tilt arc indicator near hub
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 1.4;
    const aC = proj(0, 0, 0);
    ctx.beginPath(); ctx.arc(aC.x, aC.y, 20, -Math.PI / 2, -Math.PI / 2 + S.alpha); ctx.stroke();
    label(ctx, 'α ' + Math.round(S.alpha / DEG) + '°', aC.x + 6, aC.y - 26, C.steel2, 'left');
  }

  function withA(hex, a) {
    const c = hex.replace('#', '');
    if (c.length < 6) return hex;
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function label(ctx, t, x, y, col, align) {
    ctx.fillStyle = col; ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---- the trace: z vs theta ----
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 40, padR = 16, padT = 16, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const midY = (y0 + y1) / 2;
    const A = Math.tan(S.alpha) * S.r;
    const Afull = Math.tan(45 * DEG) * 1.3;
    const yScale = (y1 - y0) / 2 / (Afull || 1);

    // axes
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    // quarter gridlines
    ctx.strokeStyle = withA(C.rule, 0.7); ctx.setLineDash([2, 4]);
    for (let q = 1; q < 4; q++) {
      const gx = x0 + (x1 - x0) * q / 4;
      ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke();
    }
    ctx.setLineDash([]);
    ['0°', '90°', '180°', '270°', '360°'].forEach((t, i) => label(ctx, t, x0 + (x1 - x0) * i / 4, y1 + 13, C.inkFaint, 'center'));

    const X = (th) => x0 + (x1 - x0) * (th % (2 * Math.PI)) / (2 * Math.PI);
    const Y = (z) => midY - z * yScale;

    // ghost: crank-bent sine for same stroke (lambda = 0.4)
    const lam = 0.40;
    ctx.strokeStyle = withA(C.inkFaint, 0.55); ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const th = i / 160 * 2 * Math.PI;
      const zc = A * (Math.sin(th) + lam / 2 * Math.sin(2 * th));
      const px = x0 + (x1 - x0) * i / 160, py = Y(zc);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // the clean swash sine
    ctx.strokeStyle = C.brass; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const th = i / 200 * 2 * Math.PI;
      const px = x0 + (x1 - x0) * i / 200, py = Y(A * Math.sin(th));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();

    // current point
    const th = ((S.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const cxp = x0 + (x1 - x0) * th / (2 * Math.PI), cyp = Y(A * Math.sin(th));
    const spd = Math.abs(Math.cos(th));
    ctx.fillStyle = spd < 0.12 ? C.dead : (spd > 0.86 ? C.keep : C.copper);
    ctx.beginPath(); ctx.arc(cxp, cyp, 4.5, 0, 7); ctx.fill();

    label(ctx, 'z', x0 - 6, y0 + 6, C.brass2, 'right');
    label(ctx, 'crank', x1 - 4, y0 + 6, C.inkFaint, 'right');
  }

  // ---- readouts & verdict ----
  function updateReading() {
    const th = ((S.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const A = amp();
    const z = A * Math.sin(th), v = A * Math.cos(th);
    $('r-theta').textContent = Math.round(th / DEG) + '°';
    $('r-z').textContent = (z >= 0 ? '+' : '') + z.toFixed(2) + ' r';
    $('r-stroke').textContent = (2 * A).toFixed(2) + ' r';
    $('r-vel').textContent = (v >= 0 ? '+' : '') + v.toFixed(2) + ' r';

    const spd = Math.abs(Math.cos(th));
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-mid', 'v-turn', 'v-dead', 'v-rest');
    let msg;
    if (S.alpha < 1.5 * DEG) { vEl.classList.add('v-rest'); msg = 'Plate flat — the follower stands still'; }
    else if (spd < 0.12) { vEl.classList.add('v-dead'); vt.textContent = 'Dead end — the follower turns around'; msg = 'at a dead end, follower still'; }
    else if (spd > 0.86) { vEl.classList.add('v-mid'); vt.textContent = 'Crossing the middle — the slant biting hardest'; msg = 'mid-stroke, moving fastest'; }
    else { vEl.classList.add('v-turn'); vt.textContent = (Math.cos(th) * Math.sin(th) >= 0 ? 'On the rise — easing toward the top' : 'On the fall — easing toward the bottom'); msg = 'between middle and end'; }
    if (S.alpha >= 1.5 * DEG) {} else vt.textContent = 'Plate flat — the follower stands still';
    vs.textContent = S.running && !S.dragging ? 'turning' : (S.dragging ? 'by hand' : 'held');

    if (live && (!S.running || S.dragging)) {
      live.textContent = `Tilt ${Math.round(S.alpha / DEG)} degrees, radius ${S.r.toFixed(1)}. Turn ${Math.round(th / DEG)} degrees. Follower at ${z.toFixed(2)} radii, ${msg}. Full stroke ${(2 * A).toFixed(2)} radii.`;
    }
  }

  function fillSlider(el, v, min, max) {
    const pct = (v - min) / (max - min) * 100;
    el.style.setProperty('--fill', pct + '%');
  }

  function draw() { drawMech(); drawTrace(); updateReading(); }

  // ---- animation ----
  function tick(t) {
    if (!S.lastT) S.lastT = t;
    const dt = Math.min(0.05, (t - S.lastT) / 1000); S.lastT = t;
    if (S.running && !S.dragging && !RM.matches) {
      S.theta = (S.theta + S.rpm / 60 * 2 * Math.PI * dt) % (2 * Math.PI);
      draw();
    }
    requestAnimationFrame(tick);
  }

  // ---- controls ----
  const tiltEl = $('tilt'), radEl = $('radius'), rpmEl = $('rpm');
  tiltEl.value = Math.round(S.alpha / DEG);
  radEl.value = Math.round(S.r * 100);
  rpmEl.value = S.rpm;
  function syncLabels() {
    $('tilt-v').textContent = Math.round(S.alpha / DEG);
    $('radius-v').textContent = S.r.toFixed(1);
    $('rpm-v').textContent = S.rpm;
    fillSlider(tiltEl, +tiltEl.value, 0, 45);
    fillSlider(radEl, +radEl.value, 40, 130);
    fillSlider(rpmEl, +rpmEl.value, 0, 80);
  }
  tiltEl.addEventListener('input', () => { S.alpha = +tiltEl.value * DEG; syncLabels(); save(); draw(); });
  radEl.addEventListener('input', () => { S.r = +radEl.value / 100; syncLabels(); save(); draw(); });
  rpmEl.addEventListener('input', () => { S.rpm = +rpmEl.value; syncLabels(); save(); if (!S.running) draw(); });

  const runBtn = $('run');
  function setRun(on) {
    S.running = on; runBtn.setAttribute('aria-pressed', String(on));
    runBtn.textContent = on ? 'Pause' : 'Run';
    if (on) { S.lastT = 0; }
    updateReading();
  }
  runBtn.addEventListener('click', () => setRun(!S.running));
  $('tomid').addEventListener('click', () => { setRun(false); S.theta = Math.cos(S.theta) >= 0 ? 0 : Math.PI; draw(); announce(); });
  $('todead').addEventListener('click', () => { setRun(false); S.theta = Math.sin(S.theta) >= 0 ? Math.PI / 2 : 3 * Math.PI / 2; draw(); announce(); });
  function announce() { if (live) { const z = amp() * Math.sin(S.theta); live.textContent = `Turn ${Math.round(((S.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / DEG)} degrees, follower ${z.toFixed(2)} radii.`; } }

  // ---- drag to turn ----
  function angleAt(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.44, cy = rect.top + rect.height * 0.52;
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
    return Math.atan2(-py, px);
  }
  function startDrag(e) { S.dragging = true; S.dragA0 = angleAt(e) - S.theta; mech.style.cursor = 'grabbing'; updateReading(); e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; S.theta = ((angleAt(e) - S.dragA0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); draw(); e.preventDefault(); }
  function endDrag() { if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab'; updateReading(); }
  mech.style.cursor = 'grab';
  mech.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  mech.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  // ---- keyboard ----
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setRun(!S.running); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setRun(false); S.theta = (S.theta - 3 * DEG + 2 * Math.PI) % (2 * Math.PI); draw(); announce(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setRun(false); S.theta = (S.theta + 3 * DEG) % (2 * Math.PI); draw(); announce(); }
  });

  // ---- reduced motion ----
  if (RM.matches) { S.running = false; runBtn.setAttribute('aria-pressed', 'false'); runBtn.textContent = 'Run'; S.theta = 35 * DEG; }
  RM.addEventListener && RM.addEventListener('change', (e) => { if (e.matches) setRun(false); });

  window.addEventListener('resize', draw);
  syncLabels(); draw();
  requestAnimationFrame(tick);
})();
