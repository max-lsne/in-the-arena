/* Figure — the Lissajous curve, drawn by two perpendicular oscillations.
 *
 * A point is driven x = sin(nx·s + δ) side to side and y = sin(ny·s) up and down, sharing one clock s.
 * Over s ∈ [0, 2π] both sines complete a whole number of cycles (nx and ny), so for integer frequencies
 * the curve closes into a standing figure and repeats forever. The shape is carried entirely by the
 * ratio nx:ny and the phase δ — the amplitudes only size the box. The curve runs tangent to the left or
 * right edge nx times a cycle (x at full stretch) and to the top or bottom edge ny times (y at full
 * stretch), so counting edge-touches reads the ratio straight off the drawing — the oscilloscope method.
 * Detune adds a hair to nx: the ratio turns irrational, the figure never quite closes, and each pass
 * lands at a shifted phase, so the whole figure precesses. Two reference sines are drawn along the
 * bottom (horizontal drive) and left (vertical drive) margins, each with a marker tied to the pen. */
(() => {
  'use strict';

  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  const S = {
    nx: 3, ny: 2, phase: 90, detune: 0,
    u: 0, prec: 0, playing: false, dragging: false, showDrives: true,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'tracery-figure';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ nx: S.nx, ny: S.ny, phase: S.phase, detune: S.detune, showDrives: S.showDrives })); } catch (_) {} };
  const stored = load();
  if (typeof stored.nx === 'number') S.nx = Math.max(1, Math.min(7, Math.round(stored.nx)));
  if (typeof stored.ny === 'number') S.ny = Math.max(1, Math.min(7, Math.round(stored.ny)));
  if (typeof stored.phase === 'number') S.phase = Math.max(0, Math.min(180, Math.round(stored.phase)));
  if (typeof stored.detune === 'number') S.detune = Math.max(-30, Math.min(30, Math.round(stored.detune)));
  if (typeof stored.showDrives === 'boolean') S.showDrives = stored.showDrives;

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      x: g('--brass'), x2: g('--brass-2'), xb: g('--brass-b'),
      y: g('--steel'), y2: g('--steel-2'), yb: g('--steel-b'),
      pen: g('--spring'), pen2: g('--spring-2'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }
  readColors();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', readColors);

  const cv = $('fig');
  const BASE_W = 560, BASE_H = 440;
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

  // box + margin-strip geometry, in base-canvas units
  const BOX = { L: 130, T: 18, SIDE: 300 };
  BOX.R = BOX.L + BOX.SIDE; BOX.B = BOX.T + BOX.SIDE; BOX.CX = (BOX.L + BOX.R) / 2; BOX.CY = (BOX.T + BOX.B) / 2;
  const HALF = BOX.SIDE / 2;
  const LEFT = { xc: 66, amp: 40 };          // vertical drive strip (left margin)
  const BOT = { yc: 380, amp: 34 };          // horizontal drive strip (bottom margin)
  const BX = (x) => BOX.CX + x * HALF;        // figure x in [-1,1] → screen
  const BY = (y) => BOX.CY - y * HALF;        // figure y in [-1,1] → screen (y up)

  // ---------- helpers ----------
  function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }
  const px = () => S.phase * DEG;
  const nxEff = () => S.nx + S.detune / 100;
  function pt(s) { return { x: Math.sin(nxEff() * s + px() + S.prec), y: Math.sin(S.ny * s) }; }

  // ---------- drawing ----------
  function drawBox(ctx) {
    ctx.strokeStyle = withA(C.y2, 0.5); ctx.lineWidth = 1.2;
    ctx.strokeRect(BX(-1), BY(1), BOX.SIDE, BOX.SIDE);
    // faint centre cross
    ctx.strokeStyle = withA(C.rule, 1); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(BOX.CX, BOX.T); ctx.lineTo(BOX.CX, BOX.B); ctx.moveTo(BOX.L, BOX.CY); ctx.lineTo(BOX.R, BOX.CY); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawFigure(ctx) {
    const N = 900;
    ctx.strokeStyle = withA(C.pen, 0.42); ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = pt(TAU * i / N); const X = BX(p.x), Y = BY(p.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
    // bright leading trail near the pen
    const TR = 90;
    ctx.lineWidth = 2.4; ctx.strokeStyle = C.pen; ctx.beginPath();
    for (let i = 0; i <= TR; i++) {
      const s = S.u - (TR - i) / N * TAU;
      const p = pt(s); const X = BX(p.x), Y = BY(p.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
  }

  function drawDrives(ctx) {
    if (!S.showDrives) return;
    // bottom: horizontal drive sine, time along x (box span), displacement vertical
    ctx.strokeStyle = withA(C.x, 0.85); ctx.lineWidth = 1.8; ctx.beginPath();
    const N = 240;
    for (let i = 0; i <= N; i++) {
      const s = TAU * i / N;
      const X = BOX.L + (BOX.R - BOX.L) * i / N;
      const Y = BOT.yc - Math.sin(nxEff() * s + px() + S.prec) * BOT.amp;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
    // left: vertical drive sine, time down the y (box span), displacement horizontal
    ctx.strokeStyle = withA(C.y, 0.85); ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const s = TAU * i / N;
      const Y = BOX.T + (BOX.B - BOX.T) * i / N;
      const X = LEFT.xc + Math.sin(S.ny * s) * LEFT.amp;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
    // markers at current s, tied to the pen by dashed guides
    const p = pt(S.u);
    const frac = (S.u % TAU) / TAU;
    const bx = BOX.L + (BOX.R - BOX.L) * frac, by = BOT.yc - p.x * BOT.amp;
    const ly = BOX.T + (BOX.B - BOX.T) * frac, lx = LEFT.xc + p.y * LEFT.amp;
    ctx.fillStyle = C.x2; ctx.beginPath(); ctx.arc(bx, by, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = C.y2; ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, TAU); ctx.fill();
    // labels
    ctx.font = '11px "JetBrains Mono", monospace'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.x2; ctx.textAlign = 'left'; ctx.fillText('nx = ' + S.nx, BOX.L, BOT.yc + BOT.amp + 14);
    ctx.fillStyle = C.y2; ctx.textAlign = 'left'; ctx.fillText('ny = ' + S.ny, LEFT.xc - LEFT.amp, BOX.B + 16);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function drawPen(ctx) {
    const p = pt(S.u);
    const X = BX(p.x), Y = BY(p.y);
    // shadow guides to the four edges
    ctx.strokeStyle = withA(C.x, 0.55); ctx.lineWidth = 1.1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(X, BOX.T); ctx.lineTo(X, BOX.B); ctx.stroke();
    ctx.strokeStyle = withA(C.y, 0.55);
    ctx.beginPath(); ctx.moveTo(BOX.L, Y); ctx.lineTo(BOX.R, Y); ctx.stroke();
    ctx.setLineDash([]);
    // edge ticks
    ctx.fillStyle = C.x2; ctx.fillRect(X - 1.2, BOX.T - 4, 2.4, 4); ctx.fillRect(X - 1.2, BOX.B, 2.4, 4);
    ctx.fillStyle = C.y2; ctx.fillRect(BOX.L - 4, Y - 1.2, 4, 2.4); ctx.fillRect(BOX.R, Y - 1.2, 4, 2.4);
    // the pen
    ctx.fillStyle = C.pen2; ctx.beginPath(); ctx.arc(X, Y, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X, Y, 5.5, 0, TAU); ctx.stroke();
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    drawBox(ctx);
    drawFigure(ctx);
    drawDrives(ctx);
    drawPen(ctx);
    setVerdict();
  }

  // ---------- readings ----------
  function figureName(p, q) {
    if (p === 1 && q === 1) {
      const d = S.phase;
      if (d < 6 || d > 174) return 'line';
      if (Math.abs(d - 90) < 6) return 'circle';
      return 'ellipse';
    }
    const lo = Math.min(p, q), hi = Math.max(p, q);
    if (lo === 1 && hi === 2) return 'bow';
    if (lo === 2 && hi === 3) return 'trefoil';
    if (lo === 3 && hi === 4) return 'braid';
    if (lo === 1) return hi + '-lobe bow';
    return 'lattice ' + p + ':' + q;
  }
  function updateReading() {
    const g = gcd(S.nx, S.ny);
    const p = S.nx / g, q = S.ny / g;
    $('r-ratio').textContent = p + ' : ' + q;
    $('r-touch').textContent = S.nx + ' : ' + S.ny;
    $('r-kind').textContent = figureName(p, q);
    $('r-close').textContent = S.detune !== 0 ? 'never — precessing' : 'one pass (2π)';
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-closed', 'v-open', 'v-decay', 'v-rest');
    const g = gcd(S.nx, S.ny), p = S.nx / g, q = S.ny / g;
    if (S.detune !== 0) {
      vEl.classList.add('v-open');
      vt.textContent = 'Precessing — detuned, the figure will not close';
    } else {
      vEl.classList.add('v-closed');
      vt.textContent = 'A closed ' + figureName(p, q) + ' — ratio ' + p + ':' + q;
    }
    vs.textContent = S.playing ? 'tracing' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.playing && !RM.matches) {
      S.u = (S.u + 0.016) % TAU;
      if (S.detune !== 0) S.prec += (S.detune / 100) * 0.016;
      draw();
    }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    if (p && RM.matches) p = false;
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Trace';
  }

  // ---------- controls ----------
  const nxEl = $('nx'), nyEl = $('ny'), phEl = $('phase'), deEl = $('detune');
  nxEl.value = S.nx; nyEl.value = S.ny; phEl.value = S.phase; deEl.value = S.detune;
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('nx-v').textContent = S.nx; $('ny-v').textContent = S.ny;
    $('phase-v').textContent = S.phase; $('detune-v').textContent = (S.detune / 100).toFixed(2);
    fillSlider(nxEl, S.nx, 1, 7); fillSlider(nyEl, S.ny, 1, 7);
    fillSlider(phEl, S.phase, 0, 180); fillSlider(deEl, S.detune, -30, 30);
  }
  nxEl.addEventListener('input', () => { S.nx = +nxEl.value; S.prec = 0; syncLabels(); updateReading(); save(); draw(); });
  nyEl.addEventListener('input', () => { S.ny = +nyEl.value; S.prec = 0; syncLabels(); updateReading(); save(); draw(); });
  phEl.addEventListener('input', () => { S.phase = +phEl.value; syncLabels(); updateReading(); save(); draw(); });
  deEl.addEventListener('input', () => { S.detune = +deEl.value; if (S.detune === 0) S.prec = 0; syncLabels(); updateReading(); save(); draw(); });

  $('run-btn').addEventListener('click', () => setPlaying(!S.playing));
  $('drive-btn').addEventListener('click', () => { S.showDrives = !S.showDrives; $('drive-btn').setAttribute('aria-pressed', S.showDrives ? 'true' : 'false'); save(); draw(); });
  $('drive-btn').setAttribute('aria-pressed', S.showDrives ? 'true' : 'false');

  // ---------- drag to scrub the pen ----------
  function ptFromEvent(e) {
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    const sy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / sc;
    return { x: (sx - BOX.CX) / HALF, y: -(sy - BOX.CY) / HALF };
  }
  function scrubTo(q) {
    let best = S.u, bd = 1e9; const N = 600;
    for (let i = 0; i <= N; i++) { const s = TAU * i / N; const p = pt(s); const dd = Math.hypot(p.x - q.x, p.y - q.y); if (dd < bd) { bd = dd; best = s; } }
    S.u = best;
  }
  function inBox(q) { return q.x > -1.25 && q.x < 1.25 && q.y > -1.25 && q.y < 1.25; }
  function startDrag(e) { const q = ptFromEvent(e); if (!inBox(q)) return; S.dragging = true; setPlaying(false); scrubTo(q); draw(); cv.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; scrubTo(ptFromEvent(e)); draw(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; cv.style.cursor = 'crosshair'; } }
  cv.style.cursor = 'crosshair';
  cv.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  cv.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!S.playing); }
    else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); $('drive-btn').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); S.phase = Math.max(0, S.phase - 2); phEl.value = S.phase; syncLabels(); updateReading(); save(); draw(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); S.phase = Math.min(180, S.phase + 2); phEl.value = S.phase; syncLabels(); updateReading(); save(); draw(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setPlaying(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  S.u = RM.matches ? TAU * 0.17 : 0;
  syncLabels(); updateReading(); draw();
  if (live) {
    const g = gcd(S.nx, S.ny), p = S.nx / g, q = S.ny / g;
    live.textContent = `A Lissajous figure from two perpendicular sines: a horizontal drive of frequency ${S.nx} and a vertical drive of frequency ${S.ny}, phase ${S.phase} degrees. The ratio reduces to ${p} to ${q}, a closed ${figureName(p, q)} that touches the side edges ${S.nx} times and the top edges ${S.ny} times each cycle. Press space to trace it, D to show or hide the two drives, and the arrow keys to slide the phase.`;
  }
  requestAnimationFrame(tick);
})();
