/* Breath — the bench.
 *
 * Heat a span of length L by ΔT and it wants to grow by ΔL = α·L·ΔT. Give it a
 * gap at least that big and it grows into the gap for free. Give it less, and
 * the shortfall it cannot shed becomes compressive strain, and strain in a stiff
 * material becomes stress fast:
 *
 *   ΔL = α · L · ΔT          σ = E · (ΔL − gap) / L
 *
 * Past a material's buckling stress the rail can no longer hold a straight line
 * and throws itself sideways — a sun kink. Too large a gap has the opposite
 * fault: an open joint that gapes cold and hammers every wheel. Gap in mm cut
 * cold; the thermometer runs the day between. */
(function () {
  "use strict";

  var CLATTER_MARGIN = 8;    // mm of gap beyond the demand before it hammers
  var MAXG = 40;

  var MAT = {
    steel:     { label: "steel",     alpha: 12e-6, E: 210, crit: 100 },
    concrete:  { label: "concrete",  alpha: 10e-6, E: 30,  crit: 15 },
    aluminium: { label: "aluminium", alpha: 23e-6, E: 69,  crit: 55 }
  };

  // Opens on a gap cut too small for a long steel span in a hard summer.
  var DEFAULT = { g: 4, L: 60, T: 50, mat: "steel" };

  var KEY = "slack.breath.v1";   // where the joint is kept between visits
  var state = load() || Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY));
      if (!o || !MAT[o.mat]) return null;
      return {
        g: clamp(Math.round(o.g), 0, MAXG),
        L: clamp(Math.round(o.L / 5) * 5, 10, 120),
        T: clamp(Math.round(o.T), 10, 70),
        mat: o.mat
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the joint ---------------------------------------------------------
  function compute(s) {
    var m = MAT[s.mat];
    var demand = m.alpha * s.L * s.T * 1000;     // mm of growth the heat wants
    var shortfall = Math.max(0, demand - s.g);   // mm the gap denies
    var strain = shortfall / (s.L * 1000);
    var sigma = m.E * 1000 * strain;             // MPa
    var buckleFrac = sigma / m.crit;
    var excess = s.g - demand;                   // gap beyond the demand
    var verdict;
    if (buckleFrac > 1) verdict = "dead";                    // buckling
    else if (excess > CLATTER_MARGIN) verdict = "drift";     // clattering
    else verdict = "keep";                                   // breathing
    return {
      demand: demand, shortfall: shortfall, sigma: sigma, buckleFrac: buckleFrac,
      excess: excess, crit: m.crit, verdict: verdict
    };
  }

  // the gap that breathes easy — sized to the growth, so it closes near the peak
  // with almost no thrust and does not gape enough to clatter
  function gapToBreathe(s) {
    var demand = MAT[s.mat].alpha * s.L * s.T * 1000;
    return clamp(Math.ceil(demand), 0, MAXG);
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inG = $("in-G"), inL = $("in-L"), inT = $("in-T");
  var labG = $("lab-G"), labL = $("lab-L"), labT = $("lab-T");
  var matBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-mat]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");

  function syncLabels() {
    labG.textContent = state.g + " mm";
    labL.textContent = state.L + " m";
    labT.textContent = state.T + " °C";
    matBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mat === state.mat));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Buckling",       note: "thrown out of line" },
    drift: { cls: "v-drift", word: "Clattering",     note: "the joint gapes & pounds" },
    keep:  { cls: "v-keep",  word: "Breathing easy", note: "closes near the peak" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.verdict === "keep" && r.buckleFrac > 0.85) note = "little margin left";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var thrust = r.buckleFrac <= 0.001
      ? '<span class="unit">none</span>'
      : Math.round(r.buckleFrac * 100) + '<span class="unit">% of buckling</span>';
    var tCls = r.buckleFrac > 1 ? "bad" : (r.buckleFrac > 0.8 ? "warn" : "good");
    var rows = [
      ["Growth the heat demands", r.demand.toFixed(1) + '<span class="unit"> mm</span>', ""],
      ["Compressive thrust", thrust, tCls],
      ["Gap", state.g + '<span class="unit"> mm</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas: one joint, and the day running over it) -------
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

  var CX = 260, RY = 188, X0 = 60, X1 = 460;
  var GAUGE = { x0: 60, x1: 460, y: 384, max: 1.5 };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var day = reduce ? Math.PI : 0;   // 0 cold → 1 hot → 0, cycled; held at the peak if still

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"), field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);
    ctx.clearRect(0, 0, W, H);

    var Tfrac = (1 - Math.cos(day)) / 2;                 // 0 cold → 1 hot
    var grownNow = cur.demand * Tfrac;                    // mm grown at this hour
    var instShort = Math.max(0, grownNow - state.g);      // mm denied right now
    var instStrain = instShort / (state.L * 1000);
    var instSigma = MAT[state.mat].E * 1000 * instStrain;
    var instFrac = instSigma / cur.crit;

    // the sun, warmth rising with the day
    drawSun(410, 58, Tfrac, col);
    // thermometer
    drawThermo(486, 96, 168, Tfrac, col, accent);

    // sleepers under the rail
    ctx.strokeStyle = withAlpha(col.slate, 0.5); ctx.lineWidth = 6; ctx.lineCap = "round";
    for (var sx = X0 + 14; sx <= X1 - 8; sx += 34) {
      ctx.beginPath(); ctx.moveTo(sx, RY + 12); ctx.lineTo(sx, RY + 24); ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(col.slate, 0.16); ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(X0, RY + 20); ctx.lineTo(X1, RY + 20); ctx.stroke();

    var mmToPx = 1.4;
    var openPx = Math.max(0, (state.g - grownNow)) * mmToPx;   // gap on screen now
    var closed = grownNow >= state.g - 1e-6;

    if (closed && instFrac > 1) {
      // buckled: one continuous rail bowing out of line, worse toward the peak
      var amp = clamp((instFrac - 1) * 30 + 6, 0, 52);
      drawRail(X0, X1, RY, amp, col.dead, col);
      ctx.fillStyle = col.dead; ctx.font = "600 12px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText("sun kink", CX, RY - amp - 12);
    } else if (closed) {
      // gap shut, in compression but still straight
      drawRail(X0, X1, RY, 0, col.slate, col);
      band(CX - 40, CX + 40, RY, withAlpha(accent, 0.5));
      ctx.fillStyle = col.faint; ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText("gap shut · in compression", CX, RY - 22);
    } else {
      // two rail-ends with an open joint between
      drawRailSeg(X0, CX - openPx / 2, RY, col.slate, col);
      drawRailSeg(CX + openPx / 2, X1, RY, col.slate, col);
      // dimension the gap
      var gy = RY - 22;
      ctx.strokeStyle = accent; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CX - openPx / 2, gy); ctx.lineTo(CX + openPx / 2, gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX - openPx / 2, gy - 4); ctx.lineTo(CX - openPx / 2, gy + 4);
      ctx.moveTo(CX + openPx / 2, gy - 4); ctx.lineTo(CX + openPx / 2, gy + 4); ctx.stroke();
      ctx.fillStyle = col.faint; ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText((state.g - grownNow).toFixed(1) + " mm open", CX, gy - 8);
      // a wheel hammering a wide cold joint
      if (cur.verdict === "drift" && openPx > 14) spark(CX, RY - 4, col.drift);
    }

    drawGauge(col, accent, cur);
  }

  function drawRail(x0, x1, y, amp, stroke, col) {
    ctx.strokeStyle = stroke; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for (var x = x0; x <= x1; x += 4) {
      var yy = y - amp * Math.sin(Math.PI * (x - x0) / (x1 - x0));
      x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  function drawRailSeg(x0, x1, y, stroke, col) {
    if (x1 <= x0) return;
    ctx.strokeStyle = stroke; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    // a squared end at the joint
    ctx.strokeStyle = withAlpha(stroke, 0.5); ctx.lineWidth = 2;
  }

  function band(x0, x1, y, c) {
    ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  }

  function drawSun(x, y, t, col) {
    var a = 0.25 + 0.6 * t;
    ctx.strokeStyle = withAlpha(col.brass, a); ctx.lineWidth = 2; ctx.lineCap = "round";
    for (var i = 0; i < 8; i++) {
      var ang = i / 8 * 2 * Math.PI, r0 = 16, r1 = 16 + 6 + 5 * t;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
      ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
      ctx.stroke();
    }
    ctx.fillStyle = withAlpha(col.brass, a); ctx.beginPath(); ctx.arc(x, y, 12, 0, 2 * Math.PI); ctx.fill();
  }

  function drawThermo(x, y, h, t, col, accent) {
    ctx.strokeStyle = col.rule; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke();
    ctx.strokeStyle = withAlpha(col.dead, 0.7); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h - t * h); ctx.stroke();
    ctx.fillStyle = withAlpha(col.dead, 0.7); ctx.beginPath(); ctx.arc(x, y + h + 4, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "right";
    ctx.fillText(t > 0.5 ? "hot" : "cold", x - 8, y + h - t * h + 3);
  }

  function spark(x, y, c) {
    ctx.fillStyle = c;
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * 2 * Math.PI, r = 5 + (i % 2) * 5;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y - Math.abs(Math.sin(a)) * r, 1.6, 0, 2 * Math.PI); ctx.fill();
    }
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + clamp(v, 0, g.max) / g.max * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    var safe = xFor(0.8), lim = xFor(1.0);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(g.x0, g.y - 8, safe - g.x0, 16);
    ctx.strokeStyle = col.keep; ctx.strokeRect(g.x0, g.y - 8, safe - g.x0, 16);
    ctx.fillStyle = withAlpha(col.drift, 0.16); ctx.fillRect(safe, g.y - 8, lim - safe, 16);
    ctx.fillStyle = withAlpha(col.dead, 0.12); ctx.fillRect(lim, g.y - 8, g.x1 - lim, 16);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [[0, "0"], [0.5, "½"], [1, "buckle"], [1.5, "1½×"]].forEach(function (t) {
      var x = xFor(t[0]);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 9); ctx.lineTo(x, g.y + 13); ctx.stroke();
      ctx.fillText(t[1], x, g.y + 25);
    });
    ctx.textAlign = "left"; ctx.fillText("compressive thrust, fraction of buckling", g.x0, g.y - 14);
    var pinned = cur.buckleFrac > g.max, nx = xFor(cur.buckleFrac);
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
  var lastTs = null;
  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) day += dt * 0.9;    // the day runs cold → hot → cold
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
      var pre = state.g + " millimetre gap, " + state.L + " metre " + MAT[state.mat].label
        + " span, " + state.T + " degree swing. ";
      var msg;
      if (r.verdict === "dead") {
        msg = pre + "Buckling — the heat demands " + r.demand.toFixed(0)
          + " millimetres of growth and the thrust reaches " + Math.round(r.buckleFrac * 100)
          + " percent of buckling. Cut the gap wider.";
      } else if (r.verdict === "drift") {
        msg = pre + "Clattering — the gap is " + r.excess.toFixed(0)
          + " millimetres wider than the heat demands, so the cold joint gapes and hammers.";
      } else {
        msg = pre + "Breathing — the gap covers the " + r.demand.toFixed(0)
          + " millimetres of growth, with thrust at " + Math.round(r.buckleFrac * 100) + " percent of buckling.";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inG.addEventListener("input", function () { state.g = parseInt(inG.value, 10); update(); });
  inL.addEventListener("input", function () { state.L = parseInt(inL.value, 10); update(); });
  inT.addEventListener("input", function () { state.T = parseInt(inT.value, 10); update(); });
  matBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.mat = b.dataset.mat; update(); });
  });

  $("cut").addEventListener("click", function () {
    state.g = gapToBreathe(state); inG.value = state.g; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT); inG.value = state.g; inL.value = state.L; inT.value = state.T; update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  inG.value = state.g; inL.value = state.L; inT.value = state.T;
  update();
})();
