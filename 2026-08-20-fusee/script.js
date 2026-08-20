/* Fusee — a bench for the cone that makes a fading mainspring drive a clock at a
 * constant force. In the arena, 2026-08-20.
 *
 * A coiled mainspring obeys Hooke's law: the torque it returns falls very nearly
 * in proportion to how far it is still wound, from a full-wound τ_max down to a
 * run-down τ_min. Held in a barrel of fixed radius R, it pulls the chain with a
 * tension F = τ_spring / R that fades with it. The chain wraps the fusee and drives
 * the train through the fusee's arbor, so the torque handed on is
 *     τ_out = F · r(w) = (τ_spring / R) · r(w).
 * For τ_out to hold level while τ_spring sinks, the fusee radius must rise in exact
 * inverse proportion to the spring's torque, r(w) ∝ 1 / τ_spring(w). The cone's
 * profile is the reciprocal of the mainspring's torque curve — narrow where the
 * spring is strong, flared where it is weak — and its flare r_max/r_min is forced
 * to equal the spring's droop τ_max/τ_min. Take the fusee away and the train is
 * driven straight off the barrel, its torque drooping with the spring by the full
 * ratio: the very error the fusee was cut to erase.
 *
 * Normalisation used throughout: τ_max = 1, so τ_min = 1/ρ where ρ = τ_max/τ_min
 * is the "spring droop". Then τ_spring(w) = 1/ρ + (1 − 1/ρ)·w, the fusee radius in
 * units of its smallest is radius(w) = 1/τ_spring(w) (running 1 at full wind up to
 * ρ run down), and with the fusee in place τ_out = τ_spring · radius = 1, flat.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // viewBox — mechanism up top, a torque-versus-wind plot along the foot
  var VBW = 640, VBH = 470;

  var WIND_MIN = 0, WIND_MAX = 100;         // percent still wound
  var DROOP_MIN = 120, DROOP_MAX = 400;     // ρ = τ_max/τ_min, ×100
  var TURNS_MIN = 4, TURNS_MAX = 16;        // turns of chain the fusee holds

  var RUN_MS = 4200;                        // sweep time for Run, full to empty

  var DEFAULTS = { wind: 62, droop: 260, turns: 8 };
  var STORE_KEY = "arena.fusee.v1";

  // mechanism geometry (viewBox units)
  var BC = { x: 150, y: 170 }, RB = 62;     // barrel centre and drawn radius
  var FX = 462, FBASE = 300, FAPEX = 72;    // fusee axis, base (run down), apex (wound)
  var FH = FBASE - FAPEX;                    // cone height on the page
  var W_APEX = 15;                          // half-width of the cone at its wound tip
  var GROUND = 322;                         // the bedplate the movement stands on

  // the torque plot along the foot
  var PX0 = 72, PX1 = 596, PY_TOP = 360, PY_BOT = 452;
  var T_CEIL = 1.12;                        // torque at the top of the plot

  var state = { wind: DEFAULTS.wind, droop: DEFAULTS.droop, turns: DEFAULTS.turns };
  var fuseeOn = true;                       // false = train driven straight off the barrel

  // Motion preference — a reader who asks for less motion gets no run-down sweep:
  // the spring steps straight to empty. Re-checked live, so toggling the system
  // setting takes effect without a reload.
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOff() { return !!(reduceMQ && reduceMQ.matches); }

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var windRange = document.getElementById("windRange");
  var droopRange = document.getElementById("droopRange");
  var turnsRange = document.getElementById("turnsRange");
  var runBtn = document.getElementById("runBtn");
  var fuseeBtn = document.getElementById("fuseeBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    big: document.getElementById("readBig"),
    cap: document.getElementById("readCap"),
    eq: document.getElementById("rbEq"),
    barrel: document.getElementById("rfBarrel"),
    radius: document.getElementById("rfRadius"),
    product: document.getElementById("rfProduct"),
    flare: document.getElementById("rfFlare"),
    droop: document.getElementById("rfDroop"),
    swing: document.getElementById("rfSwing"),
    windVal: document.getElementById("windVal"),
    droopVal: document.getElementById("droopVal"),
    turnsVal: document.getElementById("turnsVal")
  };

  // ---- small helpers ----
  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]); }
    return node;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function add(node) { svg.appendChild(node); return node; }

  // Keep the bench as you left it, across visits — the wind, the spring droop and
  // the turns, but not whether the fusee had been taken off (a page should open
  // with the cone fitted and the drive held level, not mid-demonstration).
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        wind: state.wind, droop: state.droop, turns: state.turns
      }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s.wind === "number" && isFinite(s.wind)) state.wind = clamp(s.wind, WIND_MIN, WIND_MAX);
      if (s && typeof s.droop === "number" && isFinite(s.droop)) state.droop = clamp(s.droop, DROOP_MIN, DROOP_MAX);
      if (s && typeof s.turns === "number" && isFinite(s.turns)) state.turns = clamp(s.turns, TURNS_MIN, TURNS_MAX);
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }
  function label(x, y, anchor, text, cls) {
    var t = make("text", { x: x, y: y, "text-anchor": anchor, class: cls || "plot-tick" });
    t.textContent = text;
    return add(t);
  }

  // ---- the physics, all from ρ and the wind ----
  function rho() { return state.droop / 100; }                 // τ_max / τ_min
  function tauMin() { return 1 / rho(); }                       // τ_max ≡ 1
  function windFrac() { return state.wind / 100; }             // 0 run down, 1 wound
  function tauBarrel(w) { var tm = tauMin(); return tm + (1 - tm) * w; }
  function radiusNorm(w) { return 1 / tauBarrel(w); }          // in units of the tip radius r₀

  // ---- fusee profile on the page ----
  // profile parameter p runs 0 at the base (run down, widest) to 1 at the apex
  // (wound, narrowest); the half-width there is the reciprocal law, exactly the
  // radius the chain rides when the spring is wound to that same level.
  function halfW(p) { return W_APEX * radiusNorm(p); }
  function yAt(p) { return FBASE - p * FH; }

  // ---- drawing ----
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    add(make("rect", { x: 4, y: 4, width: VBW - 8, height: VBH - 8, rx: 14, class: "svg-frame" }));

    drawBedplate();
    drawBarrel();
    drawFusee();
    drawChain();
    drawPlot();
  }

  function drawBedplate() {
    var gx0 = 40, gx1 = 600;
    add(make("line", { x1: gx0, y1: GROUND, x2: gx1, y2: GROUND, class: "bedplate" }));
    for (var hx = gx0 + 8; hx < gx1; hx += 15) {
      add(make("line", { x1: hx, y1: GROUND, x2: hx - 8, y2: GROUND + 9, class: "bed-hatch" }));
    }
  }

  function drawBarrel() {
    // the drum, seen end-on, with the coiled mainspring inside
    add(make("line", { x1: BC.x, y1: GROUND, x2: BC.x, y2: BC.y, class: "arbor" }));
    add(make("circle", { cx: BC.x, cy: BC.y, r: RB, class: "barrel-body" }));
    add(make("circle", { cx: BC.x, cy: BC.y, r: RB - 6, class: "barrel-rim" }));

    // an Archimedean spiral, wound tighter the fuller the spring
    var w = windFrac();
    var turns = 3 + 4 * w;
    var thetaMax = turns * 2 * Math.PI;
    var rInner = 8, rOuter = RB - 10;
    var b = (rOuter - rInner) / thetaMax;
    var pts = [];
    for (var th = 0; th <= thetaMax; th += 0.18) {
      var r = rInner + b * th;
      pts.push((BC.x + r * Math.cos(th)).toFixed(1) + "," + (BC.y + r * Math.sin(th)).toFixed(1));
    }
    add(make("polyline", { points: pts.join(" "), class: "spring-coil" }));
    add(make("circle", { cx: BC.x, cy: BC.y, r: 3.4, class: "pivot" }));
    label(BC.x, GROUND + 22, "middle", "mainspring · barrel", "barrel-label");
  }

  function drawFusee() {
    var off = fuseeOn ? "" : " is-off";

    // the cone's silhouette: reciprocal profile up the left edge, back down the right
    var left = [], right = [], i, p;
    for (i = 0; i <= 48; i++) {
      p = i / 48;
      left.push((FX - halfW(p)).toFixed(1) + "," + yAt(p).toFixed(1));
      right.push((FX + halfW(p)).toFixed(1) + "," + yAt(p).toFixed(1));
    }
    right.reverse();
    var d = "M " + left.join(" L ") + " L " + right.join(" L ") + " Z";
    add(make("path", { d: d, class: "fusee-body" + off }));

    // the fusee arbor, down through the great wheel to the bedplate
    add(make("line", { x1: FX, y1: FAPEX - 6, x2: FX, y2: GROUND, class: "fusee-axis" }));

    // helical grooves — the front arc of each wrap of the chain track
    var g = state.turns;
    for (i = 1; i <= g; i++) {
      p = i / (g + 1);
      var hw = halfW(p), y = yAt(p);
      add(make("path", {
        d: "M " + (FX - hw).toFixed(1) + " " + y.toFixed(1) +
           " A " + hw.toFixed(1) + " " + (hw * 0.18).toFixed(1) + " 0 0 0 " +
           (FX + hw).toFixed(1) + " " + y.toFixed(1),
        class: "fusee-groove" + off
      }));
    }

    // the great wheel the fusee turns — the movement's first wheel
    var gw = { x: FX, y: GROUND - 4, r: 30 };
    add(make("circle", { cx: gw.x, cy: gw.y, r: gw.r, class: "great-wheel" }));
    for (i = 0; i < 28; i++) {
      var a = (i / 28) * 2 * Math.PI;
      add(make("line", {
        x1: (gw.x + gw.r * Math.cos(a)).toFixed(1), y1: (gw.y + gw.r * Math.sin(a)).toFixed(1),
        x2: (gw.x + (gw.r + 4) * Math.cos(a)).toFixed(1), y2: (gw.y + (gw.r + 4) * Math.sin(a)).toFixed(1),
        class: "great-tooth"
      }));
    }
    add(make("circle", { cx: gw.x, cy: gw.y, r: 3.4, class: "pivot" }));
    label(FX + halfW(0) + 8, yAt(0.12), "start", "fusee", "fusee-label");
  }

  function drawChain() {
    var w = windFrac();
    var contact = { x: FX - halfW(w), y: yAt(w) };

    if (fuseeOn) {
      // chain from the barrel rim across to wherever it rides the cone
      var dx = contact.x - BC.x, dy = contact.y - BC.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var bx = BC.x + RB * dx / len, by = BC.y + RB * dy / len;
      add(make("line", { x1: bx.toFixed(1), y1: by.toFixed(1), x2: contact.x.toFixed(1), y2: contact.y.toFixed(1), class: "chain-line" }));
      // a few links strung along it
      var links = 7;
      for (var i = 1; i < links; i++) {
        var lx = bx + (contact.x - bx) * i / links, ly = by + (contact.y - by) * i / links;
        add(make("circle", { cx: lx.toFixed(1), cy: ly.toFixed(1), r: 2.2, class: "chain-link" }));
      }
      // the radius the chain is riding, drawn from the axis out to the contact
      add(make("line", { x1: FX, y1: contact.y.toFixed(1), x2: contact.x.toFixed(1), y2: contact.y.toFixed(1), class: "radius-line" }));
      add(make("circle", { cx: contact.x.toFixed(1), cy: contact.y.toFixed(1), r: 4.5, class: "contact-dot" }));
      label((FX + contact.x) / 2, contact.y - 6, "middle", radiusNorm(w).toFixed(2) + " r₀", "radius-cap");
    } else {
      // no cone: the barrel drives the great wheel straight, at the barrel's own torque
      add(make("line", { x1: BC.x + RB, y1: BC.y, x2: FX - 34, y2: GROUND - 4, class: "direct-drive" }));
      label((BC.x + RB + FX) / 2 - 6, BC.y - 10, "middle", "driven straight off the barrel", "bypass-note");
    }
  }

  // ---- the torque-versus-wind plot ----
  function xForW(w) { return PX0 + (1 - w) * (PX1 - PX0); }   // left = wound, right = run down
  function yForT(t) { return (PY_BOT - 6) - (t / T_CEIL) * ((PY_BOT - 6) - (PY_TOP + 6)); }

  function drawPlot() {
    add(make("rect", { x: PX0, y: PY_TOP, width: PX1 - PX0, height: PY_BOT - PY_TOP, rx: 8, class: "plot-frame" }));

    // the τ_max = 1 gridline
    var y1 = yForT(1);
    add(make("line", { x1: PX0, y1: y1, x2: PX1, y2: y1, class: "plot-axis" }));
    label(PX0 - 6, y1 + 4, "end", "τ_max", "plot-tick");
    label(PX0 + 4, PY_BOT + 14, "start", "wound", "plot-tick");
    label(PX1 - 4, PY_BOT + 14, "end", "run down", "plot-tick");

    // barrel torque: a straight fall from τ_max (wound) to τ_min (run down)
    add(make("line", {
      x1: xForW(1), y1: yForT(tauBarrel(1)), x2: xForW(0), y2: yForT(tauBarrel(0)),
      class: "plot-barrel"
    }));

    // output torque: flat at 1 with the fusee, or drooping with the barrel without it
    if (fuseeOn) {
      add(make("line", { x1: xForW(1), y1: yForT(1), x2: xForW(0), y2: yForT(1), class: "plot-out" }));
      label(xForW(0.5), yForT(1) - 8, "middle", "drive (with fusee)", "plot-label out");
    } else {
      add(make("line", {
        x1: xForW(1), y1: yForT(tauBarrel(1)), x2: xForW(0), y2: yForT(tauBarrel(0)),
        class: "plot-out is-off"
      }));
      label(xForW(0.42), yForT(tauBarrel(0.42)) + 16, "middle", "drive (no fusee)", "plot-label barrel");
    }
    if (fuseeOn) label(xForW(0.5), yForT(tauBarrel(0.5)) + 15, "middle", "barrel", "plot-label barrel");

    // the moving marks at the current wind
    var w = windFrac();
    var xw = xForW(w);
    add(make("line", { x1: xw, y1: PY_TOP + 6, x2: xw, y2: PY_BOT - 6, class: "plot-axis" }));
    add(make("circle", { cx: xw, cy: yForT(tauBarrel(w)), r: 3.6, class: "plot-barrel-dot" }));
    var outT = fuseeOn ? 1 : tauBarrel(w);
    add(make("circle", { cx: xw, cy: yForT(outT), r: 4.4, class: "plot-dot" + (fuseeOn ? "" : " is-off") }));
  }

  // ---- readout ----
  function paint() {
    var w = windFrac(), tb = tauBarrel(w), rn = radiusNorm(w), r = rho();

    var outT = fuseeOn ? 1 : tb;
    el.big.textContent = outT.toFixed(2) + " ×";
    el.big.className = "read-num mono" + (fuseeOn ? "" : " is-off");
    el.cap.textContent = fuseeOn ? "drive torque" : "drive torque · no fusee";
    el.eq.textContent = fuseeOn ? "τ_out = τ_spring · r(w) ⁄ R = constant" : "τ_out = τ_spring ⁄ R — drooping";

    el.barrel.textContent = tb.toFixed(2) + " ×";
    el.radius.textContent = fuseeOn ? rn.toFixed(2) + " r₀" : "—";
    el.product.textContent = fuseeOn ? (tb * rn).toFixed(2) : "bypassed";
    el.flare.textContent = r.toFixed(1) + " : 1";
    el.droop.textContent = r.toFixed(1) + " : 1";
    el.swing.textContent = fuseeOn ? "0%" : "−" + Math.round((1 - tauMin()) * 100) + "%";

    el.windVal.textContent = state.wind + "%";
    el.droopVal.textContent = r.toFixed(1) + " : 1";
    el.turnsVal.textContent = state.turns + " turns";
  }

  function render() { draw(); paint(); save(); }

  // ---- the Run sweep: let the spring drain from full to empty ----
  var runRaf = null, runStart = 0, runFrom = 1;

  function setRunning(on) {
    runBtn.setAttribute("aria-pressed", on ? "true" : "false");
    runBtn.textContent = on ? "Stop" : "Run down";
  }
  function stopRun() {
    if (runRaf) { window.cancelAnimationFrame(runRaf); runRaf = null; }
    setRunning(false);
  }
  function startRun() {
    if (windFrac() <= 0.02) setWind(WIND_MAX);     // fully run down — wind it first
    if (motionOff()) { setWind(WIND_MIN); return; } // reduced motion: step to empty, no sweep
    runFrom = windFrac();
    runStart = 0;
    setRunning(true);
    runRaf = window.requestAnimationFrame(runStep);
  }
  function runStep(ts) {
    if (!runStart) runStart = ts;
    var k = clamp((ts - runStart) / (RUN_MS * runFrom), 0, 1);
    setWind(Math.round((runFrom * (1 - k)) * 100));
    if (k < 1) runRaf = window.requestAnimationFrame(runStep);
    else { runRaf = null; setRunning(false); }
  }

  // ---- control wiring ----
  function setWind(v) {
    state.wind = clamp(Math.round(v), WIND_MIN, WIND_MAX);
    if (windRange.value !== String(state.wind)) windRange.value = String(state.wind);
    render();
  }
  function setDroop(v) {
    state.droop = clamp(Math.round(v / 5) * 5, DROOP_MIN, DROOP_MAX);
    if (droopRange.value !== String(state.droop)) droopRange.value = String(state.droop);
    render();
  }
  function setTurns(v) {
    state.turns = clamp(Math.round(v), TURNS_MIN, TURNS_MAX);
    if (turnsRange.value !== String(state.turns)) turnsRange.value = String(state.turns);
    render();
  }

  windRange.addEventListener("input", function () { stopRun(); setWind(parseFloat(windRange.value)); });
  droopRange.addEventListener("input", function () { setDroop(parseFloat(droopRange.value)); });
  turnsRange.addEventListener("input", function () { setTurns(parseFloat(turnsRange.value)); });

  runBtn.addEventListener("click", function () { if (runRaf) stopRun(); else startRun(); });
  if (reduceMQ) {
    var onMotionChange = function () {
      if (motionOff() && runRaf) { stopRun(); setWind(WIND_MIN); }   // caught mid-sweep — jump to empty
    };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotionChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onMotionChange);   // older browsers
  }
  fuseeBtn.addEventListener("click", function () {
    fuseeOn = !fuseeOn;
    fuseeBtn.setAttribute("aria-pressed", fuseeOn ? "false" : "true");   // pressed = removed
    fuseeBtn.textContent = fuseeOn ? "Remove the fusee" : "Refit the fusee";
    render();
  });
  resetBtn.addEventListener("click", function () {
    stopRun();
    fuseeOn = true;
    fuseeBtn.setAttribute("aria-pressed", "false");
    fuseeBtn.textContent = "Remove the fusee";
    setWind(DEFAULTS.wind); setDroop(DEFAULTS.droop); setTurns(DEFAULTS.turns);
  });

  // ---- boot ----
  windRange.min = WIND_MIN; windRange.max = WIND_MAX;
  droopRange.min = DROOP_MIN; droopRange.max = DROOP_MAX;
  turnsRange.min = TURNS_MIN; turnsRange.max = TURNS_MAX;
  restore();
  setWind(state.wind); setDroop(state.droop); setTurns(state.turns);
})();
