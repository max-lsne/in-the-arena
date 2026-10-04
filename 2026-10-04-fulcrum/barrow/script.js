/* Fulcrum · barrow — the bench.
 *
 * A wheelbarrow is a second-class lever: the wheel is the fulcrum, the hands the effort,
 * and the load rides BETWEEN them — so the effort arm (wheel → hands) is always longer
 * than the load arm (wheel → load), and the advantage is never below one. You cannot set
 * it against yourself; you can only load it wrong.
 *
 *   advantage   MA = effort arm ⁄ load arm ≥ 1   (the load always between)
 *   share       hands bear W ⁄ MA, the wheel the rest
 *   travel      load rises d_hand ⁄ MA           (work conserved)
 *
 * Load it back toward the handles and the hands bear too much to lift; load it hard over
 * the wheel and they bear too little to steer, and the barrow pitches on its nose. The
 * right place keeps the carry and the control. Idealised rigid, weightless, frictionless,
 * the arithmetic is exact: hands bear W·(load arm ⁄ effort arm), the wheel bears the rest.
 */
(function () {
  "use strict";

  // ---- the barrow, the hands, the load --------------------------------
  var EFFORT_ARM = 100;        // wheel → hands, % — fixed: the length of the barrow
  var HANDS = 300;             // the most the hands can lift, N — fixed: one person
  var TIP = 50;                // below this share (N) the handles float — no steering
  var TIP_OK = 70;             // a comfortable floor on the hand share
  var LOADED = 225;            // above this (0.75·HANDS) it lifts but tires
  var D_HAND = 300;            // the hand lift per heave, mm
  var W_MIN = 100, W_MAX = 900, W_STEP = 10;   // the load, N
  var A_MIN = 10, A_MAX = 95, A_STEP = 1;      // load place, % from the wheel

  var DEFAULT = { w: 350, a: 70 };             // a fair load, set back — the hands tire
  var KEY = "fulcrum.barrow.v1";

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
        a: clampStep(o.a, A_MIN, A_MAX, A_STEP)
      };
    } catch (e) { return null; }
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the one law -----------------------------------------------------
  function aSweetOf(w) { return clamp((0.5 * HANDS) * EFFORT_ARM / w, A_MIN, A_MAX); }

  function compute(s) {
    var a = s.a, w = s.w;
    var loadArm = a, effortArm = EFFORT_ARM;
    var MA = effortArm / loadArm;
    var handShare = w / MA;                       // the weight on the hands
    var wheelShare = w - handShare;
    var loadRise = D_HAND / MA;                   // mm the load rises per hand lift
    var lifts = handShare <= HANDS + 1e-9;

    var regime;
    if (handShare > HANDS) regime = "dead";
    else if (handShare > LOADED) regime = "loaded";
    else if (handShare >= TIP_OK) regime = "fair";
    else if (handShare >= TIP) regime = "light";
    else regime = "tips";

    return {
      a: a, w: w, loadArm: loadArm, effortArm: effortArm, MA: MA,
      handShare: handShare, wheelShare: wheelShare, loadRise: loadRise,
      lifts: lifts, aSweet: aSweetOf(w), regime: regime
    };
  }

  function verdictOf(r) { return r.regime; }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-w"), inA = $("in-a");
  var labW = $("lab-w"), labA = $("lab-a");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var aMark = $("a-mark"), aNote = $("a-note");

  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function n0(x) { return Math.round(x).toString(); }
  function pct(x) { return Math.round(x) + "%"; }

  var W_WORD = function (v) {
    if (v < 220) return "a light load"; if (v < 450) return "a barrowful";
    if (v < 700) return "a heavy load"; return "bricks and mortar";
  };
  var A_WORD = function (r) {
    if (r.a < 25) return "over the wheel"; if (r.a < 45) return "well forward";
    if (r.a < 62) return "mid-tray"; if (r.a < 80) return "set back"; return "at the handles";
  };

  function syncLabels(r) {
    labW.textContent = W_WORD(state.w);
    labA.textContent = A_WORD(r);
  }

  var VERDICT_TEXT = {
    fair:   { cls: "v-keep",  word: "Fair",   note: "wheel takes it, hands can steer" },
    light:  { cls: "v-drift", word: "Light",  note: "forward — little on the handles" },
    loaded: { cls: "v-drift", word: "Loaded", note: "back — the hands bear most" },
    tips:   { cls: "v-dead",  word: "Tips",   note: "nose-heavy — nothing to steer by" },
    dead:   { cls: "v-dead",  word: "Dead",   note: "at the handles — too much to lift" }
  };

  function render(r) {
    var verdict = verdictOf(r);
    var v = VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var shareClass = verdict === "fair" ? "good" : (verdict === "dead" || verdict === "tips") ? "bad" : "warn";

    var rows = [
      ['Advantage <span class="tag b">MA</span>', n1(r.MA) + '×<span class="unit"> · always ≥ 1</span>', "good"],
      ["On your hands", n0(r.handShare) + ' N<span class="unit"> · lift ≤ ' + n0(HANDS) + " N</span>", shareClass],
      ["On the wheel", n0(r.wheelShare) + ' N<span class="unit"> · ' + pct(r.wheelShare / r.w * 100) + " carried free</span>", "good"],
      ["Load rises", n0(r.loadRise) + ' mm<span class="unit"> · hands ' + n0(D_HAND) + " mm</span>", ""],
      ['Arms <span class="tag">e</span>:<span class="tag load">l</span>', n0(r.effortArm) + " : " + n0(r.loadArm) + '<span class="unit"> · of the barrow</span>', ""],
      ["Set it fair at", n0(r.aSweet) + '<span class="unit"> % from the wheel</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markA(r);
    return verdict;
  }

  function markA(r) {
    if (!aMark || !aNote) return;
    aMark.style.left = (clamp(r.aSweet, A_MIN, A_MAX) - A_MIN) / (A_MAX - A_MIN) * 100 + "%";
    aMark.className = "x-mark";
    if (Math.abs(r.a - r.aSweet) <= A_STEP + 1e-6) aNote.innerHTML = "set fair — hands bear <b>" + n0(r.handShare) + " N</b>";
    else if (r.regime === "dead" || r.regime === "loaded") aNote.innerHTML = "load forward, toward <b>" + n0(r.aSweet) + "%</b>, to lighten the hands";
    else if (r.regime === "tips" || r.regime === "light") aNote.innerHTML = "load back, toward <b>" + n0(r.aSweet) + "%</b>, to hold the steering";
    else aNote.innerHTML = "set it fair at: <b>" + n0(r.aSweet) + "%</b>";
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
  var LOOP = 3.2;
  function heaveP() {
    if (reduce) return 1;
    var t = tCur % LOOP, up = 1.5, hold = 0.5;
    if (t < up) { var x = t / up; return x * x * (3 - 2 * x); }
    if (t < up + hold) return 1;
    var d = clamp((t - up - hold) / (LOOP - up - hold), 0, 1), y = 1 - d; return y * y * (3 - 2 * y);
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
    var accent = (verdict === "dead" || verdict === "tips") ? col.dead
      : (verdict === "loaded" || verdict === "light") ? col.drift : col.keep;
    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, r, verdict);
    drawWork(col, accent, r, verdict);
    drawGauge(col, accent, r);
  }

  // ---- the scene: a barrow on its wheel, load between, hands behind ----
  function drawScene(col, accent, r, verdict) {
    var p = heaveP();
    var gy = 196;                                 // ground line
    var wheelX = 56, wheelR = 24;                 // the wheel = fulcrum, front-left
    var handX = 272, handRest = gy - 54;          // the handles, rear-right, at rest

    // lift / pitch about the wheel
    var lift = verdict === "dead" ? 2 * Math.sin(tCur * 7) * (reduce ? 0 : 1)
      : verdict === "tips" ? -26 * p : 20 * p;
    var handY = handRest - lift;

    // the ground
    ctx.strokeStyle = withAlpha(col.faint, 0.4); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(12, gy + wheelR); ctx.lineTo(300, gy + wheelR); ctx.stroke();
    ctx.setLineDash([]);

    // the barrow beam from the wheel hub to the handles
    var hubX = wheelX, hubY = gy;
    var beamAng = Math.atan2(handY - hubY, handX - hubX);
    var at = function (frac, rise) {
      var bx = hubX + (handX - hubX) * frac, by = hubY + (handY - hubY) * frac;
      return [bx, by - (rise || 0)];
    };
    // bed of the tray
    ctx.strokeStyle = withAlpha(col.effort, 0.9); ctx.lineWidth = 6; ctx.lineCap = "round";
    var B0 = at(0.08), B1 = at(1);
    ctx.beginPath(); ctx.moveTo(B0[0], B0[1]); ctx.lineTo(B1[0], B1[1]); ctx.stroke();
    // a little leg at the back
    ctx.strokeStyle = withAlpha(col.effort2, 0.6); ctx.lineWidth = 3;
    var leg = at(0.86);
    ctx.beginPath(); ctx.moveTo(leg[0], leg[1]); ctx.lineTo(leg[0], gy + wheelR); ctx.stroke();

    // the wheel
    ctx.fillStyle = withAlpha(col.brass, 0.18); ctx.strokeStyle = col.brass2; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(hubX, hubY, wheelR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col.brass2; ctx.beginPath(); ctx.arc(hubX, hubY, 3, 0, Math.PI * 2); ctx.fill();
    label(ctx, col.brass2, "wheel · fulcrum", hubX, gy + wheelR + 16, "center");

    // the load box, riding at fraction a along the bed
    var frac = r.a / 100, lp = at(frac);
    var boxW = 30, boxH = clamp(12 + r.w / 26, 16, 54);
    ctx.save(); ctx.translate(lp[0], lp[1]); ctx.rotate(beamAng);
    ctx.fillStyle = withAlpha(col.load, 0.8); ctx.strokeStyle = col.load2; ctx.lineWidth = 1.4;
    roundRect(-boxW / 2, -boxH - 3, boxW, boxH, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
    label(ctx, col.load2, n0(r.w) + " N", lp[0], lp[1] - boxH - 10, "center");

    // the two supports, as up-arrows sized to their share
    arrowUp(col.brass2, hubX, hubY - wheelR - 4, r.wheelShare / r.w, "wheel");
    var hands = at(1);
    arrowUp(verdict === "fair" ? col.keep : (verdict === "dead" ? col.dead : col.effort2),
      hands[0], hands[1] - 6, r.handShare / r.w, "hands");

    if (verdict === "tips" && !reduce) {
      label(ctx, col.dead, "pitches", lp[0] + 6, lp[1] + 24, "center");
    } else if (verdict === "dead") {
      label(ctx, col.dead, "won't lift", hands[0], hands[1] + 20, "center");
    }
  }

  function arrowUp(color, x, yTip, frac, name) {
    var len = clamp(frac, 0, 1) * 54 + 6;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, yTip); ctx.lineTo(x, yTip + len); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4, yTip + 6); ctx.lineTo(x, yTip); ctx.lineTo(x + 4, yTip + 6); ctx.stroke();
    label(ctx, color, name, x, yTip + len + 14, "center");
  }

  // ---- the work bars: force × distance in = out (equal areas) ----------
  function drawWork(col, accent, r, verdict) {
    var bx = 300, by = 40, bw = 236, bh = 214;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the trade — equal work, either end", bx + 12, by + 18, "left");

    var areaTop = by + 42, areaH = bh - 92, baseY = areaTop + areaH;
    var maxForce = Math.max(r.w, r.handShare, 1);
    var fScale = 64 / maxForce, dScale = areaH / 360;

    var exW = Math.max(6, r.handShare * fScale), exH = Math.min(areaH, D_HAND * dScale);
    var lxW = Math.max(6, r.w * fScale), lxH = Math.min(areaH, r.loadRise * dScale);

    var xa = bx + 26, xb = bx + bw - 26 - lxW;
    ctx.fillStyle = withAlpha(col.effort, 0.3); ctx.strokeStyle = col.effort2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(xa, baseY - exH, exW, exH); ctx.fill(); ctx.stroke();
    label(ctx, col.effort2, "hands", xa + exW / 2, baseY + 16, "center");
    label(ctx, col.faint, n0(r.handShare) + "N × " + n0(D_HAND) + "mm", xa + exW / 2, areaTop - 8, "center");

    ctx.fillStyle = withAlpha(col.load, 0.3); ctx.strokeStyle = col.load2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(xb, baseY - lxH, lxW, lxH); ctx.fill(); ctx.stroke();
    label(ctx, col.load2, "load", xb + lxW / 2, baseY + 16, "center");
    label(ctx, col.faint, n0(r.w) + "N × " + n0(r.loadRise) + "mm", xb + lxW / 2, areaTop - 8, "center");

    label(ctx, col.brass2, "=", bx + bw / 2, baseY - areaH / 2, "center");
    label(ctx, col.keep, "hands move far, the load little", bx + 12, by + bh - 10, "left");
  }

  // ---- the gauge: the weight on your hands, W ⁄ MA ---------------------
  function drawGauge(col, accent, r) {
    var bx = 24, by = 300, bw = W - 48, bh = 150;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the weight on your hands   W ⁄ MA", bx + 14, by + 20, "left");

    var gx0 = bx + 40, gx1 = bx + bw - 30, gy = by + 74;
    var fMax = Math.max(HANDS * 1.25, r.handShare * 1.05);
    var xFor = function (f) { return gx0 + clamp(f, 0, fMax) / fMax * (gx1 - gx0); };

    // bands: < TIP tips (dead); TIP..TIP_OK light (amber); TIP_OK..LOADED fair (green);
    // LOADED..HANDS loaded (amber); > HANDS dead (oxblood)
    band(gx0, xFor(TIP), gy, col.dead, 0.12);
    band(xFor(TIP), xFor(TIP_OK), gy, col.drift, 0.12);
    band(xFor(TIP_OK), xFor(LOADED), gy, col.keep, 0.20);
    band(xFor(LOADED), xFor(HANDS), gy, col.drift, 0.12);
    band(xFor(HANDS), xFor(fMax), gy, col.dead, 0.12);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy - 12, xFor(fMax) - gx0, 24);

    // the lift ceiling
    var xC = xFor(HANDS);
    ctx.strokeStyle = withAlpha(col.dead, 0.8); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xC, gy - 18); ctx.lineTo(xC, gy + 18); ctx.stroke();
    label(ctx, col.dead, "lift limit " + n0(HANDS) + " N", xC, gy + 34, "center");
    label(ctx, col.faint, "float · no steer", xFor(TIP / 2), gy - 20, "center");
    label(ctx, col.keep, "fair", xFor((TIP_OK + LOADED) / 2), gy - 20, "center");

    // the needle at the current hand share
    var nX = xFor(r.handShare);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 16); ctx.lineTo(nX, gy + 16); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 16, 3.4, 0, Math.PI * 2); ctx.fill();
    label(ctx, accent, n0(r.handShare) + " N", nX, gy + 50, "center");

    label(ctx, col.faint, "0", gx0, gy + 34, "left");
    label(ctx, col.faint, n0(fMax) + " N", gx1, gy + 34, "right");
  }

  function band(x0, x1, gy, color, a) {
    ctx.fillStyle = withAlpha(color, a); ctx.fillRect(x0, gy - 12, Math.max(0, x1 - x0), 24);
  }

  // ---- small canvas helpers -------------------------------------------
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
      var head = W_WORD(r.w).replace(/^a /, "") + " of " + n0(r.w) + " newtons, placed " + A_WORD(r)
        + ", for an advantage of " + n1(r.MA) + " to one. The wheel carries " + n0(r.wheelShare)
        + " newtons; your hands " + n0(r.handShare) + ". ";
      var tail;
      if (verdict === "fair") {
        tail = "Fair — the wheel takes most of it and the hands keep a liftable, steerable share. This is the aim.";
      } else if (verdict === "loaded") {
        tail = "Loaded back — it lifts, but the hands bear most of the weight and will tire. Slide the load forward, toward "
          + n0(r.aSweet) + " percent from the wheel.";
      } else if (verdict === "light") {
        tail = "Light on the handles — the wheel does nearly all the work and the barrow steers thinly. Slide the load back a little, toward "
          + n0(r.aSweet) + " percent.";
      } else if (verdict === "tips") {
        tail = "Tips — with the load crammed over the wheel the hands bear almost nothing, so there is nothing to balance or steer by, and the barrow pitches on its nose. Load it back toward "
          + n0(r.aSweet) + " percent.";
      } else {
        tail = "Dead — the load is at the handles, the advantage down to one, and the hands bear the whole weight, past what they can lift. Load it well forward, toward "
          + n0(r.aSweet) + " percent from the wheel.";
      }
      sayEl.textContent = head + tail;
    }, 260);
  }

  inW.addEventListener("input", function () { state.w = clampStep(inW.value, W_MIN, W_MAX, W_STEP); update(true); });
  inA.addEventListener("input", function () { state.a = clampStep(inA.value, A_MIN, A_MAX, A_STEP); update(true); });

  $("set").addEventListener("click", function () {
    var a = clampStep(aSweetOf(state.w), A_MIN, A_MAX, A_STEP);
    state.a = a; inA.value = a; update(true);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.w; inA.value = state.a; update(true);
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
    if (k === "s" || k === "S") { $("set").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (k === "]") { nudge("a", -A_STEP * 3, A_MIN, A_MAX, A_STEP, inA); }   // load forward
    else if (k === "[") { nudge("a", A_STEP * 3, A_MIN, A_MAX, A_STEP, inA); }     // load back
    else if (k === "=" || k === "+") { nudge("w", W_STEP * 4, W_MIN, W_MAX, W_STEP, inW); }
    else if (k === "-" || k === "_") { nudge("w", -W_STEP * 4, W_MIN, W_MAX, W_STEP, inW); }
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
  inW.value = state.w; inA.value = state.a;
  update(false);
})();
