/* Sheave — the bench.
 *
 * A block-and-tackle divides a load among the parts of rope that run to the
 * moving block. Hang the load from N parts and each part carries W/N; the fall
 * in your hands is one of those parts, so the ideal pull is
 *
 *   P_ideal = W / N                         [N = parts at the moving block]
 *
 * and the velocity ratio — rope hauled per length lifted — is the same N.
 *
 * The sheaves spoil the ideal. Each bend of the rope over a sheave passes on
 * only a fraction e of the tension (e < 1, the per-sheave efficiency). Number
 * the parts from the hauling end: their tensions run P, Pe, Pe², … Pe^(N−1),
 * and the load is their sum, so
 *
 *   W = P · (1 − e^N) / (1 − e)   ⇒   P = W · (1 − e) / (1 − e^N)
 *
 * The tackle's real efficiency is the ideal pull over the real one:
 *
 *   η = (W/N) / P = (1 − e^N) / ( N · (1 − e) )
 *
 * A person can hold and haul a fall of maybe 35 kgf steadily, half again as
 * much for a short burst. Below that band the tackle is rove to advantage;
 * above it, hard won or won't-start. Everything is kilogram-force; the geometry
 * is schematic. */
(function () {
  "use strict";

  var COMFORT = 35;    // kgf a person can haul on a fall steadily, hand over hand
  var HARD    = 60;    // kgf a person can just start, for a burst
  var MAXPARTS = 8;    // two-blocked: no more parts to reeve
  var CHOKE = 0.65;    // below this efficiency, friction has eaten the purchase

  var BLOCKS = {
    greased: { label: "greased", e: 0.98  },
    fair:    { label: "fair",    e: 0.955 },
    stiff:   { label: "stiff",   e: 0.90  }
  };

  // Opens on a quarter-tonne under-rove on stiff blocks: the fall far too hard
  // to hold. Reeve more parts — and, when the parts run out, grease the blocks.
  var DEFAULT = { N: 3, W: 250, blocks: "stiff" };

  var state = Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- the tackle --------------------------------------------------------
  function compute(s) {
    var e = BLOCKS[s.blocks].e, N = s.N, W = s.W;
    var P = W * (1 - e) / (1 - Math.pow(e, N));   // pull on the fall, kgf
    var eff = (1 - Math.pow(e, N)) / (N * (1 - e)); // real efficiency
    var ma = W / P;                                 // real mechanical advantage
    var verdict;
    if (P <= COMFORT) verdict = "keep";
    else if (P <= HARD) verdict = "drift";
    else verdict = "dead";
    return {
      P: P, VR: N, eff: eff, ma: ma,
      choke: eff < CHOKE,
      twoBlocked: N >= MAXPARTS,
      verdict: verdict
    };
  }

  // fewest parts that bring the fall within reach, for the present blocks
  function partsToAdvantage(s) {
    for (var n = 2; n <= MAXPARTS; n++) {
      if (compute({ N: n, W: s.W, blocks: s.blocks }).P <= COMFORT) return n;
    }
    return MAXPARTS;
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inN = $("in-N"), inW = $("in-W");
  var labN = $("lab-N"), labW = $("lab-W");
  var blockBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-blocks]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");

  function syncLabels() {
    labN.textContent = state.N + (state.N === 1 ? " part" : " parts");
    labW.textContent = state.W + " kgf";
    blockBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.blocks === state.blocks));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Won't start",       note: "under-rove for the weight" },
    drift: { cls: "v-drift", word: "Hard won",          note: "over a comfortable haul" },
    keep:  { cls: "v-keep",  word: "Rove to advantage", note: "within reach of one hand" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.verdict !== "keep" && r.twoBlocked) note = "two-blocked — grease the blocks";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var pCls = r.verdict === "keep" ? "good" : (r.verdict === "drift" ? "warn" : "bad");
    var effCls = r.choke ? "bad" : (r.eff >= 0.85 ? "good" : "");
    var rows = [
      ["Pull on the fall", Math.round(r.P) + '<span class="unit"> kgf</span>', pCls],
      ["Purchase", r.ma.toFixed(1) + '<span class="unit"> : 1</span>', ""],
      ["Velocity ratio", r.VR + '<span class="unit"> : 1</span>', ""],
      ["Efficiency", Math.round(r.eff * 100) + '<span class="unit"> %</span>', effCls],
      ["Rope per metre lifted", r.VR + '<span class="unit"> m</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas tackle) ----------------------------------------
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

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  var BEAM = 44;                       // ceiling
  var TOPBLK = { y: 74, w: 132, h: 30 }; // fixed block
  var BLKX = 200;                      // block centre x
  var GAUGE = { x0: 44, x1: 476, y: 374, max: 120 }; // effort gauge, 0..120 kgf

  var simT = 0, lastTs = null;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"),
      field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);

    ctx.clearRect(0, 0, W, H);

    // a slow heave so the tackle reads as working, not frozen
    var heave = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(simT * 0.9);
    var travel = 46;                                  // px the moving block rides
    var movingTop = 250 - heave * travel;             // higher when hauled in

    // ceiling beam + hook
    ctx.strokeStyle = col.rule; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, BEAM); ctx.lineTo(300, BEAM); ctx.stroke();
    for (var hx = 52; hx < 300; hx += 18) {
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx, BEAM); ctx.lineTo(hx - 7, BEAM - 8); ctx.stroke();
    }
    ctx.strokeStyle = col.slate; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(BLKX, BEAM); ctx.lineTo(BLKX, TOPBLK.y); ctx.stroke();

    var N = cur.VR;
    var topBottom = TOPBLK.y + TOPBLK.h;
    var span = TOPBLK.w - 24;
    var x0 = BLKX - span / 2;
    // rope parts between the blocks
    var wob = reduce ? 0 : Math.sin(simT * 0.9) * 0.6;
    for (var i = 0; i < N; i++) {
      var x = N === 1 ? BLKX : x0 + (span * i) / (N - 1);
      ctx.strokeStyle = col.brass; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + wob, topBottom); ctx.lineTo(x - wob, movingTop); ctx.stroke();
    }

    // the fall: last part runs off the top block to the hand
    var fallX = BLKX + TOPBLK.w / 2 + 8;
    ctx.strokeStyle = col.brass; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + span, topBottom - 6);
    ctx.lineTo(fallX, TOPBLK.y + 6);
    ctx.lineTo(fallX, 250);
    ctx.stroke();

    drawBlock(col, BLKX, TOPBLK.y, TOPBLK.w, TOPBLK.h, Math.ceil(N / 2), heave);
    var mh = TOPBLK.h;
    drawBlock(col, BLKX, movingTop - mh, TOPBLK.w - 20, mh, Math.floor(N / 2) || 1, heave);

    // load box
    var loadY = movingTop + 16;
    var lw = 96, lh = 54;
    ctx.strokeStyle = col.slate; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(BLKX, movingTop + mh - 6); ctx.lineTo(BLKX, loadY); ctx.stroke();
    roundRect(BLKX - lw / 2, loadY, lw, lh, 6);
    ctx.fillStyle = withAlpha(col.slate, 0.10); ctx.fill();
    ctx.strokeStyle = col.slate; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = col.soft; ctx.font = "600 14px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(state.W + " kgf", BLKX, loadY + lh / 2 + 5);

    // the hand + effort arrow, length ∝ pull
    var handY = 250;
    var frac = clamp(cur.P / GAUGE.max, 0.08, 1);
    var arrow = 20 + frac * 96;
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(fallX, handY); ctx.lineTo(fallX, handY + arrow); ctx.stroke();
    // arrowhead down (the haul)
    ctx.beginPath();
    ctx.moveTo(fallX, handY + arrow + 6);
    ctx.lineTo(fallX - 5, handY + arrow - 4);
    ctx.lineTo(fallX + 5, handY + arrow - 4);
    ctx.closePath(); ctx.fill();
    ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = col.faint;
    ctx.fillText("haul " + Math.round(cur.P) + " kgf", fallX + 10, handY + arrow / 2);

    drawGauge(col, accent, cur);
  }

  function drawBlock(col, cx, y, w, h, sheaves, heave) {
    roundRect(cx - w / 2, y, w, h, 7);
    ctx.fillStyle = withAlpha(col.slate, 0.14); ctx.fill();
    ctx.strokeStyle = col.slate; ctx.lineWidth = 1.8; ctx.stroke();
    var n = Math.max(1, sheaves);
    var pad = 16, gap = n === 1 ? 0 : (w - pad * 2) / (n - 1);
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? cx : cx - w / 2 + pad + gap * i;
      var rot = (reduce ? 0 : heave * 6.28);
      ctx.save(); ctx.translate(x, y + h / 2); ctx.rotate(rot);
      ctx.beginPath(); ctx.arc(0, 0, h / 2 - 5, 0, 2 * Math.PI);
      ctx.strokeStyle = col.brass; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -(h / 2 - 6)); ctx.lineTo(0, h / 2 - 6);
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + clamp(v, 0, g.max) / g.max * (g.x1 - g.x0); };
    // baseline
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    // within-reach band (0..COMFORT)
    var bx1 = xFor(COMFORT);
    ctx.fillStyle = withAlpha(col.keep, 0.20);
    ctx.fillRect(g.x0, g.y - 9, bx1 - g.x0, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1; ctx.strokeRect(g.x0, g.y - 9, bx1 - g.x0, 18);
    // hard band (COMFORT..HARD)
    var hx1 = xFor(HARD);
    ctx.fillStyle = withAlpha(col.drift, 0.16);
    ctx.fillRect(bx1, g.y - 9, hx1 - bx1, 18);
    // ticks
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [0, 35, 60, 90, 120].forEach(function (t) {
      var x = xFor(t);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 10); ctx.lineTo(x, g.y + 14); ctx.stroke();
      ctx.fillText(String(t), x, g.y + 26);
    });
    ctx.textAlign = "left"; ctx.fillText("kgf on the fall", g.x0, g.y - 16);
    ctx.textAlign = "left";
    // needle at the pull
    var pinned = cur.P > g.max;
    var nx = xFor(cur.P);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, g.y - 12); ctx.lineTo(nx, g.y + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, g.y - 12, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) {
      ctx.beginPath();
      ctx.moveTo(nx + 4, g.y - 12); ctx.lineTo(nx + 11, g.y - 15); ctx.lineTo(nx + 11, g.y - 9);
      ctx.closePath(); ctx.fill();
    }
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

  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  // ---- loop --------------------------------------------------------------
  var current = compute(state);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) simT += dt;
    draw(current);
    raf = window.requestAnimationFrame(frame);
  }
  var raf = window.requestAnimationFrame(frame);

  // ---- wiring ------------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
  }

  inN.addEventListener("input", function () { state.N = parseInt(inN.value, 10); update(); });
  inW.addEventListener("input", function () { state.W = parseInt(inW.value, 10); update(); });
  blockBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.blocks = b.dataset.blocks; update(); });
  });

  $("reeve").addEventListener("click", function () {
    state.N = partsToAdvantage(state);
    inN.value = state.N;
    update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inN.value = state.N; inW.value = state.W;
    update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // ---- go ----------------------------------------------------------------
  inN.value = state.N; inW.value = state.W;
  update();
})();
