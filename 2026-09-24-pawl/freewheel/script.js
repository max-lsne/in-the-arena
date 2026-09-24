/* Freewheel — the bench.
 *
 * A freewheel is the same pawl-and-ratchet, turned into a clutch. The hub carries a
 * ring of teeth; spring-loaded pawls ride on it. Drive it forward and the pawls
 * catch a tooth and carry the wheel; stop driving and the pawls skate over the
 * teeth — click, click — and the wheel runs on free. It is a rectifier of drive:
 * it passes the forward half of your pedalling and lets the reverse (the coast) slip.
 *
 *   engage    driven = p · floor(push ⁄ p)     (whole teeth only; the play before a pawl catches is lag)
 *   carry     carries ⇔ load ≤ H               (the pawls carry the drive up to their capacity)
 *   skip      load > H  ⇒  the pawls skip       (they shear over the teeth and the drive slips)
 *
 * Two lessons. Between the teeth is free play: a push shorter than one tooth's pitch
 * engages nothing, and the pitch itself is the engagement lag you feel before the
 * drive bites — few teeth means a long dead spot, many teeth an instant pickup. And
 * the pawls carry only to their capacity H: load them past it — a standing-start
 * stamp, a worn ring — and they skip a tooth, the drive lurching and slipping. A
 * finer ring engages quicker but skips sooner; a coarser ring lags but holds. Torques
 * in newton-metres, angles in degrees; the ratchet is idealised but the shape is exact.
 */
