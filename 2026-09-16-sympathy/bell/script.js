/* Bell — the bench.
 *
 * A tower bell swings at one natural stroke f0, fixed by its mass and wheel.
 * Pull the rope at frequency f and the settled swing is the swing a single
 * pull would give, multiplied by the resonant gain:
 *
 *   r     = f / f0                                   (tempo against the beat)
 *   gain  = 1 / sqrt((1 - r^2)^2 + (r/Q)^2)          (the amplification)
 *   swing = static_pull * gain                        (degrees from hanging down)
 *
 * On the beat (r = 1) the gain rises to about Q, so a freely-swinging bell
 * (high Q) rings up enormously — but its peak is only ~1/Q wide in r, so the
 * freer it swings the finer the tempo it demands. Off the beat the pulls
 * quarrel and the gain collapses toward one. The pull only scales what the
 * timing has already won. Left driven on the beat the swing climbs until
 * something stops it: the ringer, or the stay at the top of the arc.
 *
 * The bell's stroke, mass and stay angle are stylised — plausible, not
 * measured — but the gain and the swing drawn from them are exact.
 */
(function () {
  "use strict";

  var F0 = 30;                 // the bell's natural stroke, pulls per minute
  var TMIN = 18, TMAX = 46, TSTEP = 1;   // your pull's tempo, per minute
  var QMIN = 3,  QMAX = 26, QSTEP = 1;   // freedom — cycles it keeps swinging
  var PMIN = 1,  PMAX = 10, PSTEP = 1;   // pull strength (relative)
  var STAT = 1.9;             // degrees a single lone pull throws a still bell
  var PEAL = 70;              // a swing this high or more is a true round peal
  var BAL  = 150;            // above this the bell rides near the balance
  var STAY = 176;            // past this the swing throws the bell over the stay
  var CAP  = 188;            // display ceiling for the swing

  // Opens off the beat — a slow, mistimed pull — so the bell rocks and hangs
  // dead. Find the stroke brings the tempo onto the beat and it rings up.
  var DEFAULT = { tempo: 22, Q: 12, pull: 6 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var state = Object.assign({}, DEFAULT);

  // ---- the swing -------------------------------------------------------
  function compute(s) {
    var r = s.tempo / F0;
    var gain = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / s.Q, 2));
    var stat = s.pull * STAT;
    var swing = Math.min(stat * gain, CAP);         // degrees, capped for display
    var over = stat * gain >= STAY;
    var offBand = clamp(0.9 / s.Q, 0.05, 0.35);     // how far off the beat still builds
    var offBeat = Math.abs(r - 1) > offBand;
    var build = s.Q / Math.PI;                       // strokes to settle (~63%)
    var peakGain = 1 / Math.sqrt(Math.pow(1 - 1, 2) + Math.pow(1 / s.Q, 2)); // ≈ Q on beat
    return {
      r: r, gain: gain, stat: stat, swing: swing, over: over,
      offBeat: offBeat, offBand: offBand, build: build, peakGain: peakGain
    };
  }

  function verdictOf(s, c) {
    if (c.over) return "over";
    if (c.offBeat) return "cold";       // pulls quarrel — won't build
    if (c.swing < PEAL) return "labour";
    return "peal";
  }

  // the tempo that sits on the bell's beat
  function findStroke() { return F0; }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inF = $("in-f"), inQ = $("in-Q"), inP = $("in-P");
  var labF = $("lab-f"), labQ = $("lab-Q"), labP = $("lab-P");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");
  var fMark = $("f-mark"), fNote = $("f-note");

  function syncLabels(c) {
    labF.textContent = state.tempo + " ⁄ min · r " + c.r.toFixed(2);
    labQ.textContent = "Q " + state.Q;
    labP.textContent = String(state.pull);
  }

  var VERDICT_TEXT = {
    peal:   { cls: "v-keep",  word: "Rings up",    note: "timed, and climbing to a true peal" },
    labour: { cls: "v-drift", word: "Labours",     note: "on the beat, but hung too stiff to climb" },
    cold:   { cls: "v-drift", word: "Won't build", note: "off the beat — the pulls quarrel" }
  };

  function swingClass(c) {
    if (c.over) return "bad";
    if (c.swing >= BAL) return "warn";
    if (c.swing >= PEAL) return "good";
    return "warn";
  }

  function render(c) {
    var verdict = verdictOf(state, c);
    var v = verdict === "over"
      ? { cls: "v-dead", word: "Over the stay", note: "driven past the balance — the stay breaks" }
      : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var gainCls = c.offBeat ? "warn" : (c.gain >= 0.6 * c.peakGain ? "good" : "warn");
    var swingCls = swingClass(c);
    var buildTxt = c.offBeat ? "—" : "≈ " + Math.round(c.build) + " strokes";

    var rows = [
      ["Beat", "r " + c.r.toFixed(2) + '<span class="unit"> · ' + (c.offBeat ? "off the stroke" : "on the stroke") + "</span>", c.offBeat ? "warn" : "good"],
      ['Gain <span class="tag">×</span>', "×" + c.gain.toFixed(1) + '<span class="unit"> / peak ×' + c.peakGain.toFixed(0) + "</span>", gainCls],
      ["Swing", Math.round(c.swing) + '<span class="unit">° / stay ' + STAY + "°</span>", swingCls],
      ["Build-up", buildTxt, c.offBeat ? "warn" : "good"]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markBeat(c);
    return verdict;
  }

  // mark, under the tempo slider, the tempo that sits on the beat
  function markBeat(c) {
    if (!fMark || !fNote) return;
    fMark.style.left = ((F0 - TMIN) / (TMAX - TMIN) * 100) + "%";
    fMark.className = "x-mark" + (c.offBeat ? " off" : "");
    if (!c.offBeat) fNote.innerHTML = "on the bell's own stroke: <b>" + F0 + " ⁄ min</b>";
    else fNote.innerHTML = "the beat is at <b>" + F0 + " ⁄ min</b> — you are " + (state.tempo < F0 ? "under" : "over") + " it";
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

  // pivot of the bell rig, canvas space
  var PX = 150, PY = 150, ARM = 34;

  // eased display state, so a change of tempo reads as the bell ringing up or
  // dying away rather than jumping; phase drives the visible swinging
  var shown = { swing: 8 };
  var phase = 0, lastTs = null, initShown = false;

  function accentFor(verdict) {
    return verdict === "peal" ? cssVar("--keep")
      : verdict === "over" ? cssVar("--dead") : cssVar("--drift");
  }

  function draw(c, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      metal: cssVar("--metal"), metal2: cssVar("--metal-2"),
      swing: cssVar("--swing"), swing2: cssVar("--swing-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = accentFor(verdict);

    ctx.clearRect(0, 0, W, H);

    // colour of the bell metal by how near the swing stands to the stay
    var frac = clamp(shown.swing / STAY, 0, 1);
    var bcol = shown.swing >= STAY ? col.dead : shown.swing >= BAL ? col.drift : col.metal;

    // the arc the bell sweeps, faint, to the balance and the stay
    var Amax = clamp(shown.swing, 0, CAP) * Math.PI / 180;
    drawArc(col, accent, Amax);

    // the current angle of the swing
    var ang = (shown.swing * Math.PI / 180) * Math.sin(phase);

    // headstock and pivot
    ctx.fillStyle = col.faint;
    ctx.beginPath(); ctx.arc(PX, PY, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX - 40, PY); ctx.lineTo(PX + 40, PY); ctx.stroke();

    // the bell, rotated about the pivot
    ctx.save();
    ctx.translate(PX, PY);
    ctx.rotate(ang);
    drawBell(col, bcol, frac);
    ctx.restore();

    // the rope / sally hint hanging from the wheel
    label(ctx, col.faint, "wheel", PX + 44, PY - 4, "left");

    // the response curve, top-right
    drawCurve(col, accent, c);

    // the gauge, bottom
    drawGauge(col, accent, c);

    // build-up caption
    label(ctx, col.faint, c.offBeat ? "off the beat" : "on the beat", PX, 250, "center");
  }

  // the bell body, drawn hanging from local origin (the pivot), mouth down
  function drawBell(col, bcol, frac) {
    // canon / stay-timber from pivot down to the crown
    ctx.strokeStyle = withAlpha(bcol, 0.8); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ARM); ctx.stroke();

    var topY = ARM, h = 78, wTop = 20, wBot = 44;
    ctx.fillStyle = withAlpha(bcol, 0.14);
    ctx.strokeStyle = bcol; ctx.lineWidth = 3 + frac * 2.4; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-wTop, topY);
    ctx.quadraticCurveTo(-wBot * 0.62, topY + h * 0.5, -wBot, topY + h);
    ctx.lineTo(wBot, topY + h);
    ctx.quadraticCurveTo(wBot * 0.62, topY + h * 0.5, wTop, topY);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // shoulder cap
    ctx.fillStyle = bcol; ctx.fillRect(-wTop - 2, topY - 5, 2 * wTop + 4, 5);
    // soundbow (the mouth rim)
    ctx.strokeStyle = bcol; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-wBot, topY + h); ctx.lineTo(wBot, topY + h); ctx.stroke();
    ctx.lineCap = "butt";
    // clapper
    ctx.fillStyle = withAlpha(col.swing2, 0.9);
    ctx.beginPath(); ctx.arc(0, topY + h - 12, 5, 0, 2 * Math.PI); ctx.fill();
  }

  // faint sweep arc, with the balance and the stay marked
  function drawArc(col, accent, Amax) {
    var R = ARM + 78;
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(PX, PY, R, Math.PI / 2 - Amax, Math.PI / 2 + Amax); ctx.stroke();
    // swept fill
    ctx.fillStyle = withAlpha(accent, 0.08);
    ctx.beginPath(); ctx.moveTo(PX, PY);
    ctx.arc(PX, PY, R, Math.PI / 2 - Amax, Math.PI / 2 + Amax); ctx.closePath(); ctx.fill();
    // the stay marks, at ±STAY
    var sa = STAY * Math.PI / 180;
    tickAt(col.dead, PX, PY, R, Math.PI / 2 - sa, "stay");
    tickAt(col.dead, PX, PY, R, Math.PI / 2 + sa, "");
    var ba = BAL * Math.PI / 180;
    tickAt(withAlpha(col.drift, 0.8), PX, PY, R, Math.PI / 2 - ba, "");
    tickAt(withAlpha(col.drift, 0.8), PX, PY, R, Math.PI / 2 + ba, "");
  }
  function tickAt(color, cx, cy, R, a, txt) {
    // the point on the sweep arc at angle a (measured as the canvas arc, from +x)
    var px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
    var ix = cx + (R - 8) * Math.cos(a), iy = cy + (R - 8) * Math.sin(a);
    ctx.strokeStyle = color; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(px, py); ctx.stroke();
    if (txt) label(ctx, color, txt, px + 4, py, "left");
  }

  // the resonance curve: gain vs tempo, with the peak near the beat and the
  // current pull marked. The whole trade is in this one shape.
  function drawCurve(col, accent, c) {
    var ix = 300, iy = 24, iw = 200, ih = 168, pad = 14;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "gain vs tempo", ix + 10, iy + 15, "left");

    var Ox = ix + pad + 4, Oy = iy + ih - pad - 6, PW = iw - 2 * pad - 8, PH = ih - 2 * pad - 22;
    var rLo = 0.4, rHi = 1.7;
    var gTop = Math.max(c.peakGain, 6) * 1.12;        // scale to the peak in view
    var xFor = function (r) { return Ox + (r - rLo) / (rHi - rLo) * PW; };
    var yFor = function (g) { return Oy - clamp(g, 0, gTop) / gTop * PH; };

    // baseline
    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + PW, Oy); ctx.stroke();
    // the beat, r = 1
    var xb = xFor(1);
    ctx.strokeStyle = withAlpha(col.keep, 0.55); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xb, Oy); ctx.lineTo(xb, iy + pad + 2); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.keep, "beat", xb, Oy + 12, "center");

    // the curve
    ctx.strokeStyle = col.swing2; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i <= 120; i++) {
      var r = rLo + (rHi - rLo) * i / 120;
      var g = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / state.Q, 2));
      var X = xFor(r), Y = yFor(g);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    // where your pull falls
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
    label(ctx, col.faint, "the swing, against the balance and the stay", bx + 12, by + 18, "left");

    var gx0 = 48, gx1 = W - 48, gy = by + 66, scaleMax = STAY + 8;
    var xFor = function (a) { return gx0 + clamp(a, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // green peal band, amber near-balance band
    var xp = xFor(PEAL), xb = xFor(BAL), xs = xFor(STAY);
    ctx.fillStyle = withAlpha(col.keep, 0.22); ctx.fillRect(xp, gy - 9, xb - xp, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1; ctx.strokeRect(xp, gy - 9, xb - xp, 18);
    ctx.fillStyle = withAlpha(col.drift, 0.20); ctx.fillRect(xb, gy - 9, xs - xb, 18);

    // the stay wall
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xs, gy - 13); ctx.lineTo(xs, gy + 13); ctx.stroke();

    label(ctx, col.faint, "dead", gx0, gy + 22, "left");
    label(ctx, col.keep, "peal", (xp + xb) / 2, gy - 15, "center");
    label(ctx, col.drift, "balance", (xb + xs) / 2, gy - 15, "center");
    label(ctx, col.dead, "stay", xs, gy + 22, "center");

    // needle at the settled swing
    var nX = xFor(c.swing);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 12); ctx.lineTo(nX, gy + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 12, 3, 0, 2 * Math.PI); ctx.fill();
    label(ctx, accent, Math.round(c.swing) + "°", nX, gy + 22, "center");
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

    var ease = Math.min(1, dt * 3.2);                 // the swing rings up / dies away
    if (!initShown) { shown.swing = current.swing; initShown = true; }
    shown.swing += (current.swing - shown.swing) * ease;

    // the visible swinging, at the bell's own stroke
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

  inF.addEventListener("input", function () { state.tempo = parseInt(inF.value, 10); update(); });
  inQ.addEventListener("input", function () { state.Q = parseInt(inQ.value, 10); update(); });
  inP.addEventListener("input", function () { state.pull = parseInt(inP.value, 10); update(); });

  $("find").addEventListener("click", function () {
    state.tempo = findStroke(); inF.value = state.tempo; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inF.value = state.tempo; inQ.value = state.Q; inP.value = state.pull;
    update();
  });

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current, curVerdict); });
  }

  // ---- go --------------------------------------------------------------
  inF.value = state.tempo; inQ.value = state.Q; inP.value = state.pull;
  update();
})();
