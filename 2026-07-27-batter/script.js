/* Batter — the bench.
 *
 * A gravity retaining wall holds back earth by its own weight and nothing else.
 * Whether it stands is not a matter of how heavy it is but of *where* the weight
 * sits over the base. Add the wall's weight (down, through its centroid) to the
 * earth's thrust (horizontal, at a third of the height) and you get one resultant
 * force. Follow that resultant down to the base: the single number that decides
 * everything is where it crosses.
 *
 *   - Crosses inside the middle third  -> the whole base is in compression. Holds.
 *   - Crosses in the outer third       -> the far joint lifts into tension, which
 *                                          masonry cannot take. The joint opens.
 *   - Crosses off the base entirely    -> nothing holds it down. Over it goes.
 *
 * The batter — the backward lean of the front face — is how you move the wall's
 * weight back over the base to meet the thrust, without simply pouring more stone.
 *
 * All statics below are per metre run of wall (the page into the screen), in kN
 * and kPa. Rankine active pressure, smooth vertical back, level backfill.
 */
(function () {
  "use strict";

  var GAMMA_M = 23;   // unit weight of masonry, kN/m^3
  var MU = 0.55;      // coefficient of friction, wall base on rock

  var MATERIALS = {
    sand:   { label: "loose sand",     phi: 32, gamma: 18,   hydro: false },
    gravel: { label: "packed gravel",  phi: 38, gamma: 19,   hydro: false },
    water:  { label: "standing water", phi: 0,  gamma: 9.81, hydro: true  }
  };

  // The wall opens on a deliberate flaw: heavy enough not to fall, but its base
  // is a hand too narrow, so the line of thrust slips out of the middle third
  // and the heel joint opens. Something to true on arrival.
  var DEFAULT = { H: 4.0, B: 1.7, f: 0.25, fill: "sand" };

  var state = load() || Object.assign({}, DEFAULT);

  function rad(d) { return d * Math.PI / 180; }

  // ---- the statics ------------------------------------------------------
  function compute(s) {
    var m = MATERIALS[s.fill];
    var Ka = m.hydro ? 1 : (1 - Math.sin(rad(m.phi))) / (1 + Math.sin(rad(m.phi)));
    var pMax = Ka * m.gamma * s.H;            // lateral pressure at base, kPa
    var Pa = 0.5 * Ka * m.gamma * s.H * s.H;  // total horizontal thrust, kN/m
    var yThrust = s.H / 3;                     // acts a third up from the base

    var area = s.H * (s.B - s.f / 2);          // trapezoid cross-section, m^2
    var W = GAMMA_M * area;                     // weight, kN/m
    var xw = (s.B * s.B / 2 - s.f * s.f / 6) / (s.B - s.f / 2); // centroid from toe

    var Mo = Pa * yThrust;   // overturning moment about the toe
    var Mr = W * xw;         // resisting moment about the toe

    var FoS_ot = Mr / Mo;
    var FoS_sl = (MU * W) / Pa;

    var xR = (Mr - Mo) / W;  // where the resultant crosses the base, from the toe
    var e = s.B / 2 - xR;    // eccentricity, positive toward the toe
    var sigMean = W / s.B;
    var sigToe = sigMean * (1 + 6 * e / s.B);
    var sigHeel = sigMean * (1 - 6 * e / s.B);

    // The thrust only ever pushes the resultant toward the toe, and this
    // section's centroid can never sit past two-thirds of the base, so the
    // resultant cannot reach the back third — the toe can't lift. The only
    // way out of the middle third is forward, into the front third, opening
    // the heel.
    var third = s.B / 3;
    var verdict;
    if (xR <= 0 || FoS_ot < 1) {
      verdict = { key: "fail", head: "Goes over the toe",
        note: "the resultant falls off the front of the base — nothing holds it down" };
    } else if (FoS_sl < 1) {
      verdict = { key: "fail", head: "Slides on its base",
        note: "the thrust beats the friction under the wall" };
    } else if (xR < third) {
      verdict = { key: "open", head: "Heel joint opens",
        note: "the line of thrust is in the front third — the back lifts into tension" };
    } else {
      verdict = { key: "hold", head: "Holds true",
        note: "the line of thrust is in the middle third — every bed in compression" };
    }

    return {
      Ka: Ka, pMax: pMax, Pa: Pa, yThrust: yThrust,
      area: area, W: W, xw: xw, Mo: Mo, Mr: Mr,
      FoS_ot: FoS_ot, FoS_sl: FoS_sl,
      xR: xR, e: e, sigToe: sigToe, sigHeel: sigHeel,
      third: third, verdict: verdict, mat: m
    };
  }

  // ---- drawing ----------------------------------------------------------
  var VBW = 720, VBH = 470, PAD = 46;

  function svgFor(s, r) {
    var soilRun = 2.6;
    var xmin = -0.75, xmax = s.B + soilRun;
    var ymin = -0.75, ymax = s.H + 0.7;
    var gw = xmax - xmin, gh = ymax - ymin;
    var scale = Math.min((VBW - 2 * PAD) / gw, (VBH - 2 * PAD) / gh);
    var dw = gw * scale, dh = gh * scale;
    var ox = (VBW - dw) / 2;
    var oyTop = (VBH - dh) / 2;

    function X(x) { return ox + (x - xmin) * scale; }
    function Y(y) { return oyTop + (ymax - y) * scale; }

    var col = r.verdict.key === "hold" ? "var(--hold)"
            : r.verdict.key === "open" ? "var(--open)" : "var(--fail)";

    var p = [];
    p.push('<svg viewBox="0 0 ' + VBW + ' ' + VBH + '" role="img" ' +
      'aria-label="Cross-section of a gravity retaining wall with the line of thrust marked against the middle third of its base.">');

    p.push(
      '<defs>' +
      '<pattern id="soil" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
      '<line x1="0" y1="0" x2="0" y2="9" stroke="var(--earth-2)" stroke-width="1" opacity="0.5"/></pattern>' +
      '<marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="var(--thrust)"/></marker>' +
      '<marker id="arrW" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="var(--ink-soft)"/></marker>' +
      '</defs>');

    // foundation / bearing rock
    p.push(rect(X(xmin), Y(0), dw, Math.min(0.75 * scale, oyTop + dh - Y(0)),
      "var(--stone)", null, 0.28));
    p.push('<line x1="' + X(xmin) + '" y1="' + Y(0) + '" x2="' + X(xmax) + '" y2="' + Y(0) +
      '" stroke="var(--ink-soft)" stroke-width="1.4"/>');

    // retained soil, hatched, up to full height
    var sx = X(s.B), sTop = Y(s.H), sBot = Y(0);
    p.push('<rect x="' + sx + '" y="' + sTop + '" width="' + (X(xmax) - sx) +
      '" height="' + (sBot - sTop) + '" fill="url(#soil)"/>');
    p.push('<line x1="' + sx + '" y1="' + sTop + '" x2="' + X(xmax) + '" y2="' + sTop +
      '" stroke="var(--earth-2)" stroke-width="1.2"/>');

    // active pressure triangle on the back face (zero at top, max at base)
    var visMax = Math.min(r.pMax * (1.35 / 45), 1.35) * scale;
    p.push('<path d="M' + sx + ' ' + Y(s.H) + ' L' + sx + ' ' + Y(0) +
      ' L' + (sx + visMax) + ' ' + Y(0) + ' z" fill="var(--earth)" opacity="0.32"/>');
    // a couple of little pressure arrows pointing at the wall
    for (var k = 1; k <= 3; k++) {
      var yy = (s.H / 4) * k;
      var len = visMax * (1 - yy / s.H);
      if (len < 6) continue;
      p.push('<line x1="' + (sx + len) + '" y1="' + Y(yy) + '" x2="' + sx + '" y2="' + Y(yy) +
        '" stroke="var(--earth-2)" stroke-width="1.2" marker-end="url(#arr)" opacity="0.7"/>');
    }

    // resultant thrust arrow Pa at H/3
    var pav = Math.max(visMax, 34);
    p.push('<line x1="' + (sx + pav) + '" y1="' + Y(r.yThrust) + '" x2="' + sx + '" y2="' + Y(r.yThrust) +
      '" stroke="var(--thrust)" stroke-width="2.4" marker-end="url(#arr)"/>');
    p.push(txt(sx + pav + 6, Y(r.yThrust) + 4, "Pₐ", "start", "var(--thrust)", 13, true));

    // the wall itself
    var wall = "M" + X(0) + " " + Y(0) + " L" + X(s.B) + " " + Y(0) +
               " L" + X(s.B) + " " + Y(s.H) + " L" + X(s.f) + " " + Y(s.H) + " z";
    p.push('<path d="' + wall + '" fill="var(--stone)" stroke="var(--stone-line)" stroke-width="1.6"/>');
    // a few course lines to read it as masonry
    var courses = Math.max(3, Math.round(s.H / 0.5));
    for (var c = 1; c < courses; c++) {
      var cy = s.H * c / courses;
      var frac = cy / s.H;
      var xLeft = s.f * frac; // battered front face at this height
      p.push('<line x1="' + X(xLeft) + '" y1="' + Y(cy) + '" x2="' + X(s.B) + '" y2="' + Y(cy) +
        '" stroke="var(--stone-line)" stroke-width="0.8" opacity="0.45"/>');
    }

    // weight arrow down through the centroid
    var cyTop = Math.min(s.H * 0.62, s.H - 0.3);
    p.push('<line x1="' + X(r.xw) + '" y1="' + Y(cyTop) + '" x2="' + X(r.xw) + '" y2="' + Y(0.05) +
      '" stroke="var(--ink-soft)" stroke-width="1.6" stroke-dasharray="2 3" marker-end="url(#arrW)"/>');
    p.push(txt(X(r.xw), Y(cyTop) - 6, "W", "middle", "var(--ink-soft)", 12, true));

    // base: middle third band, and the outer thirds
    var by = Y(0);
    p.push('<line x1="' + X(0) + '" y1="' + (by + 7) + '" x2="' + X(s.B) + '" y2="' + (by + 7) +
      '" stroke="var(--rule)" stroke-width="3"/>');
    p.push('<line x1="' + X(r.third) + '" y1="' + (by + 7) + '" x2="' + X(2 * r.third) + '" y2="' + (by + 7) +
      '" stroke="var(--band)" stroke-width="3"/>');
    // third ticks
    [0, r.third, 2 * r.third, s.B].forEach(function (tx) {
      p.push('<line x1="' + X(tx) + '" y1="' + (by + 3) + '" x2="' + X(tx) + '" y2="' + (by + 11) +
        '" stroke="var(--ink-faint)" stroke-width="1"/>');
    });
    p.push(txt((X(r.third) + X(2 * r.third)) / 2, by + 24, "middle third", "middle", "var(--band)", 10.5, false));

    // where the resultant crosses the base
    var rx = X(Math.max(0, Math.min(s.B, r.xR)));
    var topOfLine = Y(Math.min(s.H, s.H));
    p.push('<line x1="' + rx + '" y1="' + Y(s.H + 0.15) + '" x2="' + rx + '" y2="' + (by + 12) +
      '" stroke="' + col + '" stroke-width="1.6" stroke-dasharray="4 4"/>');
    p.push('<circle cx="' + rx + '" cy="' + by + '" r="6.5" fill="' + col + '" stroke="var(--field)" stroke-width="1.6"/>');
    p.push(txt(rx, Y(s.H + 0.15) - 4, "line of thrust", "middle", col, 11, true));

    // height dimension on the left
    var hx = X(-0.5);
    p.push('<line x1="' + hx + '" y1="' + Y(0) + '" x2="' + hx + '" y2="' + Y(s.H) +
      '" stroke="var(--ink-faint)" stroke-width="1"/>');
    p.push(tick(hx, Y(0)) + tick(hx, Y(s.H)));
    p.push(txt(hx - 6, (Y(0) + Y(s.H)) / 2, fmt(s.H, 1) + " m", "end", "var(--ink-faint)", 11, false, true));

    // base width dimension below
    var dyb = by + 34;
    p.push('<line x1="' + X(0) + '" y1="' + dyb + '" x2="' + X(s.B) + '" y2="' + dyb +
      '" stroke="var(--ink-faint)" stroke-width="1"/>');
    p.push(vtick(X(0), dyb) + vtick(X(s.B), dyb));
    p.push(txt((X(0) + X(s.B)) / 2, dyb + 15, "base " + fmt(s.B, 2) + " m", "middle", "var(--ink-faint)", 11, false));

    p.push('</svg>');
    return p.join("");
  }

  // svg helpers
  function rect(x, y, w, h, fill, stroke, op) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill +
      '"' + (op != null ? ' opacity="' + op + '"' : "") + (stroke ? ' stroke="' + stroke + '"' : "") + "/>";
  }
  function txt(x, y, s, anchor, fill, size, bold, mono) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" fill="' + fill +
      '" font-size="' + size + '" font-family="' + (mono ? "var(--mono)" : "var(--mono)") + '"' +
      (bold ? ' font-weight="600"' : "") + '>' + s + '</text>';
  }
  function tick(x, y) { return '<line x1="' + (x - 4) + '" y1="' + y + '" x2="' + (x + 4) + '" y2="' + y + '" stroke="var(--ink-faint)" stroke-width="1"/>'; }
  function vtick(x, y) { return '<line x1="' + x + '" y1="' + (y - 4) + '" x2="' + x + '" y2="' + (y + 4) + '" stroke="var(--ink-faint)" stroke-width="1"/>'; }

  function fmt(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  // ---- reading panel ----------------------------------------------------
  function fosClass(v, want) { return v >= want ? "good" : v >= 1 ? "warn" : "bad"; }

  function render() {
    var r = compute(state);

    // verdict banner
    var vb = document.getElementById("verdict");
    vb.className = "verdict v-" + r.verdict.key;
    vb.innerHTML = '<span class="dot"></span><span>' + r.verdict.head + '</span>' +
      '<small>' + MATERIALS[state.fill].label + ' · ' + fmt(state.H, 1) + ' m</small>';

    // stage
    document.getElementById("stage").innerHTML = svgFor(state, r);

    // reading rows
    var inThird = r.xR >= r.third && r.xR <= 2 * r.third;
    var thrustWord = inThird ? "middle third" : "front third";
    var thrustCls = inThird ? "good" : "warn";
    var rows = [
      ["Line of thrust", "in the " + thrustWord, thrustCls],
      ["Eccentricity", fmt(Math.abs(r.e), 3) + ' <span class="unit">m · limit ' + fmt(state.B / 6, 3) + "</span>",
        Math.abs(r.e) <= state.B / 6 + 1e-9 ? "good" : "warn"],
      ["Against overturning", fmt(r.FoS_ot, 2) + '<span class="unit">×</span>', fosClass(r.FoS_ot, 2)],
      ["Against sliding", fmt(r.FoS_sl, 2) + '<span class="unit">×</span>', fosClass(r.FoS_sl, 1.5)],
      ["Toe pressure", fmt(r.sigToe, 0) + ' <span class="unit">kPa</span>', ""],
      ["Heel pressure", (r.sigHeel < -0.05 ? "open" : fmt(Math.max(0, r.sigHeel), 0)) +
        ' <span class="unit">kPa</span>', r.sigHeel < -0.05 ? "warn" : ""],
      ["Wall weight", fmt(r.W, 0) + ' <span class="unit">kN/m</span>', ""],
      ["Earth thrust", fmt(r.Pa, 0) + ' <span class="unit">kN/m</span>', ""]
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
    set("B", state.B, fmt(state.B, 2) + " m");
    set("f", state.f, batterLabel(state.f, state.H));
    document.querySelectorAll(".seg button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.fill === state.fill ? "true" : "false");
    });
  }
  function set(id, val, label) {
    var el = document.getElementById("in-" + id);
    if (el && +el.value !== val) el.value = val;
    var lab = document.getElementById("lab-" + id);
    if (lab) lab.textContent = label;
  }
  function batterLabel(f, H) {
    if (f < 0.02) return "plumb (0)";
    return "1 : " + fmt(H / f, 1) + "  (" + fmt(f, 2) + " m)";
  }

  function bind(id, key, round) {
    var el = document.getElementById("in-" + id);
    el.addEventListener("input", function () {
      state[key] = round ? Math.round(+el.value * 100) / 100 : +el.value;
      render();
    });
  }

  // ---- persistence (browser only) --------------------------------------
  function save() { /* filled in by a later commit */ }
  function load() { return null; }

  // ---- boot -------------------------------------------------------------
  function boot() {
    bind("H", "H", true);
    bind("B", "B", true);
    bind("f", "f", true);
    document.querySelectorAll(".seg button").forEach(function (b) {
      b.addEventListener("click", function () { state.fill = b.dataset.fill; render(); });
    });
    document.getElementById("reset").addEventListener("click", function () {
      state = Object.assign({}, DEFAULT);
      render();
    });
    document.getElementById("true-it").addEventListener("click", function () {
      // widen the base a hand's width at a time until the thrust is home
      var guard = 0;
      while (guard++ < 60) {
        var r = compute(state);
        if (r.verdict.key === "hold") break;
        if (r.xR < r.third) state.B = Math.min(3.2, Math.round((state.B + 0.05) * 100) / 100);
        else state.B = Math.max(0.8, Math.round((state.B - 0.05) * 100) / 100);
      }
      render();
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // expose a little for the later commits to hook into
  window.__batter = { compute: compute, get state() { return state; }, render: render };
})();
