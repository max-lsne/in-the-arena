/* Control — the swashplate read backwards: a non-rotating plate's height and tilt become
 * a pitch command for every rotor blade.
 *
 * A blade at azimuth psi takes pitch
 *     theta(psi) = A0 + A1 * cos(psi - phi)
 * where A0 is COLLECTIVE (the plate raised bodily — a constant added to every blade) and
 * A1, phi are CYCLIC (the plate tilted — a first harmonic, magnitude and direction). A height
 * plus a tilt sampled round a circle is exactly a constant plus a first harmonic, and the two are
 * orthogonal over a turn, so collective (lift) and cyclic (steering) do not bleed into each other.
 * The drawn swashplate ring is the locus height = A0 + A1 cos(psi - phi) — which is itself a raised,
 * tilted plane — so the picture and the pitch schedule are one object. (The ~90-degree precession a
 * real rotor adds is a phase pre-rotation of the linkage; the algebra here is untouched.)
 */
(() => {
  'use strict';

  const DEG = Math.PI / 180;
  const B = 4; // rotor blades
  const S = {
    A0: 6, A1: 3, phi: 0 * DEG,   // collective deg, cyclic deg, cyclic direction
    rpm: 20,
    theta: 0,
    running: true,
    dragging: false, dragA0: 0, lastT: 0,
  };

  const $ = (id) => document.getElementById(id);
  const live = $('live');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const KEY = 'swash-control';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ A0: S.A0, A1: S.A1, phi: S.phi, rpm: S.rpm })); } catch (_) {} };
  const stored = load();
  if (typeof stored.A0 === 'number') S.A0 = stored.A0;
  if (typeof stored.A1 === 'number') S.A1 = stored.A1;
  if (typeof stored.phi === 'number') S.phi = stored.phi;
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
  function fit(canvas, baseW, baseH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth || baseW; const h = w * baseH / baseW;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  const mech = $('mech'), trace = $('trace');

  // pitch at azimuth psi, in degrees
  const pitch = (psi) => S.A0 + S.A1 * Math.cos(psi - S.phi);

  function makeProj(cx, cy, sc) {
    return (x, y, z) => ({ x: cx + x * sc - y * 0.42 * sc, y: cy - z * sc - y * 0.17 * sc });
  }

  // ---- mechanism view ----
  function drawMech() {
    const { ctx, w, h } = fit(mech, 560, 300);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.46, cy = h * 0.58, sc = Math.min(w, h) * 0.30;
    const proj = makeProj(cx, cy, sc);
    const R = 1.05;              // rotor/plate radius
    const hUnit = 0.055;         // plate-units of height per degree of pitch
    const ring = (psi) => ({ x: R * Math.cos(psi), y: R * Math.sin(psi), z: pitch(psi) * hUnit });

    // mast
    const top = proj(0, 0, 1.3), bot = proj(0, 0, -1.3);
    ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();

    // level reference ring (where a level plate at mean would sit)
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 56; i++) { const u = i / 56 * Math.PI * 2; const p = proj(R * Math.cos(u), R * Math.sin(u), S.A0 * hUnit); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    ctx.stroke(); ctx.setLineDash([]);

    // the swashplate top as filled tilted+raised ring
    const rimPts = [];
    for (let i = 0; i <= 72; i++) { const u = i / 72 * Math.PI * 2; rimPts.push(ring(u)); }
    const pr = rimPts.map(p => proj(p.x, p.y, p.z));
    ctx.beginPath(); pr.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    const grad = ctx.createLinearGradient(cx - sc, cy - sc, cx + sc, cy + sc);
    grad.addColorStop(0, withA(C.brassB, 0.34)); grad.addColorStop(1, withA(C.brass, 0.24));
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = C.brass; ctx.lineWidth = 2; ctx.stroke();

    // high-point marker (phi) and low point
    const hi = proj(R * Math.cos(S.phi), R * Math.sin(S.phi), pitch(S.phi) * hUnit);
    const lo = proj(R * Math.cos(S.phi + Math.PI), R * Math.sin(S.phi + Math.PI), pitch(S.phi + Math.PI) * hUnit);
    if (S.A1 > 0.4) {
      ctx.fillStyle = C.keep; ctx.beginPath(); ctx.arc(hi.x, hi.y, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = C.dead; ctx.beginPath(); ctx.arc(lo.x, lo.y, 4, 0, 7); ctx.fill();
    }

    // blades: B spokes with pitch bars, drawn far-first
    const blades = [];
    for (let b = 0; b < B; b++) { const psi = S.theta + 2 * Math.PI * b / B; blades.push({ psi, y: Math.sin(psi) }); }
    blades.sort((p, q) => q.y - p.y);
    blades.forEach(bl => {
      const r0 = proj(0, 0, S.A0 * hUnit);
      const rp = ring(bl.psi), tip = proj(rp.x, rp.y, rp.z);
      const pv = pitch(bl.psi);
      const col = pv > S.A0 + 0.3 * S.A1 ? C.keep : (pv < S.A0 - 0.3 * S.A1 ? C.copper : C.brass2);
      ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      // pitch bar: a small vertical tick whose length = pitch
      const bBase = proj(rp.x, rp.y, S.A0 * hUnit - 0.5);
      ctx.strokeStyle = withA(col, 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(bBase.x, bBase.y); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tip.x, tip.y, 3.6, 0, 7); ctx.fill();
    });
    ctx.lineCap = 'butt';

    // hub
    const hub = proj(0, 0, S.A0 * hUnit); ctx.fillStyle = C.brass2; ctx.beginPath(); ctx.arc(hub.x, hub.y, 5, 0, 7); ctx.fill();

    label(ctx, S.A1 <= 0.4 ? 'level — pure lift' : 'high ●  low ●', 14, 18, S.A1 <= 0.4 ? C.steel2 : C.inkSoft, 'left');
  }

  // ---- pitch-vs-azimuth trace ----
  function drawTrace() {
    const { ctx, w, h } = fit(trace, 560, 170);
    ctx.clearRect(0, 0, w, h);
    const padL = 32, padR = 16, padT = 16, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const pMax = 12 + 8; // collective max + cyclic max headroom
    const Y = (p) => y1 - (p / pMax) * (y1 - y0);
    const X = (i, M) => x0 + (x1 - x0) * i / M;

    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.strokeStyle = withA(C.rule, 0.7); ctx.setLineDash([2, 4]);
    for (let q = 1; q < 4; q++) { const gx = x0 + (x1 - x0) * q / 4; ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke(); }
    ctx.setLineDash([]);
    ['0°', '90°', '180°', '270°', '360°'].forEach((t, i) => label(ctx, t, x0 + (x1 - x0) * i / 4, y1 + 13, C.inkFaint, 'center'));

    const M = 180;
    // collective line
    ctx.strokeStyle = withA(C.steel, 0.9); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x0, Y(S.A0)); ctx.lineTo(x1, Y(S.A0)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, 'A₀ collective', x1 - 4, Y(S.A0) - 9, C.steel2, 'right');

    // shade cyclic contribution between collective and sum
    ctx.beginPath();
    for (let i = 0; i <= M; i++) { const psi = i / M * 2 * Math.PI; const p = pitch(psi); const px = X(i, M); i ? ctx.lineTo(px, Y(p)) : ctx.moveTo(px, Y(p)); }
    for (let i = M; i >= 0; i--) { const px = X(i, M); ctx.lineTo(px, Y(S.A0)); }
    ctx.closePath(); ctx.fillStyle = withA(C.brass, 0.14); ctx.fill();

    // sum curve
    ctx.strokeStyle = C.brass; ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= M; i++) { const psi = i / M * 2 * Math.PI; const px = X(i, M); i ? ctx.lineTo(px, Y(pitch(psi))) : ctx.moveTo(px, Y(pitch(psi))); }
    ctx.stroke();

    // phi marker
    if (S.A1 > 0.4) {
      const phiN = ((S.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const fx = X(phiN / (2 * Math.PI) * M, M);
      ctx.strokeStyle = withA(C.keep, 0.8); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(fx, y0); ctx.lineTo(fx, y1); ctx.stroke(); ctx.setLineDash([]);
      const right = fx > x1 - 40;
      label(ctx, 'φ peak', right ? fx - 6 : fx + 6, y0 + 22, C.keep, right ? 'right' : 'left');
    }

    // current blades
    for (let b = 0; b < B; b++) {
      const psi = ((S.theta + 2 * Math.PI * b / B) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const bx = X(psi / (2 * Math.PI) * M, M), by = Y(pitch(psi));
      ctx.fillStyle = b === 0 ? C.copper2 : withA(C.copper, 0.6);
      ctx.beginPath(); ctx.arc(bx, by, b === 0 ? 4.5 : 3, 0, 7); ctx.fill();
    }
    label(ctx, 'pitch', x0 + 6, y0 + 8, C.brass2, 'left');
  }

  function updateReading() {
    const psi0 = ((S.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    $('r-coll').textContent = S.A0 + '°';
    $('r-cyc').textContent = S.A1 + '°';
    $('r-phi').textContent = Math.round(S.phi / DEG) + '°';
    $('r-range').textContent = (S.A0 - S.A1) + '–' + (S.A0 + S.A1) + '°';
    $('r-blade').textContent = pitch(psi0).toFixed(1) + '°';

    const vEl = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    vEl.classList.remove('v-mid', 'v-turn', 'v-dead', 'v-rest');
    let msg;
    if (S.A1 <= 0.4) { vEl.classList.add('v-mid'); vt.textContent = S.A0 <= 0.4 ? 'Flat and down — no lift, no lean' : 'Level plate — pure lift, no lean'; msg = S.A0 <= 0.4 ? 'no command' : 'pure collective lift'; }
    else {
      vEl.classList.add('v-turn');
      const d = Math.round(S.phi / DEG);
      const bearing = (d === 0) ? 'forward' : (d === 90) ? 'to the right' : (d === 180) ? 'aft' : (d === 270) ? 'to the left' : `toward ${d}°`;
      vt.textContent = `Lift and a lean ${bearing}`; msg = `collective lift with cyclic lean ${bearing}`;
    }
    vs.textContent = S.running && !S.dragging ? 'turning' : (S.dragging ? 'by hand' : 'held');
    if (live && (!S.running || S.dragging)) {
      live.textContent = `Collective ${S.A0} degrees, cyclic ${S.A1} degrees peaking at ${Math.round(S.phi / DEG)} degrees. Pitch runs ${S.A0 - S.A1} to ${S.A0 + S.A1} degrees — ${msg}.`;
    }
  }

  function fillSlider(el, v, min, max) { el.style.setProperty('--fill', ((v - min) / (max - min) * 100) + '%'); }
  function draw() { drawMech(); drawTrace(); updateReading(); }

  function tick(t) {
    if (!S.lastT) S.lastT = t;
    const dt = Math.min(0.05, (t - S.lastT) / 1000); S.lastT = t;
    if (S.running && !S.dragging && !RM.matches) { S.theta = (S.theta + S.rpm / 60 * 2 * Math.PI * dt) % (2 * Math.PI); draw(); }
    requestAnimationFrame(tick);
  }

  // ---- controls ----
  const collEl = $('coll'), cycEl = $('cyc'), dirEl = $('dir'), rpmEl = $('rpm');
  collEl.value = S.A0; cycEl.value = S.A1; dirEl.value = Math.round(S.phi / DEG);
  // rpm slider is optional in this page; guard if absent
  function syncLabels() {
    $('coll-v').textContent = S.A0; $('cyc-v').textContent = S.A1; $('dir-v').textContent = Math.round(S.phi / DEG);
    fillSlider(collEl, S.A0, 0, 12); fillSlider(cycEl, S.A1, 0, 8); fillSlider(dirEl, Math.round(S.phi / DEG), 0, 350);
  }
  collEl.addEventListener('input', () => { S.A0 = +collEl.value; syncLabels(); save(); draw(); });
  cycEl.addEventListener('input', () => { S.A1 = +cycEl.value; syncLabels(); save(); draw(); });
  dirEl.addEventListener('input', () => { S.phi = +dirEl.value * DEG; syncLabels(); save(); draw(); });

  const runBtn = $('run');
  function setRun(on) { S.running = on; runBtn.setAttribute('aria-pressed', String(on)); runBtn.textContent = on ? 'Pause' : 'Run'; if (on) S.lastT = 0; updateReading(); }
  runBtn.addEventListener('click', () => setRun(!S.running));
  $('hover').addEventListener('click', () => { S.A1 = 0; cycEl.value = 0; syncLabels(); save(); draw(); });
  $('bank').addEventListener('click', () => { S.A1 = 8; cycEl.value = 8; syncLabels(); save(); draw(); });

  // ---- drag to turn the rotor ----
  function angleAt(e) {
    const rect = mech.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.46, cy = rect.top + rect.height * 0.58;
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
    return Math.atan2(-py, px);
  }
  function startDrag(e) { S.dragging = true; S.dragA0 = angleAt(e) - S.theta; mech.style.cursor = 'grabbing'; updateReading(); e.preventDefault(); }
  function moveDrag(e) { if (!S.dragging) return; S.theta = ((angleAt(e) - S.dragA0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); draw(); e.preventDefault(); }
  function endDrag() { if (!S.dragging) return; S.dragging = false; mech.style.cursor = 'grab'; updateReading(); }
  mech.style.cursor = 'grab';
  mech.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
  mech.addEventListener('touchstart', startDrag, { passive: false }); window.addEventListener('touchmove', moveDrag, { passive: false }); window.addEventListener('touchend', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); setRun(!S.running); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setRun(false); S.theta = (S.theta - 4 * DEG + 2 * Math.PI) % (2 * Math.PI); draw(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setRun(false); S.theta = (S.theta + 4 * DEG) % (2 * Math.PI); draw(); }
  });

  if (RM.matches) { S.running = false; runBtn.setAttribute('aria-pressed', 'false'); runBtn.textContent = 'Run'; S.theta = 20 * DEG; }
  RM.addEventListener && RM.addEventListener('change', (e) => { if (e.matches) setRun(false); });

  window.addEventListener('resize', draw);
  syncLabels(); draw();
  // speak the opening state once, so a screen reader meets the bench already set
  if (live) { live.textContent = `A helicopter swashplate. Collective ${S.A0} degrees lifts every blade; cyclic ${S.A1} degrees peaking at ${Math.round(S.phi / DEG)} degrees leans the disc. Blade pitch runs ${S.A0 - S.A1} to ${S.A0 + S.A1} degrees. Drag the rotor or press space to run.`; }
  requestAnimationFrame(tick);
})();
