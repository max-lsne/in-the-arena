/* Draught — the bench.
 *
 * A fire does not take air; air is pulled through it. Burning heats the gas in
 * the flue, and hot gas is lighter than cold. So the flue stands a tall column
 * of light gas inside the heavy cold air of the day, and the heavy air, pressing
 * in beneath, lifts the light column up and out the top. That buoyant lift —
 * felt at the grate as a pull of fresh air through the fire — is the draught.
 *
 *   pull  =  g · H · (ρ_out − ρ_in)          [the stack effect, in pascals]
 *
 * with air density taken from absolute temperature, ρ ≈ 353 / T (kelvin): the
 * hotter the flue gas, the lighter its column; the colder the day, the heavier
 * the air it is lifted through. That pull drives a flow up the flue against the
 * friction of the bore and the throttle of the damper:
 *
 *   pull  =  ( f·H/d + K + K_damper·throttle ) · ½ · ρ_in · v²   →   solve for v
 *
 * and the flue-gas velocity v is what the reading turns on:
 *
 *   v below what clears the smoke   -> it rolls back into the room. Spills.
 *   v enough to limp, not to burn   -> a lazy, tarring fire.        Sluggish.
 *   v in the clean band             -> smoke lifts, flame stands.   Draws clean.
 *   v far past the appetite         -> heat dragged up the flue.    Roaring.
 *
 * The damper adds resistance the pull must spend against — the way you give back
 * a draught that is stronger than the fire needs. All in SI: metres, kelvin,
 * pascals, m/s. A single flue in cutaway, schematic, per the ideas above.
 */
