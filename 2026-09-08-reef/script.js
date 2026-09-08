/* Reef — the bench.
 *
 * A boat under sail heels until the wind's heeling moment and the hull's own
 * righting moment agree. Writing them out about the roll axis —
 *
 *   heeling:   M_h(θ) = ½ρ · A · C · V² · h · cos²θ        [rig lies over as cos²θ]
 *   righting:  M_r(θ) = Δg · GM · sinθ                      [stiffness GM, small-angle]
 *
 * and setting M_h = M_r gives, with R = M_h0 / (Δg·GM) the ratio at upright,
 *
 *   R·cos²θ = sinθ   →   R(1 − sin²θ) = sinθ   →   R·s² + s − R = 0
 *   →   sinθ = ( √(1 + 4R²) − 1 ) / 2R
 *
 * a clean closed form for the steady heel. Small wind, small heel; as V climbs,
 * θ walks out toward the deck edge, and past the angle of maximum righting the
 * hull can answer no harder — the rail goes under.
 *
 * Reefing is the one move that reaches into M_h. Taking a band out of the sail
 * drops the area A and, because the head of the sail comes down with it, the
 * centre of effort h as well — so the heeling moment falls faster than the area
 * alone, and the balance settles back to a heel the hull can carry. The four
 * boats are stylised — plausible stiffness and rig, not measured — but the
 * mechanics drawn from them are exact. SI throughout; knots, metres and degrees
 * only at the surface, for the reader.
 */
