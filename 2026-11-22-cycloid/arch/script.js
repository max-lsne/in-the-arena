/* Arch — the cycloid as the path of a point on a rolling wheel.
 *
 * A wheel of radius r rolls without slipping along a rail. A point painted at radius rho on the
 * wheel (rho = k r) sits, after the wheel has rolled through angle phi, at
 *     x = r*phi - rho*sin(phi),   y = r - rho*cos(phi)        (y measured up from the rail)
 * For k = 1 this is the common cycloid: cusps on the rail at phi = 0, 2pi, a top at phi = pi.
 * Its velocity per unit roll is
 *     (dx, dy) = (r - rho*cos phi,  rho*sin phi)
 * so the horizontal speed is r(1 - k cos phi): zero at the cusp when k = 1 (the contact point is the
 * instantaneous centre of rotation, so a point sitting on it is at rest), 2r at the top (twice the
 * hub's speed r), and NEGATIVE near the cusp when k > 1 (a prolate point, like a train-wheel flange,
 * runs backward). The drawn wheel, contact point, and traced locus all come from the same two lines,
 * so the picture and the numbers are one object. One arch (k = 1) is 8r long and encloses 3*pi*r^2. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const PHIMAX = TAU;                 // one arch, cusp to cusp, then loop

  const S = {
    k: 0.94,                          // tracing radius rho / r
    rpm: 18,
    phi: 0.70 * Math.PI,             // open on a lively point past the middle, short of the top
    running: false,
    dragging: false, dragX0: 0, lastT: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'cycloid-arch';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ k: S.k, rpm: S.rpm })); } catch (_) {} };
  const stored = load();
  if (typeof stored.k === 'number') S.k = stored.k;
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

  // ---- geometry (all in curve units of r) ----
  const Xc = (phi) => phi - S.k * Math.sin(phi);     // x / r
  const Yc = (phi) => 1 - S.k * Math.cos(phi);       // y / r  (up from rail)
  const VXc = (phi) => 1 - S.k * Math.cos(phi);      // horizontal speed / (r*omega) = / hub speed
  const VYc = (phi) => S.k * Math.sin(phi);          // vertical speed / hub speed
  const Spd = (phi) => Math.hypot(VXc(phi), VYc(phi));

  // numeric length of one arch, in units of r
  function archLen() {
    const N = 720; let L = 0, pr = null;
    for (let i = 0; i <= N; i++) {
      const phi = i / N * PHIMAX;
      const p = [Xc(phi), Yc(phi)];
      if (pr) L += Math.hypot(p[0] - pr[0], p[1] - pr[1]);
      pr = p;
    }
    return L;
  }

  // ---- the rolling-wheel view ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);

    const R = Math.min(60, (w - 150) / PHIMAX);       // wheel radius in px (keeps one arch in frame)
    const railY = h - 64;
    const span = R * PHIMAX;
    const originX = (w - span) / 2 + 6;

    const PX = (phi) => originX + R * (phi - S.k * Math.sin(phi));
    const PY = (phi) => railY - R * (1 - S.k * Math.cos(phi));
    const hubX = originX + R * S.phi, hubY = railY - R;
    const contactX = originX + R * S.phi;

    // rail
    ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(14, railY); ctx.lineTo(w - 14, railY); ctx.stroke();
    // rail hatching
    ctx.strokeStyle = withA(C.steel, 0.35); ctx.lineWidth = 1;
    for (let x = 20; x < w - 14; x += 16) { ctx.beginPath(); ctx.moveTo(x, railY); ctx.lineTo(x - 6, railY + 8); ctx.stroke(); }

    // traced locus: faint ahead, bright behind
    const drawLocus = (a, b, style, lw, dash) => {
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
      ctx.beginPath();
      const steps = 220;
      for (let i = 0; i <= steps; i++) {
        const phi = a + (b - a) * i / steps;
        const x = PX(phi), y = PY(phi);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    drawLocus(0, PHIMAX, withA(C.copper, 0.26), 1.4, [4, 4]);
    drawLocus(0, S.phi, C.copper, 2.4);

    // cusp / top guides
    [0, PHIMAX].forEach(p => { const x = PX(p); ctx.fillStyle = withA(C.dead, 0.6); ctx.beginPath(); ctx.arc(x, railY, 2.4, 0, TAU); ctx.fill(); });

    // instantaneous radius: contact -> point
    const px = PX(S.phi), py = PY(S.phi);
    ctx.strokeStyle = withA(C.steel2, 0.55); ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(contactX, railY); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);

    // wheel body
    ctx.beginPath(); ctx.arc(hubX, hubY, R, 0, TAU);
    ctx.fillStyle = withA(C.brassB, 0.14); ctx.fill();
    ctx.strokeStyle = C.brass; ctx.lineWidth = 2; ctx.stroke();
    // spokes (rotate clockwise by phi)
    ctx.strokeStyle = withA(C.brass, 0.5); ctx.lineWidth = 1.2;
    for (let s = 0; s < 6; s++) {
      const a = -S.phi + s * TAU / 6;           // clockwise
      ctx.beginPath(); ctx.moveTo(hubX, hubY);
      ctx.lineTo(hubX + R * Math.sin(a), hubY + R * Math.cos(a)); ctx.stroke();
    }
    // hub
    ctx.fillStyle = C.brass2; ctx.beginPath(); ctx.arc(hubX, hubY, 4, 0, TAU); ctx.fill();
    // tracing arm hub -> point
    ctx.strokeStyle = C.copper2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hubX, hubY); ctx.lineTo(px, py); ctx.stroke();

    // contact point marker
    ctx.fillStyle = C.dead; ctx.beginPath(); ctx.arc(contactX, railY, 3.4, 0, TAU); ctx.fill();
    label(ctx, 'pivot', contactX, railY + 20, C.dead, 'center');

    // velocity arrow at the point
    const spd = Spd(S.phi);
    const vx = VXc(S.phi), vy = -VYc(S.phi);        // screen: y down
    const vlen = 22;                                 // px per hub-speed unit
    const quick = spd > 1.5, backward = VXc(S.phi) < -0.02;
    ctx.strokeStyle = backward ? C.dead : (quick ? C.keep : C.copper); ctx.lineWidth = 2.4;
    arrow(ctx, px, py, px + vx * vlen, py + vy * vlen);

    // the point itself
    ctx.fillStyle = backward ? C.dead : (quick ? C.keep : C.copper);
    ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.field; ctx.lineWidth = 1.5; ctx.stroke();

    // k annotation near hub
    label(ctx, 'ρ = ' + S.k.toFixed(2) + ' r', hubX + R + 8, hubY - R + 6, C.brass2, 'left');
  }

  function arrow(ctx, x0, y0, x1, y1) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0), hl = 6;
    if (Math.hypot(x1 - x0, y1 - y0) < 3) return;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hl * Math.cos(a - 0.4), y1 - hl * Math.sin(a - 0.4));
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hl * Math.cos(a + 0.4), y1 - hl * Math.sin(a + 0.4));
    ctx.stroke();
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

  // ---- the trace: horizontal velocity vs roll ----
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 42, padR = 16, padT = 14, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    // vertical scale: vx/hub ranges 1-k .. 1+k; keep a fixed, generous window
    const vmax = 2.2, vmin = -0.9;
    const Y = (v) => y1 - (v - vmin) / (vmax - vmin) * (y1 - y0);
    const X = (phi) => x0 + (x1 - x0) * phi / PHIMAX;

    // zero line + shaded backward band
    const yZero = Y(0);
    ctx.fillStyle = withA(C.dead, 0.10);
    ctx.fillRect(x0, yZero, x1 - x0, y1 - yZero);
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.stroke();
    ctx.strokeStyle = withA(C.dead, 0.5); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(x0, yZero); ctx.lineTo(x1, yZero); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'forward', x0 + 4, Y(1.6), C.inkFaint, 'left');
    label(ctx, 'back', x0 + 4, Y(-0.5), C.dead, 'left');

    // reference line at hub speed (1)
    ctx.strokeStyle = withA(C.steel, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x0, Y(1)); ctx.lineTo(x1, Y(1)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'hub', x1 - 2, Y(1) - 8, C.steel2, 'right');

    // roll-angle gridlines
    ['0', '½π', 'π', '3⁄2π', '2π'].forEach((t, i) => label(ctx, t, x0 + (x1 - x0) * i / 4, y1 + 13, C.inkFaint, 'center'));

    // the curve vx/hub = 1 - k cos phi
    ctx.strokeStyle = C.copper; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const phi = i / 200 * PHIMAX;
      const px = X(phi), py = Y(VXc(phi));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();

    // cusp (phi 0 / 2pi) and top (phi pi) markers
    [0, PHIMAX].forEach(p => {
      const v = VXc(p), col = v < 0.02 ? C.dead : C.copper2;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p), Y(v), 3, 0, TAU); ctx.fill();
    });
    const vt = VXc(Math.PI);
    ctx.fillStyle = C.keep; ctx.beginPath(); ctx.arc(X(Math.PI), Y(vt), 3, 0, TAU); ctx.fill();
    label(ctx, 'cusp', X(0.02 * PHIMAX) + 10, Y(VXc(0)) - 10, C.dead, 'left');
    label(ctx, 'top', X(Math.PI), Y(vt) - 10, C.keep, 'center');

    // current marker
    const cph = ((S.phi % PHIMAX) + PHIMAX) % PHIMAX;
    const v = VXc(cph);
    ctx.fillStyle = v < -0.02 ? C.dead : (Spd(cph) > 1.5 ? C.keep : C.copper);
    ctx.beginPath(); ctx.arc(X(cph), Y(v), 4.5, 0, TAU); ctx.fill();

    label(ctx, 'vx', x0 - 6, y0 + 6, C.copper2, 'right');
  }

  // ---- readouts & verdict ----
  function updateReading() {
    const phi = ((S.phi % PHIMAX) + PHIMAX) % PHIMAX;
    $('r-phi').textContent = Math.round(phi / DEG) + '°';
    $('r-y').textContent = Yc(phi).toFixed(2) + ' r';
    $('r-speed').textContent = Spd(phi).toFixed(2);
    const vx = VXc(phi);
    $('r-vx').textContent = (vx >= 0 ? '+' : '') + vx.toFixed(2);
    $('r-arc').textContent = archLen().toFixed(2) + ' r';

    const spd = Spd(phi), backward = vx < -0.02;
    const nearCusp = Math.min(phi, PHIMAX - phi) < 0.22;
    const nearTop = Math.abs(phi - Math.PI) < 0.45;
    const vEl = $('verdict'), vtx = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-mid', 'v-turn', 'v-dead', 'v-rest');
    let msg;
    if (backward) { vEl.classList.add('v-dead'); vtx.textContent = 'Below the rail — the point is running backward'; msg = 'past the rim, moving the wrong way'; }
    else if (nearCusp && S.k > 0.97 && S.k < 1.03) { vEl.classList.add('v-dead'); vtx.textContent = 'At the cusp — touched down and standing still'; msg = 'on the pivot, momentarily at rest'; }
    else if (nearCusp) { vEl.classList.add('v-turn'); vtx.textContent = (S.k < 1 ? 'Near the bottom — the rounded low of a curtate hump' : 'Near the bottom of the loop'); msg = 'low in the stroke'; }
    else if (nearTop) { vEl.classList.add('v-mid'); vtx.textContent = 'Over the top — moving at ' + Spd(Math.PI).toFixed(1) + '× the hub'; msg = 'at the top, fastest of the turn'; }
    else { vEl.classList.add('v-turn'); vtx.textContent = (Math.sin(phi) < 0 ? 'Falling toward the cusp' : 'Rising toward the top'); msg = 'climbing the arch'; }
    vs.textContent = S.running && !S.dragging ? 'rolling' : (S.dragging ? 'by hand' : 'held');

    if (live && (!S.running || S.dragging)) {
      live.textContent = `Point radius ${S.k.toFixed(2)} r, roll ${Math.round(phi / DEG)} degrees. Height ${Yc(phi).toFixed(2)} radii, speed ${Spd(phi).toFixed(2)} hub-speeds, ${msg}.`;
    }
  }

  function fillSlider(el, v, min, max) {
    const pct = (v - min) / (max - min) * 100;
    el.style.setProperty('--fill', pct + '%');
  }

  function draw() { drawMech(); drawTrace(); updateReading(); }

  // ---- animation ----
  function tick(t) {
    if (!S.lastT) S.lastT = t;
    const dt = Math.min(0.05, (t - S.lastT) / 1000); S.lastT = t;
    if (S.running && !S.dragging && !RM.matches) {
      S.phi = (S.phi + S.rpm / 60 * TAU * dt) % PHIMAX;
      draw();
    }
    requestAnimationFrame(tick);
  }

  // ---- controls ----
  const kEl = $('krad'), rpmEl = $('rpm');
  kEl.value = Math.round(S.k * 100);
  rpmEl.value = S.rpm;
  function syncLabels() {
    $('krad-v').textContent = S.k.toFixed(2);
    $('rpm-v').textContent = S.rpm;
    fillSlider(kEl, +kEl.value, 30, 160);
    fillSlider(rpmEl, +rpmEl.value, 0, 60);
  }
  kEl.addEventListener('input', () => { S.k = +kEl.value / 100; syncLabels(); save(); draw(); });
  rpmEl.addEventListener('input', () => { S.rpm = +rpmEl.value; syncLabels(); save(); if (!S.running) draw(); });

  const runBtn = $('run');
  function setRun(on) {
    S.running = on; runBtn.setAttribute('aria-pressed', String(on));
    runBtn.textContent = on ? 'Pause' : 'Run';
    if (on) S.lastT = 0;
    updateReading();
  }
  runBtn.addEventListener('click', () => setRun(!S.running));
  $('tocusp').addEventListener('click', () => { setRun(false); S.phi = S.phi < Math.PI ? 0 : PHIMAX - 1e-4; draw(); announce(); });
  $('totop').addEventListener('click', () => { setRun(false); S.phi = Math.PI; draw(); announce(); });
  function announce() { if (live) { const phi = ((S.phi % PHIMAX) + PHIMAX) % PHIMAX; live.textContent = `Roll ${Math.round(phi / DEG)} degrees, height ${Yc(phi).toFixed(2)} radii, speed ${Spd(phi).toFixed(2)} hub-speeds.`; } }

  // ---- drag to roll ----
  function rollFromX(e) {
    const rect = mech.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const R = Math.min(60, (rect.width - 150) / PHIMAX);
    const span = R * PHIMAX, originX = (rect.width - span) / 2 + 6;
    return (px - originX) / R;      // approx roll angle (ignores the sin correction; fine for dragging)
  }
  function startDrag(e) { S.dragging = true; S.dragX0 = rollFromX(e) - S.phi; mech.style.cursor = 'grabbing'; updateReading(); e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; S.phi = ((rollFromX(e) - S.dragX0) % PHIMAX + PHIMAX) % PHIMAX; draw(); e.preventDefault(); }
  function endDrag() { if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab'; updateReading(); }
  mech.style.cursor = 'grab';
  mech.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  mech.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  // ---- keyboard ----
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setRun(!S.running); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setRun(false); S.phi = (S.phi - 4 * DEG + PHIMAX) % PHIMAX; draw(); announce(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setRun(false); S.phi = (S.phi + 4 * DEG) % PHIMAX; draw(); announce(); }
  });

  // ---- reduced motion ----
  if (RM.matches) { S.running = false; runBtn.setAttribute('aria-pressed', 'false'); runBtn.textContent = 'Run'; S.phi = 0.70 * Math.PI; }
  RM.addEventListener && RM.addEventListener('change', (e) => { if (e.matches) setRun(false); });

  window.addEventListener('resize', draw);
  syncLabels(); draw();
  if (S.running && !RM.matches) setRun(true);
  // speak the opening state once
  if (live) { live.textContent = `A wheel rolling along a rail, its rim point tracing a cycloid. Point radius ${S.k.toFixed(2)} of the wheel's. At the cusp the point is still; over the top it moves at twice the hub's speed. Drag the wheel or press space to roll.`; }
  requestAnimationFrame(tick);
})();
