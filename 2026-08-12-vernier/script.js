/* Vernier — a bench for one caliper, read the way the eye reads it.
 * In the arena, 2026-08-12.
 *
 * The whole instrument is one fact: N divisions of the vernier are laid
 * across N-1 divisions of the main scale, so each vernier division is short
 * of a main one by exactly D/N — the least count. Slide the vernier and the
 * marks fall in and out of step; the one that stands square against a main
 * mark counts the least-counts past the last whole division. That is the
 * reading. No interpolation, only "which line is which".
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var D = 1;                 // main-scale division, in mm
  var GAP_MIN = 0;
  var GAP_MAX = 50;
  var DEFAULTS = { gap: 23.65, n: 20 };
  var STORE_KEY = "arena.vernier.v1";
  var VALID_N = [10, 20, 50];

  // svg geometry
  var VB_W = 720, VB_H = 260;
  var PAD = 26;                       // left/right padding inside the viewBox
  var USABLE = VB_W - 2 * PAD;
  var MAIN_RAIL_Y = 128;
  var VERN_RAIL_Y = 132;
  var TICK_MINOR = 15;
  var TICK_MAJOR = 26;
  var TICK_HIT = 32;

  var state = { gap: DEFAULTS.gap, n: DEFAULTS.n };

  // Motion preference — the one animation (the coincidence ping) is skipped
  // when the reader asks for less motion, and re-checked live if they change it.
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOff() { return !!(reduceMQ && reduceMQ.matches); }
  var lastKStar = null, lastN = null;   // to ping only when the lit mark actually moves

  // ---- element handles ----
  var svg = document.getElementById("scaleSvg");
  var gapRange = document.getElementById("gapRange");
  var segBtns = Array.prototype.slice.call(document.querySelectorAll(".seg-btn"));
  var snapBtn = document.getElementById("snapBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    total: document.getElementById("readTotal"),
    main: document.getElementById("rbMain"),
    vern: document.getElementById("rbVern"),
    least: document.getElementById("rfLeast"),
    mark: document.getElementById("rfMark"),
    doubt: document.getElementById("rfDoubt"),
    mag: document.getElementById("rfMag"),
    gapVal: document.getElementById("gapVal"),
    status: document.getElementById("status")
  };

  // ---- small helpers ----
  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]); }
    return node;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // Keep the bench as you left it, across visits.
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ gap: state.gap, n: state.n }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && VALID_N.indexOf(saved.n) !== -1) state.n = saved.n;
      if (saved && typeof saved.gap === "number" && isFinite(saved.gap)) {
        state.gap = clamp(saved.gap, GAP_MIN, GAP_MAX);
      }
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }
  function leastCount() { return D / state.n; }
  function decimalsFor(n) { return n <= 10 ? 1 : 2; }
  function fmt(v, dp) { return v.toFixed(dp); }

  // The reading, worked exactly the way a vernier is read.
  function solve() {
    var lc = leastCount();
    var mainReading = Math.floor(state.gap + 1e-9);
    var frac = state.gap - mainReading;
    var kStar = Math.round(frac * state.n);
    if (kStar >= state.n) { kStar = 0; mainReading += 1; }   // wrapped to the next whole
    var vernValue = kStar * lc;
    var total = mainReading + vernValue;
    return {
      lc: lc,
      mainReading: mainReading,
      kStar: kStar,
      vernValue: vernValue,
      total: total,
      doubt: lc / 2,
      residual: state.gap - total
    };
  }

  // ---- drawing ----
  function draw(r) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var n = state.n;
    var vernSpanMM = (n - 1) * D;                 // vernier is N-1 main divisions long
    var leftMM = 5;                               // main scale shown a little before the vernier zero
    var rightMM = 5;
    var windowMM = leftMM + vernSpanMM + rightMM;
    var pxPerMM = USABLE / windowMM;
    var winLeft = state.gap - leftMM;             // absolute mm at the window's left content edge

    function xOf(mm) { return PAD + (mm - winLeft) * pxPerMM; }

    // frame
    svg.appendChild(make("rect", {
      x: 4, y: 8, width: VB_W - 8, height: VB_H - 16, rx: 12, class: "svg-frame"
    }));

    // --- reading pointer: where the vernier zero sits on the main scale ---
    var px = xOf(state.gap);
    svg.appendChild(make("path", {
      d: "M" + (px - 6) + " " + (MAIN_RAIL_Y - 52) +
         " L" + (px + 6) + " " + (MAIN_RAIL_Y - 52) +
         " L" + px + " " + (MAIN_RAIL_Y - 40) + " Z",
      class: "jaw"
    }));
    svg.appendChild(make("line", {
      x1: px, y1: MAIN_RAIL_Y - 40, x2: px, y2: MAIN_RAIL_Y, class: "coincide-beam"
    }));
    var tag = make("text", { x: px, y: MAIN_RAIL_Y - 58, "text-anchor": "middle", class: "num-main" });
    tag.textContent = "reading";
    svg.appendChild(tag);

    // --- main scale ---
    svg.appendChild(make("line", {
      x1: PAD, y1: MAIN_RAIL_Y, x2: VB_W - PAD, y2: MAIN_RAIL_Y, class: "rail-main"
    }));
    var startMM = Math.max(0, Math.ceil(winLeft));
    var endMM = Math.floor(winLeft + windowMM);
    var hitMain = r.mainReading + r.kStar * ((n - 1) / n);   // main position the lit vernier mark meets
    var hitMainRounded = Math.round(hitMain);
    for (var m = startMM; m <= endMM; m++) {
      var x = xOf(m);
      var major = (m % 5 === 0);
      var isHit = (m === hitMainRounded);
      svg.appendChild(make("line", {
        x1: x, y1: MAIN_RAIL_Y,
        x2: x, y2: MAIN_RAIL_Y - (major ? TICK_MAJOR : TICK_MINOR),
        class: isHit ? "tick-hit" : (major ? "tick-main-major" : "tick-main")
      }));
      if (major) {
        var t = make("text", {
          x: x, y: MAIN_RAIL_Y - TICK_MAJOR - 7, "text-anchor": "middle",
          class: "num-main" + (isHit ? " num-hit" : "")
        });
        t.textContent = String(m);
        svg.appendChild(t);
      }
    }

    // --- vernier scale (the sliding row) ---
    var slider = make("g", { class: "vern-slider" });
    var dVern = (n - 1) / n * D;                    // one vernier division, in mm
    slider.appendChild(make("line", {
      x1: xOf(state.gap), y1: VERN_RAIL_Y,
      x2: xOf(state.gap + vernSpanMM), y2: VERN_RAIL_Y, class: "rail-vern"
    }));
    for (var j = 0; j <= n; j++) {
      var vx = xOf(state.gap + j * dVern);
      var hit = (j === r.kStar);
      var label = (j % 5 === 0 || j === n);
      slider.appendChild(make("line", {
        x1: vx, y1: VERN_RAIL_Y,
        x2: vx, y2: VERN_RAIL_Y + (hit ? TICK_HIT : TICK_MINOR),
        class: hit ? "tick-hit" : "tick-vern" + (label ? "" : " dim")
      }));
      if (label) {
        var vt = make("text", {
          x: vx, y: VERN_RAIL_Y + (hit ? TICK_HIT : TICK_MINOR) + 13, "text-anchor": "middle",
          class: "num-vern" + (hit ? " num-hit" : "")
        });
        vt.textContent = String(j === n ? 0 : j);   // last mark is the next zero
        slider.appendChild(vt);
      }
    }
    // the coincidence beam through both scales at the lit mark
    if (r.kStar >= 0) {
      var cvx = xOf(state.gap + r.kStar * dVern);
      slider.appendChild(make("line", {
        x1: cvx, y1: MAIN_RAIL_Y - TICK_MAJOR, x2: cvx, y2: VERN_RAIL_Y + TICK_HIT,
        class: "coincide-beam"
      }));
    }
    svg.appendChild(slider);

    // Ping the coincidence only when it lands on a new mark — never on the first
    // paint, and never while motion is turned down.
    var moved = (lastKStar !== null) && (r.kStar !== lastKStar || state.n !== lastN);
    if (moved && !motionOff()) {
      var lit = svg.querySelectorAll(".tick-hit, .coincide-beam");
      for (var q = 0; q < lit.length; q++) lit[q].classList.add("pinged");
    }
    lastKStar = r.kStar;
    lastN = state.n;
  }

  // ---- readout + status ----
  function paint(r) {
    var dp = decimalsFor(state.n);
    el.total.textContent = fmt(r.total, dp);
    el.main.textContent = r.mainReading + " mm";
    el.vern.textContent = r.kStar + " × " + fmt(r.lc, dp === 1 ? 1 : 2);
    el.least.textContent = fmt(r.lc, dp === 1 ? 1 : 2) + " mm";
    el.mark.textContent = r.kStar + " / " + state.n;
    el.doubt.textContent = "±" + fmt(r.doubt, dp === 1 ? 2 : 3) + " mm";
    el.mag.textContent = "×" + state.n;
    el.gapVal.textContent = fmt(state.gap, 2) + " mm";
  }

  // Speak the settled reading, not every tick of the drag. A polite live region
  // read on every slider event would flood a screen reader, so the announcement
  // is debounced and phrased as words — "times", "plus or minus" — that a reader
  // voices cleanly, where "×" and "±" would be swallowed or mangled.
  var announceTimer = null;
  function announce(r) {
    var dp = decimalsFor(state.n);
    var lcTxt = fmt(r.lc, dp === 1 ? 1 : 2);
    el.status.textContent =
      fmt(r.total, dp) + " millimetres. Vernier zero just past " + r.mainReading +
      "; mark " + r.kStar + " of " + state.n + " lines up, giving " + r.kStar +
      " times " + lcTxt + ". Reading good to plus or minus " +
      fmt(r.doubt, dp === 1 ? 2 : 3) + " millimetres.";
  }
  function scheduleAnnounce(r) {
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { announce(r); }, 350);
  }

  function render() {
    var r = solve();
    draw(r);
    paint(r);
    save();
    scheduleAnnounce(r);
  }

  // ---- control wiring ----
  function setGap(mm) {
    state.gap = clamp(Math.round(mm * 1000) / 1000, GAP_MIN, GAP_MAX);
    if (gapRange.value !== String(state.gap)) gapRange.value = String(state.gap);
    render();
  }

  function setN(n) {
    state.n = n;
    segBtns.forEach(function (b) {
      b.setAttribute("aria-checked", Number(b.dataset.n) === n ? "true" : "false");
    });
    render();
  }

  function snapToCoincidence() {
    var lc = leastCount();
    setGap(Math.round(state.gap / lc) * lc);
  }

  gapRange.addEventListener("input", function () { setGap(parseFloat(gapRange.value)); });
  segBtns.forEach(function (b) {
    b.addEventListener("click", function () { setN(Number(b.dataset.n)); });
  });
  snapBtn.addEventListener("click", snapToCoincidence);
  if (reduceMQ) {
    var onMotionChange = function () { render(); };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", onMotionChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onMotionChange);   // older browsers
  }
  resetBtn.addEventListener("click", function () {
    setN(DEFAULTS.n);
    setGap(DEFAULTS.gap);
  });

  // Keyboard: work the bench without the mouse. Arrows step by the least count
  // so the coincidence walks one mark at a time; brackets step whole millimetres.
  // When the range slider itself holds focus its native arrow-stepping is left
  // alone, so the two never fight.
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var onRange = (e.target === gapRange);
    var lc = leastCount();
    switch (e.key) {
      case "ArrowLeft":  if (onRange) return; setGap(state.gap - lc); break;
      case "ArrowRight": if (onRange) return; setGap(state.gap + lc); break;
      case "[": setGap(state.gap - 1); break;
      case "]": setGap(state.gap + 1); break;
      case "1": setN(10); break;
      case "2": setN(20); break;
      case "3": setN(50); break;
      case "c": case "C": snapToCoincidence(); break;
      case "r": case "R": setN(DEFAULTS.n); setGap(DEFAULTS.gap); break;
      default: return;
    }
    e.preventDefault();
  });

  // ---- boot ----
  gapRange.min = GAP_MIN;
  gapRange.max = GAP_MAX;
  restore();
  setN(state.n);
  setGap(state.gap);
})();
