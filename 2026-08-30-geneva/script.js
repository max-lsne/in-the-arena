/* Geneva — a bench for the drive that carries a stop in its motion. A pin on a steadily
 * turning driver sweeps into a slot of a star wheel, carries it round one station, and
 * slides out; a curved shoulder holds the star still the rest of the turn. In the arena,
 * 2026-08-30.
 *
 * The whole mechanism follows from one triangle. Put the two shaft centres a distance a
 * apart and the pin at radius r on the driver. For the pin to enter and leave each slot
 * ALONG the slot — tangent, from rest, with no sideways snatch — the crank arm must stand
 * perpendicular to the slot at that instant. The slot sits half a pitch (π/n) off the
 * centre-line at entry, giving a right triangle with the right angle at the pin:
 *
 *     r = a·sin(π/n)                       the pin radius that indexes from rest
 *     m = a/r = 1/sin(π/n)                 centre distance, in pin radii
 *     index angle = 180°·(n−2)/n           driver rotation while engaged (2Δ, Δ = 90−180/n)
 *     dwell fraction = (n+2)/(2n)          share of the turn the star is held
 *     (ω_star/ω_driver)_max = 1/(m−1)      peak over-speed, at mid-index
 *
 * The star's orientation while engaged is read straight off the pin: the engaged slot
 * points from the star centre O1 to the pin, so sa = atan2(pin − O1). Between engagements
 * the star holds (the pattern is n-fold symmetric, so a single held representative draws
 * the same picture at every station). Everything else — the Maltese-cross outline, the
 * locking flange, the output staircase and the speed-ratio curve below — is drawn from
 * these few relations, and re-cut whenever the slot count changes.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var VBW = 640, VBH = 520;

  var N_MIN = 3, N_MAX = 8;
  var SPD_MIN = 20, SPD_MAX = 150;           // driver speed, degrees per second
  var SPD_NOM = 70;                          // the nominal "1.0×"
  var DEFAULTS = { n: 4, speed: 70 };
  var STORE_KEY = "arena.geneva.v1";

  var state = { n: DEFAULTS.n, speed: DEFAULTS.speed };
  var cd = 0;                                // driver angle (degrees), pin direction

  // ---- geometry (viewBox units) ----
  var Cx = 316, CyStage = 172;               // stage centre
  var A = 132;                               // centre distance between the shafts
  var O1 = { x: Cx - A / 2, y: CyStage };    // star centre (output), on the left
  var O2 = { x: Cx + A / 2, y: CyStage };    // driver centre (input), on the right
  var SLOT_HALF = 6.5;                       // half the slot width
  var PIN_R = 5;                             // pin radius (drawn)

  // ---- output diagram box ----
  var PX0 = 70, PX1 = 600;                   // driver-angle axis, 0 → 720° (two turns)
  var DTOP = 350, DBOT = 470, DZERO = 470;   // angle rises up from the baseline
  var SPAN_DEG = 720;

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var slotRange = document.getElementById("slotRange");
  var speedRange = document.getElementById("speedRange");
  var runBtn = document.getElementById("runBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    big: document.getElementById("readBig"),
    cap: document.getElementById("readCap"),
    eq: document.getElementById("rbEq"),
    n: document.getElementById("rfN"),
    pitch: document.getElementById("rfPitch"),
    index: document.getElementById("rfIndex"),
    dwell: document.getElementById("rfDwell"),
    r: document.getElementById("rfR"),
    peak: document.getElementById("rfPeak"),
    slotVal: document.getElementById("slotVal"),
    speedVal: document.getElementById("speedVal")
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
  function deg(r) { return r * 180 / Math.PI; }
  function wrap180(x) { return ((x + 180) % 360 + 360) % 360 - 180; }
  function polar(o, ang, r) { return [o.x + r * Math.cos(ang), o.y + r * Math.sin(ang)]; }
  function label(x, y, anchor, text, cls) {
    var t = make("text", { x: x, y: y, "text-anchor": anchor, class: cls || "lane-tick" });
    t.textContent = text;
    return add(t);
  }
  function f1(x) { return x.toFixed(1); }

  // ---- the derived quantities of an n-slot Geneva ----
  function geom() {
    var n = state.n;
    var s = Math.sin(Math.PI / n);
    var r = A * s;                           // pin radius, r = a·sin(π/n)
    var m = 1 / s;                           // a/r
    var delta = 90 - 180 / n;                // index half-angle (degrees)
    var Rmouth = A * Math.cos(Math.PI / n);  // slot opening radius from O1
    var Rbot = A - r;                        // slot bottom (pin's closest approach)
    var Rtip = Rmouth + 13;                  // arm-tip radius
    var Rflange = A * (1 - Math.cos(Math.PI / n)) + 8;  // driver locking-flange radius
    var Rhub = clamp(Rflange * 0.5, 12, 22);
    return { n: n, r: r, m: m, delta: delta, Rmouth: Rmouth, Rbot: Rbot,
             Rtip: Rtip, Rflange: Rflange, Rhub: Rhub };
  }
  function pitch() { return 360 / state.n; }
  function indexAngle() { return 180 * (state.n - 2) / state.n; }
  function dwellFrac() { return (state.n + 2) / (2 * state.n); }
  function peakRatio() { var m = 1 / Math.sin(Math.PI / state.n); return 1 / (m - 1); }

  // ---- the kinematics ----
  // The engaged slot points from O1 straight at the pin, so during engagement the star's
  // orientation is atan2(pin − O1). Off engagement the star is locked; the pattern is
  // n-fold symmetric, so a single held representative (−π/n) draws the same wheel at every
  // station and joins the engaged sweep without a visible jump.
  function engaged(d) { return Math.abs(wrap180(d - 180)) <= geom().delta; }
  function starAngle(d) {
    var g = geom();
    if (Math.abs(wrap180(d - 180)) <= g.delta) {
      var p = polar(O2, rad(d), g.r);
      return Math.atan2(p[1] - O1.y, p[0] - O1.x);
    }
    return -Math.PI / g.n;
  }

  // Output angle Φ(d): cumulative star rotation against driver angle d (degrees). One index
  // per driver revolution; within the index the closed form φ(α) = 180/n + atan2(sinα, m−cosα).
  function outAngle(d) {
    var g = geom(), pit = pitch();
    var revs = Math.floor(d / 360), within = d - revs * 360;
    var base = revs * pit;
    if (within < 180 - g.delta) return base;
    if (within > 180 + g.delta) return base + pit;
    var a = within - 180;                    // crank offset from the index centre
    var phi = 180 / g.n + deg(Math.atan2(Math.sin(rad(a)), g.m - Math.cos(rad(a))));
    return base + phi;
  }
  // Speed ratio ω_star/ω_driver = dφ/dα, zero through the dwell, peaking 1/(m−1) at mid-index.
  function ratio(d) {
    var g = geom();
    if (Math.abs(wrap180(d - 180)) > g.delta) return 0;
    var a = rad(wrap180(d - 180));
    var c = Math.cos(a);
    return (g.m * c - 1) / (1 - 2 * g.m * c + g.m * g.m);
  }

  // Keep the bench as you left it, across visits — the slot count and the driver speed.
  // Reset still puts them back to the nominal four-slot cross at the nominal speed.
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ n: state.n, speed: state.speed }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s.n === "number" && isFinite(s.n)) state.n = clamp(Math.round(s.n), N_MIN, N_MAX);
      if (s && typeof s.speed === "number" && isFinite(s.speed)) {
        state.speed = clamp(Math.round(s.speed / 5) * 5, SPD_MIN, SPD_MAX);
      }
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }

  // ---- drawing ----
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    add(make("rect", { x: 4, y: 4, width: VBW - 8, height: VBH - 8, rx: 14, class: "svg-frame" }));
    drawCentreFurniture();
    drawStar();
    drawDriver();
    drawStateCaption();
    drawDiagram();
  }

  function drawCentreFurniture() {
    var g = geom();
    // centre-line between the shafts, and the dashed pin-path circle
    add(make("line", { x1: O1.x, y1: O1.y, x2: O2.x, y2: O2.y, class: "centreline" }));
    add(make("circle", { cx: O2.x, cy: O2.y, r: f1(g.r), class: "pin-path" }));
  }

  // The Maltese-cross star: n narrow radial slots, each flanked by two sharp tips, with a
  // deep concave arc — the locking surface — spanning the arm between one slot and the next.
  function starPath(sa) {
    var g = geom(), n = g.n, seg = 2 * Math.PI / n;
    var d = "", k;
    function perp(ang, r, off) {                // point at radius r, pushed ±off across the slot
      var p = polar(O1, ang, r), px = -Math.sin(ang), py = Math.cos(ang);
      return [p[0] + px * off, p[1] + py * off];
    }
    // concave rim from tip a (on slot k) to tip b (on slot k+1), dipping toward the centre
    // at the arm midline — the hollow the driver's shoulder rides through the dwell.
    function rim(a, b) {
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var vx = mx - O1.x, vy = my - O1.y, L = Math.hypot(vx, vy) || 1;
      var dip = (g.Rtip - g.Rbot) * 0.42 + 6;
      var cxp = mx - (vx / L) * dip, cyp = my - (vy / L) * dip;
      return " Q " + f1(cxp) + " " + f1(cyp) + " " + f1(b[0]) + " " + f1(b[1]);
    }
    var first = perp(sa, g.Rtip, -SLOT_HALF);   // − tip of slot 0
    d = "M " + f1(first[0]) + " " + f1(first[1]);
    for (k = 0; k < n; k++) {
      var th = sa + k * seg;
      var Bm = perp(th, g.Rbot, -SLOT_HALF), Bp = perp(th, g.Rbot, SLOT_HALF);
      var Tp = perp(th, g.Rtip, SLOT_HALF);
      var TmNext = perp(th + seg, g.Rtip, -SLOT_HALF);
      d += " L " + f1(Bm[0]) + " " + f1(Bm[1]);                  // down the − wall to the bottom
      d += " A " + SLOT_HALF + " " + SLOT_HALF + " 0 0 0 " + f1(Bp[0]) + " " + f1(Bp[1]); // rounded slot bottom
      d += " L " + f1(Tp[0]) + " " + f1(Tp[1]);                  // up the + wall to the + tip
      d += rim(Tp, TmNext);                                      // concave arm over to the next slot
    }
    return d + " Z";
  }

  function drawStar() {
    var g = geom(), sa = starAngle(cd), moving = engaged(cd);
    add(make("path", { d: starPath(sa), class: "star-body" + (moving ? " moving" : "") }));
    add(make("circle", { cx: O1.x, cy: O1.y, r: f1(g.Rbot * 0.5), class: "star-hub" }));
    add(make("circle", { cx: O1.x, cy: O1.y, r: 3.4, class: "centre-dot" }));
    // a faint centre-mark down the engaged (or ready) slot
    var tip = polar(O1, sa, g.Rmouth + 6);
    add(make("line", { x1: O1.x, y1: O1.y, x2: f1(tip[0]), y2: f1(tip[1]), class: "slot-mark" }));
    label(O1.x, O1.y + g.Rtip + 20, "middle", "star · output", "centre-cap");
  }

  // The driver: a hub, a crank arm out to the pin, and the locking flange — a disc with a
  // throat cut around the pin, so the solid faces (and locks) the star through the dwell and
  // the throat opens to the star only while the pin drives it.
  function sectorWithMouth(o, R, mouthDeg, halfDeg) {
    var a0 = rad(mouthDeg + halfDeg), a1 = rad(mouthDeg - halfDeg + 360);
    var p0 = polar(o, a0, R), p1 = polar(o, a1, R);
    return "M " + f1(o.x) + " " + f1(o.y) +
           " L " + f1(p0[0]) + " " + f1(p0[1]) +
           " A " + f1(R) + " " + f1(R) + " 0 1 1 " + f1(p1[0]) + " " + f1(p1[1]) + " Z";
  }
  function drawDriver() {
    var g = geom(), moving = engaged(cd);
    var throatHalf = g.delta + 12;
    add(make("path", { d: sectorWithMouth(O2, g.Rflange, cd, throatHalf), class: "driver-flange" }));
    var pin = polar(O2, rad(cd), g.r);
    add(make("line", { x1: O2.x, y1: O2.y, x2: f1(pin[0]), y2: f1(pin[1]), class: "crank-arm" }));
    add(make("circle", { cx: O2.x, cy: O2.y, r: f1(g.Rhub), class: "driver-hub" }));
    add(make("circle", { cx: f1(pin[0]), cy: f1(pin[1]), r: PIN_R, class: "pin-dot" + (moving ? " engaged" : "") }));
    add(make("circle", { cx: O2.x, cy: O2.y, r: 3.4, class: "centre-dot" }));
    label(O2.x, O1.y + g.Rtip + 20, "middle", "driver · input", "centre-cap");
  }

  function drawStateCaption() {
    var moving = engaged(cd);
    label(Cx, 30, "middle", moving ? "index — the pin drives the star" : "dwell — the shoulder holds it still",
      "state-cap " + (moving ? "turn" : "hold"));
  }

  // ---- the output diagram ----
  function xForA(dg) { return PX0 + (dg / SPAN_DEG) * (PX1 - PX0); }

  function drawDiagram() {
    var g = geom(), pit = pitch();
    var angleMax = 2 * pit;                   // two indexes over the two-turn window
    var peak = peakRatio();

    // frame + baseline
    add(make("rect", { x: PX0, y: DTOP, width: PX1 - PX0, height: DBOT - DTOP, rx: 5, class: "lane-frame" }));
    add(make("line", { x1: PX0, y1: DZERO, x2: PX1, y2: DZERO, class: "lane-zero" }));

    // shade each index window; divide the two turns
    var rev, w0, w1;
    for (rev = 0; rev < 2; rev++) {
      w0 = xForA(rev * 360 + (180 - g.delta));
      w1 = xForA(rev * 360 + (180 + g.delta));
      add(make("rect", { x: f1(w0), y: DTOP, width: f1(w1 - w0), height: DBOT - DTOP, class: "lane-band-index" }));
    }
    add(make("line", { x1: xForA(360), y1: DTOP, x2: xForA(360), y2: DBOT, class: "lane-div" }));

    // gridlines at each completed step
    var s;
    for (s = 1; s <= 2; s++) {
      var y = DZERO - (s * pit / angleMax) * (DBOT - DTOP);
      add(make("line", { x1: PX0, y1: f1(y), x2: PX1, y2: f1(y), class: "lane-step-tick" }));
      label(PX0 - 6, f1(y) + 3, "end", (s * pit).toFixed(0) + "°", "lane-tick");
    }

    // the output staircase — cumulative star angle
    var apts = [], rpts = [], i, dg;
    for (i = 0; i <= 360; i++) {
      dg = (i / 360) * SPAN_DEG;
      var yA = DZERO - (outAngle(dg) / angleMax) * (DBOT - DTOP);
      apts.push(f1(xForA(dg)) + "," + f1(yA));
      var yR = DZERO - (ratio(dg) / peak) * (DBOT - DTOP) * 0.92;
      rpts.push(f1(xForA(dg)) + "," + f1(clamp(yR, DTOP, DZERO)));
    }
    add(make("polyline", { points: rpts.join(" "), class: "plot-ratio" }));
    add(make("polyline", { points: apts.join(" "), class: "plot-angle" }));

    // captions + axis
    label(PX0 + 6, DTOP + 13, "start", "star angle Φ", "angle-cap");
    label(PX1 - 6, DTOP + 13, "end", "ω_star ⁄ ω_driver", "ratio-cap");
    [0, 360, 720].forEach(function (a) {
      label(xForA(a), DBOT + 15, "middle", a === 0 ? "0" : (a / 360) + (a === 360 ? " turn" : " turns"), "lane-tick");
    });

    drawCursor(angleMax);
  }

  function drawCursor(angleMax) {
    var dg = ((cd % SPAN_DEG) + SPAN_DEG) % SPAN_DEG, x = xForA(dg);
    add(make("line", { x1: f1(x), y1: DTOP, x2: f1(x), y2: DBOT, class: "cursor-line" }));
    var yA = DZERO - (outAngle(dg) / angleMax) * (DBOT - DTOP);
    add(make("circle", { cx: f1(x), cy: f1(yA), r: 3.6, class: "cursor-dot" }));
  }

  // ---- readout ----
  function paint() {
    var g = geom();
    el.big.textContent = peakRatio().toFixed(2);
    el.eq.textContent = "r = a·sin(π⁄" + state.n + ") = " + (g.r / A).toFixed(3) + " a";
    el.n.textContent = state.n;
    el.pitch.textContent = pitch().toFixed(0) + "°";
    el.index.textContent = indexAngle().toFixed(0) + "°";
    el.dwell.textContent = (dwellFrac() * 100).toFixed(0) + "%";
    el.r.textContent = (g.r / A).toFixed(3);
    el.peak.textContent = peakRatio().toFixed(2);

    el.slotVal.textContent = state.n;
    el.speedVal.textContent = (state.speed / SPD_NOM).toFixed(1) + "×";
  }

  function render() {
    draw();
    paint();
    save();
  }

  // ---- the Run animation ----
  var raf = null, lastTs = 0;
  function setRunning(on) {
    runBtn.setAttribute("aria-pressed", on ? "true" : "false");
    runBtn.textContent = on ? "Stop" : "Run";
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
    cd = (cd + state.speed * dt) % 360;
    draw();
    raf = window.requestAnimationFrame(step);
  }

  // ---- control wiring ----
  function setN(v) {
    state.n = clamp(Math.round(v), N_MIN, N_MAX);
    if (slotRange.value !== String(state.n)) slotRange.value = String(state.n);
    render();
  }
  function setSpeed(v) {
    state.speed = clamp(Math.round(v / 5) * 5, SPD_MIN, SPD_MAX);
    if (speedRange.value !== String(state.speed)) speedRange.value = String(state.speed);
    render();
  }

  slotRange.addEventListener("input", function () { setN(parseFloat(slotRange.value)); });
  speedRange.addEventListener("input", function () { setSpeed(parseFloat(speedRange.value)); });

  runBtn.addEventListener("click", function () { if (raf) stop(); else start(); });
  function doReset() {
    stop();
    cd = 0;
    setN(DEFAULTS.n); setSpeed(DEFAULTS.speed);
  }
  resetBtn.addEventListener("click", doReset);

  // turn the driver by hand — a small step of the crank, stopping any run first
  function nudge(dir) {
    stop();
    cd = ((cd + dir * 6) % 360 + 360) % 360;
    draw();
  }

  // Keyboard: work the whole bench without the mouse. Arrows turn the driver by hand;
  // brackets change the slot count; minus/equals set the speed; Space runs the drive; R
  // resets. A focused range slider keeps its native arrow-stepping, and a focused button
  // keeps its own Space/Enter.
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var onRange = (e.target === slotRange || e.target === speedRange);
    var onButton = (e.target === runBtn || e.target === resetBtn);
    switch (e.key) {
      case "ArrowLeft":  if (onRange) return; nudge(-1); break;
      case "ArrowRight": if (onRange) return; nudge(1); break;
      case "[": setN(state.n - 1); break;
      case "]": setN(state.n + 1); break;
      case "-": setSpeed(state.speed - 5); break;
      case "=": setSpeed(state.speed + 5); break;
      case " ": case "Spacebar":
        if (onButton) return;                 // let the focused button take its own Space
        if (raf) stop(); else start(); break;
      case "r": case "R": doReset(); break;
      default: return;
    }
    e.preventDefault();
  });

  // ---- boot ----
  slotRange.min = N_MIN; slotRange.max = N_MAX;
  speedRange.min = SPD_MIN; speedRange.max = SPD_MAX;
  restore();
  setN(state.n); setSpeed(state.speed);
})();
