/* Chebyshev — the best near-straight four-bar (proportion 2:5:5:4), met as a question of approximation.
 *
 * Base O1=(-2,0), O2=(2,0) in units of a scale K; two equal links of length 5, a coupler of length 2,
 * and a pen at a point P a fraction t along the coupler (t = 0.5, the midpoint, is Chebyshev's best).
 * The clean drive is the COUPLER ANGLE phi: the coupler turns fully, so C solves as an intersection of
 * circle(O1, leg) and circle(O2 - coupler*(cos phi, sin phi), leg) for every phi, a closed curve with no
 * dead spots. The pen's path has a long, flat TOP — the straight-line approximation. Chebyshev's real
 * question was sharper than Watt's: not "straight enough?" but "the straightest possible?" — the minimax
 * problem whose answer puts the pen at the midpoint and whose pursuit helped found approximation theory.
 * The page lets you (a) slide the pen off the midpoint and watch the flat spoil, worst where it was best,
 * and (b) demand a longer working run and watch the straightness you can hold fall away — the honest
 * trade every approximate straight-line linkage makes. Every pose is the true closure; the strip and the
 * readings are read off the one computation. */
(() => {
  'use strict';

  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const K = 46;                                       // world scale (one base-unit)
  const O1 = { x: -2 * K, y: 0 }, O2 = { x: 2 * K, y: 0 }, LEG = 5 * K, CPL = 2 * K;

  const S = {
    t: 0.5, runBU: 1.3,
    phi: Math.PI / 2, omega: 0.9,
    playing: false, dragging: false, lastC: null,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'linkage-chebyshev';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ t: S.t, runBU: S.runBU })); } catch (_) {} };
  const stored = load();
  if (typeof stored.t === 'number') S.t = Math.max(0.30, Math.min(0.70, stored.t));
  if (typeof stored.runBU === 'number') S.runBU = Math.max(0.5, Math.min(2.6, stored.runBU));

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

  const mech = $('mech'), errc = $('err');
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

  // ---------- geometry ----------
  function circInt(c0, r0, c1, r1) {
    const dx = c1.x - c0.x, dy = c1.y - c0.y, dd = Math.hypot(dx, dy);
    if (dd > r0 + r1 || dd < Math.abs(r0 - r1) || dd === 0) return null;
    const a = (r0 * r0 - r1 * r1 + dd * dd) / (2 * dd), h2 = r0 * r0 - a * a;
    if (h2 < 0) return null;
    const h = Math.sqrt(h2), xm = c0.x + a * dx / dd, ym = c0.y + a * dy / dd;
    return [{ x: xm + h * dy / dd, y: ym - h * dx / dd }, { x: xm - h * dy / dd, y: ym + h * dx / dd }];
  }
  function solve(phi, prevC) {
    const O2p = { x: O2.x - CPL * Math.cos(phi), y: O2.y - CPL * Math.sin(phi) };
    const ii = circInt(O1, LEG, O2p, LEG);
    if (!ii) return null;
    let Cpt;
    if (prevC) Cpt = (Math.hypot(ii[0].x - prevC.x, ii[0].y - prevC.y) < Math.hypot(ii[1].x - prevC.x, ii[1].y - prevC.y)) ? ii[0] : ii[1];
    else Cpt = ii[0].y > ii[1].y ? ii[0] : ii[1];
    const D = { x: Cpt.x + CPL * Math.cos(phi), y: Cpt.y + CPL * Math.sin(phi) };
    const P = { x: Cpt.x + S.t * CPL * Math.cos(phi), y: Cpt.y + S.t * CPL * Math.sin(phi) };
    return { C: Cpt, D, P };
  }
  const penOf = (c) => { const ang = Math.atan2(c.D.y - c.C.y, c.D.x - c.C.x); return { x: c.C.x + S.t * CPL * Math.cos(ang), y: c.C.y + S.t * CPL * Math.sin(ang) }; };

  // ---------- precompute the closed pen curve + straightness over the working run ----------
  let curve = [], ymin = 0, ymax = 1, apexX = 0, winA = 0, winB = 0, run = 0, bowMax = 0, yFit = 0, view = null;
  function rebuild() {
    curve = []; let prev = solve(0, null); prev = prev ? prev.C : null;
    const N = 720;
    for (let i = 0; i <= N; i++) {
      const phi = TAU * i / N; const c = solve(phi, prev); if (!c) continue; prev = c.C;
      curve.push({ phi, x: c.P.x, y: c.P.y, C: c.C, D: c.D });
    }
    ymin = Math.min(...curve.map(p => p.y)); ymax = Math.max(...curve.map(p => p.y));
    const H = ymax - ymin;
    const apex = curve.reduce((a, p) => p.y > a.y ? p : a, curve[0]); apexX = apex.x;
    // upper branch within the working-run x-window about the apex
    const halfW = S.runBU * K / 2;
    const win = curve.filter(p => p.y > ymax - 0.5 * H && Math.abs(p.x - apexX) <= halfW);
    if (win.length > 3) {
      yFit = win.reduce((a, p) => a + p.y, 0) / win.length;
      bowMax = Math.max(...win.map(p => Math.abs(p.y - yFit)));
      const xs = win.map(p => p.x); winA = Math.min(...xs); winB = Math.max(...xs);
      run = winB - winA;
    } else { bowMax = 0; run = 0; }
    computeView(); updateReading();
  }

  function computeView() {
    const pts = curve.slice(); pts.push(O1, O2);
    let prev = null;
    for (let i = 0; i <= 40; i++) { const c = solve(TAU * i / 40, prev); if (c) { prev = c.C; pts.push(c.C, c.D); } }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(p => { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; });
    const padX = 40, padY = 38, W = 560, H = 360;
    const k = Math.min((W - 2 * padX) / ((x1 - x0) || 1), (H - 2 * padY) / ((y1 - y0) || 1));
    view = { k, ox: W / 2 - k * (x0 + x1) / 2, oy: H / 2 + k * (y0 + y1) / 2 };
  }
  const SX = (x) => view.ox + view.k * x;
  const SY = (y) => view.oy - view.k * y;

  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }
  function label(ctx, t, x, y, col, align) {
    ctx.fillStyle = col; ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function ground(ctx, x, y) {
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 7, y + 5); ctx.lineTo(x + 7, y + 5); ctx.stroke();
    for (let i = -7; i <= 5; i += 4) { ctx.beginPath(); ctx.moveTo(x + i, y + 5); ctx.lineTo(x + i - 3.5, y + 9.5); ctx.stroke(); }
  }

  // ---------- draw mechanism ----------
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 360);
    ctx.clearRect(0, 0, w, h);
    // the working-run straight reference, at the fitted height, across the window
    ctx.strokeStyle = withA(C.keep, 0.6); ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(SX(apexX - S.runBU * K / 2), SY(yFit)); ctx.lineTo(SX(apexX + S.runBU * K / 2), SY(yFit)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'working run', SX(apexX + S.runBU * K / 2) + 4, SY(yFit) - 9, C.keep, 'left');

    // the closed pen curve; the part inside the window bright
    ctx.lineWidth = 2; ctx.strokeStyle = withA(C.copper, 0.4); ctx.beginPath();
    curve.forEach((p, i) => i ? ctx.lineTo(SX(p.x), SY(p.y)) : ctx.moveTo(SX(p.x), SY(p.y)));
    ctx.closePath(); ctx.stroke();
    ctx.lineWidth = 2.6; ctx.strokeStyle = C.copper; ctx.beginPath(); let on = false;
    curve.forEach((p) => { const inWin = p.y > ymax - 0.5 * (ymax - ymin) && p.x >= winA && p.x <= winB; if (inWin) { const X = SX(p.x), Y = SY(p.y); if (on) ctx.lineTo(X, Y); else { ctx.beginPath(); ctx.moveTo(X, Y); } on = true; } else { if (on) ctx.stroke(); on = false; } });
    if (on) ctx.stroke();

    const c = solve(S.phi, S.lastC); if (c) S.lastC = c.C;
    if (c) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.brass; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(SX(O1.x), SY(O1.y)); ctx.lineTo(SX(c.C.x), SY(c.C.y)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(SX(O2.x), SY(O2.y)); ctx.lineTo(SX(c.D.x), SY(c.D.y)); ctx.stroke();
      ctx.strokeStyle = C.brassB; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(SX(c.C.x), SY(c.C.y)); ctx.lineTo(SX(c.D.x), SY(c.D.y)); ctx.stroke();
      [c.C, c.D].forEach(p => { ctx.fillStyle = C.brass2; ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), 3.6, 0, TAU); ctx.fill(); });
      const pen = penOf(c);
      ctx.fillStyle = C.copper2; ctx.beginPath(); ctx.arc(SX(pen.x), SY(pen.y), 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(SX(pen.x), SY(pen.y), 6, 0, TAU); ctx.stroke();
      label(ctx, S.t === 0.5 ? 'midpoint' : 'pen', SX(pen.x) + 13, SY(pen.y) - 2, C.copper2, 'left');
    }
    ground(ctx, SX(O1.x), SY(O1.y)); ground(ctx, SX(O2.x), SY(O2.y));
    label(ctx, 'O₁', SX(O1.x) - 2, SY(0) + 20, C.inkFaint, 'center');
    label(ctx, 'O₂', SX(O2.x) + 2, SY(0) + 20, C.inkFaint, 'center');
  }

  // ---------- straightness strip ----------
  function drawStrip() {
    const { ctx, w, h } = fit(errc, 560, 120);
    ctx.clearRect(0, 0, w, h);
    const padX = 40, yc = h / 2;
    const win = curve.filter(p => p.y > ymax - 0.5 * (ymax - ymin) && p.x >= winA && p.x <= winB).sort((a, b) => a.x - b.x);
    if (win.length < 3) return;
    const UX = (x) => padX + (w - 2 * padX) * (x - winA) / ((winB - winA) || 1);
    const mag = Math.max(2, Math.min(500, (h / 2 - 12) / (bowMax || 0.01)));
    ctx.strokeStyle = withA(C.keep, 0.7); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(padX, yc); ctx.lineTo(w - padX, yc); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'line', padX - 4, yc, C.keep, 'right');
    ctx.strokeStyle = S.t === 0.5 ? C.drift : C.dead; ctx.lineWidth = 2.2; ctx.beginPath();
    win.forEach((p, i) => { const X = UX(p.x), Y = Math.max(4, Math.min(h - 4, yc - (p.y - yFit) * mag)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
    const c = solve(S.phi, S.lastC);
    if (c) { const pen = penOf(c); if (pen.x >= winA && pen.x <= winB && pen.y > ymax - 0.5 * (ymax - ymin)) { ctx.fillStyle = C.copper2; ctx.beginPath(); ctx.arc(UX(pen.x), Math.max(5, Math.min(h - 5, yc - (pen.y - yFit) * mag)), 3.6, 0, TAU); ctx.fill(); } }
    label(ctx, 'across the working run →', w - padX, h - 8, C.inkFaint, 'right');
    $('mag-label').textContent = Math.round(mag) + '×';
  }

  function draw() { drawMech(); drawStrip(); setVerdict(); }

  // ---------- readouts ----------
  function updateReading() {
    const off = Math.round((S.t - 0.5) * 100);
    $('r-tag').textContent = off === 0 ? 'midpoint' : 'off-centre';
    $('point-v').textContent = off === 0 ? 'midpoint' : (off > 0 ? '+' : '') + off + '% of coupler';
    $('run-v').textContent = S.runBU.toFixed(2);
    $('r-run').textContent = (run / K).toFixed(2) + ' base-units';
    $('r-bow').textContent = (bowMax / K).toFixed(3) + ' units';
    const ratio = run > 1 && bowMax > 1e-4 ? run / bowMax : 0;
    $('r-ratio').textContent = ratio > 1 ? '1 : ' + Math.round(ratio) : '—';
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-exact', 'v-near', 'v-bow', 'v-rest');
    const ratio = run > 1 && bowMax > 1e-4 ? Math.round(run / bowMax) : 0;
    if (S.t !== 0.5) { vEl.classList.add('v-bow'); vt.textContent = 'Off the midpoint — the flat has bowed, 1 : ' + ratio + ' now'; }
    else { vEl.classList.add('v-near'); vt.textContent = 'The best near-miss — 1 : ' + ratio + ' across this run'; }
    vs.textContent = S.playing ? 'driving' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.playing && !RM.matches) { S.phi += S.omega * 0.016; draw(); }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    if (p && RM.matches) p = false;
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Drive it';
  }

  // ---------- controls ----------
  const ptEl = $('point'), rnEl = $('run');
  ptEl.value = Math.round(S.t * 100); rnEl.value = Math.round(S.runBU * 100);
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() { fillSlider(ptEl, S.t * 100, 30, 70); fillSlider(rnEl, S.runBU * 100, 50, 260); }
  ptEl.addEventListener('input', () => { S.t = +ptEl.value / 100; syncLabels(); save(); rebuild(); draw(); });
  rnEl.addEventListener('input', () => { S.runBU = +rnEl.value / 100; syncLabels(); save(); rebuild(); draw(); });
  $('run-btn').addEventListener('click', () => setPlaying(!S.playing));
  $('recentre').addEventListener('click', () => { S.t = 0.5; ptEl.value = 50; syncLabels(); save(); rebuild(); draw(); });

  // ---------- drag the pen ----------
  function ptFromEvent(e) {
    const rect = mech.getBoundingClientRect(); const sc = rect.width / 560;
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: (px / sc - view.ox) / view.k, y: -(py / sc - view.oy) / view.k };
  }
  function scrubTo(pt) {
    let best = S.phi, bd = 1e9, prev = null;
    for (let i = 0; i <= 360; i++) { const phi = TAU * i / 360; const c = solve(phi, prev); if (!c) continue; prev = c.C; const pen = penOf(c); const dd = Math.hypot(pen.x - pt.x, pen.y - pt.y); if (dd < bd) { bd = dd; best = phi; } }
    S.phi = best;
  }
  function nearPen(e) { const pt = ptFromEvent(e); const c = solve(S.phi, S.lastC); if (!c) return false; const pen = penOf(c); return Math.hypot(pen.x - pt.x, pen.y - pt.y) < 24; }
  function startDrag(e) { if (!nearPen(e)) return; S.dragging = true; setPlaying(false); mech.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; scrubTo(ptFromEvent(e)); draw(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; mech.style.cursor = 'grab'; } }
  mech.style.cursor = 'grab';
  mech.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  mech.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!S.playing); }
    else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); S.t = 0.5; ptEl.value = 50; syncLabels(); save(); rebuild(); draw(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setPlaying(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  rebuild(); syncLabels();
  // open with the pen resting on the flat top, so the first look is the straight part
  { const apex = curve.reduce((a, p) => p.y > a.y ? p : a, curve[0]); S.phi = apex.phi; }
  draw();
  if (live) {
    const ratio = run > 1 && bowMax > 0 ? Math.round(run / bowMax) : 0;
    live.textContent = `A Chebyshev four-bar in the proportion two to five to five to four. The pen at the coupler midpoint traces a closed curve with a long flat top — across a working run of ${(run / K).toFixed(1)} base-units it holds to a straight line within about one part in ${ratio}. Slide the pen off the midpoint and the flat bows, worst where it was best; ask for a longer run and the straightness you can keep falls away. Press space to drive it, or M to re-centre the pen.`;
  }
  requestAnimationFrame(tick);
})();
