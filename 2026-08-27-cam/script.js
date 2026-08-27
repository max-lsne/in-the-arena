/* Cam — a bench for the shape that stores a motion. The follower's whole schedule of
 * rise, dwell, return and dwell is written into the cam's radius, R(θ) = R_base + s(θ),
 * and read off once per turn. In the arena, 2026-08-27.
 *
 * The lift s(θ) is the easy part; the follower feels the second derivative, the
 * acceleration a = ω²·s''(θ), and so the force. Three laws share the skeleton
 * v ~ h·ω/β and a ~ h·ω²/β² but differ utterly at the corners:
 *
 *   constant velocity  s = h·(θ/β)                 — v steps at the ends, a is impulsive (∞)
 *   simple harmonic    s = (h/2)(1 − cos πθ/β)     — a is bounded but STEPS at the dwells (∞ jerk)
 *   cycloidal          s = h(θ/β − sin(2πθ/β)/2π)  — a eases to zero at both ends, jerk finite
 *
 * Peak factors (a_max = C_a·h·ω²/β², v_max = C_v·h·ω/β):
 *   C_v = [1, π/2, 2]              C_a = [∞, π²/2, 2π]
 * The cycloidal law has the LARGEST peak acceleration of the three and is still the one
 * that runs smooth — it wins by never stepping the acceleration, not by pushing less.
 *
 * Units: the geometry is built in world units (base radius R_base = 30, lift h in the
 * same units) and fitted into the SVG by one scale S sized for the tallest lift, so
 * changing the lift does not rescale the drawing. Below the cam, the displacement
 * diagram plots s, the velocity factor s'·(β/h) and the acceleration factor s''·(β²/h)
 * against cam angle — shapes fixed by the law; the magnitudes, in the readout, scale
 * as 1/β².
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var VBW = 640, VBH = 500;

  var LAW_MIN = 0, LAW_MAX = 2;
  var BETA_MIN = 40, BETA_MAX = 150;         // rise angle, degrees
  var LIFT_MIN = 8, LIFT_MAX = 30;           // lift, world units
  var R_BASE = 30;                           // base-circle radius, world units (fixed)
  var TURN_RATE = 66;                        // cam spin, degrees per second

  var LAW_NAMES = ["constant velocity", "simple harmonic", "cycloidal"];
  var DEFAULTS = { law: 2, beta: 90, lift: 18 };
  var STORE_KEY = "arena.cam.v1";

  var state = { law: DEFAULTS.law, beta: DEFAULTS.beta, lift: DEFAULTS.lift };
  var rotDeg = 0;                            // cam rotation (degrees)

  // ---- cam / follower box (viewBox units) ----
  var CX = 320, CY = 182;                    // cam centre
  var R_PIX = 120;                           // pixel budget for the largest profile radius + rim band
  var S = R_PIX / (R_BASE + LIFT_MAX + 8);   // world→pixel scale, sized for the tallest lift
  var GUIDE_Y = 42;                          // follower guide, top of the frame

  // ---- displacement diagram box ----
  var PX0 = 70, PX1 = 600;                   // angle axis, 0°→360°
  var LANES = {
    s: { top: 334, zero: 372, bot: 372, amp: 38, scale: LIFT_MAX, label: "s" },   // lift: 0 at bottom
    v: { top: 382, zero: 403, bot: 424, amp: 21, scale: 2.2, label: "v" },        // velocity: ± about zero
    a: { top: 432, zero: 456, bot: 480, amp: 24, scale: 7.0, label: "a" }         // acceleration: ± about zero
  };

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var lawRange = document.getElementById("lawRange");
  var betaRange = document.getElementById("betaRange");
  var liftRange = document.getElementById("liftRange");
  var runBtn = document.getElementById("runBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    big: document.getElementById("readBig"),
    cap: document.getElementById("readCap"),
    eq: document.getElementById("rbEq"),
    law: document.getElementById("rfLaw"),
    beta: document.getElementById("rfBeta"),
    lift: document.getElementById("rfLift"),
    vpk: document.getElementById("rfVpk"),
    apk: document.getElementById("rfApk"),
    jerk: document.getElementById("rfJerk"),
    lawVal: document.getElementById("lawVal"),
    betaVal: document.getElementById("betaVal"),
    liftVal: document.getElementById("liftVal"),
    status: document.getElementById("status")
  };

  // ---- small helpers ----
  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]); }
    return node;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function add(node) { svg.appendChild(node); return node; }
  function rad(d) { return d * Math.PI / 180; }
  function pt(cx, cy, r, aDeg) { var a = rad(aDeg); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function label(x, y, anchor, text, cls) {
    var t = make("text", { x: x, y: y, "text-anchor": anchor, class: cls || "lane-tick" });
    t.textContent = text;
    return add(t);
  }

  // Keep the bench as you left it, across visits — the law, the rise angle and the lift.
  // Reset still puts them all back to the nominal cycloidal cam.
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ law: state.law, beta: state.beta, lift: state.lift }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s.law === "number" && isFinite(s.law)) state.law = clamp(Math.round(s.law), LAW_MIN, LAW_MAX);
      if (s && typeof s.beta === "number" && isFinite(s.beta)) state.beta = clamp(Math.round(s.beta / 5) * 5, BETA_MIN, BETA_MAX);
      if (s && typeof s.lift === "number" && isFinite(s.lift)) state.lift = clamp(Math.round(s.lift), LIFT_MIN, LIFT_MAX);
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }

  // ---- the motion laws, on u ∈ [0,1] ----
  function fPos(u, law) {
    if (law === 0) return u;
    if (law === 1) return 0.5 * (1 - Math.cos(Math.PI * u));
    return u - Math.sin(2 * Math.PI * u) / (2 * Math.PI);
  }
  function fVel(u, law) {                        // s'(u), the velocity-factor shape
    if (law === 0) return 1;
    if (law === 1) return (Math.PI / 2) * Math.sin(Math.PI * u);
    return 1 - Math.cos(2 * Math.PI * u);
  }
  function fAcc(u, law) {                        // s''(u), the acceleration-factor shape
    if (law === 0) return 0;                     // impulses at the ends, drawn separately
    if (law === 1) return (Math.PI * Math.PI / 2) * Math.cos(Math.PI * u);
    return 2 * Math.PI * Math.sin(2 * Math.PI * u);
  }

  // The full dwell–rise–dwell–return schedule around the turn. Rise over β, held to 180°,
  // returned over β, held to 360°; the two dwells each get 180° − β.
  function schedule(thetaDeg) {
    var b = state.beta, h = state.lift, law = state.law;
    var th = ((thetaDeg % 360) + 360) % 360;
    if (th < b) {                                // rise
      var u = th / b;
      return { s: h * fPos(u, law), v: fVel(u, law), a: fAcc(u, law) };
    }
    if (th < 180) return { s: h, v: 0, a: 0 };   // high dwell
    if (th < 180 + b) {                          // return (mirror of the rise)
      var ur = (th - 180) / b;
      return { s: h * fPos(1 - ur, law), v: -fVel(1 - ur, law), a: fAcc(1 - ur, law) };
    }
    return { s: 0, v: 0, a: 0 };                 // low dwell
  }

  // peak factors — C_v = v_max·β/(h·ω), C_a = a_max·β²/(h·ω²)
  function peakV() { return [1, Math.PI / 2, 2][state.law]; }
  function peakA() { return [Infinity, Math.PI * Math.PI / 2, 2 * Math.PI][state.law]; }
  function jerkFinite() { return state.law === 2; }

  // ---- world angle of a schedule angle ψ, given the current rotation ----
  // The reference mark (ψ = 0, the start of rise) sits at the top when rotDeg = 0; as the
  // cam turns, the point whose schedule angle equals rotDeg comes under the follower.
  function worldAngle(psiDeg) { return -90 + (psiDeg - rotDeg); }

  // ---- drawing ----
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    add(make("rect", { x: 4, y: 4, width: VBW - 8, height: VBH - 8, rx: 14, class: "svg-frame" }));
    drawCam();
    drawFollower();
    drawDiagram();
  }

  function arc(cx, cy, r, a0, a1, cls) {
    var p0 = pt(cx, cy, r, a0), p1 = pt(cx, cy, r, a1);
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    var sweep = a1 > a0 ? 1 : 0;
    return add(make("path", {
      d: "M " + p0[0].toFixed(1) + " " + p0[1].toFixed(1) +
         " A " + r.toFixed(1) + " " + r.toFixed(1) + " 0 " + large + " " + sweep + " " +
         p1[0].toFixed(1) + " " + p1[1].toFixed(1),
      class: cls
    }));
  }

  function drawCam() {
    // base circle and prime circle (base + full lift)
    add(make("circle", { cx: CX, cy: CY, r: (R_BASE * S).toFixed(1), class: "base-circle" }));
    add(make("circle", { cx: CX, cy: CY, r: ((R_BASE + state.lift) * S).toFixed(1), class: "prime-circle" }));

    // the cam profile, R(ψ) = (R_base + s(ψ)) rotated by rotDeg
    var pts = [], i, r, w, p;
    for (i = 0; i <= 360; i++) {
      r = (R_BASE + schedule(i).s) * S;
      w = worldAngle(i);
      p = pt(CX, CY, r, w);
      pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
    }
    add(make("path", { d: "M " + pts.join(" L ") + " Z", class: "cam-body" }));

    // the schedule sectors, banded on the rim and turning with the cam
    var rb = (R_BASE + LIFT_MAX + 6) * S, b = state.beta;
    arc(CX, CY, rb, worldAngle(0), worldAngle(b), "sector-rise");
    arc(CX, CY, rb, worldAngle(b), worldAngle(180), "sector-dwell");
    arc(CX, CY, rb, worldAngle(180), worldAngle(180 + b), "sector-return");
    arc(CX, CY, rb, worldAngle(180 + b), worldAngle(360), "sector-dwell");

    // reference notch at ψ = 0 and the hub
    var n0 = pt(CX, CY, (R_BASE - 6) * S, worldAngle(0));
    var n1 = pt(CX, CY, rb + 5, worldAngle(0));
    add(make("line", { x1: n0[0].toFixed(1), y1: n0[1].toFixed(1), x2: n1[0].toFixed(1), y2: n1[1].toFixed(1), class: "ref-notch" }));
    add(make("circle", { cx: CX, cy: CY, r: (R_BASE * S * 0.34).toFixed(1), class: "shaft-hub" }));
    add(make("circle", { cx: CX, cy: CY, r: 3.6, class: "cam-centre" }));

    // radial line from centre to the contact point at the top
    var top = CY - (R_BASE + schedule(rotDeg).s) * S;
    add(make("line", { x1: CX, y1: CY, x2: CX, y2: top.toFixed(1), class: "angle-mark" }));
  }

  function drawFollower() {
    var lift = schedule(rotDeg).s;
    var tipY = CY - (R_BASE + lift) * S;

    // guide channel at the top of the frame
    add(make("rect", { x: CX - 13, y: GUIDE_Y - 8, width: 26, height: 20, rx: 3, class: "follower-guide" }));
    // stem from the guide down to the tip
    add(make("line", { x1: CX, y1: GUIDE_Y + 12, x2: CX, y2: tipY.toFixed(1), class: "follower-stem" }));
    // knife-edge / roller tip riding the profile
    add(make("circle", { cx: CX, cy: tipY.toFixed(1), r: 5, class: "follower-tip" }));

    // a faint tie from the tip across to the base circle, marking the lift
    var baseTop = CY - R_BASE * S;
    add(make("line", { x1: CX + 8, y1: tipY.toFixed(1), x2: CX + 8, y2: baseTop.toFixed(1), class: "contact-line" }));
    label(CX + 13, (tipY + baseTop) / 2 + 3, "start",
      "s = " + (lift / R_BASE).toFixed(2) + "·r_b", "lift-cap");
  }

  // ---- the displacement diagram ----
  function xForTheta(th) { return PX0 + (th / 360) * (PX1 - PX0); }
  function yInLane(lane, factor) { return lane.zero - (factor / lane.scale) * lane.amp; }

  function drawDiagram() {
    var b = state.beta;
    // shaded rise / return bands across all three lanes
    var bandTop = LANES.s.top - 4, bandBot = LANES.a.bot + 4;
    function band(th0, th1, cls) {
      var x0 = xForTheta(th0), x1 = xForTheta(th1);
      add(make("rect", { x: x0.toFixed(1), y: bandTop, width: (x1 - x0).toFixed(1), height: bandBot - bandTop, class: cls }));
    }
    band(0, b, "lane-band-rise");
    band(180, 180 + b, "lane-band-return");

    // phase dividers
    [b, 180, 180 + b].forEach(function (th) {
      var x = xForTheta(th);
      add(make("line", { x1: x, y1: bandTop, x2: x, y2: bandBot, class: "lane-div" }));
    });

    drawLiftLane();
    drawFactorLane(LANES.v, "v", "plot-vel");
    drawAccelLane();
    drawAngleTicks(bandBot);
    drawCursor(bandTop, bandBot);
  }

  function laneFrameAndZero(lane, withZero) {
    add(make("rect", { x: PX0, y: lane.top, width: PX1 - PX0, height: lane.bot - lane.top, rx: 5, class: "lane-frame" }));
    if (withZero) add(make("line", { x1: PX0, y1: lane.zero, x2: PX1, y2: lane.zero, class: "lane-zero" }));
    label(PX0 - 8, lane.zero + 4, "end", lane.label, "lane-label");
  }

  function drawLiftLane() {
    var lane = LANES.s;
    laneFrameAndZero(lane, false);
    var pts = [], i, sm;
    for (i = 0; i <= 360; i++) {
      sm = schedule(i).s;
      pts.push(xForTheta(i).toFixed(1) + "," + yInLane(lane, sm).toFixed(1));
    }
    add(make("polyline", { points: pts.join(" "), class: "plot-lift" }));
    label(PX1 - 4, lane.top + 12, "end", "lift", "lane-tick");
  }

  function drawFactorLane(lane, key, cls) {
    laneFrameAndZero(lane, true);
    var pts = [], i, f;
    for (i = 0; i <= 360; i++) {
      f = schedule(i)[key];
      pts.push(xForTheta(i).toFixed(1) + "," + clamp(yInLane(lane, f), lane.top, lane.bot).toFixed(1));
    }
    add(make("polyline", { points: pts.join(" "), class: cls }));
    label(PX1 - 4, lane.top + 12, "end", "velocity", "lane-tick");
  }

  function drawAccelLane() {
    var lane = LANES.a;
    laneFrameAndZero(lane, true);

    if (state.law === 0) {
      // constant velocity: acceleration is zero between the corners and impulsive at them
      add(make("line", { x1: PX0, y1: lane.zero, x2: PX1, y2: lane.zero, class: "plot-accel shock" }));
      spike(0, +1); spike(state.beta, -1); spike(180, -1); spike(180 + state.beta, +1);
      label(PX1 - 4, lane.top + 12, "end", "accel · impulses ∞", "shock-cap");
      return;
    }

    var smooth = state.law === 2;
    var pts = [], i, f;
    for (i = 0; i <= 360; i++) {
      f = schedule(i).a;
      pts.push(xForTheta(i).toFixed(1) + "," + clamp(yInLane(lane, f), lane.top, lane.bot).toFixed(1));
    }
    add(make("polyline", { points: pts.join(" "), class: "plot-accel " + (smooth ? "smooth" : "shock") }));
    label(PX1 - 4, lane.top + 12, "end",
      smooth ? "accel · eased to zero" : "accel · steps ∞ jerk", smooth ? "lane-tick" : "shock-cap");
  }

  // an impulse marker: an arrow from the zero line off the top (dir +1) or bottom (dir −1)
  function spike(th, dir) {
    var lane = LANES.a, x = xForTheta(th);
    var yEnd = dir > 0 ? lane.top + 2 : lane.bot - 2;
    add(make("line", { x1: x, y1: lane.zero, x2: x, y2: yEnd, class: "shock-spike" }));
    var hy = dir > 0 ? yEnd + 6 : yEnd - 6;
    add(make("path", {
      d: "M " + x + " " + yEnd + " L " + (x - 3.4) + " " + hy + " L " + (x + 3.4) + " " + hy + " Z",
      class: "shock-head"
    }));
  }

  function drawAngleTicks(bandBot) {
    [0, 90, 180, 270, 360].forEach(function (th) {
      label(xForTheta(th), bandBot + 13, "middle", th + "°", "lane-tick");
    });
    label(xForTheta(state.beta / 2), LANES.s.top - 7, "middle", "rise", "sector-cap");
    label(xForTheta(180 + state.beta / 2), LANES.s.top - 7, "middle", "return", "sector-cap");
  }

  function drawCursor(top, bot) {
    var th = ((rotDeg % 360) + 360) % 360, x = xForTheta(th);
    add(make("line", { x1: x.toFixed(1), y1: top, x2: x.toFixed(1), y2: bot, class: "cursor-line" }));
    var sm = schedule(th).s;
    add(make("circle", { cx: x.toFixed(1), cy: yInLane(LANES.s, sm).toFixed(1), r: 3.6, class: "cursor-dot" }));
  }

  // ---- readout ----
  function fmt(x) { return x === Infinity ? "∞" : x.toFixed(2); }
  function accelFormula() {
    if (state.law === 0) return "a_max → ∞   (an impulse)";
    if (state.law === 1) return "a_max = (π²⁄2) · h·ω² ⁄ β²";
    return "a_max = 2π · h·ω² ⁄ β²";
  }
  function paint() {
    el.big.textContent = fmt(peakA());
    el.eq.textContent = accelFormula();
    el.law.textContent = LAW_NAMES[state.law];
    el.beta.textContent = state.beta + "°";
    el.lift.textContent = (state.lift / R_BASE).toFixed(2);
    el.vpk.textContent = fmt(peakV());
    el.apk.textContent = fmt(peakA());
    el.jerk.textContent = jerkFinite() ? "finite" : "infinite";

    el.lawVal.textContent = LAW_NAMES[state.law];
    el.betaVal.textContent = state.beta + "°";
    el.liftVal.textContent = (state.lift / R_BASE).toFixed(2) + " × base";
  }

  function setStatus() {
    if (!el.status) return;
    var law = LAW_NAMES[state.law];
    var msg;
    if (state.law === 0) {
      msg = "Constant-velocity rise over " + state.beta + "°: the follower leaps from rest to full " +
        "speed, so the acceleration is a pair of impulses — infinite. Unrunnable at any speed.";
    } else if (state.law === 1) {
      msg = "Simple-harmonic rise over " + state.beta + "°: peak acceleration factor " +
        peakA().toFixed(2) + ", but the acceleration steps to the dwell's zero at each junction — " +
        "an infinite jerk, and the follower rings.";
    } else {
      msg = "Cycloidal rise over " + state.beta + "°: peak acceleration factor " + peakA().toFixed(2) +
        " — the highest of the three — yet the acceleration eases to zero at both ends, the jerk stays " +
        "finite, and it runs smooth.";
    }
    el.status.textContent = msg;
  }

  function render() {
    draw();
    paint();
    setStatus();
    save();
  }

  // ---- the Turn animation ----
  var raf = null, lastTs = 0;
  function setRunning(on) {
    runBtn.setAttribute("aria-pressed", on ? "true" : "false");
    runBtn.textContent = on ? "Stop" : "Turn";
  }
  function stop() {
    if (raf) { window.cancelAnimationFrame(raf); raf = null; }
    setRunning(false);
  }
  function start() {
    if (raf) return;
    lastTs = 0;
    setRunning(true);
    raf = window.requestAnimationFrame(step);
  }
  function step(ts) {
    if (!lastTs) lastTs = ts;
    var dt = (ts - lastTs) / 1000; lastTs = ts;
    rotDeg = (rotDeg + TURN_RATE * dt) % 360;
    draw();
    raf = window.requestAnimationFrame(step);
  }

  // ---- control wiring ----
  function setLaw(v) {
    state.law = clamp(Math.round(v), LAW_MIN, LAW_MAX);
    if (lawRange.value !== String(state.law)) lawRange.value = String(state.law);
    render();
  }
  function setBeta(v) {
    state.beta = clamp(Math.round(v / 5) * 5, BETA_MIN, BETA_MAX);
    if (betaRange.value !== String(state.beta)) betaRange.value = String(state.beta);
    render();
  }
  function setLift(v) {
    state.lift = clamp(Math.round(v), LIFT_MIN, LIFT_MAX);
    if (liftRange.value !== String(state.lift)) liftRange.value = String(state.lift);
    render();
  }

  lawRange.addEventListener("input", function () { setLaw(parseFloat(lawRange.value)); });
  betaRange.addEventListener("input", function () { setBeta(parseFloat(betaRange.value)); });
  liftRange.addEventListener("input", function () { setLift(parseFloat(liftRange.value)); });

  runBtn.addEventListener("click", function () { if (raf) stop(); else start(); });
  function doReset() {
    stop();
    rotDeg = 0;
    setLaw(DEFAULTS.law); setBeta(DEFAULTS.beta); setLift(DEFAULTS.lift);
  }
  resetBtn.addEventListener("click", doReset);

  // ---- boot ----
  lawRange.min = LAW_MIN; lawRange.max = LAW_MAX;
  betaRange.min = BETA_MIN; betaRange.max = BETA_MAX;
  liftRange.min = LIFT_MIN; liftRange.max = LIFT_MAX;
  restore();
  setLaw(state.law); setBeta(state.beta); setLift(state.lift);
})();
