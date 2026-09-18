/* Toggle — the bench.
 *
 * Two rigid links pinned at a central knee. A push P on the knee, square to the
 * straight line through the two far pins, is shared into compression along the
 * links and reappears at the ends as a thrust Q. Everything the joint does is set
 * by the knee angle θ (each link's angle to that line):
 *
 *   thrust        Q = P / (2·tan θ)          (unbounded as θ → 0)
 *   advantage     Q / P = 1 / (2·tan θ)      (one at θ ≈ 26.6°)
 *   link force    S = P / (2·sin θ)          (the pin passes it; the link buckles under it)
 *   travel        ends move 2·tan θ per step of the knee   (nil at dead centre)
 *
 * Open the toggle wide and it idles — advantage below one, delivering less than
 * it is given. Close it toward straight and the advantage runs away, the travel
 * shrinks, and on the dead centre it takes charge: a hair of push spikes every
 * force, and a hair over centre the load holds the joint shut on its own. The
 * angle sets how the push is multiplied, never how large it is — so the parts'
 * limits (the pins in shear, the links in buckling, the frame in tension) turn on
 * the push and the angle together, and opening the toggle only trades an overload
 * for idleness.
 *
 * The four mechanisms are stylised — plausible sections and design inputs, not
 * measured — but the forces drawn from them are exact. Newtons throughout; kN only
 * at the surface, for the reader.
 */
