/* Flywheel — the bench.
 *
 * A flywheel is a wheel made heavy at the rim, added to a shaft to store turning as
 * energy and even out its speed. Its whole use is to smooth a drive that arrives in
 * gusts, and the whole of it is one store read three ways:
 *
 *   store    E  = ½·I·ω²                 (energy banked in the rim, as the square of speed)
 *   smooth   Cs = ΔE ⁄ (I·ω²)            (the speed wobble left over — double I, halve it)
 *   burst    σ  = ρ·v²                   (the ceiling is rim speed, not size)
 *
 * A pulsing drive feeds the shaft against a steady load. At balance the drive's mean
 * torque equals the load, so the mean speed is set by the load alone — ω̄ = ω_free·
 * (1 − τ_L ⁄ τ0), independent of the wheel. Inside each cycle the drive runs above the
 * load and then below it; the surplus banks into the wheel (it speeds up) and the
 * shortfall is drawn back out (it slows), swinging the stored energy by ΔE and the
 * speed by ΔE ⁄ (I·ω̄). The wheel's only say is in how big a speed swing that fixed
 * energy costs. Bearings idealised as frictionless; the drive profiles are stylised,
 * but the shape is exact. Speeds in rpm, torque in N·m, energy in kJ, rim speed in m ⁄ s.
 */
