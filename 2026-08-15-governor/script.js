/* Governor — a bench for the centrifugal flyball governor, Watt's whirling balls.
 * In the arena, 2026-08-15.
 *
 * One fact runs the whole instrument: a ball whirled on an arm of length L at
 * rate ω rides a horizontal circle, and for it to circle steadily the arm must
 * lean out to where cos θ = g / (ω²·L). Multiply by L and the left side is the
 * height of the cone, h = L·cos θ = g/ω² — the balls hang g over the spin
 * squared below the pivot, whatever their weight or the arm's length. Tie the
 * collar that their rise lifts to a throttle and the loop closes on itself: fast
 * flings the balls out, out shuts the valve, shut slows it down. That is the
 * governor, and the first feedback loop anyone wrote the mathematics of.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // physics
  var G = 9.81;                       // m/s²
  var TWO_PI = Math.PI * 2;

  // the governing loop, as a torque balance on the shaft:
  //   dω/dt = ( throttle(ω) − load − damping·ω ) / inertia
  // throttle(ω) is what the collar's height commands, = cos θ = g/(ω²L).
  var INERTIA = 0.05;
  var DAMP = 0.0018;
  var TMAX = 1;                       // full-throttle drive, normalised

  // geometry of the viewBox
  var VB = 560;
  var CX = VB / 2;                    // the shaft runs down the centre
  var PIVOT_Y = 118;                  // where the arms hinge
  var BASE_Y = 470;                   // the bearing at the foot of the shaft
  var SCALE = 600;                    // svg units per metre
  var BALL_R = 15;
  var COLLAR_HW = 15;                 // collar half-width on the shaft

  // valve (a butterfly in a horizontal steam pipe, off to the right)
  var PIPE_X0 = 372, PIPE_X1 = 516;
  var PIPE_TOP = 414, PIPE_BOT = 448;
  var DISC_X = 416, DISC_Y = (PIPE_TOP + PIPE_BOT) / 2;
  var DISC_HALF = (PIPE_BOT - PIPE_TOP) / 2;

  var N_MAX = 400;                    // the spin slider's top, rpm
  var L_MIN = 50, L_MAX = 300;        // arm length slider, mm

  var DEFAULTS = { N: 100, L: 150, load: 40 };

  var state = { N: DEFAULTS.N, L: DEFAULTS.L, load: DEFAULTS.load, mode: "direct" };

  var lastGoverned = false;

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var nRange = document.getElementById("nRange");
  var lRange = document.getElementById("lRange");
  var loadRange = document.getElementById("loadRange");
  var governBtn = document.getElementById("governBtn");
  var restBtn = document.getElementById("restBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    caseName: document.getElementById("readCase"),
    eq: document.getElementById("rbEq"),
    n: document.getElementById("rfN"),
    theta: document.getElementById("rfTheta"),
    h: document.getElementById("rfH"),
    r: document.getElementById("rfR"),
    lift: document.getElementById("rfLift"),
    throttle: document.getElementById("rfThrottle"),
    nVal: document.getElementById("nVal"),
    lVal: document.getElementById("lVal"),
    loadVal: document.getElementById("loadVal"),
    status: document.getElementById("status")
  };

  // ---- small helpers ----
  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]); }
    return node;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function omega(N) { return N * TWO_PI / 60; }               // rpm -> rad/s
  function rpm(w) { return w * 60 / TWO_PI; }                  // rad/s -> rpm

  // The throttle the collar commands at a given spin — cos θ, which is g/(ω²L)
  // above the critical speed and pinned wide open (1) below it, where the balls
  // cannot yet lift.
  function throttleFrac(w, L, wc) {
    if (w <= wc) return 1;
    var c = G / (w * w * L);
    return c > 1 ? 1 : (c < 0 ? 0 : c);
  }

  // Everything the bench shows, worked straight from cos θ = g/(ω²L).
  function solve() {
    var L = state.L / 1000;                     // mm -> m
    var w = omega(state.N);
    var wc = Math.sqrt(G / L);                  // critical spin, rad/s
    var Nc = rpm(wc);

    var below = (w <= wc);
    var cos = below ? 1 : G / (w * w * L);
    if (cos > 1) cos = 1;
    var theta = Math.acos(cos);
    var sin = Math.sin(theta);

    var h = L * cos;                            // cone height = g/ω² above critical
    var r = L * sin;                            // ball-circle radius
    var lift = L - h;                           // L(1 - cos θ)
    var throttle = cos;                         // fraction

    return {
      L: L, w: w, wc: wc, Nc: Nc, below: below,
      cos: cos, theta: theta, sin: sin,
      h: h, r: r, lift: lift, throttle: throttle
    };
  }

  // ---- drawing ----
  function sxArm(dx) { return CX + dx * SCALE; }
  function syDown(dy) { return PIVOT_Y + dy * SCALE; }

  function draw(s) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.appendChild(make("rect", {
      x: 4, y: 4, width: VB - 8, height: VB - 8, rx: 14, class: "svg-frame"
    }));

    var hPx = s.h * SCALE;
    var rPx = s.r * SCALE;
    var collarY = PIVOT_Y + hPx;                // the collar rides at the ball plane
    var ballLx = CX - rPx, ballRx = CX + rPx, ballY = PIVOT_Y + hPx;

    // shaft, from pivot down into the bearing
    svg.appendChild(make("line", { x1: CX, y1: PIVOT_Y, x2: CX, y2: BASE_Y, class: "shaft" }));
    // a faint twin, offset, to read as a turning shaft
    svg.appendChild(make("line", { x1: CX + 2.4, y1: PIVOT_Y + 6, x2: CX + 2.4, y2: BASE_Y, class: "shaft-spin" }));
    // bearing / base plate
    svg.appendChild(make("path", {
      d: "M" + (CX - 34) + " " + BASE_Y + " L" + (CX + 34) + " " + BASE_Y +
         " M" + (CX - 26) + " " + (BASE_Y + 12) + " L" + (CX + 26) + " " + (BASE_Y + 12),
      class: "base-plate"
    }));

    // the horizontal circle the balls whirl around, seen in perspective
    if (rPx > 2) {
      svg.appendChild(make("ellipse", {
        cx: CX, cy: ballY, rx: rPx, ry: Math.max(3, rPx * 0.22), class: "cone-ghost"
      }));
    }

    // the two arms, pivot to ball
    svg.appendChild(make("line", { x1: CX, y1: PIVOT_Y, x2: ballLx, y2: ballY, class: "arm" }));
    svg.appendChild(make("line", { x1: CX, y1: PIVOT_Y, x2: ballRx, y2: ballY, class: "arm" }));

    // lower links: the collar is lifted from partway along each arm
    var linkFrac = 0.52;
    var linkLx = CX + (ballLx - CX) * linkFrac, linkLy = PIVOT_Y + (ballY - PIVOT_Y) * linkFrac;
    var linkRx = CX + (ballRx - CX) * linkFrac, linkRy = PIVOT_Y + (ballY - PIVOT_Y) * linkFrac;
    svg.appendChild(make("line", { x1: linkLx, y1: linkLy, x2: CX - COLLAR_HW, y2: collarY, class: "link" }));
    svg.appendChild(make("line", { x1: linkRx, y1: linkRy, x2: CX + COLLAR_HW, y2: collarY, class: "link" }));

    // the linkage on to the throttle: collar -> valve disc
    svg.appendChild(make("line", {
      x1: CX + COLLAR_HW, y1: collarY, x2: DISC_X, y2: DISC_Y, class: "link"
    }));

    // the collar on the shaft, with its ping halo
    svg.appendChild(make("circle", { cx: CX, cy: collarY, r: 12, class: "collar-halo" }));
    svg.appendChild(make("rect", {
      x: CX - COLLAR_HW, y: collarY - 6, width: COLLAR_HW * 2, height: 12, rx: 3, class: "collar"
    }));
    svg.appendChild(make("rect", { x: CX - 3, y: collarY - 5, width: 6, height: 10, class: "collar-core" }));

    // the balls
    drawBall(ballLx, ballY);
    drawBall(ballRx, ballY);

    // pivot cap
    svg.appendChild(make("circle", { cx: CX, cy: PIVOT_Y, r: 5, class: "pivot" }));

    // the butterfly valve
    drawValve(s.throttle);

    // labels
    label(DISC_X - 2, PIPE_BOT + 18, "start", "throttle");
    label(CX, BASE_Y + 34, "middle", "shaft");
  }

  function drawBall(cx, cy) {
    svg.appendChild(make("circle", { cx: cx, cy: cy, r: BALL_R, class: "ball" }));
    svg.appendChild(make("circle", { cx: cx - 4.5, cy: cy - 4.5, r: 4, class: "ball-shine" }));
  }

  function drawValve(throttle) {
    // pipe walls
    svg.appendChild(make("line", { x1: PIPE_X0, y1: PIPE_TOP, x2: PIPE_X1, y2: PIPE_TOP, class: "valve-body" }));
    svg.appendChild(make("line", { x1: PIPE_X0, y1: PIPE_BOT, x2: PIPE_X1, y2: PIPE_BOT, class: "valve-body" }));

    // steam admitted past the disc, when it is open at all
    if (throttle > 0.06) {
      var n = Math.round(throttle * 4) + 1;
      for (var i = 0; i < n; i++) {
        var fx = DISC_X + 24 + i * 16;
        if (fx > PIPE_X1 - 6) break;
        svg.appendChild(make("line", {
          x1: fx, y1: DISC_Y, x2: fx + 8, y2: DISC_Y, class: "flow"
        }));
      }
    }

    // the disc: along the flow (horizontal) when open, across it when shut
    var phi = (1 - throttle) * Math.PI / 2;     // 0 open, π/2 shut
    var dx = DISC_HALF * Math.cos(phi), dy = DISC_HALF * Math.sin(phi);
    svg.appendChild(make("line", {
      x1: DISC_X - dx, y1: DISC_Y - dy, x2: DISC_X + dx, y2: DISC_Y + dy, class: "valve-disc"
    }));
    svg.appendChild(make("circle", { cx: DISC_X, cy: DISC_Y, r: 2.4, class: "pivot" }));
  }

  function label(x, y, anchor, text) {
    var t = make("text", { x: x, y: y, "text-anchor": anchor, class: "axis-label" });
    t.textContent = text;
    svg.appendChild(t);
  }

  // ---- readout ----
  function caseInfo(s) {
    if (state.mode === "govern") {
      return lastGoverned
        ? { name: "governed", cls: " is-governed" }
        : { name: "hunting", cls: " is-hunting" };
    }
    return s.below
      ? { name: "hanging", cls: " is-hanging" }
      : { name: "conical", cls: "" };
  }

  function paint(s) {
    var ci = caseInfo(s);
    el.caseName.textContent = ci.name;
    el.caseName.className = "read-num mono" + ci.cls;
    el.eq.textContent = s.below
      ? "θ = 0°  ·  below the critical spin"
      : "cos θ = g / (ω²·L)  ·  h = g/ω²";

    el.n.textContent = Math.round(state.N) + " rpm";
    el.theta.textContent = Math.round(s.theta * 180 / Math.PI) + "°";
    el.h.textContent = Math.round(s.h * 1000) + " mm";
    el.r.textContent = Math.round(s.r * 1000) + " mm";
    el.lift.textContent = Math.round(s.lift * 1000) + " mm";
    el.throttle.textContent = Math.round(s.throttle * 100) + "%";

    el.nVal.textContent = Math.round(state.N) + " rpm";
    el.lVal.textContent = state.L + " mm";
    el.loadVal.textContent = state.load + "%";
  }

  function speak(s) {
    var msg;
    var thr = Math.round(s.throttle * 100);
    if (state.mode === "govern") {
      if (lastGoverned) {
        msg = "Governed. The shaft holds " + Math.round(state.N) + " rpm — the collar has set " +
              "the throttle to " + thr + "%, just feeding the " + state.load + "% load. " +
              "Add load and it settles a little lower; that give is the droop.";
      } else {
        msg = "Governing against a " + state.load + "% load. The balls are hunting for the speed " +
              "where the throttle they set feeds exactly that load.";
      }
    } else if (s.below) {
      msg = "At " + Math.round(state.N) + " rpm the shaft turns too slowly to lift the balls — under " +
            "the critical " + Math.round(s.Nc) + " rpm they hang straight down and the valve stands wide open.";
    } else {
      msg = "At " + Math.round(state.N) + " rpm the balls fly out to " + Math.round(s.theta * 180 / Math.PI) +
            "°, holding a cone " + Math.round(s.h * 1000) + " mm tall. The collar has risen " +
            Math.round(s.lift * 1000) + " mm and closed the throttle to " + thr + "%.";
    }
    el.status.textContent = msg;
  }

  function render() {
    var s = solve();
    draw(s);
    paint(s);
    speak(s);
  }

  // ---- control wiring ----
  function setN(v) {
    state.N = clamp(Math.round(v), 0, N_MAX);
    if (nRange.value !== String(state.N)) nRange.value = String(state.N);
    render();
  }
  function setL(v) {
    state.L = clamp(Math.round(v), L_MIN, L_MAX);
    if (lRange.value !== String(state.L)) lRange.value = String(state.L);
    render();
  }
  function setLoad(v) {
    state.load = clamp(Math.round(v), 0, 90);
    if (loadRange.value !== String(state.load)) loadRange.value = String(state.load);
    settleTime = 0;                             // the balance has moved; let it re-settle
    render();
  }

  // ---- the governing loop, run under its own power ----
  var rafId = null, lastTs = null, settleTime = 0;

  function tick(ts) {
    if (state.mode !== "govern") return;
    if (lastTs === null) lastTs = ts;
    var dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;

    var L = state.L / 1000;
    var wc = Math.sqrt(G / L);
    var w = omega(state.N);
    var u = throttleFrac(w, L, wc);
    var residual = TMAX * u - state.load / 100 - DAMP * w;
    w += (residual / INERTIA) * dt;
    w = clamp(w, 0, omega(N_MAX));
    // The integrator keeps the speed at full precision — rounding it back to a
    // whole rpm each frame would let steps smaller than half an rpm vanish, and
    // the loop would deadlock short of the balance. Only the display rounds.
    state.N = clamp(rpm(w), 0, N_MAX);
    nRange.value = String(Math.round(state.N));

    // settled when the shaft has stopped chasing the balance for a moment
    var wasGoverned = lastGoverned;
    if (Math.abs(residual) < 0.008) settleTime += dt; else settleTime = 0;
    lastGoverned = settleTime > 0.25;
    if (lastGoverned && !wasGoverned) pingCollar();

    render();
    rafId = window.requestAnimationFrame(tick);
  }

  function pingCollar() {
    var halo = svg.querySelector(".collar-halo");
    if (halo) {
      halo.classList.remove("pinged");
      void halo.getBBox;                        // let the class removal take
      halo.classList.add("pinged");
    }
  }

  function setMode(mode) {
    state.mode = mode;
    var governing = (mode === "govern");
    governBtn.setAttribute("aria-pressed", governing ? "true" : "false");
    governBtn.textContent = governing ? "Take the wheel" : "Govern";
    nRange.disabled = governing;
    nRange.parentNode.classList.toggle("is-locked", governing);
    if (governing) {
      lastGoverned = false;
      settleTime = 0;
      lastTs = null;
      rafId = window.requestAnimationFrame(tick);
    } else if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
      lastGoverned = false;
    }
    render();
  }

  nRange.addEventListener("input", function () {
    if (state.mode === "govern") setMode("direct");   // taking the wheel by hand
    setN(parseFloat(nRange.value));
  });
  lRange.addEventListener("input", function () { setL(parseFloat(lRange.value)); });
  loadRange.addEventListener("input", function () { setLoad(parseFloat(loadRange.value)); });

  governBtn.addEventListener("click", function () {
    setMode(state.mode === "govern" ? "direct" : "govern");
  });
  restBtn.addEventListener("click", function () {
    if (state.mode === "govern") setMode("direct");
    setN(0);                                    // let the shaft stop; the balls hang
  });
  resetBtn.addEventListener("click", function () {
    if (state.mode === "govern") setMode("direct");
    setL(DEFAULTS.L); setLoad(DEFAULTS.load); setN(DEFAULTS.N);
  });

  // ---- boot ----
  nRange.max = N_MAX;
  lRange.min = L_MIN; lRange.max = L_MAX;
  render();
})();
