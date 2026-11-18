/* Ring — a ring of N followers on one swashplate, and the flow their strokes sum to.
 *
 * Follower k rides the same tilted plate at radius r but azimuth psi_k = 2*pi*k/N, so
 *     z_k(theta) = r*tan(alpha)*sin(theta - psi_k),   velocity ∝ cos(theta - psi_k).
 * On a pump the followers with outward velocity are on the discharge port; their flows add:
 *     Q(theta) = Σ_k max(0, cos(theta - psi_k)).
 * This rectified-cosine sum is nearly flat (mean N/pi) but carries a ripple from the hand-offs
 * where one follower's velocity crosses zero. For EVEN N the followers come in opposing pairs and
 * the hand-offs coincide — ripple at N per turn, deep; for ODD N they interleave and partly fill
 * one another — ripple at 2N per turn, shallow. The plate rim and every rod are drawn from the same
 * transform used in `stroke`, and the measured ripple is read straight off a fine sampling of Q, so
 * the picture, the number, and the rule odd-beats-even are one mechanism.
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;
  const S = {
    N: 7,
    alpha: 20 * DEG,
    r: 0.9,
    rpm: 22,
    theta: 18 * DEG,
    running: true,
    dragging: false, dragA0: 0, lastT: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'swash-ring';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ N: S.N, alpha: S.alpha, rpm: S.rpm })); } catch (_) {} };
  const stored = load();
  if (typeof stored.N === 'number') S.N = stored.N;
  if (typeof stored.alpha === 'number') S.alpha = stored.alpha;
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

  function fit(canvas, baseW, baseH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth || baseW;
    const h = w * baseH / baseW;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  const mech = $('mech'), trace = $('trace');

  function makeProj(cx, cy, sc) {
    return (x, y, z) => ({ x: cx + x * sc - y * 0.42 * sc, y: cy - z * sc - y * 0.17 * sc });
  }
  function platePoint(u, Rp) {
    const ca = Math.cos(S.alpha), sa = Math.sin(S.alpha);
    const ct = Math.cos(S.theta), st = Math.sin(S.theta);
    const x1 = Rp * Math.cos(u), y1 = Rp * Math.sin(u) * ca, z1 = Rp * Math.sin(u) * sa;
    return { x: x1 * ct - y1 * st, y: x1 * st + y1 * ct, z: z1 };
  }
  const psi = (k) => 2 * Math.PI * k / S.N;
  const zK = (k, th) => S.r * Math.tan(S.alpha) * Math.sin((th == null ? S.theta : th) - psi(k));
  const velK = (k, th) => Math.cos((th == null ? S.theta : th) - psi(k));

  // ---- delivery statistics (shape of Σ max(0,cos)) ----
  let stat = { mean: 0, ripple: 0, meanFlow: 0 };
  function computeStat() {
    const M = 1440; let mn = Infinity, mx = -Infinity, sum = 0;
    for (let i = 0; i < M; i++) {
      const th = i / M * 2 * Math.PI; let q = 0;
      for (let k = 0; k < S.N; k++) { const c = Math.cos(th - psi(k)); if (c > 0) q += c; }
      sum += q; if (q < mn) mn = q; if (q > mx) mx = q;
    }
    const mean = sum / M;
    stat.mean = mean;
    stat.ripple = mean > 1e-6 ? (mx - mn) / mean : 0;
    stat.meanFlow = (S.N / Math.PI) * S.r * Math.tan(S.alpha);
  }

  // ---- mechanism view ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.46, cy = h * 0.5, sc = Math.min(w, h) * 0.30;
    const proj = makeProj(cx, cy, sc);
    const Rp = 1.0, rr = 0.82;

    // shaft
    const top = proj(0, 0, 1.5), bot = proj(0, 0, -1.4);
    ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();

    // plate rim (filled)
    const rim = [];
    for (let i = 0; i <= 64; i++) rim.push(platePoint(i / 64 * Math.PI * 2, Rp));
    const pr = rim.map(p => proj(p.x, p.y, p.z));
    ctx.beginPath(); pr.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    const grad = ctx.createLinearGradient(cx - sc, cy - sc, cx + sc, cy + sc);
    grad.addColorStop(0, withA(C.brassB, 0.40)); grad.addColorStop(1, withA(C.brass, 0.28));
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = C.brass; ctx.lineWidth = 2; ctx.stroke();

    // followers — draw back-to-front by depth so overlap reads
    const items = [];
    for (let k = 0; k < S.N; k++) {
      const a = psi(k);
      const wx = rr * Math.cos(a), wy = rr * Math.sin(a);     // world azimuth of this follower
      const zc = S.r * Math.tan(S.alpha) * Math.sin(S.theta - a);
      items.push({ k, wx, wy, zc, vel: velK(k) });
    }
    items.sort((p, q) => q.wy - p.wy); // far (large +y projects up) first
    items.forEach(it => {
      const tip = proj(it.wx, it.wy, it.zc);
      const rtop = proj(it.wx, it.wy, 1.65);
      const deliv = it.vel > 0.02;
      ctx.strokeStyle = deliv ? C.copper : withA(C.inkFaint, 0.7);
      ctx.lineWidth = deliv ? 4.2 : 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(rtop.x, rtop.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.fillStyle = deliv ? C.keep : C.inkFaint;
      ctx.beginPath(); ctx.arc(tip.x, tip.y, deliv ? 4.5 : 3.2, 0, 7); ctx.fill();
      if (deliv) { ctx.fillStyle = withA(C.keep, 0.25); ctx.beginPath(); ctx.arc(tip.x, tip.y, 8, 0, 7); ctx.fill(); }
    });
    ctx.lineCap = 'butt';

    // hub
    const hub = proj(0, 0, 0); ctx.fillStyle = C.brass2; ctx.beginPath(); ctx.arc(hub.x, hub.y, 5, 0, 7); ctx.fill();

    label(ctx, S.N + (S.N % 2 ? ' · odd' : ' · even'), 14, 18, S.N % 2 ? C.keep : C.drift, 'left');
    label(ctx, 'glow = delivering', 14, h - 12, C.inkFaint, 'left');
  }

  // ---- delivery trace ----
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 14, padR = 16, padT = 14, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const peak = S.N; // generous full scale for the summed flow
    const Y = (q) => y1 - (q / (peak * 0.9)) * (y1 - y0);
    const X = (i, M) => x0 + (x1 - x0) * i / M;

    // axis + quarter grid
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = withA(C.rule, 0.7); ctx.setLineDash([2, 4]);
    for (let q = 1; q < 4; q++) { const gx = x0 + (x1 - x0) * q / 4; ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke(); }
    ctx.setLineDash([]);
    ['0°', '90°', '180°', '270°', '360°'].forEach((t, i) => label(ctx, t, x0 + (x1 - x0) * i / 4, y1 + 13, C.inkFaint, 'center'));

    const M = 360;
    // individual contributions (faint)
    ctx.lineWidth = 1; ctx.strokeStyle = withA(C.copper, 0.28);
    for (let k = 0; k < S.N; k++) {
      ctx.beginPath();
      for (let i = 0; i <= M; i++) { const th = i / M * 2 * Math.PI; const c = Math.cos(th - psi(k)); const q = c > 0 ? c : 0; const px = X(i, M), py = Y(q); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }

    // mean line
    ctx.strokeStyle = withA(C.steel, 0.7); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0, Y(stat.mean)); ctx.lineTo(x1, Y(stat.mean)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'mean', x1 - 4, Y(stat.mean) - 8, C.steel2, 'right');

    // the summed delivery
    ctx.strokeStyle = C.brass; ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= M; i++) {
      const th = i / M * 2 * Math.PI; let q = 0;
      for (let k = 0; k < S.N; k++) { const c = Math.cos(th - psi(k)); if (c > 0) q += c; }
      const px = X(i, M), py = Y(q); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();

    // current marker
    const thN = ((S.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let qn = 0; for (let k = 0; k < S.N; k++) { const c = Math.cos(thN - psi(k)); if (c > 0) qn += c; }
    const mx = X(thN / (2 * Math.PI) * M, M);
    ctx.fillStyle = C.copper2; ctx.beginPath(); ctx.arc(mx, Y(qn), 4.5, 0, 7); ctx.fill();

    label(ctx, 'Q', x0 + 2, y0 + 6, C.brass2, 'left');
    label(ctx, (stat.ripple * 100).toFixed(1) + '% ripple', x1 - 4, y0 + 6, S.N % 2 ? C.keep : C.drift, 'right');
  }

  function updateReading() {
    const thN = ((S.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const odd = S.N % 2 === 1;
    let deliv = 0; for (let k = 0; k < S.N; k++) if (velK(k, thN) > 0) deliv++;
    $('r-n').textContent = S.N + (odd ? ' · odd' : ' · even');
    $('r-mean').textContent = stat.meanFlow.toFixed(2) + ' r';
    $('r-ripple').textContent = (stat.ripple * 100).toFixed(1) + '%';
    $('r-freq').textContent = (odd ? 2 * S.N : S.N) + '×';
    $('r-deliv').textContent = deliv + ' of ' + S.N;

    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-mid', 'v-turn', 'v-dead', 'v-rest');
    if (odd) { vEl.classList.add('v-mid'); vt.textContent = `${S.N} followers — a shallow ripple at ${2 * S.N}× a turn`; }
    else { vEl.classList.add('v-turn'); vt.textContent = `${S.N} followers — a deeper ripple at ${S.N}× a turn`; }
    vs.textContent = S.running && !S.dragging ? 'turning' : (S.dragging ? 'by hand' : 'held');

    if (live && (!S.running || S.dragging)) {
      live.textContent = `${S.N} followers, ${odd ? 'odd' : 'even'}. Flow ripple ${(stat.ripple * 100).toFixed(1)} percent at ${odd ? 2 * S.N : S.N} times a turn. Mean delivery ${stat.meanFlow.toFixed(2)} radii. ${deliv} of ${S.N} delivering now.`;
    }
  }

  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', ((v - min) / (max - min) * 100) + '%'); }
  function draw() { drawMech(); drawTrace(); updateReading(); }

  function tick(t) {
    if (!S.lastT) S.lastT = t;
    const dt = Math.min(0.05, (t - S.lastT) / 1000); S.lastT = t;
    if (S.running && !S.dragging && !RM.matches) { S.theta = (S.theta + S.rpm / 60 * 2 * Math.PI * dt) % (2 * Math.PI); draw(); }
    requestAnimationFrame(tick);
  }

  // ---- controls ----
  const countEl = $('count'), tiltEl = $('tilt'), rpmEl = $('rpm');
  countEl.value = S.N; tiltEl.value = Math.round(S.alpha / DEG); rpmEl.value = S.rpm;
  function syncLabels() {
    $('count-v').textContent = S.N; $('tilt-v').textContent = Math.round(S.alpha / DEG); $('rpm-v').textContent = S.rpm;
    fillSlider(countEl, S.N, 2, 12); fillSlider(tiltEl, +tiltEl.value, 4, 40); fillSlider(rpmEl, +rpmEl.value, 0, 80);
  }
  countEl.addEventListener('input', () => { S.N = +countEl.value; computeStat(); syncLabels(); save(); draw(); });
  tiltEl.addEventListener('input', () => { S.alpha = +tiltEl.value * DEG; computeStat(); syncLabels(); save(); draw(); });
  rpmEl.addEventListener('input', () => { S.rpm = +rpmEl.value; syncLabels(); save(); if (!S.running) draw(); });

  const runBtn = $('run');
  function setRun(on) { S.running = on; runBtn.setAttribute('aria-pressed', String(on)); runBtn.textContent = on ? 'Pause' : 'Run'; if (on) S.lastT = 0; updateReading(); }
  runBtn.addEventListener('click', () => setRun(!S.running));
  $('odd').addEventListener('click', () => { if (S.N % 2 === 0) S.N = Math.min(11, S.N + 1); countEl.value = S.N; computeStat(); syncLabels(); save(); draw(); });
  $('even').addEventListener('click', () => { if (S.N % 2 === 1) S.N = Math.min(12, S.N + 1); countEl.value = S.N; computeStat(); syncLabels(); save(); draw(); });

  // ---- drag ----
  function angleAt(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.46, cy = rect.top + rect.height * 0.5;
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

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setRun(!S.running); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setRun(false); S.theta = (S.theta - 3 * DEG + 2 * Math.PI) % (2 * Math.PI); draw(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setRun(false); S.theta = (S.theta + 3 * DEG) % (2 * Math.PI); draw(); }
  });

  if (RM.matches) { S.running = false; runBtn.setAttribute('aria-pressed', 'false'); runBtn.textContent = 'Run'; S.theta = 24 * DEG; }
  RM.addEventListener && RM.addEventListener('change', (e) => { if (e.matches) setRun(false); });

  window.addEventListener('resize', draw);
  computeStat(); syncLabels(); draw();
  requestAnimationFrame(tick);
})();
