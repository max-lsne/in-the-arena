/* Flitch — the bench.
 *
 * Two timber leaves and a steel plate, all of depth d, bolted so they cannot
 * slide and must bend to one radius R. Bending about the strong axis, the
 * strain at a fibre y off the neutral axis is y/R for every material at once —
 * that is the whole of it. Everything follows from the shared curvature.
 *
 *   second moments   I_w = 2·(b_w·d³/12) = b_w·d³/6   (the two leaves)
 *                     I_s = t·d³/12                    (the plate, thickness t)
 *   shared rigidity   ΣEI = E_w·I_w + E_s·I_s
 *   curvature         1/R = M/ΣEI
 *   extreme fibre     σ_w = E_w·(d/2)/R,  σ_s = E_s·(d/2)/R = n·σ_w,  n = E_s/E_w
 *   deflection        δ = W·L³/(48·ΣEI)         (central point load, span L)
 *
 * Thicken the plate and ΣEI climbs, so under a fixed load both σ_w and σ_s fall
 * together — in the fixed ratio n — and the sag δ falls with them. The plate
 * never changes n: whether the wood reaches f_w before the steel reaches f_y is
 * decided by the pairing, timber-governed when n·f_w < f_y and steel-governed
 * otherwise. The load is set as a share of what the bare timber leaves alone
 * could carry to their bending limit, so 100% is the wood at its edge, no plate.
 *
 * The four beams are stylised — plausible sections and material strengths, not
 * measured — but the mechanics drawn from them are exact. Newtons and
 * millimetres throughout (E and σ in MPa = N/mm²); kN and mm only at the
 * surface, for the reader.
 */
