/* Siphon — the bench.
 *
 * A filled tube carries a liquid up over a crest and down to a lower outlet, held
 * together over the top by the atmosphere pressing on the two open surfaces. Two
 * heights run it, and they do different jobs:
 *
 *   flow          v = √(2·g·H)                 (H the fall from source to outlet)
 *   crest press.  P_crest = P₀ − ρ·g·(L + H)   (L the lift of the crest above source)
 *   ceiling       L_max = (P₀ − P_v)⁄ρg − H    (the crest may stand no higher)
 *
 * The FALL sets the flow, and only the flow — the crest does not appear in it. The
 * LIFT sets whether it runs at all: the pressure at the crest falls below the
 * atmosphere by the whole height it holds up, and when it reaches the liquid's
 * vapour pressure P_v the column boils, parts, and the siphon breaks. The first
 * term of the ceiling, (P₀ − P_v)⁄ρg, is the barometric ceiling H̄ — about 10.3 m
 * of water, 0.76 m of mercury — and the fall draws it down: the faster it flows,
 * the lower the crest it can clear.
 *
 * The four liquids differ only in that ceiling — water, light oil, mercury, and
 * near-boiling water break at wildly different lifts. The flows are the ideal,
 * frictionless figures; the pressures and ceilings are exact. SI throughout; kPa
 * and m/s only at the surface, for the reader.
 */
