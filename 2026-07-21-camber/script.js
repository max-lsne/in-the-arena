/* ==========================================================================
   Camber — the bench.

   A beam is built with a crown (the camber) and then loaded. The load pulls
   it down by a fixed deflection set by the span and the weight. Where it comes
   to rest is camber minus deflection: proud if there is crown to spare, true if
   they cancel, sagging if the load overran the crown. The whole bench is that
   one subtraction, drawn to scale.
   ========================================================================== */

(function () {
  "use strict";

  // --- The model ---------------------------------------------------------
  var SPAN_MIN = 1.2, SPAN_MAX = 12.0, SPAN_STEP = 0.6;   // metres
  var LOAD_MIN = 0,   LOAD_MAX = 10,   LOAD_STEP = 1;     // load index
  var CAM_MIN = 0,    CAM_MAX = 200,   CAM_STEP = 4;      // millimetres
  var TOLERANCE = 5;                                       // mm to read "true"
  var DEFL_K = 1.5;                                        // deflection constant

  var SEED = { name: "Oak mantel", span: 3.6, load: 4, camber: 0 };

  var state = {
    name: SEED.name,
    span: SEED.span,
    load: SEED.load,
    camber: SEED.camber
  };

  // --- Persistence -------------------------------------------------------
  // The beam you lay out — its name, span, load, and crown — is kept in the
  // browser and nowhere else, so the bench is still there when you come back.
  var STORAGE_KEY = "camber:beam:v1";

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    if (!saved || typeof saved !== "object") return;

    if (typeof saved.name === "string") state.name = saved.name.slice(0, 40);
    if (isFinite(saved.span)) {
      state.span = clamp(Math.round(saved.span / SPAN_STEP) * SPAN_STEP,
        SPAN_MIN, SPAN_MAX);
    }
    if (isFinite(saved.load)) {
      state.load = clamp(Math.round(saved.load), LOAD_MIN, LOAD_MAX);
    }
    if (isFinite(saved.camber)) {
      state.camber = clamp(Math.round(saved.camber / CAM_STEP) * CAM_STEP,
        CAM_MIN, CAM_MAX);
    }
  }

  // --- Geometry of the drawing ------------------------------------------
  var VB_W = 900, VB_H = 300;
  var X_L = 70, X_R = 830, X_MID = (X_L + X_R) / 2;
  var Y_DATUM = 170;
  var PX_PER_MM = 0.62;   // vertical scale: 200 mm -> 124 px

  // --- Elements ----------------------------------------------------------
  var el = {};
  [
    "span", "span-datum", "span-built", "span-loaded", "span-pier-l",
    "span-pier-r", "span-loadmarks", "span-crownmark", "span-caption",
    "beam-name", "span-val", "load-val", "camber-val",
    "span-down", "span-up", "load-down", "load-up", "camber-down", "camber-up",
    "build-true", "reset-bench", "presets",
    "reading-crown", "reading-unit", "reading-defl", "reading-cam",
    "bench-verdict"
  ].forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  // --- Maths -------------------------------------------------------------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function deflection() {
    return Math.round(state.load * state.span * DEFL_K);
  }

  function crownAtRest() {
    // Where the loaded beam comes to rest, relative to the datum.
    // Positive = proud (a hump), negative = sagging into a dip.
    return state.camber - deflection();
  }

  function verdict() {
    if (state.load === 0 && state.camber === 0) return "flat";
    var c = crownAtRest();
    if (c > TOLERANCE) return "proud";
    if (c < -TOLERANCE) return "dip";
    return "true";
  }

  // --- Drawing helpers ---------------------------------------------------
  // A parabola pinned at both piers with a given mid-span rise (px, up = +).
  function beamPath(risePx) {
    var cy = Y_DATUM - 2 * risePx; // quadratic control pt yields half its offset
    return "M " + X_L + " " + Y_DATUM +
           " Q " + X_MID + " " + cy.toFixed(1) +
           " " + X_R + " " + Y_DATUM;
  }

  function pierPath(x) {
    return "M " + x + " " + Y_DATUM +
           " l -9 22 l 18 0 z";
  }

  function svg(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function renderLoadMarks() {
    var g = el["span-loadmarks"];
    g.textContent = "";
    var n = state.load;
    if (n <= 0) return;
    var left = 130, right = 770, top = 66, bottom = 112;
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? X_MID : left + (right - left) * (i / (n - 1));
      var line = svg("line");
      line.setAttribute("x1", x); line.setAttribute("y1", top);
      line.setAttribute("x2", x); line.setAttribute("y2", bottom);
      g.appendChild(line);
      var head = svg("path");
      head.setAttribute("d", "M " + x + " " + (bottom + 6) +
        " l -4 -7 l 8 0 z");
      g.appendChild(head);
    }
  }

  function renderCrownMark() {
    var g = el["span-crownmark"];
    g.textContent = "";
    var c = crownAtRest();
    var peakY = Y_DATUM - c * PX_PER_MM;

    var line = svg("line");
    line.setAttribute("x1", X_MID); line.setAttribute("y1", Y_DATUM);
    line.setAttribute("x2", X_MID); line.setAttribute("y2", peakY);
    g.appendChild(line);

    var v = verdict();
    var label;
    if (v === "flat") label = "";
    else if (v === "true") label = "true";
    else if (v === "proud") label = "+" + c + " mm";
    else label = "−" + Math.abs(c) + " mm"; // minus sign

    if (label) {
      var text = svg("text");
      var above = c >= 0;
      text.setAttribute("x", X_MID + 10);
      text.setAttribute("y", (above ? peakY - 6 : peakY + 16));
      text.textContent = label;
      g.appendChild(text);
    }
  }

  var VERDICT_TEXT = {
    flat: "Set a load, then build in a crown to meet it.",
    dip: function (d) {
      return "Sagging — " + d + " mm below the line. The load overran the " +
        "camber; build in more crown until the beam lands on the datum.";
    },
    true: function () {
      return "True — the crown and the load cancel. Built proud by " +
        state.camber + " mm, it settles dead level under the load; you would " +
        "never know the camber was there.";
    },
    proud: function (c) {
      return "Proud — " + c + " mm of hump left. The load can't pull it " +
        "down this far; take some camber out until the beam lands on the line.";
    }
  };

  var CAPTION = {
    flat: "A flat beam, unloaded — nothing built in, nothing taken away.",
    dip: "The load has pulled the beam below the datum — there was not enough crown to spend.",
    true: "The load has settled the beam onto the datum — the camber is spent exactly.",
    proud: "The beam still stands proud of the datum — more crown was built in than the load could take."
  };

  // --- Render ------------------------------------------------------------
  function render() {
    var defl = deflection();
    var c = crownAtRest();
    var v = verdict();

    // Dials
    el["span-val"].textContent = state.span.toFixed(1) + " m";
    el["load-val"].textContent = String(state.load);
    el["camber-val"].textContent = state.camber + " mm";
    el["beam-name"].value = state.name;

    // Piers + datum stay fixed; beams flex
    el["span-pier-l"].setAttribute("d", pierPath(X_L));
    el["span-pier-r"].setAttribute("d", pierPath(X_R));
    el["span-built"].setAttribute("d", beamPath(state.camber * PX_PER_MM));
    el["span-loaded"].setAttribute("d", beamPath(c * PX_PER_MM));

    var loadColor = {
      flat: "var(--accent)", true: "var(--true)",
      dip: "var(--dip)", proud: "var(--proud)"
    }[v];
    el["span-loaded"].style.stroke = loadColor;

    renderLoadMarks();
    renderCrownMark();
    el["span-caption"].textContent = CAPTION[v];

    // Reading
    el["reading-crown"].textContent = String(Math.abs(c));
    var unit = {
      flat: "mm — no load, no crown",
      true: "mm off true — lands on the line",
      dip: "mm below the line",
      proud: "mm proud of the line"
    }[v];
    el["reading-unit"].textContent = unit;
    el["reading-defl"].textContent = defl + " mm deflection";
    el["reading-cam"].textContent = state.camber + " mm camber built";

    // Verdict
    var vt = VERDICT_TEXT[v];
    el["bench-verdict"].textContent = typeof vt === "function"
      ? vt(v === "dip" ? Math.abs(c) : c)
      : vt;
    el["bench-verdict"].setAttribute("data-state", v);

    syncPresets();
    save();
  }

  // --- Presets -----------------------------------------------------------
  function syncPresets() {
    var buttons = el["presets"].querySelectorAll(".preset");
    buttons.forEach(function (b) {
      var match = parseFloat(b.dataset.span) === state.span &&
        parseInt(b.dataset.load, 10) === state.load &&
        b.dataset.name === state.name;
      b.classList.toggle("is-active", match);
    });
  }

  // --- Events ------------------------------------------------------------
  function stepSpan(dir) {
    state.span = clamp(
      Math.round((state.span + dir * SPAN_STEP) * 10) / 10,
      SPAN_MIN, SPAN_MAX
    );
    render();
  }
  function stepLoad(dir) {
    state.load = clamp(state.load + dir * LOAD_STEP, LOAD_MIN, LOAD_MAX);
    render();
  }
  function stepCamber(dir) {
    state.camber = clamp(state.camber + dir * CAM_STEP, CAM_MIN, CAM_MAX);
    render();
  }
  function buildTrue() {
    state.camber = clamp(deflection(), CAM_MIN, CAM_MAX);
    render();
  }
  function reset() {
    state.name = SEED.name;
    state.span = SEED.span;
    state.load = SEED.load;
    state.camber = SEED.camber;
    render();
  }

  el["span-down"].addEventListener("click", function () { stepSpan(-1); });
  el["span-up"].addEventListener("click", function () { stepSpan(1); });
  el["load-down"].addEventListener("click", function () { stepLoad(-1); });
  el["load-up"].addEventListener("click", function () { stepLoad(1); });
  el["camber-down"].addEventListener("click", function () { stepCamber(-1); });
  el["camber-up"].addEventListener("click", function () { stepCamber(1); });
  el["build-true"].addEventListener("click", buildTrue);
  el["reset-bench"].addEventListener("click", reset);

  el["beam-name"].addEventListener("input", function () {
    state.name = el["beam-name"].value;
    syncPresets();
    save();
  });

  el["presets"].addEventListener("click", function (e) {
    var b = e.target.closest(".preset");
    if (!b) return;
    state.span = parseFloat(b.dataset.span);
    state.load = parseInt(b.dataset.load, 10);
    state.name = b.dataset.name;
    state.camber = 0; // present the sag; let the maker build it back true
    render();
  });

  // --- Keyboard ----------------------------------------------------------
  // The whole bench is workable from the keys: [ ] shape the crown, , . set the
  // load, − = set the span, T builds it true, R resets. Typing in the name
  // field is left alone.
  document.addEventListener("keydown", function (e) {
    if (e.target === el["beam-name"]) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var handled = true;
    switch (e.key) {
      case "[": stepCamber(-1); break;
      case "]": stepCamber(1); break;
      case ",": stepLoad(-1); break;
      case ".": stepLoad(1); break;
      case "-": case "_": stepSpan(-1); break;
      case "=": case "+": stepSpan(1); break;
      case "t": case "T": case "Enter": buildTrue(); break;
      case "r": case "R": reset(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  // --- Go ----------------------------------------------------------------
  load();
  render();
})();
