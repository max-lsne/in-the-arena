/* Dashpot · deadbeat — the bench.
 *
 * A moving-needle instrument is a second-order system: a coil on a hairspring, its
 * inertia and the spring setting how fast it swings to a new reading, and a dashpot —
 * air vane, oil, or the coil's own eddy currents — deciding whether it arrives clean
 * or hunts. "Deadbeat" is the prize: it beats once, to the reading, and dies. The whole
 * of it is one step response read through the damping ratio:
 *
 *   natural   ωn = √(k ⁄ m)              (how fast the needle wants to swing)
 *   damping   ζ  = c ⁄ (2·√(k·m))        (the one dial from hunt to crawl)
 *   arrival   x(t) = step response       (overshoot past the mark = a hunt)
 *
 * The dashpot stores nothing: all its work is heat, P = c·v². Too little and the needle
 * hunts about the mark, unreadable until it tires; too much and it crawls and the
 * reading is late. Between them it is deadbeat — the reading landed in the least time,
 * with no swing. Set the movement and the damping and find the least that reads clean.
 * The pivot friction is idealised away, but the arrival is exact: the step response of
 * m·θ̈ + c·θ̇ + k·θ = k.
 */
(function () {
  "use strict";

  // ---- the movement, the hairspring, the damping ----------------------
  var K = 20;              // the hairspring, mN·m ⁄ rad — fixed restoring stiffness
  var M_MIN = 1, M_MAX = 9, M_STEP = 0.5;    // the needle-and-coil inertia, arbitrary units
  var C_MIN = 0, C_MAX = 40, C_STEP = 1;     // the damping — vane, oil, or eddy currents
  var BAND = 0.02;         // read when within 2% of the new mark and staying
  var TWIN = 5.0;          // seconds shown across the trace
  var NSAMP = 260;

  var DEFAULT = { m: 4, c: 8 };              // a normal movement, damped too light — it hunts
  var KEY = "dashpot.deadbeat.v1";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    v = Math.round(v * 1e6) / 1e6;
    return v < a ? a : v > b ? b : v;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return {
        m: clampStep(o.m, M_MIN, M_MAX, M_STEP),
        c: clampStep(o.c, C_MIN, C_MAX, C_STEP)
      };
    } catch (e) { return null; }
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the one law: step response, needle old-reading → new-reading ----
  function stepResp(tau, z) {
    if (z < 1 - 1e-9) {
      var b = Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * tau) * (Math.cos(b * tau) + (z / b) * Math.sin(b * tau));
    } else if (z > 1 + 1e-9) {
      var r = Math.sqrt(z * z - 1);
      var a = z - r, bb = z + r;
      return 1 - (bb * Math.exp(-a * tau) - a * Math.exp(-bb * tau)) / (bb - a);
    }
    return 1 - Math.exp(-tau) * (1 + tau);
  }

  function ccrit(m) { return 2 * Math.sqrt(K * m); }

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var m = s.m, c = s.c;
    var wn = Math.sqrt(K / m);
    var z = c / (2 * Math.sqrt(K * m));
    var period = 2 * Math.PI / wn;

    var trace = new Float64Array(NSAMP + 1), peak = 0, crossings = 0, prev = -1;
    for (var i = 0; i <= NSAMP; i++) {
      var t = TWIN * i / NSAMP;
      var x = stepResp(wn * t, z);
      trace[i] = x;
      if (x > peak) peak = x;
      // count how many times it crosses the reading line (x = 1) — the swings of a hunt
      var side = x > 1 ? 1 : -1;
      if (i > 0 && side !== prev) crossings++;
      prev = side;
    }
    var overshoot = Math.max(0, peak - 1);       // past the mark — the hunt

    var settle = 0;
    for (var j = NSAMP; j >= 0; j--) {
      if (Math.abs(trace[j] - 1) > BAND) { settle = TWIN * (j + 1) / NSAMP; break; }
    }
    var settledInWindow = settle < TWIN - 1e-9;

    var cc = ccrit(m);

    var hunt = z < 0.35, swing = z >= 0.35 && z < 0.85;
    var reads = z >= 0.85 && z <= 1.25;
    var slug = z > 1.25 && z <= 2.2, crawl = z > 2.2;

    return {
      m: m, c: c, wn: wn, z: z, period: period,
      trace: trace, overshoot: overshoot, crossings: crossings,
      settle: settle, settledInWindow: settledInWindow, cc: cc,
      hunt: hunt, swing: swing, reads: reads, slug: slug, crawl: crawl
    };
  }

  function verdictOf(r) {
    if (r.hunt) return "hunt";
    if (r.crawl) return "crawl";
    if (r.swing) return "swing";
    if (r.slug) return "slug";
    return "reads";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inM = $("in-m"), inC = $("in-c");
  var labM = $("lab-m"), labC = $("lab-c");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var cMark = $("c-mark"), cNote = $("c-note");

  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function pct(x) { return (x * 100).toFixed(0) + "%"; }
  function secs(x) { return x < 10 ? x.toFixed(1) + " s" : Math.round(x) + " s"; }

  var M_WORD = function (v) {
    if (v < 3) return "light"; if (v < 6) return "normal"; return "heavy";
  };
  var C_WORD = function (r) {
    if (r.hunt) return "far too light"; if (r.swing) return "light";
    if (r.reads) return "just right"; if (r.slug) return "heavy"; return "far too heavy";
  };

  function syncLabels(r) {
    labM.textContent = M_WORD(state.m);
    labC.textContent = C_WORD(r);
  }

  var VERDICT_TEXT = {
    reads: { cls: "v-keep",  word: "Reads",    note: "lands on the mark, once" },
    swing: { cls: "v-drift", word: "Swings",   note: "damped light — it overshoots" },
    slug:  { cls: "v-drift", word: "Sluggish", note: "damped heavy — a late reading" },
    hunt:  { cls: "v-dead",  word: "Hunts",    note: "no damping — it oscillates, unreadable" },
    crawl: { cls: "v-dead",  word: "Crawls",   note: "so damped the reading never arrives" }
  };

  function render(r) {
    var verdict = verdictOf(r);
    var v = VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var zClass = r.reads ? "good" : (r.hunt || r.crawl) ? "bad" : "warn";
    var regime = r.z < 0.985 ? "underdamped" : r.z > 1.015 ? "overdamped" : "critical";
    var osTxt = r.overshoot > 0.001 ? pct(r.overshoot) + " past" : "none";
    var osClass = r.hunt ? "bad" : r.swing ? "warn" : "good";
    var readTxt = r.settledInWindow ? secs(r.settle) : "> " + secs(TWIN);
    var readClass = r.crawl || !r.settledInWindow ? "bad" : r.slug ? "warn" : "good";
    var swings = Math.max(0, Math.floor(r.crossings));

    var rows = [
      ['Damping <span class="tag c">ζ</span>', n1(r.z) + '<span class="unit"> · aim ≈ 1.0</span>', zClass],
      ["Regime", regime + '<span class="unit"> ' + (r.z < 0.985 ? "· hunts" : r.z > 1.015 ? "· crawls" : "· clean") + "</span>", ""],
      ["Overshoot", osTxt + '<span class="unit"> · past the mark</span>', osClass],
      ["Swings", swings + '<span class="unit"> · passes of the mark</span>', swings > 1 ? "warn" : "good"],
      ["To read", readTxt + '<span class="unit"> · within 2%</span>', readClass],
      ["Damping to read", n1(r.cc) + '<span class="unit"> · critical c</span>', ""]
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
    if (Math.abs(r.c - need) <= C_STEP + 1e-6) cNote.innerHTML = "the damping that reads clean: <b>" + n1(need) + "</b>";
    else if (r.c < need) cNote.innerHTML = "reads deadbeat at <b>" + n1(need) + "</b> of damping";
    else cNote.innerHTML = "over-damped — reads from <b>" + n1(need) + "</b>";
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

  var tCur = 0;

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      oil: cssVar("--oil"), oil2: cssVar("--oil-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = (verdict === "hunt" || verdict === "crawl") ? col.dead
      : (verdict === "swing" || verdict === "slug") ? col.drift : col.keep;
    ctx.clearRect(0, 0, W, H);
    drawDial(col, accent, cur, verdict);
    drawTrace(col, accent, cur, verdict);
    drawGauge(col, accent, cur);
  }

  // ---- the dial: a needle swinging from the old reading to the new -----
  function drawDial(col, accent, cur, verdict) {
    var x = xNow(cur);                          // needle position, 0 = old, 1 = new mark
    var cx = 150, cy = 158, R = 108;
    // the dial sweeps from a0 (left, old reading) to a1 (right, new reading)
    var a0 = Math.PI * 1.18, a1 = Math.PI * 1.82;     // upper arc
    var angFor = function (v) { return a0 + (a1 - a0) * v; };

    // dial arc and ticks
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
    for (var t = 0; t <= 10; t++) {
      var a = angFor(t / 10), r0 = R - (t % 5 === 0 ? 12 : 7);
      ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = t % 5 === 0 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }

    // the old-reading mark (faint) and the new-reading mark (the target)
    var aOld = angFor(0), aNew = angFor(1);
    tickMark(cx, cy, R, aOld, withAlpha(col.faint, 0.7), "was");
    tickMark(cx, cy, R, aNew, verdict === "reads" ? col.keep : col.oil2, "reading");

    // the ±2% read band around the new mark
    ctx.strokeStyle = withAlpha(col.keep, 0.35); ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, R - 22, angFor(1 - BAND * 4), angFor(1 + BAND * 4)); ctx.stroke();

    // the needle
    var vx = clamp(x, -0.08, 1.14);
    var aN = angFor(vx);
    var huntNow = (verdict === "hunt" || verdict === "swing") && x > 1.0;
    var needleCol = huntNow ? col.dead : col.iron2;
    ctx.strokeStyle = withAlpha(needleCol, 0.92); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(aN) * (R - 4), cy + Math.sin(aN) * (R - 4)); ctx.stroke();
    // a counterweight tail
    ctx.strokeStyle = withAlpha(needleCol, 0.5); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - Math.cos(aN) * 22, cy - Math.sin(aN) * 22); ctx.stroke();
    // pivot
    ctx.fillStyle = col.field2; ctx.strokeStyle = withAlpha(col.iron2, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // the damping element: a vane in a slotted box below, fill reads damping
    var vX = cx + 118, vY = cy - 6;
    var potFill = clamp(cur.z / 1.6, 0.08, 0.6);
    ctx.fillStyle = withAlpha(col.oil, potFill);
    roundRect(vX - 16, vY - 30, 32, 60, 5); ctx.fill();
    ctx.strokeStyle = withAlpha(col.oil2, 0.8); ctx.lineWidth = 1.4;
    roundRect(vX - 16, vY - 30, 32, 60, 5); ctx.stroke();
    // the vane, riding with the needle
    var vaneY = vY - 18 + 36 * clamp(vx, 0, 1);
    ctx.strokeStyle = withAlpha(col.oil2, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(vX - 12, vaneY); ctx.lineTo(vX + 12, vaneY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vX, vY - 34); ctx.lineTo(vX, vaneY); ctx.stroke();
    label(ctx, col.faint, "damping", vX, vY + 44, "center");

    if (huntNow) label(ctx, col.dead, "hunting", cx + Math.cos(aNew) * (R + 4) + 12, cy + Math.sin(aNew) * (R + 4), "left");
    label(ctx, verdict === "reads" ? col.keep : col.faint, "needle", cx, cy + 30, "center");
  }

  function tickMark(cx, cy, R, a, color, text) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (R + 2), cy + Math.sin(a) * (R + 2));
    ctx.lineTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12));
    ctx.stroke();
    label(ctx, color, text, cx + Math.cos(a) * (R + 24), cy + Math.sin(a) * (R + 24) + 3, "center");
  }

  // ---- the arrival trace -----------------------------------------------
  function drawTrace(col, accent, cur, verdict) {
    var bx = 300, by = 40, bw = 236, bh = 214;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the needle, old reading → new", bx + 12, by + 18, "left");

    var ax0 = bx + 20, ax1 = bx + bw - 14, ay0 = by + 40, ay1 = by + bh - 26;
    var yMax = 1.4;
    var yFor = function (v) { return clamp(ay1 - clamp(v, -0.1, yMax) / yMax * (ay1 - ay0), ay0 - 6, ay1 + 6); };
    var xFor = function (t) { return ax0 + (t / TWIN) * (ax1 - ax0); };

    var yMark = yFor(1);
    ctx.fillStyle = withAlpha(col.keep, 0.12);
    ctx.fillRect(ax0, yFor(1 + BAND), ax1 - ax0, yFor(1 - BAND) - yFor(1 + BAND));
    ctx.strokeStyle = withAlpha(col.keep, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(ax0, yMark); ctx.lineTo(ax1, yMark); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "reading", ax1, yMark - 5, "right");

    var spin = verdict === "hunt" || verdict === "crawl";
    var lineCol = spin ? col.dead : (verdict === "swing" || verdict === "slug") ? col.drift : col.iron2;
    ctx.strokeStyle = lineCol; ctx.lineWidth = 1.9; ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i <= NSAMP; i++) {
      var t = TWIN * i / NSAMP, x = xFor(t), y = yFor(cur.trace[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

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
    var msg = cur.overshoot > 0.001 ? "swings " + pct(cur.overshoot) + " past the mark" : "no overshoot — beats once";
    label(ctx, spin ? col.dead : (verdict === "reads") ? col.keep : col.drift, msg, bx + 12, by + bh - 10, "left");
  }

  // ---- the gauge -------------------------------------------------------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 300, bw = W - 48, bh = 150;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "damping ratio  ζ = c ⁄ 2√(k·m)", bx + 14, by + 20, "left");

    var gx0 = bx + 40, gx1 = bx + bw - 30, gy = by + 74;
    var zMax = 2.6;
    var xFor = function (z) { return gx0 + clamp(z, 0, zMax) / zMax * (gx1 - gx0); };

    var xUnder = xFor(0.85), xOver = xFor(1.25);
    ctx.fillStyle = withAlpha(col.drift, 0.12); ctx.fillRect(gx0, gy - 12, xUnder - gx0, 24);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(xUnder, gy - 12, xOver - xUnder, 24);
    ctx.fillStyle = withAlpha(col.drift, 0.12); ctx.fillRect(xOver, gy - 12, xFor(zMax) - xOver, 24);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy - 12, xFor(zMax) - gx0, 24);

    var xCrit = xFor(1);
    ctx.strokeStyle = withAlpha(col.keep, 0.8); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xCrit, gy - 18); ctx.lineTo(xCrit, gy + 18); ctx.stroke();
    label(ctx, col.keep, "ζ = 1 · deadbeat", xCrit, gy + 34, "center");
    label(ctx, col.faint, "underdamped · hunts", (gx0 + xUnder) / 2, gy - 20, "center");
    label(ctx, col.faint, "overdamped · crawls", (xOver + xFor(zMax)) / 2, gy - 20, "center");

    var nX = xFor(cur.z);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 16); ctx.lineTo(nX, gy + 16); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 16, 3.4, 0, Math.PI * 2); ctx.fill();
    label(ctx, accent, "ζ " + n1(cur.z), nX, gy + 50, "center");

    label(ctx, col.faint, "0", gx0, gy + 34, "left");
    label(ctx, col.faint, zMax.toFixed(1), gx1, gy + 34, "right");
  }

  function xNow(cur) { return stepResp(cur.wn * clamp(tCur, 0, TWIN), cur.z); }

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
  var LOOP = TWIN + 1.2;

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) { tCur += dt; if (tCur > LOOP) tCur = 0; }
    else { tCur = TWIN; }
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

  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = "A " + M_WORD(r.m) + " movement with " + C_WORD(r) + " damping: damping ratio "
        + n1(r.z) + ", where one is deadbeat. ";
      var tail;
      if (verdict === "reads") {
        tail = "Reads — the needle swings to the new mark and stops there, once, in about " + secs(r.settle)
          + " with no overshoot. This is deadbeat, the reading landed in the least time.";
      } else if (verdict === "swing") {
        tail = "Swings — the damping is light, so the needle overshoots the mark by " + pct(r.overshoot)
          + " and swings back once or twice before it rests. Add damping, toward a deadbeat " + n1(r.cc) + ".";
      } else if (verdict === "hunt") {
        tail = "Hunts — with almost no damping the needle oscillates about the mark, overshooting " + pct(r.overshoot)
          + " and swinging back and forth, unreadable until it tires. Add damping toward " + n1(r.cc) + ".";
      } else if (verdict === "slug") {
        tail = "Sluggish — the damping is heavy, so the needle creeps up to the mark, taking about " + secs(r.settle)
          + " with no overshoot. Ease it toward " + n1(r.cc) + " for a quicker reading.";
      } else {
        tail = "Crawls — the damping is so heavy the needle never reaches the mark within " + secs(TWIN)
          + ", and the reading is lost. Ease it well down, toward the deadbeat " + n1(r.cc) + ".";
      }
      sayEl.textContent = head + tail;
    }, 260);
  }

  inM.addEventListener("input", function () { state.m = clampStep(inM.value, M_MIN, M_MAX, M_STEP); update(true); });
  inC.addEventListener("input", function () { state.c = clampStep(inC.value, C_MIN, C_MAX, C_STEP); update(true); });

  $("crit").addEventListener("click", function () {
    var need = clampStep(ccrit(state.m), C_MIN, C_MAX, C_STEP);
    state.c = need; inC.value = need; update(true);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inM.value = state.m; inC.value = state.c; update(true);
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
    else if (k === "=" || k === "+") { nudge("m", M_STEP * 2, M_MIN, M_MAX, M_STEP, inM); }
    else if (k === "-" || k === "_") { nudge("m", -M_STEP * 2, M_MIN, M_MAX, M_STEP, inM); }
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

  inM.value = state.m; inC.value = state.c;
  update(false);
})();
