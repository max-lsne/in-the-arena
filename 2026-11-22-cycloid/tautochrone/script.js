/* Tautochrone — the cycloid cup on which descent time forgets the starting height.
 *
 * Line a cup with an inverted cycloid, x = a(θ − sin θ), y = a(1 − cos θ), read as a valley with its
 * low point at the middle. Measure arc length s from the bottom: it works out to s = 4a·sin(φ/2), and
 * the height is y = s²/8a — exactly quadratic in s. A quadratic potential is a spring, so the slide is
 * simple-harmonic in arc length,
 *     s¨ = −(g/4a)·s,     s(t) = s0·cos(ω t),   ω = √(g/4a),
 * and the time to the bottom, π√(a/g), carries no amplitude: beads from any height arrive together and
 * stay in phase. A circle matched to the cycloid's bottom curvature (R = 4a) agrees only for tiny
 * swings; its real motion is a pendulum, θ¨ = −(g/R)·sin θ, whose period grows with amplitude, so its
 * beads drift apart. Both cups are simulated into arc-length tracks the animation and the height trace
 * both read, so picture and numbers are one. World units 560×300, scaled uniformly to the canvas. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const WORLD_W = 560, WORLD_H = 300;
  const G = 1400;                       // world px / s^2
  const NB = 5;                         // beads
  const DT = 1 / 120;                   // track sample step
  const cx = WORLD_W / 2, by = 212;     // cup centre x, bottom y (world)
  const BCOL = ['keep', 'drift', 'copper', 'steel2', 'brass2'];

  const S = { a: 64, spread: 92, shape: 'cycloid', running: true, elapsed: 0, last: 0 };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'cycloid-tauto';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ a: S.a, spread: S.spread, shape: S.shape })); } catch (_) {} };
  const stored = load();
  if (typeof stored.a === 'number') S.a = Math.max(46, Math.min(78, stored.a));
  if (typeof stored.spread === 'number') S.spread = Math.max(30, Math.min(98, stored.spread));
  if (stored.shape === 'circle' || stored.shape === 'cycloid') S.shape = stored.shape;

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
  mq.addEventListener && mq.addEventListener('change', () => { readColors(); draw(); });

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

  // ---- cup geometry (world units) ----
  const rimArc = () => 4 * S.a;                       // cycloid arc from bottom to rim
  const Rc = () => 4 * S.a;                           // matched circle radius
  const omega = () => Math.sqrt(G / (4 * S.a));
  const quarterT = () => Math.PI * Math.sqrt(S.a / G);

  function posFromS(s) {                               // arc length s -> world {x,y}
    if (S.shape === 'cycloid') {
      const u = Math.max(-1, Math.min(1, s / (4 * S.a)));
      const phi = 2 * Math.asin(u);
      return { x: cx + S.a * (phi + Math.sin(phi)), y: by - S.a * (1 - Math.cos(phi)) };
    } else {
      const R = Rc(), th = s / R;
      return { x: cx + R * Math.sin(th), y: by - R * (1 - Math.cos(th)) };
    }
  }

  // ---- build release amplitudes and simulate arc-length tracks ----
  let sim = null;   // {Twin, N, tracks:[{s0, s:[...], tBottom}], colors}
  function rebuild() {
    const rim = rimArc();
    const topFrac = S.spread / 100, loFrac = 0.18;
    const amps = [];
    for (let i = 0; i < NB; i++) {
      const f = NB === 1 ? topFrac : loFrac + (topFrac - loFrac) * i / (NB - 1);
      amps.push(f * rim);
    }
    const full = 2 * Math.PI / omega();                // cycloid full period
    const Twin = 2 * full;                             // loop window (seamless for the cycloid)
    const N = Math.max(8, Math.round(Twin / DT));
    const w = omega(), R = Rc();
    const tracks = amps.map((s0) => {
      const arr = new Float64Array(N + 1);
      if (S.shape === 'cycloid') {
        for (let k = 0; k <= N; k++) arr[k] = s0 * Math.cos(w * k * DT);
      } else {
        // pendulum: theta'' = -(g/R) sin theta, from rest at theta0 = s0/R
        let th = s0 / R, om = 0; const dts = 1 / 600; let t = 0, kk = 0, next = 0;
        arr[0] = s0;
        while (kk < N) {
          // integrate until next sample time
          while (t < (kk + 1) * DT) { om += -(G / R) * Math.sin(th) * dts; th += om * dts; t += dts; }
          kk++; arr[kk] = R * th;
        }
      }
      // first bottom crossing time (sign change from the initial side)
      let tB = quarterT();
      const s0sign = Math.sign(s0) || 1;
      for (let k = 1; k <= N; k++) { if (Math.sign(arr[k]) !== s0sign) { tB = k * DT; break; } }
      return { s0, s: arr, tBottom: tB };
    });
    const bts = tracks.map(t => t.tBottom);
    const spread = Math.max(...bts) - Math.min(...bts);
    sim = { Twin, N, tracks, spread };
    updateReading();
  }

  const sampleAt = (track, tLoop) => {
    const k = Math.floor(tLoop / DT);
    return k >= 0 && k <= sim.N ? track.s[k] : track.s[sim.N];
  };

  // ---- drawing ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, WORLD_W, WORLD_H);
    ctx.clearRect(0, 0, w, h);
    const k = w / WORLD_W, SX = (x) => x * k, SY = (y) => y * k;

    // cup wall
    ctx.strokeStyle = C.steel; ctx.lineWidth = 2.4; ctx.beginPath();
    if (S.shape === 'cycloid') {
      for (let i = 0; i <= 160; i++) { const phi = -Math.PI + TAU * i / 160; const x = cx + S.a * (phi + Math.sin(phi)), y = by - S.a * (1 - Math.cos(phi)); i ? ctx.lineTo(SX(x), SY(y)) : ctx.moveTo(SX(x), SY(y)); }
    } else {
      const R = Rc(), lim = Math.PI / 3;
      for (let i = 0; i <= 160; i++) { const th = -lim + 2 * lim * i / 160; const x = cx + R * Math.sin(th), y = by - R * (1 - Math.cos(th)); i ? ctx.lineTo(SX(x), SY(y)) : ctx.moveTo(SX(x), SY(y)); }
    }
    ctx.stroke();
    // ghost of the other cup, faint, for comparison
    ctx.strokeStyle = withA(C.inkFaint, 0.5); ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath();
    if (S.shape === 'cycloid') { const R = Rc(), lim = Math.PI / 3; for (let i = 0; i <= 120; i++) { const th = -lim + 2 * lim * i / 120; const x = cx + R * Math.sin(th), y = by - R * (1 - Math.cos(th)); i ? ctx.lineTo(SX(x), SY(y)) : ctx.moveTo(SX(x), SY(y)); } }
    else { for (let i = 0; i <= 120; i++) { const phi = -Math.PI + TAU * i / 120; const x = cx + S.a * (phi + Math.sin(phi)), y = by - S.a * (1 - Math.cos(phi)); i ? ctx.lineTo(SX(x), SY(y)) : ctx.moveTo(SX(x), SY(y)); } }
    ctx.stroke(); ctx.setLineDash([]);
    // legend: which wall is which
    label(ctx, '— ' + S.shape, 12, 16, C.steel2, 'left');
    label(ctx, '┄ ' + (S.shape === 'cycloid' ? 'circle' : 'cycloid'), 12, 32, C.inkFaint, 'left');

    // bottom marker + vertical
    ctx.strokeStyle = withA(C.dead, 0.4); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(SX(cx), SY(by) + 6); ctx.lineTo(SX(cx), SY(by - 2 * S.a) - 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.dead; ctx.beginPath(); ctx.arc(SX(cx), SY(by), 3, 0, TAU); ctx.fill();

    // beads
    const tLoop = RM.matches && !S.running ? 0 : (S.elapsed % sim.Twin);
    let nearBottom = 0;
    sim.tracks.forEach((track, i) => {
      const s = sampleAt(track, tLoop), p = posFromS(s);
      const col = C[BCOL[i % BCOL.length]];
      if (Math.abs(s) < 0.06 * rimArc()) nearBottom++;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.stroke();
    });
    // flash the bottom when they gather there (cycloid: all at once)
    if (nearBottom >= 3) { ctx.strokeStyle = withA(C.keep, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SX(cx), SY(by), 14, 0, TAU); ctx.stroke(); }
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

  // ---- the trace: each bead's height vs time ----
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 160);
    ctx.clearRect(0, 0, w, h);
    const padL = 30, padR = 14, padT = 14, padB = 22;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const Twin = sim.Twin;
    const ymax = 2 * S.a;
    const X = (t) => x0 + (x1 - x0) * t / Twin;
    const Y = (hgt) => y1 - (y1 - y0) * Math.min(1, hgt / ymax);

    // bottom line
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    label(ctx, 'rim', x0 + 4, y0 + 5, C.inkFaint, 'left');
    label(ctx, 'bottom', x0 + 4, y1 - 7, C.dead, 'left');

    // quarter-period gridlines (the cycloid bottom-crossings)
    const Q = quarterT();
    ctx.strokeStyle = withA(C.keep, 0.28); ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
    for (let m = 1; Q * m < Twin; m += 2) { const gx = X(Q * m); ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke(); }
    ctx.setLineDash([]);

    // each bead's height curve
    sim.tracks.forEach((track, i) => {
      const col = C[BCOL[i % BCOL.length]];
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let kx = 0; kx <= 200; kx++) {
        const t = Twin * kx / 200, s = sampleAt(track, t);
        const p = posFromS(s), hgt = by - p.y;
        const px = X(t), py = Y(hgt);
        kx ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      // first bottom-crossing tick under the axis
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(Math.min(Twin, track.tBottom)), y1 + 7, 2.6, 0, TAU); ctx.fill();
    });

    // time cursor
    const cxp = X(S.elapsed % Twin);
    ctx.strokeStyle = withA(C.ink, 0.45); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cxp, y0); ctx.lineTo(cxp, y1); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'height', x1 - 2, y0 + 4, C.inkFaint, 'right');
  }

  // ---- readouts & verdict ----
  function updateReading() {
    $('r-shape').textContent = S.shape;
    $('r-period').textContent = quarterT().toFixed(2) + ' s';
    $('r-spread').textContent = sim.spread.toFixed(2) + ' s';
    $('r-beads').textContent = String(NB);
    $('shape').textContent = 'Cup: ' + S.shape;

    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-mid', 'v-turn', 'v-dead', 'v-rest');
    if (S.shape === 'cycloid') {
      vEl.classList.add('v-mid');
      vt.textContent = 'In step — every bead reaches the bottom together';
    } else if (sim.spread < 0.015) {
      vEl.classList.add('v-turn');
      vt.textContent = 'A round bowl — true only for the smallest swings';
    } else {
      vEl.classList.add('v-turn');
      vt.textContent = 'Drifting — the wide swings run slow, by ' + sim.spread.toFixed(2) + ' s';
    }
    vs.textContent = S.shape;

    if (live && !S.running) {
      live.textContent = S.shape === 'cycloid'
        ? `A cycloid cup, a = ${S.a}. Five beads from different heights all reach the bottom in ${quarterT().toFixed(2)} seconds — together, whatever the height.`
        : `A circular bowl matched to the cycloid. The beads' arrivals spread by ${sim.spread.toFixed(2)} seconds — the wider the swing, the slower it runs.`;
    }
  }

  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', (v - min) / (max - min) * 100 + '%'); }
  function draw() { drawMech(); drawTrace(); }

  // ---- animation ----
  function tick(t) {
    if (!S.last) S.last = t;
    const dt = Math.min(0.05, (t - S.last) / 1000); S.last = t;
    if (S.running && !RM.matches) { S.elapsed += dt; draw(); }
    requestAnimationFrame(tick);
  }

  // ---- controls ----
  const sizeEl = $('size'), spreadEl = $('spread');
  sizeEl.value = S.a; spreadEl.value = S.spread;
  function spreadWord(v) { return v < 45 ? 'narrow' : v < 72 ? 'medium' : 'wide'; }
  function syncLabels() {
    $('size-v').textContent = S.a;
    $('spread-v').textContent = spreadWord(S.spread);
    fillSlider(sizeEl, S.a, 46, 78); fillSlider(spreadEl, S.spread, 30, 98);
  }
  sizeEl.addEventListener('input', () => { S.a = +sizeEl.value; syncLabels(); save(); rebuild(); draw(); });
  spreadEl.addEventListener('input', () => { S.spread = +spreadEl.value; syncLabels(); save(); rebuild(); draw(); });

  const runBtn = $('run');
  function setRun(on) {
    S.running = on; runBtn.setAttribute('aria-pressed', String(on));
    runBtn.textContent = on ? 'Pause' : 'Run'; if (on) S.last = 0; updateReading();
  }
  runBtn.addEventListener('click', () => setRun(!S.running));
  $('release').addEventListener('click', () => { S.elapsed = 0; S.last = 0; if (!S.running && !RM.matches) setRun(true); draw(); });
  $('shape').addEventListener('click', () => { S.shape = S.shape === 'cycloid' ? 'circle' : 'cycloid'; S.elapsed = 0; save(); rebuild(); draw(); });

  // ---- keyboard ----
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setRun(!S.running); }
    else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); $('shape').click(); }
  });

  // ---- reduced motion ----
  if (RM.matches) { S.running = false; runBtn.setAttribute('aria-pressed', 'false'); runBtn.textContent = 'Run'; }
  RM.addEventListener && RM.addEventListener('change', (e) => { if (e.matches) setRun(false); draw(); });

  window.addEventListener('resize', draw);
  syncLabels(); rebuild(); draw();
  if (live) {
    live.textContent = `A cup lined with a cycloid, and five beads set on it at different heights. Released together they reach the bottom together, in ${quarterT().toFixed(2)} seconds, whatever their height. Press C to compare a round bowl; space to pause.`;
  }
  requestAnimationFrame(tick);
})();
