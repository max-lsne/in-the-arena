/* Wheel — a bench for the joint held clamped before the cart rolls. A shrunk iron tyre jams
 * every spoke home under a great preload; the cart's weight only ever comes off that preload,
 * so a spoke is unloaded but never pulled slack, and never rattles in its socket. In the
 * arena, 2026-09-01. One of three on preload.
 *
 * Take the loaded spoke at the bottom of the wheel and its felloe as two springs pulling
 * against each other: the ring of iron and rim above (in tension) and the spoke and its joint
 * (in compression), both set to the same preload F0 when the tyre shrinks on. The cart adds a
 * load P onto that spoke. Rim and spoke share the give, so only a fraction
 * phi = k_rim/(k_rim + k_spoke) of each added pound goes to the rim; the rest comes off the
 * spoke's clamp:
 *
 *     F_rim   = F0 + phi*P              the iron feels only the small share phi of the cart
 *     F_spoke = F0 - (1-phi)*P          the clamp that jams the spoke home, and must never reach zero
 *     P_sep   = F0 / (1 - phi)          the load at which the clamp reaches zero and the spoke goes slack
 *
 * Below P_sep the spoke is jammed home and never sees a loose instant. At it the joint opens
 * and one turn later it knocks. The joint diagram, the wheel and the marked spoke are drawn
 * from these three lines.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var PRE_MIN = 20, PRE_MAX = 110;          // preload F0, kN
  var PHI_MIN = 0.15, PHI_MAX = 0.60;       // stiffness split phi
  var P_MAX = 180;                          // heaviest load the bench allows, kN
  var F_MAX = 132;                          // top of the force axis, kN
  var DEFAULTS = { pre: 60, phi: 0.30 };
  var STORE_KEY = "arena.preload.wheel.v1";

  var state = { pre: DEFAULTS.pre, phi: DEFAULTS.phi };
  var load = 0;                             // current cart load P, kN (the driven degree of freedom)
  var running = false, dir = 1, raf = 0, tPrev = 0;
  var FILL_RATE = 46;                        // kN per second while loading
  var STEP_P = 12;                           // hand-step of the load

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

  function make(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); }
    return n;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function f1(x) { return x.toFixed(1); }
  function f2(x) { return x.toFixed(2); }
  function kN(x) { return Math.round(x) + " kN"; }

  function physics() {
    var F0 = state.pre, phi = state.phi, P = load;
    var Psep = F0 / (1 - phi);
    var Frim = F0 + phi * P;
    var Fspoke = F0 - (1 - phi) * P;
    var open = Fspoke <= 0;
    return { F0: F0, phi: phi, P: P, Psep: Psep, Frim: Frim,
             Fspoke: Fspoke, clampLeft: Math.max(0, Fspoke), open: open };
  }

  // ===================== scene geometry =====================
  var WC = { x: 240, y: 158 }, R_HUB = 20, R_IN = 106, R_FEL = 120;
  var N_SP = 12, BOT = Math.PI / 2;         // bottom spoke direction (down = +y)
  function polar(a, r) { return [WC.x + r * Math.cos(a), WC.y + r * Math.sin(a)]; }

  var g = {};
  function build() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(make("rect", { x: 8, y: 8, width: 624, height: 300, rx: 12, class: "svg-frame" }));

    // ground line under the tyre
    var gy = WC.y + R_FEL + 22;
    svg.appendChild(make("line", { x1: WC.x - 150, y1: gy, x2: WC.x + 150, y2: gy, class: "datum-line" }));
    for (var gx = WC.x - 140; gx <= WC.x + 140; gx += 16) {
      svg.appendChild(make("line", { x1: gx, y1: gy, x2: gx - 7, y2: gy + 8, stroke: "var(--rule)", "stroke-width": 1, opacity: 0.5 }));
    }

    // felloe ring (the clamp body)
    g.felloe = make("circle", { cx: WC.x, cy: WC.y, r: (R_IN + R_FEL) / 2,
      fill: "none", stroke: "var(--hold)", "stroke-width": R_FEL - R_IN, class: "clamp-ring" });
    g.felloe.style.opacity = "0.5";
    svg.appendChild(g.felloe);

    // tyre (the fastener), thickness by preload — set in update
    g.tyre = make("circle", { cx: WC.x, cy: WC.y, r: R_FEL + 4, class: "fastener", fill: "none" });
    svg.appendChild(g.tyre);

    // spokes
    g.spokes = [];
    for (var i = 0; i < N_SP; i++) {
      var a = -Math.PI / 2 + i * (2 * Math.PI / N_SP);   // start at top, go round
      var p0 = polar(a, R_HUB + 1), p1 = polar(a, R_IN - 1);
      var isBottom = Math.abs(((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - BOT) < 0.01;
      var sp = make("line", { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1],
        stroke: isBottom ? "var(--hold)" : "var(--graphite)", "stroke-width": isBottom ? 3.4 : 2.2,
        "stroke-linecap": "round", opacity: isBottom ? 1 : 0.5 });
      svg.appendChild(sp);
      if (isBottom) { g.botIdx = i; g.botAngle = a; g.botP0 = p0; g.botP1 = p1; g.botSpoke = sp; }
      g.spokes.push(sp);
    }
    // slack version of the bottom spoke (wavy), hidden until separation
    g.botSlack = make("path", { d: "", class: "joint-open", fill: "none", "stroke-width": 3, opacity: 0 });
    svg.appendChild(g.botSlack);

    // hub
    svg.appendChild(make("circle", { cx: WC.x, cy: WC.y, r: R_HUB, fill: "var(--card)", stroke: "var(--steel-deep)", "stroke-width": 2 }));
    svg.appendChild(make("circle", { cx: WC.x, cy: WC.y, r: 5, fill: "var(--graphite-deep)" }));

    // load arrow onto the hub top
    g.loadArr = make("path", { d: "", class: "load-arrow", "stroke-width": 2.4, opacity: 0 });
    svg.appendChild(g.loadArr);

    // labels
    g.stateCap = make("text", { x: 470, y: 62, "text-anchor": "middle", class: "state-cap safe" });
    g.stateCap.textContent = "home · sound";
    svg.appendChild(g.stateCap);
    var c1 = make("text", { x: 470, y: 86, "text-anchor": "middle", class: "piece-cap" });
    c1.textContent = "the bottom spoke";
    svg.appendChild(c1);
    g.loadCap = make("text", { x: 470, y: 110, "text-anchor": "middle", class: "load-cap" });
    svg.appendChild(g.loadCap);

    buildDiagram();
    update();
  }

  // ===================== diagram (shared with the other two pages) =====================
  var PX0 = 70, PX1 = 600, DTOP = 348, DBOT = 496;
  function px(P) { return PX0 + (P / P_MAX) * (PX1 - PX0); }
  function py(F) { return DBOT - (clamp(F, -F_MAX, F_MAX) / F_MAX) * (DBOT - DTOP); }

  function buildDiagram() {
    svg.appendChild(make("rect", { x: PX0, y: DTOP, width: PX1 - PX0, height: DBOT - DTOP, class: "lane-frame" }));
    g.bandSafe = make("rect", { x: PX0, y: DTOP, width: 0, height: DBOT - DTOP, class: "lane-band-safe" });
    g.bandGone = make("rect", { x: PX1, y: DTOP, width: 0, height: DBOT - DTOP, class: "lane-band-gone" });
    svg.appendChild(g.bandSafe); svg.appendChild(g.bandGone);
    svg.appendChild(make("line", { x1: PX0, y1: py(0), x2: PX1, y2: py(0), class: "lane-zero" }));

    var xc = make("text", { x: (PX0 + PX1) / 2, y: DBOT + 22, "text-anchor": "middle", class: "lane-label" });
    xc.textContent = "applied load  P  (cart) →"; svg.appendChild(xc);
    var yc = make("text", { x: PX0 - 8, y: DTOP - 8, "text-anchor": "start", class: "lane-label" });
    yc.textContent = "force, kN"; svg.appendChild(yc);
    for (var i = 0; i <= 3; i++) {
      var v = i * 60; if (v > P_MAX) continue;
      svg.appendChild(make("line", { x1: px(v), y1: DBOT, x2: px(v), y2: DBOT + 4, class: "lane-div" }));
      var tk = make("text", { x: px(v), y: DBOT + 22, "text-anchor": "middle", class: "lane-tick" });
      tk.textContent = v; svg.appendChild(tk);
    }

    g.preLine = make("line", { x1: PX0, y1: py(state.pre), x2: PX1, y2: py(state.pre), class: "plot-preload" });
    svg.appendChild(g.preLine);
    g.sepLine = make("line", { x1: 0, y1: DTOP, x2: 0, y2: DBOT, class: "sep-line" });
    svg.appendChild(g.sepLine);
    g.sepCap = make("text", { x: 0, y: DTOP - 8, "text-anchor": "middle", class: "sep-cap" });
    g.sepCap.textContent = "P_sep"; svg.appendChild(g.sepCap);

    g.lineHoop = make("polyline", { points: "", class: "plot-fastener" });
    g.lineJoint = make("polyline", { points: "", class: "plot-clamp" });
    svg.appendChild(g.lineHoop); svg.appendChild(g.lineJoint);

    g.capHoop = make("text", { x: PX1 - 4, y: 0, "text-anchor": "end", class: "fastener-cap" });
    g.capHoop.textContent = "F_rim";
    g.capJoint = make("text", { x: PX0 + 6, y: 0, "text-anchor": "start", class: "clamp-cap" });
    g.capJoint.textContent = "spoke clamp";
    svg.appendChild(g.capHoop); svg.appendChild(g.capJoint);

    g.curLine = make("line", { x1: 0, y1: DTOP, x2: 0, y2: DBOT, class: "cursor-line" });
    g.curF = make("circle", { cx: 0, cy: 0, r: 4.5, class: "cursor-dot-f" });
    g.curC = make("circle", { cx: 0, cy: 0, r: 4.5, class: "cursor-dot-c" });
    svg.appendChild(g.curLine); svg.appendChild(g.curF); svg.appendChild(g.curC);
  }

  function update() {
    var m = physics();

    // tyre thickness by preload
    var tw = 3 + 7 * (state.pre - PRE_MIN) / (PRE_MAX - PRE_MIN);
    g.tyre.setAttribute("stroke-width", f1(tw));
    g.tyre.setAttribute("r", R_FEL + tw / 2 + 1);
    g.tyre.setAttribute("class", m.open ? "fastener fastener-slack" : "fastener");
    g.felloe.setAttribute("stroke", m.open ? "var(--shock)" : "var(--hold)");

    // bottom spoke: clamped (green, straight) vs slack (red, wavy)
    if (m.open) {
      g.botSpoke.setAttribute("opacity", 0);
      g.botSlack.setAttribute("opacity", 1);
      // a gentle S-bow to show it has gone loose
      var p0 = g.botP0, p1 = g.botP1, mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      var bow = 7;
      g.botSlack.setAttribute("d", "M " + f1(p0[0]) + " " + f1(p0[1]) +
        " Q " + f1(mx + bow) + " " + f1(my - 6) + " " + f1(mx) + " " + f1(my) +
        " Q " + f1(mx - bow) + " " + f1(my + 6) + " " + f1(p1[0]) + " " + f1(p1[1]));
    } else {
      g.botSpoke.setAttribute("opacity", 1);
      g.botSlack.setAttribute("opacity", 0);
      // spoke thickness hints at remaining clamp
      g.botSpoke.setAttribute("stroke-width", f1(2.4 + 2 * m.clampLeft / PRE_MAX));
    }

    // load arrow onto hub, length by load
    var fr = clamp(m.P / P_MAX, 0, 1), al = 8 + 42 * fr;
    if (m.P > 0.5) {
      g.loadArr.setAttribute("opacity", 0.9);
      g.loadArr.setAttribute("d", arrow(WC.x, WC.y - R_HUB - 8 - al, WC.x, WC.y - R_HUB - 8));
    } else g.loadArr.setAttribute("opacity", 0);

    g.stateCap.setAttribute("class", m.open ? "state-cap gone" : "state-cap safe");
    g.stateCap.textContent = m.open ? "slack · knocking" : "home · sound";
    g.loadCap.textContent = "load  P = " + kN(m.P);

    // diagram
    g.preLine.setAttribute("y1", py(m.F0)); g.preLine.setAttribute("y2", py(m.F0));
    var xsep = px(Math.min(m.Psep, P_MAX));
    g.sepLine.setAttribute("x1", xsep); g.sepLine.setAttribute("x2", xsep);
    g.sepCap.setAttribute("x", clamp(xsep, PX0 + 16, PX1 - 16));
    g.sepCap.textContent = m.Psep <= P_MAX ? "P_sep " + Math.round(m.Psep) : "P_sep off-chart";
    g.bandSafe.setAttribute("width", clamp(xsep - PX0, 0, PX1 - PX0));
    var goneX = clamp(xsep, PX0, PX1);
    g.bandGone.setAttribute("x", goneX); g.bandGone.setAttribute("width", PX1 - goneX);

    g.lineHoop.setAttribute("points", px(0) + "," + py(m.F0) + " " + px(P_MAX) + "," + py(m.F0 + m.phi * P_MAX));
    var pts = px(0) + "," + py(m.F0) + " " + xsep + "," + py(0);
    if (m.Psep < P_MAX) pts += " " + px(P_MAX) + "," + py(0);
    g.lineJoint.setAttribute("points", pts);
    g.lineJoint.setAttribute("class", m.open ? "plot-clamp gone" : "plot-clamp");
    g.capHoop.setAttribute("y", py(m.F0 + m.phi * P_MAX) - 6);
    g.capJoint.setAttribute("y", py(m.F0) - 8);

    var cx2 = px(m.P);
    g.curLine.setAttribute("x1", cx2); g.curLine.setAttribute("x2", cx2);
    g.curF.setAttribute("cx", cx2); g.curF.setAttribute("cy", py(m.Frim));
    g.curC.setAttribute("cx", cx2); g.curC.setAttribute("cy", py(Math.max(0, m.Fspoke)));
    g.curC.setAttribute("class", m.open ? "cursor-dot-c gone" : "cursor-dot-c");

    // readout
    el.big.textContent = f1(m.clampLeft);
    el.big.setAttribute("class", m.open ? "read-num mono gone" : "read-num mono");
    el.cap.textContent = m.open ? "spoke slack · no clamp left" : "clamp left on the bottom spoke · kN";
    el.eq.textContent = "P_sep = F₀ ⁄ (1−φ) = " + f1(m.Psep) + " kN";
    el.pre.textContent = kN(m.F0);
    el.phi.textContent = f2(m.phi);
    el.p.textContent = kN(m.P);
    el.sep.textContent = f1(m.Psep) + " kN";
    el.hoop.textContent = f1(m.Frim) + " kN";
    el.margin.textContent = m.open ? "— slack" : f1(m.Psep - m.P) + " kN";
  }

  function arrow(x1, y1, x2, y2) {
    var a = Math.atan2(y2 - y1, x2 - x1), h = 6;
    var xL = x2 - h * Math.cos(a - 0.5), yL = y2 - h * Math.sin(a - 0.5);
    var xR = x2 - h * Math.cos(a + 0.5), yR = y2 - h * Math.sin(a + 0.5);
    return "M " + f1(x1) + " " + f1(y1) + " L " + f1(x2) + " " + f1(y2) +
           " M " + f1(x2) + " " + f1(y2) + " L " + f1(xL) + " " + f1(yL) +
           " M " + f1(x2) + " " + f1(y2) + " L " + f1(xR) + " " + f1(yR);
  }

  function setStatus(msg) { el.status.innerHTML = msg; }

  // ---- announce the settled joint to a screen reader (debounced past slider drags) ----
  var annTimer = 0, ready = false;
  function announce() {
    var m = physics();
    var head = "Tyre shrunk to F₀ " + Math.round(m.F0) + " kN, split φ " + f2(m.phi) + ". ";
    var body;
    if (m.P < 0.5) {
      body = "Axle bare; the bottom spoke holds " + Math.round(m.F0) +
             " kN of clamp and would go slack at a load of P_sep " + Math.round(m.Psep) + " kN.";
    } else if (!m.open) {
      body = "Loaded to P " + Math.round(m.P) + " kN — spoke jammed home, " +
             Math.round(m.clampLeft) + " kN of clamp left, going slack at P_sep " + Math.round(m.Psep) + " kN.";
    } else {
      body = "Loaded to P " + Math.round(m.P) + " kN — bottom spoke slack and knocking; it went slack at P_sep " +
             Math.round(m.Psep) + " kN.";
    }
    el.status.textContent = head + body;
  }
  function scheduleAnnounce() {
    if (!ready) return;
    clearTimeout(annTimer);
    annTimer = setTimeout(announce, 420);
  }

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
    scheduleAnnounce();
  }

  function setLoad(P) { load = clamp(P, 0, P_MAX); update(); persist(); scheduleAnnounce(); }

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
    runBtn.setAttribute("aria-pressed", "false"); runBtn.textContent = "Load";
    persist();
    announce();
  }
  function toggle() { running ? stop() : run(); }

  function reset() {
    stop();
    state.pre = DEFAULTS.pre; state.phi = DEFAULTS.phi; load = 0; dir = 1;
    preRange.value = DEFAULTS.pre; phiRange.value = Math.round(DEFAULTS.phi * 100);
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* storage off */ }
    readControls();
    setStatus("Wheel built, tyre shrunk on, axle bare. Press <b>Load</b> to bring the cart's weight onto it and watch the clamp bleed off the bottom spoke.");
  }

  preRange.addEventListener("input", readControls);
  phiRange.addEventListener("input", readControls);
  runBtn.addEventListener("click", toggle);
  resetBtn.addEventListener("click", reset);

  restore();
  build();
  readControls();
  ready = true;
})();
