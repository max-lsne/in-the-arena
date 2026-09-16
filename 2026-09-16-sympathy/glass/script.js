/* Glass — the bench.
 *
 * A wine glass rings at one natural note f0, fixed by its bowl. Hold a tone
 * at frequency f and the settled flex of the rim is the flex a slow steady
 * push would give, multiplied by the resonant gain:
 *
 *   r     = f / f0                                   (pitch against the note)
 *   gain  = 1 / sqrt((1 - r^2)^2 + (r/Q)^2)          (the amplification)
 *   flex  = static_push * gain                        (microns, rim deflection)
 *
 * On the note (r = 1) the gain rises to about Q, so a fine crystal (high Q)
 * flexes enormously — but its peak is only ~1/Q wide in r, so the finer the
 * glass the more exactly the tone must sit on the note. Off the note the
 * pushes fall out of step and the flex collapses toward the static push.
 * Loudness only scales what the match has already won. Drive a fine glass on
 * its note and the flex settles past the breaking strain, and it shatters.
 *
 * The glass's note, wall and breaking strain are stylised, and its ring Q is
 * drawn far lower than real crystal so the curve reads on the page — but the
 * gain and the flex drawn from them are exact.
 */
(function () {
  "use strict";

  var F0 = 660;                // the glass's natural note, hertz
  var FMIN = 520, FMAX = 820, FSTEP = 2;   // the tone's pitch
  var QMIN = 4,  QMAX = 40, QSTEP = 1;     // the glass — cycles it rings on
  var PMIN = 1,  PMAX = 10, PSTEP = 1;     // loudness (relative)
  var STAT = 0.62;            // microns of flex a single soft push gives
  var RING = 6;               // above this the rim visibly sings
  var STRAIN = 22;            // above this the rim is strained near breaking
  var SHAT = 34;              // past this the flex breaks the silica
  var CAP = 54;               // display ceiling for the flex

  // Opens off the note — a tone a little flat of the glass — so it rings but
  // does not break. Find the note tunes onto the pitch and it shatters.
  var DEFAULT = { pitch: 600, Q: 18, loud: 6 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var state = Object.assign({}, DEFAULT);

  // ---- the flex --------------------------------------------------------
  function compute(s) {
    var r = s.pitch / F0;
    var gain = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / s.Q, 2));
    var stat = s.loud * STAT;
    var raw = stat * gain;
    var flex = Math.min(raw, CAP);
    var peakGain = s.Q;                              // ≈ gain at r = 1
    var band = shatterBand(s);                       // Hz half-width that shatters
    return { r: r, gain: gain, stat: stat, raw: raw, flex: flex, peakGain: peakGain, band: band };
  }

  // the span of pitch (Hz, half-width from the note) within which, at this
  // loudness and glass, the flex reaches the breaking strain — 0 if it can't
  function shatterBand(s) {
    var stat = s.loud * STAT;
    if (stat * s.Q < SHAT) return 0;                 // can't reach the strain at all
    var lo = F0, hi = F0;
    for (var f = F0; f <= F0 * 1.6; f += 0.5) {
      var r = f / F0, g = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / s.Q, 2));
      if (stat * g >= SHAT) hi = f; else break;
    }
    for (var f2 = F0; f2 >= F0 * 0.5; f2 -= 0.5) {
      var r2 = f2 / F0, g2 = 1 / Math.sqrt(Math.pow(1 - r2 * r2, 2) + Math.pow(r2 / s.Q, 2));
      if (stat * g2 >= SHAT) lo = f2; else break;
    }
    return Math.round((hi - lo) / 2);
  }

  function verdictOf(s, c) {
    if (c.raw >= SHAT) return "shatter";
    if (c.raw >= STRAIN) return "strain";
    if (c.raw >= RING) return "ring";
    return "silent";
  }

  function findNote() { return F0; }

  function glassWord(Q) {
    return Q >= 26 ? "fine crystal" : Q >= 15 ? "crystal" : Q >= 8 ? "glass" : "tumbler";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inF = $("in-f"), inQ = $("in-Q"), inP = $("in-P");
  var labF = $("lab-f"), labQ = $("lab-Q"), labP = $("lab-P");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");
  var fMark = $("f-mark"), fNote = $("f-note");

  function syncLabels(c) {
    labF.textContent = state.pitch + " Hz · r " + c.r.toFixed(2);
    labQ.textContent = "Q " + state.Q + " · " + glassWord(state.Q);
    labP.textContent = state.loud + " · " + Math.round(80 + state.loud * 2) + " dB";
  }

  var VERDICT_TEXT = {
    silent: { cls: "v-drift", word: "Silent",  note: "off the note, or too soft — the rim barely stirs" },
    ring:   { cls: "v-keep",  word: "Rings",   note: "near the note, singing, well within its strain" },
    strain: { cls: "v-drift", word: "Strains", note: "on the note and loud — the rim near breaking" }
  };

  function flexClass(c) {
    if (c.raw >= SHAT) return "bad";
    if (c.raw >= STRAIN) return "warn";
    if (c.raw >= RING) return "good";
    return "warn";
  }

  function render(c) {
    var verdict = verdictOf(state, c);
    var v = verdict === "shatter"
      ? { cls: "v-dead", word: "Shatters", note: "flexed past the strain — the bowl bursts" }
      : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var off = Math.abs(state.pitch - F0);
    var gainCls = c.gain >= 0.6 * c.peakGain ? "good" : "warn";
    var bandTxt = c.band > 0 ? "± " + c.band + " Hz" : "— can't break";

    var rows = [
      ["Note", "r " + c.r.toFixed(2) + '<span class="unit"> · ' + (off <= 4 ? "on the note" : off + " Hz off") + "</span>", off <= 12 ? "good" : "warn"],
      ['Gain <span class="tag">×</span>', "×" + c.gain.toFixed(1) + '<span class="unit"> / peak ×' + Math.round(c.peakGain) + "</span>", gainCls],
      ["Flex", c.flex.toFixed(1) + '<span class="unit"> µm / strain ' + SHAT + "</span>", flexClass(c)],
      ["Shatter band", bandTxt, c.band > 0 ? "warn" : "good"]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markNote(c);
    return verdict;
  }

  // mark, under the pitch slider, the glass's own note
  function markNote(c) {
    if (!fMark || !fNote) return;
    var off = Math.abs(state.pitch - F0);
    fMark.style.left = ((F0 - FMIN) / (FMAX - FMIN) * 100) + "%";
    fMark.className = "x-mark" + (off > 4 ? " off" : "");
    if (off <= 4) fNote.innerHTML = "dead on the glass's note: <b>" + F0 + " Hz</b>";
    else fNote.innerHTML = "the note is <b>" + F0 + " Hz</b> — you are " + (state.pitch < F0 ? "flat" : "sharp") + " of it";
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

  // eased display flex; phase drives the visible flexing of the rim
  var shown = { flex: 4 };
  var phase = 0, lastTs = null, initShown = false;

  function accentFor(verdict) {
    return verdict === "ring" ? cssVar("--keep")
      : verdict === "shatter" ? cssVar("--dead") : cssVar("--drift");
  }

  function draw(c, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      tone: cssVar("--tone"), tone2: cssVar("--tone-2"),
      glass: cssVar("--glass"), glass2: cssVar("--glass-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = accentFor(verdict);

    ctx.clearRect(0, 0, W, H);

    var shattered = verdict === "shatter";
    var frac = clamp(shown.flex / SHAT, 0, 1);
    var gcol = shattered ? col.dead : shown.flex >= STRAIN ? col.drift : col.glass;

    // the sound waves from the tone, washing over the glass
    drawTone(col, accent, verdict);

    // the glass — a stemmed bowl whose rim flexes round↔oval
    var ampPx = clamp(shown.flex * 0.5, 0, 26);
    drawGlass(col, gcol, frac, ampPx, shattered);

    // the response curve, top-right
    drawCurve(col, accent, c);

    // the gauge, bottom
    drawGauge(col, accent, c);
  }

  // concentric arcs from the left, the held tone reaching the glass
  function drawTone(col, accent, verdict) {
    var sx = 26, sy = 150;
    ctx.strokeStyle = withAlpha(col.tone, verdict === "silent" ? 0.28 : 0.6);
    ctx.lineWidth = 1.4;
    for (var i = 0; i < 4; i++) {
      var rr = 16 + i * 13 + (phase * 6 % 13);
      ctx.beginPath(); ctx.arc(sx, sy, rr, -0.7, 0.7); ctx.stroke();
    }
    label(ctx, col.tone2, "tone", sx - 2, sy + 34, "left");
  }

  // a stemmed wine glass centred at cx; the rim ellipse breathes by ampPx
  function drawGlass(col, gcol, frac, ampPx, shattered) {
    var cx = 168, rimY = 122, baseY = 226, footY = 300;
    var rimRX0 = 56, rimRY0 = 13, bowlHalf = 16;
    var b = Math.sin(phase);
    var rx = rimRX0 + (shattered ? 0 : ampPx * b);
    var ry = rimRY0 - (shattered ? 0 : ampPx * 0.42 * b);

    ctx.strokeStyle = gcol; ctx.lineWidth = 2.4 + frac * 1.6; ctx.lineJoin = "round";
    ctx.fillStyle = withAlpha(gcol, 0.08);

    // bowl body: two sides from the rim edge down to the base
    ctx.beginPath();
    ctx.moveTo(cx - rx, rimY);
    ctx.quadraticCurveTo(cx - rx * 0.9, rimY + 58, cx - bowlHalf, baseY);
    ctx.lineTo(cx + bowlHalf, baseY);
    ctx.quadraticCurveTo(cx + rx * 0.9, rimY + 58, cx + rx, rimY);
    ctx.closePath();
    ctx.fill();
    if (!shattered) ctx.stroke();

    // the rim ellipse (front + back), flexing
    ctx.strokeStyle = gcol; ctx.lineWidth = 2.6 + frac * 1.6;
    ellipse(cx, rimY, Math.abs(rx), Math.abs(ry));
    if (!shattered) ctx.stroke();

    // stem and foot
    ctx.strokeStyle = withAlpha(gcol, 0.9); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.lineTo(cx, footY - 4); ctx.stroke();
    ellipse(cx, footY, 30, 7);
    ctx.lineWidth = 2.4; ctx.stroke();

    // a bead of wine in the bowl, catching the flex
    if (!shattered) {
      ctx.fillStyle = withAlpha(col.dead, 0.16);
      ctx.beginPath(); ctx.ellipse(cx, baseY - 6, Math.abs(rx) * 0.5, 6, 0, 0, 2 * Math.PI); ctx.fill();
    }

    if (shattered) drawCracks(col, cx, rimY, rimRX0, baseY);

    label(ctx, shattered ? col.dead : col.faint, shattered ? "burst" : (Math.abs(rx) > rimRX0 ? "oval" : "round"), cx, footY + 18, "center");
  }

  function drawCracks(col, cx, rimY, rx, baseY) {
    ctx.strokeStyle = col.dead; ctx.lineWidth = 1.4;
    var seeds = [-0.9, -0.4, 0.1, 0.6, 1.0];
    for (var i = 0; i < seeds.length; i++) {
      var a = seeds[i];
      var x0 = cx + a * rx * 0.8, y0 = rimY + 6;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      var x = x0, y = y0;
      for (var j = 0; j < 4; j++) {
        x += (a * 10) + (j % 2 ? 8 : -8);
        y += (baseY - rimY) / 4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // a couple of sprung shards
    ctx.fillStyle = withAlpha(col.dead, 0.5);
    ctx.beginPath(); ctx.moveTo(cx + rx, rimY); ctx.lineTo(cx + rx + 18, rimY - 10); ctx.lineTo(cx + rx + 8, rimY + 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - rx, rimY + 4); ctx.lineTo(cx - rx - 16, rimY - 2); ctx.lineTo(cx - rx - 6, rimY + 12); ctx.closePath(); ctx.fill();
  }

  function ellipse(cx, cy, rx, ry) {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
  }

  // the resonance curve: gain vs pitch, peaking on the note
  function drawCurve(col, accent, c) {
    var ix = 300, iy = 24, iw = 200, ih = 168, pad = 14;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "gain vs pitch", ix + 10, iy + 15, "left");

    var Ox = ix + pad + 4, Oy = iy + ih - pad - 6, PW = iw - 2 * pad - 8, PH = ih - 2 * pad - 22;
    var rLo = FMIN / F0, rHi = FMAX / F0;
    var gTop = Math.max(c.peakGain, 6) * 1.12;
    var xFor = function (r) { return Ox + (r - rLo) / (rHi - rLo) * PW; };
    var yFor = function (g) { return Oy - clamp(g, 0, gTop) / gTop * PH; };

    ctx.strokeStyle = withAlpha(col.faint, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + PW, Oy); ctx.stroke();

    var xn = xFor(1);
    ctx.strokeStyle = withAlpha(col.keep, 0.55); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xn, Oy); ctx.lineTo(xn, iy + pad + 2); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.keep, "note", xn, Oy + 12, "center");

    ctx.strokeStyle = col.glass2; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i <= 120; i++) {
      var r = rLo + (rHi - rLo) * i / 120;
      var g = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / state.Q, 2));
      var X = xFor(r), Y = yFor(g);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    var cx = xFor(c.r), cy = yFor(c.gain);
    ctx.strokeStyle = withAlpha(accent, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, Oy); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();

    label(ctx, col.faint, "flat", Ox, Oy + 12, "left");
    label(ctx, col.faint, "sharp", Ox + PW, Oy + 12, "right");
  }

  function drawGauge(col, accent, c) {
    var bx = 24, by = 300, bw = W - 48, bh = 116;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the flex of the rim, against the breaking strain", bx + 12, by + 18, "left");

    var gx0 = 48, gx1 = W - 48, gy = by + 66, scaleMax = SHAT + 10;
    var xFor = function (a) { return gx0 + clamp(a, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    var xr = xFor(RING), xt = xFor(STRAIN), xs = xFor(SHAT);
    ctx.fillStyle = withAlpha(col.keep, 0.22); ctx.fillRect(xr, gy - 9, xt - xr, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1; ctx.strokeRect(xr, gy - 9, xt - xr, 18);
    ctx.fillStyle = withAlpha(col.drift, 0.20); ctx.fillRect(xt, gy - 9, xs - xt, 18);

    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(xs, gy - 13); ctx.lineTo(xs, gy + 13); ctx.stroke();

    label(ctx, col.faint, "silent", gx0, gy + 22, "left");
    label(ctx, col.keep, "rings", (xr + xt) / 2, gy - 15, "center");
    label(ctx, col.drift, "strains", (xt + xs) / 2, gy - 15, "center");
    label(ctx, col.dead, "shatters", xs, gy + 22, "center");

    var nX = xFor(c.raw);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 12); ctx.lineTo(nX, gy + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 12, 3, 0, 2 * Math.PI); ctx.fill();
    label(ctx, accent, c.flex.toFixed(0) + " µm", nX, gy + 22, "center");
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

    var ease = Math.min(1, dt * 3.4);
    if (!initShown) { shown.flex = current.flex; initShown = true; }
    shown.flex += (current.flex - shown.flex) * ease;

    // the rim flexes fast — draw it at a legible rate, not the true 660 Hz
    phase += dt * 3.2 * 2 * Math.PI;
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

  inF.addEventListener("input", function () { state.pitch = parseInt(inF.value, 10); update(); });
  inQ.addEventListener("input", function () { state.Q = parseInt(inQ.value, 10); update(); });
  inP.addEventListener("input", function () { state.loud = parseInt(inP.value, 10); update(); });

  $("find").addEventListener("click", function () {
    state.pitch = findNote(); inF.value = state.pitch; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inF.value = state.pitch; inQ.value = state.Q; inP.value = state.loud;
    update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current, curVerdict); });
  }

  // ---- go --------------------------------------------------------------
  inF.value = state.pitch; inQ.value = state.Q; inP.value = state.loud;
  update();
})();
