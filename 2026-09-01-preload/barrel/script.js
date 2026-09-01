/* Barrel — a bench for the seam held shut before the load arrives. Driven hoops put every
 * stave-joint into compression before a drop is poured; the fill only ever eats into that
 * squeeze, and the seam stays watertight until the load finally cancels the preload. In the
 * arena, 2026-09-01. One of three on preload.
 *
 * One seam, two springs pulling against each other: the hoop (in tension) and the ring of
 * staves at that joint (in compression), both set to the same preload F0 when the hoops go
 * on. The fill adds an outward load P. Hoop and staves share the stretch, so only a fraction
 * phi = k_hoop/(k_hoop + k_stave) of each added pound reaches the hoop; the rest is taken off
 * the squeeze:
 *
 *     F_hoop  = F0 + phi*P              the iron feels only the small share phi of the fill
 *     F_joint = F0 - (1-phi)*P          the squeeze that holds the seam, and the one that runs out
 *     P_sep   = F0 / (1 - phi)          the fill at which the squeeze reaches zero and the seam opens
 *
 * Below P_sep the seam is shut and the wood never sees a tensile pound. At it the contact
 * lifts and the cask weeps. The joint diagram, the cask and the fill are all drawn from these
 * three lines.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var PRE_MIN = 20, PRE_MAX = 110;          // preload F0, kN
  var PHI_MIN = 0.15, PHI_MAX = 0.60;       // stiffness split phi
  var P_MAX = 180;                          // fullest fill the bench allows, kN
  var F_MAX = 132;                          // top of the force axis, kN
  var DEFAULTS = { pre: 60, phi: 0.30 };
  var STORE_KEY = "arena.preload.barrel.v1";

  var state = { pre: DEFAULTS.pre, phi: DEFAULTS.phi };
  var load = 0;                             // current fill P, kN (the driven degree of freedom)
  var running = false, dir = 1, raf = 0, tPrev = 0;
  var FILL_RATE = 46;                        // kN per second while filling
  var STEP_P = 12;                           // hand-step of the fill

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var preRange = document.getElementById("preRange");
  var phiRange = document.getElementById("phiRange");
  var runBtn = document.getElementById("runBtn");
  var resetBtn = document.getElementById("resetBtn");
  var el = {
    big: document.getElementById("readBig"),
    cap: document.getElementById("readCap"),
    eq: document.getElementById("rbEq"),
    pre: document.getElementById("rfPre"),
    phi: document.getElementById("rfPhi"),
    p: document.getElementById("rfP"),
    sep: document.getElementById("rfSep"),
    hoop: document.getElementById("rfHoop"),
    margin: document.getElementById("rfMargin"),
    preVal: document.getElementById("preVal"),
    phiVal: document.getElementById("phiVal"),
    status: document.getElementById("status")
  };

  // ---- helpers ----
  function make(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); }
    return n;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function f1(x) { return x.toFixed(1); }
  function f2(x) { return x.toFixed(2); }
  function kN(x) { return Math.round(x) + " kN"; }

  // ---- the physics of one seam ----
  function physics() {
    var F0 = state.pre, phi = state.phi, P = load;
    var Psep = F0 / (1 - phi);
    var Fhoop = F0 + phi * P;
    var Fjoint = F0 - (1 - phi) * P;        // squeeze remaining (may go negative -> open)
    var open = Fjoint <= 0;
    return { F0: F0, phi: phi, P: P, Psep: Psep, Fhoop: Fhoop,
             Fjoint: Fjoint, squeeze: Math.max(0, Fjoint), open: open };
  }

  // ===================== scene geometry =====================
  var CX = 250, Y_TOP = 44, Y_BOT = 292;    // cask top / bottom
  var W_MID = 108, W_END = 0.74;            // bilge half-width, end/bilge ratio
  function halfW(t) {                        // t: 0 top .. 1 bottom
    var s = 2 * t - 1;
    return W_MID * (W_END + (1 - W_END) * (1 - s * s));
  }
  function yAt(t) { return Y_TOP + t * (Y_BOT - Y_TOP); }

  // barrel body outline as a path (front face), reused as a clip for the fill
  function bodyPath() {
    var n = 24, d = "", i, t, x, y;
    // left edge top->bottom
    d += "M " + (CX - halfW(0)) + " " + yAt(0);
    for (i = 1; i <= n; i++) { t = i / n; d += " L " + (CX - halfW(t)) + " " + yAt(t); }
    // right edge bottom->top
    for (i = n; i >= 0; i--) { t = i / n; d += " L " + (CX + halfW(t)) + " " + yAt(t); }
    return d + " Z";
  }

  // ===================== diagram geometry =====================
  var PX0 = 70, PX1 = 600, DTOP = 348, DBOT = 496;
  function px(P) { return PX0 + (P / P_MAX) * (PX1 - PX0); }
  function py(F) { return DBOT - (clamp(F, -F_MAX, F_MAX) / F_MAX) * (DBOT - DTOP); }

  // ---- build the static furniture once, keep handles to the moving parts ----
  var g = {};
  function build() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var defs = make("defs", {});
    var clip = make("clipPath", { id: "caskClip" });
    g.clipPath = make("path", { d: bodyPath() });
    clip.appendChild(g.clipPath);
    defs.appendChild(clip);
    svg.appendChild(defs);

    svg.appendChild(make("rect", { x: 8, y: 8, width: 624, height: 300, rx: 12, class: "svg-frame" }));

    // ---- fill (behind the staves), clipped to the body ----
    var fillG = make("g", { "clip-path": "url(#caskClip)" });
    g.fillRect = make("rect", { x: CX - W_MID - 4, y: Y_BOT, width: 2 * (W_MID + 4), height: 0, class: "load-fill" });
    fillG.appendChild(g.fillRect);
    g.fillTop = make("ellipse", { cx: CX, cy: Y_BOT, rx: 1, ry: 5, fill: "var(--drift)", opacity: 0.32 });
    fillG.appendChild(g.fillTop);
    svg.appendChild(fillG);

    // ---- cask body ----
    svg.appendChild(make("path", { d: bodyPath(), class: "clamp-body", id: "caskBody" }));
    g.body = svg.lastChild;
    // top rim ellipse
    svg.appendChild(make("ellipse", { cx: CX, cy: Y_TOP, rx: halfW(0), ry: 9,
      fill: "none", stroke: "var(--hold)", "stroke-width": 1.4, opacity: 0.6 }));

    // ---- staves (seams) ----
    var sN = 8, u, i;
    for (i = 1; i < sN; i++) {
      u = i / sN;
      if (Math.abs(u - 0.5) < 0.001) continue;   // centre reserved for the marked seam
      var d = "", tt, xx;
      for (var j = 0; j <= 16; j++) {
        tt = j / 16; xx = CX + (2 * u - 1) * halfW(tt);
        d += (j === 0 ? "M " : " L ") + f1(xx) + " " + f1(yAt(tt));
      }
      svg.appendChild(make("path", { d: d, fill: "none", stroke: "var(--rule)", "stroke-width": 1, opacity: 0.55 }));
    }

    // ---- hoops (thickness set by preload) ----
    g.hoops = [];
    var hoopT = [0.07, 0.31, 0.69, 0.93];
    for (i = 0; i < hoopT.length; i++) {
      var hy = yAt(hoopT[i]), hw = halfW(hoopT[i]);
      var band = make("ellipse", { cx: CX, cy: hy, rx: hw, ry: 8, class: "fastener" });
      svg.appendChild(band);
      g.hoops.push(band);
    }

    // ---- the marked seam, down the centre ----
    g.seam = make("line", { x1: CX, y1: Y_TOP + 6, x2: CX, y2: Y_BOT - 4, class: "joint-shut" });
    svg.appendChild(g.seam);
    g.seam2 = make("line", { x1: CX, y1: Y_TOP + 6, x2: CX, y2: Y_BOT - 4, class: "joint-open", opacity: 0 });
    svg.appendChild(g.seam2);
    g.drips = make("g", {});
    svg.appendChild(g.drips);

    // ---- pressure arrows at the bilge ----
    g.pL = make("path", { d: "", class: "load-arrow", "stroke-width": 2, opacity: 0 });
    g.pR = make("path", { d: "", class: "load-arrow", "stroke-width": 2, opacity: 0 });
    svg.appendChild(g.pL); svg.appendChild(g.pR);

    // ---- labels ----
    g.stateCap = make("text", { x: 470, y: 60, "text-anchor": "middle", class: "state-cap safe" });
    g.stateCap.textContent = "shut · watertight";
    svg.appendChild(g.stateCap);
    var hcap = make("text", { x: 470, y: 84, "text-anchor": "middle", class: "piece-cap" });
    hcap.textContent = "the marked seam";
    svg.appendChild(hcap);
    g.fillCap = make("text", { x: 470, y: 108, "text-anchor": "middle", class: "load-cap" });
    svg.appendChild(g.fillCap);

    buildDiagram();
    update();
  }

  function buildDiagram() {
    // frame + bands + axes; the moving lines are kept as handles
    svg.appendChild(make("rect", { x: PX0, y: DTOP, width: PX1 - PX0, height: DBOT - DTOP, class: "lane-frame" }));
    g.bandSafe = make("rect", { x: PX0, y: DTOP, width: 0, height: DBOT - DTOP, class: "lane-band-safe" });
    g.bandGone = make("rect", { x: PX1, y: DTOP, width: 0, height: DBOT - DTOP, class: "lane-band-gone" });
    svg.appendChild(g.bandSafe); svg.appendChild(g.bandGone);

    // zero-force baseline
    svg.appendChild(make("line", { x1: PX0, y1: py(0), x2: PX1, y2: py(0), class: "lane-zero" }));

    // axis captions
    var xc = make("text", { x: (PX0 + PX1) / 2, y: DBOT + 22, "text-anchor": "middle", class: "lane-label" });
    xc.textContent = "applied load  P  (fill) →";
    svg.appendChild(xc);
    var yc = make("text", { x: PX0 - 8, y: DTOP - 8, "text-anchor": "start", class: "lane-label" });
    yc.textContent = "force, kN";
    svg.appendChild(yc);
    // a couple of load ticks
    var tk, v;
    for (var i = 0; i <= 3; i++) {
      v = i * 60; if (v > P_MAX) continue;
      svg.appendChild(make("line", { x1: px(v), y1: DBOT, x2: px(v), y2: DBOT + 4, class: "lane-div" }));
      tk = make("text", { x: px(v), y: DBOT + 22, "text-anchor": "middle", class: "lane-tick" });
      tk.textContent = v; svg.appendChild(tk);
    }

    g.preLine = make("line", { x1: PX0, y1: py(state.pre), x2: PX1, y2: py(state.pre), class: "plot-preload" });
    svg.appendChild(g.preLine);
    g.sepLine = make("line", { x1: 0, y1: DTOP, x2: 0, y2: DBOT, class: "sep-line" });
    svg.appendChild(g.sepLine);
    g.sepCap = make("text", { x: 0, y: DTOP - 8, "text-anchor": "middle", class: "sep-cap" });
    g.sepCap.textContent = "P_sep";
    svg.appendChild(g.sepCap);

    g.lineHoop = make("polyline", { points: "", class: "plot-fastener" });
    g.lineJoint = make("polyline", { points: "", class: "plot-clamp" });
    svg.appendChild(g.lineHoop); svg.appendChild(g.lineJoint);

    g.capHoop = make("text", { x: PX1 - 4, y: 0, "text-anchor": "end", class: "fastener-cap" });
    g.capHoop.textContent = "F_hoop";
    g.capJoint = make("text", { x: PX0 + 6, y: 0, "text-anchor": "start", class: "clamp-cap" });
    g.capJoint.textContent = "squeeze";
    svg.appendChild(g.capHoop); svg.appendChild(g.capJoint);

    g.curLine = make("line", { x1: 0, y1: DTOP, x2: 0, y2: DBOT, class: "cursor-line" });
    g.curF = make("circle", { cx: 0, cy: 0, r: 4.5, class: "cursor-dot-f" });
    g.curC = make("circle", { cx: 0, cy: 0, r: 4.5, class: "cursor-dot-c" });
    svg.appendChild(g.curLine); svg.appendChild(g.curF); svg.appendChild(g.curC);
  }

  // ---- draw everything from the current state ----
  function update() {
    var m = physics();

    // ----- cask -----
    var fr = clamp(m.P / P_MAX, 0, 1);
    var yFill = Y_BOT - fr * (Y_BOT - (Y_TOP + 14));
    g.fillRect.setAttribute("y", yFill);
    g.fillRect.setAttribute("height", Y_BOT - yFill);
    g.fillTop.setAttribute("cy", yFill);
    g.fillTop.setAttribute("rx", fr > 0.003 ? halfW((yFill - Y_TOP) / (Y_BOT - Y_TOP)) - 3 : 1);
    g.fillTop.setAttribute("opacity", fr > 0.003 ? 0.32 : 0);

    // hoop thickness scales with preload
    var hw = 1.6 + 3.4 * (state.pre - PRE_MIN) / (PRE_MAX - PRE_MIN);
    for (var i = 0; i < g.hoops.length; i++) {
      g.hoops[i].setAttribute("stroke-width", f1(hw));
      g.hoops[i].setAttribute("class", m.open ? "fastener fastener-slack" : "fastener");
    }

    // body colour
    g.body.setAttribute("class", m.open ? "clamp-body open" : "clamp-body");

    // marked seam: shut (green) vs sprung (red, gapped, weeping)
    if (m.open) {
      g.seam.setAttribute("opacity", 0);
      g.seam2.setAttribute("opacity", 1);
      // a slight V gap at the bilge
      var yb = yAt(0.5), gap = 2.2;
      g.seam2.setAttribute("x1", CX - gap * 0.4); g.seam2.setAttribute("y1", Y_TOP + 6);
      g.seam2.setAttribute("x2", CX - gap); g.seam2.setAttribute("y2", yb);
      drawDrips(true);
    } else {
      g.seam.setAttribute("opacity", 1);
      g.seam2.setAttribute("opacity", 0);
      drawDrips(false);
    }

    // pressure arrows at the bilge, length by load
    var al = 6 + 40 * fr, yb2 = yAt(0.5);
    if (m.P > 0.5) {
      g.pL.setAttribute("opacity", 0.9); g.pR.setAttribute("opacity", 0.9);
      g.pL.setAttribute("d", arrow(CX - halfW(0.5) - 6, yb2, CX - halfW(0.5) - 6 - al, yb2));
      g.pR.setAttribute("d", arrow(CX + halfW(0.5) + 6, yb2, CX + halfW(0.5) + 6 + al, yb2));
    } else { g.pL.setAttribute("opacity", 0); g.pR.setAttribute("opacity", 0); }

    // captions
    g.stateCap.setAttribute("class", m.open ? "state-cap gone" : "state-cap safe");
    g.stateCap.textContent = m.open ? "sprung · weeping" : "shut · watertight";
    g.fillCap.textContent = "fill  P = " + kN(m.P);

    // ----- diagram -----
    g.preLine.setAttribute("y1", py(m.F0)); g.preLine.setAttribute("y2", py(m.F0));
    var xsep = px(Math.min(m.Psep, P_MAX));
    g.sepLine.setAttribute("x1", xsep); g.sepLine.setAttribute("x2", xsep);
    g.sepCap.setAttribute("x", clamp(xsep, PX0 + 16, PX1 - 16));
    g.sepCap.textContent = m.Psep <= P_MAX ? "P_sep " + Math.round(m.Psep) : "P_sep off-chart";

    g.bandSafe.setAttribute("width", clamp(xsep - PX0, 0, PX1 - PX0));
    var goneX = clamp(xsep, PX0, PX1);
    g.bandGone.setAttribute("x", goneX);
    g.bandGone.setAttribute("width", PX1 - goneX);

    // hoop line across full P
    g.lineHoop.setAttribute("points", px(0) + "," + py(m.F0) + " " + px(P_MAX) + "," + py(m.F0 + m.phi * P_MAX));
    // joint line: falls to zero at Psep, then flat 0
    var pts = px(0) + "," + py(m.F0) + " " + xsep + "," + py(0);
    if (m.Psep < P_MAX) pts += " " + px(P_MAX) + "," + py(0);
    g.lineJoint.setAttribute("points", pts);
    g.lineJoint.setAttribute("class", m.open ? "plot-clamp gone" : "plot-clamp");
    g.capHoop.setAttribute("y", py(m.F0 + m.phi * P_MAX) - 6);
    g.capJoint.setAttribute("y", py(m.F0) - 8);

    // cursor
    var cx2 = px(m.P);
    g.curLine.setAttribute("x1", cx2); g.curLine.setAttribute("x2", cx2);
    g.curF.setAttribute("cx", cx2); g.curF.setAttribute("cy", py(m.Fhoop));
    g.curC.setAttribute("cx", cx2); g.curC.setAttribute("cy", py(Math.max(0, m.Fjoint)));
    g.curC.setAttribute("class", m.open ? "cursor-dot-c gone" : "cursor-dot-c");

    // ----- readout -----
    el.big.textContent = f1(m.squeeze);
    el.big.setAttribute("class", m.open ? "read-num mono gone" : "read-num mono");
    el.cap.textContent = m.open ? "seam sprung · no squeeze left" : "squeeze left in the seam · kN";
    el.eq.textContent = "P_sep = F₀ ⁄ (1−φ) = " + f1(m.Psep) + " kN";
    el.pre.textContent = kN(m.F0);
    el.phi.textContent = f2(m.phi);
    el.p.textContent = kN(m.P);
    el.sep.textContent = f1(m.Psep) + " kN";
    el.hoop.textContent = f1(m.Fhoop) + " kN";
    el.margin.textContent = m.open ? "— sprung" : f1(m.Psep - m.P) + " kN";
  }

  function drawDrips(on) {
    while (g.drips.firstChild) g.drips.removeChild(g.drips.firstChild);
    if (!on) return;
    var yb = yAt(0.5), i;
    for (i = 0; i < 3; i++) {
      g.drips.appendChild(make("circle", { cx: CX, cy: yb + 14 + i * 12, r: 2.6 - i * 0.4,
        fill: "var(--drift)", opacity: 0.75 - i * 0.2 }));
    }
  }

  function arrow(x1, y1, x2, y2) {
    var a = Math.atan2(y2 - y1, x2 - x1), h = 5;
    var xL = x2 - h * Math.cos(a - 0.5), yL = y2 - h * Math.sin(a - 0.5);
    var xR = x2 - h * Math.cos(a + 0.5), yR = y2 - h * Math.sin(a + 0.5);
    return "M " + f1(x1) + " " + f1(y1) + " L " + f1(x2) + " " + f1(y2) +
           " M " + f1(x2) + " " + f1(y2) + " L " + f1(xL) + " " + f1(yL) +
           " M " + f1(x2) + " " + f1(y2) + " L " + f1(xR) + " " + f1(yR);
  }

  // ---- controls ----
  function setStatus(msg) { el.status.innerHTML = msg; }

  // ---- persistence: keep the bench as the reader last left it ----
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ pre: state.pre, phi: state.phi, load: load }));
    } catch (e) { /* private mode, quota, or storage off — the bench simply won't remember */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (typeof s.pre === "number") state.pre = clamp(s.pre, PRE_MIN, PRE_MAX);
      if (typeof s.phi === "number") state.phi = clamp(s.phi, PHI_MIN, PHI_MAX);
      if (typeof s.load === "number") load = clamp(s.load, 0, P_MAX);
      preRange.value = state.pre;
      phiRange.value = Math.round(state.phi * 100);
    } catch (e) { /* nothing stored, or storage unavailable */ }
  }

  function readControls() {
    state.pre = clamp(parseInt(preRange.value, 10), PRE_MIN, PRE_MAX);
    state.phi = clamp(parseInt(phiRange.value, 10) / 100, PHI_MIN, PHI_MAX);
    el.preVal.textContent = kN(state.pre);
    el.phiVal.textContent = f2(state.phi);
    update();
    persist();
  }

  function setLoad(P) { load = clamp(P, 0, P_MAX); update(); persist(); }

  function tick(ts) {
    if (!running) return;
    if (!tPrev) tPrev = ts;
    var dt = Math.min(0.05, (ts - tPrev) / 1000); tPrev = ts;
    load += dir * FILL_RATE * dt;
    if (load >= P_MAX) { load = P_MAX; dir = -1; }
    if (load <= 0) { load = 0; dir = 1; }
    update();
    raf = requestAnimationFrame(tick);
  }

  function run() {
    running = true; dir = load >= P_MAX ? -1 : 1; tPrev = 0;
    runBtn.setAttribute("aria-pressed", "true"); runBtn.textContent = "Stop";
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false; cancelAnimationFrame(raf);
    runBtn.setAttribute("aria-pressed", "false"); runBtn.textContent = "Fill";
    persist();
  }
  function toggle() { running ? stop() : run(); }

  function reset() {
    stop();
    state.pre = DEFAULTS.pre; state.phi = DEFAULTS.phi; load = 0; dir = 1;
    preRange.value = DEFAULTS.pre; phiRange.value = Math.round(DEFAULTS.phi * 100);
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* storage off */ }
    readControls();
    setStatus("Cask empty, hoops set. Press <b>Fill</b> to pour the load in and watch the squeeze bleed off the marked seam.");
  }

  preRange.addEventListener("input", readControls);
  phiRange.addEventListener("input", readControls);
  runBtn.addEventListener("click", toggle);
  resetBtn.addEventListener("click", reset);

  restore();
  build();
  readControls();
})();
