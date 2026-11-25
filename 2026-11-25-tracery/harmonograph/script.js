/* Harmonograph — the Lissajous figure given friction, and the nested rosette it spirals into.
 *
 * Two perpendicular pendulums move a pen: x = e^(−d·τ)·sin(fx·τ + δ), y = e^(−d·τ)·sin(fy·τ). Undamped
 * this is the pure figure; the exponential envelope e^(−d·τ) — friction taking a fixed fraction of the
 * swing per unit time — makes each loop return a little nearer the centre, so the closed curve opens
 * into a spiral of itself, loop nested within loop, winding to rest at the origin. A small detune of
 * fx against fy makes the shrinking figure also precess, so the loops rotate into a wreath. Lower decay
 * draws more loops before resting (a denser rosette); higher decay reaches the centre in a few. The
 * whole drawing is made from one release and left as ink. The sheet loads showing a finished drawing;
 * Draw replays the making, the faint ring tracking the shrinking envelope as the pen spirals in. */
(() => {
  'use strict';

  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  const S = {
    fx: 2.00, fy: 3.01, phase: 0, decay: 28,
    playing: false, done: true,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'tracery-harmonograph';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ fx: S.fx, fy: S.fy, phase: S.phase, decay: S.decay })); } catch (_) {} };
  const stored = load();
  if (typeof stored.fx === 'number') S.fx = Math.max(1, Math.min(4, stored.fx));
  if (typeof stored.fy === 'number') S.fy = Math.max(1, Math.min(4, stored.fy));
  if (typeof stored.phase === 'number') S.phase = Math.max(0, Math.min(180, Math.round(stored.phase)));
  if (typeof stored.decay === 'number') S.decay = Math.max(4, Math.min(100, Math.round(stored.decay)));

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      x: g('--brass'), x2: g('--brass-2'),
      y: g('--steel'), y2: g('--steel-2'),
      pen: g('--spring'), pen2: g('--spring-2'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }
  readColors();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', readColors);

  const cv = $('harm');
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

  const PAPER = { L: 78, T: 16, SIDE: 408 };
  PAPER.R = PAPER.L + PAPER.SIDE; PAPER.B = PAPER.T + PAPER.SIDE; PAPER.CX = (PAPER.L + PAPER.R) / 2; PAPER.CY = (PAPER.T + PAPER.B) / 2;
  const SC = PAPER.SIDE / 2 * 0.9;
  const MX = (x) => PAPER.CX + x * SC;
  const MY = (y) => PAPER.CY - y * SC;

  // ---------- helpers ----------
  function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }
  const dVal = () => S.decay * 0.0009;                        // slider → decay constant
  const tauEnd = () => Math.log(1 / 0.015) / dVal();          // envelope falls to 1.5%
  function pos(tau) {
    const e = Math.exp(-dVal() * tau);
    return { x: e * Math.sin(S.fx * tau + S.phase * DEG), y: e * Math.sin(S.fy * tau), e };
  }
  function bestRatio(r) {
    let best = { p: 1, q: 1, err: 1e9 };
    for (let q = 1; q <= 5; q++) for (let p = 1; p <= 5; p++) {
      const e = Math.abs(r - p / q);
      if (e < best.err - 1e-9) best = { p, q, err: e };
    }
    const g = gcd(best.p, best.q);
    return { p: best.p / g, q: best.q / g, err: best.err };
  }

  // ---------- the drawn path ----------
  let pts = [], tau = 0;
  const fineStep = () => Math.max(tauEnd() / 6000, (TAU / Math.max(S.fx, S.fy)) / 48);
  function computeFull() {
    pts = []; const end = tauEnd(), ds = fineStep();
    for (let t = 0; t <= end; t += ds) pts.push(pos(t));
    tau = end; S.done = true;
  }

  // ---------- drawing ----------
  function drawPaper(ctx) {
    ctx.fillStyle = withA(C.inkFaint, 0.04); ctx.fillRect(PAPER.L, PAPER.T, PAPER.SIDE, PAPER.SIDE);
    ctx.strokeStyle = withA(C.y2, 0.4); ctx.lineWidth = 1.2; ctx.strokeRect(PAPER.L, PAPER.T, PAPER.SIDE, PAPER.SIDE);
    // centre mark
    ctx.strokeStyle = withA(C.rule, 1); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAPER.CX - 5, PAPER.CY); ctx.lineTo(PAPER.CX + 5, PAPER.CY); ctx.moveTo(PAPER.CX, PAPER.CY - 5); ctx.lineTo(PAPER.CX, PAPER.CY + 5); ctx.stroke();
  }
  function drawGhost(ctx) {
    // the undamped closed figure the decaying rosette winds inside — only when near a simple ratio,
    // where a single closed figure exists to wind within; the precessing wreath has none.
    const b = ratioInfo();
    const pct = Math.abs((S.fx / S.fy / (b.p / b.q) - 1) * 100);
    if (pct > 1.5) return;
    ctx.strokeStyle = withA(C.y, 0.22); ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]); ctx.beginPath();
    const N = 600;
    for (let i = 0; i <= N; i++) {
      const s = TAU * i / N;
      const X = MX(Math.sin(b.p * s + S.phase * DEG)), Y = MY(Math.sin(b.q * s));
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function drawCurve(ctx) {
    if (pts.length < 2) return;
    ctx.strokeStyle = C.pen; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) { const X = MX(pts[i].x), Y = MY(pts[i].y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
  }
  function drawEnvAndPen(ctx) {
    if (S.done || pts.length < 2) return;
    const last = pts[pts.length - 1];
    // envelope ring
    ctx.strokeStyle = withA(C.x, 0.4); ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(PAPER.CX, PAPER.CY, last.e * SC, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // pen
    ctx.fillStyle = C.pen2; ctx.beginPath(); ctx.arc(MX(last.x), MY(last.y), 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(MX(last.x), MY(last.y), 4.5, 0, TAU); ctx.stroke();
  }
  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    drawPaper(ctx);
    drawGhost(ctx);
    drawCurve(ctx);
    drawEnvAndPen(ctx);
    setVerdict();
  }

  // ---------- readings ----------
  function figureName(p, q) {
    const lo = Math.min(p, q), hi = Math.max(p, q);
    if (lo === 1 && hi === 1) return 'spiral of ellipses';
    if (lo === 1 && hi === 2) return 'nested bow';
    if (lo === 2 && hi === 3) return 'trefoil rosette';
    if (lo === 3 && hi === 4) return 'braided rosette';
    if (lo === 1) return hi + '-petal rosette';
    return p + ':' + q + ' rosette';
  }
  function ratioInfo() { return bestRatio(S.fx / S.fy); }
  function updateReading() {
    const b = ratioInfo();
    $('r-ratio').textContent = b.p + ' : ' + b.q;
    const pct = (S.fx / S.fy / (b.p / b.q) - 1) * 100;
    $('r-detune').textContent = Math.abs(pct) < 0.05 ? 'none' : (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
    const favg = (S.fx + S.fy) / 2, period = TAU / favg;
    const tHalf = Math.log(2) / dVal();
    $('r-half').textContent = (tHalf / period).toFixed(1) + ' swings';
    $('r-kind').textContent = figureName(b.p, b.q);
  }
  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-closed', 'v-open', 'v-decay', 'v-rest');
    const b = ratioInfo();
    const pct = Math.abs((S.fx / S.fy / (b.p / b.q) - 1) * 100);
    if (S.playing && !S.done) {
      vEl.classList.add('v-decay'); vt.textContent = 'Drawing — the swing dying away';
    } else if (pct < 0.6) {
      vEl.classList.add('v-closed'); vt.textContent = 'A nested ' + figureName(b.p, b.q) + ' — ' + b.p + ':' + b.q;
    } else {
      vEl.classList.add('v-open'); vt.textContent = 'A precessing wreath — detuned ' + b.p + ':' + b.q;
    }
    vs.textContent = S.playing && !S.done ? 'drawing' : (S.done ? 'drawn' : 'ready');
  }

  // ---------- animation ----------
  const ANIM = 320;                                            // frames for a full draw
  function tick() {
    if (S.playing && !S.done && !RM.matches) {
      const end = tauEnd(), ds = fineStep();
      const target = Math.min(end, tau + end / ANIM);
      while (tau < target) { tau += ds; pts.push(pos(tau)); }
      if (tau >= end) { S.done = true; setPlaying(false); }
      draw();
    }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    if (p && RM.matches) p = false;
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p && !S.done ? 'Pause' : 'Draw';
  }
  function startDraw() {
    if (RM.matches) { computeFull(); draw(); return; }
    pts = []; tau = 0; S.done = false; setPlaying(true); draw();
  }
  function newSheet() { setPlaying(false); pts = []; tau = 0; S.done = true; draw(); }

  // ---------- controls ----------
  const fxEl = $('fx'), fyEl = $('fy'), phEl = $('phase'), deEl = $('decay');
  fxEl.value = S.fx; fyEl.value = S.fy; phEl.value = S.phase; deEl.value = S.decay;
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('fx-v').textContent = S.fx.toFixed(2); $('fy-v').textContent = S.fy.toFixed(2);
    $('phase-v').textContent = S.phase; $('decay-v').textContent = S.decay;
    fillSlider(fxEl, S.fx, 1, 4); fillSlider(fyEl, S.fy, 1, 4);
    fillSlider(phEl, S.phase, 0, 180); fillSlider(deEl, S.decay, 4, 100);
  }
  function onParam() {
    syncLabels(); updateReading(); save();
    // recompute a finished drawing immediately (fast, static) so the sheet always shows the figure
    setPlaying(false); computeFull(); draw();
  }
  fxEl.addEventListener('input', () => { S.fx = +fxEl.value; onParam(); });
  fyEl.addEventListener('input', () => { S.fy = +fyEl.value; onParam(); });
  phEl.addEventListener('input', () => { S.phase = +phEl.value; onParam(); });
  deEl.addEventListener('input', () => { S.decay = +deEl.value; onParam(); });

  $('run-btn').addEventListener('click', () => {
    if (S.playing && !S.done) setPlaying(false);        // pause
    else startDraw();                                    // (re)start a fresh draw
  });
  $('new-btn').addEventListener('click', newSheet);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); if (S.playing && !S.done) setPlaying(false); else startDraw(); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newSheet(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) { setPlaying(false); computeFull(); } draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  syncLabels(); updateReading(); computeFull(); draw();
  if (live) {
    const b = ratioInfo();
    const pct = (S.fx / S.fy / (b.p / b.q) - 1) * 100;
    live.textContent = `A harmonograph drawing: two damped perpendicular pendulums at frequencies ${S.fx.toFixed(2)} and ${S.fy.toFixed(2)}, nearest the ratio ${b.p} to ${b.q}${Math.abs(pct) < 0.05 ? ', exactly tuned' : ', detuned ' + pct.toFixed(2) + ' percent so it precesses'}. The swing decays to half in about ${(Math.log(2) / dVal() / (TAU / ((S.fx + S.fy) / 2))).toFixed(1)} swings, spiralling the figure inward into a ${figureName(b.p, b.q)}. Press space or Draw to replay the making, N for a fresh sheet.`;
  }
  requestAnimationFrame(tick);
})();
