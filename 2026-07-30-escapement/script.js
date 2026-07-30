/* Escapement — the bench.
 *
 * A clock is two machines lightly touching. One is a weight paid out slowly
 * through a train of wheels; the other is a pendulum swinging at a rate all its
 * own. They meet at every tick: the escapement lets one tooth of the escape
 * wheel go, locks the next, and in the passing hands the pendulum a small
 * impulse to replace what the air took. The tick is that exchange.
 *
 * The rate belongs to the pendulum, and — to a very good first approximation —
 * to nothing about it but its length:
 *
 *   period  =  2π · √(L / g)                      [small-swing period, seconds]
 *
 * Two corrections matter over a day. A real swing of half-amplitude A (radians)
 * takes a touch longer — the circular error — so driving the clock harder makes
 * it lose a little:
 *
 *   period  ≈  2π · √(L / g) · (1 + A² / 16)
 *
 * And the steel rod grows as the room warms, lengthening L and slowing the beat:
 *
 *   L_eff   =  L · (1 + α · (room − 20°C)),   α_steel ≈ 11.5e-6 / K
 *
 * The movement counts one second per beat and two beats per period, so a true
 * clock wants a period of 2.000 s (the "seconds pendulum", L ≈ 0.994 m). Whatever
 * the real beat comes to, the day's gain or loss falls straight out of it:
 *
 *   gain/day  =  86400 · (1 − beat) / beat            [beat = period / 2, seconds]
 *
 * The swing itself is set by a balance: the escapement pays the pendulum a fixed
 * sliver of the drive each beat, and the pendulum spends it on pallet friction
 * (a floor) and on the air (which grows with the swing). Below the floor the
 * impulse cannot catch the losses and the pendulum coasts to a stop. All SI.
 */
