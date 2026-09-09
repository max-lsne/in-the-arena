/* Scarf — the bench.
 *
 * A member of cross-section A under an axial pull F carries a stress σ = F/A.
 * Cut a scarf at a slope 1:N — one across the thickness for N along the length —
 * and let φ be the angle the cut makes with the axis, tanφ = 1/N. Resolving the
 * uniaxial stress onto that slanted face gives, cleanly,
 *
 *   face area   A_face = A / sinφ = A·√(1 + N²)
 *   shear       τ   = σ·sinφ·cosφ = ½σ·sin2φ        [slides the faces]
 *   peel        σ_n = σ·sin²φ                        [pries them apart]
 *
 * with sin²φ = 1/(1+N²) and sinφ·cosφ = N/(1+N²). Steepen to a butt (φ = 90°,
 * N = 0) and it all lands as pure tension, σ_n = σ, τ = 0 — the low failure glue
 * gives almost for free. Shallow it and the peel dies as sin²φ while the shear
 * falls too, both divided over an ever-larger face.
 *
 * The joint reaches the timber's own strength when the glue outlasts the wood —
 * when, at the stress that fails clear timber, the shear is still under the
 * glue's shear allowable and the peel under its tensile one:
 *
 *   σ_wood·N/(1+N²) ≤ τ_glue   and   σ_wood/(1+N²) ≤ σ_glue
 *
 * The steepest — shortest — scarf that clears both is the one the trades cut,
 * and for real wood and glue it lands between 1:8 and 1:12. The four joints are
 * stylised — plausible timber and glue strengths, not measured — but the
 * mechanics drawn from them are exact. SI throughout; MPa, kN and millimetres
 * only at the surface, for the reader.
 */
