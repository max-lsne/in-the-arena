/* Kingpost — the bench.
 *
 * A symmetric kingpost truss on two walls: two rafters to the ridge, a tie
 * across the feet, a kingpost hung from the ridge to the middle of the tie.
 * A roof load W_r bears on the ridge and a ceiling load W_c hangs on the post.
 * Everything follows from balancing the arrows at three joints — the method of
 * joints — with the rafters at a pitch θ above the tie:
 *
 *   reactions     R = (W_r + W_c) / 2                 (half the load at each wall)
 *   rafters       C = R / sin θ                       (compression)
 *   tie / thrust  T = R / tan θ                       (tension; the wall thrust)
 *   kingpost      P = W_c                             (tension; the ceiling load, flat in θ)
 *
 * Steepen the roof and C eases while the rafter grows long and slender; flatten
 * it and T climbs without bound into the tie and the walls. The post sits it
 * out — it carries the ceiling whatever the pitch, and no pitch will relieve it.
 *
 * Rafter capacity is the Rankine blend of squash (A·f_c) and Euler buckling
 * (π²EI/ℓ²) over the rafter's own length, so a longer, steeper rafter is weaker.
 * The tie is limited by its heel joint, the post by its hanger. The four trusses
 * are stylised — plausible sections and design loads, not measured — but the
 * forces drawn from them are exact. Newtons and millimetres throughout (E, f in
 * MPa = N/mm²); kN and metres only at the surface, for the reader.
 */
