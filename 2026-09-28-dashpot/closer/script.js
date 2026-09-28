/* Dashpot · closer — the bench.
 *
 * A door closer is a spring that shuts the leaf and a dashpot that governs how it
 * arrives. The spring stores the closing force; the dashpot resists in proportion to
 * SPEED and turns that motion into heat, so the leaf cannot slam. The whole of it is
 * one second-order system read through the damping ratio:
 *
 *   natural   ωn = √(k ⁄ m)              (how fast the leaf wants to swing)
 *   damping   ζ  = c ⁄ (2·√(k·m))        (the one dial from slam to hang)
 *   arrival   x(t) = step response       (overshoot past the stop = a slam)
 *
 * The dashpot stores nothing: all its work goes to heat, P = c·v². Its only product
 * is the death of the swing. Set the spring and the check and find the least damping
 * that lands the leaf clean — critical, ζ = 1 — neither banging the frame nor hanging
 * ajar. The leaf's inertia is idealised constant and the hinge friction ignored, but
 * the arrival is exact: it is the step response of m·ẍ + c·ẋ + k·x = k.
 */
(function () {
  "use strict";

  // ---- the leaf, the spring, the check --------------------------------
  var M = 6;               // the leaf's inertia about the hinge, kg·m² — fixed: the door
  var K_MIN = 4, K_MAX = 40, K_STEP = 1;     // closing spring, N·m ⁄ rad
  var C_MIN = 0, C_MAX = 54, C_STEP = 1;     // the check — dashpot damping, N·m·s ⁄ rad
  var BAND = 0.02;         // latched when within 2% of shut and staying
  var TWIN = 9.0;          // seconds shown across the trace
  var NSAMP = 260;

  var DEFAULT = { k: 18, c: 12 };            // a lively spring, checked too light — it bounces
  var KEY = "dashpot.closer.v1";

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
      return {
        k: clampStep(o.k, K_MIN, K_MAX, K_STEP),
        c: clampStep(o.c, C_MIN, C_MAX, C_STEP)
      };
    } catch (e) { return null; }
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the one law: a damped second-order step response ---------------
  // Normalised step response 0 → 1 of m·ẍ + c·ẋ + k·x = k, in natural time τ = ωn·t.
  function stepResp(tau, z) {
    if (z < 1 - 1e-9) {
      var b = Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * tau) * (Math.cos(b * tau) + (z / b) * Math.sin(b * tau));
    } else if (z > 1 + 1e-9) {
      var r = Math.sqrt(z * z - 1);
      var a = z - r, bb = z + r;               // poles at −a, −bb (both > 0)
      return 1 - (bb * Math.exp(-a * tau) - a * Math.exp(-bb * tau)) / (bb - a);
    }
    return 1 - Math.exp(-tau) * (1 + tau);      // critical, ζ = 1
  }

  function ccrit(k) { return 2 * Math.sqrt(k * M); }   // the check that lands it clean

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var k = s.k, c = s.c;
    var wn = Math.sqrt(k / M);                  // rad/s
    var z = c / (2 * Math.sqrt(k * M));         // damping ratio
    var period = 2 * Math.PI / wn;              // natural period, s

    // the arrival trace: x(t), 0 = wide open, 1 = shut against the stop
    var trace = new Float64Array(NSAMP + 1), peak = 0, tPeak = 0;
    for (var i = 0; i <= NSAMP; i++) {
      var t = TWIN * i / NSAMP;
      var x = stepResp(wn * t, z);
      trace[i] = x;
      if (x > peak) { peak = x; tPeak = t; }
    }
    var overshoot = Math.max(0, peak - 1);       // past the stop — the slam

    // time to latch: last moment it is still more than BAND from shut
    var settle = 0;
    for (var j = NSAMP; j >= 0; j--) {
      if (Math.abs(trace[j] - 1) > BAND) { settle = TWIN * (j + 1) / NSAMP; break; }
    }
    var settledInWindow = settle < TWIN - 1e-9;

    var cc = ccrit(k);

    var slam = z < 0.35, bounce = z >= 0.35 && z < 0.85;
    var land = z >= 0.85 && z <= 1.25;
    var sweep = z > 1.25 && z <= 2.2, hang = z > 2.2;

    return {
      k: k, c: c, wn: wn, z: z, period: period,
      trace: trace, overshoot: overshoot, tPeak: tPeak,
      settle: settle, settledInWindow: settledInWindow, cc: cc,
      slam: slam, bounce: bounce, land: land, sweep: sweep, hang: hang
    };
  }

  function verdictOf(r) {
    if (r.slam) return "slam";
    if (r.hang) return "hang";
    if (r.bounce) return "bounce";
    if (r.sweep) return "sweep";
    return "land";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inK = $("in-k"), inC = $("in-c");
  var labK = $("lab-k"), labC = $("lab-c");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var cMark = $("c-mark"), cNote = $("c-note");

  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function pct(x) { return (x * 100).toFixed(0) + "%"; }
  function secs(x) { return x < 10 ? x.toFixed(1) + " s" : Math.round(x) + " s"; }

  var K_WORD = function (v) {
    if (v < 10) return "gentle"; if (v < 20) return "brisk";
    if (v < 30) return "strong"; return "fierce";
  };
  var C_WORD = function (r) {
    if (r.slam) return "far too light"; if (r.bounce) return "light";
    if (r.land) return "just right"; if (r.sweep) return "heavy"; return "far too heavy";
  };

  function syncLabels(r) {
    labK.textContent = K_WORD(state.k);
    labC.textContent = C_WORD(r);
  }

  var VERDICT_TEXT = {
    land:   { cls: "v-keep",  word: "Lands",   note: "shuts clean and latches" },
    bounce: { cls: "v-drift", word: "Bounces", note: "checked too light — it overshoots" },
    sweep:  { cls: "v-drift", word: "Sweeps",  note: "checked heavy — slow to latch" },
    slam:   { cls: "v-dead",  word: "Slams",   note: "no check — it bangs the frame" },
    hang:   { cls: "v-dead",  word: "Hangs",   note: "checked so heavy it stays ajar" }
  };

  function render(r) {
    var verdict = verdictOf(r);
    var v = VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var zClass = r.land ? "good" : (r.slam || r.hang) ? "bad" : "warn";
    var regime = r.z < 0.985 ? "underdamped" : r.z > 1.015 ? "overdamped" : "critical";
    var osTxt = r.overshoot > 0.001 ? pct(r.overshoot) + " past" : "none";
    var osClass = r.slam ? "bad" : r.bounce ? "warn" : "good";
    var latchTxt = r.settledInWindow ? secs(r.settle) : "> " + secs(TWIN);
    var latchClass = r.hang || !r.settledInWindow ? "bad" : r.sweep ? "warn" : "good";

    var rows = [
      ['Damping <span class="tag c">ζ</span>', n1(r.z) + '<span class="unit"> · aim ≈ 1.0</span>', zClass],
      ["Regime", regime + '<span class="unit"> ' + (r.z < 0.985 ? "· rings" : r.z > 1.015 ? "· crawls" : "· clean") + "</span>", ""],
      ["Slam", osTxt + '<span class="unit"> · over the stop</span>', osClass],
      ["To latch", latchTxt + '<span class="unit"> · within 2%</span>', latchClass],
      ['Swing <span class="tag">ωn</span>', n1(r.period) + '<span class="unit"> s · free period</span>', ""],
      ["Check to land", n1(r.cc) + '<span class="unit"> · critical c</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markC(r);
    return verdict;
  }

  function markC(r) {
    if (!cMark || !cNote) return;
    var need = r.cc, overMax = need > C_MAX + 1e-6;
    cMark.style.left = (clamp(need, C_MIN, C_MAX) - C_MIN) / (C_MAX - C_MIN) * 100 + "%";
    cMark.className = overMax ? "x-mark off" : "x-mark";
    if (Math.abs(r.c - need) <= C_STEP + 1e-6) cNote.innerHTML = "the check that lands it: <b>" + n1(need) + "</b>";
    else if (r.c < need) cNote.innerHTML = "lands clean at <b>" + n1(need) + "</b> of check";
    else cNote.innerHTML = "over-checked — lands from <b>" + n1(need) + "</b>";
  }

  // ---- the stage (canvas) ---------------------------------------------
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

  var cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  var tCur = 0;       // seconds through the arrival, looped for the animation

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      oil: cssVar("--oil"), oil2: cssVar("--oil-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = (verdict === "slam" || verdict === "hang") ? col.dead
      : (verdict === "bounce" || verdict === "sweep") ? col.drift : col.keep;
    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, cur, verdict);
    drawTrace(col, accent, cur, verdict);
    drawGauge(col, accent, cur);
  }

  // ---- the scene: a door on a closer, swinging shut --------------------
  function drawScene(col, accent, cur, verdict) {
    var x = xNow(cur);                    // 0 open .. 1 shut (may exceed 1 = into the stop)
    var hx = 150, hy = 150;               // hinge
    var span = 118;                        // leaf length
    var openAng = -Math.PI * 0.62;         // fully open
    var shutAng = -Math.PI * 0.02;         // shut against the jamb (near-vertical frame)
    // clamp visual travel a touch past the jamb so a slam reads as a bang, not a fold-through
    var vx = clamp(x, 0, 1.06);
    var ang = openAng + (shutAng - openAng) * vx;

    // the jamb / frame the leaf shuts against
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy - 8); ctx.lineTo(hx, hy - span - 8); ctx.stroke();
    label(ctx, col.faint, "jamb", hx - 4, hy - span - 16, "center");

    // the swept arc from open to shut
    ctx.strokeStyle = withAlpha(col.iron, 0.28); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.arc(hx, hy, span, openAng, shutAng); ctx.stroke();
    ctx.setLineDash([]);

    // the leaf
    var lx = hx + Math.cos(ang) * span, ly = hy + Math.sin(ang) * span;
    var slamNow = (verdict === "slam" || verdict === "bounce") && x > 1.0;
    var leafCol = slamNow ? col.dead : col.iron2;
    ctx.strokeStyle = withAlpha(leafCol, 0.9); ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lx, ly); ctx.stroke();
    // hinge pin
    ctx.fillStyle = col.field2; ctx.strokeStyle = withAlpha(col.iron2, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // the closer body: an arm from the leaf to a dashpot cylinder on the jamb
    var ax = hx + Math.cos(ang) * 46, ay = hy + Math.sin(ang) * 46;
    var potX = hx + 78, potY = hy + 8;
    ctx.strokeStyle = withAlpha(col.oil2, 0.8); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(potX, potY); ctx.stroke();
    // the dashpot cylinder — its fill reads the check strength
    var potFill = clamp(cur.z / 1.6, 0.08, 0.6);
    ctx.fillStyle = withAlpha(col.oil, potFill);
    roundRect(potX, potY - 12, 46, 24, 5); ctx.fill();
    ctx.strokeStyle = withAlpha(col.oil2, 0.75); ctx.lineWidth = 1.4;
    roundRect(potX, potY - 12, 46, 24, 5); ctx.stroke();
    // piston inside, riding with the leaf
    var pistX = potX + 6 + 30 * clamp(vx, 0, 1);
    ctx.strokeStyle = withAlpha(col.oil2, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pistX, potY - 9); ctx.lineTo(pistX, potY + 9); ctx.stroke();
    label(ctx, col.faint, "dashpot", potX + 23, potY + 26, "center");

    // heat wisps off the pot when the check is doing real work (moving fast)
    if (!reduce && cur.z > 0.15) {
      var v = speedNow(cur);
      var puff = clamp(Math.abs(v) * 2.2, 0, 1);
      for (var w = 0; w < 3; w++) {
        var wob = Math.sin(tCur * 3 + w) * 3;
        ctx.strokeStyle = withAlpha(col.oil, 0.16 * puff);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(potX + 12 + w * 12, potY - 12);
        ctx.lineTo(potX + 12 + w * 12 + wob, potY - 26);
        ctx.stroke();
      }
    }

    // the bang mark at the jamb on a slam
    if (slamNow) {
      ctx.strokeStyle = col.dead; ctx.lineWidth = 2;
      for (var s = 0; s < 6; s++) {
        var a2 = shutAng + (s - 2.5) * 0.22;
        var r0 = span - 6, r1 = span + 10 + (s % 2) * 6;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(a2) * r0, hy + Math.sin(a2) * r0);
        ctx.lineTo(hx + Math.cos(a2) * r1, hy + Math.sin(a2) * r1);
        ctx.stroke();
      }
      label(ctx, col.dead, "bang", lx + 6, ly - 12, "center");
    }

    label(ctx, col.faint, "open", hx + Math.cos(openAng) * (span + 16), hy + Math.sin(openAng) * (span + 16), "center");
    label(ctx, (verdict === "land") ? col.keep : col.faint, "shut", hx + 14, hy - span - 2, "left");
  }

  // ---- the arrival trace: the star of the bench ------------------------
  function drawTrace(col, accent, cur, verdict) {
    var bx = 300, by = 40, bw = 236, bh = 214;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the leaf's arrival, open → shut", bx + 12, by + 18, "left");

    var ax0 = bx + 20, ax1 = bx + bw - 14, ay0 = by + 34, ay1 = by + bh - 26;
    // y: 0 (open) at bottom .. 1.4 (past the stop) near top so overshoot shows
    var yMax = 1.4;
    var yFor = function (v) { return clamp(ay1 - clamp(v, -0.1, yMax) / yMax * (ay1 - ay0), ay0 - 6, ay1 + 6); };
    var xFor = function (t) { return ax0 + (t / TWIN) * (ax1 - ax0); };

    // the "shut" line and the ±2% latch band
    var yShut = yFor(1);
    ctx.fillStyle = withAlpha(col.keep, 0.12);
    ctx.fillRect(ax0, yFor(1 + BAND), ax1 - ax0, yFor(1 - BAND) - yFor(1 + BAND));
    ctx.strokeStyle = withAlpha(col.keep, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(ax0, yShut); ctx.lineTo(ax1, yShut); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "shut", ax1, yShut - 5, "right");

    // the stop line at the top — overshoot past 'shut' bangs into it
    var yStop = yFor(1);
    // trace
    var spin = verdict === "slam" || verdict === "hang";
    var lineCol = spin ? col.dead : (verdict === "bounce" || verdict === "sweep") ? col.drift : col.iron2;
    ctx.strokeStyle = lineCol; ctx.lineWidth = 1.9; ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i <= NSAMP; i++) {
      var t = TWIN * i / NSAMP, x = xFor(t), y = yFor(cur.trace[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // the playhead
    if (!reduce) {
      var px = xFor(clamp(tCur, 0, TWIN));
      var pv = xNow(cur);
      ctx.strokeStyle = withAlpha(accent, 0.45); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, ay0); ctx.lineTo(px, ay1); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(px, yFor(pv), 3.2, 0, Math.PI * 2); ctx.fill();
    }

    label(ctx, col.faint, "0", ax0, ay1 + 14, "left");
    label(ctx, col.faint, secs(TWIN), ax1, ay1 + 14, "right");
    var msg = cur.overshoot > 0.001 ? "overshoots " + pct(cur.overshoot) + " into the stop" : "no overshoot — lands soft";
    label(ctx, spin ? col.dead : (verdict === "land") ? col.keep : col.drift, msg, bx + 12, by + bh - 10, "left");
  }

  // ---- the gauge: damping ratio against the critical mark --------------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 300, bw = W - 48, bh = 150;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "damping ratio  ζ = c ⁄ 2√(k·m)", bx + 14, by + 20, "left");

    var gx0 = bx + 40, gx1 = bx + bw - 30, gy = by + 74;
    var zMax = 2.6;
    var xFor = function (z) { return gx0 + clamp(z, 0, zMax) / zMax * (gx1 - gx0); };

    // regime bands: underdamped (ring), a green window at critical, overdamped (crawl)
    var xUnder = xFor(0.85), xOver = xFor(1.25);
    ctx.fillStyle = withAlpha(col.drift, 0.12); ctx.fillRect(gx0, gy - 12, xUnder - gx0, 24);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(xUnder, gy - 12, xOver - xUnder, 24);
    ctx.fillStyle = withAlpha(col.drift, 0.12); ctx.fillRect(xOver, gy - 12, xFor(zMax) - xOver, 24);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy - 12, xFor(zMax) - gx0, 24);

    // the ζ = 1 critical line
    var xCrit = xFor(1);
    ctx.strokeStyle = withAlpha(col.keep, 0.8); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xCrit, gy - 18); ctx.lineTo(xCrit, gy + 18); ctx.stroke();
    label(ctx, col.keep, "ζ = 1 · lands clean", xCrit, gy + 34, "center");
    label(ctx, col.faint, "underdamped · rings", (gx0 + xUnder) / 2, gy - 20, "center");
    label(ctx, col.faint, "overdamped · crawls", (xOver + xFor(zMax)) / 2, gy - 20, "center");

    // the needle at the current ζ
    var nX = xFor(cur.z);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 16); ctx.lineTo(nX, gy + 16); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 16, 3.4, 0, Math.PI * 2); ctx.fill();
    label(ctx, accent, "ζ " + n1(cur.z), nX, gy + 50, "center");

    label(ctx, col.faint, "0", gx0, gy + 34, "left");
    label(ctx, col.faint, zMax.toFixed(1), gx1, gy + 34, "right");
  }

  // ---- what the leaf is doing right now (for the animation) ------------
  function xNow(cur) { return stepResp(cur.wn * clamp(tCur, 0, TWIN), cur.z); }
  function speedNow(cur) {
    var dt = 0.016, a = stepResp(cur.wn * clamp(tCur, 0, TWIN), cur.z);
    var b = stepResp(cur.wn * clamp(tCur + dt, 0, TWIN), cur.z);
    return (b - a) / dt;
  }

  // ---- small canvas helpers -------------------------------------------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
  var LOOP = TWIN + 1.4;      // pause a beat at the end before re-releasing the leaf

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) {
      tCur += dt;
      if (tCur > LOOP) tCur = 0;
    } else {
      tCur = TWIN;             // held settled — the full arrival shown at once
    }
    draw(current, curVerdict);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update(replay) {
    current = compute(state);
    syncLabels(current);
    curVerdict = render(current);
    announce(current, curVerdict);
    if (replay && !reduce) tCur = 0;
    save();
  }

  // ---- screen-reader status (debounced) --------------------------------
  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = "A " + K_WORD(r.k) + " closing spring with a " + C_WORD(r) + " check: damping ratio "
        + n1(r.z) + ", where one is critical. ";
      var tail;
      if (verdict === "land") {
        tail = "Lands — the leaf shuts and latches in about " + secs(r.settle) + " with no overshoot, arriving soft. This is the aim.";
      } else if (verdict === "bounce") {
        tail = "Bounces — the check is too light, so the leaf overshoots the stop by " + pct(r.overshoot)
          + " and rebounds before it settles. Add check, toward a critical " + n1(r.cc) + ", to land it clean.";
      } else if (verdict === "slam") {
        tail = "Slams — with almost no check the spring drives the leaf into the frame, overshooting by " + pct(r.overshoot)
          + ". Add damping toward the critical value of " + n1(r.cc) + ".";
      } else if (verdict === "sweep") {
        tail = "Sweeps slow — the check is heavy, so the leaf crawls to the latch, taking about " + secs(r.settle)
          + " with no overshoot. Ease the check toward " + n1(r.cc) + " to close it sooner.";
      } else {
        tail = "Hangs — the check is so heavy the leaf never reaches the latch within " + secs(TWIN)
          + ", and is left ajar. Ease the check well down, toward the critical " + n1(r.cc) + ".";
      }
      sayEl.textContent = head + tail;
    }, 260);
  }

  inK.addEventListener("input", function () { state.k = clampStep(inK.value, K_MIN, K_MAX, K_STEP); update(true); });
  inC.addEventListener("input", function () { state.c = clampStep(inC.value, C_MIN, C_MAX, C_STEP); update(true); });

  $("crit").addEventListener("click", function () {
    var need = clampStep(ccrit(state.k), C_MIN, C_MAX, C_STEP);
    state.c = need; inC.value = need; update(true);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inK.value = state.k; inC.value = state.c; update(true);
  });

  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clampStep(state[field] + delta, lo, hi, step);
    input.value = state[field]; update(true);
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;
    var k = e.key;
    if (k === "c" || k === "C") { $("crit").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (k === "]") { nudge("c", C_STEP * 3, C_MIN, C_MAX, C_STEP, inC); }
    else if (k === "[") { nudge("c", -C_STEP * 3, C_MIN, C_MAX, C_STEP, inC); }
    else if (k === "=" || k === "+") { nudge("k", K_STEP * 2, K_MIN, K_MAX, K_STEP, inK); }
    else if (k === "-" || k === "_") { nudge("k", -K_STEP * 2, K_MIN, K_MAX, K_STEP, inK); }
    else if (k === " ") { tCur = 0; }
    else return;
    e.preventDefault();
  });

  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      draw(current, curVerdict);
    });
  }

  // ---- go --------------------------------------------------------------
  inK.value = state.k; inC.value = state.c;
  update(false);
})();
