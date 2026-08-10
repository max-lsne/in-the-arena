/* Snub — the bench.
 *
 * A rope wrapped round a post holds by BELT FRICTION. Over a small slice of the
 * wrap the rope presses inward on the post in proportion to the tension it
 * carries, and friction on that slice can hold back a fixed FRACTION of that
 * tension. Integrate the same fractional loss around the whole wrap and the two
 * ends stand in the ratio of the CAPSTAN EQUATION:
 *
 *     T_load = T_hand · e^(μθ)
 *
 * where θ is the total wrap angle (radians) and μ the rope-on-post friction.
 * The rope's diameter and the post's diameter cancel out entirely — only the
 * angle turned and the grip remain. Euler wrote it; every deckhand knew it.
 *
 * We take a load L on the standing part and a hand H on the tail. The wrap can
 * supply a holding ratio ρ = e^(μθ). The line holds statically while
 * H ≥ L·e^(−μθ), i.e. while L ≤ H·ρ. Otherwise it RENDERS — the load overhauls
 * the hand and the rope runs round the post. The turns needed to bring a load
 * down to a given hand are n = ln(L/H) / (2π·μ). Loads are quoted as weight
 * (kgf → tonnes); μ runs from a greased sheave to tarred hemp on rough oak.
 */
(function () {
  "use strict";

  var TAU = 2 * Math.PI;
  var LOAD_LO = 50, LOAD_HI = 30000;     // kgf: slider 0..100 maps log-uniform
  var HAND = { finger: 2, hand: 12, heave: 35 };   // kgf a tail can supply

  // load slider 0..100 → kgf (log), mu slider 10..60 → μ = /100,
  // turns slider 25..500 → n turns = /100
  var DEFAULT = { load: 58, mu: 25, turns: 100, hand: "hand" };

  var state = Object.assign({}, DEFAULT);

  // ---- model helpers -----------------------------------------------------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function loadKgf(s) { return LOAD_LO * Math.pow(LOAD_HI / LOAD_LO, s.load / 100); }
  function mu(s) { return s.mu / 100; }
  function turns(s) { return s.turns / 100; }
  function theta(s) { return TAU * turns(s); }

  // ---- the read ----------------------------------------------------------
  function compute(s) {
    var L = loadKgf(s), m = mu(s), th = theta(s), H = HAND[s.hand];
    var rho = Math.exp(m * th);            // holding power the wrap supplies
    var Lmax = H * rho;                    // most this hand holds at this wrap
    var Hneed = L / rho;                   // hand this load demands on the tail
    var ratio = Hneed / H;                 // ≤1 holds, >1 renders
    var holds = ratio <= 1 + 1e-9;

    // turns to bring this load down to the chosen hand (0 if already ≤ hand)
    var nNeed = L > H ? Math.log(L / H) / (TAU * m) : 0;

    // could the least hand (a finger) hold it, with a little room?
    var fingerMax = HAND.finger * rho;

    var verdict;
    if (!holds) verdict = "render";
    else if (ratio > 0.85) verdict = "verge";
    else if (L <= fingerMax * 0.85) verdict = "finger";
    else verdict = "hand";

    return {
      L: L, m: m, th: th, H: H, rho: rho, Lmax: Lmax, Hneed: Hneed,
      ratio: ratio, holds: holds, nNeed: nNeed, verdict: verdict
    };
  }

  // smallest turns that brings the line to a comfortable hold (for "take up")
  function takeTarget(s) {
    for (var tv = s.turns; tv <= 500; tv += 5) {
      var r = compute(Object.assign({}, s, { turns: tv }));
      if (r.holds && r.ratio <= 0.7) return tv;
    }
    return 500;
  }

  // ---- formatting --------------------------------------------------------
  function fmtWeight(kgf) {
    if (kgf >= 1000) return (kgf / 1000).toFixed(kgf < 10000 ? 2 : 1) + '<span class="unit"> t</span>';
    if (kgf >= 100) return Math.round(kgf) + '<span class="unit"> kgf</span>';
    return kgf.toFixed(kgf < 10 ? 1 : 0) + '<span class="unit"> kgf</span>';
  }
  function fmtWeightPlain(kgf) {
    if (kgf >= 1000) return (kgf / 1000).toFixed(kgf < 10000 ? 2 : 1) + " tonnes";
    return Math.round(kgf) + " kilos";
  }
  function fmtRatio(rho) {
    if (rho >= 100) return "×" + Math.round(rho);
    if (rho >= 10) return "×" + rho.toFixed(0);
    return "×" + rho.toFixed(1);
  }
  function turnsWord(n) {
    var whole = Math.floor(n + 1e-6);
    var frac = n - whole;
    var q = "";
    if (frac >= 0.125 && frac < 0.375) q = "¼";
    else if (frac >= 0.375 && frac < 0.625) q = "½";
    else if (frac >= 0.625 && frac < 0.875) q = "¾";
    else if (frac >= 0.875) { whole += 1; }
    var body = whole + (q ? " " + q : "");
    if (whole === 0 && q) body = q;
    return body + (whole === 1 && !q ? " turn" : " turns");
  }
  function muLabel(m) {
    if (m <= 0.12) return "greased sheave · " + m.toFixed(2);
    if (m <= 0.18) return "wet steel · " + m.toFixed(2);
    if (m <= 0.24) return "dry steel · " + m.toFixed(2);
    if (m <= 0.33) return "oak bitt · " + m.toFixed(2);
    if (m <= 0.45) return "rough timber · " + m.toFixed(2);
    return "tarred hemp on oak · " + m.toFixed(2);
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inLoad = $("in-load"), inMu = $("in-mu"), inTurns = $("in-turns");
  var labLoad = $("lab-load"), labMu = $("lab-mu"), labTurns = $("lab-turns");
  var handBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-hand]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");

  function syncLabels(r) {
    labLoad.textContent = fmtWeightPlain(r.L);
    labMu.textContent = muLabel(r.m);
    labTurns.textContent = turnsWord(turns(state));
    handBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.hand === state.hand));
    });
  }

  var VERDICT = {
    render: { cls: "v-dead",  word: "Rendered",       note: "the line runs round the post" },
    verge:  { cls: "v-drift", word: "On the verge",   note: "nothing left in the hand" },
    hand:   { cls: "v-keep",  word: "Held",           note: "a hand takes the strain" },
    finger: { cls: "v-keep",  word: "Held on a finger", note: "the load is in the post" }
  };

  function render(r) {
    var v = VERDICT[r.verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var powStr = fmtRatio(r.rho) + '<span class="unit"> your hand</span>';
    var lmaxCls = !r.holds ? "bad" : (r.ratio > 0.85 ? "warn" : "good");
    var lmaxStr = fmtWeight(r.Lmax);
    var needCls = r.Hneed <= r.H + 1e-9 ? "good" : "bad";
    var needStr = fmtWeight(r.Hneed);

    var turnStr, turnCls;
    if (r.nNeed <= turns(state) + 1e-6) { turnStr = "held<span class=\"unit\"> · " + turnsWord(turns(state)) + " on</span>"; turnCls = "good"; }
    else { turnStr = turnsWord(r.nNeed) + "<span class=\"unit\"> · " + turnsWord(turns(state)) + " on</span>"; turnCls = r.nNeed - turns(state) > 1 ? "bad" : "warn"; }

    var rows = [
      ["Holding power", powStr, ""],
      ["Load it will hold", lmaxStr, lmaxCls],
      ["Hand this load needs", needStr, needCls],
      ["Turns to hold it", turnStr, turnCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas: bitt in plan + tension ladder) -----------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 560, H = 470, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var cssVar = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
  function hexRGB(c) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return [128, 128, 128];
  }
  function withA(c, a) {
    var r = hexRGB(c);
    return "rgba(" + r[0] + "," + r[1] + "," + r[2] + "," + a + ")";
  }
  function mix(c1, c2, t) {
    var a = hexRGB(c1), b = hexRGB(c2);
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," +
      Math.round(a[1] + (b[1] - a[1]) * t) + "," +
      Math.round(a[2] + (b[2] - a[2]) * t) + ")";
  }

  var PLAN_CX = 195, PLAN_CY = 168, PLAN_R = 46;       // the bitt, in plan
  var LAD_TOP = 348, LAD_BOT = 452, LAD_L = 40, LAD_R = W - 40;

  function draw(r) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), post: cssVar("--post"), post2: cssVar("--post-2"),
      iron: cssVar("--iron"), rope: cssVar("--rope"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"),
      field: cssVar("--field"), field2: cssVar("--field-2")
    };
    var accent = !r.holds ? col.dead : (r.ratio > 0.85 ? col.drift : col.keep);
    ctx.clearRect(0, 0, W, H);

    drawPlan(col, accent, r);
    drawLadder(col, accent, r);
  }

  // the rope, coloured by the tension it still carries as it rounds the post
  function drawPlan(col, accent, r) {
    var cx = PLAN_CX, cy = PLAN_CY, R = PLAN_R;
    var th = r.th, turnsN = th / TAU;

    // the bitt
    ctx.fillStyle = withA(col.post, 0.5);
    ctx.strokeStyle = col.post2; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = withA(col.post2, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.66, 0, TAU); ctx.stroke();

    // rope wrap: a spiral just outside the post, angle a(φ) = π − φ (clockwise
    // over the top), radius growing a little per turn so the coils read apart.
    var ropeHalf = 4.6, step = 6.2;
    var samples = Math.max(24, Math.round(th / (TAU / 48)));
    var pt = function (phi) {
      var rr = R + ropeHalf + (phi / TAU) * step;
      var a = Math.PI - phi;
      return { x: cx + rr * Math.cos(a), y: cy - rr * Math.sin(a) };
    };
    // draw as many short segments, coloured tan→oxblood by local tension.
    // tension at φ is L·e^(−μφ); shade by its share of the load, warmed.
    ctx.lineWidth = ropeHalf * 2; ctx.lineCap = "round";
    for (var i = 0; i < samples; i++) {
      var f0 = th * i / samples, f1 = th * (i + 1) / samples;
      var fm = (f0 + f1) / 2;
      var share = Math.exp(-r.m * fm);              // 1 at load, small at tail
      var heat = Math.pow(share, 0.6);              // emphasise the hot end
      var p0 = pt(f0), p1 = pt(f1);
      ctx.strokeStyle = mix(col.rope, col.dead, heat);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }

    // standing part (load) leaving the wrap start, and tail leaving the end
    var start = pt(0), end = pt(th);
    // load line — hot, thick, down-left to a load marker
    var lx = 30, ly = cy + 120;
    ctx.strokeStyle = col.dead; ctx.lineWidth = ropeHalf * 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(lx + 22, ly - 14); ctx.stroke();
    // tail — cool, thinner, out to the right to the hand
    var tx = W - 26, ty = end.y + 18;
    ctx.strokeStyle = mix(col.rope, col.dead, Math.pow(Math.exp(-r.m * th), 0.6));
    ctx.lineWidth = ropeHalf * 1.5;
    ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(tx, ty); ctx.stroke();

    // load marker (a weight) + hand marker
    ctx.fillStyle = withA(col.dead, 0.16); ctx.strokeStyle = col.dead; ctx.lineWidth = 1.4;
    roundRect(lx - 14, ly - 12, 40, 30, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col.dead; ctx.font = "600 11px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("load", lx + 6, ly + 7);

    ctx.fillStyle = col.faint; ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "right";
    ctx.fillText(r.holds ? "hand" : "hand ✕", tx, ty + 16);

    // wrap count, centred on the bitt
    ctx.fillStyle = col.soft; ctx.font = "600 13px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(turnsN.toFixed(2).replace(/\.?0+$/, "") + "×", cx, cy + 4);
    ctx.fillStyle = col.faint; ctx.font = "9px ui-monospace, monospace";
    ctx.fillText("bitt", cx, cy + 16);
  }

  function roundRect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  // the tension unrolled against wrap angle — a straight fall on a log scale
  function drawLadder(col, accent, r) {
    var x0 = LAD_L, x1 = LAD_R, yT = LAD_TOP, yB = LAD_BOT;
    var L = r.L, tail = L * Math.exp(-r.m * r.th), Hh = r.H;

    // log range spanning load, hand and tail, padded a little
    var hi = Math.max(L, Hh) * 1.6;
    var lo = Math.min(tail, Hh) / 1.6;
    var lhi = Math.log(hi), llo = Math.log(lo);
    var yFor = function (T) { return yB - (Math.log(clamp(T, lo, hi)) - llo) / (lhi - llo) * (yB - yT); };
    var xFor = function (phi) { return r.th <= 1e-6 ? x0 : x0 + (x1 - x0) * phi / r.th; };

    // frame
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yT - 6); ctx.lineTo(x0, yB); ctx.lineTo(x1, yB); ctx.stroke();

    // hand rule (dashed) — the reach of the chosen hand
    var yH = yFor(Hh);
    ctx.strokeStyle = withA(col.iron, 0.85); ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x0, yH); ctx.lineTo(x1, yH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.iron; ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText("your hand", x0 + 4, yH - 4);

    // the tension fall: straight line load → tail
    var yLoad = yFor(L), yTail = yFor(tail);
    ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x0, yLoad); ctx.lineTo(x1, yTail); ctx.stroke();

    // shade the verdict: gap between tail and hand at the right
    if (!r.holds) {
      ctx.fillStyle = withA(col.dead, 0.16);
      ctx.fillRect(x1 - 40, yTail, 40, yH - yTail);
    } else {
      ctx.fillStyle = withA(col.keep, 0.14);
      ctx.fillRect(x1 - 40, yH, 40, Math.max(0, yTail - yH));
    }

    // endpoints
    ctx.fillStyle = col.dead;
    ctx.beginPath(); ctx.arc(x0, yLoad, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(x1, yTail, 3.4, 0, TAU); ctx.fill();

    // labels
    ctx.fillStyle = col.faint; ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.fillText("load", x0 + 4, yLoad - 6);
    ctx.textAlign = "right"; ctx.fillText(r.holds ? "tail" : "tail — over hand", x1 - 4, yTail - 6);
    ctx.textAlign = "left"; ctx.fillText("wrap 0", x0, yB + 12);
    ctx.textAlign = "right"; ctx.fillText(turns(state).toFixed(2).replace(/\.?0+$/, "") + " turns", x1, yB + 12);
    ctx.textAlign = "center"; ctx.fillStyle = col.faint;
    ctx.fillText("tension round the post  (log scale)", (x0 + x1) / 2, yB + 12);
  }

  // ---- wiring ------------------------------------------------------------
  var current = null;
  function update() {
    current = compute(state);
    syncLabels(current);
    render(current);
    draw(current);
  }

  inLoad.addEventListener("input", function () { state.load = parseInt(inLoad.value, 10); update(); });
  inMu.addEventListener("input", function () { state.mu = parseInt(inMu.value, 10); update(); });
  inTurns.addEventListener("input", function () { state.turns = parseInt(inTurns.value, 10); update(); });
  handBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.hand = b.dataset.hand; update(); });
  });

  // ease the turns up to the holding target
  function animateTurns(target) {
    var start = state.turns, t0 = null, dur = 560;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eo = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      state.turns = Math.round((start + (target - start) * eo) / 5) * 5;
      inTurns.value = state.turns; update();
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  $("take").addEventListener("click", function () { animateTurns(takeTarget(state)); });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inLoad.value = state.load; inMu.value = state.mu; inTurns.value = state.turns;
    update();
  });

  // repaint on theme flips so the canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (current) draw(current);
    });
  }

  // ---- go ----------------------------------------------------------------
  inLoad.value = state.load; inMu.value = state.mu; inTurns.value = state.turns;
  update();
})();