(function () {
  "use strict";

  var D2R = Math.PI / 180, PI2 = Math.PI * Math.PI;

  // Each truss pairs a span and timber with rafter and post sections, a heel-joint
  // capacity for the tie, a design load W_ref, and the share of it that is roof
  // (the rest hangs on the post as ceiling). Stylised — plausible, not measured.
  // Lengths mm, stresses MPa, capacities and W_ref in N.
  var TRUSSES = {
    cottage: { label: "cottage", L: 6000,  E: 9000,  fc: 20, ft: 13, rb: 47,  rd: 120, capT: 90000,  kb: 47, kd: 95,  roof: 0.72, Wref: 34000, timber: "spruce",       roofNote: "a steep cottage roof" },
    barn:    { label: "barn",    L: 9000,  E: 10000, fc: 21, ft: 14, rb: 63,  rd: 160, capT: 150000, kb: 63, kd: 110, roof: 0.66, Wref: 58000, timber: "Douglas-fir",  roofNote: "a common barn roof" },
    chapel:  { label: "chapel",  L: 13000, E: 10500, fc: 22, ft: 14, rb: 100, rd: 235, capT: 96000,  kb: 75, kd: 150, roof: 0.72, Wref: 82000, timber: "pitch-pine",   roofNote: "a wide, low chapel roof" },
    loft:    { label: "loft",    L: 7500,  E: 11000, fc: 26, ft: 17, rb: 75,  rd: 195, capT: 280000, kb: 38, kd: 90,  roof: 0.30, Wref: 58000, timber: "oak",          roofNote: "a loft under a heavy ceiling" }
  };

  // Opens on the wide chapel pitched to a flat 18° and pushed to 108% of its
  // design load — the tie's heel joint over its limit, the walls taking a hard
  // thrust. Find the pitch on arrival lifts the roof to relieve it.
  var DEFAULT = { truss: "chapel", pitch: 18, load: 108 };
  var PMIN = 12, PMAX = 62, PSTEP = 1;
  var LMIN = 20, LMAX = 160, LSTEP = 4;
  var KEY = "kingpost.truss.v1";     // where the truss, pitch and load are kept between visits

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    return v < a ? a : v > b ? b : v;
  }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!TRUSSES[o.truss]) return null;
      return {
        truss: o.truss,
        pitch: clampStep(o.pitch, PMIN, PMAX, PSTEP),
        load: clampStep(o.load, LMIN, LMAX, LSTEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the frame -------------------------------------------------------
  // Every force from the pitch and the load as a share of the design load.
  function compute(s) {
    var T = TRUSSES[s.truss];
    var a = T.L / 2, th = s.pitch * D2R;
    var h = a * Math.tan(th), lr = Math.sqrt(a * a + h * h);
    var sin = h / lr;

    var Wtot = s.load / 100 * T.Wref;
    var Wc = (1 - T.roof) * Wtot;           // ceiling — hung on the post
    var Wr = T.roof * Wtot;                  // roof — on the ridge
    var R = Wtot / 2;                        // reaction at each wall

    var Fr = R / sin;                        // rafter compression
    var Ft = R * a / h;                      // tie tension = R / tan θ = wall thrust
    var Fk = Wc;                             // kingpost tension = the ceiling load

    // rafter capacity: Rankine blend of squash and Euler buckling over its length
    var Ar = T.rb * T.rd, Is = T.rb * T.rd * T.rd * T.rd / 12;
    var Ps = Ar * T.fc, Pe = PI2 * T.E * Is / (lr * lr);
    var capR = Ps * Pe / (Ps + Pe);
    var capT = T.capT;                       // the heel joint
    var capK = T.kb * T.kd * T.ft;           // the hanger

    var uR = Fr / capR, uT = Ft / capT, uK = Fk / capK;

    // load %, as a share of W_ref, at which each member reaches its limit
    // (member forces scale with the load, so this is just the current load / u)
    var pR = s.load / uR, pT = s.load / uT, pK = s.load / uK;
    var pSafe = Math.min(pR, pT, pK);

    var bind = uR >= uT && uR >= uK ? "rafter" : uT >= uK ? "tie" : "post";
    var over = Math.max(uR, uT, uK) > 1 + 1e-9;

    return {
      T: T, a: a, th: th, h: h, lr: lr, sin: sin,
      Wtot: Wtot, Wc: Wc, Wr: Wr, R: R,
      Fr: Fr, Ft: Ft, Fk: Fk, capR: capR, capT: capT, capK: capK,
      uR: uR, uT: uT, uK: uK, pR: pR, pT: pT, pK: pK,
      pSafe: pSafe, safeW: pSafe / 100 * T.Wref, bind: bind, over: over
    };
  }

  // the pitch that shares the load most evenly between the rafters and the tie —
  // the two members the pitch pulls in opposite directions. The post sits it out.
  function findPitch(s) {
    var best = null;
    for (var p = PMIN; p <= PMAX + 1e-6; p += 0.5) {
      var r = compute(Object.assign({}, s, { pitch: p }));
      var m = Math.max(r.uR, r.uT);
      if (!best || m < best.m) best = { p: p, m: m };
    }
    return Math.round(best.p / PSTEP) * PSTEP;
  }

  function verdictOf(s, r) {
    if (r.over) return "over";
    var opt = findPitch(s);
    if (Math.abs(s.pitch - opt) <= 2) return "sound";
    return s.pitch > opt ? "steep" : "low";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-W"), inP = $("in-P");
  var labW = $("lab-W"), labP = $("lab-P");
  var trussBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-truss]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var pMark = $("p-mark"), pNote = $("p-note");

  function fmtkN(N) {
    var kN = N / 1000;
    return (kN >= 10 ? Math.round(kN) : Math.round(kN * 10) / 10) + " kN";
  }

  function syncLabels(r) {
    labW.textContent = state.load + "% · " + fmtkN(r.Wtot);
    labP.textContent = state.pitch + "°";
    trussBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.truss === state.truss));
    });
  }

  var VERDICT_TEXT = {
    sound: { cls: "v-keep",  word: "Sound",         note: "the pitch the load wants" },
    steep: { cls: "v-drift", word: "Over-pitched",  note: "safe, but a taller roof than the load needs" },
    low:   { cls: "v-drift", word: "Under-pitched", note: "safe, but a hard thrust into the tie and walls" }
  };
  var OVER_NOTE = {
    rafter: "a rafter past its buckling limit",
    tie:    "the tie's heel joint past its limit",
    post:   "the post past its hanger's limit"
  };

  function uClass(u) { return u >= 1 ? "bad" : u >= 0.85 ? "warn" : "good"; }

  function render(r) {
    var verdict = verdictOf(state, r);
    var v = verdict === "over"
      ? { cls: "v-dead", word: "Overstressed", note: OVER_NOTE[r.bind] }
      : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var bindWord = { rafter: "rafter", tie: "tie", post: "post" }[r.bind];
    var carryCls = r.over ? "bad" : (verdict === "sound" ? "good" : "warn");

    var rows = [
      ["Pitch", state.pitch + '<span class="unit">° · rise ' + (r.h / 1000).toFixed(1) + " m</span>", ""],
      ['Rafters <span class="tag c">push</span>', fmtkN(r.Fr) + '<span class="unit"> / ' + fmtkN(r.capR) + "</span>", uClass(r.uR)],
      ['Tie <span class="tag">pull</span>', fmtkN(r.Ft) + '<span class="unit"> / ' + fmtkN(r.capT) + "</span>", uClass(r.uT)],
      ['Kingpost <span class="tag">pull</span>', fmtkN(r.Fk) + '<span class="unit"> / ' + fmtkN(r.capK) + "</span>", uClass(r.uK)],
      ["Carries", fmtkN(r.safeW) + '<span class="unit"> · ' + bindWord + "</span>", carryCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markPitch();
    return verdict;
  }

  // mark, under the pitch slider, the pitch the load wants
  function markPitch() {
    if (!pMark || !pNote) return;
    var opt = findPitch(state);
    var rOpt = compute(Object.assign({}, state, { pitch: opt }));
    pMark.style.left = ((opt - PMIN) / (PMAX - PMIN) * 100) + "%";
    pMark.className = "x-mark" + (rOpt.uK >= 1 ? " off" : "");
    if (rOpt.uK >= 1) pNote.innerHTML = "no pitch relieves the post — deepen it or ease the load";
    else if (Math.abs(opt - state.pitch) <= 1) pNote.innerHTML = "the pitch this load wants: <b>" + opt + "°</b>";
    else pNote.innerHTML = "shares the load best at <b>" + opt + "°</b>";
  }

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 520, H = 440, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

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

  // elevation geometry, canvas space
  var BASEY = 172, MIDX = 200, HS0 = 148, RISEMAX = 118;

  // eased display state, so a change of pitch reads as the roof swinging up or
  // down, not as a jump
  var shown = { pitch: DEFAULT.pitch, load: DEFAULT.load };
  var lastTs = null, initShown = false;

  function fitTruss(pitchDeg) {
    var th = pitchDeg * D2R;
    var hs = Math.min(HS0, RISEMAX / Math.tan(th));
    return { hs: hs, rise: hs * Math.tan(th), th: th };
  }

  function memCol(col, u, comp) {
    if (u >= 1) return col.dead;
    if (u >= 0.85) return col.drift;
    return comp ? col.timber : col.iron;
  }
  function memW(u) { return 4 + clamp(u, 0, 1) * 3.2; }

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "sound" ? col.keep
      : verdict === "over" ? col.dead : col.drift;

    ctx.clearRect(0, 0, W, H);

    var g = fitTruss(shown.pitch);
    var footL = { x: MIDX - g.hs, y: BASEY }, footR = { x: MIDX + g.hs, y: BASEY };
    var apex = { x: MIDX, y: BASEY - g.rise }, mid = { x: MIDX, y: BASEY };

    // walls under the feet
    wall(col, footL.x, footR.x);

    // ---- the members ----
    // tie (tension)
    line(footL, footR, memCol(col, cur.uT, false), memW(cur.uT));
    // rafters (compression)
    line(footL, apex, memCol(col, cur.uR, true), memW(cur.uR));
    line(footR, apex, memCol(col, cur.uR, true), memW(cur.uR));
    // kingpost (tension)
    line(apex, mid, memCol(col, cur.uK, false), memW(cur.uK));

    // joints
    [footL, footR, apex, mid].forEach(function (p) { dot(p.x, p.y, 3.4, col.field, col.soft); });

    // ---- the loads ----
    var wr = clamp(cur.Wr / cur.T.Wref * 46 + 8, 10, 46);
    arrow(ctx, accent, apex.x, apex.y - wr - 8, apex.x, apex.y - 6, 2.4, 8);
    label(ctx, accent, "W", apex.x, apex.y - wr - 13, "center");
    if (cur.Wc > 1) {
      var wc = clamp(cur.Wc / cur.T.Wref * 46 + 8, 10, 40);
      arrow(ctx, col.iron2, mid.x + 22, mid.y + 6, mid.x + 22, mid.y + wc + 6, 2, 7);
      label(ctx, col.iron2, "ceiling", mid.x + 28, mid.y + wc / 2 + 10, "left");
    }

    // ---- reactions ----
    [footL, footR].forEach(function (p) {
      arrow(ctx, withAlpha(col.faint, 0.9), p.x, p.y + 26, p.x, p.y + 8, 1.4, 6);
    });
    label(ctx, col.faint, "R", footL.x, footL.y + 40, "center");
    label(ctx, col.faint, "R", footR.x, footR.y + 40, "center");

    // ---- the outward thrust on the walls ----
    var thrustCol = cur.uT >= 1 ? col.dead : cur.uT >= 0.85 ? col.drift : col.iron2;
    var tl = clamp(cur.Ft / cur.T.Wref * 22 + 8, 10, 34);
    arrow(ctx, thrustCol, footL.x - 4, footL.y - 3, footL.x - 4 - tl, footL.y - 3, 1.8, 7);
    arrow(ctx, thrustCol, footR.x + 4, footR.y - 3, footR.x + 4 + tl, footR.y - 3, 1.8, 7);
    label(ctx, thrustCol, "thrust", footL.x - 4 - tl, footL.y - 9, "left");

    // ---- pitch angle at the left foot ----
    ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(footL.x, footL.y, 26, -g.th, 0); ctx.stroke();
    label(ctx, col.soft, state.pitch + "°", footL.x + 34, footL.y - 9, "left");

    // ---- rise on the kingpost ----
    if (g.rise > 22) {
      ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(mid.x + 8, apex.y); ctx.lineTo(mid.x + 8, mid.y); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, col.faint, "h", mid.x + 13, (apex.y + mid.y) / 2 + 3, "left");
    }

    // ---- span dimension ----
    var dimY = BASEY + 54;
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(footL.x, dimY); ctx.lineTo(footR.x, dimY); ctx.stroke();
    tick(col.rule, footL.x, dimY); tick(col.rule, footR.x, dimY);
    label(ctx, col.faint, "L = " + (cur.T.L / 1000).toFixed(1) + " m span", MIDX, dimY + 15, "center");

    // ---- legend ----
    legend(col);

    // ---- the force triangle at the foot ----
    drawPolygon(col, cur);

    // ---- the gauge ----
    drawGauge(col, accent, cur);
  }

  // the closed force triangle at the left foot: reaction R up, rafter C down the
  // slope, tie T along the beam — a right triangle with legs R and T, hypotenuse
  // the rafter. Flatten the pitch and the T leg (the thrust) runs away.
  function drawPolygon(col, cur) {
    var ix = 392, iy = 44, iw = 118, ih = 150, pad = 20;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "joint at the foot", ix + 10, iy + 16, "left");

    var R = cur.R, Ft = cur.Ft;
    if (!(R > 0) || !(Ft > 0)) return;
    var sc = Math.min((iw - 2 * pad) / Ft, (ih - 2 * pad - 16) / R);
    var O = { x: ix + iw - pad, y: iy + ih - pad };       // the right-angle corner
    var A1 = { x: O.x, y: O.y - R * sc };                  // up the reaction
    var A2 = { x: O.x - Ft * sc, y: O.y };                 // along the tie

    // fill
    ctx.fillStyle = withAlpha(cur.over ? col.dead : col.iron, 0.1);
    ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(A1.x, A1.y); ctx.lineTo(A2.x, A2.y);
    ctx.closePath(); ctx.fill();

    // right-angle tick
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1;
    ctx.strokeRect(O.x - 7, O.y - 7, 7, 7);

    line(O, A1, withAlpha(col.faint, 0.9), 2);                        // R
    line(A1, A2, memCol(col, cur.uR, true), 2.4);                     // rafter C
    line(A2, O, memCol(col, cur.uT, false), 2.4);                     // tie T

    label(ctx, col.faint, "R", O.x + 4, (O.y + A1.y) / 2 + 3, "left");
    label(ctx, memCol(col, cur.uR, true), "C", (A1.x + A2.x) / 2 - 12, (A1.y + A2.y) / 2 - 3, "right");
    label(ctx, memCol(col, cur.uT, false), "T", (A2.x + O.x) / 2, O.y + 14, "center");
  }

  function legend(col) {
    var lx = 40, ly = 48;
    swatch(col.timber, lx, ly); label(ctx, col.soft, "rafters · compression", lx + 14, ly + 4, "left");
    swatch(col.iron, lx, ly + 16); label(ctx, col.soft, "tie · post · tension", lx + 14, ly + 20, "left");
  }
  function swatch(c, x, y) {
    ctx.fillStyle = c; ctx.fillRect(x, y - 4, 9, 5);
  }

  function drawGauge(col, accent, cur) {
    var bx = 24, by = 352, bw = W - 48, bh = 66;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 64, gx1 = W - 64, gy = 390, scaleMax = 160;
    var xFor = function (p) { return gx0 + clamp(p, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // green band the truss safely carries at this pitch
    var gh = xFor(cur.pSafe);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gh - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gh - gx0, 16);

    // the binding limit — the break wall
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gh, gy - 12); ctx.lineTo(gh, gy + 12); ctx.stroke();

    // the next limit behind, as a dashed tick
    var second = secondLimit(cur);
    if (second.p > cur.pSafe + 0.5 && second.p <= scaleMax) {
      var gs = xFor(second.p);
      ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(gs, gy - 12); ctx.lineTo(gs, gy + 12); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, col.faint, second.word, gs, gy + 24, "center");
    }

    label(ctx, col.faint, "no load", gx0, gy + 24, "left");
    label(ctx, col.faint, "carries", (gx0 + gh) / 2, gy - 13, "center");
    label(ctx, col.faint, cur.bind, gh, gy + 24, "center");

    // needle at the current load
    var nX = xFor(state.load);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
  }

  // the second-nearest limit, to mark behind the binding one
  function secondLimit(cur) {
    var arr = [
      { p: cur.pR, word: "rafter" },
      { p: cur.pT, word: "tie" },
      { p: cur.pK, word: "post" }
    ].sort(function (a, b) { return a.p - b.p; });
    return arr[1];
  }

  // ---- small canvas helpers --------------------------------------------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function line(p0, p1, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    ctx.lineCap = "butt";
  }
  function dot(x, y, r, fill, stroke) {
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  }
  function wall(col, xL, xR) {
    ctx.fillStyle = withAlpha(col.soft, 0.5);
    ctx.fillRect(xL - 9, BASEY + 3, 18, 20);
    ctx.fillRect(xR - 9, BASEY + 3, 18, 20);
  }
  function tick(color, x, y) {
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
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
    if (!initShown) { shown.pitch = state.pitch; shown.load = state.load; initShown = true; }
    shown.pitch += (state.pitch - shown.pitch) * ease;
    shown.load += (state.load - shown.load) * ease;

    draw(current, curVerdict);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels(current);
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
      var kR = Math.round(r.Fr / 1000), kT = Math.round(r.Ft / 1000), kP = Math.round(r.Fk / 1000);
      var head = "A " + r.T.roofNote + " in " + r.T.timber + ", pitched at " + state.pitch
        + " degrees and loaded to " + state.load + " percent of its design load. ";
      var forces = "The rafters carry " + kR + " of " + Math.round(r.capR / 1000)
        + " kilonewtons in compression, the tie " + kT + " of " + Math.round(r.capT / 1000)
        + " in tension, the kingpost " + kP + " of " + Math.round(r.capK / 1000) + ".";
      var msg;
      if (verdict === "sound") {
        msg = head + "Sound — the pitch shares the load evenly and every member sits inside its limit. " + forces;
      } else if (verdict === "steep") {
        msg = head + "Over-pitched — safe, but steeper than the load needs; the rafters run long while the tie is barely worked. "
          + "Flatten the roof, or find the pitch. " + forces;
      } else if (verdict === "low") {
        msg = head + "Under-pitched — safe, but flat, and the tie and the walls take a hard thrust. "
          + "Steepen the roof, or find the pitch. " + forces;
      } else {
        var who = r.bind === "rafter" ? "a rafter has passed its buckling limit"
          : r.bind === "tie" ? "the tie's heel joint has passed its limit under the thrust"
          : "the kingpost has passed its hanger's limit under the ceiling it carries";
        var fix = r.bind === "post" ? "No pitch relieves the post — deepen it or ease the load. "
          : "Find the pitch, or ease the load. ";
        msg = head + "Overstressed — " + who + ". " + fix + forces;
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inW.addEventListener("input", function () { state.load = parseInt(inW.value, 10); update(); });
  inP.addEventListener("input", function () { state.pitch = parseInt(inP.value, 10); update(); });
  trussBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.truss = bn.dataset.truss; update(); });
  });

  $("find").addEventListener("click", function () { animatePitch(findPitch(state)); });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.load; inP.value = state.pitch;
    update();
  });

  // swing the roof toward the target pitch so it is seen to rise or fall —
  // under reduced motion it lands in one step
  function animatePitch(target) {
    if (reduce || Math.abs(target - state.pitch) < 1) { state.pitch = target; inP.value = target; update(); return; }
    var dir = target > state.pitch ? PSTEP : -PSTEP;
    (function step() {
      state.pitch = clamp(state.pitch + dir, PMIN, PMAX);
      inP.value = state.pitch; update();
      if (Math.abs(state.pitch - target) >= 1) setTimeout(step, 26);
    })();
  }

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current, curVerdict); });
  }

  // ---- go --------------------------------------------------------------
  inW.value = state.load; inP.value = state.pitch;
  update();
})();
