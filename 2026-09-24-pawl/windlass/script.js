/* Windlass — the bench.
 *
 * A windlass raises a load on a drum, and a pawl dropped into a ratchet wheel is
 * what lets you rest. You haul the drum round a stroke at a time; between strokes
 * the load would run the drum back down, and the pawl — a little pivoted tooth —
 * catches the next notch and holds it. The whole machine is a rectifier: it turns
 * a back-and-forth heave into a one-way climb, and banks every notch so none of it
 * is given back.
 *
 *   advance    banked = pitch · floor(stroke ⁄ pitch)   (whole notches only; the rest is lost motion)
 *   hold       holds  ⇔  load ≤ H                        (the pawl holds up to the tooth's capacity)
 *   overhaul   load > H  ⇒  the load runs the drum back  (the catch fails; banked notches given back)
 *
 * Two lessons live in that. A stroke banks only whole notches — the sub-notch
 * remainder is lost motion, given back at the top of every heave, so a short stroke
 * on a coarse tooth can swing a long way and raise nothing. And the pawl holds only
 * to the tooth's capacity H: load it past that and it overhauls, and the height you
 * banked runs back down. A coarser tooth holds more but wastes more; a finer tooth
 * wastes almost nothing but lets go sooner. Torques in newton-metres, angles in
 * degrees, for the reader; the ratchet is idealised but the shape is exact.
 */
