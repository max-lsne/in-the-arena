/* Rosette — the spirograph curve: a pen drawn INSIDE a rolling wheel's rim, rolled on a fixed ring.
 *
 * The same wheel-on-a-wheel as the cusp page, but the pen is now fixed a distance d short of the rim,
 * 0 ≤ d ≤ r. The wheel's centre still rides a circle of radius R±r and still turns at the no-slip rate
 * (R±r)/r; only the pen's reach from the centre changes. Writing k = (R±r)/r,
 *     outside (epitrochoid):  x = (R+r)cosθ − d·cos(k·θ),   y = (R+r)sinθ − d·sin(k·θ)
 *     inside  (hypotrochoid): x = (R−r)cosθ + d·cos(k·θ),   y = (R−r)sinθ − d·sin(k·θ)
 * With d = r the pen is on the rim and the curve is cusped (the cusp page); with d = 0 the pen is at the
 * centre and draws the plain deferent circle; between, the cusps round into petals — the dense rosette a
 * Spirograph toy draws. The ratio still rules the count: reduce R:r to p:q and the figure has p outer
 * lobes, closing after q turns of the wheel. The offset d sets only how deep the petals cut — shallow
 * scallops near the centre, loops that cross themselves near the rim. A little SLIP detunes the rolling
 * rate off the rational k, and the rosette never closes: it precesses, each pass rotated. All computed
 * from R, r, d and the slip each frame. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  const S = {
    R: 7, r: 3, mode: 'in', off: 72, slip: 0,
    u: 0, playing: false, dragging: false, showWheel: true,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'epicycle-rosette';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ R: S.R, r: S.r, mode: S.mode, off: S.off, slip: S.slip, showWheel: S.showWheel })); } catch (_) {} };
  const stored = load();
  if (typeof stored.R === 'number') S.R = Math.max(2, Math.min(9, Math.round(stored.R)));
  if (typeof stored.r === 'number') S.r = Math.max(1, Math.min(6, Math.round(stored.r)));
  if (stored.mode === 'in' || stored.mode === 'out') S.mode = stored.mode;
  if (typeof stored.off === 'number') S.off = Math.max(0, Math.min(100, Math.round(stored.off)));
  if (typeof stored.slip === 'number') S.slip = Math.max(-40, Math.min(40, Math.round(stored.slip)));
  if (typeof stored.showWheel === 'boolean') S.showWheel = stored.showWheel;
  if (S.mode === 'in' && S.r >= S.R) S.r = S.R - 1;

  let C = {};
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), rule: g('--rule'),
      ink: g('--ink'), inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'),
      ring: g('--brass'), ring2: g('--brass-2'),
      wheel: g('--steel'), wheel2: g('--steel-2'),
      pen: g('--spring'), pen2: g('--spring-2'),
      keep: g('--keep'), drift: g('--drift'),
    };
  }
  readColors();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', readColors);

  const cv = $('fig');
  const BASE_W = 520, BASE_H = 460;
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

  // ---------- helpers ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  function withA(hex, a) {
    const c = hex.replace('#', ''); if (c.length < 6) return hex;
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  }

  function ratio() { const g = gcd(S.R, S.r); return { p: S.R / g, q: S.r / g }; }
  const out = () => S.mode === 'out';
  const base = () => out() ? (S.R + S.r) : (S.R - S.r);
  function k() { return (out() ? (S.R + S.r) : (S.R - S.r)) / S.r; }
  function kEff() { return k() + S.slip / 100; }
  const dist = () => S.r * S.off / 100;       // pen offset d from the wheel centre, world units

  function pen(th) {
    const b = base(), ke = kEff(), d = dist();
    if (out()) return { x: b * Math.cos(th) - d * Math.cos(ke * th), y: b * Math.sin(th) - d * Math.sin(ke * th) };
    return { x: b * Math.cos(th) + d * Math.cos(ke * th), y: b * Math.sin(th) - d * Math.sin(ke * th) };
  }
  function centre(th) { const b = base(); return { x: b * Math.cos(th), y: b * Math.sin(th) }; }

  function period() { return TAU * ratio().q; }
  function span() { return S.slip !== 0 ? period() * 3 : period(); }

  // ---------- fit ----------
  function worldMax() { return out() ? (S.R + 2 * S.r) : Math.max(S.R, 1); }
  function frame(w, h) {
    const cx = w / 2, cy = h / 2;
    const scale = (Math.min(w, h) / 2 - 26) / worldMax();
    return { cx, cy, scale, X: (x) => cx + x * scale, Y: (y) => cy - y * scale };
  }

  // ---------- drawing ----------
  function drawRings(ctx, F) {
    ctx.strokeStyle = withA(C.ring, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(F.cx, F.cy, S.R * F.scale, 0, TAU); ctx.stroke();
    ctx.strokeStyle = withA(C.ring, 0.28); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(F.cx, F.cy, Math.abs(base()) * F.scale, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = withA(C.ink, 0.5); ctx.beginPath(); ctx.arc(F.cx, F.cy, 2, 0, TAU); ctx.fill();
  }

  function drawCurve(ctx, F) {
    const N = 1600, sp = span();
    ctx.strokeStyle = withA(C.pen, 0.42); ctx.lineWidth = 1.7; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = pen(sp * i / N); i ? ctx.lineTo(F.X(p.x), F.Y(p.y)) : ctx.moveTo(F.X(p.x), F.Y(p.y)); }
    ctx.stroke();
    const TR = 170, dth = sp / N;
    ctx.lineWidth = 2.6; ctx.strokeStyle = C.pen; ctx.beginPath();
    for (let i = 0; i <= TR; i++) {
      const th = S.u - (TR - i) * dth; const p = pen(th);
      i ? ctx.lineTo(F.X(p.x), F.Y(p.y)) : ctx.moveTo(F.X(p.x), F.Y(p.y));
    }
    ctx.stroke();
  }

  function drawWheel(ctx, F) {
    if (!S.showWheel) { drawPen(ctx, F); return; }
    const c = centre(S.u), p = pen(S.u);
    ctx.strokeStyle = withA(C.wheel, 0.9); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), S.r * F.scale, 0, TAU); ctx.stroke();
    // the offset circle the pen rides (radius d about the centre)
    ctx.strokeStyle = withA(C.wheel, 0.3); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), dist() * F.scale, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.wheel2; ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = withA(C.wheel2, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(F.X(c.x), F.Y(c.y)); ctx.lineTo(F.X(p.x), F.Y(p.y)); ctx.stroke();
    drawPen(ctx, F);
  }
  function drawPen(ctx, F) {
    const p = pen(S.u);
    ctx.fillStyle = C.pen2; ctx.beginPath(); ctx.arc(F.X(p.x), F.Y(p.y), 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(F.X(p.x), F.Y(p.y), 5, 0, TAU); ctx.stroke();
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    const F = frame(w, h);
    drawRings(ctx, F);
    drawCurve(ctx, F);
    drawWheel(ctx, F);
    setVerdict();
  }

  // ---------- naming ----------
  // how the petals sit: a plain circle at the centre, scallops shallow, loops when the pen reaches out far
  function figureKind() {
    const f = S.off / 100;
    if (f <= 0.02) return { name: 'a plain circle — the deferent', kind: 'circle' };
    if (f >= 0.98) return { name: 'cusped — on the rim, ' + (out() ? 'an epicycloid' : 'a hypocycloid'), kind: 'cusp' };
    // loops cross themselves when the pen outreaches the rolling-to-centre gap
    const looped = out() ? true : dist() > (S.R - 2 * S.r);
    return { name: ratio().p + '-petal rosette, ' + (looped ? 'looped' : 'scalloped'), kind: 'rosette' };
  }

  // ---------- readings ----------
  function updateReading() {
    const { p, q } = ratio();
    $('r-ratio').textContent = p + ' : ' + q;
    $('r-lobes').textContent = S.slip !== 0 ? '— drifting' : String(p);
    $('r-close').textContent = S.slip !== 0 ? 'never — slipping' : (q === 1 ? 'one turn' : q + ' turns');
    $('r-off').textContent = (S.off / 100).toFixed(2) + ' r';
    $('r-kind').textContent = figureKind().name;
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-closed', 'v-named', 'v-open', 'v-rest');
    const fk = figureKind(), { p } = ratio();
    if (S.slip !== 0) {
      vEl.classList.add('v-open');
      vt.textContent = 'Slipping — the rosette will not close, it precesses';
    } else if (fk.kind === 'circle' || fk.kind === 'cusp') {
      vEl.classList.add('v-named');
      vt.textContent = fk.kind === 'circle' ? 'A plain circle — the pen at the centre' : 'Cusped — the pen out on the rim';
    } else {
      vEl.classList.add('v-closed');
      vt.textContent = 'A closed rosette — ' + p + ' petal' + (p === 1 ? '' : 's') + (out() ? ', outside' : ', inside');
    }
    vs.textContent = S.playing ? 'winding' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.playing && !RM.matches) {
      S.u += period() / 420;                              // a touch slower — the rosette is denser
      if (S.slip === 0 && S.u >= period()) S.u -= period();
      else if (S.slip !== 0 && S.u > span() * 4) S.u -= span() * 3;
      draw();
    }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    if (p && RM.matches) p = false;
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Wind';
  }

  // ---------- controls ----------
  const REl = $('ring'), rEl = $('wheel'), offEl = $('off'), slEl = $('slip');
  function rMax() { return S.mode === 'in' ? Math.max(1, S.R - 1) : 6; }
  function clampWheel() { const m = rMax(); if (S.r > m) S.r = m; rEl.max = m; }
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    clampWheel();
    $('ring-v').textContent = S.R; $('wheel-v').textContent = S.r;
    $('off-v').textContent = (S.off / 100).toFixed(2); $('slip-v').textContent = (S.slip / 100).toFixed(2);
    REl.value = S.R; rEl.value = S.r; offEl.value = S.off; slEl.value = S.slip;
    fillSlider(REl, S.R, 2, 9); fillSlider(rEl, S.r, 1, 6); fillSlider(offEl, S.off, 0, 100); fillSlider(slEl, S.slip, -40, 40);
    $('mode-btn').textContent = S.mode === 'out' ? 'Rolling outside' : 'Rolling inside';
    $('mode-btn').setAttribute('aria-pressed', S.mode === 'in' ? 'true' : 'false');
    $('wheel-btn').setAttribute('aria-pressed', S.showWheel ? 'true' : 'false');
  }
  function changed() { S.u = 0; syncLabels(); updateReading(); save(); draw(); }

  REl.addEventListener('input', () => { S.R = +REl.value; if (S.mode === 'in' && S.r >= S.R) S.r = S.R - 1; changed(); });
  rEl.addEventListener('input', () => { S.r = Math.min(+rEl.value, rMax()); changed(); });
  offEl.addEventListener('input', () => { S.off = +offEl.value; syncLabels(); updateReading(); save(); draw(); });
  slEl.addEventListener('input', () => { S.slip = +slEl.value; syncLabels(); updateReading(); save(); draw(); });

  $('mode-btn').addEventListener('click', () => { S.mode = out() ? 'in' : 'out'; if (S.mode === 'in' && S.r >= S.R) S.r = S.R - 1; changed(); });
  $('wheel-btn').addEventListener('click', () => { S.showWheel = !S.showWheel; save(); syncLabels(); draw(); });
  $('run-btn').addEventListener('click', () => setPlaying(!S.playing));

  // ---------- drag to scrub ----------
  function worldFromEvent(e) {
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const F = frame(BASE_W, BASE_H);
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    const sy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / sc;
    return { x: (sx - F.cx) / F.scale, y: -(sy - F.cy) / F.scale };
  }
  function scrubTo(q) {
    const sp = span(); let best = S.u, bd = 1e18; const N = 1200;
    for (let i = 0; i <= N; i++) { const th = sp * i / N; const p = pen(th); const dd = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (dd < bd) { bd = dd; best = th; } }
    S.u = best;
  }
  function startDrag(e) { S.dragging = true; setPlaying(false); scrubTo(worldFromEvent(e)); draw(); cv.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; scrubTo(worldFromEvent(e)); draw(); e.preventDefault(); }
  function endDrag() { if (S.dragging) { S.dragging = false; cv.style.cursor = 'crosshair'; } }
  cv.style.cursor = 'crosshair';
  cv.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  cv.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!S.playing); }
    else if (e.key === 'i' || e.key === 'I') { e.preventDefault(); $('mode-btn').click(); }
    else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); $('wheel-btn').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); S.off = Math.max(0, S.off - 4); offEl.value = S.off; syncLabels(); updateReading(); save(); draw(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); S.off = Math.min(100, S.off + 4); offEl.value = S.off; syncLabels(); updateReading(); save(); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); S.r = Math.min(rMax(), S.r + 1); changed(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); S.r = Math.max(1, S.r - 1); changed(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setPlaying(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  S.u = RM.matches ? period() * 0.4 : 0;
  syncLabels(); updateReading(); draw();
  if (live) {
    const { p, q } = ratio(), fk = figureKind();
    live.textContent = `A spirograph figure: a wheel of radius ${S.r} rolling ${out() ? 'outside' : 'inside'} a fixed ring of radius ${S.R}, with the pen held ${(S.off / 100).toFixed(2)} of the way out to the rim. The radii reduce to ${p} to ${q}, so the pen winds ${fk.name}, closing after ${q === 1 ? 'one turn' : q + ' turns'}. Press space to wind it, I to roll inside or outside, W to show or hide the wheel, and the arrow keys to change the pen offset and the wheel.`;
  }
  requestAnimationFrame(tick);
})();