(function () {
  "use strict";

  var RHO = 1.225;           // air density, kg/m³
  var G_ACC = 9.80665;       // gravity, m/s²
  var KT = 0.514444;         // knot → m/s

  // Each boat: full sail area A (m²), centre-of-effort height h (m) above the
  // waterline, displacement Δ (kg), metacentric height GM (m), sail force
  // coefficient C, the heel she is drawn to sail at (comf, °), and the heel at
  // which the rail goes under (max, °). Stylised — plausible, not measured.
  var BOATS = {
    catboat:  { label: "catboat",  A: 34, h: 4.4, disp: 1900, GM: 1.70, C: 1.35, comf: 15, max: 26 },
    sloop:    { label: "sloop",    A: 48, h: 6.0, disp: 6500, GM: 1.35, C: 1.28, comf: 22, max: 34 },
    keelboat: { label: "keelboat", A: 22, h: 4.0, disp: 1500, GM: 1.15, C: 1.30, comf: 20, max: 30 },
    gaffer:   { label: "gaffer",   A: 64, h: 6.8, disp: 9000, GM: 0.95, C: 1.22, comf: 18, max: 42 }
  };

  // The reef ladder: each step folds away a band of sail, dropping both the area
  // it carries and the height of its centre of effort. Index 0 is full sail.
  var REEFS = [
    { name: "full sail",   a: 1.00, h: 1.00 },
    { name: "one reef",    a: 0.78, h: 0.90 },
    { name: "two reefs",   a: 0.58, h: 0.80 },
    { name: "three reefs", a: 0.42, h: 0.70 },
    { name: "deep reef",   a: 0.26, h: 0.58 }
  ];

  // Opens on a tender gaffer overpressed in a gale under full sail — heeled past
  // her rail. Find the reef on arrival.
  var DEFAULT = { boat: "gaffer", windKt: 36, reef: 0 };
  var KEY = "reef.boat.v1";     // where the boat, wind and reef are kept between visits

  var state = load() || Object.assign({}, DEFAULT);

  function clampNum(v, a, b) { v = Math.round(+v); if (!isFinite(v)) return a; return v < a ? a : v > b ? b : v; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!BOATS[o.boat]) return null;
      return {
        boat: o.boat,
        windKt: clampNum(o.windKt, 4, 45),
        reef: clampNum(o.reef, 0, REEFS.length - 1)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the balance -----------------------------------------------------
  function heelFor(b, A, h, V) {
    var q = 0.5 * RHO * V * V;                    // dynamic pressure, Pa
    var M_h0 = q * A * b.C * h;                    // heeling moment upright, N·m
    var WGM = b.disp * G_ACC * b.GM;               // righting stiffness, N·m/rad-ish
    var R = M_h0 / WGM;
    var s = R > 1e-9 ? (Math.sqrt(1 + 4 * R * R) - 1) / (2 * R) : 0;
    s = clamp(s, 0, 1);
    return { theta: Math.asin(s), M_bal: WGM * s, M_h0: M_h0, WGM: WGM };
  }

  // wind (kt) at which this sail would heel the boat to its rail-under angle
  function railWind(b, A, h) {
    var sm = Math.sin(rad(b.max)), cm = Math.cos(rad(b.max));
    var R_m = sm / (cm * cm);                       // R that puts θ exactly at max
    var M_h0 = R_m * b.disp * G_ACC * b.GM;
    var q = M_h0 / (A * b.C * h);
    var V = Math.sqrt(Math.max(0, q) / (0.5 * RHO));
    return V / KT;
  }

  function compute(s) {
    var b = BOATS[s.boat], rf = REEFS[s.reef];
    var A = b.A * rf.a, h = b.h * rf.h;
    var V = s.windKt * KT;
    var hl = heelFor(b, A, h, V);
    var thetaDeg = deg(hl.theta);

    var grooveLo = b.comf * 0.6, grooveHi = b.comf * 1.15, thetaMax = b.max;
    var verdict;
    if (thetaDeg > thetaMax) verdict = "rail";
    else if (thetaDeg > grooveHi) verdict = "press";
    else if (thetaDeg < grooveLo) verdict = "luff";
    else verdict = "groove";

    return {
      boat: b, A: A, h: h, aFrac: rf.a, hFrac: rf.h,
      theta: hl.theta, thetaDeg: thetaDeg, M_bal: hl.M_bal,
      railKt: railWind(b, A, h),
      grooveLo: grooveLo, grooveHi: grooveHi, thetaMax: thetaMax, comf: b.comf,
      verdict: verdict
    };
  }

  // the reef that lands this wind back in the groove — as near the designed
  // heel as a whole reef step allows, and never one that leaves the rail under
  function findReef(s) {
    var best = 0, bestScore = Infinity;
    for (var i = 0; i < REEFS.length; i++) {
      var r = compute(Object.assign({}, s, { reef: i }));
      var penalty = r.thetaDeg > r.thetaMax ? 1000 : 0;
      var score = penalty + Math.abs(r.thetaDeg - r.comf);
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-W"), inR = $("in-R");
  var labW = $("lab-W"), labR = $("lab-R");
  var boatBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-boat]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");
  var rMark = $("r-mark"), rNote = $("r-note");

  function syncLabels(r) {
    labW.textContent = state.windKt + " kt";
    labR.textContent = REEFS[state.reef].name;
    boatBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.boat === state.boat));
    });
  }

  var VERDICT_TEXT = {
    luff:   { cls: "v-drift", word: "Underpressed", note: "sail soft — shake one out" },
    groove: { cls: "v-keep",  word: "In the groove", note: "heeled as she was drawn" },
    press:  { cls: "v-drift", word: "Pressed",       note: "over-canvassed — reef soon" },
    rail:   { cls: "v-dead",  word: "Rail under",    note: "overpowered — reef now" }
  };

  function severity(v) {
    if (v === "groove") return "good";
    if (v === "rail") return "bad";
    return "warn";
  }

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var sev = severity(r.verdict);
    var margin = r.railKt - state.windKt;
    var railCls = margin <= 0 ? "bad" : (margin <= 4 ? "warn" : "good");

    var rows = [
      ["Heel", Math.round(r.thetaDeg) + "<span class=\"unit\">°</span>", sev],
      ["Sail set", Math.round(r.A) + "<span class=\"unit\"> m² · " + Math.round(r.aFrac * 100) + "%</span>", ""],
      ["Rail under at", Math.round(r.railKt) + "<span class=\"unit\"> kt</span>", railCls],
      ["Heeling moment", (r.M_bal / 1000).toFixed(1) + "<span class=\"unit\"> kN·m</span>", ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markReef(r);
  }

  // mark, under the reef slider, the reef that would sit her in the groove
  function markReef(r) {
    if (!rMark || !rNote) return;
    var best = findReef(state);
    rMark.style.left = (best / (REEFS.length - 1) * 100) + "%";
    rMark.className = "x-mark";
    if (best === state.reef) rNote.innerHTML = "in the groove at <b>" + REEFS[best].name + "</b>";
    else rNote.innerHTML = "groove at <b>" + REEFS[best].name + "</b> for this wind";
  }

  // ---- the stage (canvas) ----------------------------------------------
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

  var WL = 232;                                     // waterline, canvas y
  var RC = { x: 260, y: WL };                        // roll centre, on the water
  var SEA_BOT = 344;                                 // sea band stops above the gauge
  var deckY = -16, mastPx = 186, HOIST0 = 176, FOOT0 = 96;

  // rotate a boat-frame point (heel to leeward = clockwise, +θ) into canvas
  function rot(px, py, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: RC.x + px * c - py * s, y: RC.y + px * s + py * c };
  }

  // eased display state, so a reef reads as the sail coming down and the boat
  // standing up, not as a jump
  var shown = { theta: 0, aFrac: 1, hFrac: 1 };
  var lastTs = null, initShown = false;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), sea: cssVar("--sea"), hull: cssVar("--hull"), hull2: cssVar("--hull-2"),
      canvasCol: cssVar("--canvas"), ballast: cssVar("--ballast"), wind: cssVar("--wind"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"),
      field: cssVar("--field"), field2: cssVar("--field-2")
    };
    var accent = cur.verdict === "groove" ? col.keep
      : cur.verdict === "rail" ? col.dead : col.drift;

    ctx.clearRect(0, 0, W, H);

    var th = shown.theta;
    var hoist = HOIST0 * shown.hFrac;
    var foot = FOOT0 * (shown.aFrac / shown.hFrac);

    // ---- the boat, heeled about the roll centre ----
    ctx.save();
    ctx.translate(RC.x, RC.y);
    ctx.rotate(th);

    // hull cross-section: flat deck on top, rounded canoe body below
    ctx.beginPath();
    ctx.moveTo(-60, deckY);
    ctx.lineTo(-64, 8);
    ctx.quadraticCurveTo(-42, 40, 0, 42);
    ctx.quadraticCurveTo(42, 40, 64, 8);
    ctx.lineTo(60, deckY);
    ctx.closePath();
    ctx.fillStyle = col.hull; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = col.hull2; ctx.stroke();

    // deck line
    ctx.strokeStyle = col.hull2; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-60, deckY); ctx.lineTo(60, deckY); ctx.stroke();

    // keel fin + ballast bulb
    ctx.fillStyle = col.ballast;
    ctx.beginPath();
    ctx.moveTo(-6, 40); ctx.lineTo(6, 40); ctx.lineTo(3, 92); ctx.lineTo(-3, 92);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 94, 15, 7, 0, 0, 2 * Math.PI); ctx.fill();

    // mast
    ctx.strokeStyle = col.ballast; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, deckY); ctx.lineTo(0, deckY - mastPx); ctx.stroke();

    // the sail — a main from the boom, bellied to leeward; area and head both
    // come down as she is reefed
    var head = { x: 0, y: deckY - hoist };
    var tack = { x: 0, y: deckY };
    var clew = { x: foot, y: deckY };
    ctx.beginPath();
    ctx.moveTo(tack.x, tack.y);
    ctx.lineTo(head.x, head.y);
    ctx.quadraticCurveTo(foot * 0.72, deckY - hoist * 0.5, clew.x, clew.y);
    ctx.closePath();
    ctx.fillStyle = withAlpha(col.canvasCol, 0.94); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = col.hull2; ctx.stroke();

    // boom
    ctx.strokeStyle = col.ballast; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-6, deckY); ctx.lineTo(foot, deckY); ctx.stroke();

    // centre of effort
    var ce = { x: foot / 3, y: deckY - hoist / 3 };
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(ce.x, ce.y, 3.4, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = col.field; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ce.x, ce.y, 3.4, 0, 2 * Math.PI); ctx.stroke();

    ctx.restore();

    // ---- the sea, laid over whatever has dipped below the waterline ----
    ctx.fillStyle = withAlpha(col.sea, 0.82);
    ctx.fillRect(0, WL, W, SEA_BOT - WL);
    ctx.strokeStyle = col.sea; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, WL); ctx.lineTo(W, WL); ctx.stroke();
    label(ctx, withAlpha(col.field, 0.9), "waterline", W - 10, WL + 15, "right");

    // ---- the wind, pressing from windward ----
    var force = clamp(state.windKt * 1.7, 14, 78);
    ctx.save();
    [0, 1, 2].forEach(function (i) {
      var y = 58 + i * 46;
      var x0 = 16, x1 = 16 + force;
      arrow(ctx, col.wind, x0, y, x1, y, 2.4, 8);
    });
    ctx.restore();
    label(ctx, col.wind, "wind →", 16, 42, "left");

    // ---- the heel angle, an arc off the upright ----
    var rArc = 150;
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(RC.x, RC.y); ctx.lineTo(RC.x, RC.y - rArc - 12); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(RC.x, RC.y, rArc, -Math.PI / 2, -Math.PI / 2 + th); ctx.stroke();
    var midA = -Math.PI / 2 + th / 2;
    label(ctx, accent, Math.round(cur.thetaDeg) + "°",
      RC.x + Math.cos(midA) * (rArc + 16), RC.y + Math.sin(midA) * (rArc + 16) + 4, "center");

    drawGauge(col, accent, cur);
  }

  function drawGauge(col, accent, cur) {
    // panel floating over the sea
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(28, 356, W - 56, 46, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 60, gx1 = 460, gy = 384;
    var scaleMax = Math.max(cur.thetaMax + 6, 48);
    var xFor = function (d) { return gx0 + clamp(d, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // groove band
    var glo = xFor(cur.grooveLo), ghi = xFor(cur.grooveHi);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(glo, gy - 8, ghi - glo, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(glo, gy - 8, ghi - glo, 16);

    // pressed band, groove to rail
    var gmax = xFor(cur.thetaMax);
    ctx.fillStyle = withAlpha(col.drift, 0.14);
    ctx.fillRect(ghi, gy - 8, gmax - ghi, 16);

    // rail-under wall
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gmax, gy - 12); ctx.lineTo(gmax, gy + 12); ctx.stroke();

    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.fillText("upright", gx0, gy + 22);
    ctx.textAlign = "center"; ctx.fillText("groove", (glo + ghi) / 2, gy - 13);
    ctx.textAlign = "right"; ctx.fillText("rail under", gx1, gy + 22);
    ctx.textAlign = "left";

    // needle at the current heel
    var nx = xFor(cur.thetaDeg), pinned = cur.thetaDeg > scaleMax;
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, gy - 11); ctx.lineTo(nx, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) {
      ctx.beginPath();
      ctx.moveTo(nx + 4, gy - 11); ctx.lineTo(nx + 11, gy - 14); ctx.lineTo(nx + 11, gy - 8);
      ctx.closePath(); ctx.fill();
    }
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
  }
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    var tgt = { theta: current.theta, aFrac: current.aFrac, hFrac: current.hFrac };
    var ease = reduce ? 1 : Math.min(1, dt * 11);
    if (!initShown) { shown.theta = tgt.theta; shown.aFrac = tgt.aFrac; shown.hFrac = tgt.hFrac; initShown = true; }
    shown.theta += (tgt.theta - shown.theta) * ease;
    shown.aFrac += (tgt.aFrac - shown.aFrac) * ease;
    shown.hFrac += (tgt.hFrac - shown.hFrac) * ease;

    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels(current);
    render(current);
    save();
  }

  inW.addEventListener("input", function () { state.windKt = parseInt(inW.value, 10); update(); });
  inR.addEventListener("input", function () { state.reef = parseInt(inR.value, 10); update(); });
  boatBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.boat = b.dataset.boat; update(); });
  });

  $("find").addEventListener("click", function () {
    animateReef(findReef(state));
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.windKt; inR.value = state.reef;
    update();
  });

  // step the reef toward a target so the sail is seen to come down or up a band
  // at a time — under reduced motion it lands in one step
  function animateReef(target) {
    if (reduce || target === state.reef) { state.reef = target; inR.value = target; update(); return; }
    var dir = target > state.reef ? 1 : -1;
    (function step() {
      state.reef += dir; inR.value = state.reef; update();
      if (state.reef !== target) setTimeout(step, 200);
    })();
  }

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // ---- go --------------------------------------------------------------
  inW.value = state.windKt; inR.value = state.reef;
  update();
})();
