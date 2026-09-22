/* Differential — the bench.
 *
 * A differential divides one drive between two half-shafts and lets them turn at
 * different speeds. Its carrier carries a pinion free to roll on its own pin,
 * meshing with a side gear on each shaft, and that one pinion does two things at
 * once:
 *
 *   speeds   ω_L + ω_R = 2·ω_c          (the carrier turns at the average)
 *   torque   T_L = T_R = T ⁄ 2          (a beam on a fulcrum: equal arms, equal push)
 *
 * The first frees the wheels to differ round a corner; the second, the same
 * symmetry seen from the other end, holds them to an equal share of torque. And
 * because a wheel passes to the road no more torque than its grip allows, the equal
 * split caps an open axle at twice the grip of its worst wheel: put one wheel on ice
 * and the good wheel is held down with it, the extra throttle only spinning the
 * wheel that already slips — ω_ice climbing by exactly what ω_grip falls, the sum
 * still pinned. Idealised, lossless gears; the grounds are stylised, but the shape
 * is exact. Speeds in rpm, torques in newton-metres, for the reader.
 */
(function () {
  "use strict";

  // Each ground is a coefficient of grip under the inner wheel; the wheel's grip
  // torque τ = μ·G falls straight out of it. The outer wheel always runs on dry
  // tarmac. Stylised, but the ordering and the spread are real: dry takes almost
  // any throttle before a wheel lets go, sheet ice breaks at a breath.
  var GROUND = {
    dry:    { label: "dry tarmac", short: "dry",    mu: 1.00 },
    wet:    { label: "wet road",   short: "wet",    mu: 0.55 },
    gravel: { label: "gravel",     short: "gravel", mu: 0.35 },
    ice:    { label: "sheet ice",  short: "ice",    mu: 0.12 }
  };

  var GRIP = 1500;        // per-wheel grip torque at μ = 1 (load × radius), N·m
  var MU_DRY = 1.00;      // the outer wheel's ground
  var OMEGA = 100;        // carrier reference speed ω_c, rpm — the drive's average
  var KMAX = 0.50;        // tightest turn: outer/inner split ±50% of ω_c
  var EDGE_FRAC = 0.90;   // per-wheel demand within this of the grip: at the edge
  var STRAIGHT = 6;       // turn below this reads as straight

  // Opens on a gentle corner, modest throttle, dry ground — the axle drives evenly,
  // every wheel gripping. Find the break raises the throttle to where the inner
  // wheel lets go.
  var DEFAULT = { turn: 24, throttle: 900, ground: "dry" };
  var TURN_MIN = 0, TURN_MAX = 100, TURN_STEP = 2;     // turn, arbitrary 0..100
  var THR_MIN = 0, THR_MAX = 3000, THR_STEP = 50;      // throttle fed to carrier, N·m
  var KEY = "diff.axle.v1";                            // where the turn, throttle and ground are kept between visits

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    return v < a ? a : v > b ? b : v;
  }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!GROUND[o.ground]) return null;
      return {
        ground: o.ground,
        turn: clampStep(o.turn, TURN_MIN, TURN_MAX, TURN_STEP),
        throttle: clampStep(o.throttle, THR_MIN, THR_MAX, THR_STEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var g = GROUND[s.ground];
    var tauIn = g.mu * GRIP;                 // inner wheel's grip torque
    var tauOut = MU_DRY * GRIP;              // outer wheel, on dry
    var tauWeak = Math.min(tauIn, tauOut);   // the axle is only as strong as this, twice
    var T = s.throttle;
    var demand = T / 2;                      // equal split — what each wheel is asked to carry
    var Tbreak = 2 * tauWeak;                // throttle at which the inner wheel breaks free
    var spinning = T > Tbreak + 1e-6;
    var delivered = spinning ? 2 * tauWeak : T;      // tractive torque that reaches the road
    var torqueEach = spinning ? tauWeak : demand;    // still equal, now capped by grip

    var k = (s.turn / 100) * KMAX;
    var wc = OMEGA, wIn, wOut;
    if (!spinning) {
      wOut = wc * (1 + k);                   // outer gains exactly what the inner loses
      wIn  = wc * (1 - k);
    } else {
      // the freed torque spins the inner wheel up; the sum stays pinned to 2·ω_c,
      // so the outer (gripping) wheel drops by exactly what the inner gains
      var sigma = (T - Tbreak) / Math.max(Tbreak, 1);
      var delta = clamp(sigma * wc, 0, wc * (1 + k));
      wOut = wc * (1 + k) - delta;
      wIn  = wc * (1 - k) + delta;
    }
    var edge = !spinning && demand >= EDGE_FRAC * tauWeak;

    return {
      g: g, mu: g.mu, tauIn: tauIn, tauOut: tauOut, tauWeak: tauWeak,
      T: T, demand: demand, Tbreak: Tbreak, delivered: delivered, torqueEach: torqueEach,
      spinning: spinning, edge: edge, k: k, wc: wc, wIn: wIn, wOut: wOut, turn: s.turn
    };
  }

  // the throttle at which the inner wheel breaks free — the exact edge, snapped to a step
  function findBreak(s) {
    var g = GROUND[s.ground];
    var tauWeak = Math.min(g.mu * GRIP, MU_DRY * GRIP);
    return clamp(Math.round((2 * tauWeak) / THR_STEP) * THR_STEP, THR_MIN, THR_MAX);
  }

  function verdictOf(r) {
    if (r.spinning) return "spins";
    if (r.edge) return "edge";
    return r.turn < STRAIGHT ? "even" : "corner";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inTurn = $("in-turn"), inThr = $("in-throttle");
  var labTurn = $("lab-turn"), labThr = $("lab-throttle");
  var groundBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-ground]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var tMark = $("t-mark"), tNote = $("t-note");

  function nm(x) { return Math.round(x) + " N·m"; }
  function rpm(x) { return Math.round(x); }

  var TURN_WORD = function (t) {
    if (t < STRAIGHT) return "straight";
    if (t < 26) return "gentle";
    if (t < 52) return "steady";
    if (t < 78) return "tight";
    return "hairpin";
  };

  function syncLabels() {
    labTurn.textContent = TURN_WORD(state.turn);
    labThr.textContent = nm(state.throttle);
    groundBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.ground === state.ground));
    });
  }

  var VERDICT_TEXT = {
    even:   { cls: "v-keep",  word: "Even",       note: "both wheels grip, split evenly" },
    corner: { cls: "v-keep",  word: "Cornering",  note: "outer gains what the inner loses" },
    edge:   { cls: "v-drift", word: "At the edge", note: "the inner wheel nears its grip" }
  };
  var SPINS = { cls: "v-dead", word: "Spinning", note: "the inner wheel breaks free — the car sits" };

  function render(r) {
    var verdict = verdictOf(r);
    var v = verdict === "spins" ? SPINS : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var kpct = Math.round(r.k * 100);
    var turnVal = r.turn < STRAIGHT
      ? 'straight<span class="unit"> · wheels together</span>'
      : "outer +" + kpct + "% · inner −" + kpct + '%<span class="unit"> · free</span>';
    var speedClass = r.spinning ? "bad" : "";
    var deliveredClass = r.spinning ? "bad" : r.edge ? "warn" : "good";
    var torqueClass = r.spinning ? "warn" : r.edge ? "warn" : "";

    var rows = [
      ["Turn", turnVal, ""],
      ["Wheel speeds", "out " + rpm(r.wOut) + " · in " + rpm(r.wIn) + '<span class="unit"> rpm</span>', speedClass],
      ['Sum <span class="tag">L + R</span>', rpm(r.wIn + r.wOut) + ' rpm<span class="unit"> · = 2·ω_c, pinned</span>', "good"],
      ['Torque <span class="tag c">each</span>', nm(r.torqueEach) + '<span class="unit"> · T_L = T_R</span>', torqueClass],
      ["Tractive", nm(r.delivered) + '<span class="unit"> · to the road</span>', deliveredClass],
      ['Ceiling <span class="tag c">2·τ</span>', nm(2 * r.tauWeak) + '<span class="unit"> · ' + r.g.short + ", twice</span>", r.spinning ? "bad" : ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markThrottle(r);
    return verdict;
  }

  // mark, under the throttle slider, the throttle at which the inner wheel breaks free
  function markThrottle(r) {
    if (!tMark || !tNote) return;
    var brk = findBreak(state);
    tMark.style.left = ((brk - THR_MIN) / (THR_MAX - THR_MIN) * 100) + "%";
    tMark.className = brk >= THR_MAX ? "x-mark off" : "x-mark";
    if (brk >= THR_MAX) tNote.innerHTML = "dry ground holds to full throttle: <b>no break</b>";
    else if (Math.abs(brk - state.throttle) <= THR_STEP) tNote.innerHTML = "the inner wheel breaks at: <b>" + nm(brk) + "</b>";
    else if (!r.spinning) tNote.innerHTML = "grips up to <b>" + nm(brk) + "</b>, then it spins";
    else tNote.innerHTML = "spinning — past the break at <b>" + nm(brk) + "</b>";
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

  var phase = 0;             // running angle of the carrier
  var spinPhase = 0;         // running angle of a spinning inner wheel

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "spins" ? col.dead : verdict === "edge" ? col.drift : col.keep;

    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, cur, verdict);
    drawSumBar(col, accent, cur, verdict);
    drawCurve(col, cur);
    drawGauge(col, accent, cur);
  }

  // ---- the axle: a carrier driving two wheels --------------------------
  function drawScene(col, accent, cur, verdict) {
    var axleY = 120;
    var carrier = { x: 280, y: axleY, r: 30 };
    var inner = { x: 86, y: axleY, r: 36 };    // the wheel on the chosen ground
    var outer = { x: 474, y: axleY, r: 36 };   // the wheel on dry
    var spin = verdict === "spins";

    // the drive into the carrier
    label(ctx, col.faint, "the drive", carrier.x, 34, "center");
    arrow(ctx, col.timber2, carrier.x, 42, carrier.x, carrier.y - carrier.r - 4, 2, 7);

    // the half-shafts
    ctx.strokeStyle = withAlpha(col.faint, 0.55); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(carrier.x - carrier.r, axleY); ctx.lineTo(inner.x + inner.r, axleY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(carrier.x + carrier.r, axleY); ctx.lineTo(outer.x - outer.r, axleY); ctx.stroke();
    ctx.lineCap = "butt";

    // equal torque, both ways — the same arrow length each side, always
    var tArm = 26;
    arrow(ctx, col.timber, carrier.x - carrier.r - 6, axleY - 16, carrier.x - carrier.r - 6 - tArm, axleY - 16, 1.8, 6);
    arrow(ctx, col.timber, carrier.x + carrier.r + 6, axleY - 16, carrier.x + carrier.r + 6 + tArm, axleY - 16, 1.8, 6);
    label(ctx, col.timber2, "T ⁄ 2", carrier.x - carrier.r - 6 - tArm / 2, axleY - 22, "center");
    label(ctx, col.timber2, "T ⁄ 2", carrier.x + carrier.r + 6 + tArm / 2, axleY - 22, "center");

    // the carrier (ring gear), turning at ω_c
    drawGear(carrier.x, carrier.y, carrier.r, 18, phase * 0.5, col, 0.16);
    ctx.beginPath(); ctx.arc(carrier.x, carrier.y, carrier.r * 0.42, 0, 2 * Math.PI);
    ctx.strokeStyle = withAlpha(col.timber2, 0.7); ctx.lineWidth = 1.4; ctx.stroke();
    label(ctx, col.soft, "carrier", carrier.x, carrier.y + carrier.r + 18, "center");
    label(ctx, col.iron2, "ω_c " + rpm(cur.wc), carrier.x, carrier.y - carrier.r - 10, "center");

    // the two wheels, each turning at its own speed
    var innerAng = spin ? spinPhase : phase * (cur.wIn / OMEGA) * 0.5;
    var outerAng = phase * (cur.wOut / OMEGA) * 0.5;
    drawWheel(inner.x, inner.y, inner.r, innerAng, spin ? col.dead : col.iron, col);
    drawWheel(outer.x, outer.y, outer.r, outerAng, col.iron, col);

    // the ground under the inner wheel
    drawGround(inner.x, inner.y + inner.r + 4, 74, cur.g, spin, col);
    label(ctx, spin ? col.dead : col.iron2, "inner · " + cur.g.short, inner.x, inner.y - inner.r - 22, "center");
    label(ctx, col.soft, rpm(cur.wIn) + " rpm", inner.x, inner.y - inner.r - 8, "center");
    label(ctx, col.iron2, "outer · dry", outer.x, outer.y - outer.r - 22, "center");
    label(ctx, col.soft, rpm(cur.wOut) + " rpm", outer.x, outer.y - outer.r - 8, "center");

    // speed arcs
    curvedArrow(ctx, spin ? col.dead : col.iron2, inner.x, inner.y, inner.r + 8, spin ? spinPhase : phase, 1);
    curvedArrow(ctx, col.iron2, outer.x, outer.y, outer.r + 8, phase, 1);

    if (spin) {
      label(ctx, col.dead, "spins", inner.x, inner.y + inner.r + 30, "center");
      label(ctx, col.soft, "the car sits still", (inner.x + outer.x) / 2, inner.y + inner.r + 30, "center");
    }
  }

  // a road-wheel: a filled disc with a tread ring and a spoke, turned by `ang`
  function drawWheel(cx, cy, r, ang, edge, col) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.fillStyle = withAlpha(edge, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(edge, 0.7); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r - 7, 0, 2 * Math.PI);
    ctx.strokeStyle = withAlpha(edge, 0.4); ctx.lineWidth = 1; ctx.stroke();
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * 2 * Math.PI;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r * 0.28), Math.sin(a) * (r * 0.28));
      ctx.lineTo(Math.cos(a) * (r - 7), Math.sin(a) * (r - 7));
      ctx.strokeStyle = withAlpha(edge, 0.5); ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, 2 * Math.PI);
    ctx.fillStyle = col.field2; ctx.fill();
    ctx.strokeStyle = withAlpha(edge, 0.7); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  // a gear: a toothed ring, turned by `ang`
  function drawGear(cx, cy, r, teeth, ang, col, fill) {
    var ri = r - 6;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a0 = (i / teeth) * 2 * Math.PI, a1 = ((i + 0.5) / teeth) * 2 * Math.PI;
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri);
      var a2 = ((i + 1) / teeth) * 2 * Math.PI;
      ctx.lineTo(Math.cos(a2) * ri, Math.sin(a2) * ri);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(col.iron, fill || 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(col.iron, 0.55); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  // a small patch of the chosen ground under a wheel
  function drawGround(cx, topY, w, g, spin, col) {
    var x0 = cx - w / 2, h = 14;
    var tone = g.mu >= 0.9 ? col.faint : g.mu >= 0.5 ? col.iron : g.mu >= 0.3 ? col.timber2 : col.iron2;
    ctx.fillStyle = withAlpha(g.mu < 0.2 ? col.iron : tone, g.mu < 0.2 ? 0.16 : 0.12);
    roundRect(x0, topY, w, h, 3); ctx.fill();
    ctx.strokeStyle = withAlpha(spin ? col.dead : tone, 0.6); ctx.lineWidth = 1;
    roundRect(x0, topY, w, h, 3); ctx.stroke();
    // hatch: dense for grip, sparse and slick for ice
    ctx.strokeStyle = withAlpha(tone, g.mu < 0.2 ? 0.3 : 0.55); ctx.lineWidth = 1;
    var step = g.mu >= 0.9 ? 6 : g.mu >= 0.5 ? 9 : g.mu >= 0.3 ? 13 : 22;
    for (var x = x0 + 4; x < x0 + w - 2; x += step) {
      ctx.beginPath(); ctx.moveTo(x, topY + 3); ctx.lineTo(x + (g.mu < 0.2 ? 8 : 4), topY + h - 3); ctx.stroke();
    }
  }

  // ---- the sum-bar: the carrier is the average of the two wheels --------
  function drawSumBar(col, accent, cur, verdict) {
    var bx = 24, by = 224, bw = 352, bh = 166;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the carrier is the average of the two wheels", bx + 12, by + 18, "left");

    var ax0 = bx + 34, ax1 = bx + bw - 34, ay = by + 96;
    var smax = 2 * OMEGA;
    var xFor = function (w) { return ax0 + clamp(w, 0, smax) / smax * (ax1 - ax0); };
    var spin = verdict === "spins";

    // the speed axis, 0 … 2·ω_c
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    [[0, "0"], [OMEGA, "ω_c"], [smax, "2·ω_c"]].forEach(function (t) {
      var x = xFor(t[0]);
      ctx.strokeStyle = withAlpha(col.faint, 0.4); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, ay - 3); ctx.lineTo(x, ay + 3); ctx.stroke();
      label(ctx, col.faint, t[1], x, ay + 16, "center");
    });

    // the carrier pin — the fixed midpoint, at ω_c, whatever the wheels do
    var pinX = xFor(OMEGA);
    ctx.strokeStyle = withAlpha(col.timber2, 0.85); ctx.lineWidth = 1.6; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(pinX, ay - 44); ctx.lineTo(pinX, ay + 6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col.timber2;
    ctx.beginPath(); ctx.arc(pinX, ay - 44, 3.4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.timber2, "carrier · fixed", pinX, ay - 52, "center");

    // the beam: its two ends the wheel speeds, its midpoint always the pin
    var ix = xFor(cur.wIn), ox = xFor(cur.wOut), beamY = ay - 22;
    ctx.strokeStyle = withAlpha(spin ? col.dead : col.iron2, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ix, beamY); ctx.lineTo(ox, beamY); ctx.stroke();
    // the midpoint tick drops to the pin — it lands on ω_c exactly, always
    var midX = (ix + ox) / 2;
    ctx.strokeStyle = withAlpha(col.timber2, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(midX, beamY); ctx.lineTo(pinX, ay - 44); ctx.stroke();

    // the two ends, dropped to the axis; labels staggered — inner above the beam,
    // outer below it — so they never collide when the two speeds run close together
    dropDot(ix, beamY, ay, spin ? col.dead : col.iron2);
    dropDot(ox, beamY, ay, col.iron2);
    label(ctx, spin ? col.dead : col.iron2, "inner " + rpm(cur.wIn), ix, beamY - 8, "center");
    label(ctx, col.iron2, "outer " + rpm(cur.wOut), ox, ay - 6, "center");

    var msg = spin
      ? "one wheel spins, one stalls — the sum still holds"
      : "the outer gains what the inner loses";
    label(ctx, spin ? col.dead : col.keep, msg, bx + 12, by + bh - 12, "left");
  }

  function dropDot(x, beamY, ay, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, beamY, 3.6, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.4); ctx.lineWidth = 1; ctx.setLineDash([1, 3]);
    ctx.beginPath(); ctx.moveTo(x, beamY); ctx.lineTo(x, ay); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- the curve: tractive torque delivered vs throttle -----------------
  function drawCurve(col, cur) {
    var ix = 392, iy = 224, iw = 152, ih = 166, pad = 22;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "to the road vs throttle", ix + 10, iy + 16, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - 2 * pad, Hc = ih - 2 * pad - 8;
    var xFor = function (t) { return Ox + t / THR_MAX * L; };
    var yFor = function (d) { return Oy - clamp(d, 0, THR_MAX) / THR_MAX * Hc; };
    var ceil = 2 * cur.tauWeak, knee = ceil;   // delivered clips at the ceiling, at throttle = ceiling

    // the spinning region — throttle past the knee, all of it wasted
    if (knee < THR_MAX) {
      ctx.fillStyle = withAlpha(col.dead, 0.10);
      ctx.fillRect(xFor(knee), Oy - Hc, xFor(THR_MAX) - xFor(knee), Hc);
    }

    // the delivered curve: y = throttle, until it clips flat at the ceiling
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(xFor(0), yFor(0));
    ctx.lineTo(xFor(knee), yFor(ceil));
    ctx.lineTo(xFor(THR_MAX), yFor(ceil));
    ctx.stroke();

    // the ceiling line
    ctx.strokeStyle = withAlpha(col.timber2, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(Ox, yFor(ceil)); ctx.lineTo(Ox + L, yFor(ceil)); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.timber2, "2·τ", Ox + L, yFor(ceil) - 4, "right");

    // the current throttle
    var mx = xFor(cur.T), my = yFor(cur.delivered);
    ctx.fillStyle = cur.spinning ? col.dead : cur.edge ? col.drift : col.keep;
    ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.faint, "throttle", Ox + L, Oy + 12, "right");
  }

  // ---- the gauge: per-wheel demand against the inner wheel's grip --------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 404, bw = W - 48, bh = 52;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 70, gx1 = W - 70, gy = 434, scaleMax = GRIP;   // demand axis, 0 … full grip
    var xFor = function (t) { return gx0 + clamp(t, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // the band the inner wheel can hold — up to its grip τ
    var gwall = xFor(cur.tauWeak);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gwall - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gwall - gx0, 16);

    // the wall at the grip — past it, the inner wheel spins
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gwall, gy - 12); ctx.lineTo(gwall, gy + 12); ctx.stroke();
    label(ctx, col.faint, "inner grip τ", gwall, gy + 22, "center");

    label(ctx, col.faint, "per-wheel torque T ⁄ 2", (gx0 + gx1) / 2, gy - 15, "center");
    label(ctx, col.faint, "0", gx0, gy + 22, "left");

    // the needle at the current demand
    var nX = xFor(cur.demand);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
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
  // a small curved arrow around a point, to read as rotation; dir +1 / −1
  function curvedArrow(c, color, cx, cy, r, ph, dir) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.6;
    var a0 = ph * dir, a1 = a0 + dir * 2.0;
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
    // under reduced motion the axle is held still — the wheels and carrier do not
    // turn and the drive arrows do not sweep, each state read as a settled arrangement
    // rather than a running machine
    if (!reduce) {
      phase += dt * 1.4;
      spinPhase += dt * 6.0;    // a spinning wheel runs away
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
      var kpct = Math.round(r.k * 100);
      var head = r.turn < STRAIGHT
        ? "Straight, both wheels running together at the carrier speed of " + rpm(r.wc) + " rpm. "
        : "A " + TURN_WORD(r.turn) + " corner: the outer wheel at " + rpm(r.wOut) + " and the inner at "
          + rpm(r.wIn) + " rpm, their sum pinned to twice the carrier. ";
      var split = "The torque splits equally, " + nm(r.torqueEach) + " to each wheel. ";
      var tail;
      if (verdict === "even") {
        tail = "Even — both wheels grip on " + r.g.label + " and dry, and all " + nm(r.delivered)
          + " reaches the road, well under the ceiling of " + nm(2 * r.tauWeak) + ", twice the weaker wheel's grip.";
      } else if (verdict === "corner") {
        tail = "Cornering — both wheels grip, the outer gaining exactly what the inner loses, and all "
          + nm(r.delivered) + " reaches the road under the ceiling of " + nm(2 * r.tauWeak) + ".";
      } else if (verdict === "edge") {
        tail = "At the edge — the inner wheel, on " + r.g.label + ", is near its grip of " + nm(r.tauWeak)
          + "; a touch more throttle and it lets go. Ease off, or find the break, to keep both wheels holding.";
      } else {
        tail = "Spinning — the inner wheel on " + r.g.label + " has broken free and runs up toward "
          + rpm(r.wIn) + " rpm while the outer stalls toward " + rpm(r.wOut)
          + "; the axle delivers only " + nm(r.delivered) + ", twice that wheel's grip, and the car sits still. "
          + "Ease the throttle under the break, or lock the differential, to pull again.";
      }
      sayEl.textContent = head + split + tail;
    }, 260);
  }

  inTurn.addEventListener("input", function () { state.turn = clampStep(inTurn.value, TURN_MIN, TURN_MAX, TURN_STEP); update(); });
  inThr.addEventListener("input", function () { state.throttle = clampStep(inThr.value, THR_MIN, THR_MAX, THR_STEP); update(); });
  groundBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.ground = bn.dataset.ground; update(); });
  });

  $("find").addEventListener("click", function () {
    var brk = findBreak(state);
    state.throttle = brk; inThr.value = brk; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inTurn.value = state.turn; inThr.value = state.throttle;
    update();
  });

  // nudge a slider-backed value by a step, from the keyboard
  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clamp(Math.round((state[field] + delta) / step) * step, lo, hi);
    input.value = state[field];
    update();
  }

  // keyboard: work the bench without reaching for the mouse
  var GROUND_KEYS = { "1": "dry", "2": "wet", "3": "gravel", "4": "ice" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "f" || k === "F") { $("find").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (GROUND_KEYS[k]) { state.ground = GROUND_KEYS[k]; update(); }
    else if (k === "]") { nudge("turn", TURN_STEP, TURN_MIN, TURN_MAX, TURN_STEP, inTurn); }       // tighten the turn
    else if (k === "[") { nudge("turn", -TURN_STEP, TURN_MIN, TURN_MAX, TURN_STEP, inTurn); }      // ease the turn
    else if (k === "=" || k === "+") { nudge("throttle", THR_STEP, THR_MIN, THR_MAX, THR_STEP, inThr); }   // more throttle
    else if (k === "-" || k === "_") { nudge("throttle", -THR_STEP, THR_MIN, THR_MAX, THR_STEP, inThr); }  // less throttle
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
  inTurn.value = state.turn; inThr.value = state.throttle;
  update();
})();
