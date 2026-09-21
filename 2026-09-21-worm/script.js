/* Worm — the bench.
 *
 * A worm is a screw meshing with a toothed wheel. Unroll one turn of its thread and
 * it is a straight ramp of lead angle λ; every tooth of the wheel is a block riding
 * that ramp, and the whole gear is the old question of a block on an incline. One
 * angle sets everything:
 *
 *   drive eff.    η  = tan λ ⁄ tan(λ + ρ)      (the worm turning the wheel)
 *   back-drive    η′ = tan(λ − ρ) ⁄ tan λ      (the wheel trying to turn the worm)
 *   self-lock     λ ≤ ρ,   ρ = arctan μ        (the load cannot drive it back)
 *
 * The friction angle ρ = arctan μ is the critical incline: a ramp shallower than ρ
 * will not let its load slide back, so the worm holds itself exactly while λ ≤ ρ.
 * The finer the lead that locks it, the lower the drive efficiency — most of the
 * work becomes heat — so the same angle that buys the hold spends the efficiency.
 * These are the ideal square-thread figures; a real worm meets its wheel at a
 * pressure angle that raises the effective friction a little (μ′ = μ⁄cos φₙ), but
 * the shape is exact. Angles in degrees at the surface, for the reader.
 */
(function () {
  "use strict";

  var DEG = Math.PI / 180;

  // Each friction state is a coefficient at the mesh; the friction angle ρ = arctan μ
  // falls straight out of it. Stylised, but the ordering and the magnitudes are real:
  // an oil bath barely self-locks, dry steel locks over a wide band of leads.
  var FRIC = {
    oilbath: { label: "oil bath",    short: "oil bath",   mu: 0.03 },
    greased: { label: "greased",     short: "greased",    mu: 0.05 },
    dry:     { label: "bronze, dry", short: "bronze dry", mu: 0.09 },
    steel:   { label: "steel, dry",  short: "steel dry",  mu: 0.15 }
  };

  // Opens on a bronze, dry mesh with a modest lead that self-locks with margin —
  // a holding worm. Find the hold raises the lead to the steepest that still locks.
  var DEFAULT = { fric: "dry", lambda: 3, teeth: 40 };
  var LMIN = 1, LMAX = 24, LSTEP = 0.5;         // lead angle, degrees
  var TMIN = 20, TMAX = 80, TSTEP = 2;          // wheel teeth (single-start worm)
  var FIND_MARGIN = 1.0;                        // degrees under ρ a found lead aims to sit
  var SMOTHER = 0.20;                           // below this drive efficiency, buried (mostly heat)
  var CREEP = 0.20;                             // back-drive efficiency below this: creeps, not runs
  var KEY = "worm.gear.v1";                     // where the mesh, lead and wheel are kept between visits

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    return v < a ? a : v > b ? b : v;
  }
  function rhoDeg(fric) { return Math.atan(FRIC[fric].mu) / DEG; }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!FRIC[o.fric]) return null;
      return {
        fric: o.fric,
        lambda: clampStep(o.lambda, LMIN, LMAX, LSTEP),
        teeth: clampStep(o.teeth, TMIN, TMAX, TSTEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var F = FRIC[s.fric];
    var lam = s.lambda * DEG, rho = Math.atan(F.mu);
    var etaF = Math.tan(lam) / Math.tan(lam + rho);          // drive: worm turns wheel
    var etaB = Math.tan(lam - rho) / Math.tan(lam);          // back-drive: wheel turns worm
    var selfLock = s.lambda <= rho / DEG + 1e-9;
    return {
      F: F, lamDeg: s.lambda, rhoDeg: rho / DEG, teeth: s.teeth,
      etaF: etaF, etaB: etaB, selfLock: selfLock,
      margin: rho / DEG - s.lambda                           // + holds, − runs back
    };
  }

  // the steepest lead that still self-locks with a small margin — sits just under ρ,
  // where a self-locking lead reaches its highest efficiency.
  function findHold(s) {
    var target = rhoDeg(s.fric) - FIND_MARGIN;
    target = Math.floor(target / LSTEP) * LSTEP;
    return clamp(target, LMIN, LMAX);
  }

  function verdictOf(r) {
    if (r.selfLock) return r.etaF < SMOTHER ? "buried" : "holds";
    return r.etaB < CREEP ? "creeps" : "runs";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inLam = $("in-lambda"), inTeeth = $("in-teeth");
  var labLam = $("lab-lambda"), labTeeth = $("lab-teeth");
  var fricBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-fric]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var lMark = $("l-mark"), lNote = $("l-note");

  function pct(x) { return Math.round(clamp(x, 0, 1) * 100) + "%"; }
  function deg(x) { return x.toFixed(1) + "°"; }

  function syncLabels() {
    labLam.textContent = deg(state.lambda);
    labTeeth.textContent = state.teeth + " teeth";
    fricBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.fric === state.fric));
    });
  }

  var VERDICT_TEXT = {
    holds:  { cls: "v-keep",  word: "Holds",     note: "lead under the friction angle" },
    buried: { cls: "v-drift", word: "Buried",    note: "self-locks, but mostly heat" },
    creeps: { cls: "v-drift", word: "Creeps",    note: "just past the hold — a light brake holds it" }
  };
  var RUNS = { cls: "v-dead", word: "Runs back", note: "the load runs the worm back and drops" };

  function effClass(e) { return e >= 0.5 ? "good" : e >= SMOTHER ? "warn" : "bad"; }

  function render(r) {
    var verdict = verdictOf(r);
    var v = verdict === "runs" ? RUNS : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var backVal = r.selfLock
      ? 'self-locks<span class="unit"> · load held</span>'
      : 'overhauls<span class="unit"> · η′ ' + pct(r.etaB) + "</span>";
    var backClass = r.selfLock ? "good" : verdict === "creeps" ? "warn" : "bad";
    var marginVal = r.margin >= 0
      ? "holds by " + deg(r.margin)
      : "over by " + deg(-r.margin);

    var rows = [
      ["Lead angle", deg(r.lamDeg) + '<span class="unit"> · of thread</span>', ""],
      ["Reduction", r.teeth + " : 1" + '<span class="unit"> · single start</span>', ""],
      ['Drive <span class="tag">eff.</span>', pct(r.etaF) + '<span class="unit"> · η = tan λ ⁄ tan(λ+ρ)</span>', effClass(r.etaF)],
      ['Friction <span class="tag c">ρ</span>', deg(r.rhoDeg) + '<span class="unit"> · ' + r.F.short + "</span>", ""],
      ["Hold margin", marginVal + '<span class="unit"> · ρ − λ</span>', r.margin >= 0 ? "good" : "bad"],
      ["Back-drive", backVal, backClass]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markLead(r);
    return verdict;
  }

  // mark, under the lead slider, the steepest lead this friction still holds (= ρ − margin)
  function markLead(r) {
    if (!lMark || !lNote) return;
    var opt = findHold(state);
    lMark.style.left = ((opt - LMIN) / (LMAX - LMIN) * 100) + "%";
    lMark.className = "x-mark";
    if (Math.abs(opt - state.lambda) <= 0.5) lNote.innerHTML = "the steepest lead that still holds: <b>" + deg(opt) + "</b>";
    else if (state.lambda <= r.rhoDeg) lNote.innerHTML = "holds — up to <b>" + deg(opt) + "</b> and still locking";
    else lNote.innerHTML = "runs back past <b>" + deg(r.rhoDeg) + "</b> — the friction angle";
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

  var phase = 0;                                 // running angle of the drive

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var held = cur.selfLock;
    var accent = verdict === "holds" ? col.keep : verdict === "runs" ? col.dead : col.drift;

    ctx.clearRect(0, 0, W, H);

    drawScene(col, accent, cur, verdict);
    drawRamp(col, accent, cur);
    drawCurve(col, cur);
    drawGauge(col, accent, cur);
  }

  // ---- the worm, the wheel, and the load it lifts ----------------------
  function drawScene(col, accent, cur, verdict) {
    var wormY = 118, wormX0 = 60, wormX1 = 196;
    var wc = { x: 326, y: 118, r: 72 };
    var held = cur.selfLock;

    label(ctx, col.faint, "the drive you put in", wormX0, 40, "left");

    // ---- the worm (screw) ----
    var body = 26;
    ctx.fillStyle = withAlpha(col.iron, 0.16);
    roundRect(wormX0, wormY - body / 2, wormX1 - wormX0, body, 7); ctx.fill();
    ctx.strokeStyle = withAlpha(col.iron, 0.5); ctx.lineWidth = 1.4;
    roundRect(wormX0, wormY - body / 2, wormX1 - wormX0, body, 7); ctx.stroke();
    // the thread — its slant is the lead angle; it advances with the drive
    ctx.save();
    ctx.beginPath();
    roundRect(wormX0 + 1, wormY - body / 2 + 1, wormX1 - wormX0 - 2, body - 2, 6); ctx.clip();
    var slantP = Math.tan(clamp(cur.lamDeg, 1, 24) * DEG) * body; // horizontal shift across the body
    var pitch = 15, off = (phase * 20) % pitch;
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 2;
    for (var x = wormX0 - body; x < wormX1 + body; x += pitch) {
      ctx.beginPath();
      ctx.moveTo(x + off, wormY + body / 2);
      ctx.lineTo(x + off + slantP, wormY - body / 2);
      ctx.stroke();
    }
    ctx.restore();
    // the worm's shaft
    ctx.strokeStyle = withAlpha(col.faint, 0.7); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(wormX0 - 16, wormY); ctx.lineTo(wormX0, wormY); ctx.stroke();
    ctx.lineCap = "butt";
    // the drive arrow
    curvedArrow(ctx, accent, wormX0 - 8, wormY, 12, phase, held ? 1 : (verdict === "runs" ? -1 : 1));
    label(ctx, col.soft, "worm", wormX0 + (wormX1 - wormX0) / 2, wormY + body / 2 + 16, "center");
    label(ctx, col.iron2, "lead " + deg(cur.lamDeg), wormX0 + (wormX1 - wormX0) / 2, wormY - body / 2 - 8, "center");

    // ---- the worm wheel ----
    var wheelAng = (held ? phase * 0.18 : (verdict === "runs" ? -phase * 0.5 : phase * 0.14));
    drawGear(wc.x, wc.y, wc.r, Math.min(cur.teeth, 72), wheelAng, col);
    label(ctx, col.soft, "wheel · " + cur.teeth + " teeth", wc.x, wc.y + wc.r + 20, "center");

    // ---- the cord and the load ----
    var cordX = wc.x + wc.r - 2, topY = wc.y, loadY = 196;
    ctx.strokeStyle = withAlpha(col.timber2, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cordX, topY); ctx.lineTo(cordX, loadY); ctx.stroke();
    var lw = 34, lh = 26;
    ctx.fillStyle = withAlpha(col.timber, verdict === "runs" ? 0.34 : 0.2);
    roundRect(cordX - lw / 2, loadY, lw, lh, 4); ctx.fill();
    ctx.strokeStyle = withAlpha(col.timber2, 0.8); ctx.lineWidth = 1.4;
    roundRect(cordX - lw / 2, loadY, lw, lh, 4); ctx.stroke();
    label(ctx, col.timber2, "load", cordX + lw / 2 + 8, loadY + lh / 2 + 4, "left");
    // where the load goes when you let go
    if (verdict === "runs") {
      arrow(ctx, col.dead, cordX, loadY + lh + 6, cordX, loadY + lh + 22, 2, 7);
      label(ctx, col.dead, "drops", cordX + lw / 2 + 8, loadY + lh + 18, "left");
    } else {
      arrow(ctx, held ? col.keep : col.drift, cordX, topY - 2, cordX, topY - 16, 2, 6);
      label(ctx, held ? col.keep : col.drift, held ? "held" : "creeps", cordX + lw / 2 + 8, loadY + lh / 2 + 20, "left");
    }
  }

  // a gear: a toothed circle with a hub, turned by `ang`
  function drawGear(cx, cy, r, teeth, ang, col) {
    var ri = r - 7, rh = r * 0.34;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a0 = (i / teeth) * 2 * Math.PI, a1 = ((i + 0.5) / teeth) * 2 * Math.PI;
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri);
      var a2 = ((i + 1) / teeth) * 2 * Math.PI;
      ctx.lineTo(Math.cos(a2) * ri, Math.sin(a2) * ri);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(col.iron, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(col.iron, 0.55); ctx.lineWidth = 1.4; ctx.stroke();
    // hub + a spoke, so the turn is visible
    ctx.beginPath(); ctx.arc(0, 0, rh, 0, 2 * Math.PI);
    ctx.strokeStyle = withAlpha(col.iron2, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -rh);
    ctx.strokeStyle = withAlpha(col.iron2, 0.7); ctx.stroke();
    ctx.restore();
    // the axle
    ctx.fillStyle = col.field2;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
  }

  // ---- the unrolled thread: a block on the incline, and the friction cone ----
  function drawRamp(col, accent, cur) {
    var bx = 24, by = 226, bw = 356, bh = 166;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "one turn of the thread, unrolled", bx + 12, by + 18, "left");

    var A = { x: bx + 34, y: by + bh - 30 }, len = 250;
    var lam = clamp(cur.lamDeg, 1, 24) * DEG, rho = cur.rhoDeg * DEG;
    var B = { x: A.x + len * Math.cos(lam), y: A.y - len * Math.sin(lam) };

    // the base and the incline
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(A.x + len, A.y); ctx.stroke();
    // the critical ramp at the friction angle ρ (dashed) — the steepest that still holds
    var C = { x: A.x + (len - 40) * Math.cos(rho), y: A.y - (len - 40) * Math.sin(rho) };
    ctx.strokeStyle = withAlpha(col.timber2, 0.7); ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(C.x, C.y); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.timber2, "ρ " + deg(cur.rhoDeg), C.x + 6, C.y - 2, "left");
    // the incline itself
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    label(ctx, col.iron2, "λ " + deg(cur.lamDeg), A.x + 40, A.y - 8, "left");

    // the block riding the incline
    var t = 0.52, P = { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    var ux = Math.cos(lam), uy = -Math.sin(lam);          // up-slope unit
    var nx = Math.sin(lam), ny = Math.cos(lam);           // outward normal (up from slope)
    var s = 15;
    var held = cur.selfLock;
    // seat the block a little off the slope, along the outward normal
    var bc = { x: P.x + nx * (s * 0.7), y: P.y - ny * (s * 0.7) };
    drawSquare(bc, ux, uy, nx, ny, s, held ? col.keep : col.dead, col);

    // the friction cone about the outward normal (± ρ), and the weight vector
    // weight straight down
    arrow(ctx, col.timber2, bc.x, bc.y, bc.x, bc.y + 34, 1.6, 6);
    label(ctx, col.timber2, "weight", bc.x - 6, bc.y + 40, "right");
    // normal
    ctx.strokeStyle = withAlpha(col.faint, 0.7); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(bc.x, bc.y); ctx.lineTo(bc.x + nx * 30, bc.y - ny * 30); ctx.stroke();
    ctx.setLineDash([]);
    // cone edges: normal rotated by ± ρ (the reaction can lie anywhere in here)
    coneEdge(bc, nx, ny, rho, col, held);
    coneEdge(bc, nx, ny, -rho, col, held);

    // verdict on the ramp
    var msg = held ? "the weight lies inside the cone — it cannot slide back"
                   : "the weight lies outside the cone — it slides back down";
    label(ctx, held ? col.keep : col.dead, msg, bx + 12, by + bh - 8, "left");
  }

  function drawSquare(c, ux, uy, nx, ny, s, edge, col) {
    var h = s / 2;
    var pts = [
      [c.x - ux * h - nx * h, c.y - uy * h + ny * h],
      [c.x + ux * h - nx * h, c.y + uy * h + ny * h],
      [c.x + ux * h + nx * h, c.y + uy * h - ny * h],
      [c.x - ux * h + nx * h, c.y - uy * h - ny * h]
    ];
    ctx.beginPath();
    for (var i = 0; i < 4; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
    ctx.closePath();
    ctx.fillStyle = withAlpha(edge, 0.18); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.6; ctx.stroke();
  }

  function coneEdge(c, nx, ny, ang, col, held) {
    // the outward normal on screen is (nx, −ny); rotate it by ang for a cone edge
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var vx = nx * ca - (-ny) * sa, vy = (-ny) * ca + nx * sa;
    ctx.strokeStyle = withAlpha(held ? col.keep : col.dead, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + vx * 40, c.y + vy * 40); ctx.stroke();
  }

  // the drive-efficiency curve η(λ), the current lead marked, and the lock boundary ρ
  function drawCurve(col, cur) {
    var ix = 398, iy = 226, iw = 146, ih = 166, pad = 22;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "drive η vs lead", ix + 10, iy + 16, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - 2 * pad, Hc = ih - 2 * pad - 8;
    var xFor = function (d) { return Ox + (d - LMIN) / (LMAX - LMIN) * L; };
    var yFor = function (e) { return Oy - clamp(e, 0, 1) * Hc; };
    var rho = cur.rhoDeg * DEG;

    // self-locking band: leads up to ρ
    var xr = xFor(cur.rhoDeg);
    ctx.fillStyle = withAlpha(col.keep, 0.12);
    ctx.fillRect(Ox, Oy - Hc, xr - Ox, Hc);
    ctx.strokeStyle = withAlpha(col.dead, 0.7); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(xr, Oy - Hc); ctx.lineTo(xr, Oy); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.timber2, "ρ", xr, Oy + 12, "center");

    // the curve
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (var d = LMIN; d <= LMAX + 1e-9; d += 0.5) {
      var lam = d * DEG, e = Math.tan(lam) / Math.tan(lam + rho);
      var px = xFor(d), py = yFor(e);
      if (d <= LMIN + 1e-9) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // half-efficiency line
    ctx.strokeStyle = withAlpha(col.faint, 0.4); ctx.lineWidth = 1; ctx.setLineDash([1, 3]);
    ctx.beginPath(); ctx.moveTo(Ox, yFor(0.5)); ctx.lineTo(Ox + L, yFor(0.5)); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "½", Ox - 4, yFor(0.5) + 3, "right");

    var mx = xFor(cur.lamDeg), my = yFor(cur.etaF);
    ctx.fillStyle = cur.selfLock ? (cur.etaF < SMOTHER ? col.drift : col.keep) : col.dead;
    ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.faint, "fine", Ox, Oy + 12, "left");
    label(ctx, col.faint, "steep", Ox + L, Oy + 12, "right");
  }

  // the gauge: the lead λ against the friction angle ρ (the self-lock threshold)
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 404, bw = W - 48, bh = 54;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 64, gx1 = W - 64, gy = 436, scaleMax = LMAX;
    var xFor = function (d) { return gx0 + clamp(d, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // the green band of leads that still self-lock (up to ρ)
    var gh = xFor(cur.rhoDeg);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gh - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gh - gx0, 16);

    // the wall at the friction angle — past it, the load runs back
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gh, gy - 12); ctx.lineTo(gh, gy + 12); ctx.stroke();
    label(ctx, col.faint, "friction angle ρ", gh, gy + 24, "center");

    label(ctx, col.faint, "fine lead", gx0, gy + 24, "left");
    label(ctx, col.faint, "lead angle λ", (gx0 + gx1) / 2, gy - 15, "center");
    label(ctx, col.faint, "steep ›", gx1, gy + 24, "right");

    // the needle at the current lead
    var nX = xFor(cur.lamDeg);
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
    c.lineCap = "butt";
  }
  // a small curved arrow around a point, to read as rotation; dir +1 / −1
  function curvedArrow(c, color, cx, cy, r, ph, dir) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2;
    var a0 = ph * dir, a1 = a0 + dir * 2.4;
    c.beginPath(); c.arc(cx, cy, r, a0, a1, dir < 0); c.stroke();
    var ex = cx + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r;
    var ta = a1 + dir * Math.PI / 2;
    c.beginPath();
    c.moveTo(ex, ey);
    c.lineTo(ex - 6 * Math.cos(ta - 0.4), ey - 6 * Math.sin(ta - 0.4));
    c.lineTo(ex - 6 * Math.cos(ta + 0.4), ey - 6 * Math.sin(ta + 0.4));
    c.closePath(); c.fill();
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
    // under reduced motion the drive is held still — the worm and wheel do not spin,
    // and each state reads as a settled arrangement rather than a running machine
    if (!reduce) phase += dt * 1.4;
    draw(current, curVerdict);
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
      var head = "A " + r.F.label + " mesh, friction angle " + deg(r.rhoDeg)
        + ", a single-start worm on a " + r.teeth + "-tooth wheel — a " + r.teeth
        + " to 1 reduction — cut to a lead of " + deg(r.lamDeg) + ". ";
      var drive = "It drives the wheel at " + Math.round(r.etaF * 100) + " percent efficiency. ";
      var back;
      if (verdict === "holds") {
        back = "Holds — the lead sits " + deg(r.margin) + " under the friction angle, so the load cannot drive the worm back; the gear holds itself with no brake, at the highest efficiency a self-locking lead allows.";
      } else if (verdict === "buried") {
        back = "Buried — it self-locks, and firmly, " + deg(r.margin) + " under the friction angle, but the lead is so fine that most of the drive is lost to heat and the gear runs hot. Raise the lead toward the friction angle, or find the hold, to keep the lock at more efficiency.";
      } else if (verdict === "creeps") {
        back = "Creeps — the lead has just passed the friction angle by " + deg(-r.margin) + ", so the hold is gone: the load overhauls, slowly, at " + Math.round(r.etaB * 100) + " percent, and a light brake or a touch more friction holds it. Ease the lead, or find the hold, to lock it again.";
      } else {
        back = "Runs back — the lead is " + deg(-r.margin) + " over the friction angle, well past the hold: let go and the load runs the worm backward at " + Math.round(r.etaB * 100) + " percent and drops. This worm must be braked to hold anything. Ease the lead under the friction angle, or find the hold.";
      }
      sayEl.textContent = head + drive + back;
    }, 260);
  }

  inLam.addEventListener("input", function () { state.lambda = clampStep(inLam.value, LMIN, LMAX, LSTEP); update(); });
  inTeeth.addEventListener("input", function () { state.teeth = clampStep(inTeeth.value, TMIN, TMAX, TSTEP); update(); });
  fricBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.fric = bn.dataset.fric; update(); });
  });

  $("find").addEventListener("click", function () {
    var opt = findHold(state);
    state.lambda = opt; inLam.value = opt; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inLam.value = state.lambda; inTeeth.value = state.teeth;
    update();
  });

  // nudge a slider-backed value by a step, from the keyboard
  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clamp(Math.round((state[field] + delta) / step) * step, lo, hi);
    input.value = state[field];
    update();
  }

  // keyboard: work the bench without reaching for the mouse
  var FRIC_KEYS = { "1": "oilbath", "2": "greased", "3": "dry", "4": "steel" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "f" || k === "F") { $("find").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (FRIC_KEYS[k]) { state.fric = FRIC_KEYS[k]; update(); }
    else if (k === "]") { nudge("lambda", LSTEP, LMIN, LMAX, LSTEP, inLam); }        // steeper lead
    else if (k === "[") { nudge("lambda", -LSTEP, LMIN, LMAX, LSTEP, inLam); }       // finer lead
    else if (k === "=" || k === "+") { nudge("teeth", TSTEP, TMIN, TMAX, TSTEP, inTeeth); }   // more teeth
    else if (k === "-" || k === "_") { nudge("teeth", -TSTEP, TMIN, TMAX, TSTEP, inTeeth); }  // fewer teeth
    else return;
    e.preventDefault();
  });

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      draw(current, curVerdict);
    });
  }

  // ---- go --------------------------------------------------------------
  inLam.value = state.lambda; inTeeth.value = state.teeth;
  update();
})();
