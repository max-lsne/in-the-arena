/* Shroud — a bench for the mast held from both sides at once. Two shrouds are set up taut
 * against each other before the wind blows; a gust adds to the windward and takes from the
 * lee, but the lee only ever slackens toward zero, never past it, so the mast is never let go
 * on one side to snap to and pump at its step. In the arena, 2026-09-01. One of three on
 * preload.
 *
 * Take the two shrouds as springs pulling against each other across the mast, both set up to
 * the preload T0 when the bottlescrews are hardened. A gust puts a heeling load P on the rig;
 * the base (how far outboard the chainplates are led) sets the windward share phi, so only
 * (1-phi) comes off the lee:
 *
 *     T_wind = T0 + phi*P              the windward wire hardens and takes up the gust
 *     T_lee  = T0 - (1-phi)*P          the lee tension, and the number that must never reach zero
 *     P_sep  = T0 / (1 - phi)          the gust at which the lee tension reaches zero and it goes dead
 *
 * Below P_sep both wires are alive and the mast is held both sides. At it the lee goes dead
 * and the next roll snaps the mast to leeward against a slack wire. The joint diagram, the
 * rig and the heel are drawn from these three lines.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var PRE_MIN = 20, PRE_MAX = 110;          // preload T0, kN
  var PHI_MIN = 0.15, PHI_MAX = 0.60;       // windward share phi (the base)
  var P_MAX = 180;                          // hardest gust the bench allows, kN
  var F_MAX = 132;                          // top of the force axis, kN
  var DEFAULTS = { pre: 60, phi: 0.30 };
  var STORE_KEY = "arena.preload.shroud.v1";

  var state = { pre: DEFAULTS.pre, phi: DEFAULTS.phi };
  var load = 0;                             // current gust P, kN (the driven degree of freedom)
  var running = false, dir = 1, raf = 0, tPrev = 0;
  var FILL_RATE = 46;                        // kN per second while gusting
  var STEP_P = 12;                           // hand-step of the gust

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
    var T0 = state.pre, phi = state.phi, P = load;
    var Psep = T0 / (1 - phi);
    var Twind = T0 + phi * P;
    var Tlee = T0 - (1 - phi) * P;
    var open = Tlee <= 0;
    return { F0: T0, phi: phi, P: P, Psep: Psep, Twind: Twind,
             Tlee: Tlee, leeLeft: Math.max(0, Tlee), open: open };
  }

  // ===================== scene geometry =====================
  var DECK_Y = 258, BASE_X = 250, MAST_LEN = 196;
  function baseSpread() { return 46 + 122 * (state.phi - PHI_MIN) / (PHI_MAX - PHI_MIN); }
  function mastHead(P) {
    var heel = (P / P_MAX) * 0.17;          // radians, up to ~10 deg to leeward (right)
    return { x: BASE_X + Math.sin(heel) * MAST_LEN, y: DECK_Y - Math.cos(heel) * MAST_LEN };
  }

  var g = {};
  function build() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(make("rect", { x: 8, y: 8, width: 624, height: 300, rx: 12, class: "svg-frame" }));

    // deck / waterline
    svg.appendChild(make("line", { x1: 60, y1: DECK_Y, x2: 440, y2: DECK_Y, class: "datum-line" }));
    // a little hull suggestion
    svg.appendChild(make("path", { d: "M 150 " + DECK_Y + " Q 250 " + (DECK_Y + 34) + " 350 " + DECK_Y,
      fill: "none", stroke: "var(--rule)", "stroke-width": 1.4, opacity: 0.6 }));

    // wind arrows (from windward, the left)
    g.wind = make("g", {});
    svg.appendChild(g.wind);

    // shrouds (drawn before mast so the mast caps them at the head)
    g.leeShroud = make("path", { d: "", class: "fastener", "stroke-width": 2.4, fill: "none" });
    g.windShroud = make("line", { class: "fastener", "stroke-width": 3 });
    svg.appendChild(g.leeShroud); svg.appendChild(g.windShroud);

    // chainplates + bottlescrews
    g.cpWind = make("rect", { width: 6, height: 12, rx: 1.5, fill: "var(--steel-deep)" });
    g.cpLee = make("rect", { width: 6, height: 12, rx: 1.5, fill: "var(--steel-deep)" });
    svg.appendChild(g.cpWind); svg.appendChild(g.cpLee);

    // mast
    g.mast = make("line", { class: "", stroke: "var(--graphite-deep)", "stroke-width": 5, "stroke-linecap": "round" });
    svg.appendChild(g.mast);
    g.step = make("circle", { cx: BASE_X, cy: DECK_Y, r: 5, fill: "var(--graphite-deep)" });
    svg.appendChild(g.step);
    g.head = make("circle", { r: 3.5, fill: "var(--ink-faint)" });
    svg.appendChild(g.head);

    // labels
    g.stateCap = make("text", { x: 500, y: 66, "text-anchor": "middle", class: "state-cap safe" });
    g.stateCap.textContent = "both alive · held";
    svg.appendChild(g.stateCap);
    var c1 = make("text", { x: 500, y: 90, "text-anchor": "middle", class: "piece-cap" });
    c1.textContent = "the lee shroud";
    svg.appendChild(c1);
    g.loadCap = make("text", { x: 500, y: 114, "text-anchor": "middle", class: "load-cap" });
    svg.appendChild(g.loadCap);
    // side tags
    var wt = make("text", { x: 96, y: DECK_Y + 26, "text-anchor": "middle", class: "piece-cap" });
    wt.textContent = "windward"; svg.appendChild(wt);
    g.leeTag = make("text", { x: 404, y: DECK_Y + 26, "text-anchor": "middle", class: "piece-cap" });
    g.leeTag.textContent = "lee"; svg.appendChild(g.leeTag);

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
    xc.textContent = "applied load  P  (gust) →"; svg.appendChild(xc);
    var yc = make("text", { x: PX0 - 8, y: DTOP - 8, "text-anchor": "start", class: "lane-label" });
    yc.textContent = "tension, kN"; svg.appendChild(yc);
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
    g.capHoop.textContent = "T_wind";
    g.capJoint = make("text", { x: PX0 + 6, y: 0, "text-anchor": "start", class: "clamp-cap" });
    g.capJoint.textContent = "lee shroud";
    svg.appendChild(g.capHoop); svg.appendChild(g.capJoint);

    g.curLine = make("line", { x1: 0, y1: DTOP, x2: 0, y2: DBOT, class: "cursor-line" });
    g.curF = make("circle", { cx: 0, cy: 0, r: 4.5, class: "cursor-dot-f" });
    g.curC = make("circle", { cx: 0, cy: 0, r: 4.5, class: "cursor-dot-c" });
    svg.appendChild(g.curLine); svg.appendChild(g.curF); svg.appendChild(g.curC);
  }

  function update() {
    var m = physics();
    var spread = baseSpread();
    var wcp = { x: BASE_X - spread, y: DECK_Y }, lcp = { x: BASE_X + spread, y: DECK_Y };
    var head = mastHead(m.P);

    // mast + head
    g.mast.setAttribute("x1", BASE_X); g.mast.setAttribute("y1", DECK_Y);
    g.mast.setAttribute("x2", head.x); g.mast.setAttribute("y2", head.y);
    g.mast.setAttribute("stroke", m.open ? "var(--shock)" : "var(--graphite-deep)");
    g.head.setAttribute("cx", head.x); g.head.setAttribute("cy", head.y);

    // chainplates
    g.cpWind.setAttribute("x", wcp.x - 3); g.cpWind.setAttribute("y", DECK_Y);
    g.cpLee.setAttribute("x", lcp.x - 3); g.cpLee.setAttribute("y", DECK_Y);
    g.leeTag.setAttribute("x", lcp.x); g.leeTag.setAttribute("y", DECK_Y + 26);

    // windward shroud — taut, thickness by tension
    g.windShroud.setAttribute("x1", head.x); g.windShroud.setAttribute("y1", head.y);
    g.windShroud.setAttribute("x2", wcp.x); g.windShroud.setAttribute("y2", wcp.y);
    g.windShroud.setAttribute("stroke-width", f1(2.2 + 2.4 * m.Twind / (PRE_MAX + PHI_MAX * P_MAX)));

    // lee shroud — straight & alive (green->steel), or dead & sagging (red catenary)
    if (m.open) {
      var sag = 10 + 26 * clamp((m.P - m.Psep) / (P_MAX - m.Psep + 1e-6), 0, 1);
      var mx = (head.x + lcp.x) / 2, my = (head.y + lcp.y) / 2 + sag;
      g.leeShroud.setAttribute("d", "M " + f1(head.x) + " " + f1(head.y) +
        " Q " + f1(mx) + " " + f1(my) + " " + f1(lcp.x) + " " + f1(lcp.y));
      g.leeShroud.setAttribute("class", "fastener fastener-slack");
      g.leeShroud.setAttribute("stroke-width", 2.2);
    } else {
      g.leeShroud.setAttribute("d", "M " + f1(head.x) + " " + f1(head.y) + " L " + f1(lcp.x) + " " + f1(lcp.y));
      var alive = m.Tlee / state.pre;   // 1 at rest -> 0 near death
      g.leeShroud.setAttribute("stroke", alive > 0.28 ? "var(--hold)" : "var(--drift)");
      g.leeShroud.setAttribute("class", "");
      g.leeShroud.setAttribute("fill", "none");
      g.leeShroud.setAttribute("stroke-linecap", "round");
      g.leeShroud.setAttribute("stroke-width", f1(1.4 + 2 * clamp(alive, 0, 1)));
    }

    // wind arrows from the left, length by load
    while (g.wind.firstChild) g.wind.removeChild(g.wind.firstChild);
    if (m.P > 0.5) {
      var al = 14 + 46 * (m.P / P_MAX);
      for (var yy = 96; yy <= 176; yy += 40) {
        g.wind.appendChild(make("path", { d: arrow(70, yy, 70 + al, yy), class: "load-arrow", "stroke-width": 2, opacity: 0.85 }));
      }
    }

    g.stateCap.setAttribute("class", m.open ? "state-cap gone" : "state-cap safe");
    g.stateCap.textContent = m.open ? "lee dead · mast pumping" : "both alive · held";
    g.loadCap.textContent = "gust  P = " + kN(m.P);

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
    g.curF.setAttribute("cx", cx2); g.curF.setAttribute("cy", py(m.Twind));
    g.curC.setAttribute("cx", cx2); g.curC.setAttribute("cy", py(Math.max(0, m.Tlee)));
    g.curC.setAttribute("class", m.open ? "cursor-dot-c gone" : "cursor-dot-c");

    // readout
    el.big.textContent = f1(m.leeLeft);
    el.big.setAttribute("class", m.open ? "read-num mono gone" : "read-num mono");
    el.cap.textContent = m.open ? "lee shroud dead · no tension left" : "tension left in the lee shroud · kN";
    el.eq.textContent = "P_sep = T₀ ⁄ (1−φ) = " + f1(m.Psep) + " kN";
    el.pre.textContent = kN(m.F0);
    el.phi.textContent = f2(m.phi);
    el.p.textContent = kN(m.P);
    el.sep.textContent = f1(m.Psep) + " kN";
    el.hoop.textContent = f1(m.Twind) + " kN";
    el.margin.textContent = m.open ? "— dead" : f1(m.Psep - m.P) + " kN";
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

  // ---- announce the settled rig to a screen reader (debounced past slider drags) ----
  var annTimer = 0, ready = false;
  function announce() {
    var m = physics();
    var head = "Rigging set up to T₀ " + Math.round(m.F0) + " kN, base φ " + f2(m.phi) + ". ";
    var body;
    if (m.P < 0.5) {
      body = "No wind; both shrouds alive, the lee holding " + Math.round(m.F0) +
             " kN and going dead at a gust of P_sep " + Math.round(m.Psep) + " kN.";
    } else if (!m.open) {
      body = "Gust P " + Math.round(m.P) + " kN — mast held both sides, lee shroud alive with " +
             Math.round(m.leeLeft) + " kN, going dead at P_sep " + Math.round(m.Psep) + " kN.";
    } else {
      body = "Gust P " + Math.round(m.P) + " kN — lee shroud dead and the mast free to pump; it went dead at P_sep " +
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
    runBtn.setAttribute("aria-pressed", "false"); runBtn.textContent = "Gust";
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
    setStatus("Rig set up, boat upright, both shrouds alive. Press <b>Gust</b> to heel her and watch the tension bleed off the lee shroud.");
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
