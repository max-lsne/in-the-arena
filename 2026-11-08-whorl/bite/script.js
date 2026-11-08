/* Bite — the screw as its own feed (wood screw, gimlet, auger).
   An inclined plane wound round a cylinder and sharpened to cut. Hold nothing: the lead thread
   catches the grain and draws the tool in one pitch per turn, with no push. The feed is the
   pitch; the pull is the torque wound tight (~2πT/p). Too fine or too hard to cut and it skates;
   too coarse a bite and it splits; a pilot hole eases both.
   No build, no network. State in localStorage; reduced-motion settles it at once. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('c'), ctx = canvas.getContext('2d');
  const KEY = 'whorl-bite-v1';
  const TAU = Math.PI * 2;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const W = 560, H = 440;
  function fit() {
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let C = {};
  function palette() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = {
      field: g('--field'), field2: g('--field-2'), ink: g('--ink'),
      inkSoft: g('--ink-soft'), inkFaint: g('--ink-faint'), rule: g('--rule'),
      brass: g('--brass'), brass2: g('--brass-2'), brassB: g('--brass-b'),
      steel: g('--steel'), steel2: g('--steel-2'),
      wood: g('--wood'), wood2: g('--wood-2'),
      keep: g('--keep'), drift: g('--drift'), dead: g('--dead'),
    };
  }

  const state = { pitch: 3, hard: 2.2, torque: 4, pilot: 0, depth: 0 };
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o) { for (const k of ['pitch', 'hard', 'torque']) if (Number.isFinite(o[k])) state[k] = o[k];
        if (o.pilot === 0 || o.pilot === 1) state.pilot = o.pilot; }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ pitch: state.pitch, hard: state.hard, torque: state.torque, pilot: state.pilot })); } catch (e) {}
  }

  // ---- model ----
  const K1 = 0.40;    // torque-to-cut per (pitch·hardness)
  const K3 = 0.90;    // bursting force per (pitch·hardness)
  const SPLIT_LIMIT = 10;
  const ETA = 0.30;
  function derive() {
    const p = state.pitch, h = state.hard, T = state.torque;
    const pilotEase = state.pilot ? 0.48 : 1;
    const tCut = K1 * p * h * pilotEase;                 // torque needed to cut
    const feeds = T >= tCut;
    const burst = K3 * p * h * (state.pilot ? 0.45 : 1); // bursting (wedge) force index
    const split = burst > SPLIT_LIMIT;
    const pull = ETA * TAU * T / (p / 1000);             // N, self-feed axial pull
    // a nail to the same depth: force grows with depth & hardness (nominal, at mid depth)
    const nail = 120 * h * (1 + 0.9);                     // N, nominal at working depth
    // a thread that cannot cut only skates — it must bite before it can burst the grain
    let verdict;
    if (!feeds) verdict = 'skate';
    else if (split) verdict = 'split';
    else verdict = 'feed';
    return { tCut, feeds, burst, split: split && feeds, pull, nail, verdict, p, h };
  }

  // ---- geometry ----
  const axisY = 218;
  const woodX = 300, woodX1 = 544, woodY0 = 70, woodY1 = 366;
  const L_SCREW = 184;             // head-to-tip length of the drawn screw
  const maxDepthPx = 150;          // deepest penetration drawn
  let depthPx = 0;                 // current penetration into the wood, px
  let rot = 0;                      // thread rotation phase
  let crack = 0;                    // split crack length px
  let skateWobble = 0;

  function render() {
    const d = derive();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.field; ctx.fillRect(0, 0, W, H);

    // wood block
    ctx.fillStyle = C.wood; ctx.globalAlpha = 0.28;
    ctx.fillRect(woodX, woodY0, woodX1 - woodX, woodY1 - woodY0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.wood2; ctx.lineWidth = 1.2;
    ctx.strokeRect(woodX, woodY0, woodX1 - woodX, woodY1 - woodY0);
    // grain lines (along x) — spacing tighter for harder wood
    ctx.strokeStyle = C.wood2; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    const gs = 26 - (state.hard - 1) * 3;
    for (let y = woodY0 + gs * 0.6; y < woodY1; y += gs) {
      ctx.beginPath();
      ctx.moveTo(woodX + 3, y);
      for (let x = woodX + 3; x < woodX1 - 2; x += 18) {
        ctx.lineTo(x + 18, y + Math.sin((x + y) * 0.05) * 1.6);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    label(woodWord(state.hard).toUpperCase(), woodX1 - 8, woodY0 - 8, C.wood2, 11, 'right', '500');

    // the screw tip penetrates the wood face (woodX) by depthPx
    const tipX = woodX + depthPx;
    if (state.pilot) {
      ctx.strokeStyle = C.wood2; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(woodX, axisY - 4); ctx.lineTo(woodX + 120, axisY - 4);
      ctx.moveTo(woodX, axisY + 4); ctx.lineTo(woodX + 120, axisY + 4);
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      label('pilot', woodX + 60, woodY1 - 8, C.wood2, 10, 'center');
    }

    // split crack ahead of tip, along grain — kept inside the block
    if (d.split && crack > 0) {
      ctx.strokeStyle = C.dead; ctx.lineWidth = 2;
      const cx0 = Math.max(tipX, woodX + 2);
      const cx1 = Math.min(cx0 + crack, woodX1 - 4);
      const len = cx1 - cx0;
      zig(cx0, axisY, cx1, axisY, 7);
      // grain parting above/below
      ctx.globalAlpha = 0.5;
      zig(cx0, axisY - 10, cx0 + len * 0.7, axisY - 14, 6);
      zig(cx0, axisY + 10, cx0 + len * 0.7, axisY + 14, 6);
      ctx.globalAlpha = 1;
    }

    // the screw
    drawScrew(d, tipX);

    // self-feed pull arrow (into wood) OR skate marker
    if (d.verdict === 'feed') {
      const ax = Math.min(tipX + 48, W - 70);
      arrow(tipX + 6, axisY, ax, axisY, C.keep, 2.4, 10);
      label('draws in', Math.min(tipX + 52, W - 66), axisY - 8, C.keep, 11, 'left', '500');
    } else if (d.verdict === 'skate') {
      const headX = tipX - L_SCREW;
      label('skates — strips', headX + 6, axisY - 44, C.drift, 12, 'left', '500');
      // circular spin arrows at the head — turning, not advancing
      ctx.strokeStyle = C.drift; ctx.lineWidth = 2;
      const sx = headX + 18;
      ctx.beginPath(); ctx.arc(sx, axisY, 16, 0.4, 0.4 + 4.4); ctx.stroke();
    } else if (d.verdict === 'split') {
      label('splits the grain', Math.min(tipX + 10, W - 150), axisY - 44, C.dead, 12, 'left', '500');
    }

    // bursting arrows at embedded thread (wedge spreading grain)
    if (depthPx > 8) {
      const bx = woodX + Math.min(depthPx * 0.6, 60);
      const mag = Math.min(26, d.burst * 1.7);
      const bcol = d.split ? C.dead : (d.burst > SPLIT_LIMIT * 0.8 ? C.drift : C.steel2);
      arrow(bx, axisY - 6, bx, axisY - 6 - mag, bcol, 1.6, 7);
      arrow(bx, axisY + 6, bx, axisY + 6 + mag, bcol, 1.6, 7);
    }

    // depth ticks (turns)
    drawDepthScale(d);

    // nail-vs-screw push comparison (bottom-left)
    drawCompare(d);
  }

  function drawScrew(d, tipX) {
    const headX = tipX - L_SCREW;
    const shaftY = axisY, half = 9;
    // head
    ctx.fillStyle = C.brass; roundRect(headX - 22, shaftY - 13, 22, 26, 3); ctx.fill();
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1; roundRect(headX - 22, shaftY - 13, 22, 26, 3); ctx.stroke();
    // shank core
    const coreX1 = tipX - 14;
    ctx.fillStyle = C.brassB; ctx.globalAlpha = 0.5;
    ctx.fillRect(headX, shaftY - half * 0.5, coreX1 - headX, half);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1;
    ctx.strokeRect(headX, shaftY - half * 0.5, coreX1 - headX, half);
    // thread (triangles) — spacing = pitch, slide with rotation
    const pitchPx = 8 + state.pitch * 4.5;
    ctx.strokeStyle = C.brass2; ctx.lineWidth = 1.5;
    const off = (rot % 1) * pitchPx;
    ctx.save();
    ctx.beginPath(); ctx.rect(headX, shaftY - half - 9, coreX1 - headX + 16, (half + 9) * 2); ctx.clip();
    for (let x = headX - pitchPx; x < coreX1 + pitchPx; x += pitchPx) {
      const xx = x + off;
      ctx.beginPath();
      ctx.moveTo(xx, shaftY - half - 7);
      ctx.lineTo(xx + pitchPx * 0.5, shaftY);
      ctx.lineTo(xx, shaftY + half + 7);
      ctx.stroke();
    }
    ctx.restore();
    // pointed cutting tip
    ctx.fillStyle = C.brass2;
    ctx.beginPath();
    ctx.moveTo(coreX1, shaftY - half - 6);
    ctx.lineTo(tipX, shaftY);
    ctx.lineTo(coreX1, shaftY + half + 6);
    ctx.closePath(); ctx.fill();
  }

  function drawDepthScale(d) {
    const x0 = woodX, y = 392;
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + maxDepthPx + 10, y); ctx.stroke();
    const pitchPx = 8 + state.pitch * 4.5;
    const turns = depthPx / pitchPx;
    for (let t = 0; t * pitchPx <= maxDepthPx; t++) {
      const xx = x0 + t * pitchPx;
      ctx.strokeStyle = C.inkFaint; ctx.beginPath(); ctx.moveTo(xx, y - 4); ctx.lineTo(xx, y + 4); ctx.stroke();
    }
    label('depth: ' + turns.toFixed(1) + ' turns × pitch', x0, y + 18, C.inkFaint, 10, 'left');
  }

  function drawCompare(d) {
    const x = 24, y = 300, w = 150;
    label('PUSH YOU SUPPLY', x, y - 10, C.inkFaint, 10, 'left', '500');
    // screw row
    ctx.fillStyle = C.keep; ctx.fillRect(x, y, 4, 10);
    label('screw: 0 — feed is the pitch', x + 12, y + 9, C.keep, 10, 'left');
    // nail row — bar grows (nominal)
    const nb = Math.min(w, d.nail / 6);
    ctx.fillStyle = C.dead; ctx.globalAlpha = 0.8; ctx.fillRect(x, y + 20, nb, 10); ctx.globalAlpha = 1;
    label('nail: ' + Math.round(d.nail) + ' N, rising with depth', x + 12, y + 46, C.dead, 10, 'left');
  }

  // ---- helpers ----
  function zig(x1, y1, x2, y2, amp) {
    const n = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 10));
    ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t + (i % 2 ? amp : -amp) * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  function arrow(x1, y1, x2, y2, col, wd, head = 9) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(txt, x, y, col, size = 12, align = 'left', weight = '400') {
    ctx.fillStyle = col; ctx.font = `${weight} ${size}px "JetBrains Mono", monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(txt, x, y);
  }
  function woodWord(h) { return h <= 1.8 ? 'pine' : h <= 2.8 ? 'fir' : h <= 3.8 ? 'beech' : 'oak'; }
  function woodDesc(h) { return (h <= 1.8 ? 'pine · soft' : h <= 2.8 ? 'fir · medium' : h <= 3.8 ? 'beech · hard' : 'oak · hardest'); }

  // ---- readings ----
  function syncReadings() {
    const d = derive();
    const fe = $('r-feed');
    fe.textContent = d.feeds ? state.pitch.toFixed(1) + ' mm/turn' : '0 — stripping';
    fe.className = 'v ' + (d.feeds ? 'good' : 'warn');
    $('r-pull').textContent = fmtN(d.pull);
    const cu = $('r-cut'); cu.textContent = d.tCut.toFixed(1) + ' N·m';
    cu.className = 'v ' + (d.feeds ? '' : 'warn');
    const bu = $('r-burst'); bu.textContent = (d.burst / SPLIT_LIMIT * 100).toFixed(0) + '% of split';
    bu.className = 'v ' + (d.split ? 'bad' : d.burst > SPLIT_LIMIT * 0.8 ? 'warn' : 'good');
    $('r-nail').textContent = fmtN(d.nail) + ' +';

    const v = $('verdict'), vt = $('verdict-text'), vs = $('verdict-sub');
    v.classList.remove('v-keep', 'v-drift', 'v-dead', 'v-rest');
    if (d.verdict === 'feed') { v.classList.add('v-keep'); vt.textContent = 'Feeds — one pitch per turn, no push'; }
    else if (d.verdict === 'skate') { v.classList.add('v-drift'); vt.textContent = 'Skates — the thread cannot cut'; }
    else { v.classList.add('v-dead'); vt.textContent = 'Splits — the bite bursts the grain'; }
    vs.textContent = `cut ${d.tCut.toFixed(1)} N·m · burst ${(d.burst / SPLIT_LIMIT * 100).toFixed(0)}%`;
  }
  function fmtN(n) { return n >= 1000 ? (n / 1000).toFixed(1) + ' kN' : Math.round(n) + ' N'; }

  function announce() {
    const d = derive();
    let msg = `Pitch ${state.pitch.toFixed(1)} millimetres into ${woodDesc(state.hard)}, torque ${state.torque.toFixed(1)} newton-metres, ` +
      (state.pilot ? 'pilot hole bored. ' : 'no pilot hole. ');
    if (d.verdict === 'feed') msg += `Feeds cleanly — ${state.pitch.toFixed(1)} millimetres per turn, drawn in by ${fmtN(d.pull)} of pull, and you push nothing.`;
    else if (d.verdict === 'skate') msg += `It skates — the cut needs ${d.tCut.toFixed(1)} newton-metres and you have ${state.torque.toFixed(1)}; the thread strips and feeds nothing.`;
    else msg += `It splits — the bursting force is past what the grain can hold. Coarsen less, or bore a pilot hole.`;
    $('sr').textContent = msg;
  }

  // ---- animation ----
  let raf = null;
  function animate(kind) {
    const d = derive();
    if (reduceMotion()) {
      if (kind === 'drive') { depthPx = d.feeds ? maxDepthPx : 14; crack = d.split ? 120 : 0; }
      else if (kind === 'back') { depthPx = 0; crack = 0; }
      render(); return;
    }
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const from = depthPx;
    let target;
    if (kind === 'back') target = 0;
    else target = d.feeds ? maxDepthPx : Math.min(from + 10, 16); // skate: barely moves
    const dur = 1100;
    const loop = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 2);
      depthPx = from + (target - from) * e;
      rot += (kind === 'back' ? -1 : 1) * 0.14;
      if (d.split && kind === 'drive') { crack = Math.max(0, (depthPx - 20)) * 1.1 * k; }
      else if (kind === 'back') crack *= (1 - k);
      render();
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // ---- controls ----
  function wire() {
    const bind = (id, fn, fmt) => {
      const el = $(id), out = $(id + '-v');
      el.addEventListener('input', () => {
        const v = parseFloat(el.value); fn(v); if (out) out.textContent = fmt(v);
        // changing settings re-reads the current embedment
        save(); render(); syncReadings(); announce();
      });
    };
    bind('pitch', (v) => state.pitch = v, (v) => v.toFixed(1) + ' mm');
    bind('hard', (v) => state.hard = v, (v) => woodDesc(v));
    bind('torque', (v) => state.torque = v, (v) => v.toFixed(1) + ' N·m');

    const pilot = $('pilot');
    pilot.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        state.pilot = parseInt(b.dataset.v, 10);
        pilot.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        save(); render(); syncReadings(); announce();
      });
    });

    $('drive').addEventListener('click', () => { animate('drive'); setTimeout(() => { syncReadings(); announce(); }, 40); });
    $('back').addEventListener('click', () => { animate('back'); });
    $('reset').addEventListener('click', () => {
      cancelAnimationFrame(raf); raf = null;
      state.pitch = 3; state.hard = 2.2; state.torque = 4; state.pilot = 0; depthPx = 0; crack = 0; rot = 0;
      reflect(); save(); render(); syncReadings(); announce();
    });
  }
  function reflect() {
    $('pitch').value = state.pitch; $('pitch-v').textContent = state.pitch.toFixed(1) + ' mm';
    $('hard').value = state.hard; $('hard-v').textContent = woodDesc(state.hard);
    $('torque').value = state.torque; $('torque-v').textContent = state.torque.toFixed(1) + ' N·m';
    $('pilot').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', parseInt(x.dataset.v, 10) === state.pilot ? 'true' : 'false'));
  }

  function boot() {
    fit(); palette(); load(); reflect(); depthPx = 0; render(); syncReadings(); announce(); wire();
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { palette(); render(); });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fit(); render(); }, 120); });
  boot();
})();