(function () {
  "use strict";

  // ---- the engine and the wheel ---------------------------------------
  var TAU0 = 300;          // stall torque of the drive, N·m — its torque at zero speed
  var OMEGA_FREE = 3000;   // no-load speed of the drive, rpm — where it would run unloaded
  var R = 0.42;            // rim radius, m — fixed; the burst limit is a rim speed, not a size
  var V_MAX = 118;         // rim speed the material will hold, m ⁄ s — past it, it bursts
  var TOL = 0.02;          // the mill's tolerance on speed fluctuation, Cs — 2%
  var OMEGA_MIN = 120;     // a heavy load can drag the mean speed down to about here, rpm
  var LABOUR = 950;        // below this mean speed a rough run reads as labouring, not surging

  var TWO_PI = Math.PI * 2;
  var RPM2RAD = TWO_PI / 60;
  var OMEGA_FREE_RAD = OMEGA_FREE * RPM2RAD;

  // Each drive delivers the same average torque (it must, at balance) but in a
  // different pattern over its cycle — a near-even steam engine, a twin, a single,
  // a four-stroke single that fires once every second turn. The lumpier the pattern,
  // the more energy the wheel must bank and spend, and the harder it is to steady.
  var DRIVES = {
    steam:  { label: "steam engine",     short: "steam",    revs: 1, centers: [0.25, 0.75], width: 0.20, base: 0.55 },
    twin:   { label: "twin",             short: "twin",     revs: 1, centers: [0.15, 0.65], width: 0.11, base: 0.16 },
    single: { label: "single cylinder",  short: "single",   revs: 1, centers: [0.18],       width: 0.10, base: 0.10 },
    thump:  { label: "four-stroke single", short: "4-stroke", revs: 2, centers: [0.12],     width: 0.070, base: 0.06 }
  };

  var NSAMP = 240;         // samples across one cycle of the drive

  var DEFAULT = { fly: 4, load: 160, drive: "single" };
  var FLY_MIN = 0.3, FLY_MAX = 14, FLY_STEP = 0.1;   // flywheel inertia I, kg·m²
  var LOAD_MIN = 10, LOAD_MAX = 280, LOAD_STEP = 5;  // steady load torque τ_L, N·m
  var KEY = "flywheel.shaft.v1";                     // where the wheel, load and drive are kept between visits

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    v = Math.round(v * 1e6) / 1e6;
    return v < a ? a : v > b ? b : v;
  }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!DRIVES[o.drive]) return null;
      return {
        drive: o.drive,
        fly: clampStep(o.fly, FLY_MIN, FLY_MAX, FLY_STEP),
        load: clampStep(o.load, LOAD_MIN, LOAD_MAX, LOAD_STEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the drive's shape over a cycle ----------------------------------
  // A normalised torque pattern, mean exactly 1, so that scaled by the load it has
  // the load's average — the balance condition. Sum of gaussian pulses on a small
  // baseline, wrapped round the cycle, then divided by its own mean.
  var shapeCache = {};
  function driveShape(name) {
    if (shapeCache[name]) return shapeCache[name];
    var d = DRIVES[name];
    var raw = new Float64Array(NSAMP), sum = 0, i, c, k;
    for (i = 0; i < NSAMP; i++) {
      var u = i / NSAMP, v = d.base;
      for (c = 0; c < d.centers.length; c++) {
        var dd = u - d.centers[c];
        dd -= Math.round(dd);              // wrap to nearest, [-0.5, 0.5]
        v += Math.exp(-(dd * dd) / (d.width * d.width));
      }
      raw[i] = v; sum += v;
    }
    var mean = sum / NSAMP, shape = new Float64Array(NSAMP);
    for (k = 0; k < NSAMP; k++) shape[k] = raw[k] / mean;
    shapeCache[name] = { shape: shape, revs: d.revs };
    return shapeCache[name];
  }

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var d = DRIVES[s.drive];
    var I = s.fly, tauL = s.load;

    // mean speed is set by the load alone: the drive's mean torque equals the load
    var wbarRpm = clamp(OMEGA_FREE * (1 - tauL / TAU0), OMEGA_MIN, OMEGA_FREE);
    var wbar = wbarRpm * RPM2RAD;              // rad/s

    // net work banked in the wheel across the cycle, W(u) = ∫ τ_L·(shape − 1) dΘ
    var sh = driveShape(s.drive);
    var dTheta = sh.revs * TWO_PI / NSAMP;
    var work = new Float64Array(NSAMP), acc = 0, i;
    var Wmin = 0, Wmax = 0, Wsum = 0;
    for (i = 0; i < NSAMP; i++) {
      work[i] = acc;
      Wsum += acc;
      if (acc < Wmin) Wmin = acc;
      if (acc > Wmax) Wmax = acc;
      acc += tauL * (sh.shape[i] - 1) * dTheta;
    }
    var Wmean = Wsum / NSAMP;
    var dE = Wmax - Wmin;                       // energy the wheel banks and spends per cycle, J

    // the speed trace: E(u) = ½·I·ω̄² + (W(u) − W̄), and ω(u) = √(2E ⁄ I)
    var Ebar = 0.5 * I * wbar * wbar;
    var trace = new Float64Array(NSAMP), wmax = 0, wmin = Infinity;
    for (i = 0; i < NSAMP; i++) {
      var E = Ebar + (work[i] - Wmean);
      var w = Math.sqrt(Math.max(0, 2 * E / I));
      trace[i] = w;
      if (w > wmax) wmax = w;
      if (w < wmin) wmin = w;
    }
    var Cs = wbar > 0 ? (wmax - wmin) / wbar : 0;

    var vMean = wbar * R, vPeak = wmax * R;     // rim speed, m/s
    var Estore = Ebar;                          // stored energy, J
    var spinup = 3 * I * OMEGA_FREE_RAD / TAU0; // ≈ 3 time-constants to reach speed, s

    // the least inertia that would bring Cs to the tolerance, at this speed and drive
    var Imin = wbar > 0 ? dE / (TOL * wbar * wbar) : Infinity;

    var burst = vPeak >= V_MAX;
    var rough = !burst && Cs > TOL;
    var labouring = rough && wbarRpm < LABOUR;
    var nearBurst = !burst && vPeak >= 0.85 * V_MAX;

    return {
      d: d, I: I, tauL: tauL,
      wbarRpm: wbarRpm, wbar: wbar, trace: trace, revs: sh.revs,
      wmaxRpm: wmax / RPM2RAD, wminRpm: wmin / RPM2RAD,
      dE: dE, Cs: Cs, Estore: Estore, vMean: vMean, vPeak: vPeak,
      spinup: spinup, Imin: Imin,
      burst: burst, rough: rough, labouring: labouring, nearBurst: nearBurst,
      shape: sh.shape
    };
  }

  // the least flywheel that steadies the current drive — snapped to a step
  function findSteady(s) {
    var r = compute(s);
    return clamp(Math.ceil(r.Imin / FLY_STEP) * FLY_STEP, FLY_MIN, FLY_MAX);
  }

  function verdictOf(r) {
    if (r.burst) return "burst";
    if (r.rough) return r.labouring ? "labour" : "surge";
    return "steady";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inFly = $("in-fly"), inLoad = $("in-load");
  var labFly = $("lab-fly"), labLoad = $("lab-load");
  var driveBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-drive]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var fMark = $("f-mark"), fNote = $("f-note");

  function nm(x) { return Math.round(x) + " N·m"; }
  function rpm(x) { return Math.round(x); }
  // group the running figures a thin space every three digits — the mean speed and
  // the swing climb into the thousands, and a bare 1400 is harder to read at a glance
  // than 1 400. The spoken status line keeps rpm() plain so a screen reader reads it
  // as one number.
  function group(x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function grpm(x) { return group(x); }
  function pct(x) { return (x * 100).toFixed(1) + "%"; }
  function kj(x) { return (x / 1000).toFixed(x < 10000 ? 1 : 0) + " kJ"; }
  function ms(x) { return x.toFixed(0) + " m ⁄ s"; }
  function secs(x) { return x < 10 ? x.toFixed(1) + " s" : Math.round(x) + " s"; }

  var FLY_WORD = function (v) {
    if (v < 1.2) return "slight";
    if (v < 3) return "light";
    if (v < 6.5) return "ample";
    if (v < 10.5) return "heavy";
    return "massive";
  };

  function syncLabels() {
    labFly.textContent = FLY_WORD(state.fly);
    labLoad.textContent = nm(state.load);
    driveBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.drive === state.drive));
    });
  }

  var VERDICT_TEXT = {
    steady: { cls: "v-keep",  word: "Steady",    note: "the shaft turns even" },
    surge:  { cls: "v-drift", word: "Surging",   note: "too little wheel for this drive" },
    labour: { cls: "v-drift", word: "Labouring", note: "the load drags the speed low" }
  };
  var BURST = { cls: "v-dead", word: "Bursting", note: "the rim runs past what it can hold" };

  function render(r) {
    var verdict = verdictOf(r);
    var v = verdict === "burst" ? BURST : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var csClass = r.burst ? "bad" : r.rough ? "warn" : "good";
    var rimClass = r.burst ? "bad" : r.nearBurst ? "warn" : "good";
    var swing = grpm(r.wmaxRpm) + " · " + grpm(r.wminRpm);

    var rows = [
      ['Mean speed <span class="tag">ω̄</span>', grpm(r.wbarRpm) + '<span class="unit"> rpm · load sets it</span>', ""],
      ["Speed swing", swing + '<span class="unit"> rpm · max · min</span>', r.burst ? "bad" : r.rough ? "warn" : ""],
      ['Fluctuation <span class="tag">Cs</span>', pct(r.Cs) + '<span class="unit"> · tol ' + pct(TOL) + "</span>", csClass],
      ['Stored <span class="tag c">½Iω²</span>', kj(r.Estore) + '<span class="unit"> · in the rim</span>', ""],
      ['Rim speed <span class="tag">v</span>', ms(r.vPeak) + '<span class="unit"> · limit ' + V_MAX + "</span>", rimClass],
      ["Spin-up", "≈ " + secs(r.spinup) + '<span class="unit"> · to speed</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markFly(r);
    return verdict;
  }

  // mark, under the flywheel slider, the least inertia that steadies this drive
  function markFly(r) {
    if (!fMark || !fNote) return;
    var need = findSteady(state);
    var overMax = r.Imin > FLY_MAX + 1e-6;
    fMark.style.left = (clamp(need, FLY_MIN, FLY_MAX) - FLY_MIN) / (FLY_MAX - FLY_MIN) * 100 + "%";
    fMark.className = overMax ? "x-mark off" : "x-mark";
    if (r.burst) fNote.innerHTML = "bursting — more wheel won't help; <b>ease the load in</b>";
    else if (overMax) fNote.innerHTML = "no wheel steadies it this slow: <b>ease the load</b>";
    else if (Math.abs(need - state.fly) <= FLY_STEP + 1e-6) fNote.innerHTML = "the least wheel that steadies this: <b>" + need.toFixed(1) + " kg·m²</b>";
    else if (state.fly < need) fNote.innerHTML = "steadies at <b>" + need.toFixed(1) + " kg·m²</b> of wheel";
    else fNote.innerHTML = "ample — steadies from <b>" + need.toFixed(1) + " kg·m²</b>";
  }

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 560, H = 470, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function sizeCanvas() {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  var reduceMQ = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = reduceMQ ? reduceMQ.matches : false;

  var cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };
  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  var theta = 0;      // running crank angle, radians — drives the wheel and the pulse timing
  var uNow = 0;       // current fraction through the drive cycle, [0,1)

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "burst" ? col.dead : (verdict === "surge" || verdict === "labour") ? col.drift : col.keep;

    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, cur, verdict);
    drawTrace(col, accent, cur, verdict);
    drawCurve(col, cur, verdict);
    drawGauge(col, accent, cur);
  }

  // ---- the shaft: a flywheel between a pulsing drive and a steady load ---
  function drawScene(col, accent, cur, verdict) {
    var cx = 200, cy = 104, rr = 74;
    var spin = verdict === "burst";
    var wheelCol = spin ? col.dead : col.iron;

    // instantaneous drive pulse strength, 0..1 — brightens on the power stroke
    var idx = Math.floor(uNow * NSAMP) % NSAMP;
    var pulse = clamp((cur.shape[idx] - 1) / 2.2, 0, 1);

    // the drive on the left — a cylinder feeding the shaft in pulses
    var dx = 44, dy = cy;
    label(ctx, col.faint, "drive · " + cur.d.short, dx, 30, "center");
    ctx.fillStyle = withAlpha(col.timber, 0.10 + 0.5 * (reduce ? 0.4 : pulse));
    roundRect(dx - 20, dy - 30, 40, 60, 6); ctx.fill();
    ctx.strokeStyle = withAlpha(col.timber2, 0.7); ctx.lineWidth = 1.4;
    roundRect(dx - 20, dy - 30, 40, 60, 6); ctx.stroke();
    // the piston, riding up on the pulse
    var pistY = dy + 14 - (reduce ? 8 : 22 * pulse);
    ctx.fillStyle = withAlpha(col.timber2, 0.8);
    roundRect(dx - 14, pistY, 28, 12, 3); ctx.fill();
    arrow(ctx, col.timber, dx, dy - 34, dx, dy - 44 - (reduce ? 0 : 10 * pulse), 1.8, 6);
    // the drive shaft into the wheel
    ctx.strokeStyle = withAlpha(col.faint, 0.55); ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(dx + 20, dy); ctx.lineTo(cx - rr + 6, cy); ctx.stroke();
    ctx.lineCap = "butt";

    // the load on the right — a steady brake, always the same
    var lx = 356, ly = cy;
    ctx.strokeStyle = withAlpha(col.faint, 0.55); ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx + rr - 6, cy); ctx.lineTo(lx - 8, ly); ctx.stroke();
    ctx.lineCap = "butt";
    label(ctx, col.faint, "load", lx + 4, 30, "center");
    ctx.fillStyle = withAlpha(col.iron, 0.12);
    roundRect(lx - 4, ly - 26, 26, 52, 5); ctx.fill();
    ctx.strokeStyle = withAlpha(col.iron2, 0.65); ctx.lineWidth = 1.4;
    roundRect(lx - 4, ly - 26, 26, 52, 5); ctx.stroke();
    for (var h = 0; h < 5; h++) {
      var hy = ly - 20 + h * 10;
      ctx.strokeStyle = withAlpha(col.iron2, 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx - 2, hy); ctx.lineTo(lx + 20, hy); ctx.stroke();
    }
    // a steady braking arrow — same length whatever the drive does
    arrow(ctx, col.iron2, lx + 26, ly - 8, lx + 44, ly - 8, 1.6, 6);
    label(ctx, col.iron2, nm(cur.tauL), lx + 40, ly + 12, "center");

    // the flywheel itself — heavy rim, spokes, hub
    drawFlywheel(cx, cy, rr, theta * 0.5, wheelCol, col, cur);

    // its mean speed
    label(ctx, spin ? col.dead : col.iron2, "ω̄ " + grpm(cur.wbarRpm) + " rpm", cx, cy + rr + 22, "center");
    label(ctx, col.faint, "stored " + kj(cur.Estore), cx, cy + rr + 36, "center");

    // rotation hint
    curvedArrow(ctx, spin ? col.dead : col.iron2, cx, cy, rr + 10, theta, 1);

    if (spin) label(ctx, col.dead, "the rim lets go", cx, 30, "center");
  }

  // a flywheel: a heavy rim ring, a few spokes, a hub, turned by `ang`
  function drawFlywheel(cx, cy, r, ang, edge, col, cur) {
    // the mass concentrated at the rim reads as a thick ring; heavier wheel, thicker ring
    var rimW = clamp(6 + cur.I * 1.1, 7, 22);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    // rim
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI);
    ctx.strokeStyle = withAlpha(edge, 0.85); ctx.lineWidth = rimW; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TWO_PI);
    ctx.strokeStyle = withAlpha(edge, 0.5); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r - rimW, 0, TWO_PI);
    ctx.strokeStyle = withAlpha(edge, 0.5); ctx.lineWidth = 1.2; ctx.stroke();
    // spokes
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * TWO_PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r * 0.16), Math.sin(a) * (r * 0.16));
      ctx.lineTo(Math.cos(a) * (r - rimW), Math.sin(a) * (r - rimW));
      ctx.strokeStyle = withAlpha(edge, 0.42); ctx.lineWidth = 2.4; ctx.stroke();
    }
    // hub
    ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, TWO_PI);
    ctx.fillStyle = col.field2; ctx.fill();
    ctx.strokeStyle = withAlpha(edge, 0.8); ctx.lineWidth = 1.6; ctx.stroke();
    // a keyway mark so the turn reads
    ctx.beginPath(); ctx.moveTo(0, -r * 0.16); ctx.lineTo(0, -r + rimW * 0.4);
    ctx.strokeStyle = withAlpha(edge, 0.7); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
  }

  // ---- the speed trace: the wobble across one cycle ---------------------
  function drawTrace(col, accent, cur, verdict) {
    var bx = 24, by = 224, bw = 352, bh = 166;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "speed across one cycle of the drive", bx + 12, by + 18, "left");

    var ax0 = bx + 40, ax1 = bx + bw - 16, ay0 = by + 34, ay1 = by + bh - 26;
    var spin = verdict === "burst";

    // vertical scale: centre on ω̄, span at least ±3% so a flat trace still reads flat
    var wbar = cur.wbarRpm;
    var half = Math.max(cur.wmaxRpm - wbar, wbar - cur.wminRpm, wbar * 0.03) * 1.25;
    var yFor = function (w) { return clamp(ay1 - (w - (wbar - half)) / (2 * half) * (ay1 - ay0), ay0, ay1); };
    var xFor = function (u) { return ax0 + u * (ax1 - ax0); };

    // the tolerance band, ±½·Cs_tol about the mean — inside it the run is steady
    var bandTop = yFor(wbar * (1 + TOL / 2)), bandBot = yFor(wbar * (1 - TOL / 2));
    ctx.fillStyle = withAlpha(col.keep, 0.12);
    ctx.fillRect(ax0, bandTop, ax1 - ax0, bandBot - bandTop);
    ctx.strokeStyle = withAlpha(col.keep, 0.4); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(ax0, bandTop); ctx.lineTo(ax1, bandTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax0, bandBot); ctx.lineTo(ax1, bandBot); ctx.stroke();
    ctx.setLineDash([]);

    // the mean line
    ctx.strokeStyle = withAlpha(col.faint, 0.55); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax0, yFor(wbar)); ctx.lineTo(ax1, yFor(wbar)); ctx.stroke();
    label(ctx, col.faint, "ω̄", ax0 - 8, yFor(wbar) + 3, "right");
    label(ctx, col.faint, "tol", ax0 - 8, bandTop + 3, "right");

    // the trace itself
    var lineCol = spin ? col.dead : cur.rough ? col.drift : col.iron2;
    ctx.strokeStyle = lineCol; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i <= NSAMP; i++) {
      var u = i / NSAMP, w = cur.trace[i % NSAMP] / RPM2RAD;
      var x = xFor(u), y = yFor(w);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // the playhead, sweeping with the running wheel
    if (!reduce) {
      var px = xFor(uNow);
      var pw = cur.trace[Math.floor(uNow * NSAMP) % NSAMP] / RPM2RAD;
      ctx.strokeStyle = withAlpha(accent, 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, ay0); ctx.lineTo(px, ay1); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(px, yFor(pw), 3.2, 0, TWO_PI); ctx.fill();
    }

    var msg = cur.dE > 0
      ? "banks and spends " + kj(cur.dE) + " each cycle"
      : "an even drive — nothing to bank";
    label(ctx, spin ? col.dead : cur.rough ? col.drift : col.keep, msg, bx + 12, by + bh - 12, "left");
  }

  // ---- the curve: the speed wobble falls as the wheel grows -------------
  function drawCurve(col, cur, verdict) {
    var ix = 392, iy = 224, iw = 152, ih = 166, pad = 24;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "wobble Cs vs wheel", ix + 10, iy + 16, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - pad - 12, Hc = ih - 2 * pad - 6;
    var csMax = Math.max(TOL * 3, cur.Cs * 1.1, 0.02);
    var xFor = function (I) { return Ox + (I - FLY_MIN) / (FLY_MAX - FLY_MIN) * L; };
    var yFor = function (cs) { return Oy - clamp(cs, 0, csMax) / csMax * Hc; };

    // Cs(I) = ΔE ⁄ (I·ω̄²) — a 1/I falloff, at the current speed and drive
    var w2 = cur.wbar * cur.wbar;
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.6; ctx.beginPath();
    for (var k = 0; k <= 60; k++) {
      var I = FLY_MIN + (FLY_MAX - FLY_MIN) * k / 60;
      var cs = w2 > 0 ? cur.dE / (I * w2) : csMax;
      var x = xFor(I), y = yFor(cs);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // the tolerance line, and the least-wheel point where the curve crosses it
    ctx.strokeStyle = withAlpha(col.keep, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(Ox, yFor(TOL)); ctx.lineTo(Ox + L, yFor(TOL)); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.keep, "tol", Ox + L, yFor(TOL) - 4, "right");
    if (cur.Imin >= FLY_MIN && cur.Imin <= FLY_MAX) {
      var mx = xFor(cur.Imin);
      ctx.strokeStyle = withAlpha(col.keep, 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mx, yFor(TOL)); ctx.lineTo(mx, Oy); ctx.stroke();
    }

    // the current wheel
    var cxp = xFor(cur.I), cyp = yFor(cur.Cs);
    ctx.fillStyle = verdict === "burst" ? col.dead : cur.rough ? col.drift : col.keep;
    ctx.beginPath(); ctx.arc(cxp, cyp, 3.4, 0, TWO_PI); ctx.fill();
    label(ctx, col.faint, "wheel I", Ox + L, Oy + 14, "right");
  }

  // ---- the gauge: rim speed against the bursting limit ------------------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 404, bw = W - 48, bh = 52;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 70, gx1 = W - 70, gy = 434, scaleMax = V_MAX * 1.15;   // rim speed axis, m/s
    var xFor = function (v) { return gx0 + clamp(v, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // the safe band — rim speed up to the material's limit
    var wall = xFor(V_MAX);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, wall - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, wall - gx0, 16);
    // past the wall — the rim bursts
    ctx.fillStyle = withAlpha(col.dead, 0.12);
    ctx.fillRect(wall, gy - 8, xFor(scaleMax) - wall, 16);
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(wall, gy - 12); ctx.lineTo(wall, gy + 12); ctx.stroke();
    label(ctx, col.faint, "v_max " + V_MAX, wall, gy + 22, "center");

    label(ctx, col.faint, "rim speed  σ = ρ·v²", (gx0 + gx1) / 2, gy - 15, "center");
    label(ctx, col.faint, "0", gx0, gy + 22, "left");

    // the mean rim speed, a faint tick, and the peak, the needle
    var mX = xFor(cur.vMean);
    ctx.strokeStyle = withAlpha(col.iron2, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mX, gy - 9); ctx.lineTo(mX, gy + 9); ctx.stroke();

    var nX = xFor(cur.vPeak);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, TWO_PI); ctx.fill();
  }

  // ---- small canvas helpers --------------------------------------------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function arrow(c, color, x0, y0, x1, y1, w, head) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.lineCap = "round";
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    var a = Math.atan2(y1 - y0, x1 - x0);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42));
    c.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42));
    c.closePath(); c.fill();
    c.lineCap = "butt";
  }
  function curvedArrow(c, color, cx, cy, r, ph, dir) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.6;
    var a0 = ph * dir, a1 = a0 + dir * 1.8;
    c.beginPath(); c.arc(cx, cy, r, a0, a1, dir < 0); c.stroke();
    var ex = cx + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r;
    var ta = a1 + dir * Math.PI / 2;
    c.beginPath();
    c.moveTo(ex, ey);
    c.lineTo(ex - 5 * Math.cos(ta - 0.4), ey - 5 * Math.sin(ta - 0.4));
    c.lineTo(ex - 5 * Math.cos(ta + 0.4), ey - 5 * Math.sin(ta + 0.4));
    c.closePath(); c.fill();
  }
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);
  var curVerdict = verdictOf(current);
  var lastTs = null;

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    // under reduced motion the wheel is held still — no rotation, no sweeping
    // playhead — each state read as a settled arrangement rather than a running shaft
    if (!reduce) {
      // advance the crank; the wheel runs faster where the trace runs faster, so a
      // light wheel visibly surges and a heavy one glides
      var idx = Math.floor(uNow * NSAMP) % NSAMP;
      var rel = current.wbar > 0 ? current.trace[idx] / current.wbar : 1;
      theta += dt * 2.0 * clamp(rel, 0.4, 2.2);
      uNow = (uNow + dt * 0.22) % 1;   // one cycle roughly every ~4.5 s, readable
    }
    draw(current, curVerdict);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    curVerdict = render(current);
    announce(current, curVerdict);
    save();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = "A " + FLY_WORD(r.I) + " flywheel of " + r.I.toFixed(1) + " kilogram metres squared on a "
        + r.d.label + " drive against a " + nm(r.tauL) + " load, turning at a mean of " + rpm(r.wbarRpm) + " rpm. ";
      var store = "It stores " + kj(r.Estore) + ", and banks and spends " + kj(r.dE) + " each cycle. ";
      var tail;
      if (verdict === "steady") {
        tail = "Steady — the speed swings only " + pct(r.Cs) + ", inside the tolerance of " + pct(TOL)
          + ", so the shaft turns as if the drive were smooth. Rim speed " + ms(r.vPeak) + ", well under the limit of " + V_MAX + ".";
      } else if (verdict === "surge") {
        tail = "Surging — too little wheel for this drive: the speed swings " + pct(r.Cs) + ", past the tolerance of " + pct(TOL)
          + ". A heavier rim, or the Steady it button, brings it under; the least wheel that does is about " + findSteady(state).toFixed(1) + " kilogram metres squared.";
      } else if (verdict === "labour") {
        tail = "Labouring — the load drags the mean speed down to " + rpm(r.wbarRpm) + " rpm, so the store is small and the same energy swings the speed " + pct(r.Cs)
          + ", past the tolerance. Ease the load to lift the speed, or add a great deal of wheel.";
      } else {
        tail = "Bursting — the load is so light the wheel runs away, its rim reaching " + ms(r.vPeak)
          + ", past the material's limit of " + V_MAX + " metres a second. More wheel does not help — the ceiling is rim speed, not size. Ease the load in to bring the speed down.";
      }
      sayEl.textContent = head + store + tail;
    }, 260);
  }

  inFly.addEventListener("input", function () { state.fly = clampStep(inFly.value, FLY_MIN, FLY_MAX, FLY_STEP); update(); });
  inLoad.addEventListener("input", function () { state.load = clampStep(inLoad.value, LOAD_MIN, LOAD_MAX, LOAD_STEP); update(); });
  driveBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.drive = bn.dataset.drive; update(); });
  });

  $("steady").addEventListener("click", function () {
    var need = findSteady(state);
    state.fly = need; inFly.value = need; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inFly.value = state.fly; inLoad.value = state.load;
    update();
  });

  // nudge a slider-backed value by a step, from the keyboard
  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clampStep(state[field] + delta, lo, hi, step);
    input.value = state[field];
    update();
  }

  // keyboard: work the bench without reaching for the mouse
  var DRIVE_KEYS = { "1": "steam", "2": "twin", "3": "single", "4": "thump" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "s" || k === "S") { $("steady").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (DRIVE_KEYS[k]) { state.drive = DRIVE_KEYS[k]; update(); }
    else if (k === "]") { nudge("fly", FLY_STEP * 5, FLY_MIN, FLY_MAX, FLY_STEP, inFly); }        // heavier wheel
    else if (k === "[") { nudge("fly", -FLY_STEP * 5, FLY_MIN, FLY_MAX, FLY_STEP, inFly); }       // lighter wheel
    else if (k === "=" || k === "+") { nudge("load", LOAD_STEP, LOAD_MIN, LOAD_MAX, LOAD_STEP, inLoad); }   // more load
    else if (k === "-" || k === "_") { nudge("load", -LOAD_STEP, LOAD_MIN, LOAD_MAX, LOAD_STEP, inLoad); }  // less load
    else return;
    e.preventDefault();
  });

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      draw(current, curVerdict);
    });
  }

  // ---- go --------------------------------------------------------------
  inFly.value = state.fly; inLoad.value = state.load;
  update();
})();
