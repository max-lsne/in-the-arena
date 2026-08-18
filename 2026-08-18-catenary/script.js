/* Catenary — a bench for the one curve a hanging chain must take, and the arch it
 * becomes when you turn it over. In the arena, 2026-08-18.
 *
 * A free chain settles to y = a·cosh(x/a) because the horizontal tension H is the
 * same at every point — nothing pulls sideways to change it — while the vertical
 * pull has to carry the weight of all the chain hung below, and that weight grows
 * with the chain's own length. The one constant a = H/w (tension over weight-per-
 * length) sets the whole shape. Pin the chain between two points a span S apart,
 * with one end raised by h, and give it a length L longer than the straight gap:
 * the shape is fixed, and it is found from
 *     sqrt(L² − h²) = 2a·sinh(S / 2a),
 * one equation in the single unknown a. Everything the bench shows — the sag, the
 * pull at the anchors and at the belly, the steepest slope — follows from a. Flip
 * the curve about its chord and it stands as an arch: as hangs the flexible line,
 * so but inverted stands the rigid arch (Hooke, 1675).
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var R2D = 180 / Math.PI;

  // viewBox — a side-on view, chain slung between two anchors
  var VBW = 640, VBH = 460, PAD = 34;

  var SPAN_MIN = 4, SPAN_MAX = 16;
  var SLACK_MIN = 2, SLACK_MAX = 120;      // percent longer than the straight gap
  var TILT_MIN = -6, TILT_MAX = 6;         // metres one anchor is raised over the other

  var N = 140;                              // samples along the chain
  var FLIP_MS = 720;                        // duration of the flip morph

  var DEFAULTS = { span: 10, slack: 30, tilt: 0 };
  var STORE_KEY = "arena.catenary.v1";

  var state = { span: DEFAULTS.span, slack: DEFAULTS.slack, tilt: DEFAULTS.tilt };
  var paraOn = false;
  var morphT = 0;                           // 0 = hanging chain, 1 = inverted arch
  var flipTarget = 0;

  // Motion preference — a reader who asks for less motion gets no flip morph: the
  // chain snaps straight between hanging and arch. Re-checked live, so toggling the
  // system setting takes effect without a reload.
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOff() { return !!(reduceMQ && reduceMQ.matches); }

  // hyperbolic + inverse helpers, defined outright so the bench does not lean on
  // any one engine having Math.sinh / Math.atanh
  function sinh(x) { return (Math.exp(x) - Math.exp(-x)) / 2; }
  function cosh(x) { return (Math.exp(x) + Math.exp(-x)) / 2; }
  function atanh(x) { return 0.5 * Math.log((1 + x) / (1 - x)); }

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var spanRange = document.getElementById("spanRange");
  var slackRange = document.getElementById("slackRange");
  var tiltRange = document.getElementById("tiltRange");
  var flipBtn = document.getElementById("flipBtn");
  var paraBtn = document.getElementById("paraBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    caseNum: document.getElementById("readCase"),
    caseCap: document.getElementById("readCap"),
    eq: document.getElementById("rbEq"),
    end: document.getElementById("rfEnd"),
    belly: document.getElementById("rfBelly"),
    angle: document.getElementById("rfAngle"),
    len: document.getElementById("rfLen"),
    a: document.getElementById("rfA"),
    slack: document.getElementById("rfSlack"),
    spanVal: document.getElementById("spanVal"),
    slackVal: document.getElementById("slackVal"),
    tiltVal: document.getElementById("tiltVal"),
    status: document.getElementById("status")
  };

  // ---- small helpers ----
  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]); }
    return node;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Keep the chain as you left it, across visits — the span, the slack and the
  // tilt, but not whether it was flipped to an arch or which overlay was on (a
  // page should open as a hanging chain, not mid-somersault).
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        span: state.span, slack: state.slack, tilt: state.tilt
      }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s.span === "number" && isFinite(s.span)) state.span = clamp(s.span, SPAN_MIN, SPAN_MAX);
      if (s && typeof s.slack === "number" && isFinite(s.slack)) state.slack = clamp(s.slack, SLACK_MIN, SLACK_MAX);
      if (s && typeof s.tilt === "number" && isFinite(s.tilt)) state.tilt = clamp(s.tilt, TILT_MIN, TILT_MAX);
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }

  // sinh(u)/u climbs monotonically from 1 (as u→0) upward, so a plain bracketed
  // bisection finds the u that matches a given ratio r>1 without any guessing.
  function sinhOverU(u) { return u < 1e-8 ? 1 + u * u / 6 : sinh(u) / u; }
  function solveU(r) {
    if (r <= 1) return 0;
    var lo = 1e-6, hi = 1;
    while (sinhOverU(hi) < r && hi < 200) hi *= 1.6;
    for (var i = 0; i < 90; i++) {
      var mid = 0.5 * (lo + hi);
      if (sinhOverU(mid) < r) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  // Everything the bench needs, built from the one shape equation. World frame:
  // anchor A at (0,0), anchor B at (span, tilt), y measured upward.
  function build() {
    var S = state.span;
    var h = state.tilt;
    var L = S * (1 + state.slack / 100);
    var straight = Math.sqrt(S * S + h * h);

    var taut = L <= straight * 1.0006;      // no slack left to hang — a straight line
    var A = { x: 0, y: 0 }, B = { x: S, y: h };

    var hang = [], i, x, y;
    var a, x0, endRatio, sag = 0, exIdx = 0, angleDeg, endPullW, bellyPullW;

    if (taut) {
      a = Infinity; x0 = S / 2; endRatio = 1;
      for (i = 0; i <= N; i++) { x = S * i / N; hang.push({ x: x, y: h * x / S }); }
      angleDeg = Math.atan2(Math.abs(h), S) * R2D;
      endPullW = Infinity; bellyPullW = Infinity;
    } else {
      var r = Math.sqrt(L * L - h * h) / S;
      var u = solveU(r);
      a = S / (2 * u);
      x0 = S / 2 - a * atanh(h / L);        // horizontal place of the lowest point
      var y0off = a * cosh(x0 / a);          // so that y(0) = 0
      var lowY = Infinity;
      for (i = 0; i <= N; i++) {
        x = S * i / N;
        y = a * cosh((x - x0) / a) - y0off;
        hang.push({ x: x, y: y });
        var chordY = h * x / S;
        var drop = chordY - y;
        if (drop > sag) sag = drop;
        if (y < lowY) { lowY = y; exIdx = i; }
      }
      var slopeA = Math.abs(sinh((0 - x0) / a));
      var slopeB = Math.abs(sinh((S - x0) / a));
      angleDeg = Math.atan(Math.max(slopeA, slopeB)) * R2D;
      // tensions in multiples of the chain's own weight W = w·L (w = 1 here):
      // H = a (horizontal, the least the tension falls to); T = a·cosh(...) at a point.
      endRatio = Math.max(cosh(x0 / a), cosh((S - x0) / a));
      endPullW = a * endRatio / L;
      bellyPullW = a / L;
    }

    // the inverted arch — the same curve reflected across the chord A→B, so the
    // two anchors stay pinned and the belly rises into an apex
    var d2 = S * S + h * h;
    var arch = [];
    for (i = 0; i < hang.length; i++) {
      var p = hang[i];
      var tproj = (p.x * S + p.y * h) / d2;
      arch.push({ x: 2 * tproj * S - p.x, y: 2 * tproj * h - p.y });
    }

    // a parabola through the two anchors and the belly, for the comparison overlay
    var paraPts = null;
    if (!taut && exIdx > 2 && exIdx < N - 2) {
      var bx = hang[exIdx].x, by = hang[exIdx].y;
      var alpha = (by - bx * h / S) / (bx * (bx - S));
      var beta = h / S - alpha * S;
      paraPts = [];
      for (i = 0; i <= N; i++) { x = S * i / N; paraPts.push({ x: x, y: alpha * x * x + beta * x }); }
    }

    return {
      S: S, h: h, L: L, taut: taut, a: a, x0: x0, endRatio: endRatio,
      A: A, B: B, hang: hang, arch: arch, exIdx: exIdx, paraPts: paraPts,
      sag: sag, angleDeg: angleDeg, endPullW: endPullW, bellyPullW: bellyPullW
    };
  }

  var model = build();

  // ---- fit: map the current (morphed) world points into the drawing area ----
  function fitFor(pts, groundY) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, i, p;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    if (groundY < minY) minY = groundY;
    var spanX = Math.max(maxX - minX, 1e-3), spanY = Math.max(maxY - minY, 1e-3);
    var s = Math.min((VBW - 2 * PAD) / spanX, (VBH - 2 * PAD) / spanY);
    var offX = PAD + ((VBW - 2 * PAD) - s * spanX) / 2;
    var offY = PAD + ((VBH - 2 * PAD) - s * spanY) / 2;
    return {
      x: function (wx) { return offX + s * (wx - minX); },
      y: function (wy) { return offY + s * (maxY - wy); }
    };
  }

  // ---- drawing ----
  function draw(m, t) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(make("rect", { x: 4, y: 4, width: VBW - 8, height: VBH - 8, rx: 14, class: "svg-frame" }));

    // current shape = the two configs blended by t
    var pts = [], i, lowY = Infinity;
    for (i = 0; i < m.hang.length; i++) {
      var wx = lerp(m.hang[i].x, m.arch[i].x, t);
      var wy = lerp(m.hang[i].y, m.arch[i].y, t);
      pts.push({ x: wx, y: wy });
      if (wy < lowY) lowY = wy;
    }
    var A = { x: lerp(m.A.x, m.A.x, t), y: m.A.y }, B = { x: m.B.x, y: m.B.y };
    var groundY = Math.min(lowY, m.A.y, m.B.y) - 0.14 * m.S;
    var fit = fitFor(pts.concat([A, B, { x: 0, y: groundY }, { x: m.S, y: groundY }]), groundY);

    var isArch = t > 0.5;

    // ground line + a run of short hatch strokes beneath it
    var gy = fit.y(groundY), gx0 = fit.x(-0.15 * m.S), gx1 = fit.x(m.S + 0.15 * m.S);
    svg.appendChild(make("line", { x1: gx0, y1: gy, x2: gx1, y2: gy, class: "ground-line" }));
    for (var hx = gx0 + 8; hx < gx1; hx += 15) {
      svg.appendChild(make("line", { x1: hx, y1: gy, x2: hx - 8, y2: gy + 9, class: "ground-hatch" }));
    }

    // piers from each anchor down to the ground
    var ax = fit.x(A.x), ay = fit.y(A.y), bx = fit.x(B.x), by = fit.y(B.y);
    svg.appendChild(make("line", { x1: ax, y1: ay, x2: ax, y2: gy, class: "anchor-pin" }));
    svg.appendChild(make("line", { x1: bx, y1: by, x2: bx, y2: gy, class: "anchor-pin" }));

    // chord guide + parabola overlay belong to the hanging chain; fade out on flip
    if (t < 0.5) {
      svg.appendChild(make("line", { x1: ax, y1: ay, x2: bx, y2: by, class: "chord-guide" }));
      if (paraOn && m.paraPts) {
        var pp = [];
        for (i = 0; i < m.paraPts.length; i++) pp.push(fit.x(m.paraPts[i].x).toFixed(1) + "," + fit.y(m.paraPts[i].y).toFixed(1));
        svg.appendChild(make("polyline", { points: pp.join(" "), class: "para-curve" }));
      }
    }

    // the chain itself, in short segments whose width tracks the local tension
    for (i = 0; i < pts.length - 1; i++) {
      var xm = m.S * (i + 0.5) / N;
      var ratio = m.taut ? 1 : cosh((xm - m.x0) / m.a);
      var w = m.taut ? 3.0 : clamp(2.3 + 3.2 * (ratio - 1) / (m.endRatio - 1 + 1e-9), 2.3, 5.8);
      svg.appendChild(make("line", {
        x1: fit.x(pts[i].x).toFixed(1), y1: fit.y(pts[i].y).toFixed(1),
        x2: fit.x(pts[i + 1].x).toFixed(1), y2: fit.y(pts[i + 1].y).toFixed(1),
        "stroke-width": w.toFixed(2), class: "chain-seg" + (isArch ? " is-arch" : "")
      }));
    }

    // the sag measure, at the belly, while hanging
    if (t < 0.5 && !m.taut) {
      var ex = m.hang[m.exIdx];
      var chordAtEx = m.h * ex.x / m.S;
      var sx = fit.x(ex.x), syTop = fit.y(chordAtEx), syBot = fit.y(ex.y);
      svg.appendChild(make("line", { x1: sx, y1: syTop, x2: sx, y2: syBot, class: "sag-line" }));
      svg.appendChild(make("circle", { cx: sx, cy: syBot, r: 4.5, class: "belly-dot" }));
      label(sx + 8, (syTop + syBot) / 2 + 4, "start", m.sag.toFixed(1) + " m", "sag-label");
    }

    // the apex, when stood up as an arch
    if (isArch) {
      var apex = { x: lerp(m.hang[m.exIdx].x, m.arch[m.exIdx].x, t), y: lerp(m.hang[m.exIdx].y, m.arch[m.exIdx].y, t) };
      var apx = fit.x(apex.x), apy = fit.y(apex.y);
      svg.appendChild(make("circle", { cx: apx, cy: apy, r: 4.5, class: "apex-dot" }));
      label(apx, apy - 12, "middle", "compression", "arch-note");
    }

    // the two anchors last, so they sit on top of the chain
    svg.appendChild(make("rect", { x: ax - 5, y: ay - 5, width: 10, height: 10, rx: 2, class: "anchor" }));
    svg.appendChild(make("rect", { x: bx - 5, y: by - 5, width: 10, height: 10, rx: 2, class: "anchor" }));
  }

  function label(x, y, anchor, text, cls) {
    var t = make("text", { x: x, y: y, "text-anchor": anchor, class: cls || "axis-label" });
    t.textContent = text;
    svg.appendChild(t);
  }

  // ---- readout ----
  function wfmt(v) { return isFinite(v) ? v.toFixed(2) + " W" : "→ ∞"; }

  function paint(m, t) {
    var isArch = t > 0.5;
    el.caseNum.textContent = m.sag.toFixed(1) + " m";
    el.caseNum.className = "read-num mono" + (m.taut ? " is-taut" : (isArch ? " is-arch" : ""));
    el.caseCap.textContent = isArch ? "rise" : "sag";

    el.eq.textContent = m.taut
      ? "taut — the chain runs dead straight"
      : (isArch ? "inverted: every pull becomes a push" : "y = a·cosh(x ⁄ a)");

    el.end.textContent = wfmt(m.endPullW);
    el.belly.textContent = wfmt(m.bellyPullW);
    el.angle.textContent = Math.round(m.angleDeg) + "°";
    el.len.textContent = m.L.toFixed(1) + " m";
    el.a.textContent = m.taut ? "→ ∞" : m.a.toFixed(1) + " m";
    el.slack.textContent = "+" + Math.round(state.slack) + "%";

    el.spanVal.textContent = state.span.toFixed(1) + " m";
    el.slackVal.textContent = "+" + Math.round(state.slack) + "%";
    el.tiltVal.textContent = tiltText(state.tilt);
  }

  function tiltText(h) {
    if (Math.abs(h) < 0.05) return "level";
    return (h > 0 ? "+" : "−") + Math.abs(h).toFixed(1) + " m";
  }

  // Speak the settled shape, not every frame of the flip. A live region written on
  // every morph frame would flood a screen reader, so the announcement is debounced
  // and phrased as plain words a reader voices cleanly.
  var announceTimer = null;
  function scheduleAnnounce(m, t) {
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { speak(m, t); }, 400);
  }
  function speak(m, t) {
    var place = "span " + m.S.toFixed(1) + " metres, " +
      Math.round(state.slack) + " percent slack" +
      (Math.abs(m.h) < 0.05 ? ", anchors level" : (", one anchor raised " + Math.abs(m.h).toFixed(1) + " metres"));
    var msg;
    if (t > 0.5) {
      msg = "Inverted. The same curve stood on its head as an arch rising " + m.sag.toFixed(1) +
        " metres, carrying itself in pure compression — every pull of the chain now a push. " + place + ".";
    } else if (m.taut) {
      msg = "Taut. With " + place + ", the chain has no slack left to hang and runs dead straight; " +
        "holding it so would take an unbounded pull.";
    } else {
      msg = "A chain hanging with " + place + ". It sags " + m.sag.toFixed(1) +
        " metres to a belly, the curve constant a is " + m.a.toFixed(1) +
        " metres, and it reaches its steepest at " + Math.round(m.angleDeg) + " degrees at the anchors. " +
        "The pull is " + m.endPullW.toFixed(2) + " of the chain's own weight at the anchors and " +
        m.bellyPullW.toFixed(2) + " at the belly. Press flip to stand it up as an arch.";
    }
    el.status.textContent = msg;
  }

  function render() {
    model = build();
    draw(model, morphT);
    paint(model, morphT);
    scheduleAnnounce(model, morphT);
    save();
  }

  // ---- the flip morph ----
  var flipRaf = null, flipFrom = 0, flipStart = 0;

  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function flipTo(target) {
    flipTarget = target;
    flipBtn.setAttribute("aria-pressed", target ? "true" : "false");
    flipBtn.textContent = target ? "Hang it back" : "Flip to arch";
    if (flipRaf) { window.cancelAnimationFrame(flipRaf); flipRaf = null; }
    if (motionOff()) {                       // reduced motion: snap, do not morph
      morphT = target;
      draw(model, morphT);
      paint(model, morphT);
      scheduleAnnounce(model, morphT);
      return;
    }
    flipFrom = morphT;
    flipStart = 0;
    flipRaf = window.requestAnimationFrame(flipStep);
  }
  function flipStep(ts) {
    if (!flipStart) flipStart = ts;
    var k = clamp((ts - flipStart) / FLIP_MS, 0, 1);
    morphT = lerp(flipFrom, flipTarget, easeInOut(k));
    draw(model, morphT);
    paint(model, morphT);
    if (k < 1) flipRaf = window.requestAnimationFrame(flipStep);
    else { morphT = flipTarget; flipRaf = null; scheduleAnnounce(model, morphT); }
  }

  // ---- control wiring ----
  function setSpan(v) {
    state.span = clamp(Math.round(v * 2) / 2, SPAN_MIN, SPAN_MAX);
    if (spanRange.value !== String(state.span)) spanRange.value = String(state.span);
    render();
  }
  function setSlack(v) {
    state.slack = clamp(Math.round(v), SLACK_MIN, SLACK_MAX);
    if (slackRange.value !== String(state.slack)) slackRange.value = String(state.slack);
    render();
  }
  function setTilt(v) {
    state.tilt = clamp(Math.round(v * 2) / 2, TILT_MIN, TILT_MAX);
    if (tiltRange.value !== String(state.tilt)) tiltRange.value = String(state.tilt);
    render();
  }

  spanRange.addEventListener("input", function () { setSpan(parseFloat(spanRange.value)); });
  slackRange.addEventListener("input", function () { setSlack(parseFloat(slackRange.value)); });
  tiltRange.addEventListener("input", function () { setTilt(parseFloat(tiltRange.value)); });

  flipBtn.addEventListener("click", function () { flipTo(flipTarget ? 0 : 1); });
  if (reduceMQ) {
    var onMotionChange = function () {
      if (motionOff() && flipRaf) {          // caught mid-morph — jump to the target
        window.cancelAnimationFrame(flipRaf); flipRaf = null;
        morphT = flipTarget;
        draw(model, morphT); paint(model, morphT); scheduleAnnounce(model, morphT);
      }
    };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotionChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onMotionChange);   // older browsers
  }
  paraBtn.addEventListener("click", function () {
    paraOn = !paraOn;
    paraBtn.setAttribute("aria-pressed", paraOn ? "true" : "false");
    render();
  });
  resetBtn.addEventListener("click", function () {
    if (flipTarget) flipTo(0);
    setSpan(DEFAULTS.span); setSlack(DEFAULTS.slack); setTilt(DEFAULTS.tilt);
  });

  // ---- boot ----
  spanRange.min = SPAN_MIN; spanRange.max = SPAN_MAX;
  slackRange.min = SLACK_MIN; slackRange.max = SLACK_MAX;
  tiltRange.min = TILT_MIN; tiltRange.max = TILT_MAX;
  restore();
  setSpan(state.span); setSlack(state.slack); setTilt(state.tilt);
})();
