/* Bridge — the bench.
 *
 * A footbridge sways sideways at one natural rate f0, fixed by its span and
 * stiffness. A crowd stepping at frequency f delivers a small sideways push
 * each step, and the settled sway is the sway a slow lean would give times
 * the resonant gain:
 *
 *   r     = f / f0                                   (step against the sway)
 *   Q     = deck freedom, set by the dampers          (sways it keeps after a nudge)
 *   gain  = 1 / sqrt((1 - r^2)^2 + (r/Q)^2)          (the amplification)
 *   sway  = static_lean * gain                        (millimetres, mid-span)
 *
 * On the sway (r = 1) the gain rises to about Q. You cannot move the peak —
 * the crowd's step and the deck's sway are both fixed, and a crowd cannot be
 * asked to break step — so the one dial you hold is Q: fit dampers, cut Q,
 * and the peak has nowhere to climb. The crowd's push also grows with the
 * sway, so a slender, high-Q deck runs away rather than settling; damping is
 * the whole safety case.
 *
 * The deck's sway, span and safe limit are stylised, and the crowd's
 * self-driving feedback is sketched, not solved — but the gain and the sway
 * drawn from them are exact.
 */
(function () {
  "use strict";

  var F0 = 60;                 // the deck's natural sway, per minute (~1 Hz)
  var SMIN = 40, SMAX = 80, SSTEP = 1;    // the crowd's lateral step rate
  var CMIN = 1,  CMAX = 12, CSTEP = 1;    // crowd, in hundreds on the span
  var DMIN = 0,  DMAX = 10, DSTEP = 1;    // dampers fitted
  var STAT = 0.85;            // mm of sway per hundred people, slow steady lean
  var COMFORT = 12;           // below this the sway is not felt
  var LOCK = 24;              // above this much of the crowd steps with it
  var CLOSE = 40;             // past this the span must be closed
  var CAP = 62;               // display ceiling

  // dampers -> freedom Q. None (0) leaves a bare, long-ringing deck; full (10)
  // drops it to a dead one.
  function Qof(damp) { return clamp(30 / (1 + 2.2 * damp), 1.3, 30); }

  // Opens on the bare deck, crowd on the sway — a runaway. Fit the dampers
  // brings it steady.
  var DEFAULT = { step: 60, crowd: 8, damp: 0 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var state = Object.assign({}, DEFAULT);

  // ---- the sway --------------------------------------------------------
  function compute(s) {
    var r = s.step / F0;
    var Q = Qof(s.damp);
    var gain = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / Q, 2));
    var stat = s.crowd * STAT;
    var raw = stat * gain;
    var sway = Math.min(raw, CAP);
    var peakGain = Q;
    return { r: r, Q: Q, gain: gain, stat: stat, raw: raw, sway: sway, peakGain: peakGain };
  }

  function verdictOf(s, c) {
    if (c.raw >= CLOSE) return "runaway";
    if (c.raw >= LOCK) return "lockin";
    if (c.raw >= COMFORT) return "sway";
    return "steady";
  }

  // the least dampers that hold the deck steady at the current crowd and step
  function fitDampers(s) {
    for (var d = DMIN; d <= DMAX; d += DSTEP) {
      var t = Object.assign({}, s, { damp: d });
      if (compute(t).raw < COMFORT) return d;
    }
    return DMAX;
  }

  function damperWord(d) {
    return d === 0 ? "none" : d <= 3 ? "light" : d <= 7 ? "fitted" : "full";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inF = $("in-f"), inC = $("in-C"), inD = $("in-D");
  var labF = $("lab-f"), labC = $("lab-C"), labD = $("lab-D");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");
  var fMark = $("f-mark"), fNote = $("f-note");

  function syncLabels(c) {
    labF.textContent = state.step + " ⁄ min · r " + c.r.toFixed(2);
    labC.textContent = (state.crowd * 100) + " on the span";
    labD.textContent = damperWord(state.damp) + " · Q " + c.Q.toFixed(0);
  }

  var VERDICT_TEXT = {
    steady: { cls: "v-keep",  word: "Steady",   note: "damped enough — the sway stays below notice" },
    sway:   { cls: "v-drift", word: "Sways",    note: "felt underfoot — the loop has started to turn" },
    lockin: { cls: "v-drift", word: "Locks in", note: "the crowd stepping with it, pumping hard" }
  };

  function swayClass(c) {
    if (c.raw >= CLOSE) return "bad";
    if (c.raw >= COMFORT) return "warn";
    return "good";
  }

  function render(c) {
    var verdict = verdictOf(state, c);
    var v = verdict === "runaway"
      ? { cls: "v-dead", word: "Runs away", note: "past the limit — the span must be closed" }
      : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var off = Math.abs(state.step - F0);
    var gainCls = c.raw >= COMFORT ? "warn" : "good";
    var damperCls = state.damp >= 4 ? "good" : c.raw >= COMFORT ? "warn" : "good";

    var rows = [
      ["Step", "r " + c.r.toFixed(2) + '<span class="unit"> · ' + (off <= 2 ? "on the sway" : off + " ⁄ min off") + "</span>", off <= 6 ? "warn" : "good"],
      ['Gain <span class="tag">×</span>', "×" + c.gain.toFixed(1) + '<span class="unit"> / peak ×' + Math.round(c.peakGain) + "</span>", gainCls],
      ["Sway", Math.round(c.sway) + '<span class="unit"> mm / limit ' + CLOSE + "</span>", swayClass(c)],
      ["Dampers", "Q " + c.Q.toFixed(0) + '<span class="unit"> · ' + damperWord(state.damp) + "</span>", damperCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markSway(c);
    return verdict;
  }

  // mark, under the step slider, the deck's own sway — the pace you don't set
  function markSway(c) {
    if (!fMark || !fNote) return;
    var off = Math.abs(state.step - F0);
    fMark.style.left = ((F0 - SMIN) / (SMAX - SMIN) * 100) + "%";
    fMark.className = "x-mark" + (off > 2 ? " off" : "");
    if (off <= 2) fNote.innerHTML = "the crowd is on the deck's own sway: <b>" + F0 + " ⁄ min</b>";
    else fNote.innerHTML = "the deck sways at <b>" + F0 + " ⁄ min</b> — but you don't set the crowd's pace";
  }

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 520, H = 440, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function sizeCanvas() {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

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

  var shown = { sway: 6 };
  var phase = 0, lastTs = null, initShown = false;

  function accentFor(verdict) {
    return verdict === "steady" ? cssVar("--keep")
      : verdict === "runaway" ? cssVar("--dead") : cssVar("--drift");
  }

  function draw(c, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      crowd: cssVar("--crowd"), crowd2: cssVar("--crowd-2"),
      steel: cssVar("--steel"), steel2: cssVar("--steel-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = accentFor(verdict);

    ctx.clearRect(0, 0, W, H);

    var runaway = verdict === "runaway";
    var frac = clamp(shown.sway / CLOSE, 0, 1);
    var dcol = runaway ? col.dead : shown.sway >= COMFORT ? col.drift : col.steel;

    var off = clamp(shown.sway * 0.9, 0, 42) * Math.sin(phase);   // mid-span bow, px

    drawDeck(col, dcol, accent, off, frac, c, runaway);

    drawCurve(col, accent, c);
    drawGauge(col, accent, c);
  }

  // a plan view of the walkway: it runs left-right, and bows sideways (toward
  // the viewer, drawn as +y) at mid-span by `off`, its ends pinned to the piers
  function drawDeck(col, dcol, accent, off, frac, c, runaway) {
    var x0 = 60, x1 = 300, yc = 150, halfW = 15;
    var mx = (x0 + x1) / 2;
    var ctrlY = yc + 2 * off;      // quadratic control so mid-point sits at yc+off

    // the abutments (pinned ends)
    ctx.fillStyle = col.faint;
    ctx.fillRect(x0 - 6, yc - halfW - 4, 6, 2 * halfW + 8);
    ctx.fillRect(x1, yc - halfW - 4, 6, 2 * halfW + 8);

    // the still centreline, faint, for reference
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
    ctx.setLineDash([]);

    // the deck edges, bowed
    var edge = function (dy) {
      ctx.beginPath();
      ctx.moveTo(x0, yc + dy);
      ctx.quadraticCurveTo(mx, ctrlY + dy, x1, yc + dy);
      ctx.stroke();
    };
    ctx.strokeStyle = dcol; ctx.lineWidth = 2 + frac * 2;
    edge(-halfW); edge(halfW);
    // the deck fill
    ctx.fillStyle = withAlpha(dcol, 0.10);
    ctx.beginPath();
    ctx.moveTo(x0, yc - halfW);
    ctx.quadraticCurveTo(mx, ctrlY - halfW, x1, yc - halfW);
    ctx.lineTo(x1, yc + halfW);
    ctx.quadraticCurveTo(mx, ctrlY + halfW, x0, yc + halfW);
    ctx.closePath(); ctx.fill();
    // the bowed centreline
    ctx.strokeStyle = withAlpha(dcol, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0, yc); ctx.quadraticCurveTo(mx, ctrlY, x1, yc); ctx.stroke();

    // the crowd — dots riding the bowed deck, more dots for a bigger crowd
    var n = Math.round(3 + state.crowd * 1.6);
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      var bx = x0 + (x1 - x0) * t;
      // point on the quadratic centreline at parameter t
      var by = (1 - t) * (1 - t) * yc + 2 * (1 - t) * t * ctrlY + t * t * yc;
      var jig = (i % 2 ? 1 : -1) * 4;
      ctx.fillStyle = withAlpha(col.crowd, 0.92);
      ctx.beginPath(); ctx.arc(bx, by + jig, 3, 0, 2 * Math.PI); ctx.fill();
    }
    label(ctx, col.crowd2, "crowd", x0 + 2, yc + halfW + 22, "left");
    label(ctx, dcol, runaway ? "closed" : (Math.abs(off) > 1 ? "sway " + Math.round(c.sway) + " mm" : "still"), x1, yc - halfW - 10, "right");

    // the feedback caption — the push grows with the sway
    label(ctx, col.faint, "step feeds sway feeds step", mx, yc + halfW + 40, "center");

    if (runaway) {
      // barrier across the mouth
      ctx.strokeStyle = col.dead; ctx.lineWidth = 2;
      for (var b = 0; b < 3; b++) {
        var yy = yc - halfW - 8 + b * (halfW + 4);
        ctx.beginPath(); ctx.moveTo(x0 - 8, yy); ctx.lineTo(x0 + 30, yy - 8); ctx.stroke();
      }
    }
  }

  function drawCurve(col, accent, c) {
    var ix = 320, iy = 24, iw = 180, ih = 156, pad = 14;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "gain vs step", ix + 10, iy + 15, "left");

    var Ox = ix + pad + 4, Oy = iy + ih - pad - 6, PW = iw - 2 * pad - 8, PH = ih - 2 * pad - 22;
    var rLo = SMIN / F0, rHi = SMAX / F0;
    var gTop = Math.max(c.peakGain, 6) * 1.12;
    var xFor = function (r) { return Ox + (r - rLo) / (rHi - rLo) * PW; };
    var yFor = function (g) { return Oy - clamp(g, 0, gTop) / gTop * PH; };

    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + PW, Oy); ctx.stroke();

    var xn = xFor(1);
    ctx.strokeStyle = withAlpha(col.dead, 0.45); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xn, Oy); ctx.lineTo(xn, iy + pad + 2); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.dead, "sway", xn, Oy + 12, "center");

    // the curve at the current damping
    ctx.strokeStyle = col.steel2; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i <= 120; i++) {
      var r = rLo + (rHi - rLo) * i / 120;
      var g = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / c.Q, 2));
      var X = xFor(r), Y = yFor(g);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    // the bare-deck curve behind, faint, so the damping's effect reads
    if (state.damp > 0) {
      ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath();
      for (var j = 0; j <= 120; j++) {
        var r2 = rLo + (rHi - rLo) * j / 120;
        var g2 = 1 / Math.sqrt(Math.pow(1 - r2 * r2, 2) + Math.pow(r2 / 30, 2));
        var X2 = xFor(r2), Y2 = yFor(g2);
        if (j === 0) ctx.moveTo(X2, Y2); else ctx.lineTo(X2, Y2);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }

    var cx = xFor(c.r), cy = yFor(c.gain);
    ctx.strokeStyle = withAlpha(accent, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, Oy); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();

    label(ctx, col.faint, "slow", Ox, Oy + 12, "left");
    label(ctx, col.faint, "fast", Ox + PW, Oy + 12, "right");
  }

  function drawGauge(col, accent, c) {
    var bx = 24, by = 300, bw = W - 48, bh = 116;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the sway of the span, against comfort and the limit", bx + 12, by + 18, "left");

    var gx0 = 48, gx1 = W - 48, gy = by + 66, scaleMax = CLOSE + 12;
    var xFor = function (a) { return gx0 + clamp(a, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    var xco = xFor(COMFORT), xl = xFor(LOCK), xc = xFor(CLOSE);
    ctx.fillStyle = withAlpha(col.keep, 0.22); ctx.fillRect(gx0, gy - 9, xco - gx0, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy - 9, xco - gx0, 18);
    ctx.fillStyle = withAlpha(col.drift, 0.20); ctx.fillRect(xco, gy - 9, xc - xco, 18);

    // the lock-in tick
    ctx.strokeStyle = withAlpha(col.drift, 0.9); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(xl, gy - 12); ctx.lineTo(xl, gy + 12); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xc, gy - 13); ctx.lineTo(xc, gy + 13); ctx.stroke();

    label(ctx, col.keep, "steady", (gx0 + xco) / 2, gy - 15, "center");
    label(ctx, col.drift, "lock-in", xl, gy + 22, "center");
    label(ctx, col.dead, "closed", xc, gy + 22, "center");

    var nX = xFor(c.sway);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 12); ctx.lineTo(nX, gy + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 12, 3, 0, 2 * Math.PI); ctx.fill();
    label(ctx, accent, Math.round(c.sway) + " mm", nX, gy + 22, "center");
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
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);
  var curVerdict = verdictOf(state, current);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    var ease = Math.min(1, dt * 3.0);
    if (!initShown) { shown.sway = current.sway; initShown = true; }
    shown.sway += (current.sway - shown.sway) * ease;

    phase += dt * (F0 / 60) * 2 * Math.PI;
    if (phase > 1e6) phase = phase % (2 * Math.PI);

    draw(current, curVerdict);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels(current);
    curVerdict = render(current);
  }

  inF.addEventListener("input", function () { state.step = parseInt(inF.value, 10); update(); });
  inC.addEventListener("input", function () { state.crowd = parseInt(inC.value, 10); update(); });
  inD.addEventListener("input", function () { state.damp = parseInt(inD.value, 10); update(); });

  $("find").addEventListener("click", function () {
    state.damp = fitDampers(state); inD.value = state.damp; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inF.value = state.step; inC.value = state.crowd; inD.value = state.damp;
    update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current, curVerdict); });
  }

  // ---- go --------------------------------------------------------------
  inF.value = state.step; inC.value = state.crowd; inD.value = state.damp;
  update();
})();