(function () {
  "use strict";

  // Each mechanism pairs a design push P_ref with three capacities — the pin
  // (double shear, carrying the link thrust S), the links (buckling, under S), and
  // the frame (tension, under the output thrust Q) — and the metal it is cut in.
  // Stylised — plausible, not measured. Forces in newtons.
  var MECHS = {
    clamp:   { label: "clamp",   Pref: 800,    capP: 22000,   capL: 9000,     capF: 14000,   material: "a hand hold-down clamp",         note: "a hand hold-down clamp" },
    press:   { label: "press",   Pref: 40000,  capP: 380000,  capL: 900000,   capF: 1200000, material: "a coining toggle press",         note: "a coining press" },
    crusher: { label: "crusher", Pref: 120000, capP: 3200000, capL: 1400000,  capF: 6000000, material: "a jaw crusher and its plate",     note: "a stone crusher" },
    latch:   { label: "latch",   Pref: 1500,   capP: 26000,   capL: 42000,    capF: 17000,   material: "an over-centre latch",           note: "an over-centre latch" }
  };

  // Opens on the coining press thrown wide to 48° — steeper than the unity angle,
  // so the toggle is a mechanical disadvantage, delivering less than the push — at
  // 88% of its design input. Find the angle on arrival closes it to the bite.
  var DEFAULT = { mech: "press", ang: 48, push: 88 };
  var AMIN = 2, AMAX = 60, ASTEP = 1;         // knee angle, closed (near dead centre) to wide open
  var PMIN = 20, PMAX = 160, PSTEP = 4;
  var UTARGET = 0.72;                          // the utilisation a found angle aims to bite at
  var UNITY = 26.565;                          // θ where the advantage is exactly one (atan ½)
  var LOCK_ANGLE = 4;                          // at or below this, on the dead centre — takes charge
  var LOCK_FLOOR = 6;                          // a found angle never goes below this, to bite clear of lock

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var state = Object.assign({}, DEFAULT);

  // ---- the mechanism ---------------------------------------------------
  // Every force from the angle and the push as a share of the design input.
  function compute(s) {
    var J = MECHS[s.mech];
    var th = s.ang * Math.PI / 180;
    var sin = Math.sin(th), tan = Math.tan(th);

    var P = s.push / 100 * J.Pref;             // the push on the knee
    var S = P / (2 * sin);                     // compression in each link
    var Q = P / (2 * tan);                     // thrust delivered at the ends
    var MA = 1 / (2 * tan);                    // mechanical advantage

    var uP = S / J.capP, uL = S / J.capL, uF = Q / J.capF;
    var umax = Math.max(uP, uL, uF);

    // push %, as a share of P_ref, at which the binding part reaches its limit at
    // this angle. Forces scale with the push, so this is just the current push / u.
    var pSafe = s.push / umax;
    var safeQ = Q / umax;                      // the thrust delivered at that safe push

    var bind = uP >= uL && uP >= uF ? "pin" : uL >= uF ? "link" : "frame";
    var over = umax > 1 + 1e-9;

    return {
      J: J, th: th, sin: sin, tan: tan,
      P: P, S: S, Q: Q, MA: MA,
      uP: uP, uL: uL, uF: uF,
      pSafe: pSafe, safeQ: safeQ, bind: bind, over: over
    };
  }

  // the flattest angle that still bites within every limit — a strong, safe close.
  // For each part solve the angle that brings it to UTARGET; the binding part needs
  // the most-open of those, and we hold clear of the dead centre with LOCK_FLOOR.
  function findAngle(s) {
    var J = MECHS[s.mech];
    var P = s.push / 100 * J.Pref, k = P / 2;
    var aPin = k / (J.capP * UTARGET);         // = sin θ needed to hold the pin at UTARGET
    var aLnk = k / (J.capL * UTARGET);         // = sin θ needed to hold the link
    var aFrm = k / (J.capF * UTARGET);         // = tan θ needed to hold the frame
    if (aPin >= 1 || aLnk >= 1) return null;   // no angle holds this push
    var thPin = Math.asin(aPin), thLnk = Math.asin(aLnk), thFrm = Math.atan(aFrm);
    var th = Math.max(thPin, thLnk, thFrm) * 180 / Math.PI;
    return clamp(Math.round(th / ASTEP) * ASTEP, LOCK_FLOOR, AMAX);
  }

  function verdictOf(s, r) {
    if (r.over) return "over";
    if (s.ang <= LOCK_ANGLE) return "locked";
    if (r.MA < 1) return "slack";
    return "bites";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inP = $("in-P"), inA = $("in-A");
  var labP = $("lab-P"), labA = $("lab-A");
  var mechBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-mech]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");
  var aMark = $("a-mark"), aNote = $("a-note");

  function fmtkN(N) {
    var kN = N / 1000;
    if (kN >= 100) return Math.round(kN) + " kN";
    if (kN >= 10) return (Math.round(kN * 10) / 10) + " kN";
    return (Math.round(kN * 100) / 100) + " kN";
  }

  function syncLabels(r) {
    labP.textContent = state.push + "% · " + fmtkN(r.P);
    labA.textContent = state.ang + "°";
    mechBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.mech === state.mech));
    });
  }

  var VERDICT_TEXT = {
    bites:  { cls: "v-keep",  word: "Bites",  note: "a real thrust, every part inside its limit" },
    slack:  { cls: "v-drift", word: "Slack",  note: "too open — less thrust than the push" },
    locked: { cls: "v-drift", word: "Locked", note: "on dead centre — self-holds, forces spiking" }
  };
  var OVER_NOTE = {
    pin:   "the knee pin sheared past its limit",
    link:  "a link buckled past its limit",
    frame: "the frame tore at its anchor"
  };

  function uClass(u) { return u >= 1 ? "bad" : u >= 0.85 ? "warn" : "good"; }

  function render(r) {
    var verdict = verdictOf(state, r);
    var v = verdict === "over"
      ? { cls: "v-dead", word: "Overstressed", note: OVER_NOTE[r.bind] }
      : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var bindWord = { pin: "pin", link: "link", frame: "frame" }[r.bind];
    var carryCls = r.over ? "bad" : (verdict === "bites" ? "good" : "warn");
    var advCls = verdict === "over" ? "bad" : verdict === "bites" ? "good" : "warn";
    var advWord = verdict === "slack" ? "loses" : verdict === "locked" ? "runs away" : verdict === "over" ? "spikes" : "bites";

    var rows = [
      ["Angle", state.ang + "°" + '<span class="unit"> · ×' + r.MA.toFixed(r.MA >= 10 ? 0 : 1) + "</span>", ""],
      ['Pin <span class="tag">shear</span>', fmtkN(r.S) + '<span class="unit"> / ' + fmtkN(r.J.capP) + "</span>", uClass(r.uP)],
      ['Link <span class="tag">buckle</span>', fmtkN(r.S) + '<span class="unit"> / ' + fmtkN(r.J.capL) + "</span>", uClass(r.uL)],
      ['Frame <span class="tag c">tear</span>', fmtkN(r.Q) + '<span class="unit"> / ' + fmtkN(r.J.capF) + "</span>", uClass(r.uF)],
      ["Thrust", fmtkN(r.Q) + '<span class="unit"> · ' + advWord + "</span>", advCls],
      ["Delivers", fmtkN(r.safeQ) + '<span class="unit"> · ' + bindWord + "</span>", carryCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markAngle();
    return verdict;
  }

  // mark, under the angle slider, the angle the mechanism wants
  function markAngle() {
    if (!aMark || !aNote) return;
    var opt = findAngle(state);
    if (opt == null) {
      aMark.className = "x-mark off";
      aNote.innerHTML = "no angle bites this push — ease it";
      return;
    }
    aMark.style.left = ((opt - AMIN) / (AMAX - AMIN) * 100) + "%";
    aMark.className = "x-mark";
    if (Math.abs(opt - state.ang) <= 1) aNote.innerHTML = "the angle this mechanism wants: <b>" + opt + "°</b>";
    else aNote.innerHTML = "bites within every limit at <b>" + opt + "°</b>";
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

  // toggle geometry, canvas space
  var CX = 176, PIN_BOT = 330, LINK = 150;       // bottom pin fixed; links of fixed length

  // eased display state, so a change of angle reads as the toggle straightening
  // rather than jumping, and a change of push as the work meeting the ram
  var shown = { ang: DEFAULT.ang, push: DEFAULT.push };
  var lastTs = null, initShown = false;

  function partCol(col, u, warm) {
    if (u >= 1) return col.dead;
    if (u >= 0.85) return col.drift;
    return warm ? col.timber : col.iron;
  }
  function linkW(u) { return 4 + clamp(u, 0, 1) * 4; }

  function draw(cur, verdict, angShown) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "bites" ? col.keep
      : verdict === "over" ? col.dead : col.drift;

    ctx.clearRect(0, 0, W, H);

    var th = angShown * Math.PI / 180;
    var h = LINK * Math.cos(th), d = LINK * Math.sin(th);
    var xBot = CX, yBot = PIN_BOT;
    var xTop = CX, yTop = PIN_BOT - 2 * h;          // the ram: rises as the toggle closes
    var xKnee = CX + d, yKnee = PIN_BOT - h;

    // ---- the dead-centre line (the straight the links close toward) ----
    ctx.strokeStyle = withAlpha(col.faint, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(CX, yTop - 16); ctx.lineTo(CX, yBot + 8); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "dead centre", CX + 8, yBot + 36, "left");

    // ---- the frame: base bracket at the bottom pin, work bar over the ram ----
    var fcol = partCol(col, cur.uF, true);
    rectStroke(col, xBot - 26, yBot + 4, 52, 16, fcol, 2);         // base plate
    label(ctx, col.faint, "frame", xBot - 30, yBot + 16, "right");
    // the work the ram bears on, a fixed bar just above the closed position
    var yWork = PIN_BOT - 2 * LINK + 6;
    ctx.fillStyle = withAlpha(fcol, 0.10);
    ctx.fillRect(xBot - 44, yWork - 12, 88, 12);
    ctx.strokeStyle = fcol; ctx.lineWidth = 2; ctx.strokeRect(xBot - 44, yWork - 12, 88, 12);
    label(ctx, col.faint, "work", xBot + 48, yWork - 3, "left");

    // ---- the two links ----
    var lcol = partCol(col, Math.max(cur.uL, cur.uP), false);
    ctx.strokeStyle = lcol; ctx.lineWidth = linkW(Math.max(cur.uL, cur.uP)); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(xBot, yBot); ctx.lineTo(xKnee, yKnee); ctx.lineTo(xTop, yTop); ctx.stroke();
    ctx.lineCap = "butt";
    label(ctx, col.iron2, "links", (xBot + xKnee) / 2 + 8, (yBot + yKnee) / 2 + 4, "left");

    // ---- the three pins ----
    pin(col, xBot, yBot, lcol);
    pin(col, xTop, yTop, lcol);
    pin(col, xKnee, yKnee, partCol(col, cur.uP, false));

    // ---- the push on the knee (warm, square to the dead-centre line) ----
    arrow(ctx, col.timber2, xKnee + 52, yKnee, xKnee + 12, yKnee, 2.4, 8);
    label(ctx, col.timber2, "push " + fmtkN(cur.P), xKnee + 56, yKnee - 8, "left");

    // ---- the thrust delivered at the ram (cold, into the work) ----
    arrow(ctx, accent, xTop, yTop - 6, xTop, yWork + 2, 2.6, 9);
    label(ctx, accent, "thrust " + fmtkN(cur.Q), xTop + 12, yTop + 20, "left");

    // ---- the stop, when the knee is on or past the dead centre ----
    if (angShown <= LOCK_ANGLE) {
      ctx.fillStyle = withAlpha(col.drift, 0.5);
      ctx.fillRect(xKnee + 2, yKnee - 14, 5, 28);
      label(ctx, col.drift, "stop", xKnee + 10, yKnee + 22, "left");
    }

    // ---- angle label ----
    label(ctx, col.soft, state.ang + "°", xKnee + d * 0 + 12, yKnee + 4, "left");

    // ---- legend ----
    legend(col);

    // ---- the advantage curve ----
    drawCurve(col, cur);

    // ---- the gauge ----
    drawGauge(col, accent, cur);
  }

  function pin(col, x, y, c) {
    ctx.fillStyle = col.field; ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  }

  // the advantage curve: MA = 1/(2·tan θ) across the angle range, the current angle
  // marked. Below one the toggle loses force (slack); near the dead centre it runs
  // away (locked). MA is clipped for the plot; the number is read exact off the table.
  function drawCurve(col, cur) {
    var ix = 372, iy = 36, iw = 132, ih = 150, pad = 20;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "advantage", ix + 10, iy + 16, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - 2 * pad, Hc = ih - 2 * pad - 6;
    var MAcap = 6;
    var xFor = function (a) { return Ox + (a - AMIN) / (AMAX - AMIN) * L; };
    var yFor = function (ma) { return Oy - clamp(ma, 0, MAcap) / MAcap * Hc; };

    // the unity line (advantage of one) and its angle
    var yUnity = yFor(1);
    ctx.strokeStyle = withAlpha(col.faint, 0.7); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(Ox, yUnity); ctx.lineTo(Ox + L, yUnity); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "1×", Ox + L + 2, yUnity + 3, "left");

    // the takes-charge band near the dead centre
    var xLock = xFor(LOCK_ANGLE);
    ctx.fillStyle = withAlpha(col.drift, 0.14);
    ctx.fillRect(Ox, Oy - Hc, xLock - Ox, Hc);

    // the curve
    ctx.strokeStyle = col.iron2; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (var a = AMIN; a <= AMAX; a += 1) {
      var ma = 1 / (2 * Math.tan(a * Math.PI / 180));
      var px = xFor(a), py = yFor(ma);
      if (a === AMIN) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // the current angle, marked on the curve
    var mx = xFor(state.ang), my = yFor(cur.MA);
    ctx.fillStyle = cur.over ? col.dead : cur.MA >= 1 && state.ang > LOCK_ANGLE ? col.keep : col.drift;
    ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.faint, "open", Ox + L, Oy + 12, "right");
    label(ctx, col.faint, "closed", Ox, Oy + 12, "left");
  }

  function legend(col) {
    var lx = 40, ly = 24;
    swatch(col.iron, lx, ly); label(ctx, col.soft, "links · the thrust", lx + 14, ly + 4, "left");
    swatch(col.timber, lx, ly + 16); label(ctx, col.soft, "frame · the push", lx + 14, ly + 20, "left");
  }
  function swatch(c, x, y) {
    ctx.fillStyle = c; ctx.fillRect(x, y - 4, 9, 5);
  }

  function drawGauge(col, accent, cur) {
    var bx = 24, by = 352, bw = W - 48, bh = 66;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 64, gx1 = W - 64, gy = 390, scaleMax = 160;
    var xFor = function (p) { return gx0 + clamp(p, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // green band the mechanism safely takes at this angle
    var gh = xFor(cur.pSafe);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gh - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gh - gx0, 16);

    // the binding limit — the break wall
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gh, gy - 12); ctx.lineTo(gh, gy + 12); ctx.stroke();

    // the next limit behind, as a dashed tick
    var second = secondLimit(cur);
    if (second.p > cur.pSafe + 0.5 && second.p <= scaleMax) {
      var gs = xFor(second.p);
      ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(gs, gy - 12); ctx.lineTo(gs, gy + 12); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, col.faint, second.word, gs, gy + 24, "center");
    }

    label(ctx, col.faint, "no push", gx0, gy + 24, "left");
    label(ctx, col.faint, "safe", (gx0 + gh) / 2, gy - 13, "center");
    label(ctx, col.faint, cur.bind, gh, gy + 24, "center");

    // needle at the current push
    var nX = xFor(state.push);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
  }

  // the second-nearest limit, to mark behind the binding one
  function secondLimit(cur) {
    var arr = [
      { u: cur.uP, word: "pin" },
      { u: cur.uL, word: "link" },
      { u: cur.uF, word: "frame" }
    ].map(function (o) { return { p: o.u > 0 ? state.push / o.u : Infinity, word: o.word }; })
     .sort(function (a, b) { return a.p - b.p; });
    return arr[1];
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
  function rectStroke(col, x, y, w, h, color, lw) {
    ctx.fillStyle = withAlpha(color, 0.08);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.strokeRect(x, y, w, h);
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
  var curVerdict = verdictOf(state, current);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    var ease = Math.min(1, dt * 11);
    if (!initShown) { shown.ang = state.ang; shown.push = state.push; initShown = true; }
    shown.ang += (state.ang - shown.ang) * ease;
    shown.push += (state.push - shown.push) * ease;

    draw(current, curVerdict, shown.ang);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels(current);
    curVerdict = render(current);
  }

  inP.addEventListener("input", function () { state.push = parseInt(inP.value, 10); update(); });
  inA.addEventListener("input", function () { state.ang = parseInt(inA.value, 10); update(); });
  mechBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.mech = bn.dataset.mech; update(); });
  });

  $("find").addEventListener("click", function () {
    var opt = findAngle(state);
    if (opt != null) animateAngle(opt);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inP.value = state.push; inA.value = state.ang;
    update();
  });

  // close or open the toggle toward the target angle so it is seen to straighten
  function animateAngle(target) {
    if (Math.abs(target - state.ang) < 1) { state.ang = target; inA.value = target; update(); return; }
    var dir = target > state.ang ? ASTEP : -ASTEP;
    (function step() {
      state.ang = clamp(state.ang + dir, AMIN, AMAX);
      inA.value = state.ang; update();
      if (Math.abs(state.ang - target) >= 1) setTimeout(step, 18);
    })();
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current, curVerdict, shown.ang); });
  }

  // ---- go --------------------------------------------------------------
  inP.value = state.push; inA.value = state.ang;
  update();
})();
