/* Rift — the bench.
 *
 * A split follows the grain, not your line. Over a billet of length L, grain of
 * slope θ carries the split off the centre by its run-off:
 *
 *   run-off = L · tan θ          exit = run-off − steer·pull
 *
 * The rive-r cancels the run-off by bending the thick half — a steer that pulls
 * the split back toward the middle. Too little and the split runs out the edge
 * and loses half the billet; too much and the fibres tear across instead of
 * parting, and the face comes up ragged. Between them the split rives true. Some
 * stock — interlocked elm — will not answer the steer at all, and must be worked
 * short or not riven. Lengths in mm; slope in degrees; steer as a fraction of a
 * full bend. */
(function () {
  "use strict";

  var STEER_MAX = 140;     // mm the fullest bend can pull the split, at follow = 1

  var STOCK = {
    oak: { label: "oak", follow: 1.00, tear: 78, HW: 55 },
    ash: { label: "ash", follow: 0.90, tear: 64, HW: 52 },
    elm: { label: "elm", follow: 0.42, tear: 118, HW: 58 }   // interlocked — barely rives
  };

  // Opens on a long billet of sloping grain, no steer at all — the split running out.
  var DEFAULT = { a: 8, L: 620, s: 0, stock: "oak" };

  var state = Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- the split ---------------------------------------------------------
  function compute(st) {
    var m = STOCK[st.stock];
    var runoff = Math.tan(st.a * Math.PI / 180) * st.L;   // mm the grain carries it
    var pull = (st.s / 100) * STEER_MAX * m.follow;        // mm the steer pulls back
    var exit = runoff - pull;                             // mm from the centreline at the far end
    var exitFrac = exit / m.HW;                           // as a fraction of the half-width
    var tearFrac = st.s / m.tear;                         // how hard the steer strains the fibres
    var verdict;
    if (tearFrac > 1) verdict = "drift";                 // torn — steered past what the wood takes
    else if (Math.abs(exitFrac) >= 1) verdict = "dead";  // run-out — the split leaves the billet
    else verdict = "keep";                               // rives true
    return {
      runoff: runoff, pull: pull, exit: exit, exitFrac: exitFrac,
      tearFrac: tearFrac, HW: m.HW, verdict: verdict
    };
  }

  // the least steer that lands the split back on the centreline
  function steerToTrue(st) {
    var m = STOCK[st.stock];
    var runoff = Math.tan(st.a * Math.PI / 180) * st.L;
    if (m.follow <= 0) return 0;
    return clamp(Math.round(runoff / (STEER_MAX * m.follow) * 100), 0, 100);
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inA = $("in-A"), inL = $("in-L"), inS = $("in-S");
  var labA = $("lab-A"), labL = $("lab-L"), labS = $("lab-S");
  var stockBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-stock]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");

  function syncLabels() {
    labA.textContent = state.a + "°";
    labL.textContent = state.L + " mm";
    labS.textContent = state.s + "%";
    stockBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.stock === state.stock));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Run-out",   note: "half the billet lost" },
    drift: { cls: "v-drift", word: "Torn",      note: "the face shears ragged" },
    keep:  { cls: "v-keep",  word: "Rives true", note: "down the centre" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.verdict === "keep" && Math.abs(r.exitFrac) > 0.55) note = "wandering — hold it";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var exitPct = Math.round(Math.abs(r.exitFrac) * 100);
    var exitCls = Math.abs(r.exitFrac) >= 1 ? "bad" : (Math.abs(r.exitFrac) > 0.55 ? "warn" : "good");
    var tearCls = r.tearFrac > 1 ? "bad" : (r.tearFrac > 0.8 ? "warn" : "good");
    var side = r.exit > 0.5 ? " toward the weak side" : (r.exit < -0.5 ? " past centre" : "");
    var rows = [
      ["Run-off the grain demands", r.runoff.toFixed(0) + '<span class="unit"> mm</span>', ""],
      ["Steer pulls back", r.pull.toFixed(0) + '<span class="unit"> mm</span>', ""],
      ["Split exits at", exitPct + '<span class="unit">% of the way to the edge' + side + '</span>', exitCls],
      ["Cross-grain strain", Math.round(r.tearFrac * 100) + '<span class="unit">% of tearing</span>', tearCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas: one billet, the froe, and the split it takes) --
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

  var X0 = 74, X1 = 452, CY = 178, HVIS = 66;      // the billet, on screen
  var GAUGE = { x0: 74, x1: 452, y: 388, min: -1.5, max: 1.5 };
  var prog = 0;   // the froe working down the billet, 0 → 1, cycled

  // the split's height above the centreline at a fraction f of the length
  function splitY(cur, f) {
    var end = clamp(cur.exitFrac, -1.6, 1.6) * HVIS;
    return end * Math.pow(f, 1.28);      // accelerates outward, as a real rift does
  }

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"), field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);
    ctx.clearRect(0, 0, W, H);

    var top = CY - HVIS, bot = CY + HVIS;
    var slopePx = Math.tan(state.a * Math.PI / 180) * (X1 - X0);   // grain drop across the billet

    // the billet body
    ctx.fillStyle = withAlpha(col.brass, 0.07);
    ctx.fillRect(X0, top, X1 - X0, HVIS * 2);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.strokeRect(X0, top, X1 - X0, HVIS * 2);

    // the grain — fibres running at the slope, clipped to the billet
    ctx.save();
    ctx.beginPath(); ctx.rect(X0, top, X1 - X0, HVIS * 2); ctx.clip();
    ctx.strokeStyle = withAlpha(col.slate, 0.32); ctx.lineWidth = 1;
    for (var gy = top - Math.abs(slopePx) - 8; gy <= bot + Math.abs(slopePx) + 8; gy += 11) {
      ctx.beginPath(); ctx.moveTo(X0, gy); ctx.lineTo(X1, gy + slopePx); ctx.stroke();
    }
    ctx.restore();

    // how far the froe has driven this pass
    var f = prog;
    var xNow = X0 + (X1 - X0) * f;

    // does the split leave through an edge before the end?
    var outF = 1;
    for (var t = 0.02; t <= 1; t += 0.02) {
      if (Math.abs(splitY(cur, t)) >= HVIS) { outF = t; break; }
    }
    var reveal = Math.min(f, outF);

    // the split path so far
    ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for (var s = 0; s <= reveal + 1e-6; s += 0.02) {
      var x = X0 + (X1 - X0) * s, y = CY + splitY(cur, s);
      s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    // torn splits come up furred — jitter the drawn edge
    if (cur.verdict === "drift") {
      ctx.stroke();
      ctx.strokeStyle = withAlpha(col.drift, 0.55); ctx.lineWidth = 1;
      for (var jx = X0 + 6; jx < xNow; jx += 7) {
        var jf = (jx - X0) / (X1 - X0), jy = CY + splitY(cur, jf);
        var d = ((jx * 13) % 7) - 3;
        ctx.beginPath(); ctx.moveTo(jx, jy - 3 - d); ctx.lineTo(jx + 3, jy + 3 + d); ctx.stroke();
      }
    } else {
      ctx.stroke();
    }

    // where the split exits, or runs out
    if (outF < 1 && f >= outF) {
      var ex = X0 + (X1 - X0) * outF, ey = CY + splitY(cur, outF);
      ctx.fillStyle = col.dead;
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 2 * Math.PI); ctx.fill();
      ctx.font = "600 12px ui-monospace, monospace"; ctx.textAlign = "left";
      ctx.fillText("runs out", Math.min(ex + 8, X1 - 56), ey + (ey < CY ? -8 : 16));
    }

    // the froe, driven in at the working point
    drawFroe(xNow, CY + splitY(cur, f), col, accent);

    // the steer — a lever bending the thick half
    if (state.s > 0) drawSteer(col, cur);

    drawGauge(col, accent, cur);
  }

  function drawFroe(x, y, col, accent) {
    ctx.save();
    ctx.translate(x, y);
    // blade
    ctx.fillStyle = withAlpha(col.slate, 0.9);
    ctx.beginPath();
    ctx.moveTo(-26, -3); ctx.lineTo(6, -1); ctx.lineTo(6, 1); ctx.lineTo(-26, 3); ctx.closePath();
    ctx.fill();
    // handle stub, turned up
    ctx.strokeStyle = col.brass; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-40, -12); ctx.stroke();
    ctx.restore();
  }

  function drawSteer(col, cur) {
    // an arc on the near (thick) side showing the bend that pulls the split back
    var thick = cur.exit >= 0 ? 1 : -1;   // bend the side the split is leaving toward
    var y = CY + thick * (HVIS + 16);
    var amp = 6 + state.s / 100 * 16;
    ctx.strokeStyle = withAlpha(col.keep, 0.85); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X0 + 30, y);
    ctx.quadraticCurveTo((X0 + X1) / 2, y - thick * amp, X1 - 30, y);
    ctx.stroke();
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("bend " + state.s + "%", (X0 + X1) / 2, y + thick * 14 + (thick < 0 ? -4 : 10));
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + (clamp(v, g.min, g.max) - g.min) / (g.max - g.min) * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    var lo = xFor(-1), hi = xFor(1);
    // the run-out walls, and the true band between
    ctx.fillStyle = withAlpha(col.dead, 0.12); ctx.fillRect(g.x0, g.y - 8, lo - g.x0, 16);
    ctx.fillStyle = withAlpha(col.dead, 0.12); ctx.fillRect(hi, g.y - 8, g.x1 - hi, 16);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(lo, g.y - 8, hi - lo, 16);
    ctx.strokeStyle = col.keep; ctx.strokeRect(lo, g.y - 8, hi - lo, 16);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [[-1, "out"], [0, "centre"], [1, "out"]].forEach(function (t) {
      var x = xFor(t[0]);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 9); ctx.lineTo(x, g.y + 13); ctx.stroke();
      ctx.fillText(t[1], x, g.y + 25);
    });
    ctx.textAlign = "left"; ctx.fillText("where the split exits, across the billet", g.x0, g.y - 14);
    var pinned = Math.abs(cur.exitFrac) > g.max, nx = xFor(cur.exitFrac);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, g.y - 11); ctx.lineTo(nx, g.y + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, g.y - 11, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) {
      var dir = cur.exitFrac > 0 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(nx + dir * 4, g.y - 11); ctx.lineTo(nx + dir * 11, g.y - 14); ctx.lineTo(nx + dir * 11, g.y - 8); ctx.closePath(); ctx.fill();
    }
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
  var lastTs = null, hold = 0;
  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (hold > 0) { hold -= dt; }
    else {
      prog += dt * 0.5;
      if (prog >= 1) { prog = 1; hold = 0.7; }
    }
    if (hold <= 0 && prog >= 1) prog = 0;
    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ------------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
  }

  inA.addEventListener("input", function () { state.a = parseInt(inA.value, 10); update(); });
  inL.addEventListener("input", function () { state.L = parseInt(inL.value, 10); update(); });
  inS.addEventListener("input", function () { state.s = parseInt(inS.value, 10); update(); });
  stockBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.stock = b.dataset.stock; update(); });
  });

  $("fix").addEventListener("click", function () {
    state.s = steerToTrue(state); inS.value = state.s; prog = 0; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inA.value = state.a; inL.value = state.L; inS.value = state.s; prog = 0; update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  inA.value = state.a; inL.value = state.L; inS.value = state.s;
  update();
})();
