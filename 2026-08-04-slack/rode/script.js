/* Rode — the bench.
 *
 * A chain of weight w (per metre) hung between the boat and the anchor cannot
 * lie straight: its own weight drags it into a catenary. The parameter of that
 * curve is a = H / w, where H is the horizontal load the boat puts on the rode.
 * The suspended length needed to rise the water depth d, arriving horizontally
 * at the anchor, is
 *
 *   s = sqrt(d(d + 2a))                      a = H / w
 *
 * If the rode length L exceeds s, the surplus (L − s) lies flat on the bottom in
 * reserve and the pull at the anchor is horizontal — it holds. The load that
 * just lifts the last link (s = L, angle leaving zero) is
 *
 *   H_max = w (L² − d²) / 2d
 *
 * Past that the whole rode is suspended and the pull tips up off the seabed by
 * an angle that climbs toward the straight-chord angle as the load grows. Depth
 * is fixed at 8 m; loads in kN, chain weight in N/m. */
(function () {
  "use strict";

  var DEPTH = 8;              // m, at high water
  var HOLD_ANGLE = 6;         // deg — pull this flat or flatter and the anchor bites
  var DRAG_ANGLE = 12;        // deg — past this it is being levered out
  var WIDE_SCOPE = 7.5;       // scope beyond which the swing circle is "wandering"
  var MAXSCOPE = 10;

  var TACK = {
    light: { label: "rope & chain", w: 5 },    // N/m, effective
    chain: { label: "all chain",    w: 14 },
    heavy: { label: "heavy chain",  w: 22 }
  };

  // Opens on a short scope in a hard gust: the rode bar-taut, the anchor lifting.
  var DEFAULT = { S: 4, H: 3, tack: "chain" };

  var KEY = "slack.rode.v1";   // where the anchorage is kept between visits
  var state = load() || Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function asinh(x) { return Math.log(x + Math.sqrt(x * x + 1)); }

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY));
      if (!o || !TACK[o.tack]) return null;
      return {
        S: clamp(Math.round(o.S * 2) / 2, 3, MAXSCOPE),
        H: clamp(Math.round(o.H * 10) / 10, 0.3, 6),
        tack: o.tack
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the catenary ------------------------------------------------------
  function compute(s) {
    var w = TACK[s.tack].w;
    var H = s.H * 1000;                     // N
    var L = s.S * DEPTH;                     // rode length, m
    var a = H / w;                           // catenary parameter, m
    var suspended = Math.sqrt(DEPTH * (DEPTH + 2 * a));   // length needed to reach depth
    var Hmax = w * (L * L - DEPTH * DEPTH) / (2 * DEPTH); // load to lift the last link

    var angle, reserve, xreach, lifted;
    if (H <= Hmax) {
      // touches down: surplus lies flat, pull arrives horizontal
      lifted = false;
      angle = 0;
      reserve = L - suspended;
      xreach = a * asinh(suspended / a);     // horizontal span of the suspended part
    } else {
      // whole rode lifted: angle climbs toward the straight chord as load grows
      lifted = true;
      reserve = 0;
      var chordAng = Math.atan2(DEPTH, Math.sqrt(Math.max(0, L * L - DEPTH * DEPTH)));
      angle = chordAng * (1 - Hmax / H) * 180 / Math.PI;
      xreach = Math.sqrt(Math.max(0, L * L - DEPTH * DEPTH));
    }
    var Tbow = (H + w * DEPTH) / 1000;       // tension at the bow, kN

    var verdict;
    if (angle > HOLD_ANGLE) verdict = "dead";       // snatching / dragging
    else if (s.S > WIDE_SCOPE) verdict = "drift";   // holds, but wanders
    else verdict = "keep";                          // set and easy

    return {
      w: w, L: L, a: a, angle: angle, reserve: reserve, xreach: xreach,
      lifted: lifted, Tbow: Tbow, suspended: suspended, verdict: verdict
    };
  }

  // least scope that brings the pull into the holding band
  function scopeToHold(s) {
    for (var S = 3; S <= MAXSCOPE; S += 0.5) {
      if (compute({ S: S, H: s.H, tack: s.tack }).angle <= HOLD_ANGLE) return Math.min(S + 1, MAXSCOPE);
    }
    return MAXSCOPE;
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inS = $("in-S"), inH = $("in-H");
  var labS = $("lab-S"), labH = $("lab-H");
  var tackBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-tack]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");

  function syncLabels() {
    labS.textContent = state.S.toFixed(state.S % 1 ? 1 : 0) + " : 1";
    labH.textContent = state.H.toFixed(1) + " kN";
    tackBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.tack === state.tack));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Snatching",   note: "the anchor is lifting" },
    drift: { cls: "v-drift", word: "Wandering",   note: "holds, but swings wide" },
    keep:  { cls: "v-keep",  word: "Set and easy", note: "the pull lies flat" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var aCls = r.angle > DRAG_ANGLE ? "bad" : (r.angle > HOLD_ANGLE ? "warn" : "good");
    var resStr = r.lifted
      ? '<span class="unit">none — lifting</span>'
      : r.reserve.toFixed(1) + '<span class="unit"> m</span>';
    var rows = [
      ["Pull angle at the anchor", r.angle.toFixed(1) + '<span class="unit"> °</span>', aCls],
      ["Chain on the bottom", resStr, r.lifted ? "bad" : "good"],
      ["Scope", state.S.toFixed(state.S % 1 ? 1 : 0) + '<span class="unit"> : 1</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas: anchorage from the side) ----------------------
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

  var SEA = { x0: 60, x1: 496, top: 76, bed: 356 };   // water surface / seabed
  var GAUGE = { x0: 60, x1: 496, y: 392, max: 24 };   // angle gauge, degrees
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var phase = 0;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      swing: cssVar("--swing"), keep: cssVar("--keep"), drift: cssVar("--drift"),
      dead: cssVar("--dead"), field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);
    ctx.clearRect(0, 0, W, H);

    // horizontal scale so the whole rode fits with a margin
    var totalX = Math.max(cur.reserve + cur.xreach, 6);
    var scaleX = (SEA.x1 - SEA.x0 - 30) / totalX;
    var scaleY = (SEA.bed - SEA.top) / DEPTH;
    var anchorX = SEA.x0, anchorY = SEA.bed;
    var surge = 3 * Math.sin(phase);        // gentle swell, px

    // water body
    ctx.fillStyle = withAlpha(col.swing, 0.08);
    ctx.fillRect(SEA.x0, SEA.top, SEA.x1 - SEA.x0, SEA.bed - SEA.top);
    // water surface
    ctx.strokeStyle = withAlpha(col.swing, 0.6); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var xs = SEA.x0; xs <= SEA.x1; xs += 6) {
      var yy = SEA.top + 1.6 * Math.sin(xs / 26 + phase);
      xs === SEA.x0 ? ctx.moveTo(xs, yy) : ctx.lineTo(xs, yy);
    }
    ctx.stroke();
    // seabed
    ctx.strokeStyle = col.slate; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(SEA.x0, SEA.bed); ctx.lineTo(SEA.x1, SEA.bed); ctx.stroke();
    ctx.fillStyle = withAlpha(col.slate, 0.10);
    ctx.fillRect(SEA.x0, SEA.bed, SEA.x1 - SEA.x0, H - SEA.bed);

    // build the rode as points (metres from anchor), then map to pixels
    var pts = [];
    if (!cur.lifted) {
      // flat reserve on the bottom
      pts.push({ x: 0, y: 0 });
      pts.push({ x: cur.reserve, y: 0 });
      // catenary rising to the boat
      var steps = 40;
      for (var i = 1; i <= steps; i++) {
        var xx = (i / steps) * cur.xreach;
        var yy2 = cur.a * (Math.cosh(xx / cur.a) - 1);
        pts.push({ x: cur.reserve + xx, y: Math.min(yy2, DEPTH) });
      }
    } else {
      // lifted: a shallow bow from anchor to boat, sagging by what slack is left
      var chord = cur.xreach, sag = Math.max(0, cur.L - Math.sqrt(chord * chord + DEPTH * DEPTH)) * 6;
      var st = 40;
      for (var j = 0; j <= st; j++) {
        var t = j / st;
        var bx = t * chord;
        var by = t * DEPTH - Math.sin(Math.PI * t) * sag;
        pts.push({ x: bx, y: Math.max(0, by) });
      }
    }
    var toPx = function (p) { return { x: anchorX + p.x * scaleX, y: anchorY - p.y * scaleY - (p.y > 0.2 ? surge * (p.y / DEPTH) : 0) }; };

    // the rode
    ctx.strokeStyle = cur.lifted ? col.dead : col.brass; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach(function (p, k) { var q = toPx(p); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
    ctx.stroke();

    // the boat at the top of the rode
    var boat = toPx(pts[pts.length - 1]);
    drawBoat(boat.x, SEA.top + surge, col, accent);

    // the anchor
    drawAnchor(anchorX, anchorY, cur, col, accent);

    // angle arc at the anchor
    if (cur.angle > 0.2) {
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(anchorX, anchorY, 26, -cur.angle * Math.PI / 180, 0); ctx.stroke();
    }
    ctx.fillStyle = col.faint; ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText(cur.lifted ? "pull " + cur.angle.toFixed(0) + "° up" : "pull flat", anchorX + 30, anchorY - 8);

    // depth marker
    ctx.strokeStyle = col.rule; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(SEA.x1 - 8, SEA.top); ctx.lineTo(SEA.x1 - 8, SEA.bed); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col.faint; ctx.textAlign = "right";
    ctx.fillText(DEPTH + " m", SEA.x1 - 12, (SEA.top + SEA.bed) / 2);

    drawGauge(col, accent, cur);
  }

  function drawBoat(x, y, col, accent) {
    ctx.fillStyle = col.slate;
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 6); ctx.lineTo(x + 16, y - 6);
    ctx.lineTo(x + 10, y + 5); ctx.lineTo(x - 10, y + 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col.slate; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 20); ctx.stroke();
  }

  function drawAnchor(x, y, cur, col, accent) {
    var c = cur.lifted ? col.dead : col.keep;
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 2); ctx.stroke();       // shank
    ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y - 8); ctx.stroke(); // stock
    ctx.beginPath();                                                                   // flukes
    ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x - 12, y + 2, x - 12, y - 6);
    ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x + 12, y + 2, x + 12, y - 6);
    ctx.stroke();
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + clamp(v, 0, g.max) / g.max * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    var bx1 = xFor(HOLD_ANGLE);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(g.x0, g.y - 8, bx1 - g.x0, 16);
    ctx.strokeStyle = col.keep; ctx.strokeRect(g.x0, g.y - 8, bx1 - g.x0, 16);
    var bx2 = xFor(DRAG_ANGLE);
    ctx.fillStyle = withAlpha(col.drift, 0.16); ctx.fillRect(bx1, g.y - 8, bx2 - bx1, 16);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [0, 6, 12, 18, 24].forEach(function (t) {
      var x = xFor(t);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 9); ctx.lineTo(x, g.y + 13); ctx.stroke();
      ctx.fillText(t + "°", x, g.y + 25);
    });
    ctx.textAlign = "left"; ctx.fillText("pull angle at the anchor", g.x0, g.y - 14);
    var pinned = cur.angle > g.max, nx = xFor(cur.angle);
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
    if (!reduce) phase += dt * 1.1;
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
      var pre = state.S.toFixed(state.S % 1 ? 1 : 0) + " to one scope, " + state.H.toFixed(1)
        + " kilonewton blow, " + TACK[state.tack].label + ". ";
      var msg;
      if (r.verdict === "dead") {
        msg = pre + "Snatching — the pull comes up " + r.angle.toFixed(0)
          + " degrees off the bottom and lifts the anchor. Veer more scope.";
      } else if (r.verdict === "drift") {
        msg = pre + "Wandering — the pull lies flat and it holds, but the scope is long and the boat swings a wide circle.";
      } else {
        msg = pre + "Set and easy — the pull arrives at " + r.angle.toFixed(1)
          + " degrees, with " + r.reserve.toFixed(1) + " metres of chain in reserve on the bottom.";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inS.addEventListener("input", function () { state.S = parseFloat(inS.value); update(); });
  inH.addEventListener("input", function () { state.H = parseFloat(inH.value); update(); });
  tackBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.tack = b.dataset.tack; update(); });
  });

  $("veer").addEventListener("click", function () {
    state.S = scopeToHold(state); inS.value = state.S; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT); inS.value = state.S; inH.value = state.H; update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  inS.value = state.S; inH.value = state.H;
  update();
})();