(function () {
  "use strict";

  var G = 9.80665;
  var T_DESIGN = 2.0;        // seconds per period the movement is cut for (1 s/beat)
  var ALPHA = 11.5e-6;       // linear expansion of a steel rod, per kelvin
  var T_REF = 20;            // temperature the length is trimmed at, °C

  // the swing balance (dimensionless energies per beat, tuned for the bench)
  var K_IN = 0.10;           // impulse energy paid per unit drive
  var K_FLOOR = 0.12;        // pallet-friction loss floor per unit drag
  var B_VISC = 1.0;          // air loss ∝ A²
  var A_KNOCK = 0.21;        // half-amplitude (rad) past which the movement knocks
  var A_CAP = 0.28;          // hard ceiling on the drawn swing

  var KEEP_BAND = 30;        // |gain| ≤ this many s/day counts as keeping time

  var ROOM = {
    cold:      { label: "cold",      t: 6  },
    temperate: { label: "temperate", t: 20 },
    warm:      { label: "warm",      t: 30 }
  };

  // Opens on a short pendulum beating fast on a warm afternoon: a clock gaining
  // about half an hour a day. Something to trim true on arrival.
  var DEFAULT = { L: 0.950, D: 55, F: 35, room: "warm" };

  var state = Object.assign({}, DEFAULT);

  // ---- the movement ------------------------------------------------------
  function compute(s) {
    var eIn = K_IN * (s.D / 100);
    var eFloor = K_FLOOR * (s.F / 100);

    var A = 0, dead = true;
    if (eIn > eFloor) {
      A = Math.sqrt((eIn - eFloor) / B_VISC);   // steady half-amplitude, rad
      if (A > A_CAP) A = A_CAP;
      dead = false;
    }
    var knocking = !dead && A >= A_KNOCK;

    var Leff = s.L * (1 + ALPHA * (ROOM[s.room].t - T_REF));
    var T0 = 2 * Math.PI * Math.sqrt(Leff / G);
    var period = T0 * (1 + (A * A) / 16);         // circular-error corrected
    var beat = period / 2;                          // seconds per beat
    var gain = dead ? 0 : 86400 * (1 - beat) / beat; // clock seconds gained per day

    var verdict;
    if (dead) verdict = "dead";
    else if (knocking) verdict = "knock";
    else if (Math.abs(gain) <= KEEP_BAND) verdict = "keep";
    else verdict = "drift";

    return {
      A: A, dead: dead, knocking: knocking,
      Leff: Leff, period: period, beat: beat, gain: gain,
      verdict: verdict
    };
  }

  // length that nulls the rate for the present swing and room
  function trueLength(s) {
    var r = compute(s);
    var A = r.dead ? 0 : r.A;
    var T0_needed = T_DESIGN / (1 + (A * A) / 16);      // small-swing period wanted
    var Leff = G * Math.pow(T0_needed / (2 * Math.PI), 2);
    return Leff / (1 + ALPHA * (ROOM[s.room].t - T_REF));
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inL = $("in-L"), inD = $("in-D"), inF = $("in-F");
  var labL = $("lab-L"), labD = $("lab-D"), labF = $("lab-F");
  var roomBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-room]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");

  function fmtDuration(sec) {
    var s = Math.round(Math.abs(sec));
    if (s >= 3600) { var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h + " h " + m + " min"; }
    if (s >= 60)   { var mm = Math.floor(s / 60), ss = s % 60; return mm + " min " + ss + " s"; }
    return s + " s";
  }

  function syncLabels() {
    labL.textContent = state.L.toFixed(3) + " m";
    labD.textContent = state.D + "%";
    labF.textContent = state.F + "%";
    roomBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.room === state.room));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Stopped",    note: "drive can't sustain the swing" },
    knock: { cls: "v-dead",  word: "Knocking",   note: "over-driven — ease the weight" },
    drift: { cls: "v-drift", word: "Drifting",   note: "the length is off the rate" },
    keep:  { cls: "v-keep",  word: "Keeps time", note: "inside the true band" }
  };

  function render(r) {
    // verdict banner
    var v = VERDICT_TEXT[r.verdict];
    var word = v.word, note = v.note;
    if (r.verdict === "drift") { word = r.gain > 0 ? "Gains" : "Loses"; note = r.gain > 0 ? "running fast" : "running slow"; }
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + word + "</span><small>" + note + "</small>";

    // reading table
    var rateCls = r.dead ? "" : (r.verdict === "keep" ? "good" : (r.knocking ? "bad" : "warn"));
    var gainSign = r.gain > 0 ? "+" : (r.gain < 0 ? "−" : "");
    var rows = [
      ["Half-swing", r.dead ? "—" : (r.A * 180 / Math.PI).toFixed(1) + "<span class=\"unit\"> °</span>", r.knocking ? "bad" : ""],
      ["Period", r.dead ? "—" : r.period.toFixed(4) + "<span class=\"unit\"> s</span>", ""],
      ["Rate", r.dead ? "—" : gainSign + Math.abs(Math.round(r.gain)) + "<span class=\"unit\"> s/day</span>", rateCls],
      ["In 24 h", r.dead ? "—" : fmtDuration(r.gain) + (r.gain >= 0 ? " fast" : " slow"), rateCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas movement) --------------------------------------
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

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  // pivot + geometry
  var PIVOT = { x: 168, y: 54 };
  var WHEEL = { x: 372, y: 150, r: 60, teeth: 15 };
  var DIAL  = { x: 452, y: 66, r: 34 };
  var GAUGE = { x0: 44, x1: 476, y: 372, span: 600 };  // ±600 s/day drawn

  function rodPx(L) { return 150 + (L - 0.7) * (300 / 0.6); }  // 0.7 m→150px … 1.3 m→450? clamp
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // animation clock
  var simT = 0, lastTs = null, beatCount = 0, wheelShown = 0;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      swing: cssVar("--swing"), keep: cssVar("--keep"), drift: cssVar("--drift"),
      dead: cssVar("--dead"), field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);

    ctx.clearRect(0, 0, W, H);

    // ---- pendulum ----
    var rp = clamp(rodPx(state.L), 150, 330);
    var theta = pendTheta(cur);
    // swing guide arc
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(PIVOT.x, PIVOT.y, rp, Math.PI / 2 - cur.A, Math.PI / 2 + cur.A);
    ctx.stroke();
    // rod
    var bx = PIVOT.x + rp * Math.sin(theta);
    var by = PIVOT.y + rp * Math.cos(theta);
    ctx.strokeStyle = col.slate; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y); ctx.lineTo(bx, by); ctx.stroke();
    // suspension
    ctx.fillStyle = col.slate;
    ctx.beginPath(); ctx.arc(PIVOT.x, PIVOT.y, 4, 0, 2 * Math.PI); ctx.fill();
    // bob
    ctx.beginPath(); ctx.arc(bx, by, 16, 0, 2 * Math.PI);
    ctx.fillStyle = col.brass; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = col.field; ctx.stroke();
    // rating bead: a mark on the bob so length reads at a glance
    ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, 2 * Math.PI); ctx.strokeStyle = col.field; ctx.lineWidth = 1.2; ctx.stroke();

    // ---- escape wheel ----
    drawEscapeWheel(col, cur);
    // ---- anchor / pallets ----
    drawAnchor(col, theta, cur);

    // ---- seconds dial ----
    drawDial(col, accent);

    // ---- rate gauge ----
    drawGauge(col, accent, cur);
  }

  function pendTheta(cur) {
    if (cur.dead) return 0;
    if (reduce) return cur.A * 0.62;                     // frozen, mid-swing
    return cur.A * Math.sin(2 * Math.PI * simT / cur.period);
  }

  function drawEscapeWheel(col, cur) {
    var rot = wheelShown;
    ctx.save();
    ctx.translate(WHEEL.x, WHEEL.y);
    ctx.rotate(rot);
    // rim
    ctx.beginPath(); ctx.arc(0, 0, WHEEL.r - 8, 0, 2 * Math.PI);
    ctx.strokeStyle = col.slate; ctx.lineWidth = 1.6; ctx.stroke();
    // teeth (ratchet-faced)
    ctx.beginPath();
    for (var i = 0; i < WHEEL.teeth; i++) {
      var a0 = (i / WHEEL.teeth) * 2 * Math.PI;
      var a1 = ((i + 0.55) / WHEEL.teeth) * 2 * Math.PI;
      var rIn = WHEEL.r - 8, rOut = WHEEL.r;
      var x0 = rIn * Math.cos(a0), y0 = rIn * Math.sin(a0);
      var xt = rOut * Math.cos(a0), yt = rOut * Math.sin(a0);
      var x1 = rIn * Math.cos(a1), y1 = rIn * Math.sin(a1);
      if (i === 0) ctx.moveTo(x0, y0); else ctx.lineTo(x0, y0);
      ctx.lineTo(xt, yt); ctx.lineTo(x1, y1);
    }
    ctx.closePath();
    ctx.strokeStyle = col.slate; ctx.lineWidth = 1.4; ctx.stroke();
    // hub + arms
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, 2 * Math.PI); ctx.fillStyle = col.slate; ctx.fill();
    for (var k = 0; k < 5; k++) {
      var aa = (k / 5) * 2 * Math.PI;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo((WHEEL.r - 9) * Math.cos(aa), (WHEEL.r - 9) * Math.sin(aa));
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  function drawAnchor(col, theta, cur) {
    // anchor pivots above the wheel and rocks with the pendulum
    var ax = WHEEL.x, ay = WHEEL.y - WHEEL.r - 20;
    var rock = cur.dead ? 0 : clamp(theta * 0.9, -0.12, 0.12);
    ctx.save();
    ctx.translate(ax, ay); ctx.rotate(rock);
    ctx.strokeStyle = col.brass; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-26, 4); ctx.lineTo(-6, 14); ctx.lineTo(0, 6);
    ctx.lineTo(6, 14); ctx.lineTo(26, 4);
    ctx.stroke();
    // pallet stones
    ctx.fillStyle = col.brass;
    ctx.beginPath(); ctx.arc(-24, 6, 2.4, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(24, 6, 2.4, 0, 2 * Math.PI); ctx.fill();
    // pivot
    ctx.fillStyle = col.slate;
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
  }

  function drawDial(col, accent) {
    ctx.save();
    ctx.translate(DIAL.x, DIAL.y);
    ctx.beginPath(); ctx.arc(0, 0, DIAL.r, 0, 2 * Math.PI);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1.4; ctx.stroke();
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * 2 * Math.PI;
      var r0 = DIAL.r - (i % 3 === 0 ? 7 : 4);
      ctx.beginPath();
      ctx.moveTo(r0 * Math.sin(a), -r0 * Math.cos(a));
      ctx.lineTo((DIAL.r - 2) * Math.sin(a), -(DIAL.r - 2) * Math.cos(a));
      ctx.strokeStyle = i % 3 === 0 ? col.soft : col.rule; ctx.lineWidth = 1.2; ctx.stroke();
    }
    // seconds hand steps once per beat
    var ang = (beatCount % 60) / 60 * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, 4); ctx.lineTo((DIAL.r - 8) * Math.sin(ang), -(DIAL.r - 8) * Math.cos(ang));
    ctx.strokeStyle = accent; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, 2 * Math.PI); ctx.fillStyle = col.soft; ctx.fill();
    ctx.restore();
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE, midY = g.y;
    // baseline
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, midY); ctx.lineTo(g.x1, midY); ctx.stroke();
    var xFor = function (val) {
      var c = clamp(val, -g.span, g.span);
      return g.x0 + (c + g.span) / (2 * g.span) * (g.x1 - g.x0);
    };
    // true band
    var bx0 = xFor(-KEEP_BAND), bx1 = xFor(KEEP_BAND);
    ctx.fillStyle = withAlpha(col.keep, 0.20);
    ctx.fillRect(bx0, midY - 9, bx1 - bx0, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(bx0, midY - 9, bx1 - bx0, 18);
    // ticks + labels
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [-600, -300, 0, 300, 600].forEach(function (t) {
      var x = xFor(t);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, midY + 10); ctx.lineTo(x, midY + 14); ctx.stroke();
      ctx.fillText(t === 0 ? "true" : (t > 0 ? "+" + t : String(t)), x, midY + 26);
    });
    ctx.textAlign = "left"; ctx.fillStyle = col.faint;
    ctx.fillText("slow", g.x0, midY - 16);
    ctx.textAlign = "right"; ctx.fillText("fast", g.x1, midY - 16);
    ctx.textAlign = "left";
    // needle
    if (!cur.dead) {
      var pinned = Math.abs(cur.gain) > g.span;
      var nx = xFor(cur.gain);
      ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(nx, midY - 12); ctx.lineTo(nx, midY + 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(nx, midY - 12, 3, 0, 2 * Math.PI); ctx.fill();
      if (pinned) {
        var dir = cur.gain > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(nx + dir * 4, midY - 12);
        ctx.lineTo(nx + dir * 11, midY - 15);
        ctx.lineTo(nx + dir * 11, midY - 9);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  function withAlpha(c, a) {
    // accepts #rrggbb or rgb(...); falls back to the colour itself
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  // ---- loop --------------------------------------------------------------
  var current = compute(state);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (!current.dead && !reduce) {
      simT += dt;
      var beats = Math.floor(simT / current.beat);
      if (beats !== beatCount) beatCount = beats;
    }
    // escape wheel target: one tooth-step per beat
    var step = (2 * Math.PI) / WHEEL.teeth;
    var target = beatCount * step;
    var ease = Math.min(1, dt * 16);
    wheelShown += (target - wheelShown) * ease;

    draw(current);
    raf = window.requestAnimationFrame(frame);
  }
  var raf = window.requestAnimationFrame(frame);

  // ---- wiring ------------------------------------------------------------
  function update(opts) {
    current = compute(state);
    // a changed period should not make the pendulum jump; keep phase continuous
    if (opts && opts.resyncPhase) { simT = 0; beatCount = 0; }
    syncLabels();
    render(current);
  }

  inL.addEventListener("input", function () { state.L = parseFloat(inL.value); update(); });
  inD.addEventListener("input", function () { state.D = parseInt(inD.value, 10); update({ resyncPhase: true }); });
  inF.addEventListener("input", function () { state.F = parseInt(inF.value, 10); update({ resyncPhase: true }); });
  roomBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.room = b.dataset.room; update(); });
  });

  $("regulate").addEventListener("click", function () {
    var target = clamp(trueLength(state), 0.7, 1.3);
    animateLength(target);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inL.value = state.L; inD.value = state.D; inF.value = state.F;
    update({ resyncPhase: true });
  });

  // ease the bob to a trimmed length so the trim reads as a motion, not a jump
  function animateLength(target) {
    var start = state.L, t0 = null, dur = 520;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      state.L = start + (target - start) * e;
      inL.value = state.L.toFixed(3);
      update();
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // ---- go ----------------------------------------------------------------
  inL.value = state.L; inD.value = state.D; inF.value = state.F;
  update();
})();
