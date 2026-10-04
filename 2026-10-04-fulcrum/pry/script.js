/* Fulcrum · pry — the bench.
 *
 * A pry bar is a first-class lever: the fulcrum sits between the effort and the load, so
 * a push down on the long arm lifts a weight up on the short one — the one class that
 * reverses a force. The whole machine is one ratio, the arms about the fulcrum:
 *
 *   advantage   MA = effort arm ⁄ load arm        (pure geometry)
 *   force       F_load = E · MA                   (lifts when F_load ≥ W)
 *   travel      d_load = d_hand ⁄ MA              (work conserved: E·d = W·d⁄MA)
 *
 * Move the fulcrum toward the slab and MA climbs — vast force, a sliver of lift. Move it
 * toward the hands and the slab runs free but will not shift. The furthest placement
 * that still lifts is the least advantage that does the job, bought back as the longest
 * stroke. The bar is idealised rigid and weightless and the pivot frictionless, but the
 * arithmetic is exact: F_load = E·(effort arm ⁄ load arm), and the lift is the hand
 * travel divided by that same ratio.
 */
(function () {
  "use strict";

  // ---- the bar, the heave, the slab -----------------------------------
  var EFFORT = 200;            // the heave you can bear down, N — fixed: one person
  var D_HAND = 300;            // the hand travel per heave, mm — fixed
  var NIB = 60;               // a lift under this (mm) is a nibble, not a stroke
  var MARGIN = 1.08;          // "set the stone" leaves this much force in hand
  var W_MIN = 40, W_MAX = 400, W_STEP = 5;    // slab weight, N
  var F_MIN = 8, F_MAX = 92, F_STEP = 1;      // fulcrum position from the LOAD end, %

  var DEFAULT = { w: 240, f: 50 };            // a heavy slab, fulcrum mid-bar — it strains
  var KEY = "fulcrum.pry.v1";

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
        f: clampStep(o.f, F_MIN, F_MAX, F_STEP)
      };
    } catch (e) { return null; }
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the one law -----------------------------------------------------
  function fLiftOf(w) { return 100 / (1 + w / EFFORT); }           // furthest fulcrum that lifts
  function fSweetOf(w) { return clamp(100 / (1 + (w / EFFORT) * MARGIN), F_MIN, F_MAX); }

  function compute(s) {
    var f = s.f, w = s.w;
    var loadArm = f, effortArm = 100 - f;
    var MA = effortArm / loadArm;
    var delivered = EFFORT * MA;
    var lifts = delivered >= w - 1e-9;
    var lift = D_HAND / MA;                       // mm the slab rises per heave
    var needMA = w / EFFORT;
    var nibMA = D_HAND / NIB;

    var regime = !lifts ? "strain" : (MA > nibMA ? "nibble" : "heave");

    return {
      f: f, w: w, loadArm: loadArm, effortArm: effortArm, MA: MA,
      delivered: delivered, lifts: lifts, lift: lift, needMA: needMA, nibMA: nibMA,
      fLift: fLiftOf(w), fSweet: fSweetOf(w), regime: regime
    };
  }

  function verdictOf(r) { return r.regime; }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-w"), inF = $("in-f");
  var labW = $("lab-w"), labF = $("lab-f");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var fMark = $("f-mark"), fNote = $("f-note");

  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function n0(x) { return Math.round(x).toString(); }
  function mm(x) { return x >= 100 ? Math.round(x) + " mm" : n1(x) + " mm"; }

  var W_WORD = function (v) {
    if (v < 110) return "light"; if (v < 210) return "fair";
    if (v < 320) return "heavy"; return "massive";
  };
  var F_WORD = function (r) {
    if (r.f < 20) return "at the slab"; if (r.f < 40) return "short side";
    if (r.f < 60) return "mid-bar"; if (r.f < 78) return "long side"; return "at the hands";
  };

  function syncLabels(r) {
    labW.textContent = W_WORD(state.w);
    labF.textContent = F_WORD(r);
  }

  var VERDICT_TEXT = {
    heave:  { cls: "v-keep",  word: "Heaves",  note: "lifts, and lifts a useful stroke" },
    nibble: { cls: "v-drift", word: "Nibbles", note: "lifts a hair — re-set and go again" },
    strain: { cls: "v-dead",  word: "Strains", note: "too little advantage — it won't rise" }
  };

  function render(r) {
    var verdict = verdictOf(r);
    var v = VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var maClass = verdict === "heave" ? "good" : verdict === "nibble" ? "warn" : "bad";
    var fClass = r.lifts ? (verdict === "nibble" ? "warn" : "good") : "bad";
    var liftClass = verdict === "heave" ? "good" : verdict === "nibble" ? "warn" : "bad";

    var rows = [
      ['Advantage <span class="tag b">MA</span>', n1(r.MA) + '×<span class="unit"> · need ≥ ' + n1(r.needMA) + "×</span>", maClass],
      ["Force to slab", n0(r.delivered) + ' N<span class="unit"> · slab ' + n0(r.w) + " N</span>", fClass],
      ["Lift per heave", (r.lifts ? mm(r.lift) : "—") + '<span class="unit"> · hand ' + n0(D_HAND) + " mm</span>", liftClass],
      ['Arms <span class="tag">e</span>:<span class="tag load">l</span>', n0(r.effortArm) + " : " + n0(r.loadArm) + '<span class="unit"> · of the bar</span>', ""],
      ["Direction", "reversed" + '<span class="unit"> · down lifts up</span>', ""],
      ["Lifts out to", n0(r.fLift) + '<span class="unit"> % · then it strains</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markF(r);
    return verdict;
  }

  function markF(r) {
    if (!fMark || !fNote) return;
    var lift = r.fLift;
    fMark.style.left = (clamp(lift, F_MIN, F_MAX) - F_MIN) / (F_MAX - F_MIN) * 100 + "%";
    fMark.className = "x-mark";
    if (r.f <= Math.round(r.fSweet) + 1e-6 && r.lifts && r.regime !== "nibble")
      fNote.innerHTML = "set the stone at <b>" + n0(r.fSweet) + "%</b> — least advantage";
    else if (!r.lifts)
      fNote.innerHTML = "move toward the slab, below <b>" + n0(r.fLift) + "%</b>, to lift";
    else
      fNote.innerHTML = "the furthest fulcrum that lifts: <b>" + n0(r.fLift) + "%</b>";
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

  var tCur = 0;          // seconds through the heave animation, looped
  var LOOP = 3.2;        // one heave, then a beat

  // eased heave progress 0 → 1 → 0 across the loop
  function heaveP() {
    if (reduce) return 1;
    var t = tCur % LOOP;
    var up = 1.5, hold = 0.5;
    if (t < up) { var x = t / up; return x * x * (3 - 2 * x); }
    if (t < up + hold) return 1;
    var d = (t - up - hold) / (LOOP - up - hold);
    d = clamp(d, 0, 1); var y = 1 - d; return y * y * (3 - 2 * y);
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
    var accent = verdict === "strain" ? col.dead : verdict === "nibble" ? col.drift : col.keep;
    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, r, verdict);
    drawWork(col, accent, r, verdict);
    drawGauge(col, accent, r);
  }

  // ---- the scene: a bar across a fulcrum, slab left, heave right -------
  function drawScene(col, accent, r, verdict) {
    var p = heaveP();
    var x0 = 34, x1 = 268, yBar = 150;          // bar at rest, load end left, hand end right
    var fx = x0 + (x1 - x0) * (r.f / 100);       // the fulcrum, at fraction f from the load end
    var fy = yBar;

    // fixed hand drop per heave; slab rises hand drop ⁄ MA (nothing if it strains)
    var handDrop = verdict === "strain" ? 7 * Math.sin(tCur * 7) * (reduce ? 0 : 1) : 30 * p;
    var effPx = (x1 - fx);                        // effort arm, pixels
    var theta = verdict === "strain" ? 0 : (effPx > 1 ? handDrop / effPx : 0);

    function rot(px, py) {
      var dx = px - fx, dy = py - fy;
      return [fx + dx * Math.cos(theta) - dy * Math.sin(theta),
              fy + dx * Math.sin(theta) + dy * Math.cos(theta)];
    }
    // clockwise rotation (hand right goes down, load left goes up) → positive theta with y down
    var P0 = rot(x0, yBar), P1 = rot(x1, yBar);

    // the ground the fulcrum stands on
    ctx.strokeStyle = withAlpha(col.faint, 0.4); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(10, yBar + 70); ctx.lineTo(W / 2 + 20, yBar + 70); ctx.stroke();
    ctx.setLineDash([]);

    // the fulcrum — a brass wedge
    ctx.fillStyle = withAlpha(col.brass, 0.85); ctx.strokeStyle = col.brass2; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 2); ctx.lineTo(fx - 16, yBar + 70); ctx.lineTo(fx + 16, yBar + 70);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    label(ctx, col.brass2, "fulcrum", fx, yBar + 86, "center");

    // the swept arcs (where each end can travel), faint
    ctx.strokeStyle = withAlpha(col.effort, 0.18); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    arcHint(P1, fx, fy, 1); arcHint(P0, fx, fy, -1);
    ctx.setLineDash([]);

    // the bar
    ctx.strokeStyle = withAlpha(col.effort, 0.92); ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke();

    // the slab on the short (load) arm
    var slabW = 34, slabH = clamp(10 + r.w / 11, 14, 46);
    ctx.save();
    ctx.translate(P0[0], P0[1]); ctx.rotate(theta);
    var slamNow = verdict === "strain";
    ctx.fillStyle = withAlpha(col.load, slamNow ? 0.9 : 0.8);
    ctx.strokeStyle = col.load2; ctx.lineWidth = 1.4;
    roundRect(-slabW / 2, -slabH - 4, slabW, slabH, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
    label(ctx, col.load2, n0(r.w) + " N", P0[0], P0[1] - slabH - 12, "center");

    // the heave: a downward arrow on the long (effort) arm
    ctx.strokeStyle = withAlpha(col.effort2, 0.9); ctx.fillStyle = col.effort2; ctx.lineWidth = 2;
    var hx = P1[0], hy0 = P1[1] - 44, hy1 = P1[1] - 12;
    ctx.beginPath(); ctx.moveTo(hx, hy0); ctx.lineTo(hx, hy1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 4, hy1 - 6); ctx.lineTo(hx, hy1); ctx.lineTo(hx + 4, hy1 - 6); ctx.stroke();
    label(ctx, col.effort2, "heave " + n0(EFFORT) + " N", hx, hy0 - 6, "center");

    // read the two ends
    var up = P0[1] < yBar - 0.5;
    label(ctx, up ? col.keep : col.faint, "load ↑", P0[0], P0[1] + 30, "center");
    label(ctx, col.faint, "effort ↓", P1[0], P1[1] + 30, "center");

    if (slamNow && !reduce) {
      // a "won't give" shudder mark at the slab
      ctx.strokeStyle = col.dead; ctx.lineWidth = 1.6;
      for (var s = 0; s < 3; s++) {
        var yy = P0[1] - slabH - 4 + s * (slabH / 3);
        ctx.beginPath(); ctx.moveTo(P0[0] - slabW / 2 - 7, yy); ctx.lineTo(P0[0] - slabW / 2 - 2, yy); ctx.stroke();
      }
    }
  }

  function arcHint(P, fx, fy, dir) {
    var rad = Math.hypot(P[0] - fx, P[1] - fy);
    var a0 = Math.atan2(P[1] - fy, P[0] - fx);
    ctx.beginPath(); ctx.arc(fx, fy, rad, a0 - dir * 0.16, a0 + dir * 0.02); ctx.stroke();
  }

  // ---- the work bars: force × distance in = out (equal areas) ----------
  // You exert only what the slab demands: F = W ⁄ MA, through your full stroke d_hand;
  // the slab takes W through d_hand ⁄ MA. The two areas are equal — that is the law.
  function drawWork(col, accent, r, verdict) {
    var bx = 300, by = 40, bw = 236, bh = 214;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the trade — equal work, either end", bx + 12, by + 18, "left");

    var areaTop = by + 42, areaH = bh - 92, baseY = areaTop + areaH;
    var exerted = r.w / r.MA;                     // force you actually exert to lift W
    var maxForce = Math.max(r.w, exerted, 1);
    var fScale = 64 / maxForce;                   // px per newton, for the widths
    var dScale = areaH / 360;                     // px per mm, for the heights

    // effort: force (W⁄MA) wide, stroke (d_hand) tall
    var exW = Math.max(6, exerted * fScale), exH = Math.min(areaH, D_HAND * dScale);
    var lift = r.lifts ? r.lift : 0;
    var lxW = Math.max(6, r.w * fScale), lxH = verdict === "strain" ? 3 : Math.min(areaH, lift * dScale);

    var xa = bx + 26, xb = bx + bw - 26 - lxW;
    // effort bar (steel)
    ctx.fillStyle = withAlpha(col.effort, 0.3); ctx.strokeStyle = col.effort2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(xa, baseY - exH, exW, exH); ctx.fill(); ctx.stroke();
    label(ctx, col.effort2, "effort", xa + exW / 2, baseY + 16, "center");
    label(ctx, col.faint, n0(exerted) + "N × " + n0(D_HAND) + "mm", xa + exW / 2, areaTop - 8, "center");

    // slab bar (terracotta)
    ctx.fillStyle = withAlpha(col.load, 0.3); ctx.strokeStyle = col.load2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(xb, baseY - lxH, lxW, lxH); ctx.fill(); ctx.stroke();
    label(ctx, col.load2, "slab", xb + lxW / 2, baseY + 16, "center");
    label(ctx, col.faint, verdict === "strain" ? "won't lift" : n0(r.w) + "N × " + n0(lift) + "mm",
      xb + lxW / 2, areaTop - 8, "center");

    label(ctx, col.brass2, "=", bx + bw / 2, baseY - areaH / 2, "center");
    var msg = verdict === "strain" ? "the slab refuses the work"
      : verdict === "nibble" ? "all force, almost no travel" : "force gained, travel spent";
    label(ctx, verdict === "strain" ? col.dead : verdict === "nibble" ? col.drift : col.keep,
      msg, bx + 12, by + bh - 10, "left");
  }

  // ---- the gauge: mechanical advantage against what the slab needs -----
  function drawGauge(col, accent, r) {
    var bx = 24, by = 300, bw = W - 48, bh = 150;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "advantage  MA = effort arm ⁄ load arm", bx + 14, by + 20, "left");

    var gx0 = bx + 40, gx1 = bx + bw - 30, gy = by + 74;
    var maMax = 10;
    var xFor = function (m) { return gx0 + clamp(m, 0, maMax) / maMax * (gx1 - gx0); };

    // bands: below need → strains; need..nib → heaves (green); above nib → nibbles
    var xNeed = xFor(r.needMA), xNib = xFor(Math.min(r.nibMA, maMax));
    ctx.fillStyle = withAlpha(col.dead, 0.12); ctx.fillRect(gx0, gy - 12, xNeed - gx0, 24);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(xNeed, gy - 12, xNib - xNeed, 24);
    ctx.fillStyle = withAlpha(col.drift, 0.12); ctx.fillRect(xNib, gy - 12, xFor(maMax) - xNib, 24);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy - 12, xFor(maMax) - gx0, 24);

    // the MA = 1 reference (no advantage either way)
    var x1 = xFor(1);
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(x1, gy - 16); ctx.lineTo(x1, gy + 16); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "1× · even", x1, gy + 34, "center");

    // the "need" line — the least advantage that lifts this slab
    ctx.strokeStyle = withAlpha(col.keep, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xNeed, gy - 18); ctx.lineTo(xNeed, gy + 18); ctx.stroke();
    label(ctx, col.keep, "need " + n1(r.needMA) + "×", xNeed, gy + 50, "center");
    label(ctx, col.faint, "strains", (gx0 + xNeed) / 2, gy - 20, "center");
    label(ctx, col.faint, "nibbles", (xNib + xFor(maMax)) / 2, gy - 20, "center");

    // the needle at the current MA
    var nX = xFor(r.MA);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 16); ctx.lineTo(nX, gy + 16); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 16, 3.4, 0, Math.PI * 2); ctx.fill();
    label(ctx, accent, n1(r.MA) + "×", nX, gy - 24, "center");

    label(ctx, col.faint, "0", gx0, gy + 34, "left");
    label(ctx, col.faint, maMax + "×", gx1, gy + 34, "right");
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
      var head = "A " + W_WORD(r.w) + " slab of " + n0(r.w) + " newtons, the fulcrum "
        + F_WORD(r) + ", giving a " + n1(r.MA) + " to one advantage against a heave of "
        + n0(EFFORT) + " newtons. ";
      var tail;
      if (verdict === "heave") {
        tail = "Heaves — the bar delivers " + n0(r.delivered) + " newtons, past the weight, and the slab rises about "
          + mm(r.lift) + " for the push. This is the aim: it lifts, and through a useful stroke.";
      } else if (verdict === "nibble") {
        tail = "Nibbles — the advantage is more than the slab needs, so it lifts easily but only " + mm(r.lift)
          + ", and you must re-set the bar and heave again. Move the fulcrum out, toward " + n0(r.fSweet)
          + " percent, to trade force back for stroke.";
      } else {
        tail = "Strains — the advantage, " + n1(r.MA) + " to one, is below the " + n1(r.needMA)
          + " the slab needs, so the bar delivers only " + n0(r.delivered) + " newtons and it will not rise. Move the fulcrum toward the slab, below "
          + n0(r.fLift) + " percent.";
      }
      sayEl.textContent = head + tail;
    }, 260);
  }

  inW.addEventListener("input", function () { state.w = clampStep(inW.value, W_MIN, W_MAX, W_STEP); update(true); });
  inF.addEventListener("input", function () { state.f = clampStep(inF.value, F_MIN, F_MAX, F_STEP); update(true); });

  $("set").addEventListener("click", function () {
    var f = clampStep(fSweetOf(state.w), F_MIN, F_MAX, F_STEP);
    state.f = f; inF.value = f; update(true);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.w; inF.value = state.f; update(true);
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
    else if (k === "]") { nudge("f", -F_STEP * 3, F_MIN, F_MAX, F_STEP, inF); }   // toward the slab
    else if (k === "[") { nudge("f", F_STEP * 3, F_MIN, F_MAX, F_STEP, inF); }     // toward the hands
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
  inW.value = state.w; inF.value = state.f;
  update(false);
})();
