/* Watt — the four-bar "parallel motion" that draws a nearly straight line (1784).
 *
 * Two fixed pins O1 = (-s, 0), O2 = (s, 0) carry two equal rockers of length r; a coupler of length L
 * joins their tips C and D; the pen rides the coupler's midpoint M. As the rockers rock, M traces a
 * lemniscate — a figure-eight — and across its central crossing the path is very nearly straight,
 * because at the midpoint the two rockers' sideways wander cancels to second order. It is only an
 * approximation: a third-order term survives, so the line bows gently in the middle and curls into a
 * hook at each end of the stroke, where the path falls into a lobe. Each frame solves the real four-bar
 * closure: C from the driven rocker angle, D as an intersection of circle(O2, r) and circle(C, L), M
 * their midpoint; the bright stroke is the upper branch over the feasible rocking interval, the faint
 * ghost the lower branch, and together they are the whole eight. The straightness strip magnifies the
 * pen's departure from a least-squares line fit to the central run. The view auto-fits the curve. */
(() => {
  'use strict';

  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  const S = {
    s: 40, r: 100, L: 50,
    theta: Math.PI / 2, dir: 1, playing: false, dragging: false, showEight: true,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'linkage-watt';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ s: S.s, r: S.r, L: S.L, showEight: S.showEight })); } catch (_) {} };
  const stored = load();
  if (typeof stored.s === 'number') S.s = Math.max(36, Math.min(64, stored.s));
  if (typeof stored.r === 'number') S.r = Math.max(78, Math.min(116, stored.r));
  if (typeof stored.L === 'number') S.L = Math.max(48, Math.min(92, stored.L));
  if (typeof stored.showEight === 'boolean') S.showEight = stored.showEight;

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
  const O1 = () => ({ x: -S.s, y: 0 });
  const O2 = () => ({ x: S.s, y: 0 });

  function closure(theta) {
    const o1 = O1(), o2 = O2();
    const C0 = { x: o1.x + S.r * Math.cos(theta), y: o1.y + S.r * Math.sin(theta) };
    const ii = circInt(o2, S.r, C0, S.L);
    if (!ii) return null;
    const hi = ii[0].y >= ii[1].y ? ii[0] : ii[1];
    const lo = ii[0].y < ii[1].y ? ii[0] : ii[1];
    return { C: C0, Dhi: hi, Dlo: lo, Mhi: { x: (C0.x + hi.x) / 2, y: (C0.y + hi.y) / 2 }, Mlo: { x: (C0.x + lo.x) / 2, y: (C0.y + lo.y) / 2 } };
  }

  // ---------- feasible rocking interval + traces ----------
  // The working stroke is the CROSSED branch (Dlo): rockers reach toward each other, the coupler
  // crosses the centre, and the midpoint runs along the near-straight part of the figure-eight. The
  // uncrossed branch (Dhi) is drawn faint to complete the eight.
  let TA = 0, TB = Math.PI, stroke = [], ghost = [], fitLine = null, run = 0, bowMax = 0, eightW = 0, view = null;
  function rebuild() {
    // broad scan for feasible samples, then keep the contiguous arc containing the symmetric centre
    const raw = [];
    for (let t = -0.7; t <= 3.3; t += 0.3 * DEG) { const c = closure(t); if (c) raw.push({ t, m: c.Mlo }); }
    if (raw.length < 12) { stroke = []; ghost = []; fitLine = null; run = 0; bowMax = 0; computeView(); updateReading(); return; }
    let ci = 0, cv = 1e9; raw.forEach((p, i) => { if (Math.abs(p.m.x) < cv) { cv = Math.abs(p.m.x); ci = i; } });
    const gap = 0.3 * DEG * 1.8;
    let a = ci, b = ci;
    while (a > 0 && raw[a].t - raw[a - 1].t < gap) a--;
    while (b < raw.length - 1 && raw[b + 1].t - raw[b].t < gap) b++;
    TA = raw[a].t + 1.0 * DEG; TB = raw[b].t - 1.0 * DEG;
    if (TB <= TA) { TA = raw[a].t; TB = raw[b].t; }
    stroke = []; ghost = [];
    const N = 260;
    for (let i = 0; i <= N; i++) {
      const t = TA + (TB - TA) * i / N;
      const c = closure(t); if (!c) continue;
      stroke.push({ t, x: c.Mlo.x, y: c.Mlo.y });
      ghost.push({ x: c.Mhi.x, y: c.Mhi.y });
    }
    computeStraight();
    computeView();
    updateReading();
  }

  function computeStraight() {
    if (stroke.length < 8) { fitLine = null; run = 0; bowMax = 0; return; }
    // least-squares line through the central 60% of the stroke (principal axis)
    const a = Math.floor(stroke.length * 0.2), b = Math.ceil(stroke.length * 0.8);
    const cen = stroke.slice(a, b);
    let mx = 0, my = 0; cen.forEach(p => { mx += p.x; my += p.y; }); mx /= cen.length; my /= cen.length;
    let sxx = 0, sxy = 0, syy = 0;
    cen.forEach(p => { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; });
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);          // principal direction
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    fitLine = { mx, my, ux, uy, nx, ny };
    // deviation (perpendicular) and parameter (along) for every stroke point
    bowMax = 0; let runLo = 1e9, runHi = -1e9;
    stroke.forEach((p, i) => {
      const dx = p.x - mx, dy = p.y - my;
      p.u = dx * ux + dy * uy;                                  // along the fit line
      p.v = dx * nx + dy * ny;                                  // perpendicular deviation
      if (i >= a && i < b && Math.abs(p.v) > bowMax) bowMax = Math.abs(p.v);
    });
    const tol = 0.6;
    stroke.forEach(p => { if (Math.abs(p.v) < tol) { if (p.u < runLo) runLo = p.u; if (p.u > runHi) runHi = p.u; } });
    run = runHi > runLo ? runHi - runLo : 0;
  }

  function computeView() {
    const pts = stroke.concat([O1(), O2()]);
    for (let i = 0; i <= 48; i++) { const t = TA + (TB - TA) * i / 48; const c = closure(t); if (c) { pts.push(c.C, c.Dlo); } }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(p => { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; });
    eightW = x1 - x0;
    const padX = 46, padY = 42, W = 560, H = 360;
    const k = Math.min((W - 2 * padX) / ((x1 - x0) || 1), (H - 2 * padY) / ((y1 - y0) || 1));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    view = { k, ox: W / 2 - k * cx, oy: H / 2 + k * cy };       // y flipped
  }
  const SX = (x) => view.ox + view.k * x;
  const SY = (y) => view.oy - view.k * y;

  // ---------- drawing ----------
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }
  function bar(ctx, p, q, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(SX(p.x), SY(p.y)); ctx.lineTo(SX(q.x), SY(q.y)); ctx.stroke();
  }
  function dot(ctx, p, col, r) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), r, 0, TAU); ctx.fill(); }
  function ground(ctx, p) {
    const x = SX(p.x), y = SY(p.y);
    ctx.strokeStyle = C.steel2; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, y + 5.5); ctx.lineTo(x + 8, y + 5.5); ctx.stroke();
    for (let i = -8; i <= 6; i += 4.5) { ctx.beginPath(); ctx.moveTo(x + i, y + 5.5); ctx.lineTo(x + i - 4, y + 10.5); ctx.stroke(); }
  }
  function label(ctx, t, x, y, col, align) {
    ctx.fillStyle = col; ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function path(ctx, pts, col, lw, dash) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(SX(p.x), SY(p.y)) : ctx.moveTo(SX(p.x), SY(p.y)));
    ctx.stroke(); ctx.setLineDash([]);
  }

  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 360);
    ctx.clearRect(0, 0, w, h);

    // the fit straight line (reference) across the view
    if (fitLine) {
      const ext = 260;
      const a = { x: fitLine.mx - fitLine.ux * ext, y: fitLine.my - fitLine.uy * ext };
      const b = { x: fitLine.mx + fitLine.ux * ext, y: fitLine.my + fitLine.uy * ext };
      ctx.strokeStyle = withA(C.keep, 0.55); ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(SX(a.x), SY(a.y)); ctx.lineTo(SX(b.x), SY(b.y)); ctx.stroke(); ctx.setLineDash([]);
    }
    // faint whole figure-eight
    if (S.showEight) { path(ctx, ghost, withA(C.copper, 0.28), 1.4); }
    // the bright working stroke
    path(ctx, stroke, withA(C.copper, 0.7), 2);

    const c = closure(S.theta) || closure((TA + TB) / 2);
    if (c) {
      bar(ctx, O1(), c.C, C.brass, 3.2);
      bar(ctx, O2(), c.Dlo, C.brass, 3.2);
      bar(ctx, c.C, c.Dlo, C.brassB, 2.8);
      dot(ctx, c.C, C.brass2, 3.6); dot(ctx, c.Dlo, C.brass2, 3.6);
      label(ctx, 'C', SX(c.C.x) - 11, SY(c.C.y), C.brass2, 'center');
      label(ctx, 'D', SX(c.Dlo.x) + 11, SY(c.Dlo.y), C.brass2, 'center');
      // the pen
      dot(ctx, c.Mlo, C.copper2, 6);
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(SX(c.Mlo.x), SY(c.Mlo.y), 6, 0, TAU); ctx.stroke();
      label(ctx, 'M', SX(c.Mlo.x) + 13, SY(c.Mlo.y) - 2, C.copper2, 'center');
    }
    ground(ctx, O1()); ground(ctx, O2());
    label(ctx, 'O₁', SX(-S.s) - 2, SY(0) + 22, C.inkFaint, 'center');
    label(ctx, 'O₂', SX(S.s) + 2, SY(0) + 22, C.inkFaint, 'center');
  }

  function drawErr() {
    const { ctx, w, h } = fit(errc, 560, 120);
    ctx.clearRect(0, 0, w, h);
    if (!fitLine || !stroke.length) return;
    const padX = 40, yc = h / 2;
    let u0 = 1e9, u1 = -1e9; stroke.forEach(p => { if (p.u < u0) u0 = p.u; if (p.u > u1) u1 = p.u; });
    const UX = (u) => padX + (w - 2 * padX) * (u - u0) / ((u1 - u0) || 1);
    const mag = Math.max(2, Math.min(400, (h / 2 - 12) / (bowMax || 0.01)));

    // zero line = the fitted straight line
    ctx.strokeStyle = withA(C.keep, 0.7); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(padX, yc); ctx.lineTo(w - padX, yc); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'line', padX - 4, yc, C.keep, 'right');

    // deviation curve, clipped to the strip; green where small, oxblood in the hooks
    ctx.lineWidth = 2.2; ctx.beginPath();
    let started = false;
    stroke.forEach(p => {
      const X = UX(p.u); let Y = yc - p.v * mag;
      Y = Math.max(4, Math.min(h - 4, Y));
      if (started) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); started = true;
    });
    ctx.strokeStyle = C.drift; ctx.stroke();
    // overlay the hooks (|v| large) in oxblood
    ctx.strokeStyle = C.dead; ctx.lineWidth = 2.2;
    let seg = false;
    stroke.forEach(p => {
      const big = Math.abs(p.v) > bowMax * 1.3 + 0.4;
      if (big) { const X = UX(p.u); let Y = Math.max(4, Math.min(h - 4, yc - p.v * mag)); if (seg) ctx.lineTo(X, Y); else { ctx.beginPath(); ctx.moveTo(X, Y); } seg = true; }
      else { if (seg) ctx.stroke(); seg = false; }
    });
    if (seg) ctx.stroke();

    // current pen
    const c = closure(S.theta);
    if (c) {
      const dx = c.Mlo.x - fitLine.mx, dy = c.Mlo.y - fitLine.my;
      const u = dx * fitLine.ux + dy * fitLine.uy, v = dx * fitLine.nx + dy * fitLine.ny;
      const X = UX(u), Y = Math.max(5, Math.min(h - 5, yc - v * mag));
      ctx.fillStyle = C.copper2; ctx.beginPath(); ctx.arc(X, Y, 3.6, 0, TAU); ctx.fill();
    }
    label(ctx, 'along the stroke →', w - padX, h - 8, C.inkFaint, 'right');
    $('mag-label').textContent = Math.round(mag) + '×';
  }

  function draw() { drawMech(); drawErr(); setVerdict(); }

  // ---------- readouts ----------
  function updateReading() {
    $('r-kind').textContent = 'figure-eight';
    $('r-run').textContent = run > 1 ? run.toFixed(0) + ' units' : '—';
    $('r-bow').textContent = bowMax.toFixed(2) + ' units';
    const ratio = run > 1 && bowMax > 1e-4 ? (run / bowMax) : 0;
    $('r-ratio').textContent = ratio > 1 ? '1 : ' + Math.round(ratio) + ' (run : bow)' : '—';
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-exact', 'v-near', 'v-bow', 'v-rest');
    const c = closure(S.theta);
    let inHook = false, dev = 0;
    if (c && fitLine) {
      const dx = c.Mlo.x - fitLine.mx, dy = c.Mlo.y - fitLine.my;
      dev = Math.abs(dx * fitLine.nx + dy * fitLine.ny);
      inHook = dev > bowMax * 1.3 + 0.4;
    }
    if (inHook) { vEl.classList.add('v-bow'); vt.textContent = 'Into the hook — the stroke falls off into the eight'; }
    else { vEl.classList.add('v-near'); vt.textContent = 'Running nearly straight — bow ' + dev.toFixed(2) + ' units'; }
    vs.textContent = S.playing ? 'rocking' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.playing && !RM.matches) {
      let next = S.theta + S.dir * 0.009;
      if (next > TB || next < TA) { S.dir *= -1; next = S.theta + S.dir * 0.009; }
      S.theta = next;
      draw();
    }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    if (p && RM.matches) p = false;
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Rock the beam';
  }

  // ---------- controls ----------
  const coEl = $('coupler'), roEl = $('rocker'), spEl = $('span');
  coEl.value = S.L; roEl.value = S.r; spEl.value = 2 * S.s;
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    $('coupler-v').textContent = S.L; $('rocker-v').textContent = S.r; $('span-v').textContent = 2 * S.s;
    fillSlider(coEl, S.L, 48, 92); fillSlider(roEl, S.r, 78, 116); fillSlider(spEl, 2 * S.s, 72, 128);
  }
  function clampTheta() { S.theta = Math.max(TA, Math.min(TB, S.theta)); }
  coEl.addEventListener('input', () => { S.L = +coEl.value; syncLabels(); save(); rebuild(); clampTheta(); draw(); });
  roEl.addEventListener('input', () => { S.r = +roEl.value; syncLabels(); save(); rebuild(); clampTheta(); draw(); });
  spEl.addEventListener('input', () => { S.s = +spEl.value / 2; syncLabels(); save(); rebuild(); clampTheta(); draw(); });

  $('run-btn').addEventListener('click', () => setPlaying(!S.playing));
  $('eight-btn').addEventListener('click', () => { S.showEight = !S.showEight; $('eight-btn').setAttribute('aria-pressed', S.showEight ? 'true' : 'false'); save(); draw(); });
  $('eight-btn').setAttribute('aria-pressed', S.showEight ? 'true' : 'false');

  // ---------- drag the pen ----------
  function ptFromEvent(e) {
    const rect = mech.getBoundingClientRect(); const sc = rect.width / 560;
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: (px / sc - view.ox) / view.k, y: -(py / sc - view.oy) / view.k };
  }
  function scrubTo(pt) {
    let best = S.theta, bd = 1e9;
    const N = 260;
    for (let i = 0; i <= N; i++) {
      const t = TA + (TB - TA) * i / N; const c = closure(t); if (!c) continue;
      const dd = Math.hypot(c.Mlo.x - pt.x, c.Mlo.y - pt.y);
      if (dd < bd) { bd = dd; best = t; }
    }
    S.theta = best;
  }
  function nearPen(e) { const pt = ptFromEvent(e); const c = closure(S.theta); return c && Math.hypot(c.Mlo.x - pt.x, c.Mlo.y - pt.y) < 22; }
  function startDrag(e) { if (!nearPen(e)) return; S.dragging = true; setPlaying(false); mech.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; scrubTo(ptFromEvent(e)); draw(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; mech.style.cursor = 'grab'; } }
  mech.style.cursor = 'grab';
  mech.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  mech.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!S.playing); }
    else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); $('eight-btn').click(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setPlaying(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  rebuild();
  S.theta = RM.matches ? (TA + TB) / 2 : (TA + TB) / 2;         // start at the symmetric centre
  syncLabels(); draw();
  if (live) {
    live.textContent = `A Watt four-bar linkage: two equal rockers of length ${S.r} on pins ${2 * S.s} apart, a coupler of length ${S.L}, and the pen at its midpoint. The pen traces a figure-eight whose central crossing is nearly straight — a usable run about ${run.toFixed(0)} units long bowing only ${bowMax.toFixed(2)}, roughly one part in ${run > 1 && bowMax > 0 ? Math.round(run / bowMax) : 'many'}. Press space to rock the beam, or press E to show the whole eight.`;
  }
  requestAnimationFrame(tick);
})();
