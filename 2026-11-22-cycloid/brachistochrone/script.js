/* Brachistochrone — the cycloid as the curve of quickest descent.
 *
 * A frictionless bead released from rest at A slides to B under gravity. Its speed depends only on
 * how far it has fallen: v = sqrt(2 g y), y the drop below A. The time down a track y(s) is
 *     T = integral ds / v = integral ds / sqrt(2 g y(s)),
 * and the track that minimises it is an inverted cycloid with its cusp at A:
 *     x = a(theta - sin theta),  y = a(1 - cos theta),
 * with a and the sweep theta_B fixed so the curve threads from A to B. We race three honest tracks —
 * a straight line, a circular arc tangent to the vertical at A, and that cycloid — by integrating the
 * real constrained dynamics (tangential acceleration g * dy/ds, started from rest) in a fixed world
 * frame, so the drawn race and the reported times are one computation. The cycloid wins; and when B is
 * far to the side its theta_B exceeds pi, so the curve dips BELOW B and climbs back — least time is not
 * least distance. All geometry is in world units (560 x 330) scaled uniformly to the canvas. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const WORLD_W = 560, WORLD_H = 330;
  const A = { x: 64, y: 46 };               // start, world units
  const G = 1400;                            // gravity, world px / s^2
  const REC = 1 / 120;                       // playback sample step

  const S = {
    reach: 320, drop: 150,
    playing: false, t0: 0, elapsed: 0, done: false,
    dragging: false,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'cycloid-brach';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ reach: S.reach, drop: S.drop })); } catch (_) {} };
  const stored = load();
  if (typeof stored.reach === 'number') S.reach = Math.max(120, Math.min(420, stored.reach));
  if (typeof stored.drop === 'number') S.drop = Math.max(40, Math.min(220, stored.drop));

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

  // ---------- track construction (world units) ----------
  function makeTrack(points) {
    const s = [0];
    for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    const L = s[s.length - 1] || 1;
    const posAt = (d) => {
      d = Math.max(0, Math.min(L, d));
      let lo = 0, hi = points.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < d) lo = m + 1; else hi = m; }
      const i = Math.max(1, lo), t = (d - s[i - 1]) / ((s[i] - s[i - 1]) || 1);
      return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t };
    };
    return { points, L, posAt, depthAt: (d) => posAt(d).y - A.y };
  }

  function lineTrack(B) {
    const pts = []; const N = 160;
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t }); }
    return makeTrack(pts);
  }

  function circleTrack(B) {
    // circle through A and B, tangent to the vertical at A: centre level with A
    const bx = B.x - A.x, by = B.y - A.y;
    const R = (bx * bx + by * by) / (2 * bx);
    const cx = A.x + R, cy = A.y;
    const angA = Math.PI;                         // A sits left of centre
    const angB = Math.atan2(B.y - cy, B.x - cx);  // in (0, pi)
    const pts = []; const N = 180;
    for (let i = 0; i <= N; i++) { const ang = angA + (angB - angA) * i / N; pts.push({ x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) }); }
    return makeTrack(pts);
  }

  function cycloidTrack(B) {
    const bx = B.x - A.x, by = B.y - A.y;
    const ratio = bx / by;                         // (theta - sin)/(1 - cos)
    let lo = 1e-4, hi = TAU - 1e-4;
    const f = (th) => (th - Math.sin(th)) / (1 - Math.cos(th));
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m) < ratio) lo = m; else hi = m; }
    const thB = (lo + hi) / 2;
    const a = by / (1 - Math.cos(thB));
    const pts = []; const N = 200;
    for (let i = 0; i <= N; i++) { const th = thB * i / N; pts.push({ x: A.x + a * (th - Math.sin(th)), y: A.y + a * (1 - Math.cos(th)) }); }
    return makeTrack(pts, thB);
  }

  // ---------- simulate one descent: real constrained dynamics from rest ----------
  function simulate(track) {
    const dt = 1 / 480, maxT = 15, ds = 0.6;
    let s = 0, v = 0, t = 0;
    const rec = [0];
    let nextRec = REC;
    while (s < track.L && t < maxT) {
      const p0 = track.posAt(s), p1 = track.posAt(Math.min(track.L, s + ds));
      const dl = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      const sinb = (p1.y - p0.y) / dl;             // downward component per unit length
      v += G * sinb * dt;
      if (v < 0) v = 0;
      s += v * dt; t += dt;
      while (nextRec <= t) { rec.push(Math.min(s, track.L)); nextRec += REC; }
    }
    rec.push(track.L);
    return { T: t, rec, L: track.L };
  }

  // ---------- build & solve the current geometry ----------
  let tracks = null, sims = null, Tmax = 1, order = null;
  function rebuild() {
    const B = { x: A.x + S.reach, y: A.y + S.drop };
    tracks = {
      line: lineTrack(B),
      arc: circleTrack(B),
      cyc: cycloidTrack(B),
      B,
    };
    sims = { line: simulate(tracks.line), arc: simulate(tracks.arc), cyc: simulate(tracks.cyc) };
    Tmax = Math.max(sims.line.T, sims.arc.T, sims.cyc.T);
    order = [['line', sims.line.T], ['arc', sims.arc.T], ['cyc', sims.cyc.T]].sort((p, q) => p[1] - q[1]);
    // does the cycloid dip below B?
    let maxY = -1e9; tracks.cyc.points.forEach(p => { if (p.y > maxY) maxY = p.y; });
    tracks.cycDips = maxY > B.y + 1.5;
    updateTimes();
  }

  function sampleRec(sim, elapsed) {
    const idx = Math.floor(elapsed / REC);
    return idx < sim.rec.length ? sim.rec[idx] : sim.L;
  }

  // ---------- drawing ----------
  function drawMech() {
    const { ctx, w, h } = fit(mech, WORLD_W, WORLD_H);
    ctx.clearRect(0, 0, w, h);
    const k = w / WORLD_W;
    const SX = (x) => x * k, SY = (y) => y * k;

    // horizontal reference at B's level (to read the cycloid's dip below it)
    ctx.strokeStyle = withA(C.steel, 0.4); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(SX(A.x) - 6, SY(tracks.B.y)); ctx.lineTo(w - 6, SY(tracks.B.y)); ctx.stroke(); ctx.setLineDash([]);

    const drawPath = (track, style, lw, dash) => {
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
      ctx.beginPath();
      track.points.forEach((p, i) => i ? ctx.lineTo(SX(p.x), SY(p.y)) : ctx.moveTo(SX(p.x), SY(p.y)));
      ctx.stroke(); ctx.setLineDash([]);
    };
    drawPath(tracks.line, withA(C.steel, 0.85), 1.6);
    drawPath(tracks.arc, withA(C.drift, 0.9), 1.8);
    drawPath(tracks.cyc, C.copper, 2.6);

    // start & target
    const a = { x: SX(A.x), y: SY(A.y) }, b = { x: SX(tracks.B.x), y: SY(tracks.B.y) };
    ctx.fillStyle = C.brass2; ctx.beginPath(); ctx.arc(a.x, a.y, 5, 0, TAU); ctx.fill();
    label(ctx, 'A', a.x - 12, a.y - 2, C.brass2, 'center');
    ctx.fillStyle = C.keep; ctx.beginPath(); ctx.arc(b.x, b.y, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, 'B', b.x + 13, b.y + 2, C.keep, 'center');

    // beads
    const beadOrder = [['line', C.steel2], ['arc', C.drift], ['cyc', C.copper2]];
    let elapsed = S.elapsed;
    if (RM.matches && !S.playing && !S.done) elapsed = Tmax * 0.52; // a settled mid-race still
    beadOrder.forEach(([key, col]) => {
      const sim = sims[key], track = tracks[key];
      const s = sampleRec(sim, elapsed);
      const p = track.posAt(s);
      const finished = elapsed >= sim.T - 1e-3;
      ctx.fillStyle = finished ? C.keep : col;
      ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), key === 'cyc' ? 6 : 5, 0, TAU); ctx.fill();
      if (finished) { ctx.strokeStyle = C.keep; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), 9, 0, TAU); ctx.stroke(); }
    });

    // gravity hint
    label(ctx, 'g ↓', w - 22, 16, C.inkFaint, 'center');
    if (tracks.cycDips) label(ctx, 'cycloid dips below B →', SX(A.x) + 2, h - 14, C.copper2, 'left');
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

  // ---------- the race chart: fraction completed vs time ----------
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 150);
    ctx.clearRect(0, 0, w, h);
    const padL = 36, padR = 20, padT = 16, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const X = (t) => x0 + (x1 - x0) * Math.min(1, t / Tmax);
    const Y = (f) => y1 - (y1 - y0) * f;

    // frame + finish line
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = withA(C.keep, 0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'finish', x0 + 2, y0 - 2, C.keep, 'left');
    label(ctx, 'start', x0 + 2, y1 + 12, C.inkFaint, 'left');

    const curves = [['line', withA(C.steel, 0.9), 'line'], ['arc', withA(C.drift, 0.95), 'arc'], ['cyc', C.copper, 'cycloid']];
    curves.forEach(([key, col, name]) => {
      const sim = sims[key];
      ctx.strokeStyle = col; ctx.lineWidth = key === 'cyc' ? 2.4 : 1.8;
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const t = Tmax * i / steps;
        const s = sampleRec(sim, t), f = s / sim.L;
        const px = X(t), py = Y(f);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      // finish dot (the per-track times live in the readout panel beside the bench)
      const fx = X(sim.T);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx, Y(1), 3.4, 0, TAU); ctx.fill();
    });
    label(ctx, 'line', x1 - 2, Y(0.12), withA(C.steel, 0.95), 'right');
    label(ctx, 'arc', x1 - 2, Y(0.26), withA(C.drift, 0.95), 'right');
    label(ctx, 'cycloid', x1 - 2, Y(0.40), C.copper, 'right');

    // time cursor
    if (S.playing || S.done) {
      const cx = X(Math.min(Tmax, S.elapsed));
      ctx.strokeStyle = withA(C.ink, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke(); ctx.setLineDash([]);
    }
    // time axis ticks
    for (let tt = 0; tt <= Tmax + 1e-6; tt += Math.max(0.5, Math.round(Tmax / 3 * 2) / 2)) {
      label(ctx, tt.toFixed(1) + 's', X(tt), y1 + 12, C.inkFaint, 'center');
    }
  }

  // ---------- readouts ----------
  function updateTimes() {
    $('r-line').textContent = sims.line.T.toFixed(2) + ' s';
    $('r-arc').textContent = sims.arc.T.toFixed(2) + ' s';
    $('r-cyc').textContent = sims.cyc.T.toFixed(2) + ' s';
    const lineT = sims.line.T, cyc = sims.cyc.T;
    const gain = (lineT - cyc), pct = lineT > 0 ? gain / lineT * 100 : 0;
    $('r-margin').textContent = gain > 0.004 ? gain.toFixed(2) + ' s  (' + pct.toFixed(0) + '%)' : '—';
  }

  function setVerdict() {
    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-mid', 'v-turn', 'v-dead', 'v-rest');
    if (!S.playing && !S.done) {
      vEl.classList.add('v-rest'); vt.textContent = tracks.cycDips ? 'Ready — note the cycloid diving below B' : 'Ready — drop the beads'; vs.textContent = 'ready';
      return;
    }
    if (S.done) { vEl.classList.add('v-mid'); vt.textContent = 'The cycloid home first — by ' + (order[1][1] - sims.cyc.T).toFixed(2) + ' s over the arc'; vs.textContent = 'finished'; return; }
    // leader by progress toward its own finish
    const fr = (key) => sampleRec(sims[key], S.elapsed) / sims[key].L;
    const cycLeads = fr('cyc') >= fr('line') && fr('cyc') >= fr('arc');
    vEl.classList.add(cycLeads ? 'v-mid' : 'v-turn');
    vt.textContent = cycLeads ? 'The cycloid out front, having plunged first' : 'Racing — the line ahead on distance, not for long';
    vs.textContent = 'racing';
  }

  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }

  function draw() { drawMech(); drawTrace(); setVerdict(); }

  // ---------- animation ----------
  function tick(t) {
    if (S.playing && !RM.matches) {
      if (!S.t0) S.t0 = t;
      S.elapsed = (t - S.t0) / 1000;
      if (S.elapsed >= Tmax) { S.elapsed = Tmax; S.playing = false; S.done = true; announceResult(); }
      draw();
    }
    requestAnimationFrame(tick);
  }

  function drop() {
    if (RM.matches) { S.done = true; S.playing = false; S.elapsed = Tmax; draw(); announceResult(); return; }
    S.playing = true; S.done = false; S.t0 = 0; S.elapsed = 0; draw();
  }
  function reset() { S.playing = false; S.done = false; S.t0 = 0; S.elapsed = 0; draw(); }

  function announceResult() {
    if (!live) return;
    live.textContent = `Finished. Straight ${sims.line.T.toFixed(2)}, arc ${sims.arc.T.toFixed(2)}, cycloid ${sims.cyc.T.toFixed(2)} seconds. The cycloid wins by ${(order[1][1] - sims.cyc.T).toFixed(2)} seconds.` + (tracks.cycDips ? ' It dipped below the target on the way.' : '');
  }

  // ---------- controls ----------
  const reachEl = $('reach'), dropEl = $('drop');
  reachEl.value = S.reach; dropEl.value = S.drop;
  function syncLabels() {
    $('reach-v').textContent = S.reach; $('drop-v').textContent = S.drop;
    fillSlider(reachEl, S.reach, 120, 420); fillSlider(dropEl, S.drop, 40, 220);
  }
  reachEl.addEventListener('input', () => { S.reach = +reachEl.value; syncLabels(); save(); rebuild(); reset(); });
  dropEl.addEventListener('input', () => { S.drop = +dropEl.value; syncLabels(); save(); rebuild(); reset(); });

  $('drop-btn').addEventListener('click', drop);
  $('reset').addEventListener('click', reset);

  // ---------- drag B ----------
  function worldFromEvent(e) {
    const rect = mech.getBoundingClientRect();
    const k = rect.width / WORLD_W;
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: px / k, y: py / k };
  }
  function nearB(e) {
    const wpt = worldFromEvent(e);
    return Math.hypot(wpt.x - tracks.B.x, wpt.y - tracks.B.y) < 26;
  }
  function startDrag(e) { if (!nearB(e)) return; S.dragging = true; mech.style.cursor = 'grabbing'; e.preventDefault(); }
  function moveDrag(e) {
    if (!S.dragging) { return; }
    const wpt = worldFromEvent(e);
    S.reach = Math.max(120, Math.min(420, Math.round(wpt.x - A.x)));
    S.drop = Math.max(40, Math.min(220, Math.round(wpt.y - A.y)));
    reachEl.value = S.reach; dropEl.value = S.drop; syncLabels(); save(); rebuild(); reset(); e.preventDefault();
  }
  function endDrag() { if (S.dragging) { S.dragging = false; mech.style.cursor = 'grab'; } }
  mech.style.cursor = 'grab';
  mech.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  mech.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  // ---------- keyboard ----------
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); drop(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); reset(); }
  });

  RM.addEventListener && RM.addEventListener('change', () => draw());

  window.addEventListener('resize', draw);
  syncLabels(); rebuild(); reset();
  if (live) { live.textContent = `Three frictionless tracks drop from A to B: a straight line, a circular arc, and a cycloid. The cycloid is quickest — ${sims.cyc.T.toFixed(2)} against ${sims.line.T.toFixed(2)} seconds for the line. Press space to drop the beads.`; }
  requestAnimationFrame(tick);
})();
