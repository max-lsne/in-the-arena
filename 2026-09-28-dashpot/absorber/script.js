/* Dashpot · absorber — the bench.
 *
 * A shock absorber is the dashpot across a car's spring. The spring holds the body up
 * and gives back every bump; the dashpot resists the body's motion in proportion to
 * SPEED and burns it to heat, so a bump dies in one motion instead of bobbing away.
 * The whole of it is one second-order system read through the damping ratio:
 *
 *   natural   ωn = √(k ⁄ m)              (how fast the body wants to bob)
 *   damping   ζ  = c ⁄ (2·√(k·m))        (the one dial from float to harsh)
 *   recovery  x(t) = free response       (a kick from the road, dying away)
 *
 * The dashpot stores nothing: all its work is heat, P = c·v². Too little and the body
 * floats and wallows and the tyre skips off the road; too much and the damper locks
 * the body to the wheel and every bump comes straight through. Between them the body
 * settles in one motion. Set the load and the damper and find the least that settles it.
 * The tyre and the road are idealised as a single sprung mass, but the recovery is
 * exact: the free response of m·ẍ + c·ẋ + k·x = 0 from a unit kick.
 */
(function () {
  "use strict";

  // ---- the body, the spring, the damper -------------------------------
  var K = 22;              // the suspension spring, kN ⁄ m — fixed
  var M_MIN = 2, M_MAX = 14, M_STEP = 0.5;   // the sprung load over this wheel, arbitrary units
  var C_MIN = 0, C_MAX = 46, C_STEP = 1;     // the damper — dashpot, kN·s ⁄ m
  var BAND = 0.02;         // recovered when within 2% of level and staying
  var TWIN = 6.0;          // seconds shown across the trace
  var NSAMP = 260;

  var DEFAULT = { m: 6, c: 10 };             // a normal load, damped too soft — it floats
  var KEY = "dashpot.absorber.v1";

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

  // ---- the one law -----------------------------------------------------
  // Normalised step response 0 → 1 of the second-order system, in natural time τ = ωn·t.
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
  // the body's recovery from a unit kick: starts at 1, dies to 0 (ringing if underdamped)
  function bodyResp(tau, z) { return 1 - stepResp(tau, z); }

  function ccrit(m) { return 2 * Math.sqrt(K * m); }

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var m = s.m, c = s.c;
    var wn = Math.sqrt(K / m);
    var z = c / (2 * Math.sqrt(K * m));
    var period = 2 * Math.PI / wn;

    var trace = new Float64Array(NSAMP + 1), minV = 0, crossings = 0, prev = 1;
    for (var i = 0; i <= NSAMP; i++) {
      var t = TWIN * i / NSAMP;
      var x = bodyResp(wn * t, z);
      trace[i] = x;
      if (x < minV) minV = x;
      if (i > 0 && ((prev > 0) !== (x > 0))) crossings++;
      prev = x;
    }
    var rebound = Math.max(0, -minV);            // how far it bobs back past level — the float

    var settle = 0;
    for (var j = NSAMP; j >= 0; j--) {
      if (Math.abs(trace[j]) > BAND) { settle = TWIN * (j + 1) / NSAMP; break; }
    }
    var settledInWindow = settle < TWIN - 1e-9;

    var cc = ccrit(m);

    var floats = z < 0.35, wallow = z >= 0.35 && z < 0.85;
    var settled = z >= 0.85 && z <= 1.25;
    var firm = z > 1.25 && z <= 2.2, harsh = z > 2.2;

    return {
      m: m, c: c, wn: wn, z: z, period: period,
      trace: trace, rebound: rebound, crossings: crossings,
      settle: settle, settledInWindow: settledInWindow, cc: cc,
      floats: floats, wallow: wallow, settled: settled, firm: firm, harsh: harsh
    };
  }

  function verdictOf(r) {
    if (r.floats) return "float";
    if (r.harsh) return "harsh";
    if (r.wallow) return "wallow";
    if (r.firm) return "firm";
    return "settle";
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
    if (v < 5) return "light"; if (v < 9) return "loaded"; return "heavy";
  };
  var C_WORD = function (r) {
    if (r.floats) return "far too soft"; if (r.wallow) return "soft";
    if (r.settled) return "just right"; if (r.firm) return "stiff"; return "far too stiff";
  };

  function syncLabels(r) {
    labM.textContent = M_WORD(state.m);
    labC.textContent = C_WORD(r);
  }

  var VERDICT_TEXT = {
    settle: { cls: "v-keep",  word: "Settles", note: "one motion, then level" },
    wallow: { cls: "v-drift", word: "Wallows", note: "damped soft — it bobs and rolls" },
    firm:   { cls: "v-drift", word: "Firm",    note: "damped stiff — a hard, slow sink" },
    float:  { cls: "v-dead",  word: "Floats",  note: "no damper — it bobs, the tyre skips" },
    harsh:  { cls: "v-dead",  word: "Harsh",   note: "so stiff the bump comes straight through" }
  };

  function render(r) {
    var verdict = verdictOf(r);
    var v = VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var zClass = r.settled ? "good" : (r.floats || r.harsh) ? "bad" : "warn";
    var regime = r.z < 0.985 ? "underdamped" : r.z > 1.015 ? "overdamped" : "critical";
    var rbTxt = r.rebound > 0.001 ? pct(r.rebound) + " back" : "none";
    var rbClass = r.floats ? "bad" : r.wallow ? "warn" : "good";
    var recTxt = r.settledInWindow ? secs(r.settle) : "> " + secs(TWIN);
    var recClass = r.harsh || !r.settledInWindow ? "bad" : (r.firm || r.wallow) ? "warn" : "good";
    var bobs = Math.max(0, Math.floor(r.crossings));

    var rows = [
      ['Damping <span class="tag c">ζ</span>', n1(r.z) + '<span class="unit"> · aim ≈ 1.0</span>', zClass],
      ["Regime", regime + '<span class="unit"> ' + (r.z < 0.985 ? "· bobs" : r.z > 1.015 ? "· drags" : "· clean") + "</span>", ""],
      ["Float", rbTxt + '<span class="unit"> · rebound past level</span>', rbClass],
      ["Bobs", bobs + '<span class="unit"> · crossings before rest</span>', bobs > 1 ? "warn" : "good"],
      ["Recovery", recTxt + '<span class="unit"> · within 2%</span>', recClass],
      ["Damper to settle", n1(r.cc) + '<span class="unit"> · critical c</span>', ""]
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
    if (Math.abs(r.c - need) <= C_STEP + 1e-6) cNote.innerHTML = "the damper that settles it: <b>" + n1(need) + "</b>";
    else if (r.c < need) cNote.innerHTML = "settles in one at <b>" + n1(need) + "</b> of damper";
    else cNote.innerHTML = "over-damped — settles from <b>" + n1(need) + "</b>";
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
    var accent = (verdict === "float" || verdict === "harsh") ? col.dead
      : (verdict === "wallow" || verdict === "firm") ? col.drift : col.keep;
    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, cur, verdict);
    drawTrace(col, accent, cur, verdict);
    drawGauge(col, accent, cur);
  }

  // ---- the scene: a wheel over a bump, a spring and damper to the body --
  function drawScene(col, accent, cur, verdict) {
    var x = xNow(cur);                          // body displacement, +up, decaying to 0
    var cx = 150, roadY = 210, wheelR = 26;
    var bodyRest = 78, amp = 40;
    var bodyY = bodyRest - amp * x;             // body block centre

    // the road, with a bump rolling under the wheel as the loop restarts
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(24, roadY); ctx.lineTo(W - 24, roadY); ctx.stroke();
    // hatching under the road
    for (var hxx = 30; hxx < W - 24; hxx += 16) {
      ctx.strokeStyle = withAlpha(col.faint, 0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hxx, roadY); ctx.lineTo(hxx - 8, roadY + 10); ctx.stroke();
    }
    // the bump — drawn just before the wheel early in the loop, as the cause of the kick
    if (!reduce && tCur < 1.2) {
      var bumpX = cx - 40 - tCur * 120;
      if (bumpX > 30) {
        ctx.fillStyle = withAlpha(col.oil, 0.5);
        ctx.beginPath();
        ctx.moveTo(bumpX - 14, roadY); ctx.quadraticCurveTo(bumpX, roadY - 16, bumpX + 14, roadY); ctx.fill();
      }
    }

    // the wheel, sitting on the road
    ctx.strokeStyle = withAlpha(col.iron2, 0.85); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, roadY - wheelR, wheelR, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = withAlpha(col.iron2, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, roadY - wheelR, wheelR * 0.4, 0, Math.PI * 2); ctx.stroke();
    var axleY = roadY - wheelR;

    // the body block
    var bw = 150, bh = 34;
    var bodyCol = (verdict === "float" || verdict === "harsh") ? col.dead : col.iron;
    ctx.fillStyle = withAlpha(bodyCol, 0.14);
    roundRect(cx - bw / 2, bodyY - bh / 2, bw, bh, 6); ctx.fill();
    ctx.strokeStyle = withAlpha(bodyCol, 0.8); ctx.lineWidth = 2;
    roundRect(cx - bw / 2, bodyY - bh / 2, bw, bh, 6); ctx.stroke();
    label(ctx, col.faint, "body", cx, bodyY + 4, "center");

    // the level line the body settles to
    ctx.strokeStyle = withAlpha(col.keep, 0.4); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx - bw / 2 - 16, bodyRest); ctx.lineTo(cx + bw / 2 + 16, bodyRest); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "level", cx + bw / 2 + 18, bodyRest + 3, "left");

    // the spring and the damper, side by side, between axle and body
    var sx = cx - 22, dxx = cx + 22, top = bodyY + bh / 2, bot = axleY;
    // coil spring
    ctx.strokeStyle = withAlpha(col.iron2, 0.8); ctx.lineWidth = 2; ctx.beginPath();
    var coils = 6;
    for (var s2 = 0; s2 <= coils; s2++) {
      var yy = top + (bot - top) * s2 / coils;
      var xx = sx + (s2 % 2 === 0 ? -7 : 7);
      if (s2 === 0) ctx.moveTo(sx, top); else ctx.lineTo(xx, yy);
    }
    ctx.lineTo(sx, bot); ctx.stroke();
    // the dashpot: a cylinder with a piston, fill reads the damper strength
    var potFill = clamp(cur.z / 1.6, 0.08, 0.6);
    ctx.fillStyle = withAlpha(col.oil, potFill);
    roundRect(dxx - 8, top + 6, 16, (bot - top) - 12, 3); ctx.fill();
    ctx.strokeStyle = withAlpha(col.oil2, 0.8); ctx.lineWidth = 1.4;
    roundRect(dxx - 8, top + 6, 16, (bot - top) - 12, 3); ctx.stroke();
    var pistY = top + 10 + ((bot - top) - 20) * clamp(0.5 - x * 0.5, 0.05, 0.95);
    ctx.strokeStyle = withAlpha(col.oil2, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(dxx, top); ctx.lineTo(dxx, pistY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dxx - 6, pistY); ctx.lineTo(dxx + 6, pistY); ctx.stroke();
    label(ctx, col.faint, "spring", sx, bot + 16, "center");
    label(ctx, col.faint, "damper", dxx, bot + 16, "center");

    // trailing echoes of the body when it floats — the bob you feel
    if (!reduce && (verdict === "float" || verdict === "wallow")) {
      for (var e = 1; e <= 3; e++) {
        var te = tCur - e * 0.16;
        if (te < 0) continue;
        var xe = bodyResp(cur.wn * clamp(te, 0, TWIN), cur.z);
        var ye = bodyRest - amp * xe;
        ctx.strokeStyle = withAlpha(bodyCol, 0.12 / e); ctx.lineWidth = 1;
        roundRect(cx - bw / 2, ye - bh / 2, bw, bh, 6); ctx.stroke();
      }
    }
  }

  // ---- the recovery trace ----------------------------------------------
  function drawTrace(col, accent, cur, verdict) {
    var bx = 320, by = 230, bw = W - 24 - 320, bh = 0;
    // full-width lower trace panel
    bx = 24; by = 250; bw = W - 48; bh = 110;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the body after the bump — displacement, dying to level", bx + 12, by + 16, "left");

    var ax0 = bx + 24, ax1 = bx + bw - 14, ay0 = by + 26, ay1 = by + bh - 18;
    var yMax = 1.15;
    var mid = (ay0 + ay1) / 2;
    var yFor = function (v) { return clamp(mid - clamp(v, -yMax, yMax) / yMax * (mid - ay0), ay0 - 4, ay1 + 4); };
    var xFor = function (t) { return ax0 + (t / TWIN) * (ax1 - ax0); };

    // level line and ±2% band
    ctx.fillStyle = withAlpha(col.keep, 0.12);
    ctx.fillRect(ax0, yFor(BAND), ax1 - ax0, yFor(-BAND) - yFor(BAND));
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax0, yFor(0)); ctx.lineTo(ax1, yFor(0)); ctx.stroke();
    label(ctx, col.faint, "level", ax1, yFor(0) - 4, "right");

    var spin = verdict === "float" || verdict === "harsh";
    var lineCol = spin ? col.dead : (verdict === "wallow" || verdict === "firm") ? col.drift : col.iron2;
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

    label(ctx, col.faint, "0", ax0, ay1 + 12, "left");
    label(ctx, col.faint, secs(TWIN), ax1, ay1 + 12, "right");
  }

  // ---- the gauge: damping ratio against the critical mark --------------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 372, bw = W - 48, bh = 82;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "damping ratio  ζ = c ⁄ 2√(k·m)", bx + 14, by + 18, "left");

    var gx0 = bx + 40, gx1 = bx + bw - 30, gy = by + 46;
    var zMax = 2.6;
    var xFor = function (z) { return gx0 + clamp(z, 0, zMax) / zMax * (gx1 - gx0); };

    var xUnder = xFor(0.85), xOver = xFor(1.25);
    ctx.fillStyle = withAlpha(col.drift, 0.12); ctx.fillRect(gx0, gy - 10, xUnder - gx0, 20);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(xUnder, gy - 10, xOver - xUnder, 20);
    ctx.fillStyle = withAlpha(col.drift, 0.12); ctx.fillRect(xOver, gy - 10, xFor(zMax) - xOver, 20);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy - 10, xFor(zMax) - gx0, 20);

    var xCrit = xFor(1);
    ctx.strokeStyle = withAlpha(col.keep, 0.8); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xCrit, gy - 16); ctx.lineTo(xCrit, gy + 16); ctx.stroke();
    label(ctx, col.keep, "ζ = 1 · settles", xCrit, gy + 30, "center");
    label(ctx, col.faint, "float", (gx0 + xUnder) / 2, gy - 16, "center");
    label(ctx, col.faint, "harsh", (xOver + xFor(zMax)) / 2, gy - 16, "center");

    var nX = xFor(cur.z);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 14); ctx.lineTo(nX, gy + 14); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 14, 3.4, 0, Math.PI * 2); ctx.fill();
    label(ctx, accent, "ζ " + n1(cur.z), nX, gy + 30, "center");
  }

  function xNow(cur) { return bodyResp(cur.wn * clamp(tCur, 0, TWIN), cur.z); }

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
  var LOOP = TWIN + 1.0;

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
      var head = "A " + M_WORD(r.m) + " load on a " + C_WORD(r) + " damper: damping ratio "
        + n1(r.z) + ", where one is critical. ";
      var tail;
      if (verdict === "settle") {
        tail = "Settles — after the bump the body comes back to level in one motion, about " + secs(r.settle)
          + ", with no float. This is the fastest clean recovery.";
      } else if (verdict === "wallow") {
        tail = "Wallows — the damper is soft, so the body bobs back past level by " + pct(r.rebound)
          + " and rolls a little before it rests. Add damper, toward a critical " + n1(r.cc) + ".";
      } else if (verdict === "float") {
        tail = "Floats — with almost no damper the body bobs on the spring, rebounding " + pct(r.rebound)
          + " past level again and again, and the tyre skips off the road on the rebound — grip is lost. Add damper toward " + n1(r.cc) + ".";
      } else if (verdict === "firm") {
        tail = "Firm — the damper is stiff, so the body sinks back slowly, over about " + secs(r.settle)
          + ", dragging rather than settling. Ease it toward " + n1(r.cc) + ".";
      } else {
        tail = "Harsh — the damper is so stiff it locks the body to the wheel: the bump comes almost straight through and the recovery drags past " + secs(TWIN)
          + ". Ease it well down, toward the critical " + n1(r.cc) + ".";
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