(function () {
  "use strict";

  // Four cuts of the tooth. A coarse, steep tooth has few big notches: it holds a
  // great back-load but throws away up to a whole big notch of lost motion each
  // heave. A fine tooth has many small notches: it wastes almost nothing but its
  // small tooth lets go under far less load. Teeth N per turn, pitch 360⁄N degrees,
  // hold capacity H in N·m. The ordering and the trade are real.
  var TOOTH = {
    fine:  { label: "fine",  teeth: 72, hold: 70  },
    light: { label: "light", teeth: 36, hold: 130 },
    deep:  { label: "deep",  teeth: 24, hold: 210 },
    steep: { label: "steep", teeth: 12, hold: 330 }
  };
  var TOOTH_ORDER = ["fine", "light", "deep", "steep"];

  var STROKE_MIN = 0, STROKE_MAX = 90, STROKE_STEP = 3;   // swing of the drive lever, degrees
  var LOAD_MIN = 0, LOAD_MAX = 400, LOAD_STEP = 10;       // the weight's back-torque on the drum, N·m
  var EDGE_FRAC = 0.85;                                   // load within this of the hold capacity: at the edge
  var KEY = "pawl.windlass.v1";                           // the stroke, load, tooth and running height kept between visits

  // Opens on a steady heave: a light tooth, a modest weight well within the pawl's
  // hold, a stroke that banks a few whole notches. Haul to raise it; Find the
  // overhaul sets the weight to the exact load that overhauls the pawl.
  var DEFAULT = { stroke: 45, load: 60, tooth: "light", total: 0 };

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
      if (!TOOTH[o.tooth]) return null;
      return {
        tooth: o.tooth,
        stroke: clampStep(o.stroke, STROKE_MIN, STROKE_MAX, STROKE_STEP),
        load: clampStep(o.load, LOAD_MIN, LOAD_MAX, LOAD_STEP),
        total: Math.max(0, Math.round(+o.total) || 0)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the physics of one stroke ---------------------------------------
  function compute(s) {
    var t = TOOTH[s.tooth];
    var pitch = 360 / t.teeth;                 // degrees per notch
    var teeth = Math.floor(s.stroke / pitch);  // whole notches the stroke banks
    var banked = teeth * pitch;                // the angle actually kept
    var lost = s.stroke - banked;              // lost motion — given back at the top of the heave
    var eff = s.stroke > 0 ? banked / s.stroke : 0;
    var H = t.hold;
    var holds = s.load <= H + 1e-6;
    var overhaul = s.load > H + 1e-6;
    var edge = holds && (s.load >= EDGE_FRAC * H || teeth < 1);
    // when the pawl overhauls, the drum runs back: the further past H, the more it slips
    var slip = overhaul ? Math.max(1, Math.round((s.load - H) / 20)) : 0;
    return {
      t: t, pitch: pitch, teeth: teeth, banked: banked, lost: lost, eff: eff,
      H: H, holds: holds, overhaul: overhaul, edge: edge, slip: slip,
      stroke: s.stroke, load: s.load
    };
  }

  // the load at which the pawl just overhauls — the exact edge, snapped to a step
  function findOverhaul(s) {
    return clamp(Math.round(TOOTH[s.tooth].hold / LOAD_STEP) * LOAD_STEP, LOAD_MIN, LOAD_MAX);
  }

  function verdictOf(r) {
    if (r.overhaul) return "overhaul";
    if (r.edge) return "edge";
    return "bank";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inStroke = $("in-stroke"), inLoad = $("in-load");
  var labStroke = $("lab-stroke"), labLoad = $("lab-load");
  var toothBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-tooth]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var oMark = $("o-mark"), oNote = $("o-note"), totalEl = $("total");

  function nm(x) { return Math.round(x) + " N·m"; }
  function deg(x) { return Math.round(x) + "°"; }

  var STROKE_WORD = function (st, pitch) {
    if (st < pitch) return "short of a notch";
    if (st < 24) return "a short heave";
    if (st < 52) return "a steady heave";
    if (st < 76) return "a long heave";
    return "a full heave";
  };

  function syncLabels() {
    var pitch = 360 / TOOTH[state.tooth].teeth;
    labStroke.textContent = deg(state.stroke) + " · " + STROKE_WORD(state.stroke, pitch);
    labLoad.textContent = nm(state.load);
    toothBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.tooth === state.tooth));
    });
    if (totalEl) totalEl.textContent = state.total;
  }

  var VERDICT_TEXT = {
    bank: { cls: "v-keep",  word: "Banking",     note: "the pawl holds — every notch kept" },
    edge: { cls: "v-drift", word: "At the edge", note: "the pawl nears its hold, or the stroke banks nothing" }
  };
  var OVERHAUL = { cls: "v-dead", word: "Overhauls", note: "the weight beats the pawl — the drum runs back" };

  function render(r) {
    var verdict = verdictOf(r);
    var v = verdict === "overhaul" ? OVERHAUL : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var teethClass = r.overhaul ? "bad" : r.teeth < 1 ? "warn" : "good";
    var lostClass = r.lost > r.pitch * 0.5 ? "warn" : "";
    var holdClass = r.overhaul ? "bad" : r.edge ? "warn" : "good";

    var rows = [
      ["Stroke", deg(r.stroke) + '<span class="unit"> · notch ' + r.pitch.toFixed(0) + "°</span>", ""],
      ['Banked <span class="tag">notches</span>', r.teeth + " × " + r.pitch.toFixed(0) + "° = " + deg(r.banked), teethClass],
      ["Lost motion", deg(r.lost) + '<span class="unit"> · given back</span>', lostClass],
      ['Hold <span class="tag c">H</span>', nm(r.H) + '<span class="unit"> · ' + r.t.label + " tooth</span>", ""],
      ["The weight", nm(r.load) + '<span class="unit"> · on the drum</span>', holdClass],
      ["Running height", r.overhaul
        ? 'runs back<span class="unit"> · −' + r.slip + " notches a heave</span>"
        : (state.total + '<span class="unit"> notches raised</span>'), r.overhaul ? "bad" : ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markLoad(r);
    return verdict;
  }

  // mark, under the weight slider, the load at which the pawl overhauls
  function markLoad(r) {
    if (!oMark || !oNote) return;
    var brk = findOverhaul(state);
    oMark.style.left = ((brk - LOAD_MIN) / (LOAD_MAX - LOAD_MIN) * 100) + "%";
    oMark.className = brk >= LOAD_MAX ? "x-mark off" : "x-mark";
    if (r.overhaul) oNote.innerHTML = "overhauling — past the pawl's hold of <b>" + nm(brk) + "</b>";
    else if (Math.abs(brk - state.load) <= LOAD_STEP) oNote.innerHTML = "the pawl overhauls at: <b>" + nm(brk) + "</b>";
    else oNote.innerHTML = "holds to <b>" + nm(brk) + "</b>, then the drum runs back";
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

  // wheelAngle is where the drum actually sits; targetAngle is where a stroke is
  // carrying it. Between them the drum turns; the pawl clicks over the notches.
  var wheelAngle = 0, targetAngle = 0, leverPhase = 0, pawlKick = 0;

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "overhaul" ? col.dead : verdict === "edge" ? col.drift : col.keep;

    ctx.clearRect(0, 0, W, H);
    drawScene(col, accent, cur, verdict);
    drawStack(col, accent, cur, verdict);
    drawCurve(col, cur);
    drawGauge(col, accent, cur);
  }

  // ---- the scene: a ratchet drum, a pawl, a lever, a hanging weight -----
  function drawScene(col, accent, cur, verdict) {
    var over = verdict === "overhaul";
    var cx = 168, cy = 108, r = 74;

    // the shaft the drum winds
    label(ctx, col.faint, "the drum winds the load up", cx, 24, "center");

    // the hanging weight, on a line off the right of the drum
    var lineX = cx + r + 4;
    ctx.strokeStyle = withAlpha(over ? col.dead : col.timber2, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lineX, cy); ctx.lineTo(lineX, cy + 66); ctx.stroke();
    var wy = cy + 66;
    ctx.fillStyle = withAlpha(over ? col.dead : col.timber, 0.20);
    roundRect(lineX - 16, wy, 32, 26, 4); ctx.fill();
    ctx.strokeStyle = withAlpha(over ? col.dead : col.timber2, 0.8); ctx.lineWidth = 1.4;
    roundRect(lineX - 16, wy, 32, 26, 4); ctx.stroke();
    label(ctx, over ? col.dead : col.timber2, "load", lineX + 26, wy + 16, "left");
    // the load's pull — down, and stronger when it is winning
    arrow(ctx, withAlpha(over ? col.dead : col.timber2, 0.9), lineX, wy + 30, lineX, wy + 30 + (over ? 22 : 12), 1.8, 6);

    // the ratchet drum
    drawRatchet(cx, cy, r, cur.t.teeth, wheelAngle, col, over ? col.dead : col.iron);
    // hub
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
    ctx.fillStyle = col.field2; ctx.fill();
    ctx.strokeStyle = withAlpha(col.iron2, 0.8); ctx.lineWidth = 1.4; ctx.stroke();

    // the pawl — a pivoted arm resting its tip in a notch at the top-left of the rim
    drawPawl(cx, cy, r, col, accent, over, pawlKick);

    // the drive lever, swung through the current stroke
    drawLever(cx, cy, r, col, over);

    // the running-height caption
    var msg = over
      ? "the weight overhauls the pawl — the drum runs back"
      : cur.teeth < 1
        ? "the stroke is short of a notch — nothing is banked"
        : "each heave banks " + cur.teeth + (cur.teeth === 1 ? " notch, held" : " notches, held");
    label(ctx, over ? col.dead : col.keep, msg, cx, cy + r + 62, "center");
  }

  // an asymmetric sawtooth ring: a steep catching face and a gentle riding ramp,
  // so the one-way direction reads straight off the shape
  function drawRatchet(cx, cy, r, teeth, ang, col, edge) {
    var ri = r - 12;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a0 = (i / teeth) * 2 * Math.PI;
      var a1 = ((i + 0.72) / teeth) * 2 * Math.PI;      // gentle ramp out to the tip
      var a2 = ((i + 1) / teeth) * 2 * Math.PI;          // steep face back down
      if (i === 0) ctx.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a2) * ri, Math.sin(a2) * ri);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(edge, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(edge, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
    // inner rim
    ctx.beginPath(); ctx.arc(0, 0, ri - 3, 0, 2 * Math.PI);
    ctx.strokeStyle = withAlpha(edge, 0.35); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  // the holding pawl: a short arm on a fixed pivot up and left of the wheel, its
  // tip riding the rim; it kicks up as a tooth passes (pawlKick) and settles into
  // the next notch
  function drawPawl(cx, cy, r, col, accent, over, kick) {
    var pivot = { x: cx - r - 26, y: cy - r - 6 };
    var tip = { x: cx - r * 0.72, y: cy - r * 0.72 };
    ctx.save();
    // pivot
    ctx.fillStyle = withAlpha(col.iron2, 0.9);
    ctx.beginPath(); ctx.arc(pivot.x, pivot.y, 3.4, 0, 2 * Math.PI); ctx.fill();
    // the arm, lifted a touch by the kick
    var lift = kick * 6;
    ctx.strokeStyle = over ? col.dead : accent; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(tip.x, tip.y - lift); ctx.stroke();
    ctx.lineCap = "butt";
    label(ctx, over ? col.dead : col.soft, "pawl", pivot.x - 4, pivot.y - 8, "center");
    ctx.restore();
  }

  // the drive lever: a spoke from the hub, swung out through the stroke angle so you
  // can see the heave you are asking for
  function drawLever(cx, cy, r, col, over) {
    var a = -Math.PI / 2 + (leverPhase) * (state.stroke * Math.PI / 180);
    var lx = cx + Math.cos(a) * (r + 20), ly = cy + Math.sin(a) * (r + 20);
    ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = withAlpha(col.soft, 0.8);
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.faint, "lever", lx + 8, ly, "left");
  }

  // ---- the stack: a one-way column, banked height that only climbs -----
  function drawStack(col, accent, cur, verdict) {
    var bx = 24, by = 224, bw = 214, bh = 166;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "banked height — a one-way climb", bx + 12, by + 18, "left");

    // the column: total banked notches, capped visually at a window that scrolls
    var colX = bx + 26, base = by + bh - 22, top = by + 30, colW = 26;
    var window_ = 40;                       // how many notches show at full height
    var shown = Math.min(state.total, window_);
    var unit = (base - top) / window_;
    // ghost of the ceiling
    ctx.strokeStyle = withAlpha(col.rule, 1); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(colX - 4, base); ctx.lineTo(colX + colW + 4, base); ctx.stroke();
    // the banked notches, stacked
    for (var i = 0; i < shown; i++) {
      var y = base - (i + 1) * unit;
      ctx.fillStyle = withAlpha(col.keep, 0.16 + 0.12 * (i / window_));
      ctx.fillRect(colX, y + 1, colW, unit - 1.5);
      ctx.strokeStyle = withAlpha(col.keep, 0.5); ctx.lineWidth = 0.6;
      ctx.strokeRect(colX, y + 1, colW, unit - 1.5);
    }
    // this heave's advance, highlighted at the top of the stack
    if (!cur.overhaul && cur.teeth > 0) {
      var add = Math.min(cur.teeth, window_ - shown);
      for (var j = 0; j < add; j++) {
        var yy = base - (shown + j + 1) * unit;
        ctx.fillStyle = withAlpha(accent, 0.5);
        ctx.fillRect(colX, yy + 1, colW, unit - 1.5);
      }
    }
    // the number
    label(ctx, col.soft, "raised", colX + colW + 20, by + 44, "left");
    ctx.fillStyle = cur.overhaul ? col.dead : col.keep;
    ctx.font = "600 30px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText(String(state.total), colX + colW + 20, by + 76);
    ctx.font = "11px ui-monospace, monospace";
    label(ctx, col.faint, "notches", colX + colW + 20, by + 92, "left");
    var foot = cur.overhaul ? "runs back down" : cur.teeth < 1 ? "a heave banks nothing" : "haul to bank " + cur.teeth + " more";
    label(ctx, cur.overhaul ? col.dead : col.faint, foot, colX + colW + 20, by + 116, "left");
  }

  // ---- the curve: notches banked vs stroke — a staircase under the line -
  function drawCurve(col, cur) {
    var ix = 250, iy = 224, iw = 286, ih = 166, pad = 26;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "banked vs swung — the staircase of lost motion", ix + 12, iy + 18, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - 2 * pad, Hc = ih - 2 * pad - 6;
    var xFor = function (a) { return Ox + a / STROKE_MAX * L; };
    var yFor = function (a) { return Oy - clamp(a, 0, STROKE_MAX) / STROKE_MAX * Hc; };

    // the ideal 45° line — if every degree swung were banked
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(0)); ctx.lineTo(xFor(STROKE_MAX), yFor(STROKE_MAX)); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "all swung", xFor(STROKE_MAX), yFor(STROKE_MAX) - 4, "right");

    // the staircase: banked = pitch·floor(stroke/pitch)
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(0));
    var a;
    for (a = 0; a <= STROKE_MAX + 0.001; a += 0.5) {
      var banked = cur.pitch * Math.floor(a / cur.pitch);
      ctx.lineTo(xFor(a), yFor(banked));
    }
    ctx.stroke();

    // the current point, and the lost-motion gap up to the ideal line
    var mx = xFor(cur.stroke), myB = yFor(cur.banked), myI = yFor(cur.stroke);
    ctx.strokeStyle = withAlpha(col.drift, 0.8); ctx.lineWidth = 1; ctx.setLineDash([1, 2]);
    ctx.beginPath(); ctx.moveTo(mx, myB); ctx.lineTo(mx, myI); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cur.overhaul ? col.dead : cur.teeth < 1 ? col.drift : col.keep;
    ctx.beginPath(); ctx.arc(mx, myB, 3.4, 0, 2 * Math.PI); ctx.fill();
    if (cur.lost > 1) label(ctx, col.drift, "lost " + deg(cur.lost), mx, myI - 6, "center");
    label(ctx, col.faint, "swung", Ox + L, Oy + 14, "right");
  }

  // ---- the gauge: the weight against the pawl's hold --------------------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 404, bw = W - 48, bh = 52;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 74, gx1 = W - 74, gy = 434, scaleMax = LOAD_MAX;
    var xFor = function (t) { return gx0 + clamp(t, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // the band the pawl can hold — up to its capacity H
    var gwall = xFor(cur.H);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gwall - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gwall - gx0, 16);

    // the wall at the hold capacity — past it, the pawl overhauls
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gwall, gy - 12); ctx.lineTo(gwall, gy + 12); ctx.stroke();
    label(ctx, col.faint, "pawl holds H", gwall, gy + 22, "center");

    label(ctx, col.faint, "the weight on the drum", (gx0 + gx1) / 2, gy - 15, "center");
    label(ctx, col.faint, "0", gx0, gy + 22, "left");

    // the needle at the current load
    var nX = xFor(cur.load);
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
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);
  var curVerdict = verdictOf(current);
  var lastTs = null;
  var TAU = Math.PI * 2;

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    // ease the drum toward wherever a stroke is carrying it; the pawl kick decays
    var da = targetAngle - wheelAngle;
    if (Math.abs(da) > 0.0008) {
      if (reduce) { wheelAngle = targetAngle; }
      else { wheelAngle += da * Math.min(1, dt * 8); }
      pawlKick = Math.abs(Math.sin(wheelAngle * current.t.teeth / 2)) * (reduce ? 0 : 1);
    } else {
      // settle exactly on the tooth so the sawtooth stays aligned under the pawl,
      // and keep the running angle bounded so a long session never drifts
      wheelAngle = targetAngle;
      if (wheelAngle > TAU) { wheelAngle -= TAU; targetAngle -= TAU; }
      else if (wheelAngle < -TAU) { wheelAngle += TAU; targetAngle += TAU; }
      pawlKick += (0 - pawlKick) * Math.min(1, dt * 6);
    }

    // under reduced motion the lever rests at the full stroke rather than sweeping
    if (reduce) { leverPhase = 1; }
    else { leverPhase = 0.5 + 0.5 * Math.sin(ts / 900); }

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

  // one heave of the lever: bank the whole notches (or run back, overhauling)
  function haul() {
    var r = compute(state);
    if (r.overhaul) {
      state.total = Math.max(0, state.total - r.slip);
      targetAngle -= (r.slip * r.pitch) * Math.PI / 180;
    } else if (r.teeth > 0) {
      state.total += r.teeth;
      targetAngle += r.banked * Math.PI / 180;
    }
    update();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = "A " + r.t.label + " tooth of " + r.t.teeth + " notches, pitch " + r.pitch.toFixed(0)
        + " degrees. The heave swings " + deg(r.stroke) + " and banks " + r.teeth
        + (r.teeth === 1 ? " whole notch" : " whole notches") + ", "
        + (r.lost >= 1 ? "losing " + deg(r.lost) + " of motion at the top of the heave. " : "with no motion lost. ");
      var tail;
      if (verdict === "bank") {
        tail = "Banking — the weight of " + nm(r.load) + " sits well within the pawl's hold of " + nm(r.H)
          + ", so every notch is kept. " + state.total + " notches raised and held.";
      } else if (verdict === "edge") {
        tail = r.teeth < 1
          ? "At the edge — the stroke is shorter than one notch, so the pawl never reaches the next tooth and nothing is banked; lengthen the heave or cut a finer tooth."
          : "At the edge — the weight of " + nm(r.load) + " is near the pawl's hold of " + nm(r.H)
            + "; a little more and it overhauls. Ease the weight, or cut a steeper tooth to hold it.";
      } else {
        tail = "Overhauls — the weight of " + nm(r.load) + " beats the pawl's hold of " + nm(r.H)
          + ", so the drum runs back down about " + r.slip + " notches a heave and the banked height is given back. "
          + "Ease the weight under the hold, or cut a steeper tooth.";
      }
      sayEl.textContent = head + tail;
    }, 260);
  }

  inStroke.addEventListener("input", function () { state.stroke = clampStep(inStroke.value, STROKE_MIN, STROKE_MAX, STROKE_STEP); update(); });
  inLoad.addEventListener("input", function () { state.load = clampStep(inLoad.value, LOAD_MIN, LOAD_MAX, LOAD_STEP); update(); });
  toothBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.tooth = bn.dataset.tooth; update(); });
  });

  $("haul").addEventListener("click", haul);
  $("find").addEventListener("click", function () {
    var brk = findOverhaul(state);
    state.load = brk; inLoad.value = brk; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inStroke.value = state.stroke; inLoad.value = state.load;
    targetAngle = wheelAngle;
    update();
  });

  // nudge a slider-backed value by a step, from the keyboard
  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clamp(Math.round((state[field] + delta) / step) * step, lo, hi);
    input.value = state[field];
    update();
  }

  // keyboard: work the bench without reaching for the mouse
  var TOOTH_KEYS = { "1": "fine", "2": "light", "3": "deep", "4": "steep" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "h" || k === "H" || k === " ") { $("haul").click(); }
    else if (k === "f" || k === "F") { $("find").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (TOOTH_KEYS[k]) { state.tooth = TOOTH_KEYS[k]; update(); }
    else if (k === "]") { nudge("stroke", STROKE_STEP, STROKE_MIN, STROKE_MAX, STROKE_STEP, inStroke); }
    else if (k === "[") { nudge("stroke", -STROKE_STEP, STROKE_MIN, STROKE_MAX, STROKE_STEP, inStroke); }
    else if (k === "=" || k === "+") { nudge("load", LOAD_STEP, LOAD_MIN, LOAD_MAX, LOAD_STEP, inLoad); }
    else if (k === "-" || k === "_") { nudge("load", -LOAD_STEP, LOAD_MIN, LOAD_MAX, LOAD_STEP, inLoad); }
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
  inStroke.value = state.stroke; inLoad.value = state.load;
  update();
})();
