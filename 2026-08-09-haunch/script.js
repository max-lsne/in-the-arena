/* Haunch — the bench.
 *
 * A masonry arch carries its load in pure compression, and the whole of that
 * compression, summed joint by joint, traces a single path down the ring: the
 * LINE OF THRUST. It is the funicular of the arch's own weight — a hanging chain
 * turned upside down. Heyman's safe theorem says the arch stands if and only if
 * *some* such line can be drawn entirely inside the stone, from crown to spring.
 *
 * We build one half of the arch as a fan of voussoirs at angle θ from the crown,
 * each carrying its own weight and the spandrel fill packed over the extrados.
 * For a trial horizontal thrust H (constant across the arch) and a crown height
 * y_c, the line of thrust crosses each joint at an eccentricity from the ring's
 * centreline of
 *
 *     e(θ) = M_c(θ) / N(θ)
 *
 * where N = √(H² + V²) is the compression at the joint, V is the weight gathered
 * from the crown down to θ, and M_c is the moment of all that load about the
 * joint's centre:
 *
 *     M_c(θ) = Σ dW·(x_i − x_θ)  −  H·(y_c − y_θ).
 *
 * The line is inside the stone where |e| ≤ t/2. Sweep H and y_c: the thinnest
 * ring that still admits a wholly-contained line is t_min, and the geometric
 * factor of safety is t / t_min — after Heyman, ~0.11·R for a bare half-round.
 * Left to itself an arch takes its LEAST thrust, and that line rides the extrados
 * hardest at the haunches — which is why an overloaded arch hinges on the flank,
 * not the crown. Spandrel fill over the haunch presses the line back into the
 * stone. Model units: half-span S = 1; thickness quoted as a fraction of the
 * radius R. Density of stone = 1, of fill = 0.9.
 */
