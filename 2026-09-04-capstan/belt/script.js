/* Belt — a bench for the capstan equation, the law that lets a slack belt carry a mill's whole
 * power. Wrap a flat belt round a pulley and the tension in it bleeds away exponentially round
 * the arc of contact: the tight side may stand at e^(μθ) times the slack side before the belt
 * slips, and the difference between them is the pull it delivers to the shaft. In the arena, 2026-09-04.
 *
 * Follow the rope through a small angle dθ. It presses on the drum with a force set by its own
 * tension T, and friction on that patch removes a slice of tension proportional to both:
 *
 *     dT = −μ · T · dθ           the loss is proportional to the tension itself
 *     T(θ) = T_load · e^(−μθ)    so it decays exponentially round the wrap
 *     A = T_load / T_hold = e^(μθ)   one newton on the tail holds A newtons of ship
 *
 * The amplification depends on ONLY the wrap angle θ and the surface roughness μ — never on the
 * drum's radius, nor the rope's thickness. Each full turn adds 2π to θ and so multiplies A by
 * e^(2πμ): amplification is not added a turn at a time, it compounds. The stage draws the wrap
 * as a spiral coloured and weighted by the tension surviving to each point, and the diagram
 * below plots that same decay against the wrap, with the line of a single steady human pull.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var VBW = 640, VBH = 520;

  // ---- per-page configuration (the one block that differs between the three benches) ----
  var CFG = {
    storeKey: "arena.capstan.belt.v1",
    loadMin: 0, loadMax: 8000, loadNom: 3000,      // the tight-side tension, newtons
    handRef: 500,                                  // the slack side set up in the belt, newtons
    turnsDefault: 1, muDefault: 0.4,
    actionOff: "Drive it",                         // press to bring the tight-side pull on
    actionOn: "Back off",                          // press again to let it off
    holdLabel: "slack",
    loadLabel: "tight",
    handNote: "slack set up",
    stateFast: "grips — the belt carries it, no slip",
    stateSurge: "slip — the belt won't carry it; more wrap or tension"
  };

  var T_MIN = 0.5, T_MAX = 5;                       // turns
  var MU_MIN = 0.1, MU_MAX = 0.6;                   // surface roughness

  var state = { turns: CFG.turnsDefault, mu: CFG.muDefault, load: CFG.loadNom };

  // Motion preference — a reader who asks for less motion gets no ramping sweep. The action
  // then steps the load one notch at a time instead of running it smoothly on; re-checked live.
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOff() { return !!(reduceMQ && reduceMQ.matches); }

  // ---- stage geometry (viewBox units) ----
  var Cx = 250, Cy = 178, Rd = 42;                 // drum centre and radius
  var GAP = 6.4, PAD = 9;                           // spiral loop spacing, and its gap off the drum

  // ---- tension diagram box ----
  var PX0 = 70, PX1 = 596, DTOP = 348, DBOT = 470, DZERO = 470;

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var turnRange = document.getElementById("turnRange");
  var muRange = document.getElementById("muRange");
  var runBtn = document.getElementById("runBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    big: document.getElementById("readBig"),
    eq: document.getElementById("rbEq"),
    turns: document.getElementById("rfTurns"),
    theta: document.getElementById("rfTheta"),
    mu: document.getElementById("rfMu"),
    amp: document.getElementById("rfAmp"),
    load: document.getElementById("rfLoad"),
    hold: document.getElementById("rfHold"),
    turnVal: document.getElementById("turnVal"),
    muVal: document.getElementById("muVal"),
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
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function polar(cx, cy, ang, r) { return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; }
  function label(x, y, anchor, text, cls) {
    var t = make("text", { x: f1(x), y: f1(y), "text-anchor": anchor, class: cls || "lane-tick" });
    t.textContent = text;
    return add(t);
  }
  function fmtF(n) {
    n = Math.round(n);
    var a = Math.abs(n);
    if (a >= 10000) return (n / 1000).toFixed(1) + " kN";
    if (a >= 1000) return (n / 1000).toFixed(2) + " kN";
    return n + " N";
  }

  // ---- the derived quantities ----
  function theta() { return state.turns * 2 * Math.PI; }           // total wrap, radians
  function amp() { return Math.exp(state.mu * theta()); }          // e^(μθ)
  function hold() { return state.load / amp(); }                   // T_hold = T_load·e^(−μθ)
  function maxOneHand() { return CFG.handRef * amp(); }            // largest load one pull holds
  function surging() { return hold() > CFG.handRef + 1e-6; }       // the tail cannot hold it

  // Keep the bench as you left it — the wrap, the surface and the applied load. Reset restores
  // the nominal wrap on a clean surface, the load at its nominal.
  function save() {
    try {
      localStorage.setItem(CFG.storeKey, JSON.stringify({
        turns: state.turns, mu: state.mu, load: state.load
      }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(CFG.storeKey);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && isFinite(s.turns)) state.turns = clamp(Math.round(s.turns / 0.25) * 0.25, T_MIN, T_MAX);
      if (s && isFinite(s.mu)) state.mu = clamp(Math.round(s.mu * 100) / 100, MU_MIN, MU_MAX);
      if (s && isFinite(s.load)) state.load = clamp(s.load, CFG.loadMin, CFG.loadMax);
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }

  // ---- drawing ----
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    add(make("rect", { x: 4, y: 4, width: VBW - 8, height: VBH - 8, rx: 14, class: "svg-frame" }));
    drawDrum();
    drawWrap();
    drawState();
    drawDiagram();
  }

  // The pulley on its shaft — the sheave the flat belt is led round.
  function drawDrum() {
    add(make("circle", { cx: Cx, cy: Cy, r: Rd, class: "drum-body" }));
    add(make("circle", { cx: Cx, cy: Cy, r: Rd - 4, class: "drum-cap", fill: "none", "stroke-width": 1.2 }));
    add(make("circle", { cx: Cx, cy: Cy, r: Rd * 0.34, class: "drum-cap" }));
    // the shaft keyway
    add(make("rect", { x: Cx - 2.4, y: Cy - Rd * 0.34, width: 4.8, height: 6, class: "drum-centre" }));
    add(make("circle", { cx: Cx, cy: Cy, r: 3.2, class: "drum-centre" }));
    label(Cx, Cy + Rd + PAD + state.turns * GAP + 16, "middle", "pulley", "drum-label");
  }

  // point on the wrap at wrap-angle a (0 at the load end, θ at the hold end). The load end sits
  // at the outer radius; the rope draws inward toward the drum as it loses tension round the arc.
  var A0 = 32 * Math.PI / 180;                       // load attaches lower-right of the drum
  function wrapPt(a) {
    var th = theta();
    var r = Rd + PAD + ((th - a) / (2 * Math.PI)) * GAP;
    return polar(Cx, Cy, A0 + a, r);
  }
  function tFrac(a) { return Math.exp(-state.mu * a); }   // tension surviving to wrap-angle a

  function drawWrap() {
    var th = theta();
    var steps = Math.max(80, Math.round(state.turns * 90));
    var i, a, p, prev = wrapPt(0), tf, surge = surging();
    // the spiral, segment by segment, each weighted and dimmed by the tension surviving to it
    for (i = 1; i <= steps; i++) {
      a = th * i / steps;
      p = wrapPt(a);
      tf = tFrac((a + th * (i - 1) / steps) / 2);      // tension at the segment midpoint
      add(make("line", {
        x1: f1(prev[0]), y1: f1(prev[1]), x2: f1(p[0]), y2: f1(p[1]),
        class: "wrap-seg",
        "stroke-width": f1(2 + 5.4 * tf),
        "stroke-opacity": f1(0.16 + 0.84 * tf)
      }));
      prev = p;
    }
    // the load lead — off the outer end toward the ship, thick and bright
    var p0 = wrapPt(0), dir0 = A0 + 0;
    var lend = polar(Cx, Cy, dir0, Rd + PAD + (th / (2 * Math.PI)) * GAP + 96);
    add(make("line", { x1: f1(p0[0]), y1: f1(p0[1]), x2: f1(lend[0]), y2: f1(lend[1]),
      class: "lead-load" + (surge ? " surge" : ""), "stroke-width": 7 }));
    arrowHead(lend, dir0, "arrow-load");
    label(lend[0] + 4, lend[1] + 20, "end", CFG.loadLabel, "end-cap load");
    label(lend[0] + 4, lend[1] + 36, "end", fmtF(state.load), "end-val load");

    // the hold lead — off the inner end toward the hand, thin and faint (the little that is left)
    var pT = wrapPt(th), dirT = A0 + th;
    var hend = polar(Cx, Cy, dirT, Rd + PAD + 74);
    // route it up and away so the tail reads as tended beside the post
    var mx = (pT[0] + hend[0]) / 2, my = Math.min(pT[1], hend[1]) - 46;
    var path = "M " + f1(pT[0]) + " " + f1(pT[1]) + " Q " + f1(mx) + " " + f1(my) +
               " " + f1(hend[0]) + " " + f1(hend[1]);
    add(make("path", { d: path, class: "lead-hold", "stroke-width": f1(2 + 2.4 * tFrac(th)), fill: "none" }));
    add(make("circle", { cx: f1(hend[0]), cy: f1(hend[1]), r: 4, class: "hold-dot" }));
    label(hend[0], hend[1] - 10, "middle", CFG.holdLabel, "end-cap hold");
    label(hend[0], hend[1] - 26, "middle", fmtF(hold()), "end-val hold");
  }

  function arrowHead(pt, ang, cls) {
    var w = 7;
    var b1 = polar(pt[0], pt[1], ang + 2.5, w), b2 = polar(pt[0], pt[1], ang - 2.5, w);
    add(make("polygon", { points: f1(pt[0]) + "," + f1(pt[1]) + " " + f1(b1[0]) + "," + f1(b1[1]) +
      " " + f1(b2[0]) + "," + f1(b2[1]), class: cls }));
  }

  function drawState() {
    var surge = surging();
    label(VBW / 2, 28, "middle", surge ? CFG.stateSurge : CFG.stateFast,
      "state-cap " + (surge ? "surge" : "fast"));
  }

  // ---- the tension diagram: T/T_load = e^(−μθ) round the wrap ----
  function xForFrac(fr) { return PX0 + fr * (PX1 - PX0); }
  function yForFrac(fr) { return DZERO - fr * (DBOT - DTOP); }

  function drawDiagram() {
    var th = theta();
    add(make("rect", { x: PX0, y: DTOP, width: PX1 - PX0, height: DBOT - DTOP, rx: 5, class: "lane-frame" }));

    // gridlines at each whole turn
    var t, x;
    for (t = 1; t <= 5; t++) {
      if (t > state.turns) break;
      x = xForFrac(t / state.turns);
      add(make("line", { x1: f1(x), y1: DTOP, x2: f1(x), y2: DBOT, class: "lane-div" }));
    }

    // the decay curve T/T_load against wrap fraction, filled beneath
    var pts = [], fill = ["M " + f1(PX0) + " " + f1(DZERO)], i, fr, tf, xx, yy;
    var N = 120;
    for (i = 0; i <= N; i++) {
      fr = i / N;
      tf = Math.exp(-state.mu * (fr * th));
      xx = xForFrac(fr); yy = yForFrac(tf);
      pts.push(f1(xx) + "," + f1(yy));
      fill.push("L " + f1(xx) + " " + f1(yy));
    }
    fill.push("L " + f1(PX1) + " " + f1(DZERO) + " Z");
    add(make("path", { d: fill.join(" "), class: "plot-fill" }));
    add(make("polyline", { points: pts.join(" "), class: "plot-tension" }));

    // the line of a single steady human pull, as a fraction of the present load
    var handFr = CFG.handRef / state.load;
    if (handFr <= 1.02) {
      var hy = yForFrac(clamp(handFr, 0, 1));
      add(make("line", { x1: PX0, y1: f1(hy), x2: PX1, y2: f1(hy), class: "hand-line" }));
      label(PX1 - 4, f1(hy) - 5, "end", CFG.handNote, "hand-cap");
    }

    // the hold point at the end of the wrap, and the load point at its start
    var holdFr = Math.exp(-state.mu * th);
    add(make("circle", { cx: xForFrac(1), cy: f1(yForFrac(holdFr)), r: 4, class: "hold-dot" }));
    add(make("circle", { cx: xForFrac(0), cy: f1(yForFrac(1)), r: 4, class: "load-dot" }));

    // captions + axis
    label(PX0 + 6, DTOP + 14, "start", "T ⁄ T_load", "tension-cap");
    label(PX0, DBOT + 15, "middle", "0", "lane-tick");
    label(PX1, DBOT + 15, "end", f1(state.turns) + " turns · " + Math.round(state.turns * 360) + "°", "lane-tick");
    label((PX0 + PX1) / 2, DBOT + 15, "middle", "wrap →", "lane-label");
  }

  // ---- readout ----
  function paint() {
    el.big.textContent = Math.round(amp()) + "×";
    el.turns.textContent = f1(state.turns);
    el.theta.textContent = Math.round(state.turns * 360) + "°";
    el.mu.textContent = state.mu.toFixed(2);
    el.amp.textContent = Math.round(amp()) + "×";
    el.load.textContent = fmtF(state.load);
    el.hold.textContent = fmtF(hold());

    el.turnVal.textContent = f1(state.turns);
    el.muVal.textContent = state.mu.toFixed(2);
  }

  // Speak the settled state to a screen reader, debounced past a slider drag or a load ramp.
  var announceTimer = null;
  function scheduleAnnounce() {
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(speak, 420);
  }
  function speak() {
    if (!el.status) return;
    el.status.textContent =
      f1(state.turns) + " turns of wrap — a contact angle of " + Math.round(state.turns * 360) +
      " degrees — on a surface of mu " + state.mu.toFixed(2) + ". The tight side may stand at " +
      Math.round(amp()) + " times the slack before the belt slips, so a slack side of " + fmtF(hold()) +
      " anchors a tight side of " + fmtF(state.load) + ". " +
      (surging()
        ? "That tight side is beyond what the slack set up will carry — the belt slips; add wrap or tension."
        : "The set-up slack carries that, up to a tight side of " + fmtF(maxOneHand()) + ".");
  }

  function renderLight() { draw(); paint(); }
  function render() { draw(); paint(); save(); scheduleAnnounce(); }

  // ---- the "take the strain" ramp: bring the load on (or ease it off) ----
  var raf = null, lastTs = 0, target = state.load;
  function strained() { return target > CFG.loadMin + 1; }
  function setPressed(on) {
    runBtn.setAttribute("aria-pressed", on ? "true" : "false");
    runBtn.textContent = on ? CFG.actionOn : CFG.actionOff;
  }
  function stopAnim() { if (raf) { window.cancelAnimationFrame(raf); raf = null; } lastTs = 0; }

  function toggleStrain() {
    if (motionOff()) {                               // reduced motion: step the load one notch
      var step = (CFG.loadMax - CFG.loadMin) / 6;
      var next = state.load + step;
      if (next > CFG.loadMax - 1) next = CFG.loadMin;  // wrap back to slack when full
      setLoad(next);
      target = state.load;
      setPressed(strained());
      return;
    }
    target = strained() ? CFG.loadMin : CFG.loadMax;
    setPressed(target > CFG.loadMin + 1);
    if (!raf) { lastTs = 0; raf = window.requestAnimationFrame(ramp); }
  }
  function ramp(ts) {
    if (!lastTs) lastTs = ts;
    var dt = (ts - lastTs) / 1000; lastTs = ts;
    var speed = (CFG.loadMax - CFG.loadMin) / 2.2;    // full sweep in ~2.2 s
    var dir = target > state.load ? 1 : -1;
    var nl = state.load + dir * speed * dt;
    if ((dir > 0 && nl >= target) || (dir < 0 && nl <= target)) {
      state.load = target; renderLight(); save(); scheduleAnnounce(); stopAnim(); return;
    }
    state.load = nl; renderLight();
    raf = window.requestAnimationFrame(ramp);
  }

  // ---- control wiring ----
  function setTurns(v) {
    state.turns = clamp(Math.round(v / 0.25) * 0.25, T_MIN, T_MAX);
    if (turnRange.value !== String(state.turns)) turnRange.value = String(state.turns);
    render();
  }
  function setMu(v) {
    state.mu = clamp(Math.round(v * 100) / 100, MU_MIN, MU_MAX);
    if (muRange.value !== String(state.mu)) muRange.value = String(state.mu);
    render();
  }
  function setLoad(v) {
    state.load = clamp(v, CFG.loadMin, CFG.loadMax);
    render();
  }

  turnRange.addEventListener("input", function () { setTurns(parseFloat(turnRange.value)); });
  muRange.addEventListener("input", function () { setMu(parseFloat(muRange.value)); });
  runBtn.addEventListener("click", toggleStrain);

  if (reduceMQ) {
    var onMotionChange = function () { if (motionOff() && raf) { target = state.load; stopAnim(); setPressed(strained()); } };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotionChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onMotionChange);   // older browsers
  }

  function doReset() {
    stopAnim();
    try { localStorage.removeItem(CFG.storeKey); } catch (e) { /* nothing to clear */ }
    state.load = CFG.loadNom; target = state.load;
    setPressed(strained());
    setTurns(CFG.turnsDefault); setMu(CFG.muDefault);
  }
  resetBtn.addEventListener("click", doReset);

  // haul or ease the load by hand — a small step, stopping any ramp first
  function nudgeLoad(dir) {
    stopAnim(); target = state.load;
    setLoad(state.load + dir * (CFG.loadMax - CFG.loadMin) / 40);
    setPressed(strained());
  }

  // Keyboard: work the whole bench without the mouse. Arrows ease / haul the load; brackets
  // change the wrap; minus/equals slick or grip the surface; Space works the action; R resets.
  // A focused range slider keeps its native arrow-stepping, and a focused button its own Space.
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var onRange = (e.target === turnRange || e.target === muRange);
    var onButton = (e.target === runBtn || e.target === resetBtn);
    switch (e.key) {
      case "ArrowLeft":  if (onRange) return; nudgeLoad(-1); break;
      case "ArrowRight": if (onRange) return; nudgeLoad(1); break;
      case "[": setTurns(state.turns - 0.25); break;
      case "]": setTurns(state.turns + 0.25); break;
      case "-": setMu(state.mu - 0.01); break;
      case "=": setMu(state.mu + 0.01); break;
      case " ": case "Spacebar":
        if (onButton) return;
        toggleStrain(); break;
      case "r": case "R": doReset(); break;
      default: return;
    }
    e.preventDefault();
  });

  // ---- boot ----
  turnRange.min = T_MIN; turnRange.max = T_MAX;
  muRange.min = MU_MIN; muRange.max = MU_MAX;
  restore();
  target = state.load;
  setPressed(strained());
  setTurns(state.turns); setMu(state.mu);
})();