(function () {
  "use strict";

  // Four rings, by how the teeth are cut. A fine ring has many small teeth: it picks
  // up almost at once but its small pawl-contact skips under less torque. A coarse,
  // steep ring has few big teeth: a long dead spot before it bites, but it carries a
  // hard stamp. Teeth N, pitch 360⁄N degrees, carry capacity H in N·m.
  var TOOTH = {
    fine:  { label: "fine",  teeth: 72, hold: 70  },
    light: { label: "light", teeth: 36, hold: 130 },
    deep:  { label: "deep",  teeth: 24, hold: 210 },
    steep: { label: "steep", teeth: 12, hold: 330 }
  };
  var TOOTH_ORDER = ["fine", "light", "deep", "steep"];

  var STROKE_MIN = 0, STROKE_MAX = 90, STROKE_STEP = 3;   // the drive push, degrees at the hub
  var LOAD_MIN = 0, LOAD_MAX = 400, LOAD_STEP = 10;       // the load on the drive — the grade you climb, N·m
  var EDGE_FRAC = 0.85;                                   // load within this of the carry capacity: at the edge
  var KEY = "pawl.freewheel.v1";                          // the push, load, ring and ground driven kept between visits

  // Opens on a steady spin: a light ring, a modest grade the pawls carry easily, a
  // push that engages a few whole teeth. Pedal to drive; Find the skip sets the load
  // to the exact grade the pawls skip at.
  var DEFAULT = { stroke: 51, load: 70, tooth: "light", total: 0 };

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

  // ---- the physics of one push -----------------------------------------
  function compute(s) {
    var t = TOOTH[s.tooth];
    var pitch = 360 / t.teeth;                 // degrees per tooth — the engagement lag
    var teeth = Math.floor(s.stroke / pitch);  // whole teeth the push engages
    var banked = teeth * pitch;                // the angle actually driven
    var lost = s.stroke - banked;              // free play — the push not yet caught
    var eff = s.stroke > 0 ? banked / s.stroke : 0;
    var H = t.hold;
    var holds = s.load <= H + 1e-6;
    var overhaul = s.load > H + 1e-6;
    var edge = holds && (s.load >= EDGE_FRAC * H || teeth < 1);
    // when the pawls skip, the drive slips: the further past H, the more it loses
    var slip = overhaul ? Math.max(1, Math.round((s.load - H) / 20)) : 0;
    return {
      t: t, pitch: pitch, teeth: teeth, banked: banked, lost: lost, eff: eff,
      H: H, holds: holds, overhaul: overhaul, edge: edge, slip: slip,
      stroke: s.stroke, load: s.load
    };
  }

  // the load at which the pawls just skip — the exact edge, snapped to a step
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
    if (st < pitch) return "short of a tooth";
    if (st < 24) return "a light push";
    if (st < 52) return "a steady push";
    if (st < 76) return "a long push";
    return "a full push";
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
    bank: { cls: "v-keep",  word: "Driving",     note: "the pawls catch — the wheel is driven" },
    edge: { cls: "v-drift", word: "At the edge", note: "the pawls near their limit, or the push catches nothing" }
  };
  var OVERHAUL = { cls: "v-dead", word: "Skipping", note: "the load beats the pawls — the drive slips a tooth" };

  function render(r) {
    var verdict = verdictOf(r);
    var v = verdict === "overhaul" ? OVERHAUL : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var teethClass = r.overhaul ? "bad" : r.teeth < 1 ? "warn" : "good";
    var lostClass = r.lost > r.pitch * 0.5 ? "warn" : "";
    var holdClass = r.overhaul ? "bad" : r.edge ? "warn" : "good";

    var rows = [
      ["Push", deg(r.stroke) + '<span class="unit"> · tooth ' + r.pitch.toFixed(0) + "°</span>", ""],
      ['Driven <span class="tag">teeth</span>', r.teeth + " × " + r.pitch.toFixed(0) + "° = " + deg(r.banked), teethClass],
      ["Engagement lag", deg(r.lost) + '<span class="unit"> · free play</span>', lostClass],
      ['Carry <span class="tag c">H</span>', nm(r.H) + '<span class="unit"> · ' + r.t.label + " ring</span>", ""],
      ["The grade", nm(r.load) + '<span class="unit"> · on the drive</span>', holdClass],
      ["Ground driven", r.overhaul
        ? 'slips<span class="unit"> · −' + r.slip + " clicks a push</span>"
        : (state.total + '<span class="unit"> clicks driven</span>'), r.overhaul ? "bad" : ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markLoad(r);
    return verdict;
  }

  // mark, under the grade slider, the load at which the pawls skip
  function markLoad(r) {
    if (!oMark || !oNote) return;
    var brk = findOverhaul(state);
    oMark.style.left = ((brk - LOAD_MIN) / (LOAD_MAX - LOAD_MIN) * 100) + "%";
    oMark.className = brk >= LOAD_MAX ? "x-mark off" : "x-mark";
    if (r.overhaul) oNote.innerHTML = "skipping — past the pawls' carry of <b>" + nm(brk) + "</b>";
    else if (Math.abs(brk - state.load) <= LOAD_STEP) oNote.innerHTML = "the pawls skip at: <b>" + nm(brk) + "</b>";
    else oNote.innerHTML = "carries to <b>" + nm(brk) + "</b>, then the pawls skip";
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

  var wheelAngle = 0, targetAngle = 0, coastPhase = 0, pawlKick = 0;

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

  // ---- the scene: a hub ring, pawls, a driving crank -------------------
  function drawScene(col, accent, cur, verdict) {
    var over = verdict === "overhaul";
    var cx = 168, cy = 108, r = 74;

    label(ctx, col.faint, "the hub drives forward and coasts free", cx, 24, "center");

    // the ratchet ring
    drawRatchet(cx, cy, r, cur.t.teeth, wheelAngle, col, over ? col.dead : col.iron);
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
    ctx.fillStyle = col.field2; ctx.fill();
    ctx.strokeStyle = withAlpha(col.iron2, 0.8); ctx.lineWidth = 1.4; ctx.stroke();

    // two pawls, riding the ring at top-left and bottom-right
    drawPawl(cx, cy, r, col, accent, over, pawlKick, -0.75 * Math.PI);
    drawPawl(cx, cy, r, col, accent, over, pawlKick, 0.25 * Math.PI);

    // the driving crank — a spoke from the hub, the drive that engages the pawls
    drawCrank(cx, cy, r, col, over);

    // the grade the drive climbs — a slope arrow off to the right
    var gx = cx + r + 40, gy = cy;
    arrow(ctx, withAlpha(over ? col.dead : col.timber2, 0.9), gx, gy + 20, gx, gy + 20 - (over ? 26 : 14), 1.8, 6);
    label(ctx, over ? col.dead : col.timber2, "grade", gx, gy + 34, "center");

    var msg = over
      ? "the load beats the pawls — they skip and the drive slips"
      : cur.teeth < 1
        ? "the push is shorter than one tooth — it catches nothing"
        : "each push drives " + cur.teeth + (cur.teeth === 1 ? " tooth" : " teeth") + ", then it coasts free";
    label(ctx, over ? col.dead : col.keep, msg, cx, cy + r + 62, "center");
  }

  // an asymmetric sawtooth ring — a driving face and a riding ramp
  function drawRatchet(cx, cy, r, teeth, ang, col, edge) {
    var ri = r - 12;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a0 = (i / teeth) * 2 * Math.PI;
      var a1 = ((i + 0.72) / teeth) * 2 * Math.PI;
      var a2 = ((i + 1) / teeth) * 2 * Math.PI;
      if (i === 0) ctx.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a2) * ri, Math.sin(a2) * ri);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(edge, 0.12); ctx.fill();
    ctx.strokeStyle = withAlpha(edge, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, ri - 3, 0, 2 * Math.PI);
    ctx.strokeStyle = withAlpha(edge, 0.35); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  // a spring pawl riding the ring at angle `at`, kicking up as teeth pass
  function drawPawl(cx, cy, r, col, accent, over, kick, at) {
    var tipR = r - 2;
    var tx = cx + Math.cos(at) * tipR, ty = cy + Math.sin(at) * tipR;
    var pivR = r + 20;
    var pa = at - 0.34;
    var px = cx + Math.cos(pa) * pivR, py = cy + Math.sin(pa) * pivR;
    var lift = kick * 5;
    var lx = tx - Math.cos(at) * lift, ly = ty - Math.sin(at) * lift;
    ctx.fillStyle = withAlpha(col.iron2, 0.9);
    ctx.beginPath(); ctx.arc(px, py, 3, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = over ? col.dead : accent; ctx.lineWidth = 3.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.lineCap = "butt";
  }

  // the driving crank swung through the push angle
  function drawCrank(cx, cy, r, col, over) {
    var a = -Math.PI / 2 + coastPhase * (state.stroke * Math.PI / 180);
    var lx = cx + Math.cos(a) * (r + 22), ly = cy + Math.sin(a) * (r + 22);
    ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = withAlpha(col.soft, 0.8);
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.faint, "drive", lx + 8, ly, "left");
  }

  // ---- the stack: ground driven, a one-way run -------------------------
  function drawStack(col, accent, cur, verdict) {
    var bx = 24, by = 224, bw = 214, bh = 166;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "ground driven — it never coasts back", bx + 12, by + 18, "left");

    var colX = bx + 26, base = by + bh - 22, top = by + 30, colW = 26;
    var window_ = 40;
    var shown = Math.min(state.total, window_);
    var unit = (base - top) / window_;
    ctx.strokeStyle = withAlpha(col.rule, 1); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(colX - 4, base); ctx.lineTo(colX + colW + 4, base); ctx.stroke();
    for (var i = 0; i < shown; i++) {
      var y = base - (i + 1) * unit;
      ctx.fillStyle = withAlpha(col.keep, 0.16 + 0.12 * (i / window_));
      ctx.fillRect(colX, y + 1, colW, unit - 1.5);
      ctx.strokeStyle = withAlpha(col.keep, 0.5); ctx.lineWidth = 0.6;
      ctx.strokeRect(colX, y + 1, colW, unit - 1.5);
    }
    if (!cur.overhaul && cur.teeth > 0) {
      var add = Math.min(cur.teeth, window_ - shown);
      for (var j = 0; j < add; j++) {
        var yy = base - (shown + j + 1) * unit;
        ctx.fillStyle = withAlpha(accent, 0.5);
        ctx.fillRect(colX, yy + 1, colW, unit - 1.5);
      }
    }
    label(ctx, col.soft, "driven", colX + colW + 20, by + 44, "left");
    ctx.fillStyle = cur.overhaul ? col.dead : col.keep;
    ctx.font = "600 30px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText(String(state.total), colX + colW + 20, by + 76);
    ctx.font = "11px ui-monospace, monospace";
    label(ctx, col.faint, "clicks", colX + colW + 20, by + 92, "left");
    var foot = cur.overhaul ? "the drive slips" : cur.teeth < 1 ? "a push drives nothing" : "pedal to drive " + cur.teeth + " more";
    label(ctx, cur.overhaul ? col.dead : col.faint, foot, colX + colW + 20, by + 116, "left");
  }

  // ---- the curve: teeth driven vs push — the lag before engagement -----
  function drawCurve(col, cur) {
    var ix = 250, iy = 224, iw = 286, ih = 166, pad = 26;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "driven vs pushed — the lag before it bites", ix + 12, iy + 18, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - 2 * pad, Hc = ih - 2 * pad - 6;
    var xFor = function (a) { return Ox + a / STROKE_MAX * L; };
    var yFor = function (a) { return Oy - clamp(a, 0, STROKE_MAX) / STROKE_MAX * Hc; };

    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(0)); ctx.lineTo(xFor(STROKE_MAX), yFor(STROKE_MAX)); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "all pushed", xFor(STROKE_MAX), yFor(STROKE_MAX) - 4, "right");

    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(0));
    var a;
    for (a = 0; a <= STROKE_MAX + 0.001; a += 0.5) {
      var banked = cur.pitch * Math.floor(a / cur.pitch);
      ctx.lineTo(xFor(a), yFor(banked));
    }
    ctx.stroke();

    var mx = xFor(cur.stroke), myB = yFor(cur.banked), myI = yFor(cur.stroke);
    ctx.strokeStyle = withAlpha(col.drift, 0.8); ctx.lineWidth = 1; ctx.setLineDash([1, 2]);
    ctx.beginPath(); ctx.moveTo(mx, myB); ctx.lineTo(mx, myI); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cur.overhaul ? col.dead : cur.teeth < 1 ? col.drift : col.keep;
    ctx.beginPath(); ctx.arc(mx, myB, 3.4, 0, 2 * Math.PI); ctx.fill();
    if (cur.lost > 1) label(ctx, col.drift, "lag " + deg(cur.lost), mx, myI - 6, "center");
    label(ctx, col.faint, "pushed", Ox + L, Oy + 14, "right");
  }

  // ---- the gauge: the grade against the pawls' carry --------------------
  function drawGauge(col, accent, cur) {
    var bx = 24, by = 404, bw = W - 48, bh = 52;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 74, gx1 = W - 74, gy = 434, scaleMax = LOAD_MAX;
    var xFor = function (t) { return gx0 + clamp(t, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    var gwall = xFor(cur.H);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gwall - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gwall - gx0, 16);

    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gwall, gy - 12); ctx.lineTo(gwall, gy + 12); ctx.stroke();
    label(ctx, col.faint, "pawls carry H", gwall, gy + 22, "center");

    label(ctx, col.faint, "the grade on the drive", (gx0 + gx1) / 2, gy - 15, "center");
    label(ctx, col.faint, "0", gx0, gy + 22, "left");

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

    var da = targetAngle - wheelAngle;
    if (Math.abs(da) > 0.0008) {
      if (reduce) { wheelAngle = targetAngle; }
      else { wheelAngle += da * Math.min(1, dt * 8); }
      pawlKick = Math.abs(Math.sin(wheelAngle * current.t.teeth / 2)) * (reduce ? 0 : 1);
    } else {
      // settle exactly, then let a driven wheel coast on gently (unless reduced motion);
      // keep the running angle bounded so a long session never drifts
      wheelAngle = targetAngle;
      if (!reduce && !current.overhaul && current.teeth > 0) { wheelAngle += dt * 0.5; targetAngle = wheelAngle; }
      if (wheelAngle > TAU) { wheelAngle -= TAU; targetAngle -= TAU; }
      else if (wheelAngle < -TAU) { wheelAngle += TAU; targetAngle += TAU; }
      pawlKick += (0 - pawlKick) * Math.min(1, dt * 6);
    }

    if (reduce) { coastPhase = 1; }
    else { coastPhase = 0.5 + 0.5 * Math.sin(ts / 900); }

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

  // one push of the drive: engage the whole teeth (or skip, slipping)
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

  // ---- screen-reader status (debounced) --------------------------------
  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var head = "A " + r.t.label + " ring of " + r.t.teeth + " teeth, pitch " + r.pitch.toFixed(0)
        + " degrees. The push swings " + deg(r.stroke) + " and drives " + r.teeth
        + (r.teeth === 1 ? " whole tooth" : " whole teeth") + ", "
        + (r.lost >= 1 ? "with " + deg(r.lost) + " of free play before the pawls bite. " : "with no lag. ");
      var tail;
      if (verdict === "bank") {
        tail = "Driving — the grade of " + nm(r.load) + " sits well within the pawls' carry of " + nm(r.H)
          + ", so the wheel is driven and coasts free when you stop. " + state.total + " clicks driven.";
      } else if (verdict === "edge") {
        tail = r.teeth < 1
          ? "At the edge — the push is shorter than one tooth's pitch, so the pawls never catch and nothing is driven; push further or fit a finer ring for quicker pickup."
          : "At the edge — the grade of " + nm(r.load) + " is near the pawls' carry of " + nm(r.H)
            + "; a little more and they skip. Ease the grade, or fit a steeper ring to carry it.";
      } else {
        tail = "Skipping — the grade of " + nm(r.load) + " beats the pawls' carry of " + nm(r.H)
          + ", so they shear over the teeth and the drive slips about " + r.slip + " clicks a push. "
          + "Ease the grade under the carry, or fit a steeper ring.";
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

  function nudge(field, delta, lo, hi, step, input) {
    state[field] = clamp(Math.round((state[field] + delta) / step) * step, lo, hi);
    input.value = state[field];
    update();
  }

  var TOOTH_KEYS = { "1": "fine", "2": "light", "3": "deep", "4": "steep" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;
    var k = e.key;
    if (k === "p" || k === "P" || k === " ") { $("haul").click(); }
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

  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      draw(current, curVerdict);
    });
  }

  // ---- go --------------------------------------------------------------
  inStroke.value = state.stroke; inLoad.value = state.load;
  update();
})();
