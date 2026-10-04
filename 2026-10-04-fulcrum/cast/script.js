/* Fulcrum · cast — the bench.
 *
 * A fishing rod is a third-class lever: the butt is the fulcrum, the load is out at the
 * tip, and the effort goes in BETWEEN — nearer the pivot than the load. The effort arm is
 * the shorter one, so the advantage is always below one: you drive with more force than
 * the tip carries. What that buys is speed and reach — the tip moves 1 ⁄ MA times as fast
 * and as far as your hand.
 *
 *   advantage   MA = effort arm ⁄ load arm < 1   (effort always inside the load)
 *   force       drive W ⁄ MA, more than the tip carries (past the wrist → it stalls)
 *   whip        the tip goes 1 ⁄ MA times your hand's speed and reach
 *
 * Drive near the pivot for a great whip you must be strong enough to swing; drive near the
 * tip and MA → 1 and the lever does nothing. Idealised rigid, weightless, frictionless,
 * the arithmetic is exact: the drive is W·(load arm ⁄ effort arm), the tip's speed and reach
 * are the hand's times the same ratio, and the two meet in one conserved product.
 */
(function () {
  "use strict";

  // ---- the rod, the wrist, the tip ------------------------------------
  var LOAD_ARM = 100;          // pivot → tip, % — fixed: the rod's length
  var WRIST = 400;             // the most the wrist can drive, N — fixed: one arm
  var D_HAND = 120;            // the drive stroke at the hand, mm
  var W_MIN = 40, W_MAX = 320, W_STEP = 10;    // the tip load, N
  var E_MIN = 10, E_MAX = 85, E_STEP = 1;      // drive point from the pivot, %

  var DEFAULT = { w: 140, e: 62 };             // a fair tip, driven out — it loafs
  var KEY = "fulcrum.cast.v1";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    v = Math.round(v * 1e6) / 1e6;
    return v < a ? a : v > b ? b : v;
  }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return {
        w: clampStep(o.w, W_MIN, W_MAX, W_STEP),
        e: clampStep(o.e, E_MIN, E_MAX, E_STEP)
      };
    } catch (ex) { return null; }
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (ex) {} }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the one law -----------------------------------------------------
  function eSweetOf(w) {
    var gainStall = WRIST / w;
    var target = Math.min(0.9 * gainStall, 3.0);     // drive just inside the stall, capped
    return clamp(LOAD_ARM / target, E_MIN, E_MAX);
  }

  function compute(s) {
    var e = s.e, w = s.w;
    var effortArm = e, loadArm = LOAD_ARM;
    var MA = effortArm / loadArm;                 // < 1
    var gain = 1 / MA;                            // speed & reach multiplier = loadArm/effortArm
    var drive = w / MA;                           // force the wrist must give
    var tipTravel = D_HAND / MA;                  // mm the tip sweeps per hand stroke
    var stalls = drive > WRIST + 1e-9;
    var gainStall = WRIST / w;

    var regime;
    if (gain > gainStall + 1e-9) regime = "stall";
    else if (gain >= 2.2) regime = "whips";
    else if (gain >= 1.6) regime = "easy";
    else regime = "labour";

    return {
      e: e, w: w, effortArm: effortArm, loadArm: loadArm, MA: MA, gain: gain,
      drive: drive, tipTravel: tipTravel, stalls: stalls, gainStall: gainStall,
      eSweet: eSweetOf(w), regime: regime
    };
  }

  function verdictOf(r) { return r.regime; }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-w"), inE = $("in-e");
  var labW = $("lab-w"), labE = $("lab-e");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var eMark = $("e-mark"), eNote = $("e-note");

  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function n0(x) { return Math.round(x).toString(); }

  var W_WORD = function (v) {
    if (v < 110) return "a light lure"; if (v < 190) return "a fair weight";
    if (v < 260) return "a heavy weight"; return "a dead weight";
  };
  var E_WORD = function (r) {
    if (r.e < 24) return "hard at the butt"; if (r.e < 42) return "near the pivot";
    if (r.e < 60) return "mid-rod"; if (r.e < 75) return "well out"; return "out at the tip";
  };

  function syncLabels(r) {
    labW.textContent = W_WORD(state.w);
    labE.textContent = E_WORD(r);
  }

  var VERDICT_TEXT = {
    whips:  { cls: "v-keep",  word: "Whips",   note: "the tip flies, within your strength" },
    easy:   { cls: "v-drift", word: "Easy",    note: "driven out — the whip is left idle" },
    labour: { cls: "v-dead",  word: "Labours", note: "at the tip — no whip at all" },
    stall:  { cls: "v-dead",  word: "Stalls",  note: "too near the pivot — the wrist gives out" }
  };

  function render(r) {
    var verdict = verdictOf(r);
    var v = VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var gainClass = verdict === "whips" ? "good" : verdict === "easy" ? "warn" : "bad";
    var driveClass = r.stalls ? "bad" : r.drive > 0.85 * WRIST ? "warn" : "good";

    var rows = [
      ['Whip <span class="tag b">1⁄MA</span>', n1(r.gain) + '×<span class="unit"> · tip vs hand</span>', gainClass],
      ["Wrist drive", n0(r.drive) + ' N<span class="unit"> · can give ' + n0(WRIST) + " N</span>", driveClass],
      ["Force cost", n1(r.gain) + '×<span class="unit"> · drive ' + n1(r.gain) + "× the tip load</span>", gainClass],
      ["Tip reach", n0(r.tipTravel) + ' mm<span class="unit"> · hand ' + n0(D_HAND) + " mm</span>", gainClass],
      ['Arms <span class="tag">e</span>:<span class="tag load">l</span>', n0(r.effortArm) + " : " + n0(r.loadArm) + '<span class="unit"> · of the rod</span>', ""],
      ["Whip at most", n1(r.gainStall) + '×<span class="unit"> · before it stalls</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markE(r);
    return verdict;
  }

  function markE(r) {
    if (!eMark || !eNote) return;
    eMark.style.left = (clamp(r.eSweet, E_MIN, E_MAX) - E_MIN) / (E_MAX - E_MIN) * 100 + "%";
    eMark.className = "x-mark";
    if (Math.abs(r.e - r.eSweet) <= E_STEP + 1e-6) eNote.innerHTML = "the whip — tip at <b>" + n1(r.gain) + "×</b> your hand";
    else if (r.regime === "stall") eNote.innerHTML = "ease out, past <b>" + n0(r.eSweet) + "%</b>, or the wrist stalls";
    else if (r.regime === "easy" || r.regime === "labour") eNote.innerHTML = "drive in, toward <b>" + n0(r.eSweet) + "%</b>, for the whip";
    else eNote.innerHTML = "find the whip at: <b>" + n0(r.eSweet) + "%</b>";
  }

  // ---- the stage (canvas) ---------------------------------------------
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

  var cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  var tCur = 0;
  var LOOP = 3.0;
  // cast progress 0 → 1 → 0 across the loop (the forward flick, then recover)
  function castP() {
    if (reduce) return 1;
    var t = tCur % LOOP, fwd = 0.9, hold = 0.35;
    if (t < fwd) { var x = t / fwd; return x * x * (3 - 2 * x); }
    if (t < fwd + hold) return 1;
    var d = clamp((t - fwd - hold) / (LOOP - fwd - hold), 0, 1), y = 1 - d; return y;
  }

  function draw(r, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      effort: cssVar("--effort"), effort2: cssVar("--effort-2"),
      load: cssVar("--load"), load2: cssVar("--load-2"),
      brass: cssVar("--brass"), brass2: cssVar("--brass-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = (verdict === "stall" || verdict === "labour") ? col.dead
      : verdict === "easy" ? col.drift : col.keep;
    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, r, verdict);
    drawWork(col, accent, r, verdict);
    drawGauge(col, accent, r);
  }

  // ---- the scene: a rod pivoted at the butt, whipping the tip ---------
  function drawScene(col, accent, r, verdict) {
    var p = castP();
    var px = 70, py = 236;                        // the pivot, at the butt
    var Rpx = 188;                                 // the rod, in pixels
    var a0 = -0.30, a1 = -1.78;                    // laid-back → forward sweep (radians)
    // a heavy stall barely moves; a labour sweeps a little; a whip sweeps the full arc
    var swing = verdict === "stall" ? 0.12 : verdict === "labour" ? 0.5 : 1.0;
    var ang = a0 + (a1 - a0) * p * swing;

    var eFrac = r.e / 100;
    var ex = px + Math.cos(ang) * Rpx * eFrac, ey = py + Math.sin(ang) * Rpx * eFrac;
    var tx = px + Math.cos(ang) * Rpx, ty = py + Math.sin(ang) * Rpx;

    // the swept paths — the tip's wide arc, the hand's small one (short way)
    var span = (a1 - a0) * swing;
    ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
    ctx.strokeStyle = withAlpha(col.load, 0.3); shortArc(px, py, Rpx, a0, span);
    ctx.strokeStyle = withAlpha(col.effort, 0.3); shortArc(px, py, Rpx * eFrac, a0, span);
    ctx.setLineDash([]);

    // the rod (a slight curve for the spring of it)
    ctx.strokeStyle = withAlpha(col.effort, 0.92); ctx.lineWidth = 5; ctx.lineCap = "round";
    var mx = px + Math.cos(ang) * Rpx * 0.5 - Math.sin(ang) * 6 * p;
    var my = py + Math.sin(ang) * Rpx * 0.5 + Math.cos(ang) * 6 * p;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();

    // the pivot (brass)
    ctx.fillStyle = col.field2; ctx.strokeStyle = col.brass2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    label(ctx, col.brass2, "butt · pivot", px, py + 22, "center");

    // the drive point and the tip
    ctx.fillStyle = col.effort2; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
    label(ctx, col.effort2, "drive", ex - 6, ey - 10, "right");
    var tipCol = verdict === "stall" ? col.dead : col.load2;
    ctx.fillStyle = tipCol; ctx.beginPath(); ctx.arc(tx, ty, 4 + r.w / 70, 0, Math.PI * 2); ctx.fill();
    label(ctx, tipCol, n0(r.w) + " N", tx + 8, ty, "left");

    // the two speed arrows, perpendicular to the rod — their ratio is the whip
    var perp = ang + Math.PI / 2;
    var vScale = verdict === "stall" ? 0.0 : 26;
    var vEff = (Rpx * eFrac) / Rpx;               // ∝ radius → normalised
    var vTip = 1;
    drawVel(col.effort2, ex, ey, perp, vEff * vScale);
    drawVel(verdict === "whips" ? col.keep : tipCol, tx, ty, perp, vTip * vScale * (verdict === "labour" ? 0.6 : 1));

    if (verdict === "stall") label(ctx, col.dead, "won't swing", tx - 10, ty + 18, "center");
    else if (verdict === "whips") label(ctx, col.keep, n1(r.gain) + "× whip", (ex + tx) / 2 + 20, (ey + ty) / 2, "left");
  }

  function drawVel(color, x, y, dir, len) {
    if (len < 1) return;
    var hx = x + Math.cos(dir) * len, hy = y + Math.sin(dir) * len;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke();
    var back = dir + Math.PI, wing = 0.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(back - wing) * 6, hy + Math.sin(back - wing) * 6);
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(back + wing) * 6, hy + Math.sin(back + wing) * 6);
    ctx.stroke();
  }

  // ---- the work bars: force × distance in = out (equal areas) ----------
  // The third class reverses the trade: big drive over a small sweep in,
  // small tip load over a big sweep out. Equal areas all the same.
  function drawWork(col, accent, r, verdict) {
    var bx = 300, by = 40, bw = 236, bh = 214;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the trade — reversed, equal same", bx + 12, by + 18, "left");

    var areaTop = by + 42, areaH = bh - 92, baseY = areaTop + areaH;
    var maxForce = Math.max(r.drive, r.w, 1);
    var fScale = 64 / maxForce, dScale = areaH / 420;

    var exW = Math.max(6, r.drive * fScale), exH = Math.min(areaH, D_HAND * dScale);
    var lxW = Math.max(6, r.w * fScale), lxH = Math.min(areaH, r.tipTravel * dScale);

    var xa = bx + 26, xb = bx + bw - 26 - lxW;
    // drive bar (steel) — big force, small sweep
    ctx.fillStyle = withAlpha(col.effort, 0.3); ctx.strokeStyle = col.effort2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(xa, baseY - exH, exW, exH); ctx.fill(); ctx.stroke();
    label(ctx, col.effort2, "drive", xa + exW / 2, baseY + 16, "center");
    label(ctx, col.faint, n0(r.drive) + "N × " + n0(D_HAND) + "mm", xa + exW / 2, areaTop - 8, "center");

    // tip bar (terracotta) — small force, big sweep
    ctx.fillStyle = withAlpha(col.load, 0.3); ctx.strokeStyle = col.load2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(xb, baseY - lxH, lxW, lxH); ctx.fill(); ctx.stroke();
    label(ctx, col.load2, "tip", xb + lxW / 2, baseY + 16, "center");
    label(ctx, col.faint, n0(r.w) + "N × " + n0(r.tipTravel) + "mm", xb + lxW / 2, areaTop - 8, "center");

    label(ctx, col.brass2, "=", bx + bw / 2, baseY - areaH / 2, "center");
    label(ctx, verdict === "whips" ? col.keep : col.drift, "force spent, reach bought", bx + 12, by + bh - 10, "left");
  }

  // ---- the gauge: the whip, against the stall ceiling -----------------
  function drawGauge(col, accent, r) {
    var bx = 24, by = 300, bw = W - 48, bh = 150;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the whip   1 ⁄ MA = tip speed ⁄ hand speed", bx + 14, by + 20, "left");

    var gx0 = bx + 40, gx1 = bx + bw - 30, gy = by + 74;
    var gMax = Math.max(r.gainStall * 1.18, r.gain * 1.06, 4.2);
    var xFor = function (g) { return gx0 + clamp(g, 1, gMax) / gMax * (gx1 - gx0); };

    var stall = r.gainStall, eHi = Math.min(2.2, stall);
    band(xFor(1), xFor(1.6), gy, col.dead, 0.12);          // labours
    band(xFor(1.6), xFor(eHi), gy, col.drift, 0.12);        // easy
    if (stall > 2.2) band(xFor(2.2), xFor(stall), gy, col.keep, 0.20);   // whips
    band(xFor(stall), xFor(gMax), gy, col.dead, 0.12);      // stall
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy - 12, xFor(gMax) - gx0, 24);

    // the stall ceiling — where the drive reaches the wrist's limit
    var xS = xFor(stall);
    ctx.strokeStyle = withAlpha(col.dead, 0.8); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xS, gy - 18); ctx.lineTo(xS, gy + 18); ctx.stroke();
    label(ctx, col.dead, "stalls " + n1(stall) + "×", xS, gy + 34, "center");
    label(ctx, col.faint, "a stick", xFor(1.3), gy - 20, "center");
    if (stall > 2.4) label(ctx, col.keep, "whip", xFor((2.2 + stall) / 2), gy - 20, "center");

    // the needle at the current whip
    var nX = xFor(r.gain);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 16); ctx.lineTo(nX, gy + 16); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 16, 3.4, 0, Math.PI * 2); ctx.fill();
    label(ctx, accent, n1(r.gain) + "×", nX, gy + 50, "center");

    label(ctx, col.faint, "1×", gx0, gy + 34, "left");
    label(ctx, col.faint, n1(gMax) + "×", gx1, gy + 34, "right");
  }

  function band(x0, x1, gy, color, a) {
    ctx.fillStyle = withAlpha(color, a); ctx.fillRect(x0, gy - 12, Math.max(0, x1 - x0), 24);
  }

  // ---- small canvas helpers -------------------------------------------
  // draw the minor (short-way) arc of angular span `span` from angle `a`
  function shortArc(cx, cy, r, a, span) {
    ctx.beginPath(); ctx.arc(cx, cy, r, a, a + span, span < 0); ctx.stroke();
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
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);
  var curVerdict = verdictOf(current);
  var lastTs = null;
  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) { tCur += dt; if (tCur > 1e6) tCur = 0; }
    draw(current, curVerdict);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update(replay) {
    current = compute(state);
    syncLabels(current);
    curVerdict = render(current);
    announce(current, curVerdict);
    if (replay && !reduce) tCur = 0;
    save();
  }

  // ---- screen-reader status (debounced) --------------------------------
  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = W_WORD(r.w) + " of " + n0(r.w) + " newtons at the tip, driven " + E_WORD(r)
        + ", for an advantage of " + n1(r.MA) + " to one — a whip of " + n1(r.gain)
        + " times, at a drive of " + n0(r.drive) + " newtons. ";
      var tail;
      if (verdict === "whips") {
        tail = "Whips — the tip flies " + n1(r.gain) + " times as fast and as far as your hand, bought with "
          + n0(r.drive) + " newtons your wrist can give. This is the aim: the fastest tip your arm can throw.";
      } else if (verdict === "easy") {
        tail = "Easy — driven well out, the force is light but the whip is only " + n1(r.gain)
          + " times, most of it left idle. Drive in toward " + n0(r.eSweet) + " percent for more whip.";
      } else if (verdict === "labour") {
        tail = "Labours — driven out at the tip, the arms are nearly even and the tip no longer outruns your hand. Drive in toward "
          + n0(r.eSweet) + " percent to put the lever to work.";
      } else {
        tail = "Stalls — driven this near the pivot the wrist must find " + n0(r.drive)
          + " newtons, past the " + n0(WRIST) + " it can give, and the rod will not swing. Ease the drive out, past "
          + n0(r.eSweet) + " percent.";
      }
      sayEl.textContent = head + tail;
    }, 260);
  }

  inW.addEventListener("input", function () { state.w = clampStep(inW.value, W_MIN, W_MAX, W_STEP); update(true); });
  inE.addEventListener("input", function () { state.e = clampStep(inE.value, E_MIN, E_MAX, E_STEP); update(true); });

  $("set").addEventListener("click", function () {
    var e = clampStep(eSweetOf(state.w), E_MIN, E_MAX, E_STEP);
    state.e = e; inE.value = e; update(true);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.w; inE.value = state.e; update(true);
  });

  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clampStep(state[field] + delta, lo, hi, step);
    input.value = state[field]; update(true);
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;
    var k = e.key;
    if (k === "w" || k === "W") { $("set").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (k === "]") { nudge("e", -E_STEP * 3, E_MIN, E_MAX, E_STEP, inE); }   // in to the butt
    else if (k === "[") { nudge("e", E_STEP * 3, E_MIN, E_MAX, E_STEP, inE); }     // out to the tip
    else if (k === "=" || k === "+") { nudge("w", W_STEP * 2, W_MIN, W_MAX, W_STEP, inW); }
    else if (k === "-" || k === "_") { nudge("w", -W_STEP * 2, W_MIN, W_MAX, W_STEP, inW); }
    else if (k === " ") { tCur = 0; }
    else return;
    e.preventDefault();
  });

  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      draw(current, curVerdict);
    });
  }

  // ---- go --------------------------------------------------------------
  inW.value = state.w; inE.value = state.e;
  update(false);
})();
