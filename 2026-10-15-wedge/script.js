/* Wedge — the bench.
 *
 * A wedge is an inclined plane set moving: two shallow faces meeting at an edge,
 * driven in along their length to force apart whatever they enter. Its advantage is
 * pure taper, and its one trick — holding its own output — is pure friction. The
 * whole of it is one inequality, α against φ, read a few ways:
 *
 *   advantage   MA_ideal = cot α                 (shallower → more force, bought in travel)
 *   drive in    P  = W·tan(α + φ)                (taper and friction, both fought going in)
 *   back out    P' = W·tan(α − φ)                (taper helps, friction still resists)
 *   self-lock   α ≤ φ   where  φ = arctan μ      (the load cannot push it out — it holds)
 *   efficiency  η  = tan α ⁄ tan(α + φ)          (rises with the taper; the hold margin falls)
 *
 * The load W scales the forces but not the regime: whether a wedge holds, labours, or
 * springs is set by the taper α against the friction angle φ alone. The faces idealised
 * as flat and the resistance as a single normal force; the shape is exact. Taper in
 * degrees, load and forces in kN.
 */
(function () {
  "use strict";

  // ---- the faces and their friction -----------------------------------
  // Each pair gives a coefficient μ, and from it a friction angle φ = arctan μ — the
  // width of the cone the taper must stay inside to self-lock. Oiled steel barely
  // locks at all; a rough, rusted pair holds a steep wedge fast.
  var FACES = {
    oiled: { label: "oiled steel", short: "oiled", mu: 0.08 },
    steel: { label: "dry steel",   short: "steel", mu: 0.17 },
    dry:   { label: "dry metal",   short: "dry",   mu: 0.30 },
    rough: { label: "rough, rusted", short: "rough", mu: 0.55 }
  };

  var A_MIN = 2, A_MAX = 38, A_STEP = 0.5;        // taper half-angle α, degrees
  var LOAD_MIN = 0.5, LOAD_MAX = 24, LOAD_STEP = 0.5;  // the resistance W, kN
  var ETA_FLOOR = 0.28;                           // below this efficiency a holding wedge reads thankless
  var DEFAULT = { taper: 12, faces: "dry", load: 8 };
  var KEY = "wedge.bench.v1";                     // where the taper, faces and load are kept between visits

  var DEG = Math.PI / 180, TWO_PI = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    v = Math.round(v * 1e6) / 1e6;
    return v < a ? a : v > b ? b : v;
  }
  // the widest taper still inside the cone this close to the edge reads as "on the edge"
  function edgeDeg(phiDeg) { return Math.max(1.5, 0.15 * phiDeg); }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!FACES[o.faces]) return null;
      return {
        faces: o.faces,
        taper: clampStep(o.taper, A_MIN, A_MAX, A_STEP),
        load: clampStep(o.load, LOAD_MIN, LOAD_MAX, LOAD_STEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the physics -----------------------------------------------------
  function compute(s) {
    var f = FACES[s.faces];
    var aDeg = s.taper, W = s.load;
    var aRad = aDeg * DEG;
    var phiRad = Math.atan(f.mu), phiDeg = phiRad / DEG;

    var maIdeal = 1 / Math.tan(aRad);               // cot α — frictionless advantage / travel ratio
    var drive = W * Math.tan(aRad + phiRad);        // P, force to drive it in, kN
    var maReal = drive > 0 ? W / drive : Infinity;  // cot(α + φ)
    var eta = Math.tan(aRad) / Math.tan(aRad + phiRad);

    var holds = aDeg <= phiDeg;                     // self-locking exactly inside the cone
    // when it holds, extract = the pull needed to draw it back out (W·tan(φ−α));
    // when it springs, the same expression (negated) is the force the load ejects it with
    var backOut = W * Math.tan(aRad - phiRad);      // P' — negative while it holds
    var extract = Math.abs(backOut);
    var margin = phiDeg - aDeg;                      // + holds, − springs

    var edge = edgeDeg(phiDeg);
    var verdict;
    if (!holds) verdict = "springs";
    else if (margin < edge) verdict = "edge";
    else if (eta < ETA_FLOOR) verdict = "thankless";
    else verdict = "holds";

    return {
      f: f, aDeg: aDeg, W: W, phiDeg: phiDeg, phiRad: phiRad,
      maIdeal: maIdeal, maReal: maReal, drive: drive, eta: eta,
      holds: holds, backOut: backOut, extract: extract, margin: margin,
      edge: edge, verdict: verdict
    };
  }

  // the steepest taper that still self-locks with a margin to spare — best efficiency, still held
  function findSeat(s) {
    var f = FACES[s.faces];
    var phiDeg = Math.atan(f.mu) / DEG;
    var target = phiDeg - edgeDeg(phiDeg) * 1.2;    // just outside the "edge" band
    var seat = Math.floor(target / A_STEP) * A_STEP; // snap down so it stays inside the cone
    return clamp(seat, A_MIN, A_MAX);
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inTaper = $("in-taper"), inLoad = $("in-load");
  var labTaper = $("lab-taper"), labLoad = $("lab-load");
  var faceBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-faces]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var tMark = $("t-mark"), tNote = $("t-note");

  function deg(x) { return x.toFixed(1) + "°"; }
  function kn(x) { return (x < 10 ? x.toFixed(1) : Math.round(x)) + " kN"; }
  function times(x) { return "×" + (x < 10 ? x.toFixed(1) : Math.round(x)); }
  function ratio(x) { return "1:" + x.toFixed(x < 10 ? 1 : 0); }
  function pct(x) { return Math.round(x * 100) + "%"; }

  var TAPER_WORD = function (v, phi) {
    if (v > phi) return "too steep";
    if (v < 4) return "very shallow";
    if (v < 9) return "shallow";
    if (v < 18) return "moderate";
    return "steep";
  };

  function syncLabels() {
    labTaper.textContent = deg(state.taper);
    labLoad.textContent = kn(state.load);
    faceBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.faces === state.faces));
    });
  }

  var VERDICT_TEXT = {
    holds:     { cls: "v-keep",  word: "Holds",     note: "driven once, it stays" },
    edge:      { cls: "v-drift", word: "On the edge", note: "it holds, but only just" },
    thankless: { cls: "v-drift", word: "Thankless", note: "it holds, but costs all day" }
  };
  var SPRINGS = { cls: "v-dead", word: "Springs", note: "the load drives it back out" };

  function render(r) {
    var v = r.verdict === "springs" ? SPRINGS : VERDICT_TEXT[r.verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var etaClass = r.verdict === "springs" ? "bad" : (r.verdict === "thankless" || r.verdict === "edge") ? "warn" : "good";
    var holdClass = r.holds ? (r.verdict === "edge" ? "warn" : "good") : "bad";
    var holdVal = r.holds
      ? "φ−α = " + deg(r.margin) + '<span class="unit"> · holds</span>'
      : "α−φ = " + deg(-r.margin) + '<span class="unit"> · springs</span>';

    var rows = [
      ['Taper <span class="tag">α</span>', deg(r.aDeg) + '<span class="unit"> · travel ' + ratio(r.maIdeal) + "</span>", ""],
      ['Friction cone <span class="tag c">φ</span>', deg(r.phiDeg) + '<span class="unit"> · holds if α ≤ φ</span>', ""],
      ['Advantage <span class="tag">MA</span>', times(r.maReal) + '<span class="unit"> · force ÷ push</span>', ""],
      ['Drive-in <span class="tag">P</span>', kn(r.drive) + '<span class="unit"> · W·tan(α+φ)</span>', ""],
      [r.holds ? 'Free it <span class="tag">P′</span>' : 'It ejects <span class="tag">P′</span>',
        (r.holds ? kn(r.extract) + '<span class="unit"> · pull to free</span>'
                 : kn(r.extract) + '<span class="unit"> · load frees it</span>'),
        r.holds ? "good" : "bad"],
      ['Efficiency <span class="tag">η</span>', pct(r.eta) + '<span class="unit"> · work out ÷ in</span>', etaClass],
      ["Holding margin", holdVal, holdClass]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markTaper(r);
    return r.verdict;
  }

  // mark, under the taper slider, the spring line (α = φ) and the recommended seat
  function markTaper(r) {
    if (!tMark || !tNote) return;
    var frac = function (d) { return (clamp(d, A_MIN, A_MAX) - A_MIN) / (A_MAX - A_MIN) * 100; };
    var springOff = r.phiDeg > A_MAX + 1e-6;
    tMark.style.left = frac(r.phiDeg) + "%";
    tMark.className = springOff ? "x-mark off" : "x-mark";

    var seat = findSeat(state);
    seatMark.style.left = frac(seat) + "%";

    if (!r.holds) tNote.innerHTML = "springs — steepen below the cone; it self-locks at <b>" + deg(r.phiDeg) + "</b> and under";
    else if (r.verdict === "edge") tNote.innerHTML = "on the edge of the cone — a safer seat is <b>" + deg(seat) + "</b>";
    else if (Math.abs(state.taper - seat) <= A_STEP + 1e-6) tNote.innerHTML = "the steepest taper that still holds here: <b>" + deg(seat) + "</b>";
    else if (state.taper < seat) tNote.innerHTML = "room to steepen — still holds up to <b>" + deg(seat) + "</b>";
    else tNote.innerHTML = "past the safe seat of <b>" + deg(seat) + "</b> — near the spring line";
  }

  // the seat marker lives beside the spring-line marker on the same track
  var seatMark = document.createElement("span");
  seatMark.className = "x-seat";
  if (tMark && tMark.parentNode) tMark.parentNode.appendChild(seatMark);

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 560, H = 540, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

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

  var phase = 0;   // 0..1 through one drive-and-hold (or drive-and-eject) cycle

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = cur.verdict === "springs" ? col.dead
      : (cur.verdict === "edge" || cur.verdict === "thankless") ? col.drift : col.keep;

    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, cur);
    drawCurve(col, accent, cur);
    drawWork(col, accent, cur);
    drawHoldBar(col, accent, cur);
    drawGauge(col, accent, cur);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ---- the scene: a wedge driven under a load between two rubbing faces ---
  function drawScene(col, accent, cur) {
    var springs = cur.verdict === "springs";
    var edgeCol = springs ? col.dead : col.iron;
    var aRad = cur.aDeg * DEG;

    // the drive-and-hold motion. 0 = out, 1 = fully seated. Holds → drive in, then rest
    // seated; springs → drive in, hold a beat, then get kicked back out; reduced motion →
    // shown at its settled place, each state a single arrangement rather than a running action.
    var driveFrac;
    if (reduce) driveFrac = springs ? 0.22 : 1;
    else if (springs) {
      if (phase < 0.5) driveFrac = easeOut(phase / 0.5);
      else if (phase < 0.64) driveFrac = 1;
      else driveFrac = 1 - easeOut((phase - 0.64) / 0.36);
    } else {
      driveFrac = phase < 0.5 ? easeOut(phase / 0.5) : 1;
    }

    var baseY = 178;                 // the anvil surface the wedge slides on
    var Lw = 172;                    // wedge length, thin edge to thick end
    var travel = 128;                // how far it drives in
    var adv = driveFrac * travel;
    var thickX = 120 + adv;          // the thick (left) end, moving right as it drives
    var edgeX = thickX + Lw;         // the thin edge leads
    var h = clamp(Lw * Math.tan(aRad), 10, 108);   // thick-end height = Lw·tan α

    // ground / anvil
    ctx.fillStyle = withAlpha(col.faint, 0.08);
    roundRect(34, baseY, 496, 26, 0); ctx.fill();
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(34, baseY); ctx.lineTo(530, baseY); ctx.stroke();
    for (var gx = 44; gx < 528; gx += 16) {
      ctx.strokeStyle = withAlpha(col.faint, 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, baseY + 3); ctx.lineTo(gx - 8, baseY + 14); ctx.stroke();
    }

    // the load block, fixed in x, rising as the wedge drives under it
    var blockW = 98, blockCx = 300, blockLeft = blockCx - blockW / 2, blockH = 50;
    // a level block rests on the highest point of the face beneath it — its uphill (left)
    // corner — so the face stays at or below the block, never poking through
    var over = clamp(edgeX - blockLeft, 0, Lw);      // how much wedge sits under the block
    var faceH = clamp(over * Math.tan(aRad), 0, 70); // the lift at the block, capped for the frame
    var blockBottom = baseY - faceH;
    var blockTop = blockBottom - blockH;

    // guides the block rides in
    ctx.strokeStyle = withAlpha(col.faint, 0.26); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(blockLeft - 3, 48); ctx.lineTo(blockLeft - 3, baseY - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(blockLeft + blockW + 3, 48); ctx.lineTo(blockLeft + blockW + 3, baseY - 2); ctx.stroke();
    ctx.setLineDash([]);

    // the wedge — a triangle, thin edge leading, drawn under the block
    ctx.beginPath();
    ctx.moveTo(thickX, baseY);          // bottom-left on the anvil
    ctx.lineTo(edgeX, baseY);           // thin edge on the anvil
    ctx.lineTo(thickX, baseY - h);      // thick end top
    ctx.closePath();
    ctx.fillStyle = withAlpha(edgeCol, 0.16); ctx.fill();
    ctx.strokeStyle = withAlpha(edgeCol, 0.9); ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.stroke();

    // the load block
    ctx.fillStyle = withAlpha(col.iron, 0.14);
    roundRect(blockLeft, blockTop, blockW, blockH, 5); ctx.fill();
    ctx.strokeStyle = withAlpha(col.iron2, 0.7); ctx.lineWidth = 1.5;
    roundRect(blockLeft, blockTop, blockW, blockH, 5); ctx.stroke();
    label(ctx, col.iron2, "load", blockCx + 14, blockTop + blockH / 2 + 4, "center");

    // W, pressing down on the block
    arrow(ctx, col.iron2, blockCx + 14, blockTop - 24, blockCx + 14, blockTop - 6, 1.8, 6);
    label(ctx, col.iron2, "W " + kn(cur.W), blockCx + 14, blockTop - 30, "center");

    // the contact at the block's uphill corner, and the forces there
    var contactX = blockLeft, contactY = blockBottom;
    // N — normal to the face, up-left into the block
    arrow(ctx, col.iron2, contactX, contactY, contactX - 9, contactY - 26, 1.4, 6);
    label(ctx, col.faint, "N", contactX - 14, contactY - 30, "center");
    // f — friction along the face; up the slope while driving in, down it as it ejects
    var flen = springs ? -22 : 22;
    arrow(ctx, col.timber2, contactX, contactY + 2, contactX - Math.cos(aRad) * flen, contactY + 2 + Math.sin(aRad) * flen, 1.4, 5);
    label(ctx, col.timber2, "f = μN", contactX + 8, contactY + 17, "left");

    // P — the push driving the wedge in, on its thick end
    var pCol = springs ? col.dead : col.iron;
    arrow(ctx, pCol, thickX - 34, baseY - h * 0.5, thickX - 6, baseY - h * 0.5, 2.2, 8);
    label(ctx, pCol, "P " + kn(cur.drive), thickX - 36, baseY - h * 0.5 - 10, "center");

    // the taper angle, an arc at the thin edge between anvil and upper face
    ctx.strokeStyle = withAlpha(springs ? col.dead : col.iron2, 0.85); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(edgeX, baseY, 26, Math.PI, Math.PI + aRad, false); ctx.stroke();
    label(ctx, springs ? col.dead : col.iron2, "α " + deg(cur.aDeg), edgeX - 42, baseY - 8, "center");

    // the caption, top-left so it never meets the load label
    if (springs) label(ctx, col.dead, driveFrac < 0.5 ? "it springs back out" : "no hold — the load ejects it", 48, 26, "left");
    else label(ctx, col.keep, cur.verdict === "edge" ? "holds — but only just" : cur.verdict === "thankless" ? "holds — at a punishing drive" : "driven in, it self-locks and holds", 48, 26, "left");
  }

  // ---- the curve: efficiency rises and advantage falls with the taper ---
  function drawCurve(col, accent, cur) {
    var bx = 24, by = 222, bw = 338, bh = 168;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "efficiency η and advantage vs taper", bx + 12, by + 18, "left");

    var Ox = bx + 34, Oy = by + bh - 26, Lx = bw - 34 - 14, Hc = bh - 26 - 30;
    var xFor = function (a) { return Ox + (a - A_MIN) / (A_MAX - A_MIN) * Lx; };
    var yFor = function (v) { return Oy - clamp(v, 0, 1) * Hc; };   // v is a 0..1 fraction
    var springLabelX = -999;   // set when the spring-line label is drawn, so the axis label can dodge it

    // the spring zone: tapers past the cone, where it will not hold
    var springX = xFor(clamp(cur.phiDeg, A_MIN, A_MAX));
    if (cur.phiDeg < A_MAX) {
      ctx.fillStyle = withAlpha(col.dead, 0.09);
      ctx.fillRect(springX, Oy - Hc, xFor(A_MAX) - springX, Hc);
    }
    // the edge band, just inside the cone
    var edgeX0 = xFor(clamp(cur.phiDeg - cur.edge, A_MIN, A_MAX));
    ctx.fillStyle = withAlpha(col.drift, 0.08);
    ctx.fillRect(edgeX0, Oy - Hc, springX - edgeX0, Hc);

    // axes
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + Lx, Oy); ctx.stroke();

    // efficiency η(α) = tan α / tan(α + φ), rising
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.beginPath();
    var k, a, aR;
    for (k = 0; k <= 80; k++) {
      a = A_MIN + (A_MAX - A_MIN) * k / 80; aR = a * DEG;
      var e = Math.tan(aR) / Math.tan(aR + cur.phiRad);
      var x = xFor(a), y = yFor(e);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    label(ctx, col.iron2, "η", xFor(A_MAX) - 2, yFor(Math.tan(A_MAX * DEG) / Math.tan(A_MAX * DEG + cur.phiRad)) - 6, "right");

    // advantage MA(α) = cot(α + φ), falling — normalised to its value at the shallowest taper
    var maTop = 1 / Math.tan((A_MIN * DEG) + cur.phiRad);
    ctx.strokeStyle = withAlpha(col.timber2, 0.9); ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.beginPath();
    for (k = 0; k <= 80; k++) {
      a = A_MIN + (A_MAX - A_MIN) * k / 80; aR = a * DEG;
      var ma = 1 / Math.tan(aR + cur.phiRad);
      var x2 = xFor(a), y2 = yFor(ma / maTop);
      if (k === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
    }
    ctx.stroke(); ctx.setLineDash([]);
    label(ctx, col.timber2, "MA", xFor(A_MIN) + 10, yFor(0.96), "left");

    // the spring line itself, labelled clear of the axis labels
    if (cur.phiDeg < A_MAX) {
      ctx.strokeStyle = withAlpha(col.dead, 0.8); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(springX, Oy - Hc); ctx.lineTo(springX, Oy); ctx.stroke();
      ctx.setLineDash([]);
      var slx = clamp(springX, Ox + 22, Ox + Lx - 22);
      label(ctx, col.dead, "α=φ", slx, Oy + 14, "center");
      springLabelX = slx;
    }

    // where this taper sits, on the efficiency curve
    var cxp = xFor(cur.aDeg), cyp = yFor(clamp(cur.eta, 0, 1));
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(cxp, cyp, 3.6, 0, TWO_PI); ctx.fill();
    ctx.strokeStyle = withAlpha(accent, 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp, Oy); ctx.stroke();

    // the axis label, dropped if the spring-line label would run into it
    if (springLabelX < Ox + Lx - 52) label(ctx, col.faint, "α →", Ox + Lx, Oy + 14, "right");
  }

  // ---- the work panel: the fraction delivered, the rest lost to the faces ---
  function drawWork(col, accent, cur) {
    var ix = 372, iy = 222, iw = 164, ih = 168;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "work in → out", ix + 12, iy + 18, "left");

    var barX = ix + 34, barW = 46, barTop = iy + 34, barBot = iy + ih - 34, barH = barBot - barTop;
    var eta = clamp(cur.eta, 0, 1);

    // the full column is the work you put in; the lower η of it reaches the load,
    // the upper (1−η) is lost to friction in the faces
    var delivered = barH * eta, lost = barH - delivered;
    // lost (top) — friction / heat in the faces
    ctx.fillStyle = withAlpha(col.timber, 0.30);
    roundRect(barX, barTop, barW, lost, 3); ctx.fill();
    // delivered (bottom) — the work that reaches the load
    ctx.fillStyle = withAlpha(cur.verdict === "springs" ? col.dead : col.iron, 0.5);
    ctx.fillRect(barX, barTop + lost, barW, delivered);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    roundRect(barX, barTop, barW, barH, 3); ctx.stroke();
    // the split line
    ctx.strokeStyle = withAlpha(col.ink, 0.25); ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(barX, barTop + lost); ctx.lineTo(barX + barW, barTop + lost); ctx.stroke();
    ctx.setLineDash([]);

    label(ctx, col.timber2, "lost", barX + barW + 8, barTop + lost / 2 + 3, "left");
    label(ctx, col.faint, pct(1 - eta), barX + barW + 8, barTop + lost / 2 + 16, "left");
    label(ctx, cur.verdict === "springs" ? col.dead : col.iron2, "to load", barX + barW + 8, barTop + lost + delivered / 2 + 3, "left");
    label(ctx, accent, pct(eta), barX + barW + 8, barTop + lost + delivered / 2 + 16, "left");

    label(ctx, col.faint, "η = work out ÷ work in", ix + iw / 2, iy + ih - 12, "center");
  }

  // ---- the force bar: what it takes to drive in, and to free it ---------
  // The crux of self-locking, read as two forces on one scale: the push P that
  // drives the wedge in, and what the back-out costs. When it holds, freeing it
  // takes a pull — the load alone cannot; when it springs, the load ejects it.
  function drawHoldBar(col, accent, cur) {
    var bx = 24, by = 404, bw = W - 48, bh = 56;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the force to drive in, and to free it", bx + 12, by + 15, "left");

    var fx0 = 150, fx1 = W - 44;
    var fmax = Math.max(cur.drive, cur.extract, 0.5) * 1.12;
    var len = function (f) { return clamp(f, 0, fmax) / fmax * (fx1 - fx0); };

    // row 1 — the push that drives it in, P = W·tan(α+φ)
    var y1 = by + 30;
    label(ctx, col.ink, "drive in", bx + 12, y1 + 3, "left");
    ctx.fillStyle = withAlpha(cur.verdict === "springs" ? col.dead : col.iron, 0.55);
    roundRect(fx0, y1 - 6, Math.max(2, len(cur.drive)), 10, 3); ctx.fill();
    label(ctx, col.iron2, kn(cur.drive), fx0 + len(cur.drive) + 6, y1 + 3, "left");

    // row 2 — what the back-out costs: a pull to free (holds) or the load's eject (springs)
    var y2 = by + 46;
    label(ctx, col.ink, cur.holds ? "free it" : "it ejects", bx + 12, y2 + 3, "left");
    var bc = cur.holds ? col.timber : col.dead;
    ctx.fillStyle = withAlpha(bc, cur.holds ? 0.5 : 0.55);
    roundRect(fx0, y2 - 6, Math.max(2, len(cur.extract)), 10, 3); ctx.fill();
    var tail = cur.holds ? kn(cur.extract) + " pull — it holds" : kn(cur.extract) + " — the load frees it";
    label(ctx, cur.holds ? col.timber2 : col.dead, tail, fx0 + len(cur.extract) + 6, y2 + 3, "left");

    // the shared zero the bars grow from
    ctx.strokeStyle = withAlpha(col.faint, 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fx0, y1 - 10); ctx.lineTo(fx0, y2 + 10); ctx.stroke();
  }

  // ---- the gauge: the taper against the friction cone -------------------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 474, bw = W - 48, bh = 52;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 60, gx1 = W - 70, gy = 504;
    var xFor = function (a) { return gx0 + clamp(a, A_MIN, A_MAX) / A_MAX * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xFor(0), gy); ctx.lineTo(xFor(A_MAX), gy); ctx.stroke();

    // the self-locking band — tapers up to the friction cone φ
    var cone = clamp(cur.phiDeg, A_MIN, A_MAX);
    var coneX = xFor(cone), zeroX = xFor(0), maxX = xFor(A_MAX);
    ctx.fillStyle = withAlpha(col.keep, 0.20);
    ctx.fillRect(zeroX, gy - 8, coneX - zeroX, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(zeroX, gy - 8, coneX - zeroX, 16);
    // the edge sub-band, just inside the cone
    var edgeX = xFor(clamp(cur.phiDeg - cur.edge, A_MIN, A_MAX));
    ctx.fillStyle = withAlpha(col.drift, 0.26);
    ctx.fillRect(edgeX, gy - 8, coneX - edgeX, 16);
    // past the cone — it springs
    ctx.fillStyle = withAlpha(col.dead, 0.12);
    ctx.fillRect(coneX, gy - 8, maxX - coneX, 16);
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(coneX, gy - 12); ctx.lineTo(coneX, gy + 12); ctx.stroke();
    label(ctx, col.faint, "φ " + deg(cur.phiDeg), coneX, gy + 22, "center");

    label(ctx, col.faint, "taper α inside the friction cone — self-locks left of φ", (gx0 + gx1) / 2, gy - 15, "center");
    label(ctx, col.faint, A_MAX + "°", maxX, gy + 22, "right");

    // the needle at the current taper
    var nX = xFor(cur.aDeg);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, TWO_PI); ctx.fill();
  }

  // ---- small canvas helpers --------------------------------------------
  function roundRect(x, y, w, h, r) {
    if (h < 0) { y += h; h = -h; }
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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
  var lastTs = null;

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    // under reduced motion the wedge is held at its settled place — no drive, no eject;
    // each state read as a single arrangement rather than a running action
    if (!reduce) {
      phase = (phase + dt * 0.26) % 1;   // one drive-and-hold cycle roughly every ~3.8 s
    }
    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
    announce(current);
    save();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var sayTimer = null;
  function announce(r) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = "A " + TAPER_WORD(r.aDeg, r.phiDeg) + " wedge of " + deg(r.aDeg) + " taper on " + r.f.label
        + " faces, against a " + kn(r.W) + " load. The friction cone is " + deg(r.phiDeg)
        + ", so it self-locks at that taper and under. ";
      var figs = "Advantage " + times(r.maReal) + " the push; it takes " + kn(r.drive)
        + " to drive in, and delivers " + pct(r.eta) + " of your work to the load. ";
      var tail;
      if (r.verdict === "holds") {
        tail = "It holds — the taper sits " + deg(r.margin) + " inside the cone, so once driven it stays, and you must pull "
          + kn(r.extract) + " to draw it back out.";
      } else if (r.verdict === "edge") {
        tail = "On the edge — it holds, but the taper is only " + deg(r.margin)
          + " inside the cone, so a film of oil or a little wear would free it. A safer seat is about " + deg(findSeat(state)) + ".";
      } else if (r.verdict === "thankless") {
        tail = "Thankless — it holds fast, but at only " + pct(r.eta)
          + " efficiency: you drive it a long way, most of the work turns to heat in the faces, and it is hard to extract. Steepen the taper toward " + deg(findSeat(state)) + " to deliver more.";
      } else {
        tail = "Springs — the taper is " + deg(-r.margin)
          + " past the cone, so it will not self-lock: the load drives it back out the moment you stop pushing. Steepen below " + deg(r.phiDeg) + " for it to hold, or use it where you want it to run free.";
      }
      sayEl.textContent = head + figs + tail;
    }, 260);
  }

  inTaper.addEventListener("input", function () { state.taper = clampStep(inTaper.value, A_MIN, A_MAX, A_STEP); update(); });
  inLoad.addEventListener("input", function () { state.load = clampStep(inLoad.value, LOAD_MIN, LOAD_MAX, LOAD_STEP); update(); });
  faceBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.faces = bn.dataset.faces; update(); });
  });

  $("seat").addEventListener("click", function () {
    var seat = findSeat(state);
    state.taper = seat; inTaper.value = seat; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inTaper.value = state.taper; inLoad.value = state.load;
    update();
  });

  // nudge a slider-backed value by a step, from the keyboard
  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clampStep(state[field] + delta, lo, hi, step);
    input.value = state[field];
    update();
  }

  // keyboard: work the bench without reaching for the mouse
  var FACE_KEYS = { "1": "oiled", "2": "steel", "3": "dry", "4": "rough" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "s" || k === "S") { $("seat").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (FACE_KEYS[k]) { state.faces = FACE_KEYS[k]; update(); }
    else if (k === "]") { nudge("taper", A_STEP * 2, A_MIN, A_MAX, A_STEP, inTaper); }        // steeper
    else if (k === "[") { nudge("taper", -A_STEP * 2, A_MIN, A_MAX, A_STEP, inTaper); }       // shallower
    else if (k === "=" || k === "+") { nudge("load", LOAD_STEP, LOAD_MIN, LOAD_MAX, LOAD_STEP, inLoad); }   // more load
    else if (k === "-" || k === "_") { nudge("load", -LOAD_STEP, LOAD_MIN, LOAD_MAX, LOAD_STEP, inLoad); }  // less load
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
      draw(current);
    });
  }

  // ---- go --------------------------------------------------------------
  inTaper.value = state.taper; inLoad.value = state.load;
  update();
})();
