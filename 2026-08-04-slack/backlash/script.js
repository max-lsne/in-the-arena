/* Backlash — the bench.
 *
 * A gear pair drives on one flank at a time; the trailing flanks stand clear by
 * a measured clearance c (mm at the pitch line). That clearance must exceed
 * everything that would close it — thermal growth and load deflection, summed as
 * the closure Δ — or the teeth bind on both flanks and seize:
 *
 *   bind margin = c − Δ            (Δ set by the duty)
 *
 * Everything above the floor is lost motion: on reversal the driving flank must
 * fall clear across the gap before the far flank bites, so the output lags the
 * input by the whole clearance. And it is struck the harder the faster the train
 * turns — a rough hammer index c·(rpm/1000)². The duty sets both the floor Δ and
 * the tolerance the job allows; clearance in mm, lost motion in µm. */
(function () {
  "use strict";

  var HAMMER_KNOCK = 0.9;    // c(mm)·(krpm)² above which the reversal hammers
  var MAXC = 0.4;

  var DUTY = {
    precision: { label: "precision",  closure: 0.03, tol: 0.06 },
    general:   { label: "general",    closure: 0.08, tol: 0.18 },
    heavy:     { label: "heavy & hot", closure: 0.16, tol: 0.35 }
  };

  // Opens on a gap cut too tight for a hot, heavy duty: the teeth binding.
  var DEFAULT = { c: 0.04, rpm: 800, duty: "heavy" };

  var KEY = "slack.backlash.v1";   // where the mesh is kept between visits
  var state = load() || Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY));
      if (!o || !DUTY[o.duty]) return null;
      return {
        c: clamp(Math.round(o.c * 100) / 100, 0, MAXC),
        rpm: clamp(Math.round(o.rpm / 50) * 50, 100, 3000),
        duty: o.duty
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the mesh ----------------------------------------------------------
  function compute(s) {
    var d = DUTY[s.duty];
    var margin = s.c - d.closure;              // mm
    var lost = s.c * 1000;                      // µm (lost motion ≈ clearance)
    var hammer = s.c * Math.pow(s.rpm / 1000, 2);
    var verdict;
    if (margin <= 0) verdict = "dead";                          // binding
    else if (lost > d.tol * 1000 || hammer > HAMMER_KNOCK) verdict = "drift"; // slop / hammer
    else verdict = "keep";                                      // meshing clean
    return {
      closure: d.closure, tol: d.tol, margin: margin, lost: lost,
      hammer: hammer, knocking: hammer > HAMMER_KNOCK, verdict: verdict
    };
  }

  // least clearance (0.01 steps) that meshes clean, with a thin cushion
  function clearanceToClean(s) {
    for (var c = 0; c <= MAXC + 1e-9; c += 0.01) {
      c = Math.round(c * 100) / 100;
      if (compute({ c: c, rpm: s.rpm, duty: s.duty }).verdict === "keep") {
        return Math.min(Math.round((c + 0.03) * 100) / 100, MAXC);
      }
    }
    return DUTY[s.duty].closure + 0.02;
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inC = $("in-C"), inR = $("in-R");
  var labC = $("lab-C"), labR = $("lab-R");
  var dutyBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-duty]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");

  function syncLabels() {
    labC.textContent = state.c.toFixed(2) + " mm";
    labR.textContent = state.rpm + " rpm";
    dutyBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.duty === state.duty));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Binding",       note: "the gap has closed" },
    drift: { cls: "v-drift", word: "Slop",          note: "lost motion & knock" },
    keep:  { cls: "v-keep",  word: "Meshing clean", note: "free and precise" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.verdict === "drift" && r.knocking && r.lost <= r.tol * 1000) note = "hammering on reversal";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var lostCls = r.lost > r.tol * 1000 ? "warn" : "good";
    var rows = [
      ["Lost motion on reversal", Math.round(r.lost) + '<span class="unit"> µm</span>', lostCls],
      ["Bind margin", (r.margin > 0 ? "+" : "") + r.margin.toFixed(2) + '<span class="unit"> mm</span>', r.margin > 0 ? "good" : "bad"],
      ["Clearance", state.c.toFixed(2) + '<span class="unit"> mm</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas: one meshed pair, close up) --------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 520, H = 420, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function sizeCanvas() {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  var cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  var CX = 260, PITCH = 176;                  // mesh centre, pitch line y
  var GAUGE = { x0: 56, x1: 464, y: 384, max: 400 };  // lost motion, µm
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var phase = 0, knockFlash = 0;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"), field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);
    ctx.clearRect(0, 0, W, H);

    var vgap = clamp(state.c * 150, 0, 62);   // visual clearance, px
    var toothW = 58, toothH = 62, flank = 16;

    // the lower gear: a rim with two teeth rising, leaving a V-space
    drawRim(col, PITCH, 96, +1);
    // the upper gear: a rim with one tooth descending into the space
    drawRim(col, PITCH, -96, -1);

    // reversal: the upper tooth rides against the drive flank, then on reverse
    // travels across the gap to the coast flank and lands a knock.
    var swing = cur.verdict === "dead" ? 0 : Math.sin(phase) * (vgap / 2);
    var pinX = CX + swing;

    // pitch line
    ctx.strokeStyle = col.rule; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, PITCH); ctx.lineTo(460, PITCH); ctx.stroke(); ctx.setLineDash([]);

    if (cur.verdict === "dead") {
      // binding: draw the two flanks overlapping, teeth wedged
      drawTooth(CX - toothW / 2 - 2, PITCH, +1, toothW, toothH, flank, col.slate, withAlpha(col.dead, 0.18)); // lower L
      drawTooth(CX + toothW / 2 + 2, PITCH, +1, toothW, toothH, flank, col.slate, withAlpha(col.dead, 0.18)); // lower R
      drawTooth(CX, PITCH, -1, toothW, toothH, flank, col.dead, withAlpha(col.dead, 0.28));                   // upper, jammed
      // contact sparks both flanks
      spark(CX - toothW / 2 + flank / 2, PITCH, col.dead);
      spark(CX + toothW / 2 - flank / 2, PITCH, col.dead);
    } else {
      // lower gear: two teeth framing the space, gap = clearance each side of tooth
      drawTooth(CX - toothW / 2 - vgap / 2 - flank, PITCH, +1, toothW, toothH, flank, col.slate, withAlpha(col.slate, 0.12));
      drawTooth(CX + toothW / 2 + vgap / 2 + flank, PITCH, +1, toothW, toothH, flank, col.slate, withAlpha(col.slate, 0.12));
      // upper tooth sitting in the space, rocking with the reversal
      drawTooth(pinX, PITCH, -1, toothW, toothH, flank, col.brass, withAlpha(col.brass, 0.16));
      // mark the clearance behind the tooth
      dimGap(CX, vgap, PITCH, col, accent);
      // knock flash when the tooth reaches the coast flank
      if (knockFlash > 0.01) spark(pinX + Math.sign(swing) * (toothW / 2), PITCH, accent);
    }

    // label
    ctx.fillStyle = col.faint; ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(cur.verdict === "dead" ? "flanks touching both sides" : "drive flank ▸ · clearance behind",
      CX, PITCH + 104);

    drawGauge(col, accent, cur);
  }

  function drawRim(col, py, dy, dir) {
    ctx.fillStyle = withAlpha(col.slate, 0.10); ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    var y = py + dy + (dir > 0 ? 30 : -30);
    ctx.fillRect(60, dir > 0 ? y : 40, 400, dir > 0 ? 60 : (y - 40 + 60));
  }

  // a trapezoidal tooth; dir +1 points up (lower gear), −1 points down (upper)
  function drawTooth(cx, py, dir, w, h, flank, stroke, fill) {
    var tip = py - dir * h, top = w / 2 - flank, bot = w / 2;
    ctx.beginPath();
    ctx.moveTo(cx - bot, py);
    ctx.lineTo(cx - top, tip);
    ctx.lineTo(cx + top, tip);
    ctx.lineTo(cx + bot, py);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
  }

  function dimGap(cx, vgap, py, col, accent) {
    if (vgap < 3) return;
    var gx = cx + 30;
    ctx.strokeStyle = accent; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, py - 40); ctx.lineTo(gx + vgap, py - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx, py - 44); ctx.lineTo(gx, py - 36);
    ctx.moveTo(gx + vgap, py - 44); ctx.lineTo(gx + vgap, py - 36); ctx.stroke();
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("clearance", gx + vgap / 2, py - 48);
  }

  function spark(x, y, c) {
    ctx.fillStyle = c;
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * 2 * Math.PI, r = 4 + (i % 2) * 4;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, 1.4, 0, 2 * Math.PI); ctx.fill();
    }
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + clamp(v, 0, g.max) / g.max * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    // clean band: from the closure floor up to the tolerance
    var lo = xFor(cur.closure * 1000), hi = xFor(cur.tol * 1000);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(lo, g.y - 8, hi - lo, 16);
    ctx.strokeStyle = col.keep; ctx.strokeRect(lo, g.y - 8, hi - lo, 16);
    // binding zone below the floor
    ctx.fillStyle = withAlpha(col.dead, 0.14); ctx.fillRect(g.x0, g.y - 8, lo - g.x0, 16);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [0, 100, 200, 300, 400].forEach(function (t) {
      var x = xFor(t);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 9); ctx.lineTo(x, g.y + 13); ctx.stroke();
      ctx.fillText(String(t), x, g.y + 25);
    });
    ctx.textAlign = "left"; ctx.fillText("lost motion, µm — clean band bracketed by binding and slop", g.x0, g.y - 14);
    var pinned = cur.lost > g.max, nx = xFor(cur.lost);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, g.y - 11); ctx.lineTo(nx, g.y + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, g.y - 11, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) { ctx.beginPath(); ctx.moveTo(nx + 4, g.y - 11); ctx.lineTo(nx + 11, g.y - 14); ctx.lineTo(nx + 11, g.y - 8); ctx.closePath(); ctx.fill(); }
  }

  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  // ---- loop --------------------------------------------------------------
  var current = compute(state);
  var lastTs = null, prevSwing = 0;
  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) {
      // reversal cadence rises with rpm; a knock lands each time the tooth turns back
      phase += dt * (1.2 + state.rpm / 1400);
      var sw = Math.sin(phase);
      if (prevSwing * sw < 0 && current.verdict !== "dead") knockFlash = Math.min(1, current.hammer);
      prevSwing = sw;
      knockFlash *= 0.9;
    }
    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ------------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
    announce(current);
    save();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var sayTimer = null;
  function announce(r) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var pre = state.c.toFixed(2) + " millimetre clearance, " + DUTY[state.duty].label
        + " duty, " + state.rpm + " rpm. ";
      var msg;
      if (r.verdict === "dead") {
        msg = pre + "Binding — heat and load have closed the gap by " + Math.abs(r.margin).toFixed(2)
          + " millimetres and the teeth wedge. Open the clearance.";
      } else if (r.verdict === "drift") {
        msg = pre + (r.knocking && r.lost <= r.tol * 1000
          ? "Hammering — the reversal lands a hard knock at this speed."
          : "Slop — the lost motion is " + Math.round(r.lost) + " microns, past what the duty allows.");
      } else {
        msg = pre + "Meshing clean — free with a " + r.margin.toFixed(2)
          + " millimetre bind margin, and " + Math.round(r.lost) + " microns of lost motion, inside tolerance.";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inC.addEventListener("input", function () { state.c = parseFloat(inC.value); update(); });
  inR.addEventListener("input", function () { state.rpm = parseInt(inR.value, 10); update(); });
  dutyBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.duty = b.dataset.duty; update(); });
  });

  $("open").addEventListener("click", function () {
    state.c = clearanceToClean(state); inC.value = state.c; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT); inC.value = state.c; inR.value = state.rpm; update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  inC.value = state.c; inR.value = state.rpm;
  update();
})();
