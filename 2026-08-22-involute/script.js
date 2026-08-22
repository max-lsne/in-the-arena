/* Involute — a bench for the tooth-curve that hands rotation between two gears at a
 * perfectly constant ratio, and holds that ratio even when the centres are pulled
 * apart. In the arena, 2026-08-22.
 *
 * Give each wheel a base circle — r_b1 in the driver, r_b2 in the driven — and cut
 * every flank as the involute of that circle (the path a taut string draws unwinding
 * from it). An involute's string is always tangent to the base circle and normal to
 * the flank, so where two such teeth touch, the common normal is tangent to BOTH base
 * circles at once. There is exactly one such line, the line of action; contact slides
 * along it and nowhere else. The base circles then set the drive:
 *     ω1 · r_b1 = ω2 · r_b2   ⇒   ω1 / ω2 = r_b2 / r_b1 = N2 / N1,
 * a constant. And because the base circles are cut once and never move, the ratio is
 * immune to the centre distance C: spread the wheels and the operating pressure angle
 * opens as cos φ = (r_b1 + r_b2) / C, the pitch circles swell, backlash grows — but
 * r_b1/r_b2, and so the ratio, do not stir. That tolerance is why the involute beat
 * the cycloid and runs almost every gear made.
 *
 * Units: geometry is built in module units (module = 1), then fitted into the SVG by a
 * single scale S so the whole mesh sits in frame at full spread. The driver is fixed
 * at N1 = 12 teeth; the driven count N2, the generating pressure angle φ and the centre
 * distance C are the three controls.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // viewBox — the mesh up top, a ratio-and-angle plot along the foot
  var VBW = 640, VBH = 470;

  var TEETH_MIN = 12, TEETH_MAX = 42;       // driven tooth count N2
  var PHI_MIN = 145, PHI_MAX = 270;         // generating pressure angle, degrees ×10
  var CENTRE_MIN = 100, CENTRE_MAX = 112;   // centre distance, percent of nominal

  var N1 = 12;                              // the driver, fixed
  var SPREAD_MS = 2600;                     // sweep time for the centre-spread demo
  var TURN_RATE = 0.9;                      // driver spin, radians per second

  var DEFAULTS = { teeth: 24, phi: 200, centre: 100 };
  var STORE_KEY = "arena.involute.v1";

  // mechanism box (viewBox units); the plot lives below it
  var MX0 = 44, MX1 = 598, GY_TOP = 34, GY_BOT = 322;
  var PX0 = 70, PX1 = 596, PY_TOP = 360, PY_BOT = 452;
  var V_LO = 0.85, V_HI = 1.78;             // plot y range, in × of nominal

  var state = { teeth: DEFAULTS.teeth, phi: DEFAULTS.phi, centre: DEFAULTS.centre };
  var rot1 = 0;                             // driver rotation (radians)

  // Motion preference — a reader who asks for less motion gets no spinning mesh and no
  // centre-spread sweep: Turn steps the wheels one tooth at a time, and Spread jumps
  // straight to its target. Re-checked live, so toggling the system setting takes
  // effect without a reload.
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOff() { return !!(reduceMQ && reduceMQ.matches); }

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var teethRange = document.getElementById("teethRange");
  var phiRange = document.getElementById("phiRange");
  var centreRange = document.getElementById("centreRange");
  var runBtn = document.getElementById("runBtn");
  var spreadBtn = document.getElementById("spreadBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    big: document.getElementById("readBig"),
    cap: document.getElementById("readCap"),
    eq: document.getElementById("rbEq"),
    teeth: document.getElementById("rfTeeth"),
    phi: document.getElementById("rfPhi"),
    centre: document.getElementById("rfCentre"),
    pitch: document.getElementById("rfPitch"),
    base: document.getElementById("rfBase"),
    drift: document.getElementById("rfDrift"),
    teethVal: document.getElementById("teethVal"),
    phiVal: document.getElementById("phiVal"),
    centreVal: document.getElementById("centreVal"),
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
  function inv(a) { return Math.tan(a) - a; }                 // involute function

  // Keep the bench as you left it, across visits — the driven tooth count and the
  // pressure angle, but not the centre distance: a page should open at the snug
  // nominal spacing with the ratio held, not mid-demonstration with the wheels
  // already pulled apart.
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ teeth: state.teeth, phi: state.phi }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s.teeth === "number" && isFinite(s.teeth)) state.teeth = clamp(Math.round(s.teeth), TEETH_MIN, TEETH_MAX);
      if (s && typeof s.phi === "number" && isFinite(s.phi)) state.phi = clamp(Math.round(s.phi / 5) * 5, PHI_MIN, PHI_MAX);
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }

  function label(x, y, anchor, text, cls) {
    var t = make("text", { x: x, y: y, "text-anchor": anchor, class: cls || "plot-tick" });
    t.textContent = text;
    return add(t);
  }

  // ---- the geometry, all from N2, φ and C ----
  function geom() {
    var N2 = state.teeth;
    var phiGen = (state.phi / 10) * Math.PI / 180;
    var f = state.centre / 100;

    var rp1 = N1 / 2, rp2 = N2 / 2;                     // nominal pitch radii (module = 1)
    var rb1 = rp1 * Math.cos(phiGen), rb2 = rp2 * Math.cos(phiGen);
    var ra1 = rp1 + 1, ra2 = rp2 + 1;                   // addendum circles (cut at nominal)
    var rf1 = Math.max(rp1 - 1.25, 0.45), rf2 = rp2 - 1.25;

    var C0 = rp1 + rp2;                                 // nominal centre distance
    var C = C0 * f;                                     // operating centre distance
    var phiOp = Math.acos(clamp((rb1 + rb2) / C, -1, 1));
    var rpo1 = rb1 / Math.cos(phiOp), rpo2 = rb2 / Math.cos(phiOp); // operating pitch radii

    return {
      N2: N2, phiGen: phiGen, f: f, C0: C0, C: C, phiOp: phiOp,
      rp1: rp1, rp2: rp2, rb1: rb1, rb2: rb2, ra1: ra1, ra2: ra2,
      rf1: rf1, rf2: rf2, rpo1: rpo1, rpo2: rpo2,
      ratio: N2 / N1
    };
  }

  // Fit the mesh into the box using the widest case (full spread) so that spreading
  // the centres slides the wheels apart without rescaling the whole drawing.
  function layout(g) {
    var Cmax = g.C0 * (CENTRE_MAX / 100);
    var worldW = g.ra1 + Cmax + g.ra2;
    var worldH = 2 * Math.max(g.ra1, g.ra2);
    var availW = (MX1 - MX0) - 12, availH = (GY_BOT - GY_TOP) - 12;
    var S = Math.min(availW / worldW, availH / worldH);
    var cx1 = MX0 + 6 + g.ra1 * S;
    var cy = (GY_TOP + GY_BOT) / 2;
    var cx2 = cx1 + g.C * S;
    return { S: S, cx1: cx1, cx2: cx2, cy: cy };
  }

  // ---- one involute gear, drawn as a single closed path ----
  function gearPath(cx, cy, rb, rp, ra, rf, N, phiGen, rot) {
    var step = 2 * Math.PI / N;
    var halfTh = 0.90 * (Math.PI / (2 * N));            // half tooth thickness + a little backlash
    var invPhi = inv(phiGen);
    var aTip = Math.acos(clamp(rb / ra, -1, 1));        // involute roll angle at the tip
    var NF = 6, NT = 3, NR = 2;
    var pts = [];
    function pol(ang, r) { return (cx + r * Math.cos(ang)).toFixed(1) + "," + (cy + r * Math.sin(ang)).toFixed(1); }

    for (var k = 0; k < N; k++) {
      var tc = rot + k * step;
      var baseLow = tc - halfTh - invPhi;               // flank foot angle (low side), at r_b
      var i, a;

      // radial run from the root circle up to the base circle, low flank
      pts.push(pol(baseLow, rf));
      // low involute flank, r_b out to r_a
      for (i = 0; i <= NF; i++) {
        a = aTip * (i / NF);
        pts.push(pol(baseLow + inv(a), rb / Math.cos(a)));
      }
      // tip arc across to the high flank
      var angLowTip = baseLow + inv(aTip);
      var angHighTip = 2 * tc - angLowTip;
      for (i = 1; i < NT; i++) pts.push(pol(angLowTip + (angHighTip - angLowTip) * (i / NT), ra));
      // high involute flank, r_a back down to r_b
      for (i = 0; i <= NF; i++) {
        a = aTip * (1 - i / NF);
        pts.push(pol(2 * tc - (baseLow + inv(a)), rb / Math.cos(a)));
      }
      // radial run back down to the root, high flank
      var baseHigh = tc + halfTh + invPhi;
      pts.push(pol(baseHigh, rf));
      // root-circle arc across the space to the next tooth
      var nextLow = rot + (k + 1) * step - halfTh - invPhi;
      for (i = 1; i < NR; i++) pts.push(pol(baseHigh + (nextLow - baseHigh) * (i / NR), rf));
    }
    return "M " + pts.join(" L ") + " Z";
  }

  // ---- line / circle intersections along the line of action ----
  // line: P + t·d (d unit). Returns the t roots for |X − centre| = r, or [].
  function lineCircle(px, py, dx, dy, cxx, cyy, r) {
    var ex = px - cxx, ey = py - cyy;
    var b = 2 * (ex * dx + ey * dy);
    var c = ex * ex + ey * ey - r * r;
    var disc = b * b - 4 * c;                           // a = 1 (d is unit)
    if (disc < 0) return [];
    var s = Math.sqrt(disc);
    return [(-b - s) / 2, (-b + s) / 2];
  }

  // ---- drawing ----
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    add(make("rect", { x: 4, y: 4, width: VBW - 8, height: VBH - 8, rx: 14, class: "svg-frame" }));

    var g = geom(), L = layout(g);
    drawGears(g, L);
    drawAction(g, L);
    drawPlot(g);
  }

  function circle(cx, cy, r, cls) { return add(make("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1), class: cls })); }

  function drawGears(g, L) {
    var S = L.S;
    // driven rotation from the meshing relation: a driver tooth points to the pitch
    // point, a driven space receives it, and they roll at exactly N1 : N2.
    var rot2 = (Math.PI - Math.PI / g.N2) - (N1 / g.N2) * rot1;

    // line of centres
    add(make("line", { x1: L.cx1, y1: L.cy, x2: L.cx2, y2: L.cy, class: "lc-line" }));

    // driven wheel (right), drawn first so the driver overlaps it at the mesh
    circle(L.cx2, L.cy, g.rf2 * S, "root-circle");
    add(make("path", { d: gearPath(L.cx2, L.cy, g.rb2 * S, g.rp2 * S, g.ra2 * S, g.rf2 * S, g.N2, g.phiGen, rot2), class: "gear-body" }));
    circle(L.cx2, L.cy, g.rb2 * S, "base-circle");
    circle(L.cx2, L.cy, g.rpo2 * S, "pitch-circle");
    circle(L.cx2, L.cy, 3.4, "centre-dot");

    // driver (left)
    circle(L.cx1, L.cy, g.rf1 * S, "root-circle");
    add(make("path", { d: gearPath(L.cx1, L.cy, g.rb1 * S, g.rp1 * S, g.ra1 * S, g.rf1 * S, N1, g.phiGen, rot1), class: "gear-body driver" }));
    circle(L.cx1, L.cy, g.rb1 * S, "base-circle");
    circle(L.cx1, L.cy, g.rpo1 * S, "pitch-circle");
    circle(L.cx1, L.cy, 3.4, "centre-dot");

    label(L.cx1, L.cy + g.ra1 * S + 18, "middle", "driver · N₁ = 12", "gear-label");
    label(L.cx2, L.cy + g.ra2 * S + 18, "middle", "driven · N₂ = " + g.N2, "gear-label");
    label(L.cx2 - g.rb2 * S * 0.62, L.cy - g.rb2 * S * 0.62, "middle", "base", "circ-cap");
  }

  function drawAction(g, L) {
    var S = L.S;
    // normal to the line of action is (cos φ, −sin φ); the line passes through the
    // pitch point tangent to both base circles.
    var nx = Math.cos(g.phiOp), ny = -Math.sin(g.phiOp);
    var dx = Math.sin(g.phiOp), dy = Math.cos(g.phiOp);   // unit direction along the line
    var Px = L.cx1 + g.rpo1 * S, Py = L.cy;               // pitch point
    var T1x = L.cx1 + g.rb1 * S * nx, T1y = L.cy + g.rb1 * S * ny;   // tangent on driver base
    var T2x = L.cx2 - g.rb2 * S * nx, T2y = L.cy - g.rb2 * S * ny;   // tangent on driven base

    // full common tangent, faint
    add(make("line", { x1: T1x.toFixed(1), y1: T1y.toFixed(1), x2: T2x.toFixed(1), y2: T2y.toFixed(1), class: "loa-span" }));
    // tangent ticks from each base-circle centre out to its tangent point
    add(make("line", { x1: L.cx1, y1: L.cy, x2: T1x.toFixed(1), y2: T1y.toFixed(1), class: "tangent-tick" }));
    add(make("line", { x1: L.cx2, y1: L.cy, x2: T2x.toFixed(1), y2: T2y.toFixed(1), class: "tangent-tick" }));

    // path of contact: the stretch of the line between the two addendum circles, but
    // never beyond the base-circle tangent points T1, T2 — contact cannot happen past
    // them, for the involute flank does not exist inside its own base circle.
    var tT1 = (T1x - Px) * dx + (T1y - Py) * dy;
    var tT2 = (T2x - Px) * dx + (T2y - Py) * dy;
    var tLo = Math.min(tT1, tT2), tHi = Math.max(tT1, tT2);
    var ta = lineCircle(Px, Py, dx, dy, L.cx2, L.cy, g.ra2 * S);  // driven tip (approach)
    var tr = lineCircle(Px, Py, dx, dy, L.cx1, L.cy, g.ra1 * S);  // driver tip (recess)
    var tStart = clamp(ta.length ? Math.min(ta[0], ta[1]) : tLo, tLo, tHi);
    var tEnd = clamp(tr.length ? Math.max(tr[0], tr[1]) : tHi, tLo, tHi);
    if (tStart > tEnd) { var tmp = tStart; tStart = tEnd; tEnd = tmp; }
    var Ax = Px + tStart * dx, Ay = Py + tStart * dy;
    var Bx = Px + tEnd * dx, By = Py + tEnd * dy;
    add(make("line", { x1: Ax.toFixed(1), y1: Ay.toFixed(1), x2: Bx.toFixed(1), y2: By.toFixed(1), class: "line-of-action" }));

    // the pressure-angle arc at the pitch point, between the centre-normal and the line
    var rArc = 26;
    var a0 = Math.atan2(1, 0);                           // straight down (perpendicular to centres)
    var a1 = Math.atan2(dy, dx);
    if (a1 < a0) { var t = a0; a0 = a1; a1 = t; }
    add(make("path", {
      d: "M " + (Px + rArc * Math.cos(a0)).toFixed(1) + " " + (Py + rArc * Math.sin(a0)).toFixed(1) +
         " A " + rArc + " " + rArc + " 0 0 1 " +
         (Px + rArc * Math.cos(a1)).toFixed(1) + " " + (Py + rArc * Math.sin(a1)).toFixed(1),
      class: "phi-arc"
    }));
    label(Px + 30, Py - 30, "start", "φ = " + (g.phiOp * 180 / Math.PI).toFixed(1) + "°", "phi-cap");

    // the sliding contact point — sweeps the path of contact once per tooth pitch
    var u = ((rot1 / (2 * Math.PI / N1)) % 1 + 1) % 1;
    var Cx = Ax + (Bx - Ax) * u, Cy = Ay + (By - Ay) * u;
    add(make("circle", { cx: Cx.toFixed(1), cy: Cy.toFixed(1), r: 5, class: "contact-dot" }));
    label((T1x + T2x) / 2 + 8, (T1y + T2y) / 2 - 10, "start", "line of action", "loa-cap");

    // the pitch point itself
    add(make("circle", { cx: Px.toFixed(1), cy: Py.toFixed(1), r: 4, class: "pitch-point" }));
    label(Px, Py + 20, "middle", "pitch point", "pitch-cap");
  }

  // ---- the ratio-and-angle-versus-centre-distance plot ----
  function xForF(f) { return PX0 + (f - CENTRE_MIN / 100) / ((CENTRE_MAX - CENTRE_MIN) / 100) * (PX1 - PX0); }
  function yForV(v) { return (PY_BOT - 6) - (v - V_LO) / (V_HI - V_LO) * ((PY_BOT - 6) - (PY_TOP + 6)); }
  function phiFactor(f, g) {
    var phi = Math.acos(clamp((g.rb1 + g.rb2) / (g.C0 * f), -1, 1));
    return phi / g.phiGen;
  }

  function drawPlot(g) {
    add(make("rect", { x: PX0, y: PY_TOP, width: PX1 - PX0, height: PY_BOT - PY_TOP, rx: 8, class: "plot-frame" }));

    // the ×1 gridline (nominal)
    var y1 = yForV(1);
    add(make("line", { x1: PX0, y1: y1, x2: PX1, y2: y1, class: "plot-axis" }));
    label(PX0 - 6, y1 + 4, "end", "×1", "plot-tick");
    label(PX0 + 4, PY_BOT + 14, "start", "nominal", "plot-tick");
    label(PX1 - 4, PY_BOT + 14, "end", "spread", "plot-tick");

    // pressure angle: a rising curve (this is what moves)
    var pts = [], f, N = 40;
    for (var i = 0; i <= N; i++) {
      f = (CENTRE_MIN / 100) + (i / N) * ((CENTRE_MAX - CENTRE_MIN) / 100);
      pts.push(xForF(f).toFixed(1) + "," + yForV(phiFactor(f, g)).toFixed(1));
    }
    add(make("polyline", { points: pts.join(" "), class: "plot-phi" }));
    label(xForF(1.085), yForV(phiFactor(1.11, g)) - 6, "middle", "pressure angle", "plot-label phi");

    // velocity ratio: dead flat at ×1 (this is what does not move)
    add(make("line", { x1: xForF(CENTRE_MIN / 100), y1: yForV(1), x2: xForF(CENTRE_MAX / 100), y2: yForV(1), class: "plot-ratio" }));
    label(xForF(1.06), yForV(1) - 8, "middle", "velocity ratio", "plot-label ratio");

    // the marks at the current centre distance
    var fc = g.f, xc = xForF(fc);
    add(make("line", { x1: xc, y1: PY_TOP + 6, x2: xc, y2: PY_BOT - 6, class: "plot-axis" }));
    add(make("circle", { cx: xc, cy: yForV(phiFactor(fc, g)), r: 3.6, class: "plot-phi-dot" }));
    add(make("circle", { cx: xc, cy: yForV(1), r: 4.4, class: "plot-dot" }));
  }

  // ---- readout ----
  function fmtRatio(r) {
    // a tidy "a : b" when the ratio is simple, else a decimal
    if (Math.abs(r * 1 - Math.round(r)) < 1e-9) return r.toFixed(0) + " : 1";
    return r.toFixed(2) + " : 1";
  }
  function paint(g) {
    el.big.textContent = fmtRatio(g.ratio);
    el.teeth.textContent = N1 + " : " + g.N2;
    el.phi.textContent = (g.phiOp * 180 / Math.PI).toFixed(1) + "°";
    el.centre.textContent = g.f.toFixed(2) + " × nominal";
    el.pitch.textContent = "1.00 : " + (g.rpo2 / g.rpo1).toFixed(2);
    el.base.textContent = (g.rb1 / g.rp1).toFixed(2) + " : " + (g.rb2 / g.rp1).toFixed(2);
    el.drift.textContent = "0%";

    el.teethVal.textContent = String(g.N2);
    el.phiVal.textContent = ((state.phi / 10)).toFixed(1) + "°";
    el.centreVal.textContent = g.f.toFixed(2) + " × nominal";
  }

  // Speak the settled state, not every animation frame.
  var announceTimer = null;
  function scheduleAnnounce(g) {
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { speak(g); }, 400);
  }
  function speak(g) {
    if (!el.status) return;
    var phiOp = (g.phiOp * 180 / Math.PI).toFixed(1);
    var msg;
    if (g.f > 1.001) {
      msg = "The centres are spread to " + g.f.toFixed(2) + " times nominal. The pressure angle has " +
        "opened to " + phiOp + " degrees and the pitch circles have swollen, but the velocity ratio, " +
        "set by the fixed base circles, holds at " + fmtRatio(g.ratio).replace(" : ", " to ") +
        " — no drift at all. The line of action still lies tangent to both base circles.";
    } else {
      msg = "A twelve-tooth driver meshes a " + g.N2 + "-tooth wheel at a " + fmtRatio(g.ratio).replace(" : ", " to ") +
        " ratio, pressure angle " + phiOp + " degrees. Contact slides along a single straight line of action, " +
        "tangent to both base circles, so the drive is handed on perfectly evenly. Spread the centres and the " +
        "ratio will not move.";
    }
    el.status.textContent = msg;
  }

  function render() {
    draw();
    var g = geom();
    paint(g);
    scheduleAnnounce(g);
    save();
  }

  // ---- the Turn animation: roll the mesh ----
  var turnRaf = null, lastTs = 0;
  function setTurning(on) {
    runBtn.setAttribute("aria-pressed", on ? "true" : "false");
    runBtn.textContent = on ? "Stop" : "Turn";
  }
  function stopTurn() {
    if (turnRaf) { window.cancelAnimationFrame(turnRaf); turnRaf = null; }
    setTurning(false);
  }
  function startTurn() {
    if (turnRaf) return;
    if (motionOff()) {                                   // reduced motion: step one tooth, no spin
      rot1 += 2 * Math.PI / N1;
      draw();
      return;
    }
    lastTs = 0;
    setTurning(true);
    turnRaf = window.requestAnimationFrame(turnStep);
  }
  function turnStep(ts) {
    if (!lastTs) lastTs = ts;
    var dt = (ts - lastTs) / 1000; lastTs = ts;
    rot1 += TURN_RATE * dt;
    if (rot1 > 2 * Math.PI * 1000) rot1 -= 2 * Math.PI * 1000;   // keep it bounded
    draw();
    turnRaf = window.requestAnimationFrame(turnStep);
  }

  // ---- the Spread demo: sweep the centre distance out and hold ----
  var spreadRaf = null, spreadFrom = 100, spreadTo = 100, spreadStart = 0;
  var spreadOpen = false;
  function setSpread(on) {
    spreadBtn.setAttribute("aria-pressed", on ? "true" : "false");
    spreadBtn.textContent = on ? "Close the centres" : "Spread the centres";
  }
  function animateCentre(target) {
    if (spreadRaf) { window.cancelAnimationFrame(spreadRaf); spreadRaf = null; }
    if (motionOff()) { setCentre(target); return; }      // reduced motion: jump, no sweep
    spreadFrom = state.centre; spreadTo = target; spreadStart = 0;
    spreadRaf = window.requestAnimationFrame(spreadStep);
  }
  function spreadStep(ts) {
    if (!spreadStart) spreadStart = ts;
    var k = clamp((ts - spreadStart) / SPREAD_MS, 0, 1);
    var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // ease in-out
    setCentre(Math.round(spreadFrom + (spreadTo - spreadFrom) * e));
    if (k < 1) spreadRaf = window.requestAnimationFrame(spreadStep);
    else spreadRaf = null;
  }
  function toggleSpread() {
    spreadOpen = !spreadOpen;
    setSpread(spreadOpen);
    animateCentre(spreadOpen ? CENTRE_MAX : CENTRE_MIN);
  }

  // ---- control wiring ----
  function setTeeth(v) {
    state.teeth = clamp(Math.round(v), TEETH_MIN, TEETH_MAX);
    if (teethRange.value !== String(state.teeth)) teethRange.value = String(state.teeth);
    render();
  }
  function setPhi(v) {
    state.phi = clamp(Math.round(v / 5) * 5, PHI_MIN, PHI_MAX);
    if (phiRange.value !== String(state.phi)) phiRange.value = String(state.phi);
    render();
  }
  function setCentre(v) {
    state.centre = clamp(Math.round(v), CENTRE_MIN, CENTRE_MAX);
    if (centreRange.value !== String(state.centre)) centreRange.value = String(state.centre);
    // keep the button label honest if the slider is dragged by hand
    var open = state.centre > CENTRE_MIN;
    if (open !== spreadOpen) { spreadOpen = open; setSpread(open); }
    render();
  }

  teethRange.addEventListener("input", function () { setTeeth(parseFloat(teethRange.value)); });
  phiRange.addEventListener("input", function () { setPhi(parseFloat(phiRange.value)); });
  centreRange.addEventListener("input", function () {
    if (spreadRaf) { window.cancelAnimationFrame(spreadRaf); spreadRaf = null; }
    setCentre(parseFloat(centreRange.value));
  });

  runBtn.addEventListener("click", function () { if (turnRaf) stopTurn(); else startTurn(); });
  if (reduceMQ) {
    var onMotionChange = function () {
      if (!motionOff()) return;
      if (turnRaf) stopTurn();                            // caught mid-spin — halt where it sits
      if (spreadRaf) {                                    // caught mid-sweep — jump to the target
        window.cancelAnimationFrame(spreadRaf); spreadRaf = null;
        setCentre(spreadTo);
      }
    };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotionChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onMotionChange);   // older browsers
  }
  spreadBtn.addEventListener("click", toggleSpread);
  function doReset() {
    stopTurn();
    if (spreadRaf) { window.cancelAnimationFrame(spreadRaf); spreadRaf = null; }
    spreadOpen = false; setSpread(false);
    rot1 = 0;
    setTeeth(DEFAULTS.teeth); setPhi(DEFAULTS.phi); setCentre(DEFAULTS.centre);
  }
  resetBtn.addEventListener("click", doReset);

  // roll the mesh by hand — a small step of the driver, stopping any running spin first
  function stepMesh(dir) {
    stopTurn();
    rot1 += dir * (2 * Math.PI / N1) * 0.25;
    draw();
  }

  // Keyboard: work the whole bench without the mouse. Arrows roll the mesh; brackets
  // shallow or steepen the pressure angle; minus/equals set the driven teeth; Space
  // turns the mesh; S spreads the centres and closes them; R resets. When a range
  // slider holds focus its native arrow-stepping is left alone, and a focused button
  // keeps its own Space/Enter.
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var onRange = (e.target === teethRange || e.target === phiRange || e.target === centreRange);
    var onButton = (e.target === runBtn || e.target === spreadBtn || e.target === resetBtn);
    switch (e.key) {
      case "ArrowLeft":  if (onRange) return; stepMesh(-1); break;
      case "ArrowRight": if (onRange) return; stepMesh(1); break;
      case "[": setPhi(state.phi - 5); break;
      case "]": setPhi(state.phi + 5); break;
      case "-": setTeeth(state.teeth - 1); break;
      case "=": setTeeth(state.teeth + 1); break;
      case " ": case "Spacebar":
        if (onButton) return;                             // let the focused button take its own Space
        if (turnRaf) stopTurn(); else startTurn(); break;
      case "s": case "S": toggleSpread(); break;
      case "r": case "R": doReset(); break;
      default: return;
    }
    e.preventDefault();
  });

  // ---- boot ----
  teethRange.min = TEETH_MIN; teethRange.max = TEETH_MAX;
  phiRange.min = PHI_MIN; phiRange.max = PHI_MAX;
  centreRange.min = CENTRE_MIN; centreRange.max = CENTRE_MAX;
  restore();
  setTeeth(state.teeth); setPhi(state.phi); setCentre(state.centre);
})();
