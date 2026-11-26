/* Cusp — the curve a point on a rolling wheel's rim writes, rolled on a fixed ring.
 *
 * A wheel of radius r rolls without slipping on a fixed ring of radius R. A pen fixed to the wheel's
 * rim traces a roulette: rolled on the OUTSIDE, an epicycloid; on the INSIDE, a hypocycloid. The centre
 * of the wheel rides a circle of radius R+r (outside) or R−r (inside) — the deferent — while the wheel
 * turns under it at a rate set by the no-slip condition, (R±r)/r turns of its own for each turn of the
 * centre. Writing k = (R±r)/r, the pen is
 *     outside:  x = (R+r)cosθ − r·cos(k·θ),   y = (R+r)sinθ − r·sin(k·θ)
 *     inside:   x = (R−r)cosθ + r·cos(k·θ),   y = (R−r)sinθ − r·sin(k·θ)
 * Reduce R:r to lowest terms p:q. The curve has p cusps and closes after q turns of the centre round
 * the ring. The cusps are the instants the pen is momentarily at rest against the ring — a point of the
 * rim touching down — and counting them reads the ratio straight off the figure. Special ratios have
 * names: outside, 1 cusp is a cardioid and 2 a nephroid; inside, 3 a deltoid, 4 an astroid, and 2 the
 * Tusi couple, which collapses to a straight diameter run back and forth. Add a little SLIP and the
 * rolling rate is no longer the rational k: the curve never closes, and each pass lands rotated — the
 * star precesses, an open figure drifting round. Everything is computed from R, r and the slip each
 * frame; nothing is canned. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  const S = {
    R: 5, r: 2, mode: 'out', slip: 0,
    u: 0, playing: false, dragging: false, showCusps: true,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'epicycle-cusp';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ R: S.R, r: S.r, mode: S.mode, slip: S.slip, showCusps: S.showCusps })); } catch (_) {} };
  const stored = load();
  if (typeof stored.R === 'number') S.R = Math.max(2, Math.min(9, Math.round(stored.R)));
  if (typeof stored.r === 'number') S.r = Math.max(1, Math.min(6, Math.round(stored.r)));
  if (stored.mode === 'in' || stored.mode === 'out') S.mode = stored.mode;
  if (typeof stored.slip === 'number') S.slip = Math.max(-40, Math.min(40, Math.round(stored.slip)));
  if (typeof stored.showCusps === 'boolean') S.showCusps = stored.showCusps;
  // internal rolling needs the wheel smaller than the ring
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

  // reduced ratio p:q, cusp count p, closure q
  function ratio() { const g = gcd(S.R, S.r); return { p: S.R / g, q: S.r / g }; }
  const out = () => S.mode === 'out';
  const base = () => out() ? (S.R + S.r) : (S.R - S.r);   // deferent radius, world units
  function k() { return (out() ? (S.R + S.r) : (S.R - S.r)) / S.r; } // = (R±r)/r, the no-slip rolling rate
  function kEff() { return k() + S.slip / 100; }

  // pen position in world units for roll-angle θ (centre angle)
  function pen(th) {
    const b = base(), ke = kEff();
    if (out()) return { x: b * Math.cos(th) - S.r * Math.cos(ke * th), y: b * Math.sin(th) - S.r * Math.sin(ke * th) };
    return { x: b * Math.cos(th) + S.r * Math.cos(ke * th), y: b * Math.sin(th) - S.r * Math.sin(ke * th) };
  }
  function centre(th) { const b = base(); return { x: b * Math.cos(th), y: b * Math.sin(th) }; }

  // closure period in θ (centre angle): q turns of the centre
  function period() { return TAU * ratio().q; }
  // how far round to draw: one closure, or several when slipping so the drift shows
  function span() { return S.slip !== 0 ? period() * 3 : period(); }

  // ---------- geometry / fit ----------
  function worldMax() {
    // outside: pen can reach R+2r from the centre; inside: within R
    return out() ? (S.R + 2 * S.r) : Math.max(S.R, 1);
  }
  function frame(w, h) {
    const cx = w / 2, cy = h / 2;
    const scale = (Math.min(w, h) / 2 - 26) / worldMax();
    return { cx, cy, scale, X: (x) => cx + x * scale, Y: (y) => cy - y * scale };
  }

  // ---------- drawing ----------
  function drawRings(ctx, F) {
    // fixed ring
    ctx.strokeStyle = withA(C.ring, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(F.cx, F.cy, S.R * F.scale, 0, TAU); ctx.stroke();
    // faint deferent (path of the wheel centre) + centre dot
    ctx.strokeStyle = withA(C.ring, 0.28); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(F.cx, F.cy, Math.abs(base()) * F.scale, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = withA(C.ink, 0.5); ctx.beginPath(); ctx.arc(F.cx, F.cy, 2, 0, TAU); ctx.fill();
  }

  function drawCurve(ctx, F) {
    const N = 1400, sp = span();
    // full faint figure
    ctx.strokeStyle = withA(C.pen, 0.4); ctx.lineWidth = 1.7; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const p = pen(sp * i / N); i ? ctx.lineTo(F.X(p.x), F.Y(p.y)) : ctx.moveTo(F.X(p.x), F.Y(p.y)); }
    ctx.stroke();
    // bright leading trail behind the pen
    const TR = 150, dth = sp / N;
    ctx.lineWidth = 2.6; ctx.strokeStyle = C.pen; ctx.beginPath();
    for (let i = 0; i <= TR; i++) {
      const th = S.u - (TR - i) * dth; const p = pen(th);
      i ? ctx.lineTo(F.X(p.x), F.Y(p.y)) : ctx.moveTo(F.X(p.x), F.Y(p.y));
    }
    ctx.stroke();
  }

  function drawCusps(ctx, F) {
    if (!S.showCusps || S.slip !== 0) return;
    const { p, q } = ratio();
    // cusps are where the pen touches the fixed ring: θ at multiples that put the rim point down.
    // outside: at θ = 2π·j·q/p (j = 0..p-1) the pen sits on the ring; inside likewise.
    // a cusp falls where the pen meets the fixed ring: θ_j = 2π·j·q/p, for j = 0 … p−1
    ctx.fillStyle = withA(C.ring2, 0.95);
    for (let j = 0; j < p; j++) {
      const pt = pen(TAU * j * q / p);
      ctx.beginPath(); ctx.arc(F.X(pt.x), F.Y(pt.y), 3.2, 0, TAU); ctx.fill();
    }
  }

  function drawWheel(ctx, F) {
    const c = centre(S.u), p = pen(S.u);
    // rolling wheel
    ctx.strokeStyle = withA(C.wheel, 0.95); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), S.r * F.scale, 0, TAU); ctx.stroke();
    // wheel centre
    ctx.fillStyle = C.wheel2; ctx.beginPath(); ctx.arc(F.X(c.x), F.Y(c.y), 2.6, 0, TAU); ctx.fill();
    // spoke to the pen
    ctx.strokeStyle = withA(C.wheel2, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(F.X(c.x), F.Y(c.y)); ctx.lineTo(F.X(p.x), F.Y(p.y)); ctx.stroke();
    // the pen
    ctx.fillStyle = C.pen2; ctx.beginPath(); ctx.arc(F.X(p.x), F.Y(p.y), 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(F.X(p.x), F.Y(p.y), 5, 0, TAU); ctx.stroke();
  }

  function draw() {
    const { ctx, w, h } = fit(cv, BASE_W, BASE_H);
    ctx.clearRect(0, 0, w, h);
    const F = frame(w, h);
    drawRings(ctx, F);
    drawCurve(ctx, F);
    drawCusps(ctx, F);
    drawWheel(ctx, F);
    setVerdict();
  }

  // ---------- naming ----------
  function curveName() {
    const { p, q } = ratio();
    const simple = q === 1;             // integer radius ratio
    if (out()) {
      if (simple && p === 1) return { name: 'cardioid', famous: true };
      if (simple && p === 2) return { name: 'nephroid', famous: true };
      return { name: 'epicycloid' + (simple ? '' : ', ' + p + ':' + q), famous: false };
    } else {
      if (simple && p === 2) return { name: 'Tusi couple — a straight line', famous: true };
      if (simple && p === 3) return { name: 'deltoid', famous: true };
      if (simple && p === 4) return { name: 'astroid', famous: true };
      return { name: 'hypocycloid' + (simple ? '' : ', ' + p + ':' + q), famous: false };
    }
  }

  // ---------- readings ----------
  function updateReading() {
    const { p, q } = ratio();
    $('r-ratio').textContent = p + ' : ' + q;
    $('r-cusps').textContent = S.slip !== 0 ? '— drifting' : String(p);
    $('r-close').textContent = S.slip !== 0 ? 'never — slipping' : (q === 1 ? 'one turn' : q + ' turns');
    $('r-kind').textContent = curveName().name;
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-closed', 'v-named', 'v-open', 'v-rest');
    const nm = curveName(), { p } = ratio();
    if (S.slip !== 0) {
      vEl.classList.add('v-open');
      vt.textContent = 'Slipping — the star will not close, it precesses';
    } else if (nm.famous) {
      vEl.classList.add('v-named');
      vt.textContent = 'A ' + nm.name + (out() ? ' — rolled outside' : ' — rolled inside');
    } else {
      vEl.classList.add('v-closed');
      vt.textContent = 'A closed star — ' + p + ' cusp' + (p === 1 ? '' : 's') + ', ' + (out() ? 'epicycloid' : 'hypocycloid');
    }
    vs.textContent = S.playing ? 'rolling' : (S.dragging ? 'by hand' : 'ready');
  }

  // ---------- animation ----------
  function tick() {
    if (S.playing && !RM.matches) {
      S.u += period() / 360;                              // a closure takes ~6 s at 60 fps
      if (S.slip === 0 && S.u >= period()) S.u -= period();
      else if (S.slip !== 0 && S.u > span() * 4) S.u -= span() * 3;
      draw();
    }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    if (p && RM.matches) p = false;
    S.playing = p; $('run-btn').setAttribute('aria-pressed', p ? 'true' : 'false');
    $('run-btn').textContent = p ? 'Pause' : 'Roll';
  }

  // ---------- controls ----------
  const REl = $('ring'), rEl = $('wheel'), slEl = $('slip');
  function rMax() { return S.mode === 'in' ? Math.max(1, S.R - 1) : 6; }
  function clampWheel() { const m = rMax(); if (S.r > m) S.r = m; rEl.max = m; }
  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function syncLabels() {
    clampWheel();
    $('ring-v').textContent = S.R; $('wheel-v').textContent = S.r;
    $('slip-v').textContent = (S.slip / 100).toFixed(2);
    REl.value = S.R; rEl.value = S.r; slEl.value = S.slip;
    fillSlider(REl, S.R, 2, 9); fillSlider(rEl, S.r, 1, 6); fillSlider(slEl, S.slip, -40, 40);
    $('mode-btn').textContent = S.mode === 'out' ? 'Rolling outside' : 'Rolling inside';
    $('mode-btn').setAttribute('aria-pressed', S.mode === 'in' ? 'true' : 'false');
    $('cusp-btn').setAttribute('aria-pressed', S.showCusps ? 'true' : 'false');
  }
  function changed() { S.u = 0; S.playing && setPlaying(S.playing); syncLabels(); updateReading(); save(); draw(); }

  REl.addEventListener('input', () => { S.R = +REl.value; if (S.mode === 'in' && S.r >= S.R) S.r = S.R - 1; changed(); });
  rEl.addEventListener('input', () => { S.r = Math.min(+rEl.value, rMax()); changed(); });
  slEl.addEventListener('input', () => { S.slip = +slEl.value; syncLabels(); updateReading(); save(); draw(); });

  $('mode-btn').addEventListener('click', () => { S.mode = out() ? 'in' : 'out'; if (S.mode === 'in' && S.r >= S.R) S.r = S.R - 1; changed(); });
  $('cusp-btn').addEventListener('click', () => { S.showCusps = !S.showCusps; save(); syncLabels(); draw(); });
  $('run-btn').addEventListener('click', () => setPlaying(!S.playing));

  // ---------- drag to scrub the pen along the curve ----------
  function worldFromEvent(e) {
    const rect = cv.getBoundingClientRect(); const sc = rect.width / BASE_W;
    const F = frame(BASE_W, BASE_H);
    const sx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / sc;
    const sy = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / sc;
    return { x: (sx - F.cx) / F.scale, y: -(sy - F.cy) / F.scale };
  }
  function scrubTo(q) {
    const sp = span(); let best = S.u, bd = 1e18; const N = 900;
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
    else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); $('cusp-btn').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); S.R = Math.max(2, S.R - 1); if (S.mode === 'in' && S.r >= S.R) S.r = S.R - 1; changed(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); S.R = Math.min(9, S.R + 1); changed(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); S.r = Math.min(rMax(), S.r + 1); changed(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); S.r = Math.max(1, S.r - 1); changed(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => { if (RM.matches) setPlaying(false); draw(); });
  window.addEventListener('resize', draw);

  // ---------- opening state ----------
  S.u = RM.matches ? period() * 0.33 : 0;
  syncLabels(); updateReading(); draw();
  if (live) {
    const { p, q } = ratio(), nm = curveName();
    live.textContent = `A wheel of radius ${S.r} rolling ${out() ? 'outside' : 'inside'} a fixed ring of radius ${S.R}, with a pen on its rim. The radii reduce to ${p} to ${q}, so the pen writes a ${nm.name} with ${p} cusp${p === 1 ? '' : 's'}, closing after ${q === 1 ? 'one turn' : q + ' turns'} of the wheel around the ring. Press space to roll it, I to move the wheel inside or outside the ring, C to mark the cusps, and the arrow keys to change the two radii.`;
  }
  requestAnimationFrame(tick);
})();