(function () {
  "use strict";

  var N = 72;            // voussoirs per half-arch
  var S = 1;             // half-span, model units
  var GAMMA = 0.9;       // fill density relative to stone

  // rise slider 30..100 → rho = rise/half-span (1.0 = true half-round)
  // thickness slider 40..220 → t/R = 0.040..0.220
  // fill slider 0..100 → surface from springing (dry) up to crown level (packed)
  var DEFAULT = { rise: 100, t: 90, fill: 0, line: "min" };
  var KEY = "haunch.arch.v1";        // where the arch is kept between visits

  var state = load() || Object.assign({}, DEFAULT);

  // ---- persistence -------------------------------------------------------
  function clampInt(v, a, b) { v = parseInt(v, 10); if (!isFinite(v)) return a; return v < a ? a : v > b ? b : v; }
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (["min", "seat", "max"].indexOf(o.line) < 0) return null;
      return {
        rise: clampInt(o.rise, 30, 100),
        t: clampInt(o.t, 40, 220),
        fill: clampInt(o.fill, 0, 100),
        line: o.line
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- geometry + loads --------------------------------------------------
  function buildArch(s) {
    var rho = s.rise / 100;
    var tfrac = s.t / 1000;
    var f = s.fill / 100;
    var alpha = 2 * Math.atan(rho);
    var R = S / Math.sin(alpha);
    var t = tfrac * R;
    var dth = alpha / N;

    var sprExtY = R * (1 - Math.cos(alpha)) - (t / 2) * Math.cos(alpha);
    var crownExtY = -t / 2;
    var ySurf = sprExtY + f * (crownExtY - sprExtY);   // fill surface height

    var nodes = [];
    var Wc = 0, WXc = 0;
    for (var j = 0; j <= N; j++) {
      var th = j * dth;
      var x = R * Math.sin(th), y = R * (1 - Math.cos(th));
      var ox = Math.sin(th), oy = -Math.cos(th);       // outward radial unit
      var ds = R * dth;
      var dWself = t * ds;
      var extY = y - (t / 2) * Math.cos(th);
      var fillH = Math.max(0, extY - ySurf);
      var dxFill = Math.max(0, (R + t / 2) * Math.cos(th)) * dth;
      var dWfill = GAMMA * fillH * dxFill;
      var dW = dWself + dWfill;
      Wc += dW; WXc += dW * x;
      nodes.push({ th: th, x: x, y: y, ox: ox, oy: oy, dW: dW, Wc: Wc, WXc: WXc });
    }
    return { nodes: nodes, R: R, t: t, tfrac: tfrac, alpha: alpha, ySurf: ySurf,
             sprExtY: sprExtY, crownExtY: crownExtY, W: Wc, f: f };
  }

  // eccentricity profile for a trial (H, yc)
  function profile(arch, H, yc) {
    var nodes = arch.nodes, e = new Array(nodes.length);
    for (var j = 0; j < nodes.length; j++) {
      var nd = nodes[j];
      var V = nd.Wc, Nf = Math.hypot(H, V);
      var Mc = (nd.WXc - nd.x * nd.Wc) - H * (yc - nd.y);
      e[j] = Mc / Nf;
    }
    return e;
  }

  // for a fixed H, the yc that centres the line, and its worst |e|
  function bestYc(arch, H) {
    var t = arch.t, lo = -t * 0.9, hi = t * 0.9, best = { max: Infinity, yc: 0, e: null };
    for (var i = 0; i <= 48; i++) {
      var yc = lo + (hi - lo) * i / 48;
      var e = profile(arch, H, yc), mx = 0;
      for (var j = 0; j < e.length; j++) { var a = Math.abs(e[j]); if (a > mx) mx = a; }
      if (mx < best.max) best = { max: mx, yc: yc, e: e };
    }
    return best;
  }

  // sweep H: the best-centred line overall (→ t_min), and the admissible band
  function analyse(arch) {
    var half = arch.t / 2;
    var Hlo = 0.05 * arch.W, Hhi = 4 * arch.W, steps = 90;
    var best = { max: Infinity, H: 0, yc: 0, e: null };
    var Hmin = null, Hmax = null;
    for (var i = 0; i <= steps; i++) {
      var H = Hlo + (Hhi - Hlo) * i / steps;
      var b = bestYc(arch, H);
      if (b.max < best.max) best = { max: b.max, H: H, yc: b.yc, e: b.e };
      if (b.max <= half) { if (Hmin === null) Hmin = H; Hmax = H; }
    }
    return {
      tmin: 2 * best.max, best: best,
      Hmin: Hmin, Hmax: Hmax, stands: Hmin !== null
    };
  }

  // ---- the read ----------------------------------------------------------
  function compute(s) {
    var arch = buildArch(s);
    var a = analyse(arch);
    var half = arch.t / 2;
    var gsf = arch.t / a.tmin;

    // which line to draw
    var H, e, yc;
    if (a.stands) {
      if (s.line === "min") H = a.Hmin;
      else if (s.line === "max") H = a.Hmax;
      else H = a.best.H;
      var b = bestYc(arch, H);
      e = b.e; yc = b.yc;
    } else {
      // The ring is too thin to hold any line. Draw the least-overshoot line —
      // the minimum-thickness line — which touches the extrados over the crown,
      // the intrados at the haunches, and the springings all at once: the very
      // hinge set a thin arch folds on. It still passes outside the stone at the
      // flank, on the soffit, which is where the crack opens.
      H = a.best.H; e = a.best.e; yc = a.best.yc;
    }

    // Where the line runs closest to (or through) a face. Among the binding
    // points — which for a critical arch tie at crown, haunch and spring — take
    // the haunch, the load-sensitive flank hinge that gives way first in service.
    var biteJ = 0, biteAbs = -1;
    for (var j = 0; j < e.length; j++) {
      var av = Math.abs(e[j]); if (av > biteAbs) { biteAbs = av; biteJ = j; }
    }
    for (var jb = 0; jb < e.length; jb++) {
      var deg = arch.nodes[jb].th * 180 / Math.PI;
      if (deg >= 18 && deg <= 72 && Math.abs(e[jb]) >= biteAbs * 0.97) { biteJ = jb; biteAbs = Math.abs(e[jb]); break; }
    }
    var biteDeg = arch.nodes[biteJ].th * 180 / Math.PI;
    var biteFace = e[biteJ] >= 0 ? "back" : "belly";     // extrados / intrados
    var biteWhere = biteDeg < 18 ? "crown" : (biteDeg > 72 ? "spring" : "haunch");
    var margin = (half - biteAbs) / half;                // fraction of half-t left

    var verdict;
    if (!a.stands) verdict = "hinged";
    else if (gsf < 1.25) verdict = "edge";
    else if (gsf < 2) verdict = "stands";
    else verdict = "easy";

    return {
      arch: arch, e: e, H: H, yc: yc, W: arch.W,
      tmin: a.tmin, gsf: gsf, stands: a.stands,
      biteJ: biteJ, biteDeg: biteDeg, biteFace: biteFace, biteWhere: biteWhere,
      biteAbs: biteAbs, margin: margin, half: half
    };
  }

  // smallest fill that seats the line with a little room (for "pack")
  function packTarget(s) {
    for (var f = s.fill; f <= 100; f += 2) {
      var r = compute(Object.assign({}, s, { fill: f }));
      if (r.gsf >= 1.3) return f;
    }
    return 100;
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inRise = $("in-rise"), inT = $("in-t"), inFill = $("in-fill");
  var labRise = $("lab-rise"), labT = $("lab-t"), labFill = $("lab-fill");
  var lineBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-line]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function riseLabel(v) {
    if (v >= 99) return "half-round";
    if (v >= 80) return "tall segmental";
    if (v >= 55) return "segmental";
    return "shallow";
  }
  function fillLabel(v) {
    if (v <= 1) return "dry";
    if (v >= 99) return "packed to the crown";
    return v + "% packed";
  }

  function syncLabels() {
    labRise.textContent = riseLabel(state.rise);
    labT.textContent = (state.t / 1000).toFixed(3) + " R";
    labFill.textContent = fillLabel(state.fill);
    lineBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.line === state.line));
    });
  }

  var VERDICT = {
    hinged: { cls: "v-dead",  word: "Hinged",      note: "the line leaves the stone" },
    edge:   { cls: "v-drift", word: "On the edge",  note: "little left at the flank" },
    stands: { cls: "v-keep",  word: "Standing",    note: "the line sits in the stone" },
    easy:   { cls: "v-keep",  word: "Standing easy", note: "slack in every joint" }
  };

  function render(r) {
    var v = VERDICT[r.stands ? (r.gsf < 1.25 ? "edge" : (r.gsf < 2 ? "stands" : "easy")) : "hinged"];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var thrustStr = (r.H / r.W).toFixed(2) + '<span class="unit"> × weight</span>';
    var gsfCls = !r.stands ? "bad" : (r.gsf < 1.25 ? "warn" : "good");
    var gsfStr = r.gsf.toFixed(2) + '<span class="unit"> ×</span>';
    var tminStr = (r.tmin / r.arch.R).toFixed(3) + '<span class="unit"> R</span>';

    var biteCls, biteStr;
    if (!r.stands) {
      biteCls = "bad";
      biteStr = "through the " + r.biteFace + '<span class="unit"> · ' + Math.round(r.biteDeg) + "° · the " + r.biteWhere + "</span>";
    } else {
      biteCls = r.margin < 0.15 ? "warn" : "good";
      biteStr = Math.round(r.margin * 100) + '% left<span class="unit"> · ' + Math.round(r.biteDeg) + "° · the " + r.biteWhere + "</span>";
    }

    var rows = [
      ["Horizontal thrust", thrustStr, ""],
      ["Safety factor", gsfStr, gsfCls],
      ["Thinnest ring that holds", tminStr, ""],
      ["Line closest to the edge", biteStr, biteCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas elevation) --------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 560, H = 470, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var cssVar = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
  function withA(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  var ARCH_TOP = 20, ARCH_BOT = 340, LAD_TOP = 372, LAD_BOT = 452, PADX = 40;

  function draw(r) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), stone: cssVar("--stone"), stone2: cssVar("--stone-2"),
      thrust: cssVar("--thrust"), fill: cssVar("--fill"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"),
      field: cssVar("--field"), field2: cssVar("--field-2")
    };
    var accent = !r.stands ? col.dead : (r.gsf < 1.25 ? col.drift : col.keep);
    ctx.clearRect(0, 0, W, H);

    var arch = r.arch, nodes = arch.nodes, t = arch.t;

    // model bounding box of the full arch + abutments
    var xExt = (arch.R + t / 2) * Math.sin(arch.alpha);
    var yTop = arch.crownExtY;
    var yBot = arch.sprExtY + 0.30;                 // include abutment
    var bw = 2 * xExt, bh = yBot - yTop;
    var sc = Math.min((W - 2 * PADX) / bw, (ARCH_BOT - ARCH_TOP) / bh);
    var ox0 = W / 2, oy0 = ARCH_TOP - yTop * sc;
    var MX = function (x) { return ox0 + x * sc; };
    var MY = function (y) { return oy0 + y * sc; };

    // ground line
    var groundY = MY(arch.sprExtY + 0.02);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
    // ground hatch
    ctx.strokeStyle = withA(col.stone2, 0.5); ctx.lineWidth = 1;
    for (var gx = 8; gx < W; gx += 16) {
      ctx.beginPath(); ctx.moveTo(gx, groundY); ctx.lineTo(gx - 7, groundY + 8); ctx.stroke();
    }

    // build extrados / intrados / centreline point arrays for the right half
    function pt(nd, off) { return { x: nd.x + nd.ox * off, y: nd.y + nd.oy * off }; }
    var ext = [], intr = [], cen = [];
    for (var j = 0; j <= N; j++) {
      ext.push(pt(nodes[j], t / 2));
      intr.push(pt(nodes[j], -t / 2));
      cen.push({ x: nodes[j].x, y: nodes[j].y });
    }

    // ---- abutments (both springings) ----
    var spE = ext[N], spI = intr[N];
    [1, -1].forEach(function (sgn) {
      ctx.fillStyle = withA(col.stone2, 0.55);
      ctx.strokeStyle = col.stone2; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MX(sgn * spI.x), MY(spI.y));
      ctx.lineTo(MX(sgn * spE.x), MY(spE.y));
      ctx.lineTo(MX(sgn * (spE.x + 0.10)), MY(yBot));
      ctx.lineTo(MX(sgn * (spI.x - 0.02)), MY(yBot));
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });

    // ---- spandrel fill over the haunches ----
    if (arch.f > 0.001) {
      [1, -1].forEach(function (sgn) {
        ctx.beginPath();
        // along extrados from crown down to springing
        for (var k = 0; k <= N; k++) ctx.lineTo(MX(sgn * ext[k].x), MY(ext[k].y));
        // back across the fill surface to the crown
        ctx.lineTo(MX(sgn * spE.x), MY(arch.ySurf));
        ctx.lineTo(MX(0), MY(arch.ySurf));
        ctx.closePath();
        ctx.fillStyle = withA(col.fill, 0.16 + 0.30 * arch.f);
        ctx.fill();
      });
      // fill surface line
      ctx.strokeStyle = withA(col.fill, 0.7); ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(MX(-spE.x), MY(arch.ySurf)); ctx.lineTo(MX(spE.x), MY(arch.ySurf));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // ---- the stone ring (both halves) ----
    function ringPath(sgn) {
      ctx.beginPath();
      for (var k = 0; k <= N; k++) ctx.lineTo(MX(sgn * ext[k].x), MY(ext[k].y));
      for (var m = N; m >= 0; m--) ctx.lineTo(MX(sgn * intr[m].x), MY(intr[m].y));
      ctx.closePath();
    }
    [1, -1].forEach(function (sgn) {
      ringPath(sgn);
      ctx.fillStyle = withA(col.stone, 0.55); ctx.fill();
      ctx.strokeStyle = col.stone2; ctx.lineWidth = 1.4; ctx.stroke();
    });
    // voussoir joints every few nodes
    ctx.strokeStyle = withA(col.stone2, 0.75); ctx.lineWidth = 1;
    for (var jj = 0; jj <= N; jj += 6) {
      [1, -1].forEach(function (sgn) {
        ctx.beginPath();
        ctx.moveTo(MX(sgn * ext[jj].x), MY(ext[jj].y));
        ctx.lineTo(MX(sgn * intr[jj].x), MY(intr[jj].y));
        ctx.stroke();
      });
    }
    // keystone joint highlight at the crown
    ctx.strokeStyle = withA(col.stone2, 0.9); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(MX(0), MY(ext[0].y)); ctx.lineTo(MX(0), MY(intr[0].y)); ctx.stroke();

    // ---- the line of thrust ----
    var e = r.e;
    function thrustPt(j, sgn) {
      var nd = nodes[j];
      return { x: sgn * (nd.x + nd.ox * e[j]), y: nd.y + nd.oy * e[j] };
    }
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = accent;
    ctx.beginPath();
    for (var L = N; L >= 0; L--) { var p = thrustPt(L, -1); ctx.lineTo(MX(p.x), MY(p.y)); }
    for (var Rr = 0; Rr <= N; Rr++) { var q = thrustPt(Rr, 1); ctx.lineTo(MX(q.x), MY(q.y)); }
    ctx.stroke();

    // hinge markers where the line reaches / crosses a face
    var half = t / 2;
    for (var h = 0; h <= N; h++) {
      if (Math.abs(e[h]) >= half * 0.985) {
        [1, -1].forEach(function (sgn) {
          var pp = thrustPt(h, sgn);
          ctx.fillStyle = col.dead;
          ctx.beginPath(); ctx.arc(MX(pp.x), MY(pp.y), 4.2, 0, 2 * Math.PI); ctx.fill();
          ctx.strokeStyle = col.field; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(MX(pp.x), MY(pp.y), 4.2, 0, 2 * Math.PI); ctx.stroke();
        });
      }
    }
    // crown thrust point
    var cp = thrustPt(0, 1);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 3, 0, 2 * Math.PI); ctx.fill();

    // labels
    ctx.font = "11px ui-monospace, monospace"; ctx.fillStyle = col.faint; ctx.textAlign = "center";
    ctx.fillText("line of thrust", MX(0), MY(intr[0].y) + 20);

    // ---- the eccentricity ladder ----
    drawLadder(col, accent, r);
  }

  function drawLadder(col, accent, r) {
    var e = r.e, half = r.arch.t / 2;
    var x0 = PADX, x1 = W - PADX, midY = (LAD_TOP + LAD_BOT) / 2, hh = (LAD_BOT - LAD_TOP) / 2 - 6;
    var xFor = function (j) { return x0 + (x1 - x0) * j / N; };
    var yFor = function (ev) { return midY - clamp(ev / half, -1.4, 1.4) * hh; };

    // walls (back / belly of the stone)
    ctx.strokeStyle = withA(col.dead, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0, yFor(half)); ctx.lineTo(x1, yFor(half)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, yFor(-half)); ctx.lineTo(x1, yFor(-half)); ctx.stroke();
    // centreline
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke(); ctx.setLineDash([]);

    // labels
    ctx.font = "9px ui-monospace, monospace"; ctx.fillStyle = col.faint;
    ctx.textAlign = "left"; ctx.fillText("back of stone (extrados)", x0, yFor(half) - 5);
    ctx.fillText("belly (intrados)", x0, yFor(-half) - 5);
    ctx.textAlign = "left"; ctx.fillText("crown", x0, LAD_BOT + 12);
    ctx.textAlign = "center"; ctx.fillText("haunch", (x0 + x1) / 2, LAD_BOT + 12);
    ctx.textAlign = "right"; ctx.fillText("spring", x1, LAD_BOT + 12);

    // the unrolled line of thrust
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.textAlign = "left";
    ctx.beginPath();
    for (var j = 0; j <= N; j++) { var X = xFor(j), Y = yFor(e[j]); if (j === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
    ctx.stroke();

    // mark the bite
    var bx = xFor(r.biteJ), by = yFor(e[r.biteJ]);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(bx, by, 3.4, 0, 2 * Math.PI); ctx.fill();
  }

  // ---- wiring ------------------------------------------------------------
  var current = null;
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
    draw(current);
    announce(current);
    save();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var LINE_WORD = { min: "least thrust", seat: "the seated line", max: "most thrust" };
  var sayTimer = null;
  function announce(r) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = riseLabel(state.rise) + " arch, ring " + (state.t / 1000).toFixed(3)
        + " of the radius, haunches " + fillLabel(state.fill) + ", " + LINE_WORD[state.line] + ". ";
      var deg = Math.round(r.biteDeg), gsf = r.gsf.toFixed(2);
      var msg;
      if (!r.stands) {
        msg = head + "Hinged — the line leaves the stone through the " + r.biteFace
          + " at the " + r.biteWhere + ", " + deg + " degrees from the crown. "
          + "Factor of safety " + gsf + ", below one. Pack the haunches or thicken the ring.";
      } else {
        var room = Math.round(r.margin * 100);
        msg = head + (r.gsf >= 2 ? "Standing easy" : "Standing") + " — the line is contained, closest to the "
          + r.biteFace + " at the " + r.biteWhere + " with " + room + " percent of the half-thickness to spare. "
          + "Factor of safety " + gsf + ".";
      }
      sayEl.textContent = msg;
    }, 280);
  }

  inRise.addEventListener("input", function () { state.rise = parseInt(inRise.value, 10); update(); });
  inT.addEventListener("input", function () { state.t = parseInt(inT.value, 10); update(); });
  inFill.addEventListener("input", function () { state.fill = parseInt(inFill.value, 10); update(); });
  lineBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.line = b.dataset.line; update(); });
  });

  // animate the fill up to the packing target
  function animateFill(target) {
    var start = state.fill, t0 = null, dur = 560;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eo = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      state.fill = Math.round(start + (target - start) * eo);
      inFill.value = state.fill; update();
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  $("pack").addEventListener("click", function () { animateFill(packTarget(state)); });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inRise.value = state.rise; inT.value = state.t; inFill.value = state.fill;
    update();
  });

  // repaint on theme flips so the canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (current) draw(current);
    });
  }

  // ---- go ----------------------------------------------------------------
  inRise.value = state.rise; inT.value = state.t; inFill.value = state.fill;
  update();
})();
