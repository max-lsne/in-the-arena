/* Blackburn — the pendulum that draws a Lissajous figure in sand (Hugh Blackburn, 1844).
 *
 * A bob hangs on a forked string. In the plane of the fork the whole cord swings — a long, slow
 * pendulum, period T = 2π√(L_long/g). Across that plane only the stub below the knot swings — a short,
 * fast one, T = 2π√(L_short/g). So the bob keeps two periods at once, and the path it rides is a
 * Lissajous figure: x = cos(ω_long·t) along one axis, y = cos(ω_short·t + δ) across it, with ω = √(g/L).
 * The period ratio is √(L_long/L_short) — a square root — so clean closed figures want square-number
 * length ratios: 4:1 in length is 2:1 in period, 9:4 is 3:2. Off a square ratio the two periods are
 * incommensurate, the bob never quite comes home, and the figure precesses — drift written in sand.
 * The tray is drawn in plan; the forked string in elevation, swaying at the long period. Undamped: the
 * decay that turns this into nested art is the harmonograph's trade, next door. */
(() => {
  'use strict';

  const TAU = Math.PI * 2, DEG = Math.PI / 180, G = 9.81;

  const S = {
    Llong: 0.90, Lshort: 0.40, tilt: 0,
    t: 0, playing: false, dragging: false, speed: 1.6,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'tracery-blackburn';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ Llong: S.Llong, Lshort: S.Lshort, tilt: S.tilt })); } catch (_) {} };
  const stored = load();
  if (typeof stored.Llong === 'number') S.Llong = Math.max(0.30, Math.min(1.20, stored.Llong));
  if (typeof stored.Lshort === 'number') S.Lshort = Math.max(0.10, Math.min(1.00, stored.Lshort));
  if (typeof stored.tilt === 'number') S.tilt = Math.max(0, Math.min(90, stored.tilt));
  if (S.Lshort > S.Llong) S.Lshort = S.Llong;

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

  const cv = $('pend');
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

  const PLAN = { L: 24, T: 62, SIDE: 312 };
  PLAN.R = PLAN.L + PLAN.SIDE; PLAN.B = PLAN.T + PLAN.SIDE; PLAN.CX = (PLAN.L + PLAN.R) / 2; PLAN.CY = (PLAN.T + PLAN.B) / 2;
  const PR = PLAN.SIDE / 2 * 0.86;
  const PX = (x) => PLAN.CX + x * PR;
  const PY = (y) => PLAN.CY - y * PR;
  const ELEV = { x: 456, topY: 56, ppm: 232 };

  // ---------- helpers ----------
  function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }
  const wLong = () => Math.sqrt(G / S.Llong);
  const wShort = () => Math.sqrt(G / S.Lshort);
  const ratio = () => wShort() / wLong();            // = sqrt(Llong/Lshort), short cycles per long cycle
  function bestRatio(r) {
    let best = { p: 1, q: 1, err: 1e9 };
    for (let q = 1; q <= 6; q++) for (let p = 1; p <= 6; p++) {
      const e = Math.abs(r - p / q);
      if (e < best.err - 1e-9) best = { p, q, err: e };
    }
    const g = gcd(best.p, best.q);
    return { p: best.p / g, q: best.q / g, err: best.err };
  }
  // x = long (slow) axis; y = short (fast) axis
  function pos(t) {
    return { x: Math.cos(wLong() * t), y: Math.cos(wShort() * t + S.tilt * DEG) };
  }

  // trail of recent bob positions
  let trail = [];
  const TRAIL_MAX = 1600;

  // ---------- drawing ----------
  function drawTray(ctx) {
    ctx.fillStyle = withA(C.inkFaint, 0.05); ctx.fillRect(PLAN.L, PLAN.T, PLAN.SIDE, PLAN.SIDE);
    ctx.strokeStyle = withA(C.y2, 0.45); ctx.lineWidth = 1.2; ctx.strokeRect(PLAN.L, PLAN.T, PLAN.SIDE, PLAN.SIDE);
    ctx.strokeStyle = withA(C.rule, 1); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(PLAN.CX, PLAN.T); ctx.lineTo(PLAN.CX, PLAN.B); ctx.moveTo(PLAN.L, PLAN.CY); ctx.lineTo(PLAN.R, PLAN.CY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillStyle = C.inkFaint; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('sand tray · plan', PLAN.L + 2, PLAN.T - 6);
  }

  function drawIdeal(ctx) {
    // faint target closed figure for the nearest simple ratio, if close enough
    const r = ratio(), b = bestRatio(r);
    if (b.err > 0.05) return;
    ctx.strokeStyle = withA(C.pen, 0.16); ctx.lineWidth = 1.3; ctx.beginPath();
    const N = 700;
    for (let i = 0; i <= N; i++) {
      const s = TAU * i / N;                                  // one closing period of the ideal p:q
      const X = PX(Math.cos(b.q * s)), Y = PY(Math.cos(b.p * s + S.tilt * DEG));
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
  }

  function drawTrail(ctx) {
    if (trail.length < 2) return;
    ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const n = trail.length;
    for (let i = 1; i < n; i++) {
      const a = 0.12 + 0.72 * (i / n);
      ctx.strokeStyle = withA(C.pen, a);
      ctx.beginPath(); ctx.moveTo(PX(trail[i - 1].x), PY(trail[i - 1].y)); ctx.lineTo(PX(trail[i].x), PY(trail[i].y)); ctx.stroke();
    }
  }

  function drawElevation(ctx) {
    const px = ELEV.x, py = ELEV.topY, ppm = ELEV.ppm;
    const Llp = S.Llong * ppm, Lsp = S.Lshort * ppm;
    const forkY = py + (Llp - Lsp);
    // in-plane sway (long period) for life
    const sway = S.playing && !RM.matches ? Math.sin(wLong() * S.t) * 20 : (RM.matches ? 14 : 0);
    const bobX = px + sway, bobY = py + Llp;
    const fx = px + sway * (forkY - py) / (Llp || 1);
    // ceiling
    ctx.strokeStyle = C.inkFaint; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(px - 34, py); ctx.lineTo(px + 34, py); ctx.stroke();
    for (let i = -30; i <= 26; i += 8) { ctx.beginPath(); ctx.moveTo(px + i, py); ctx.lineTo(px + i - 6, py - 7); ctx.stroke(); }
    ctx.fillStyle = C.inkFaint; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill();
    // long cord pivot -> fork
    ctx.strokeStyle = C.y; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(fx, forkY); ctx.stroke();
    // fork knot + Y to bob
    ctx.fillStyle = C.y2; ctx.beginPath(); ctx.arc(fx, forkY, 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.y; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(fx - 5, forkY); ctx.lineTo(bobX, bobY); ctx.moveTo(fx + 5, forkY); ctx.lineTo(bobX, bobY); ctx.stroke();
    // bob
    ctx.fillStyle = C.pen2; ctx.beginPath(); ctx.arc(bobX, bobY, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bobX, bobY, 6.5, 0, TAU); ctx.stroke();
    // braces + labels
    ctx.font = '11px "JetBrains Mono", monospace'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = withA(C.ink, 0.35); ctx.lineWidth = 1;
    const bx1 = px - 30;
    ctx.beginPath(); ctx.moveTo(bx1, py); ctx.lineTo(bx1 - 5, py); ctx.lineTo(bx1 - 5, py + Llp); ctx.lineTo(bx1, py + Llp); ctx.stroke();
    ctx.fillStyle = C.y2; ctx.textAlign = 'right'; ctx.save(); ctx.translate(bx1 - 10, py + Llp / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('L long', 0, 0); ctx.restore();
    const bx2 = px + 30;
    ctx.strokeStyle = withA(C.ink, 0.35);
    ctx.beginPath(); ctx.moveTo(bx2, forkY); ctx.lineTo(bx2 + 5, forkY); ctx.lineTo(bx2 + 5, py + Llp); ctx.lineTo(bx2, py + Llp); ctx.stroke();
    ctx.fillStyle = C.y2; ctx.save(); ctx.translate(bx2 + 14, forkY + Lsp / 2); ctx.rotate(Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('L short', 0, 0); ctx.restore();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.inkFaint; ctx.textAlign = 'center'; ctx.fillText('forked string', px, py + Llp + 26); ctx.textAlign = 'left';
  }

  function drawBob(ctx) {
    const p = pos(S.t);
    const X = PX(p.x), Y = PY(p.y);
    ctx.fillStyle = C.pen2; ctx.beginPath(); ctx.arc(X, Y, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, Y, 5, 0, TAU); ctx.stroke();
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    drawTray(ctx);
    drawIdeal(ctx);
    drawTrail(ctx);
    drawBob(ctx);
    drawElevation(ctx);
    setVerdict();
  }

  // ---------- readings ----------
  function figureName(p, q) {
    const lo = Math.min(p, q), hi = Math.max(p, q);
    if (lo === 1 && hi === 1) return 'ellipse';
    if (lo === 1 && hi === 2) return 'bow';
    if (lo === 2 && hi === 3) return 'trefoil';
    if (lo === 3 && hi === 4) return 'braid';
    if (lo === 1) return hi + '-lobe bow';
    return 'lattice ' + p + ':' + q;
  }
  function updateReading() {
    const Tl = TAU / wLong(), Ts = TAU / wShort();
    $('r-tlong').textContent = Tl.toFixed(2) + ' s';
    $('r-tshort').textContent = Ts.toFixed(2) + ' s';
    const r = ratio(), b = bestRatio(r);
    $('r-ratio').textContent = r.toFixed(3) + '  (' + b.p + ':' + b.q + ')';
    const pct = (r / (b.p / b.q) - 1) * 100;
    $('r-tune').textContent = b.err < 0.012 ? 'on ' + b.p + ':' + b.q + ' ✓' : (pct > 0 ? '+' : '') + pct.toFixed(1) + '% off ' + b.p + ':' + b.q;
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-closed', 'v-open', 'v-decay', 'v-rest');
    const r = ratio(), b = bestRatio(r);
    if (b.err < 0.012) {
      vEl.classList.add('v-closed');
      vt.textContent = 'A closed ' + figureName(b.p, b.q) + ' — periods ' + b.p + ':' + b.q;
    } else {
      vEl.classList.add('v-open');
      vt.textContent = 'Precessing — the lengths are not square-tuned';
    }
    vs.textContent = S.playing ? 'swinging' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.playing && !RM.matches) {
      const dt = 0.016 * S.speed;
      S.t += dt;
      trail.push(pos(S.t));
      if (trail.length > TRAIL_MAX) trail.shift();
      draw();
    }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    if (p && RM.matches) p = false;
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Release';
  }
  function rake() { trail = []; S.t = 0; draw(); }

  // ---------- controls ----------
  const llEl = $('llong'), lsEl = $('lshort'), tiEl = $('tilt');
  llEl.value = S.Llong; lsEl.value = S.Lshort; tiEl.value = S.tilt;
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('llong-v').textContent = S.Llong.toFixed(2); $('lshort-v').textContent = S.Lshort.toFixed(2);
    $('tilt-v').textContent = S.tilt === 0 ? 'corner' : S.tilt + '°';
    fillSlider(llEl, S.Llong, 0.30, 1.20); fillSlider(lsEl, S.Lshort, 0.10, 1.00); fillSlider(tiEl, S.tilt, 0, 90);
  }
  function retune() { trail = []; updateReading(); save(); draw(); }
  llEl.addEventListener('input', () => {
    S.Llong = +llEl.value;
    if (S.Lshort > S.Llong) { S.Lshort = S.Llong; lsEl.value = S.Lshort; }
    syncLabels(); retune();
  });
  lsEl.addEventListener('input', () => {
    S.Lshort = Math.min(+lsEl.value, S.Llong); lsEl.value = S.Lshort;
    syncLabels(); retune();
  });
  tiEl.addEventListener('input', () => { S.tilt = +tiEl.value; syncLabels(); trail = []; save(); draw(); });

  $('run-btn').addEventListener('click', () => setPlaying(!S.playing));
  $('rake-btn').addEventListener('click', rake);

  // ---------- drag to change speed of the swing (scrub time) ----------
  function startDrag(e) {
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    if (sx > PLAN.R + 10) return;                      // leave the elevation alone
    S.dragging = true; setPlaying(false); dragMove(e); e.preventDefault();
  }
  function dragMove(e) {
    if (!S.dragging) return;
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    S.t = Math.max(0, (sx - PLAN.L) / PLAN.SIDE) * 14;  // scrub along the figure by hand
    trail = []; for (let k = 40; k >= 0; k--) trail.push(pos(Math.max(0, S.t - k * 0.05)));
    draw(); e.preventDefault();
  }
  function endDrag() { if (S.dragging) { S.dragging = false; } }
  cv.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', dragMove); window.addEventListener('mouseup', endDrag);
  cv.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', dragMove, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!S.playing); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rake(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setPlaying(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  if (RM.matches) {
    // show a full static drawing of the ideal figure
    const r = ratio(), b = bestRatio(r);
    for (let i = 0; i <= 700; i++) { const s = TAU * i / 700; trail.push({ x: Math.cos(b.q * s), y: Math.cos(b.p * s + S.tilt * DEG) }); }
  }
  syncLabels(); updateReading(); draw();
  if (live) {
    const r = ratio(), b = bestRatio(r);
    live.textContent = `A Blackburn pendulum: a bob on a forked string with a long length of ${S.Llong.toFixed(2)} metres swinging slowly and a short length of ${S.Lshort.toFixed(2)} metres swinging fast. Their periods are ${(TAU / wLong()).toFixed(2)} and ${(TAU / wShort()).toFixed(2)} seconds, a ratio of about ${r.toFixed(2)}, nearest the simple tuning ${b.p} to ${b.q} — ${b.err < 0.012 ? 'on tune, so the figure closes' : 'off tune, so the figure slowly precesses'}. Press space to release the bob and R to rake the sand clean.`;
  }
  requestAnimationFrame(tick);
})();