(function () {
  "use strict";

  var RHO_K = 353;      // ρ ≈ 353 / T(K), dry air near sea level, kg·K/m³
  var G = 9.81;
  var FRICTION = 0.04;  // Darcy friction factor, masonry flue
  var K_BASE = 2.5;     // fixed losses: grate, entry, bends, exit
  var K_DAMPER = 16;    // resistance a fully closed damper adds
  var KEY = "draught.flue.v1";  // where the flue is kept between visits

  var V_SPILL = 0.8;    // below this the pull can't clear the fire's own smoke
  var V_SLOW = 1.5;     // below this it draws, but sluggishly
  var V_FAST = 5.5;     // above this it roars — far more pull than the fire uses

  var DAY = {
    frost: { label: "frost", t: -4 },
    mild:  { label: "mild",  t: 12 },
    warm:  { label: "warm",  t: 26 }
  };

  // Opens on a tall old flue running hot on a frosty night: a fire roaring up the
  // chimney, throwing its heat at the sky. Something to throttle on arrival.
  var DEFAULT = { H: 8.0, T: 300, d: 0.25, k: 0.0, day: "frost" };

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the stack effect -------------------------------------------------
  function compute(s) {
    var Tf = s.T + 273.15;              // flue-gas temperature, kelvin
    var To = DAY[s.day].t + 273.15;     // the day's air, kelvin
    var rhoIn = RHO_K / Tf;             // light hot column
    var rhoOut = RHO_K / To;            // heavy cold day

    var dP = G * s.H * (rhoOut - rhoIn); // buoyant draught, pascals
    var mmwg = dP / G;                   // same pull as a head of water, mm

    var K = FRICTION * s.H / s.d + K_BASE + K_DAMPER * s.k;
    var v = dP > 0 ? Math.sqrt(2 * dP / (rhoIn * K)) : 0; // flue-gas velocity, m/s

    var A = Math.PI * s.d * s.d / 4;     // bore area, m²
    var Q = v * A;                        // volume flow at flue-gas density, m³/s
    var mdot = rhoIn * Q;                 // mass flow, kg/s

    var verdict;
    if (v < V_SPILL) {
      verdict = { key: "fail", head: "Smoke spills",
        note: "the pull can't clear the fire — smoke rolls back into the room" };
    } else if (v < V_SLOW) {
      verdict = { key: "slow", head: "Draws sluggish",
        note: "enough pull to limp, not to burn clean — a lazy, tarring fire" };
    } else if (v <= V_FAST) {
      verdict = { key: "hold", head: "Draws clean",
        note: "the pull matches the fire — smoke lifts and the flame stands up" };
    } else {
      verdict = { key: "fail", head: "Roars up the flue",
        note: "far more pull than the fire needs — heat dragged up the chimney" };
    }

    return {
      Tf: Tf, To: To, rhoIn: rhoIn, rhoOut: rhoOut,
      dP: dP, mmwg: mmwg, K: K, v: v, A: A, Q: Q, mdot: mdot,
      verdict: verdict
    };
  }

  // ---- drawing ----------------------------------------------------------
  var VBW = 720, VBH = 470;
  var GROUND = 404;
  var CX = 250;                 // flue centreline
  var FB = { w: 150, h: 52 };   // firebox
  var GAUGE = { x: 655, w: 13, top: 70, bot: GROUND, vmax: 7 };

  function boreW(d) { return 16 + (d - 0.1) / 0.3 * 28; }        // 16..44 px
  function flueH(H) { return 120 + (H - 2) / 10 * 220; }          // 120..340 px

  function svgFor(s, r) {
    var bw = boreW(s.d);
    var fh = flueH(s.H);
    var fbTop = GROUND - FB.h;
    var flueTop = fbTop - fh;
    var half = bw / 2;
    var inner = Math.max(6, bw - 8);
    var innerHalf = inner / 2;

    var vk = r.verdict.key;
    var col = vk === "hold" ? "var(--hold)" : vk === "slow" ? "var(--slow)" : "var(--fail)";
    var roaring = r.v > V_FAST;
    var spills = r.v < V_SPILL;

    var p = [];
    // The drawing is decorative; on the later commit an aria-live line carries the
    // reading in words, so the SVG is hidden from assistive tech to avoid a double read.
    p.push('<svg viewBox="0 0 ' + VBW + ' ' + VBH + '" aria-hidden="true" focusable="false">');

    p.push(
      '<defs>' +
      '<marker id="d-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="var(--intake)"/></marker>' +
      '<linearGradient id="d-hot" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0" stop-color="var(--ember-2)"/><stop offset="1" stop-color="var(--ember)"/>' +
      '</linearGradient>' +
      '</defs>');

    // floor / hearthstone
    p.push('<line x1="40" y1="' + GROUND + '" x2="600" y2="' + GROUND +
      '" stroke="var(--ink-soft)" stroke-width="1.4"/>');
    for (var fx = 46; fx < 596; fx += 13) {
      p.push('<line x1="' + fx + '" y1="' + GROUND + '" x2="' + (fx - 7) + '" y2="' + (GROUND + 10) +
        '" stroke="var(--ink-faint)" stroke-width="0.8" opacity="0.5"/>');
    }

    // hot gas column inside the flue (opacity by temperature)
    var hotOp = 0.16 + (s.T - 60) / 340 * 0.6;
    p.push('<rect x="' + (CX - innerHalf) + '" y="' + flueTop + '" width="' + inner +
      '" height="' + (GROUND - flueTop) + '" fill="url(#d-hot)" opacity="' + fmt(hotOp, 2) + '"/>');

    // flue walls (soot), left and right
    p.push('<rect x="' + (CX - half - 4) + '" y="' + flueTop + '" width="4" height="' + (fbTop - flueTop + 2) +
      '" fill="var(--soot)"/>');
    p.push('<rect x="' + (CX + half) + '" y="' + flueTop + '" width="4" height="' + (fbTop - flueTop + 2) +
      '" fill="var(--soot)"/>');
    // chimney cap
    p.push('<rect x="' + (CX - half - 8) + '" y="' + (flueTop - 7) + '" width="' + (bw + 16) +
      '" height="7" rx="1.5" fill="var(--soot)"/>');

    // firebox (masonry), opening on the room side (left)
    p.push('<rect x="' + (CX - FB.w + 55) + '" y="' + fbTop + '" width="' + FB.w +
      '" height="' + FB.h + '" rx="3" fill="var(--soot)"/>');
    var openX = CX - FB.w + 62, openY = fbTop + 10, openW = 40, openH = FB.h - 18;
    p.push('<rect x="' + openX + '" y="' + openY + '" width="' + openW + '" height="' + openH +
      '" rx="2" fill="var(--field)"/>');

    // the fire — flames whose reach grows with velocity, unless it is spilling
    var flameH = spills ? 8 : Math.min(openH - 4, 10 + r.v * 3);
    var fcx = openX + openW / 2;
    var fbase = fbTop + FB.h - 6;
    for (var fi = -1; fi <= 1; fi++) {
      var fxc = fcx + fi * 9;
      var lean = spills ? 0 : Math.min(6, r.v) * (fi === 0 ? 0 : 0.6) * (fi > 0 ? 1 : -1);
      var h = flameH * (fi === 0 ? 1 : 0.72);
      p.push('<path d="M' + (fxc - 5) + ' ' + fbase + ' Q' + (fxc + lean) + ' ' + (fbase - h) +
        ' ' + (fxc + 5) + ' ' + fbase + ' Z" fill="' + (fi === 0 ? "var(--ember)" : "var(--ember-2)") +
        '" opacity="' + (spills ? 0.55 : 0.9) + '"/>');
    }
    // ember bed
    p.push('<rect x="' + (fcx - 13) + '" y="' + (fbase - 1) + '" width="26" height="3" rx="1.5" fill="var(--ember-2)"/>');

    // intake air pulled through the grate (cold day air), sized by velocity
    var nArr = r.v <= 0 ? 0 : Math.max(1, Math.min(3, Math.round(r.v / 2)));
    for (var ai = 0; ai < nArr; ai++) {
      var ay = openY + 8 + ai * (openH - 12) / Math.max(1, nArr - 1 || 1);
      if (nArr === 1) ay = openY + openH / 2;
      var alen = 14 + Math.min(r.v, 6) * 3;
      p.push('<line x1="' + (openX - alen - 6) + '" y1="' + ay + '" x2="' + (openX - 4) + '" y2="' + ay +
        '" stroke="var(--intake)" stroke-width="1.6" marker-end="url(#d-arr)" opacity="0.85"/>');
    }
    if (nArr > 0) p.push(txt(openX - 20, openY - 6, "air", "middle", "var(--intake-2)", 10.5, false));

    // damper flap in the throat — open (parallel) at 0, closed (across) at 1
    var dY = (flueTop + fbTop) / 2;
    var ang = (90 * (1 - s.k)) * Math.PI / 180;   // from horizontal
    var dl = innerHalf * 0.94;
    var dx = Math.cos(ang) * dl, dyv = Math.sin(ang) * dl;
    p.push('<line x1="' + (CX - dx) + '" y1="' + (dY - dyv) + '" x2="' + (CX + dx) + '" y2="' + (dY + dyv) +
      '" stroke="var(--soot-line)" stroke-width="3" stroke-linecap="round"/>');
    p.push('<circle cx="' + CX + '" cy="' + dY + '" r="2.2" fill="var(--soot-line)"/>');
    if (s.k > 0.02) p.push(txt(CX + half + 12, dY + 4, "damper " + Math.round(s.k * 100) + "%", "start", "var(--ink-faint)", 10, false));

    // the smoke — where it goes is the whole verdict
    p.push(smoke(vk, CX, flueTop, openX, openY, r.v, roaring, spills));

    // height dimension on the left of the flue
    var hx = CX - half - 26;
    p.push('<line x1="' + hx + '" y1="' + flueTop + '" x2="' + hx + '" y2="' + GROUND +
      '" stroke="var(--ink-faint)" stroke-width="1"/>');
    p.push(tick(hx, flueTop) + tick(hx, GROUND));
    p.push(txt(hx - 6, (flueTop + GROUND) / 2, fmt(s.H, 1) + " m", "end", "var(--ink-faint)", 11, false));

    // ---- velocity gauge on the right ----
    p.push(gauge(r.v));

    p.push('</svg>');
    return p.join("");
  }

  function smoke(vk, cx, top, openX, openY, v, roaring, spills) {
    var out = [];
    if (spills) {
      // smoke rolls out of the opening, into the room (a warning), only a wisp up top
      for (var i = 0; i < 6; i++) {
        var t = i / 5;
        var x = openX - 6 - t * 70 - Math.sin(t * 3.4) * 6;
        var y = openY + 6 - t * 46;
        out.push(circle(x, y, 5 + t * 12, "var(--fail)", 0.30 * (1 - t) + 0.06));
      }
      out.push(circle(cx, top - 6, 5, "var(--ink-soft)", 0.16));
      return out.join("");
    }
    // a plume from the chimney top; shape by how hard it draws
    var n = roaring ? 12 : vk === "slow" ? 6 : 9;
    var rise = roaring ? 30 : vk === "slow" ? 12 : 20;   // vertical step
    var drift = roaring ? 0.35 : vk === "slow" ? 1.6 : 0.9; // sideways lean
    var base = vk === "slow" ? "var(--slow)" : "var(--ink-soft)";
    for (var j = 0; j < n; j++) {
      var tt = j / (n - 1);
      var yy = top - 6 - j * rise;
      var xx = cx + Math.sin(j * 0.7) * 6 + j * rise * drift * 0.28;
      var rr = (roaring ? 4 : 5) + tt * (roaring ? 9 : 12);
      out.push(circle(xx, yy, rr, base, (roaring ? 0.42 : 0.4) * (1 - tt) + 0.06));
    }
    if (roaring) {
      // sparks torn off the top
      for (var k = 0; k < 5; k++) {
        var sy = top - 10 - k * 22;
        out.push('<circle cx="' + (cx + 6 + k * 2) + '" cy="' + sy + '" r="1.4" fill="var(--ember)" opacity="0.8"/>');
      }
    }
    return out.join("");
  }

  function gauge(v) {
    var g = GAUGE;
    function Y(val) { return g.bot - Math.min(val, g.vmax) / g.vmax * (g.bot - g.top); }
    var out = [];
    // band backdrop
    out.push(rect(g.x, g.top, g.w, g.bot - g.top, "var(--field-2)", "var(--rule)", 1));
    // bands: red 0..spill, amber spill..slow, green slow..fast, red fast..max
    out.push(rect(g.x, Y(V_SPILL), g.w, g.bot - Y(V_SPILL), "var(--fail)", null, 0.30));
    out.push(rect(g.x, Y(V_SLOW), g.w, Y(V_SPILL) - Y(V_SLOW), "var(--slow)", null, 0.34));
    out.push(rect(g.x, Y(V_FAST), g.w, Y(V_SLOW) - Y(V_FAST), "var(--band)", null, 0.42));
    out.push(rect(g.x, g.top, g.w, Y(V_FAST) - g.top, "var(--fail)", null, 0.30));
    // clean-band label
    out.push(txt(g.x - 6, (Y(V_SLOW) + Y(V_FAST)) / 2 - 4, "clean", "end", "var(--band)", 10.5, true));
    out.push(txt(g.x - 6, (Y(V_SLOW) + Y(V_FAST)) / 2 + 9, "band", "end", "var(--band)", 10.5, true));
    // tick labels
    [0, 2, 4, 6].forEach(function (tv) {
      out.push('<line x1="' + (g.x + g.w) + '" y1="' + Y(tv) + '" x2="' + (g.x + g.w + 4) + '" y2="' + Y(tv) +
        '" stroke="var(--ink-faint)" stroke-width="1"/>');
      out.push(txt(g.x + g.w + 7, Y(tv) + 3.5, tv, "start", "var(--ink-faint)", 9.5, false));
    });
    out.push(txt(g.x + g.w / 2, g.top - 10, "m/s", "middle", "var(--ink-faint)", 10, false));
    // marker at current v
    var vy = Y(v);
    var mc = v < V_SPILL ? "var(--fail)" : v < V_SLOW ? "var(--slow)" : v <= V_FAST ? "var(--hold)" : "var(--fail)";
    out.push('<path d="M' + (g.x - 3) + ' ' + vy + ' l-9 -5 l0 10 z" fill="' + mc + '"/>');
    out.push('<line x1="' + g.x + '" y1="' + vy + '" x2="' + (g.x + g.w) + '" y2="' + vy +
      '" stroke="' + mc + '" stroke-width="2"/>');
    return out.join("");
  }

  // svg helpers
  function rect(x, y, w, h, fill, stroke, op) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill +
      '"' + (op != null ? ' opacity="' + op + '"' : "") + (stroke ? ' stroke="' + stroke + '"' : "") + "/>";
  }
  function circle(x, y, r, fill, op) {
    return '<circle cx="' + fmt(x, 1) + '" cy="' + fmt(y, 1) + '" r="' + fmt(r, 1) + '" fill="' + fill + '" opacity="' + fmt(op, 2) + '"/>';
  }
  function txt(x, y, s, anchor, fill, size, bold) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" fill="' + fill +
      '" font-size="' + size + '" font-family="var(--mono)"' + (bold ? ' font-weight="600"' : "") + '>' + s + '</text>';
  }
  function tick(x, y) { return '<line x1="' + (x - 4) + '" y1="' + y + '" x2="' + (x + 4) + '" y2="' + y + '" stroke="var(--ink-faint)" stroke-width="1"/>'; }

  function fmt(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  // ---- reading panel ----------------------------------------------------
  function vClass(v) { return v < V_SPILL ? "bad" : v < V_SLOW ? "warn" : v <= V_FAST ? "good" : "bad"; }

  function render() {
    var r = compute(state);

    var vb = document.getElementById("verdict");
    vb.className = "verdict v-" + r.verdict.key;
    vb.innerHTML = '<span class="dot"></span><span>' + r.verdict.head + '</span>' +
      '<small>' + DAY[state.day].label + ' · ' + fmt(state.T, 0) + ' °C flue</small>';

    document.getElementById("stage").innerHTML = svgFor(state, r);

    var rows = [
      ["Draught pull", (r.dP <= 0 ? "none" : fmt(r.dP, 1)) + ' <span class="unit">Pa</span>', r.dP <= 0 ? "bad" : ""],
      ["Water gauge", fmt(Math.max(0, r.mmwg), 1) + ' <span class="unit">mm</span>', ""],
      ["Flue-gas velocity", fmt(r.v, 2) + ' <span class="unit">m/s</span>', vClass(r.v)],
      ["Air through grate", fmt(r.Q * 1000, 0) + ' <span class="unit">L/s</span>', ""],
      ["Flue gas vs day", fmt(r.rhoIn, 2) + " / " + fmt(r.rhoOut, 2) + ' <span class="unit">kg/m³</span>', ""],
      ["Damper throttle", (state.k <= 0.005 ? "open" : Math.round(state.k * 100) + '%') + ' <span class="unit"></span>',
        state.k > 0.005 ? "warn" : ""]
    ];
    document.getElementById("reading").innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span>' +
        '<span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    syncControls();
    save();
  }

  // ---- controls ---------------------------------------------------------
  function syncControls() {
    set("H", state.H, fmt(state.H, 1) + " m");
    set("T", state.T, fmt(state.T, 0) + " °C");
    set("d", state.d, fmt(state.d, 2) + " m");
    set("k", state.k, state.k <= 0.005 ? "open" : Math.round(state.k * 100) + "% closed");
    document.querySelectorAll(".seg button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.day === state.day ? "true" : "false");
    });
  }
  function set(id, val, label) {
    var el = document.getElementById("in-" + id);
    if (el && +el.value !== val) el.value = val;
    var lab = document.getElementById("lab-" + id);
    if (lab) lab.textContent = label;
  }

  function bind(id, key, round) {
    var el = document.getElementById("in-" + id);
    el.addEventListener("input", function () {
      state[key] = round ? Math.round(+el.value * 100) / 100 : +el.value;
      render();
    });
  }

  // ---- persistence ------------------------------------------------------
  // The flue you tune is kept in the browser and nowhere else, so a half-throttled
  // fire is burning exactly as you left it next time. Reads and writes fall back
  // quietly when storage is missing or corrupt (private mode, quota): the bench
  // degrades to unsaved rather than throwing, and with nothing stored it opens on
  // the roaring flue there is something to throttle.
  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({
        H: state.H, T: state.T, d: state.d, k: state.k, day: state.day
      }));
    } catch (e) { /* storage unavailable or full — carry on unsaved */ }
  }

  function load() {
    var raw;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      return {
        H: clamp(+o.H, 2, 12, DEFAULT.H),
        T: clamp(+o.T, 60, 400, DEFAULT.T),
        d: clamp(+o.d, 0.1, 0.4, DEFAULT.d),
        k: clamp(+o.k, 0, 1, DEFAULT.k),
        day: DAY[o.day] ? o.day : DEFAULT.day
      };
    } catch (e) { return null; }
  }

  function clamp(n, lo, hi, fallback) {
    if (typeof n !== "number" || !isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  // ---- boot -------------------------------------------------------------
  function boot() {
    bind("H", "H", true);
    bind("T", "T", false);
    bind("d", "d", true);
    bind("k", "k", true);
    document.querySelectorAll(".seg button").forEach(function (b) {
      b.addEventListener("click", function () { state.day = b.dataset.day; render(); });
    });
    document.getElementById("reset").addEventListener("click", function () {
      state = Object.assign({}, DEFAULT);
      render();
    });
    document.getElementById("draw-it").addEventListener("click", drawItClean);
    document.addEventListener("keydown", onKey);
    render();
  }

  // ---- keyboard ---------------------------------------------------------
  // The bench answers to the keys as well as the mouse: the two actions, the
  // day, and a notch of damper either way. A focused slider keeps its native
  // arrow keys — those are left well alone.
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    var handled = true;
    switch (e.key.toLowerCase()) {
      case "d": drawItClean(); break;
      case "r": state = Object.assign({}, DEFAULT); render(); break;
      case "1": state.day = "frost"; render(); break;
      case "2": state.day = "mild"; render(); break;
      case "3": state.day = "warm"; render(); break;
      case "]": state.k = clamp(Math.round((state.k + 0.05) * 100) / 100, 0, 1, state.k); render(); break; // close a notch
      case "[": state.k = clamp(Math.round((state.k - 0.05) * 100) / 100, 0, 1, state.k); render(); break; // open a notch
      default: handled = false;
    }
    if (handled) e.preventDefault();
  }

  // Land the draught in the clean band. A pull that is too strong is throttled
  // with the damper — the honest fix, giving back heat you'd otherwise lose. A
  // pull too weak can't be damped into life: open the throttle fully and raise
  // the flue until the column is tall enough to draw.
  function drawItClean() {
    var guard = 0;
    var r = compute(state);
    if (r.v > V_FAST) {
      while (guard++ < 120 && compute(state).v > V_FAST && state.k < 1) {
        state.k = Math.min(1, Math.round((state.k + 0.02) * 100) / 100);
      }
    } else if (r.v < V_SLOW) {
      state.k = 0;
      while (guard++ < 200 && compute(state).v < V_SLOW && state.H < 12) {
        state.H = Math.min(12, Math.round((state.H + 0.1) * 10) / 10);
      }
    }
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // expose a little for the later commits to hook into
  window.__draught = { compute: compute, get state() { return state; }, render: render, DEFAULT: DEFAULT };
})();