(function () {
  "use strict";

  var G = 9.81, PATM = 101325;                  // gravity; the atmosphere on both surfaces (Pa)
  var DIA = 0.025;                              // tube bore (m)
  var AREA = Math.PI * (DIA / 2) * (DIA / 2);   // bore area (m²)

  // Each liquid is a density and a vapour pressure; the barometric ceiling H̄ falls
  // straight out of them. Stylised temperatures, but the physics is exact.
  var LIQ = {
    water:   { label: "cold water",  short: "water",   rho: 998,   pv: 2339 },   // 20 °C
    oil:     { label: "light oil",   short: "oil",     rho: 800,   pv: 500 },    // a light distillate, almost no vapour
    mercury: { label: "mercury",     short: "mercury", rho: 13534, pv: 0.16 },   // the barometer's liquid
    hot:     { label: "hot water",   short: "hot",     rho: 965,   pv: 70100 }   // 90 °C — vapour has eaten the budget
  };

  // Opens on cold water with a modest fall and a low, timid crest — running well
  // within the ceiling. Find the crest raises the bend to the tallest that carries.
  var DEFAULT = { liquid: "water", fall: 1.5, lift: 1.5 };
  var HMIN = 0, HMAX = 4, HSTEP = 0.1;          // the fall, source surface down to outlet (m)
  var LMIN = 0, LMAX = 8, LSTEP = 0.1;          // the lift, crest above the source (m)
  var UTARGET = 0.85;                           // the ceiling fraction a found crest aims to sit under
  var STRAIN_U = 0.85;                          // at or above this share of the ceiling, strained
  var FALL_SLACK = 0.4;                         // below this fall, slack — a trickle or none
  var KEY = "siphon.rig.v1";                    // where the liquid, fall and lift are kept between visits

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    return v < a ? a : v > b ? b : v;
  }
  function round1(v) { return Math.round(v * 10) / 10; }
  function hbar(liq) { var L = LIQ[liq]; return (PATM - L.pv) / (L.rho * G); }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!LIQ[o.liquid]) return null;
      return {
        liquid: o.liquid,
        fall: clampStep(o.fall, HMIN, HMAX, HSTEP),
        lift: clampStep(o.lift, LMIN, LMAX, LSTEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var Lq = LIQ[s.liquid];
    var H = s.fall, L = s.lift;
    var Hbar = hbar(s.liquid);                  // barometric ceiling for this liquid
    var v = Math.sqrt(2 * G * Math.max(0, H));  // outlet speed — from the fall alone
    var Q = AREA * v;                           // discharge (m³/s)
    var Pc = PATM - Lq.rho * G * (L + H);       // absolute pressure at the crest
    var u = Hbar > 0 ? (L + H) / Hbar : Infinity; // crest suction as a share of the ceiling
    var Lmax = Hbar - H;                        // tallest crest above source at this fall
    return { Lq: Lq, H: H, L: L, Hbar: Hbar, v: v, Q: Q, Pc: Pc, u: u, Lmax: Lmax, Patm: PATM };
  }

  // the tallest crest the liquid still carries with margin below the vapour point.
  // Solve L + H = UTARGET·H̄; if even a flat crest is over that, no crest works.
  function findCrest(s) {
    var L = UTARGET * hbar(s.liquid) - s.fall;
    if (L < LMIN) return null;
    return clamp(Math.round(L / LSTEP) * LSTEP, LMIN, LMAX);
  }

  function verdictOf(s, r) {
    if (r.u >= 1) return "broken";
    if (r.u >= STRAIN_U) return "strained";
    if (s.fall < FALL_SLACK) return "slack";
    return "runs";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inH = $("in-H"), inL = $("in-L");
  var labH = $("lab-H"), labL = $("lab-L");
  var liqBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-liq]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var lMark = $("l-mark"), lNote = $("l-note");

  function fmtM(x) {
    if (!isFinite(x)) return "∞ m";
    return (x >= 10 ? x.toFixed(1) : x.toFixed(2)) + " m";
  }
  function fmtV(v) { return v.toFixed(2) + " m/s"; }
  function fmtQ(v) {
    var lpm = v * AREA * 60000;                 // L/min
    if (lpm >= 100) return Math.round(lpm) + " L/min";
    if (lpm >= 10) return round1(lpm) + " L/min";
    return (Math.round(lpm * 100) / 100) + " L/min";
  }
  function fmtP(pa) { return (pa / 1000).toFixed(1) + " kPa"; }

  function syncLabels() {
    labH.textContent = fmtM(state.fall);
    labL.textContent = fmtM(state.lift);
    liqBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.liq === state.liquid));
    });
  }

  var VERDICT_TEXT = {
    runs:     { cls: "v-keep",  word: "Runs",     note: "a real fall, the crest well under the ceiling" },
    slack:    { cls: "v-drift", word: "Slack",    note: "too level — a trickle, or none" },
    strained: { cls: "v-drift", word: "Strained", note: "the crest near the vapour ceiling" }
  };
  var BROKEN = { cls: "v-dead", word: "Broken", note: "the crest over the ceiling — the column has parted" };

  function uClass(u) { return u >= 1 ? "bad" : u >= 0.85 ? "warn" : "good"; }

  function render(r) {
    var verdict = verdictOf(state, r);
    var v = verdict === "broken" ? BROKEN : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var runClass = verdict === "broken" ? "bad" : verdict === "slack" ? "warn" : "good";
    var Pshown = Math.max(r.Pc, r.Lq.pv);       // the crest cannot fall below the vapour point
    var flowVal = verdict === "broken"
      ? '—<span class="unit"> · parted</span>'
      : fmtV(r.v) + '<span class="unit"> · ' + fmtQ(r.v) + "</span>";
    var headSpare = r.Lmax - r.L;

    var rows = [
      ["Fall", fmtM(r.H) + '<span class="unit"> · drop to outlet</span>', ""],
      ["Flow", flowVal, runClass],
      ["Lift", fmtM(r.L) + '<span class="unit"> · crest above source</span>', ""],
      ['Crest <span class="tag">pressure</span>', (verdict === "broken" ? "vapour" : fmtP(Pshown)) + '<span class="unit"> / ' + fmtP(r.Patm) + " atm</span>", uClass(r.u)],
      ["Ceiling", fmtM(Math.max(0, r.Lmax)) + '<span class="unit"> · ' + r.Lq.short + " H̄ " + fmtM(r.Hbar) + "</span>", ""],
      ["Head to spare", (headSpare >= 0 ? fmtM(headSpare) : "over") + '<span class="unit"> · to the ceiling</span>', uClass(r.u)]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markLift();
    return verdict;
  }

  // mark, under the lift slider, the tallest crest this liquid carries at this fall
  function markLift() {
    if (!lMark || !lNote) return;
    var opt = findCrest(state);
    if (opt == null) {
      lMark.className = "x-mark off";
      lNote.innerHTML = "no crest carries this fall — ease it, or change the liquid";
      return;
    }
    lMark.style.left = ((opt - LMIN) / (LMAX - LMIN) * 100) + "%";
    lMark.className = "x-mark";
    if (Math.abs(opt - state.lift) <= 0.15) lNote.innerHTML = "the tallest crest this liquid carries: <b>" + fmtM(opt) + "</b>";
    else lNote.innerHTML = "carries a crest up to <b>" + fmtM(opt) + "</b>";
  }

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 560, H = 470, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function sizeCanvas() {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  var reduceMQ = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = reduceMQ ? reduceMQ.matches : false;

  var cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };
  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  // scene geometry, canvas space
  var SY = 300, PPM = 16;                        // source surface line; pixels per metre
  var XL = 90, XR = 286;                         // the rising and falling legs
  var VX0 = 30, VX1 = 96, VBOT = 360;            // the source vessel

  // eased display state, so a change of lift reads as the crest rising and a change
  // of fall as the outlet dropping, rather than jumping
  var shown = { lift: DEFAULT.lift, fall: DEFAULT.fall };
  var lastTs = null, initShown = false;

  function partCol(col, u) {
    if (u >= 1) return col.dead;
    if (u >= 0.85) return col.drift;
    return col.iron;
  }

  function draw(cur, verdict, Lshown, Hshown) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "runs" ? col.keep : verdict === "broken" ? col.dead : col.drift;
    var liqCol = partCol(col, cur.u);

    ctx.clearRect(0, 0, W, H);

    var yCrest = SY - Lshown * PPM;
    var yOut = SY + Hshown * PPM;
    var yCeil = SY - cur.Hbar * PPM;

    // ---- the barometric ceiling (the height the atmosphere can lift this liquid) ----
    if (yCeil > 22 && yCeil < 396) {
      ctx.strokeStyle = withAlpha(col.timber, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(40, yCeil); ctx.lineTo(360, yCeil); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, col.timber2, "barometric ceiling · " + cur.Lq.short + " H̄ " + fmtM(cur.Hbar), 42, yCeil - 5, "left");
    }

    // ---- the source vessel and its surface ----
    var vcol = withAlpha(col.iron, 0.14);
    ctx.fillStyle = vcol;
    ctx.fillRect(VX0, SY, VX1 - VX0, VBOT - SY);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(VX0, SY - 22); ctx.lineTo(VX0, VBOT); ctx.lineTo(VX1, VBOT); ctx.lineTo(VX1, SY - 22);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(VX0, SY); ctx.lineTo(362, SY); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "source", VX0, SY - 8, "left");

    // ---- the tube: wall, then the liquid column ----
    var tube = [[XL, SY + 40], [XL, yCrest], [XR, yCrest], [XR, yOut], [XR, yOut + 16]];
    strokePoly(tube, withAlpha(col.faint, 0.35), 13);
    strokePoly(tube, liqCol, 8);

    // ---- the flow, or the parted column ----
    var xMid = (XL + XR) / 2;
    if (verdict === "broken") {
      // a gap of vapour opens at the crest — draw the column parted
      ctx.fillStyle = col.field;
      ctx.beginPath(); ctx.ellipse(xMid, yCrest, 34, 9, 0, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = withAlpha(col.dead, 0.5); ctx.lineWidth = 1;
      [-16, 0, 16].forEach(function (dx, i) {
        ctx.beginPath(); ctx.arc(xMid + dx, yCrest, 2.6 + i % 2, 0, 2 * Math.PI); ctx.stroke();
      });
      label(ctx, col.dead, "column parts", xMid, yCrest - 16, "center");
    } else if (cur.v > 0.02) {
      // arrows: up the rising leg, over the top, down the falling leg
      var flowCol = accent;
      arrow(ctx, flowCol, XL, yCrest + (SY - yCrest) * 0.55 + 10, XL, yCrest + (SY - yCrest) * 0.55 - 10, 2, 6);
      arrow(ctx, flowCol, xMid - 14, yCrest, xMid + 14, yCrest, 2, 6);
      arrow(ctx, flowCol, XR, yOut - (yOut - yCrest) * 0.5 - 10, XR, yOut - (yOut - yCrest) * 0.5 + 10, 2, 6);
    }

    // ---- the crest, and the pressure there ----
    var pText = verdict === "broken" ? "P_crest → vapour" : "P_crest " + fmtP(Math.max(cur.Pc, cur.Lq.pv));
    label(ctx, verdict === "broken" ? col.dead : liqCol, pText, xMid, yCrest - (verdict === "broken" ? 30 : 14), "center");

    // ---- the lift dimension L (source surface up to the crest) ----
    dimV(col.iron2, 152, SY, yCrest, "lift  " + fmtM(state.lift));
    // ---- the fall dimension H (source surface down to the outlet) ----
    dimV(col.timber2, 330, SY, yOut, "fall  " + fmtM(state.fall));

    // ---- the outlet ----
    ctx.fillStyle = withAlpha(col.iron, 0.14);
    ctx.fillRect(XR - 26, yOut + 16, 52, 20);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1.4;
    ctx.strokeRect(XR - 26, yOut + 16, 52, 20);
    if (verdict !== "broken" && cur.v > 0.02) arrow(ctx, accent, XR, yOut + 2, XR, yOut + 15, 2, 6);
    label(ctx, col.faint, "outlet", XR + 30, yOut + 30, "left");

    // ---- legend ----
    legend(col);

    // ---- the flow curve, and the ceiling gauge ----
    drawCurve(col, cur);
    drawGauge(col, accent, cur);
  }

  // the flow curve: v = √(2gH) against the fall, the current fall marked. The flow
  // is read exact off the panel; this shows its shape — all fall, no crest.
  function drawCurve(col, cur) {
    var ix = 398, iy = 34, iw = 146, ih = 150, pad = 20;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "flow · √(2gH)", ix + 10, iy + 16, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - 2 * pad, Hc = ih - 2 * pad - 6;
    var vmax = Math.sqrt(2 * G * HMAX);
    var xFor = function (h) { return Ox + (h - HMIN) / (HMAX - HMIN) * L; };
    var yFor = function (v) { return Oy - clamp(v, 0, vmax) / vmax * Hc; };

    // the slack band — too little fall to run
    var xSlack = xFor(FALL_SLACK);
    ctx.fillStyle = withAlpha(col.drift, 0.14);
    ctx.fillRect(Ox, Oy - Hc, xSlack - Ox, Hc);

    // the curve
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (var h = HMIN; h <= HMAX + 1e-9; h += 0.1) {
      var v = Math.sqrt(2 * G * h);
      var px = xFor(h), py = yFor(v);
      if (h <= HMIN + 1e-9) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // the current fall, marked on the curve
    var mx = xFor(state.fall), my = yFor(cur.v);
    ctx.fillStyle = cur.u >= 1 ? col.dead : state.fall >= FALL_SLACK ? col.keep : col.drift;
    ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.faint, "level", Ox, Oy + 12, "left");
    label(ctx, col.faint, "deep fall", Ox + L, Oy + 12, "right");
  }

  // the gauge: the crest (lift) against the ceiling the liquid clears at this fall.
  // Green band up to L_max; the oxblood wall where the column parts; a dashed tick at
  // the still-air ceiling H̄ behind it, when it falls on the scale.
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 404, bw = W - 48, bh = 54;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 64, gx1 = W - 64, gy = 436, scaleMax = LMAX;
    var xFor = function (l) { return gx0 + clamp(l, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // the green band the liquid safely carries at this fall
    var lmaxClamped = clamp(cur.Lmax, 0, scaleMax);
    var gh = xFor(lmaxClamped);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gh - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gh - gx0, 16);

    // the break wall at L_max (or off the right edge if the ceiling is beyond range)
    if (cur.Lmax <= scaleMax + 1e-9 && cur.Lmax >= 0) {
      ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(gh, gy - 12); ctx.lineTo(gh, gy + 12); ctx.stroke();
      label(ctx, col.faint, "ceiling", gh, gy + 24, "center");
    } else if (cur.Lmax > scaleMax) {
      label(ctx, col.faint, "ceiling off-scale ›", gx1, gy + 24, "right");
    }

    // the still-air ceiling H̄ (the ceiling at no flow), as a dashed tick behind it
    if (cur.Hbar > cur.Lmax + 0.05 && cur.Hbar <= scaleMax) {
      var gs = xFor(cur.Hbar);
      ctx.strokeStyle = withAlpha(col.timber2, 0.7); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(gs, gy - 12); ctx.lineTo(gs, gy + 12); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, col.faint, "still-air H̄", gs, gy - 15, "center");
    }

    label(ctx, col.faint, "no lift", gx0, gy + 24, "left");
    label(ctx, col.faint, "crest lift, m", (gx0 + gx1) / 2, gy - 15, "center");

    // the needle at the current crest
    var nX = xFor(state.lift);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
  }

  function legend(col) {
    var lx = 40, ly = 24;
    swatch(col.iron, lx, ly); label(ctx, col.soft, "liquid · the flow", lx + 14, ly + 4, "left");
    swatch(col.timber, lx, ly + 16); label(ctx, col.soft, "atmosphere · the lift", lx + 14, ly + 20, "left");
  }
  function swatch(c, x, y) { ctx.fillStyle = c; ctx.fillRect(x, y - 4, 9, 5); }

  // ---- small canvas helpers --------------------------------------------
  function strokePoly(pts, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke(); ctx.lineCap = "butt";
  }
  function dimV(color, x, y0, y1, text) {
    ctx.strokeStyle = withAlpha(color, 0.8); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, y0); ctx.lineTo(x + 4, y0);
    ctx.moveTo(x - 4, y1); ctx.lineTo(x + 4, y1); ctx.stroke();
    label(ctx, color, text, x + 7, (y0 + y1) / 2 + 3, "left");
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function arrow(c, color, x0, y0, x1, y1, w, head) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.lineCap = "round";
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    var a = Math.atan2(y1 - y0, x1 - x0);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42));
    c.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42));
    c.closePath(); c.fill();
    c.lineCap = "butt";
  }
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);
  var curVerdict = verdictOf(state, current);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    var ease = reduce ? 1 : Math.min(1, dt * 11);
    if (!initShown) { shown.lift = state.lift; shown.fall = state.fall; initShown = true; }
    shown.lift += (state.lift - shown.lift) * ease;
    shown.fall += (state.fall - shown.fall) * ease;

    draw(current, curVerdict, shown.lift, shown.fall);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    curVerdict = render(current);
    announce(current, curVerdict);
    save();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var liq = r.Lq.label.charAt(0).toUpperCase() + r.Lq.label.slice(1);
      var head = liq + ", a fall of " + fmtM(r.H) + " to the outlet and a crest "
        + fmtM(r.L) + " above the source, against a barometric ceiling of " + fmtM(r.Hbar) + ". ";
      var flow = verdict === "broken"
        ? "The column has parted, so nothing flows. "
        : "It flows at " + r.v.toFixed(1) + " metres a second, " + Math.round(r.v * AREA * 60000) + " litres a minute. ";
      var press = verdict === "broken"
        ? "The pressure at the crest has fallen to the vapour point."
        : "The pressure at the crest is " + Math.round(Math.max(r.Pc, r.Lq.pv) / 1000)
          + " kilopascals, " + Math.round(r.u * 100) + " percent of the way to the vapour point.";
      var msg;
      if (verdict === "runs") {
        msg = head + "Runs — a real fall, and the crest well under the ceiling, so the column stays continuous and holds its own prime. " + flow + press;
      } else if (verdict === "slack") {
        msg = head + "Slack — the outlet sits nearly level with the source, so the fall is small and the flow a trickle, or none. Lower the outlet to give it a fall. " + flow + press;
      } else if (verdict === "strained") {
        msg = head + "Strained — the crest is near the barometric ceiling; it still runs, but the pressure at the top of the bend is close to the vapour point, and a little more lift, or a faster fall, will tip it over. Lower the crest, or find the crest. " + flow + press;
      } else {
        msg = head + "Broken — the crest is over the ceiling: the pressure there has reached the vapour point, the liquid has boiled, and the column has parted and fallen back. No fall relieves it — lower the crest, or change to a liquid the atmosphere can lift higher. " + flow + press;
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inH.addEventListener("input", function () { state.fall = clampStep(inH.value, HMIN, HMAX, HSTEP); update(); });
  inL.addEventListener("input", function () { state.lift = clampStep(inL.value, LMIN, LMAX, LSTEP); update(); });
  liqBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.liquid = bn.dataset.liq; update(); });
  });

  $("find").addEventListener("click", function () {
    var opt = findCrest(state);
    if (opt != null) animateLift(opt);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inH.value = state.fall; inL.value = state.lift;
    update();
  });

  // raise or lower the crest toward the target so it is seen to rise —
  // under reduced motion it lands in one step
  function animateLift(target) {
    if (reduce || Math.abs(target - state.lift) < LSTEP) { state.lift = target; inL.value = target; update(); return; }
    var dir = target > state.lift ? LSTEP : -LSTEP;
    (function step() {
      state.lift = clamp(Math.round((state.lift + dir) / LSTEP) * LSTEP, LMIN, LMAX);
      inL.value = state.lift; update();
      if (Math.abs(state.lift - target) >= LSTEP) setTimeout(step, 16);
    })();
  }

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      draw(current, curVerdict, shown.lift, shown.fall);
    });
  }

  // ---- go --------------------------------------------------------------
  inH.value = state.fall; inL.value = state.lift;
  update();
})();