(function () {
  "use strict";

  var ES = 210000;   // steel — E, MPa

  // Each beam pairs a timber (E_w, bending strength f_w, leaf width b_w, depth d,
  // span L) with a steel plate grade (yield f_y). Two leaves, one plate between.
  // Stylised — plausible, not measured. Lengths in mm, stresses in MPa.
  var BEAMS = {
    pine:   { label: "spruce · S275", Ew: 8000,  fw: 8,  fy: 275, bw: 38, d: 195, L: 3000, timber: "spruce joist",   steel: "mild steel" },
    fir:    { label: "fir · S275",    Ew: 11000, fw: 14, fy: 275, bw: 47, d: 220, L: 4200, timber: "Douglas-fir beam", steel: "mild steel" },
    oak:    { label: "oak · S275",    Ew: 10000, fw: 18, fy: 275, bw: 50, d: 170, L: 2000, timber: "white-oak lintel", steel: "mild steel" },
    glulam: { label: "glulam · S355", Ew: 11500, fw: 11, fy: 355, bw: 45, d: 300, L: 5400, timber: "glulam header",  steel: "S355 steel" }
  };

  // Opens on a bare Douglas-fir beam pushed to 128% of what the timber alone can
  // hold — overstressed in the wood, no plate in it. Find the flitch on arrival.
  var DEFAULT = { beam: "fir", load: 128, t: 0 };
  var KEY = "flitch.beam.v1";     // where the beam, load and plate are kept between visits
  var TMAX = 12, TSTEP = 0.5;

  var state = load() || Object.assign({}, DEFAULT);

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
      if (!BEAMS[o.beam]) return null;
      return {
        beam: o.beam,
        load: clampStep(o.load, 20, 160, 4),
        t: clampStep(o.t, 0, TMAX, TSTEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the split -------------------------------------------------------
  // Everything the beam does, from the plate thickness t and the load as a share
  // of what the bare timber leaves could carry.
  function compute(s) {
    var b = BEAMS[s.beam];
    var d = b.d, L = b.L;
    var Iw = b.bw * d * d * d / 6;          // mm⁴ — two leaves
    var Is = s.t * d * d * d / 12;          // mm⁴ — the plate
    var EI0 = b.Ew * Iw;                    // bare rigidity
    var EI = b.Ew * Iw + ES * Is;           // shared rigidity with the plate
    var n = ES / b.Ew;

    // reference load: the bare timber leaves at their bending limit
    var M0 = 2 * b.fw * Iw / d;             // N·mm
    var Wref = 4 * M0 / L;                  // N
    var W = s.load / 100 * Wref;            // N
    var M = W * L / 4;                      // N·mm

    var invR = M / EI;                      // 1/mm
    var sigW = b.Ew * (d / 2) * invR;       // MPa
    var sigS = ES * (d / 2) * invR;         // MPa (= n·sigW)
    var strain = sigW / b.Ew;               // dimensionless
    var delta = W * L * L * L / (48 * EI);  // mm
    var dLim = L / 360;                     // mm

    // load %, as a share of Wref, at which each thing reaches its limit
    var pWood = 100 * EI / EI0;                          // σ_w = f_w
    var pSteel = 100 * (b.fy / (n * b.fw)) * (EI / EI0); // σ_s = f_y
    var pDefl = 100 * dLim * 48 * EI / (Wref * L * L * L); // δ = L/360
    var pStr = Math.min(pWood, pSteel);
    var pSafe = Math.min(pStr, pDefl);

    var bindMode = pStr <= pDefl ? (pWood <= pSteel ? "timber" : "steel") : "sag";
    var broken = s.load > pSafe + 1e-9;
    var overStr = s.load > pStr + 1e-9;

    return {
      b: b, d: d, L: L, n: n, Iw: Iw, Is: Is, EI0: EI0, EI: EI,
      Wref: Wref, W: W, M: M, invR: invR,
      sigW: sigW, sigS: sigS, strain: strain, delta: delta, dLim: dLim,
      uWood: sigW / b.fw, uSteel: sigS / b.fy, uDefl: delta / dLim,
      pWood: pWood, pSteel: pSteel, pDefl: pDefl, pStr: pStr, pSafe: pSafe,
      safeW: pSafe / 100 * Wref,
      bindMode: bindMode, overStr: overStr, broken: broken
    };
  }

  function verdictOf(s, r) {
    if (r.overStr) return "over";
    if (s.load > r.pDefl + 1e-9) return "sag";
    var need = findFlitch(s);
    return s.t <= need + 1e-6 ? "balanced" : "overbuilt";
  }

  // the thinnest plate that brings wood, steel and sag all inside their limits.
  // every utilisation falls monotonically as the plate thickens, so the first
  // that clears is the answer; if none on the grid does, the stoutest plate is
  // the best we can offer.
  function findFlitch(s) {
    for (var t = 0; t <= TMAX + 1e-6; t += TSTEP) {
      var r = compute(Object.assign({}, s, { t: t }));
      if (r.uWood <= 1 && r.uSteel <= 1 && r.uDefl <= 1) return t;
    }
    return TMAX;
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-W"), inT = $("in-T");
  var labW = $("lab-W"), labT = $("lab-T");
  var beamBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-beam]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var tMark = $("t-mark"), tNote = $("t-note");

  function fmtkN(N) {
    var kN = N / 1000;
    return (kN >= 10 ? Math.round(kN) : Math.round(kN * 10) / 10) + " kN";
  }

  function syncLabels(r) {
    labW.textContent = state.load + "% · " + fmtkN(r.W);
    labT.textContent = state.t === 0 ? "none" : state.t.toFixed(1) + " mm · " + gradeOf(r.b);
    beamBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.beam === state.beam));
    });
  }
  function gradeOf(b) { return b.fy >= 355 ? "S355" : "S275"; }

  var VERDICT_TEXT = {
    balanced:  { cls: "v-keep",  word: "Balanced",     note: "the plate earns its steel" },
    overbuilt: { cls: "v-drift", word: "Over-plated",  note: "safe, but heavier than the load asked" },
    sag:       { cls: "v-dead",  word: "Sagging",      note: "strong, but past span / 360" },
    over:      { cls: "v-dead",  word: "Overstressed", note: "the extreme fibre past its limit" }
  };

  function uClass(u) { return u >= 1 ? "bad" : u >= 0.85 ? "warn" : "good"; }

  function render(r) {
    var verdict = verdictOf(state, r);
    var v = VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var plateVal = state.t === 0
      ? "none <span class=\"unit\">· bare timber</span>"
      : state.t.toFixed(1) + '<span class="unit"> mm · ' + gradeOf(r.b) + "</span>";

    var carryMode = { timber: "timber", steel: "steel", sag: "sag" }[r.bindMode];
    var carryCls = r.broken ? "bad" : (verdict === "balanced" ? "good" : "warn");

    var rows = [
      ["Plate", plateVal, ""],
      ["Wood σ", r.sigW.toFixed(1) + '<span class="unit"> / ' + r.b.fw + " MPa</span>", uClass(r.uWood)],
      ["Steel σ", Math.round(r.sigS) + '<span class="unit"> / ' + r.b.fy + " MPa</span>", uClass(r.uSteel)],
      ["Sag", r.delta.toFixed(1) + '<span class="unit"> / ' + r.dLim.toFixed(1) + " mm</span>", uClass(r.uDefl)],
      ["Carries", fmtkN(r.safeW) + '<span class="unit"> · ' + carryMode + "</span>", carryCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markFlitch();
    return verdict;
  }

  // mark, under the plate slider, the thinnest flitch that brings it all inside
  function markFlitch() {
    if (!tMark || !tNote) return;
    var need = findFlitch(state);
    tMark.style.left = (need / TMAX * 100) + "%";
    tMark.className = "x-mark" + (need >= TMAX ? " off" : "");
    if (need >= TMAX) tNote.innerHTML = "no plate on the bench brings it in — needs a deeper section";
    else if (need === 0) tNote.innerHTML = "the bare timber already carries this";
    else if (Math.abs(need - state.t) < 0.26) tNote.innerHTML = "balanced at <b>" + need.toFixed(1) + " mm</b>";
    else tNote.innerHTML = "inside every limit from <b>" + need.toFixed(1) + " mm</b>";
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
  var LSUP = 48, RSUP = 336, MIDX = (LSUP + RSUP) / 2, BASEY = 120, BEAM_H = 15;

  // deflected shape for a central point load, normalised to 1 at midspan:
  // δ(x)/δmax = 3ξ − 4ξ³ for ξ = x/L in [0, ½], mirrored past midspan
  function shapeAt(u) {                       // u in [0,1] across the span
    var x = u <= 0.5 ? u : 1 - u;
    return 3 * x - 4 * x * x * x;
  }

  // eased display state, so a change reads as the plate thickening or the beam
  // bending down, not as a jump
  var shown = { t: 0, sag: 0, strain: 0 };
  var lastTs = null, initShown = false;

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"), timberB: cssVar("--timber-b"),
      steel: cssVar("--steel"), steel2: cssVar("--steel-2"), steelB: cssVar("--steel-b"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "balanced" ? col.keep
      : verdict === "overbuilt" ? col.drift : col.dead;

    ctx.clearRect(0, 0, W, H);

    var sag = shown.sag;

    // ---- the beam in span ----
    // supports
    drawSupport(col, LSUP, BASEY + BEAM_H / 2 + 2);
    drawSupport(col, RSUP, BASEY + BEAM_H / 2 + 2);

    // beam band, following the deflected centreline
    var STEPS = 60;
    function cy(u) { return BASEY + sag * shapeAt(u); }
    ctx.beginPath();
    for (var i = 0; i <= STEPS; i++) {
      var u = i / STEPS, x = LSUP + u * (RSUP - LSUP), y = cy(u) - BEAM_H / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (var j = STEPS; j >= 0; j--) {
      var u2 = j / STEPS, x2 = LSUP + u2 * (RSUP - LSUP), y2 = cy(u2) + BEAM_H / 2;
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(col.timber, 0.9); ctx.fill();
    ctx.strokeStyle = col.timber2; ctx.lineWidth = 1.4; ctx.stroke();

    // the plate — a steel-blue core line down the middle of the band, its weight
    // growing with the plate thickness
    var platePx = clamp(shown.t * 0.55, 0, 6);
    if (platePx > 0.2) {
      ctx.beginPath();
      for (var k = 0; k <= STEPS; k++) {
        var uk = k / STEPS, xk = LSUP + uk * (RSUP - LSUP), yk = cy(uk);
        k === 0 ? ctx.moveTo(xk, yk) : ctx.lineTo(xk, yk);
      }
      ctx.strokeStyle = col.steel; ctx.lineWidth = platePx; ctx.lineCap = "round"; ctx.stroke();
      ctx.lineCap = "butt";
    }

    // ---- the load, at midspan ----
    var Wforce = clamp(state.load * 0.34, 12, 60);
    var loadTopY = cy(0.5) - BEAM_H / 2 - Wforce - 8;
    arrow(ctx, accent, MIDX, loadTopY, MIDX, cy(0.5) - BEAM_H / 2 - 2, 2.6, 9);
    label(ctx, accent, "W = " + fmtkN(cur.W), MIDX, loadTopY - 7, "center");

    // ---- the sag ----
    if (sag > 3) {
      ctx.strokeStyle = withAlpha(col.faint, 0.8); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(MIDX - 44, BASEY); ctx.lineTo(RSUP - 4, BASEY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(MIDX - 30, BASEY); ctx.lineTo(MIDX - 30, cy(0.5)); ctx.stroke();
      ctx.setLineDash([]);
      arrow(ctx, col.faint, MIDX - 30, BASEY + 2, MIDX - 30, cy(0.5), 1.4, 6);
      var sagCol = cur.uDefl >= 1 ? col.dead : cur.uDefl >= 0.85 ? col.drift : col.keep;
      label(ctx, sagCol, "δ " + cur.delta.toFixed(1) + " mm", MIDX - 26, (BASEY + cy(0.5)) / 2 + 3, "left");
    }

    // ---- span dimension ----
    var dimY = 202;
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(LSUP, dimY); ctx.lineTo(RSUP, dimY); ctx.stroke();
    tick(col.rule, LSUP, dimY); tick(col.rule, RSUP, dimY);
    label(ctx, col.faint, "L = " + (cur.L / 1000).toFixed(1) + " m span", MIDX, dimY + 15, "center");

    // ---- the section, and the shared strain ----
    drawSection(col, accent, cur);

    drawGauge(col, accent, cur);
  }

  function tick(color, x, y) {
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
  }

  function drawSupport(col, x, y) {
    ctx.fillStyle = withAlpha(col.soft, 0.55);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 13); ctx.lineTo(x + 9, y + 13);
    ctx.closePath(); ctx.fill();
  }

  // the cross-section — two timber leaves, the steel plate between, its width the
  // dial — and beside it the strain bowtie, ε = y/R, the one thing both share
  function drawSection(col, accent, cur) {
    var bx = 372, by = 44, bw = 136, bh = 148;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "section", bx + 10, by + 16, "left");

    var secTop = by + 30, secBot = by + bh - 22, secH = secBot - secTop;
    var na = (secTop + secBot) / 2;

    // section: leaves + plate, centred on the left of the box
    var LW = 24, plate = clamp(shown.t * 2.6, 0, 34);
    var total = 2 * LW + plate;
    var scx = bx + 46;                       // section centre x
    var lx = scx - total / 2;

    // leaves
    ctx.fillStyle = withAlpha(col.timber, 0.92);
    ctx.fillRect(lx, secTop, LW, secH);
    ctx.fillStyle = withAlpha(col.timberB, 0.92);
    ctx.fillRect(lx + LW + plate, secTop, LW, secH);
    // grain
    ctx.strokeStyle = withAlpha(col.timber2, 0.3); ctx.lineWidth = 1;
    for (var g = 1; g <= 3; g++) {
      var gy = secTop + g * secH / 4;
      ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx + LW, gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx + LW + plate, gy); ctx.lineTo(lx + LW + plate + LW, gy); ctx.stroke();
    }
    // the plate
    if (plate > 0.5) {
      ctx.fillStyle = withAlpha(col.steel, 0.95);
      ctx.fillRect(lx + LW, secTop, plate, secH);
      ctx.strokeStyle = col.steel2; ctx.lineWidth = 1; ctx.strokeRect(lx + LW, secTop, plate, secH);
    } else {
      ctx.strokeStyle = withAlpha(col.steel, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(lx + LW, secTop); ctx.lineTo(lx + LW, secBot); ctx.stroke();
      ctx.setLineDash([]);
    }
    // section outline + neutral axis
    ctx.strokeStyle = col.timber2; ctx.lineWidth = 1.4; ctx.strokeRect(lx, secTop, total, secH);
    ctx.strokeStyle = withAlpha(col.soft, 0.6); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(lx - 6, na); ctx.lineTo(lx + total + 6, na); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.timber2, "wood", scx - total / 2 - 2, secBot + 15, "left");
    if (plate > 0.5) label(ctx, col.steel2, "steel", lx + LW + plate / 2, secTop - 5, "center");

    // strain bowtie: ε = y/R, same for both materials — the shared curvature
    var strainAmp = clamp(shown.strain * 9500, 2, 30);
    var sbx = bx + bw - 34;
    ctx.strokeStyle = withAlpha(col.soft, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sbx, secTop); ctx.lineTo(sbx, secBot); ctx.stroke();  // axis
    ctx.fillStyle = withAlpha(accent, 0.16);
    ctx.strokeStyle = accent; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sbx, na);
    ctx.lineTo(sbx + strainAmp, secTop);
    ctx.lineTo(sbx, secTop);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sbx, na);
    ctx.lineTo(sbx - strainAmp, secBot);
    ctx.lineTo(sbx, secBot);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    label(ctx, col.faint, "ε = y/R", sbx - 2, secBot + 15, "center");
  }

  function drawGauge(col, accent, cur) {
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(28, 344, W - 56, 66, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 64, gx1 = 456, gy = 382, scaleMax = 160;
    var xFor = function (p) { return gx0 + clamp(p, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // green band the flitch safely carries
    var gh = xFor(cur.pSafe);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gh - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gh - gx0, 16);

    // break wall — the binding limit
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gh, gy - 12); ctx.lineTo(gh, gy + 12); ctx.stroke();

    // the other limit waiting behind, as a dashed tick
    var second = secondLimit(cur);
    if (second.p > cur.pSafe + 0.5 && second.p <= scaleMax) {
      var gs = xFor(second.p);
      ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(gs, gy - 12); ctx.lineTo(gs, gy + 12); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.fillText(second.word, gs, gy + 24); ctx.textAlign = "left";
    }

    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.fillText("no load", gx0, gy + 24);
    ctx.textAlign = "center"; ctx.fillText("carries", (gx0 + gh) / 2, gy - 13);
    ctx.fillText(cur.bindMode, gh, gy + 24);
    ctx.textAlign = "left";

    // needle at the current load
    var nX = xFor(state.load);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
  }

  // the second-nearest limit, to mark behind the binding one
  function secondLimit(cur) {
    var arr = [
      { p: cur.pWood, word: "timber" },
      { p: cur.pSteel, word: "steel" },
      { p: cur.pDefl, word: "sag" }
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

    var sagTarget = clamp(current.uDefl * 30, 0, 70);
    var ease = reduce ? 1 : Math.min(1, dt * 11);
    if (!initShown) { shown.t = state.t; shown.sag = sagTarget; shown.strain = current.strain; initShown = true; }
    shown.t += (state.t - shown.t) * ease;
    shown.sag += (sagTarget - shown.sag) * ease;
    shown.strain += (current.strain - shown.strain) * ease;

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
      var plate = state.t === 0 ? "no plate" : "a " + state.t.toFixed(1) + " millimetre plate";
      var head = "A " + r.b.timber + " with " + plate + ", loaded to " + state.load
        + " percent of what the bare timber could carry. ";
      var msg;
      if (verdict === "balanced") {
        msg = head + "Balanced — the wood at " + r.sigW.toFixed(1) + " of " + r.b.fw
          + " megapascals, the steel at " + Math.round(r.sigS) + " of " + r.b.fy
          + ", the sag " + r.delta.toFixed(1) + " of " + r.dLim.toFixed(1)
          + " millimetres. All three inside their limits on the thinnest plate that does it.";
      } else if (verdict === "overbuilt") {
        msg = head + "Over-plated — safe, but the stresses and sag sit well under every limit; "
          + "a thinner plate would carry this load. Steel is the heavy, dear part of the beam.";
      } else if (verdict === "sag") {
        msg = head + "Sagging — strong enough, nothing near breaking, but it bends "
          + r.delta.toFixed(1) + " millimetres, past the span-in-360 line of "
          + r.dLim.toFixed(1) + ". Thicken the plate to stiffen it.";
      } else {
        var who = r.bindMode === "steel" ? "the steel plate, past its yield"
          : "the timber, past its bending strength";
        msg = head + "Overstressed — " + who + " at this load. It would break in "
          + (r.bindMode === "steel" ? "the steel" : "the wood") + ". Thicken the plate, or ease the load.";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inW.addEventListener("input", function () { state.load = parseInt(inW.value, 10); update(); });
  inT.addEventListener("input", function () { state.t = parseFloat(inT.value); update(); });
  beamBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.beam = bn.dataset.beam; update(); });
  });

  $("find").addEventListener("click", function () {
    animatePlate(findFlitch(state));
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.load; inT.value = state.t;
    update();
  });

  // step the plate toward the target so it is seen to thicken — under reduced
  // motion it lands in one step
  function animatePlate(target) {
    if (reduce || Math.abs(target - state.t) < 0.26) { state.t = target; inT.value = target; update(); return; }
    var dir = target > state.t ? TSTEP : -TSTEP;
    (function step() {
      state.t = Math.round((state.t + dir) / TSTEP) * TSTEP;
      inT.value = state.t; update();
      if (Math.abs(state.t - target) > 0.26) setTimeout(step, 80);
    })();
  }

  // nudge a slider-backed value by a step, from the keyboard
  function nudge(field, delta, lo, hi, step, input) {
    state[field] = Math.round(clamp(state[field] + delta, lo, hi) / step) * step;
    input.value = state[field];
    update();
  }

  // keyboard: work the bench without reaching for the mouse
  var BEAM_KEYS = { "1": "pine", "2": "fir", "3": "oak", "4": "glulam" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "f" || k === "F") { $("find").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (BEAM_KEYS[k]) { state.beam = BEAM_KEYS[k]; update(); }
    else if (k === "[") { nudge("t", -TSTEP, 0, TMAX, TSTEP, inT); }       // thin the plate
    else if (k === "]") { nudge("t", TSTEP, 0, TMAX, TSTEP, inT); }        // thicken it
    else if (k === "-" || k === "_") { nudge("load", -4, 20, 160, 4, inW); } // ease the load
    else if (k === "=" || k === "+") { nudge("load", 4, 20, 160, 4, inW); }  // add load
    else return;
    e.preventDefault();
  });

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current, curVerdict); });
  }

  // ---- go --------------------------------------------------------------
  inW.value = state.load; inT.value = state.t;
  update();
})();