(function () {
  "use strict";

  var MPA = 1e6;   // MPa → Pa
  var MM2 = 1e-6;  // mm² → m²

  // Each joint pairs a timber with a glue. σ_wood is the timber's tensile
  // strength along the grain; τ_glue and σ_glue the glue line's shear and
  // tensile (peel) strengths; t and w the stock thickness and width, in mm.
  // Stylised — plausible, not measured.
  var JOINTS = {
    pine:  { label: "pine · PVA",   wood: 40,  shear: 8,  peel: 4,  t: 18, w: 40, timber: "knotty pine",  glue: "PVA" },
    fir:   { label: "fir · epoxy",  wood: 85,  shear: 12, peel: 20, t: 12, w: 90, timber: "Douglas fir",  glue: "epoxy" },
    oak:   { label: "oak · hide",   wood: 90,  shear: 10, peel: 5,  t: 20, w: 60, timber: "white oak",    glue: "hide glue" },
    maple: { label: "maple · PU",   wood: 108, shear: 9,  peel: 6,  t: 25, w: 35, timber: "hard maple",   glue: "polyurethane" }
  };

  // Opens on a fir plank cut too steep — a 1:2 scarf — and pulled hard, the
  // glue already shorn. Find the scarf on arrival.
  var DEFAULT = { joint: "fir", pull: 76, N: 2 };

  var state = Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rad(d) { return d * Math.PI / 180; }

  // ---- the resolution -------------------------------------------------
  // Everything the joint does, from the slope N and the pull as a fraction of
  // what the solid timber could take.
  function compute(s) {
    var j = JOINTS[s.joint];
    var A = j.t * j.w * MM2;                       // m²
    var F_wood = j.wood * MPA * A;                 // N — the timber's own strength
    var F = s.pull / 100 * F_wood;                 // N
    var sigma = F / A / MPA;                       // MPa, = pull% · σ_wood/100

    var N = s.N;
    var s2 = 1 / (1 + N * N);                      // sin²φ
    var sc = N / (1 + N * N);                      // sinφ·cosφ
    var faceMult = Math.sqrt(1 + N * N);           // A_face / A

    var tau = sigma * sc;                          // MPa, shear on the face
    var sigN = sigma * s2;                         // MPa, peel across the face

    // pull % (share of timber strength) at which each thing fails
    var pShear = sc > 1e-9 ? (j.shear / sc) / j.wood * 100 : Infinity;
    var pPeel = (j.peel / s2) / j.wood * 100;
    var pGlue = Math.min(pShear, pPeel);           // glue lets go here
    var pTimber = 100;                             // clear timber gives here
    var pFail = Math.min(pGlue, pTimber);          // the joint actually breaks here

    // which happens first as the load climbs
    var firstMode = pGlue >= pTimber ? "timber" : (pShear <= pPeel ? "shear" : "peel");
    var broken = s.pull >= pFail - 1e-9;

    var verdict;
    if (broken) verdict = firstMode === "timber" ? "wood" : firstMode === "shear" ? "shorn" : "peeled";
    else verdict = pGlue >= pTimber ? "strong" : "limited";

    return {
      j: j, A: A, F: F, F_wood: F_wood, sigma: sigma, N: N,
      faceMult: faceMult, faceCm2: A * faceMult * 1e4,
      tau: tau, sigN: sigN,
      uShear: j.shear > 0 ? tau / j.shear : 0,
      uPeel: j.peel > 0 ? sigN / j.peel : 0,
      uWood: s.pull / 100,
      pShear: pShear, pPeel: pPeel, pGlue: pGlue, pFail: pFail,
      F_fail: pFail / 100 * F_wood,
      firstMode: firstMode, broken: broken, verdict: verdict
    };
  }

  // the shortest scarf that develops the timber's full strength — the steepest
  // slope on the grid at which the glue still outlasts the wood
  function findScarf(s) {
    var best = null;
    for (var n = 0.5; n <= 12.0001; n += 0.5) {
      var r = compute(Object.assign({}, s, { N: n }));
      if (r.pGlue >= 100) { best = n; break; }
    }
    if (best !== null) return best;
    // none makes full strength — take the strongest glue line we can
    var bestN = 0.5, bestP = -1;
    for (var m = 0.5; m <= 12.0001; m += 0.5) {
      var rr = compute(Object.assign({}, s, { N: m }));
      if (rr.pGlue > bestP) { bestP = rr.pGlue; bestN = m; }
    }
    return bestN;
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inP = $("in-P"), inN = $("in-N");
  var labP = $("lab-P"), labN = $("lab-N");
  var jointBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-joint]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");
  var nMark = $("n-mark"), nNote = $("n-note");

  function fmtN(n) { return n === 0 ? "butt joint" : "1 : " + (Number.isInteger(n) ? n : n.toFixed(1)); }

  function syncLabels(r) {
    labP.textContent = state.pull + "% · " + Math.round(r.F / 1000) + " kN";
    labN.textContent = fmtN(state.N);
    jointBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.joint === state.joint));
    });
  }

  var VERDICT_TEXT = {
    strong:  { cls: "v-keep",  word: "Timber-strong", note: "glue outlasts the wood" },
    limited: { cls: "v-drift", word: "Glue-limited",  note: "the glue is the weak link" },
    peeled:  { cls: "v-dead",  word: "Peeled",        note: "faces pried apart" },
    shorn:   { cls: "v-dead",  word: "Shorn",         note: "faces slid — sheared off" },
    wood:    { cls: "v-keep",  word: "Timber gave",   note: "full strength — broke in clear wood" }
  };

  function uClass(u) { return u >= 1 ? "bad" : u >= 0.75 ? "warn" : "good"; }

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var scarfVal = state.N === 0
      ? "butt · " + Math.round(r.faceCm2) + " cm²"
      : "1:" + (Number.isInteger(state.N) ? state.N : state.N.toFixed(1))
        + '<span class="unit"> · ' + Math.round(state.N * r.j.t) + " mm lap</span>";

    var mode = r.verdict === "strong" || r.verdict === "wood" ? "timber"
      : r.firstMode === "shear" ? "shear" : "peel";
    var failCls = (r.verdict === "strong" || r.verdict === "wood") ? "good" : (r.broken ? "bad" : "warn");

    var rows = [
      ["Scarf", scarfVal, ""],
      ["Glue shear", r.tau.toFixed(1) + '<span class="unit"> / ' + r.j.shear + " MPa</span>", uClass(r.uShear)],
      ["Glue peel", r.sigN.toFixed(1) + '<span class="unit"> / ' + r.j.peel + " MPa</span>", uClass(r.uPeel)],
      ["Breaks at", Math.round(r.F_fail / 1000) + '<span class="unit"> kN · ' + mode + "</span>", failCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markScarf(r);
  }

  // mark, under the scarf slider, the shortest scarf that makes full strength
  function markScarf(r) {
    if (!nMark || !nNote) return;
    var best = findScarf(state);
    nMark.style.left = (best / 12 * 100) + "%";
    nMark.className = "x-mark";
    if (Math.abs(best - state.N) < 0.26) nNote.innerHTML = "full strength at <b>" + fmtN(best) + "</b>";
    else nNote.innerHTML = "timber-strong from <b>" + fmtN(best) + "</b>";
  }

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 520, H = 420, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

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

  // bar geometry, canvas space
  var CY = 150, BAR_T = 96, BAR_X0 = 54, BAR_X1 = 466, MIDX = 260;
  var RUN_PX = 26;                  // px of scarf run per unit of N (schematic)

  // eased display state, so a change reads as the taper opening or the pull
  // growing, not as a jump
  var shown = { N: 0, pull: 0, part: 0 };
  var lastTs = null, initShown = false;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"), timberB: cssVar("--timber-b"),
      glue: cssVar("--glue"), pull: cssVar("--pull"), pull2: cssVar("--pull-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = cur.verdict === "strong" || cur.verdict === "wood" ? col.keep
      : cur.verdict === "limited" ? col.drift : col.dead;

    ctx.clearRect(0, 0, W, H);

    var top = CY - BAR_T / 2, bot = CY + BAR_T / 2;
    var half = clamp(shown.N * RUN_PX, 0, 300) / 2;
    var Ax = MIDX - half, Bx = MIDX + half;         // diagonal top / bottom x
    var A = { x: Ax, y: top }, B = { x: Bx, y: bot };

    // face unit vectors
    var fdx = B.x - A.x, fdy = B.y - A.y, flen = Math.hypot(fdx, fdy) || 1;
    var ux = fdx / flen, uy = fdy / flen;           // along the face (A→B)
    var nx = -uy, ny = ux;                           // across the face

    // failure separation: shear slides along the face, peel opens across it
    var part = shown.part;
    var sep = { x: 0, y: 0 };
    if (part > 0) {
      var amp = 20 * part;
      if (cur.verdict === "shorn") { sep.x = ux * amp; sep.y = uy * amp; }
      else if (cur.verdict === "peeled") { sep.x = nx * amp; sep.y = ny * amp; }
    }

    // ---- the two lapped pieces ----
    // left (near) piece: full height at x0, cut away along the diagonal on top
    var left = [ [BAR_X0, top], [A.x, A.y], [B.x, B.y], [BAR_X0, bot] ];
    // right (far) piece: full height at x1, the upper wedge across the lap
    var right = [ [A.x, A.y], [BAR_X1, top], [BAR_X1, bot], [B.x, B.y] ];

    drawPiece(left, col.timber, col.timber2, 0, 0);
    drawPiece(right, col.timberB, col.timber2, sep.x, sep.y);

    // ---- the glue line ----
    ctx.strokeStyle = accent; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    if (part > 0.02) {
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(A.x + sep.x, A.y + sep.y); ctx.lineTo(B.x + sep.x, B.y + sep.y); ctx.stroke();
    }

    // ---- the pull, at each end ----
    var force = clamp(shown.pull * 0.7, 12, 92);
    var py = CY;
    arrow(ctx, col.pull, BAR_X0 - 6, py, BAR_X0 - 6 - force, py, 2.6, 9);   // ← left
    arrow(ctx, col.pull, BAR_X1 + 6 + sep.x, py, BAR_X1 + 6 + sep.x + force, py, 2.6, 9); // → right
    label(ctx, col.pull, "pull", BAR_X0 - 6 - force, py - 10, "left");
    label(ctx, col.pull, Math.round(cur.F / 1000) + " kN", BAR_X1 + 10, py - 10, "left");

    // ---- resolved stresses on the face ----
    if (shown.N > 0.01 && part < 0.5) {
      var M = { x: (A.x + B.x) / 2 + sep.x * 0.5, y: (A.y + B.y) / 2 + sep.y * 0.5 };
      var shearCol = cur.uShear >= 1 ? col.dead : cur.uShear >= 0.75 ? col.drift : col.keep;
      var peelCol = cur.uPeel >= 1 ? col.dead : cur.uPeel >= 0.75 ? col.drift : col.keep;
      var sLen = clamp(cur.tau * 0.72, 0, 58);
      var pLen = clamp(cur.sigN * 0.72, 0, 58);
      // shear — a double arrow along the face
      arrow(ctx, shearCol, M.x, M.y, M.x + ux * sLen, M.y + uy * sLen, 2.2, 7);
      arrow(ctx, shearCol, M.x, M.y, M.x - ux * sLen, M.y - uy * sLen, 2.2, 7);
      // peel — a double arrow across the face
      arrow(ctx, peelCol, M.x, M.y, M.x + nx * pLen, M.y + ny * pLen, 2.2, 7);
      arrow(ctx, peelCol, M.x, M.y, M.x - nx * pLen, M.y - ny * pLen, 2.2, 7);
      // labels pushed clear of the face so they never crowd each other
      var sOff = Math.max(sLen, 20) + 12, pOff = Math.max(pLen, 20) + 12;
      label(ctx, shearCol, "shear τ", M.x + ux * sOff, M.y + uy * sOff + 3, "center");
      label(ctx, peelCol, "peel", M.x + nx * pOff, M.y + ny * pOff + 3, "center");
    } else if (shown.N <= 0.01) {
      // butt joint: pure tension across the face
      var Mb = { x: MIDX, y: CY };
      var pc = cur.uPeel >= 1 ? col.dead : cur.uPeel >= 0.75 ? col.drift : col.keep;
      var pl = clamp(cur.sigN * 0.5, 0, 46);
      arrow(ctx, pc, Mb.x - 2, Mb.y, Mb.x - 2 - pl, Mb.y, 2.2, 7);
      arrow(ctx, pc, Mb.x + 2 + sep.x, Mb.y, Mb.x + 2 + sep.x + pl, Mb.y, 2.2, 7);
      label(ctx, pc, "pure tension", MIDX, top - 10, "center");
    }

    // scarf label above the joint
    label(ctx, col.faint, fmtN(state.N), MIDX, top - 26, "center");

    drawGauge(col, accent, cur);
  }

  // fill a timber piece, with a few grain lines, clipped to its polygon
  function drawPiece(pts, fill, edge, ox, oy) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = withAlpha(fill, 0.9); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = withAlpha(edge, 0.28); ctx.lineWidth = 1;
    for (var g = -3; g <= 3; g++) {
      var y = CY + g * (BAR_T / 8);
      ctx.beginPath(); ctx.moveTo(BAR_X0 - 20, y); ctx.lineTo(BAR_X1 + 20, y); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }

  function drawGauge(col, accent, cur) {
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(28, 344, W - 56, 58, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 64, gx1 = 456, gy = 380, scaleMax = 130;
    var xFor = function (p) { return gx0 + clamp(p, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // green band the joint holds
    var gh = xFor(cur.pFail);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gh - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gh - gx0, 16);

    // strength forfeited when the glue gives before the timber
    var gt = xFor(100);
    if (cur.pFail < 99.5) {
      ctx.fillStyle = withAlpha(col.drift, 0.14);
      ctx.fillRect(gh, gy - 8, gt - gh, 16);
    }

    // timber ceiling tick
    ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(gt, gy - 13); ctx.lineTo(gt, gy + 13); ctx.stroke();
    ctx.setLineDash([]);

    // break wall
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gh, gy - 12); ctx.lineTo(gh, gy + 12); ctx.stroke();

    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.fillText("no load", gx0, gy + 24);
    ctx.textAlign = "center"; ctx.fillText("holds", (gx0 + gh) / 2, gy - 13);
    ctx.textAlign = "center"; ctx.fillText("timber", gt, gy + 24);
    ctx.textAlign = "left";

    // needle at the current pull
    var nX = xFor(state.pull);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
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
  }
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    var tgt = { N: current.N, pull: state.pull, part: current.broken ? 1 : 0 };
    var ease = reduce ? 1 : Math.min(1, dt * 11);
    if (!initShown) { shown.N = current.N; shown.pull = state.pull; shown.part = tgt.part; initShown = true; }
    shown.N += (current.N - shown.N) * ease;
    shown.pull += (state.pull - shown.pull) * ease;
    shown.part += (tgt.part - shown.part) * ease;

    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels(current);
    render(current);
  }

  inP.addEventListener("input", function () { state.pull = parseInt(inP.value, 10); update(); });
  inN.addEventListener("input", function () { state.N = parseFloat(inN.value); update(); });
  jointBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.joint = b.dataset.joint; update(); });
  });

  $("find").addEventListener("click", function () {
    animateScarf(findScarf(state));
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inP.value = state.pull; inN.value = state.N;
    update();
  });

  // step the scarf toward the target so the taper is seen to shallow out — under
  // reduced motion it lands in one step
  function animateScarf(target) {
    if (reduce || Math.abs(target - state.N) < 0.26) { state.N = target; inN.value = target; update(); return; }
    var dir = target > state.N ? 0.5 : -0.5;
    (function step() {
      state.N = Math.round((state.N + dir) * 2) / 2;
      inN.value = state.N; update();
      if (Math.abs(state.N - target) > 0.26) setTimeout(step, 90);
    })();
  }

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // ---- go --------------------------------------------------------------
  inP.value = state.pull; inN.value = state.N;
  update();
})();
