/* Trammel — a bench for the trammel of Archimedes, an ellipse drawn by a stick.
 * In the arena, 2026-08-14.
 *
 * The whole instrument is one fact: pin one point of a rigid rod to a
 * horizontal groove and another to a vertical one, and a marked point P on the
 * rod is left a single freedom shaped like an ellipse. If P sits a from the
 * pin on the upright groove and b from the pin on the flat groove, then as the
 * rod leans at angle t the mark is at exactly (a·cos t, b·sin t) — the ellipse
 * x²/a² + y²/b² = 1. Equal reaches round it to a circle; a zero reach flattens
 * it to a straight line. No string, no arithmetic, only two grooves and a rod.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // geometry of the viewBox
  var VB = 560;
  var CX = VB / 2, CY = VB / 2;       // origin: where the two grooves cross
  var REACH_MAX = 230;                // the sliders' top reach, in svg units
  var ARM = REACH_MAX + 26;           // how far the grooves run from the centre

  var DEFAULTS = { a: 150, b: 95, t: 0 };
  var TURN_RATE = 60;                 // degrees per second when the rod runs
  var STORE_KEY = "arena.trammel.v1";

  var state = { a: DEFAULTS.a, b: DEFAULTS.b, t: DEFAULTS.t, running: false };

  // Motion preference — the decorative ping (a fresh circle/line limit) is
  // skipped when the reader asks for less motion, re-checked live.
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOff() { return !!(reduceMQ && reduceMQ.matches); }
  var lastCase = null;

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var aRange = document.getElementById("aRange");
  var bRange = document.getElementById("bRange");
  var tRange = document.getElementById("tRange");
  var turnBtn = document.getElementById("turnBtn");
  var circleBtn = document.getElementById("circleBtn");
  var lineBtn = document.getElementById("lineBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    caseName: document.getElementById("readCase"),
    eq: document.getElementById("rbEq"),
    a: document.getElementById("rfA"),
    b: document.getElementById("rfB"),
    e: document.getElementById("rfE"),
    area: document.getElementById("rfArea"),
    t: document.getElementById("rfT"),
    aVal: document.getElementById("aVal"),
    bVal: document.getElementById("bVal"),
    tValLabel: document.getElementById("tValLabel"),
    status: document.getElementById("status")
  };

  // ---- small helpers ----
  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]); }
    return node;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function rad(deg) { return deg * Math.PI / 180; }

  // Keep the bench as you left it, across visits — the reaches and the turn,
  // but not whether it was running (a page should not start moving on its own).
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ a: state.a, b: state.b, t: state.t }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s.a === "number" && isFinite(s.a)) state.a = clamp(Math.round(s.a), 0, REACH_MAX);
      if (s && typeof s.b === "number" && isFinite(s.b)) state.b = clamp(Math.round(s.b), 0, REACH_MAX);
      if (s && typeof s.t === "number" && isFinite(s.t)) state.t = ((s.t % 360) + 360) % 360;
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }
  function group(n) {
    // thin-space thousands, e.g. 44767 -> "44 767"
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  // math point (x up-positive) -> screen point
  function sx(x) { return CX + x; }
  function sy(y) { return CY - y; }

  // The marked point and the two pins, worked straight from the geometry.
  function solve() {
    var a = state.a, b = state.b, t = rad(state.t);
    var ct = Math.cos(t), st = Math.sin(t);
    var P = { x: a * ct, y: b * st };
    var pinA = { x: 0, y: (b - a) * st };        // rides the upright (y) groove
    var pinB = { x: (a - b) * ct, y: 0 };        // rides the flat (x) groove

    var isCircle = (a === b && a > 0);
    var isLine = (a === 0 || b === 0);
    var name = isCircle ? "circle" : (isLine ? "line" : "ellipse");

    var hi = Math.max(a, b), lo = Math.min(a, b);
    var ecc = hi === 0 ? 0 : Math.sqrt(1 - (lo * lo) / (hi * hi));

    return {
      a: a, b: b, t: state.t, ct: ct, st: st,
      P: P, pinA: pinA, pinB: pinB,
      name: name, isCircle: isCircle, isLine: isLine,
      ecc: ecc, area: Math.PI * a * b
    };
  }

  // A point on the locus at angle d (degrees), in screen coords.
  function locusPt(d) {
    var r = rad(d);
    return [sx(state.a * Math.cos(r)), sy(state.b * Math.sin(r))];
  }
  function pathFrom(d0, d1, step) {
    var d = "", first = true;
    for (var ang = d0; ang <= d1 + 1e-6; ang += step) {
      var p = locusPt(ang);
      d += (first ? "M" : "L") + p[0].toFixed(2) + " " + p[1].toFixed(2);
      first = false;
    }
    return d;
  }

  // ---- drawing ----
  function draw(r) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.appendChild(make("rect", {
      x: 4, y: 4, width: VB - 8, height: VB - 8, rx: 14, class: "svg-frame"
    }));

    // the two grooves, crossed at the origin
    svg.appendChild(make("line", { x1: sx(-ARM), y1: sy(0), x2: sx(ARM), y2: sy(0), class: "groove" }));
    svg.appendChild(make("line", { x1: sx(0), y1: sy(-ARM), x2: sx(0), y2: sy(ARM), class: "groove" }));
    var ax = make("text", { x: sx(ARM) - 4, y: sy(0) - 8, "text-anchor": "end", class: "axis-label" });
    ax.textContent = "flat groove";
    svg.appendChild(ax);
    var ay = make("text", { x: sx(0) + 8, y: sy(ARM) + 14, "text-anchor": "start", class: "axis-label" });
    ay.textContent = "upright groove";
    svg.appendChild(ay);

    // the full locus, faint, and the arc swept so far, bright green
    svg.appendChild(make("path", { d: pathFrom(0, 360, 2), class: "locus" }));
    if (state.t > 0.01) {
      svg.appendChild(make("path", { d: pathFrom(0, state.t, 2), class: "swept" }));
    }

    // the rod: from the farther pin, through both pins and the mark, plus a stub
    var uX = r.ct, uY = r.st;                         // unit vector along the rod
    var sA = r.pinA.x * uX + r.pinA.y * uY;           // signed position of each along u
    var sB = r.pinB.x * uX + r.pinB.y * uY;
    var sP = r.P.x * uX + r.P.y * uY;
    var sLo = Math.min(sA, sB, sP);
    function alongU(s) { return [sx(s * uX), sy(s * uY)]; }
    var rodA = alongU(sLo), rodP = alongU(sP), rodStub = alongU(sP + 24);
    svg.appendChild(make("line", {
      x1: rodA[0], y1: rodA[1], x2: rodP[0], y2: rodP[1], class: "rod"
    }));
    svg.appendChild(make("line", {
      x1: rodP[0], y1: rodP[1], x2: rodStub[0], y2: rodStub[1], class: "rod-stub"
    }));

    // faint reach-lines P->pinA and P->pinB (the two half-axes made visible)
    svg.appendChild(make("line", {
      x1: sx(r.P.x), y1: sy(r.P.y), x2: sx(r.pinA.x), y2: sy(r.pinA.y), class: "reach-line"
    }));
    svg.appendChild(make("line", {
      x1: sx(r.P.x), y1: sy(r.P.y), x2: sx(r.pinB.x), y2: sy(r.pinB.y), class: "reach-line"
    }));

    // the two pins in their grooves
    drawPin(r.pinA);
    drawPin(r.pinB);

    // the marked point, laying down the trace
    svg.appendChild(make("circle", { cx: sx(r.P.x), cy: sy(r.P.y), r: 11, class: "tracer-halo" }));
    svg.appendChild(make("circle", { cx: sx(r.P.x), cy: sy(r.P.y), r: 6.5, class: "tracer" }));

    // Ping when the mark arrives at a fresh circle or straight-line limit —
    // never on the first paint, never while motion is turned down.
    if (lastCase !== null && r.name !== lastCase && r.name !== "ellipse" && !motionOff()) {
      var halo = svg.querySelector(".tracer-halo");
      if (halo) halo.classList.add("pinged");
    }
    lastCase = r.name;
  }

  function drawPin(pt) {
    svg.appendChild(make("circle", { cx: sx(pt.x), cy: sy(pt.y), r: 6, class: "pin" }));
    svg.appendChild(make("circle", { cx: sx(pt.x), cy: sy(pt.y), r: 2.1, class: "pin-core" }));
  }

  // ---- readout ----
  function paint(r) {
    el.caseName.textContent = r.name;
    el.caseName.className = "read-num mono" +
      (r.isCircle ? " is-circle" : (r.isLine ? " is-line" : ""));
    el.eq.textContent = r.isLine
      ? (r.a === 0 ? "x = 0  (a straight line)" : "y = 0  (a straight line)")
      : "x²/" + r.a + "² + y²/" + r.b + "² = 1";
    el.a.textContent = String(r.a);
    el.b.textContent = String(r.b);
    el.e.textContent = r.ecc.toFixed(3);
    el.area.textContent = group(r.area);
    el.t.textContent = Math.round(r.t) + "°";
    el.aVal.textContent = String(r.a);
    el.bVal.textContent = String(r.b);
    el.tValLabel.textContent = Math.round(r.t) + "°";
  }

  // Speak the settled shape, not every degree of the turn. A live region read
  // on every frame would flood a screen reader, so the announcement is debounced
  // and phrased as words a reader voices cleanly — no "×", no superscripts.
  var announceTimer = null;
  function announce(r) {
    var msg;
    if (r.isLine) {
      var len = Math.max(r.a, r.b);
      msg = "A straight line, length " + (2 * len) + ", drawn " +
            (r.a === 0 ? "up and down the upright groove." : "along the flat groove.") +
            " The mark sits on one pin, so its reach to that pin is zero.";
    } else if (r.isCircle) {
      msg = "A circle, radius " + r.a + ". The mark is an equal " + r.a +
            " from each pin, and both pins sit at the centre.";
    } else {
      msg = "An ellipse, half-width " + r.a + ", half-height " + r.b +
            ", eccentricity " + r.ecc.toFixed(2) + ". The mark reaches " + r.a +
            " to the upright pin and " + r.b + " to the flat pin.";
    }
    el.status.textContent = msg;
  }
  function scheduleAnnounce(r) {
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { announce(r); }, 400);
  }

  function render() {
    var r = solve();
    draw(r);
    paint(r);
    save();
    scheduleAnnounce(r);
  }

  // ---- control wiring ----
  function setA(v) {
    state.a = clamp(Math.round(v), 0, REACH_MAX);
    if (aRange.value !== String(state.a)) aRange.value = String(state.a);
    render();
  }
  function setB(v) {
    state.b = clamp(Math.round(v), 0, REACH_MAX);
    if (bRange.value !== String(state.b)) bRange.value = String(state.b);
    render();
  }
  function setT(v) {
    var t = ((v % 360) + 360) % 360;
    state.t = t;
    if (tRange.value !== String(Math.round(t))) tRange.value = String(Math.round(t));
    render();
  }

  // ---- the rod turning under its own power ----
  var rafId = null, lastTs = null;
  function tick(ts) {
    if (!state.running) return;
    if (lastTs === null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    lastTs = ts;
    setT(state.t + TURN_RATE * dt);
    rafId = window.requestAnimationFrame(tick);
  }
  function setRunning(on) {
    state.running = on;
    turnBtn.setAttribute("aria-pressed", on ? "true" : "false");
    turnBtn.textContent = on ? "Stop" : "Turn";
    if (on) {
      lastTs = null;
      rafId = window.requestAnimationFrame(tick);
    } else if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  aRange.addEventListener("input", function () { setA(parseFloat(aRange.value)); });
  bRange.addEventListener("input", function () { setB(parseFloat(bRange.value)); });
  tRange.addEventListener("input", function () {
    if (state.running) setRunning(false);        // scrubbing takes the wheel
    setT(parseFloat(tRange.value));
  });
  turnBtn.addEventListener("click", function () { setRunning(!state.running); });
  circleBtn.addEventListener("click", function () { setB(state.a); });   // equal reaches -> circle
  lineBtn.addEventListener("click", function () { setB(0); });            // a zero reach -> line
  resetBtn.addEventListener("click", function () {
    setRunning(false);
    setA(DEFAULTS.a); setB(DEFAULTS.b); setT(DEFAULTS.t);
  });
  if (reduceMQ) {
    var onMotionChange = function () { render(); };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotionChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onMotionChange);   // older browsers
  }

  // Keyboard: work the bench without the mouse. Arrows turn the rod; brackets
  // work the reach to the upright pin, the minus/equals keys the reach to the
  // flat pin. When a range slider itself holds focus its native arrow-stepping
  // is left alone, so the two never fight.
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var onRange = (e.target === aRange || e.target === bRange || e.target === tRange);
    switch (e.key) {
      case "ArrowLeft":  if (onRange) return; if (state.running) setRunning(false); setT(state.t - 5); break;
      case "ArrowRight": if (onRange) return; if (state.running) setRunning(false); setT(state.t + 5); break;
      case "[": setA(state.a - 5); break;
      case "]": setA(state.a + 5); break;
      case "-": setB(state.b - 5); break;
      case "=": setB(state.b + 5); break;
      case "t": case "T": setRunning(!state.running); break;
      case "c": case "C": setB(state.a); break;
      case "l": case "L": setB(0); break;
      case "r": case "R": setRunning(false); setA(DEFAULTS.a); setB(DEFAULTS.b); setT(DEFAULTS.t); break;
      default: return;
    }
    e.preventDefault();
  });

  // ---- boot ----
  aRange.max = REACH_MAX;
  bRange.max = REACH_MAX;
  restore();
  setA(state.a); setB(state.b); setT(state.t);
})();
