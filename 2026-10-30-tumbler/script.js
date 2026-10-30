/* Tumbler — the bench.
 *
 * A pin-tumbler lock is a row of spring-loaded stacks dropped through a plug that turns
 * inside a fixed shell. Each stack is split in two — a key pin below, a driver pin above —
 * and the whole machine is one plane, the shear line, the seam between plug and shell:
 *
 *   locked      every break sits below the line, so every driver crosses the seam
 *   open        every break ON the line at once — nothing crosses, the plug turns
 *   by key      the key carries each stack's lift Lᵢ and raises them all together
 *   by pick     torque makes the plug bind on one pin (the chamber furthest off-line,
 *               set by tolerance); set it, the torque passes to the next — one at a time
 *
 * The flaw is the method: with zero tolerance no pin binds first, there is no order, and
 * the pick has nothing to climb — the lock opens only to its key. Lifts in cut units,
 * rotation as a fraction of the quarter-turn that frees the plug.
 */
(function () {
  "use strict";

  // ---- the lock --------------------------------------------------------
  var PINS_MIN = 3, PINS_MAX = 6, PINS_DEF = 5;
  var CUT_LEVELS = 5;                 // bitting depths 1..5
  var CU = 8;                         // px of lift per cut level
  var TOL_FLOOR = 0.05;               // below this the lock reads "machined true" — no binding order
  var KEY = "tumbler.bench.v1";       // where pins, tolerance and the cut key are kept between visits

  var TWO_PI = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampInt(v, a, b) { v = Math.round(+v); if (!isFinite(v)) return a; return v < a ? a : v > b ? b : v; }

  // a small seeded PRNG, so a cut key (its bitting and the chambers' off-line drift) is
  // stable across visits and redraws, and only changes when you rekey
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- persistence -----------------------------------------------------
  function loadState() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return {
        pins: clampInt(o.pins, PINS_MIN, PINS_MAX),
        tol: clamp(Math.round(+o.tol / 5) * 5, 0, 100),
        seed: (o.seed | 0) || 1
      };
    } catch (e) { return null; }
  }
  function saveState() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = loadState() || { pins: PINS_DEF, tol: 55, seed: (Date.now() & 0x7fffffff) || 1 };

  // the cut lock: a bitting Lᵢ (how far each stack must rise to the shear line) and a drift
  // dirᵢ in [-1,1] (how far off-line each chamber sits). Binding order is the drift, ranked.
  var L = [], dir = [], order = [];
  function cutLock() {
    var rb = mulberry32(state.seed);
    var rd = mulberry32(state.seed ^ 0x9e3779b9);
    L = []; dir = [];
    for (var i = 0; i < state.pins; i++) {
      L.push(1 + Math.floor(rb() * CUT_LEVELS));      // 1..CUT_LEVELS
      dir.push(rd() * 2 - 1);                          // −1..1
    }
    // avoid a key that is one flat depth — a lock worth drawing has shoulders
    var flat = L.every(function (v) { return v === L[0]; });
    if (flat) L[Math.floor(state.pins / 2)] = ((L[0] + 1) % CUT_LEVELS) + 1;
    order = L.map(function (_, i) { return i; }).sort(function (a, b) { return dir[b] - dir[a]; });
  }
  cutLock();

  // the live interaction, not persisted: a lock is always found relocked
  var sim = {
    mode: "locked",      // locked | picking | open
    openedBy: null,      // "key" | "pick"
    set: [],             // which drivers are trapped above the shear line
    stalled: false,      // a pick was attempted with no binding order
    lift: [],            // animated lift per stack, in cut units
    rot: 0               // animated plug rotation, 0..1
  };
  function relock() {
    stopPick();
    sim.mode = "locked"; sim.openedBy = null; sim.stalled = false;
    sim.set = []; for (var i = 0; i < state.pins; i++) sim.set.push(false);
    sim.lift = []; for (var j = 0; j < state.pins; j++) sim.lift.push(0);
    sim.rot = 0;
  }
  relock();

  function tolFrac() { return state.tol / 100; }
  function hasOrder() { return tolFrac() >= TOL_FLOOR; }
  function setsCount() { var c = 0; for (var i = 0; i < sim.set.length; i++) if (sim.set[i]) c++; return c; }
  // the pin now carrying the torque: first in binding order that is not yet set
  function bindingPin() {
    if (sim.mode !== "picking" || !hasOrder()) return -1;
    for (var k = 0; k < order.length; k++) if (!sim.set[order[k]]) return order[k];
    return -1;
  }

  // ---- targets the animation eases toward ------------------------------
  function liftTarget(i) {
    if (sim.mode === "open" || sim.openedBy === "key") return L[i];   // key raises every stack to the line
    if (sim.set[i]) return L[i];                                      // a set stack is parked at the line
    return 0;                                                         // slack: resting at the bottom
  }
  function rotTarget() {
    if (sim.mode === "open") return 1;
    if (sim.mode === "picking") return clamp(0.05 + 0.05 * setsCount(), 0, 0.32);  // the plug creeps as pins set
    return 0;
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inPins = $("in-pins"), inTol = $("in-tol");
  var labPins = $("lab-pins"), labTol = $("lab-tol"), tolNote = $("tol-note");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var btnKey = $("key"), btnPick = $("pick"), btnStep = $("step"), btnRekey = $("rekey"), btnReset = $("reset");

  inPins.min = PINS_MIN; inPins.max = PINS_MAX;

  function pct(x) { return Math.round(x * 100) + "%"; }
  function TOL_WORD(f) {
    if (f < TOL_FLOOR) return "machined true";
    if (f < 0.3) return "tight";
    if (f < 0.65) return "loose";
    return "sloppy";
  }

  function syncLabels() {
    labPins.textContent = state.pins;
    labTol.textContent = TOL_WORD(tolFrac());
    inPins.value = state.pins; inTol.value = state.tol;
    var k = setsCount(), n = state.pins;
    btnStep.disabled = sim.mode === "open";
    btnPick.disabled = sim.mode === "open";
    btnKey.disabled = sim.mode === "open" && sim.openedBy === "key";
    if (!hasOrder()) {
      tolNote.innerHTML = "machined true — <b class=\"warn\">no pin binds first</b>, so there is no order to climb; only the key opens it";
    } else if (sim.mode === "open") {
      tolNote.innerHTML = sim.openedBy === "key" ? "open — the key answered every pin at once" : "open — picked, " + n + " pins in binding order";
    } else if (sim.mode === "picking") {
      tolNote.innerHTML = "picking — <b>" + k + " of " + n + "</b> set, binding on pin " + (bindingPin() + 1);
    } else {
      tolNote.innerHTML = "the looser the fit, the sharper the order a pick can climb";
    }
  }

  var VERDICT = {
    locked:  { cls: "v-rest",  word: "Locked",  note: "every driver across the seam" },
    picking: { cls: "v-drift", word: "Binding", note: "one pin carries the torque" },
    stalled: { cls: "v-rest",  word: "Machined true", note: "no binding order — key only" },
    openKey: { cls: "v-keep",  word: "Open",    note: "the key answered it whole" },
    openPick:{ cls: "v-keep",  word: "Open",    note: "picked, pin by pin" }
  };

  function render() {
    var n = state.pins, k = setsCount(), b = bindingPin();
    var v;
    if (sim.mode === "open") v = sim.openedBy === "key" ? VERDICT.openKey : VERDICT.openPick;
    else if (sim.mode === "picking") v = sim.stalled && !hasOrder() ? VERDICT.stalled : VERDICT.picking;
    else v = sim.stalled && !hasOrder() ? VERDICT.stalled : VERDICT.locked;

    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var bitting = L.map(function (d, i) {
      return sim.set[i] || sim.mode === "open" ? '<b style="color:var(--keep)">' + d + "</b>"
        : (i === b ? '<b style="color:var(--drift)">' + d + "</b>" : d);
    }).join(" ");

    var plugVal = sim.mode === "open" ? '<span class="good">open</span>'
      : sim.rot > 0.01 ? pct(sim.rot) + '<span class="unit"> turned</span>'
      : '<span class="unit">at rest</span>';

    var setClass = k === n && n > 0 ? "good" : k > 0 ? "warn" : "";
    var bindVal = b >= 0 ? '<span class="warn">pin ' + (b + 1) + "</span>" : (sim.mode === "open" ? "—" : (!hasOrder() ? '<span class="bad">none</span>' : "—"));

    var rows = [
      ["Pins <span class=\"tag s\">n</span>", n + '<span class="unit"> stacks</span>', ""],
      ["Tolerance", TOL_WORD(tolFrac()) + '<span class="unit"> · ' + (hasOrder() ? "has order" : "no order") + "</span>", hasOrder() ? "" : "bad"],
      ["Shear line", '1 plane<span class="unit"> · all breaks</span>', ""],
      ["Bitting <span class=\"tag\">Lᵢ</span>", '<span style="letter-spacing:.14em">' + bitting + "</span>", ""],
      ["Binding", bindVal, ""],
      ["Set", k + " of " + n, setClass],
      ["Plug", plugVal, ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 560, H = 556, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

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

  // ---- geometry --------------------------------------------------------
  var FX0 = 36, FX1 = 524;              // lock body left / right
  var SHELL_TOP = 64;                   // inside top of the shell (springs anchor here)
  var SL = 156;                         // the shear line
  var PLUG_BOT = 248;                   // bottom of the plug
  var DRV = 50;                         // driver pin length, px (exceeds max lift, so it always crosses at rest)
  var SHIFT_MAX = 30;                   // how far the plug slides at full open (rotation proxy)
  var PAD = 52;

  function pinX(i) {
    var n = state.pins;
    if (n === 1) return (FX0 + FX1) / 2;
    var usable = (FX1 - FX0) - 2 * PAD;
    return FX0 + PAD + usable * i / (n - 1);
  }
  function breakY(i) { return SL + (L[i] - sim.lift[i]) * CU; }   // the break between the two pins

  function draw() {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      brass: cssVar("--brass"), brass2: cssVar("--brass-2"), brassb: cssVar("--brass-b"),
      steel: cssVar("--steel"), steel2: cssVar("--steel-2"), steelb: cssVar("--steel-b"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    ctx.clearRect(0, 0, W, H);
    drawLock(col);
    drawBindingPanel(col);
    drawGauge(col);
  }

  function drawLock(col) {
    var shift = sim.rot * SHIFT_MAX;
    var b = bindingPin();
    var open = sim.mode === "open";

    // ---- shell (the fixed housing) ----
    ctx.fillStyle = withAlpha(col.steel, 0.07);
    roundRect(FX0, 44, FX1 - FX0, PLUG_BOT - 44 + 8, 12); ctx.fill();
    ctx.strokeStyle = withAlpha(col.steel2, 0.5); ctx.lineWidth = 1.4;
    roundRect(FX0, 44, FX1 - FX0, PLUG_BOT - 44 + 8, 12); ctx.stroke();

    // ---- plug (the turning cylinder), sliding right as it rotates ----
    ctx.save();
    ctx.beginPath(); roundRect(FX0 + 6, SL, FX1 - FX0 - 12, PLUG_BOT - SL, 9); ctx.clip();
    ctx.translate(shift, 0);
    ctx.fillStyle = withAlpha(col.brass, open ? 0.18 : 0.12);
    ctx.fillRect(FX0 - SHIFT_MAX, SL, FX1 - FX0 + 2 * SHIFT_MAX, PLUG_BOT - SL);
    // keyway slot through the plug
    ctx.fillStyle = withAlpha(col.ink, 0.10);
    roundRect(FX0 + 18, PLUG_BOT - 26, FX1 - FX0 - 36, 16, 4); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = withAlpha(col.brass2, 0.6); ctx.lineWidth = 1.3;
    ctx.save();
    ctx.beginPath(); roundRect(FX0 + 6, SL, FX1 - FX0 - 12, PLUG_BOT - SL, 9); ctx.clip();
    ctx.translate(shift, 0);
    roundRect(FX0 + 6 - SHIFT_MAX, SL, FX1 - FX0 - 12, PLUG_BOT - SL, 9); ctx.stroke();
    ctx.restore();

    // ---- the shear line, the seam between shell and plug ----
    ctx.strokeStyle = withAlpha(col.steel2, open ? 0.85 : 0.6); ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(FX0 + 2, SL); ctx.lineTo(FX1 - 2, SL); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.steel2, "shear line", FX1 - 4, SL - 7, "right");

    // ---- each pin stack ----
    for (var i = 0; i < state.pins; i++) {
      var x = pinX(i);
      var set = sim.set[i] || open;
      var bk = breakY(i);
      var atLine = Math.abs(bk - SL) < 0.8;
      // the key pin rides with the plug; a set or opened pin shows its sheared seam
      var keyShift = set ? shift : 0;

      // spring in the shell, compressing as the driver rises
      drawSpring(col, x, SHELL_TOP + 2, bk - DRV - 2);

      // driver pin (upper) — anchored to the shell, fixed in x
      var dCol = set ? col.keep : (i === b ? col.drift : (bk > SL + 0.8 ? col.dead : col.steel2));
      pinBar(col, x, bk - DRV, bk, dCol, false);

      // key pin (lower) — anchored to the plug, slides with it
      var kBottom = Math.min(PLUG_BOT - 14, bk + (PLUG_BOT - 20 - SL));
      var kCol = set ? col.keep : (i === b ? col.drift : col.brass2);
      pinBar(col, x + keyShift, bk, kBottom, kCol, true);

      // the break marker — green on the line, else its state colour
      ctx.fillStyle = atLine ? col.keep : (i === b ? col.drift : (bk > SL ? col.dead : col.brass2));
      ctx.beginPath(); ctx.arc(x + keyShift * 0.5, bk, 2.4, 0, TWO_PI); ctx.fill();

      // the binding pin, called out
      if (i === b && !open) {
        label(ctx, col.drift, "binds", x, SHELL_TOP - 8, "center");
        ctx.strokeStyle = withAlpha(col.drift, 0.5); ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(x, SHELL_TOP - 4); ctx.lineTo(x, bk); ctx.stroke(); ctx.setLineDash([]);
      }
      // pin number, under the keyway
      label(ctx, atLine ? col.keep : col.faint, String(i + 1), x + keyShift, PLUG_BOT + 16, "center");
    }

    // ---- the key, or the tension wrench + pick ----
    if (open && sim.openedBy === "key") drawKey(col, shift);
    else if (sim.mode === "picking" || (open && sim.openedBy === "pick")) drawPick(col, shift, b);
    else drawKeyway(col);

    // caption, top-left clear of the pins
    var cap, capCol;
    if (open) { cap = sim.openedBy === "key" ? "every break on the line — the plug turns" : "picked — every driver trapped above the seam"; capCol = col.keep; }
    else if (sim.mode === "picking") {
      if (!hasOrder()) { cap = "machined true — nothing binds first, no order to climb"; capCol = col.dead; }
      else { cap = "torque on — set the binding pin, the load passes on"; capCol = col.drift; }
    } else { cap = "locked — every driver crosses the shear line"; capCol = col.soft; }
    label(ctx, capCol, cap, FX0 + 6, 30, "left");
  }

  function pinBar(col, x, yTop, yBot, c, lower) {
    var w = 15;
    if (yBot - yTop < 1) return;
    ctx.fillStyle = withAlpha(c, 0.26);
    roundRect(x - w / 2, yTop, w, yBot - yTop, 3); ctx.fill();
    ctx.strokeStyle = withAlpha(c, 0.85); ctx.lineWidth = 1.3;
    roundRect(x - w / 2, yTop, w, yBot - yTop, 3); ctx.stroke();
    // a rounded cap at the free end to tell key pin (bottom) from driver (top)
    ctx.fillStyle = withAlpha(c, 0.85);
    var cy = lower ? yBot - 2 : yTop + 2;
    ctx.beginPath(); ctx.arc(x, cy, 1.6, 0, TWO_PI); ctx.fill();
  }

  function drawSpring(col, x, yTop, yBot) {
    if (yBot - yTop < 2) return;
    ctx.strokeStyle = withAlpha(col.steel2, 0.45); ctx.lineWidth = 1.1;
    var coils = 6, amp = 5, h = yBot - yTop;
    ctx.beginPath(); ctx.moveTo(x, yTop);
    for (var c = 1; c <= coils; c++) {
      var y = yTop + h * c / coils;
      var xx = x + (c % 2 ? amp : -amp);
      ctx.lineTo(xx, y - h / coils / 2);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawKeyway(col) {
    label(ctx, col.faint, "keyway — insert the key, or pick it", (FX0 + FX1) / 2, PLUG_BOT + 34, "center");
  }

  function drawKey(col, shift) {
    ctx.save();
    ctx.translate(shift, 0);
    var y0 = PLUG_BOT - 22;                 // top of the key blade (the bitting edge)
    var yb = PLUG_BOT - 6;                  // bottom of the blade
    ctx.beginPath();
    ctx.moveTo(FX0 + 16, yb);
    for (var i = 0; i < state.pins; i++) {
      var x = pinX(i);
      var top = Math.min(PLUG_BOT - 14, breakY(i) + (PLUG_BOT - 20 - SL));  // meets the key-pin bottom
      ctx.lineTo(x - 9, y0 + (CUT_LEVELS - L[i]) * 1.4);
      ctx.lineTo(x, top);
      ctx.lineTo(x + 9, y0 + (CUT_LEVELS - L[i]) * 1.4);
    }
    ctx.lineTo(FX1 - 60, yb);
    ctx.lineTo(FX1 - 60, yb + 8);
    ctx.lineTo(FX0 + 16, yb + 8);
    ctx.closePath();
    ctx.fillStyle = withAlpha(col.brass, 0.5); ctx.fill();
    ctx.strokeStyle = withAlpha(col.brass2, 0.9); ctx.lineWidth = 1.3; ctx.stroke();
    // the bow (handle) poking out of the keyway
    ctx.fillStyle = withAlpha(col.brass, 0.5);
    roundRect(FX1 - 58, yb - 10, 30, 22, 5); ctx.fill();
    ctx.strokeStyle = withAlpha(col.brass2, 0.9); roundRect(FX1 - 58, yb - 10, 30, 22, 5); ctx.stroke();
    ctx.restore();
    label(ctx, col.brass2, "key", FX1 - 43 + shift, PLUG_BOT + 2, "center");
  }

  function drawPick(col, shift, b) {
    // a tension wrench putting torque on the plug, and the pick at the binding pin
    var ty = PLUG_BOT - 13;
    ctx.strokeStyle = withAlpha(col.steel2, 0.85); ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(FX0 + 20 + shift, ty); ctx.lineTo(FX1 - 70 + shift, ty); ctx.stroke();
    ctx.lineCap = "butt";
    // torque arrow, in the direction the plug turns
    arrow(ctx, col.steel2, FX0 + 44 + shift, ty + 12, FX0 + 70 + shift, ty + 12, 1.6, 6);
    label(ctx, col.steel2, "torque", FX0 + 24 + shift, ty + 16, "left");
    // the pick itself, reaching up to the binding pin
    if (b >= 0 && sim.mode !== "open") {
      var x = pinX(b);
      ctx.strokeStyle = withAlpha(col.ink, 0.6); ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(FX1 - 70 + shift, ty - 2); ctx.lineTo(x + shift, breakY(b) + 10); ctx.stroke();
      ctx.lineCap = "butt";
      label(ctx, col.soft, "pick", FX1 - 66 + shift, PLUG_BOT + 2, "left");
    } else if (sim.mode === "open") {
      label(ctx, col.steel2, "tension held", FX0 + 24 + shift, PLUG_BOT + 2, "left");
    }
  }

  // ---- the binding-order panel: why tolerance makes a sequence ----------
  // Each chamber sits a little off the true line; under torque the plug binds on the one
  // offset furthest in the turning direction, and sets in that order. The panel plots the
  // offset of each stack (signed, to the right binds sooner), ranked top to bottom — the
  // ladder a pick climbs. Collapse the tolerance and the bars collapse: no offset, no order.
  function drawBindingPanel(col) {
    var bx = 24, by = 298, bw = W - 48, bh = 130;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "binding order — the chambers' drift off the true line, ranked", bx + 12, by + 18, "left");

    var n = state.pins, b = bindingPin(), open = sim.mode === "open";
    var zeroX = bx + 150;                         // the true line; bars grow right (binds sooner) or left
    var barMax = (bx + bw - 20) - zeroX;          // room to the right
    var rowH = Math.min(17, (bh - 36) / Math.max(1, n));
    var y0 = by + 30;

    // the true line
    ctx.strokeStyle = withAlpha(col.ink, 0.22); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(zeroX, y0 - 4); ctx.lineTo(zeroX, y0 + rowH * n + 2); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.faint, "true", zeroX, by + bh - 6, "center");

    if (!hasOrder()) {
      label(ctx, col.dead, "machined true — every chamber on the line, no pin binds first", (bx + bw) / 2, y0 + rowH * n / 2 + 4, "center");
      return;
    }

    for (var r = 0; r < n; r++) {
      var i = order[r], y = y0 + r * rowH + rowH / 2;
      var set = sim.set[i] || open;
      var off = dir[i] * tolFrac();               // −1..1 scaled by tolerance
      var c = set ? col.keep : (i === b ? col.drift : col.steel2);

      // rank + which pin
      label(ctx, set ? col.keep : (i === b ? col.drift : col.faint), (r + 1) + ".", bx + 14, y + 3, "left");
      label(ctx, set ? col.keep : (i === b ? col.drift : col.soft), "pin " + (i + 1), bx + 36, y + 3, "left");

      // the signed offset bar
      var len = off * barMax * 0.9;
      ctx.fillStyle = withAlpha(c, set ? 0.5 : (i === b ? 0.6 : 0.35));
      var bxs = len >= 0 ? zeroX : zeroX + len;
      roundRect(bxs, y - 4, Math.max(2, Math.abs(len)), 8, 2); ctx.fill();

      if (i === b && !open) label(ctx, col.drift, "binds now", zeroX + Math.max(len, 8) + 8, y + 3, "left");
      else if (set) label(ctx, col.keep, "set", zeroX + (len >= 0 ? len : 0) + 8, y + 3, "left");
    }
  }

  // ---- the gauge: the plug from locked to open, and the pins set --------
  function drawGauge(col) {
    var bx = 24, by = 438, bw = W - 48, bh = 110;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "the plug: locked → open", bx + 12, by + 18, "left");

    // the turn track
    var gx0 = bx + 20, gx1 = bx + bw - 20, gy = by + 40;
    ctx.strokeStyle = col.rule; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();
    // the stretch it can turn is barred until every pin is set; then it swings free
    var freeFrac = state.pins ? setsCount() / state.pins : 0;
    var openX = gx0 + (gx1 - gx0) * 1;
    var barX = gx0 + (gx1 - gx0) * clamp(0.1 + 0.2 * freeFrac, 0, 0.34);
    if (sim.mode !== "open") {
      ctx.strokeStyle = withAlpha(col.dead, 0.7); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(barX, gy); ctx.lineTo(gx1, gy); ctx.stroke();
      label(ctx, col.dead, "jammed", (barX + gx1) / 2, gy - 9, "center");
    } else {
      ctx.strokeStyle = withAlpha(col.keep, 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(openX, gy); ctx.stroke();
    }
    ctx.lineCap = "butt";
    label(ctx, col.faint, "locked", gx0, gy + 16, "left");
    label(ctx, col.faint, "open", gx1, gy + 16, "right");

    // the needle at the current rotation
    var nX = gx0 + (gx1 - gx0) * sim.rot;
    var acc = sim.mode === "open" ? col.keep : (sim.mode === "picking" ? col.drift : col.steel2);
    ctx.strokeStyle = acc; ctx.fillStyle = acc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 10); ctx.lineTo(nX, gy + 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 10, 3, 0, TWO_PI); ctx.fill();

    // the pins-set row: a dot per stack, filled as it sets, the binding one ringed
    var dy = by + 86, n = state.pins, b = bindingPin();
    var step = n > 1 ? Math.min(54, (gx1 - gx0) / (n)) : 0;
    var startX = (gx0 + gx1) / 2 - step * (n - 1) / 2;
    label(ctx, col.faint, "pins set", bx + 12, dy - 16, "left");
    for (var i = 0; i < n; i++) {
      var x = startX + step * i;
      var set = sim.set[i] || sim.mode === "open";
      ctx.beginPath(); ctx.arc(x, dy, 6, 0, TWO_PI);
      ctx.fillStyle = set ? col.keep : withAlpha(col.ink, 0.06); ctx.fill();
      ctx.strokeStyle = set ? col.keep : (i === b ? col.drift : col.rule);
      ctx.lineWidth = i === b ? 2 : 1; ctx.stroke();
      label(ctx, set ? col.keep : col.faint, String(i + 1), x, dy + 20, "center");
    }
    label(ctx, col.faint, setsCount() + " / " + n, gx1, dy + 4, "right");
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
  function approach(cur, tar, dt, rate) {
    if (reduce) return tar;
    var d = tar - cur;
    if (Math.abs(d) < 0.001) return tar;
    return cur + d * (1 - Math.exp(-rate * dt));
  }
  var lastTs = null;
  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
    for (var i = 0; i < state.pins; i++) sim.lift[i] = approach(sim.lift[i], liftTarget(i), dt, 14);
    sim.rot = approach(sim.rot, rotTarget(), dt, 10);
    draw();
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- the pick --------------------------------------------------------
  var pickTimer = null;
  function stopPick() { if (pickTimer) { clearTimeout(pickTimer); pickTimer = null; } }

  // set the one pin now binding; return false if there is nothing to set
  function setNext() {
    if (sim.mode === "open") return false;
    sim.mode = "picking";
    if (!hasOrder()) { sim.stalled = true; return false; }
    var b = bindingPin();
    if (b < 0) {                           // all set — the last one frees the plug
      sim.mode = "open"; sim.openedBy = "pick"; return false;
    }
    sim.set[b] = true;
    if (setsCount() >= state.pins) { sim.mode = "open"; sim.openedBy = "pick"; }
    return true;
  }

  function autoPick() {
    stopPick();
    if (sim.mode === "open") return;
    sim.mode = "picking";
    if (!hasOrder()) { sim.stalled = true; update(); return; }
    if (reduce) {                          // no running action — resolve to the settled open state
      for (var k = 0; k < state.pins; k++) sim.set[order[k]] = true;
      sim.mode = "open"; sim.openedBy = "pick"; update(); return;
    }
    var tick = function () {
      var more = setNext();
      update();
      if (more && sim.mode === "picking") pickTimer = setTimeout(tick, 620);
      else pickTimer = null;
    };
    tick();
  }

  // ---- wiring ----------------------------------------------------------
  function update() { syncLabels(); render(); announce(); saveState(); }

  inPins.addEventListener("input", function () {
    state.pins = clampInt(inPins.value, PINS_MIN, PINS_MAX);
    cutLock(); relock(); update();
  });
  inTol.addEventListener("input", function () {
    state.tol = clamp(Math.round(inTol.value / 5) * 5, 0, 100);
    if (sim.mode === "picking" && hasOrder()) sim.stalled = false;
    update();
  });

  btnKey.addEventListener("click", function () {
    stopPick();
    sim.mode = "open"; sim.openedBy = "key"; sim.stalled = false;
    for (var i = 0; i < state.pins; i++) sim.set[i] = true;
    update();
  });
  btnPick.addEventListener("click", autoPick);
  btnStep.addEventListener("click", function () { stopPick(); setNext(); update(); });
  btnRekey.addEventListener("click", function () {
    state.seed = (Math.floor(Math.random() * 0x7fffffff)) || 1;
    cutLock(); relock(); update();
  });
  btnReset.addEventListener("click", function () { relock(); update(); });

  // ---- screen-reader status (debounced, so a slider drag doesn't chatter) ----
  var sayTimer = null;
  function announce() {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var n = state.pins, k = setsCount(), b = bindingPin();
      var head = "A " + n + "-pin lock, chambers cut " + TOL_WORD(tolFrac())
        + (hasOrder() ? " — so under torque the pins bind in an order. " : " — machined so true that no pin binds before the others. ");
      var tail;
      if (sim.mode === "open") {
        tail = sim.openedBy === "key"
          ? "Open: the key raised every break to the shear line at once, and the plug turned."
          : "Open: picked, all " + n + " drivers trapped above the shear line, one at a time, and the plug swung free.";
      } else if (sim.mode === "picking") {
        if (!hasOrder()) tail = "Nothing to pick: with no binding order there is no first pin, so the plug cannot be opened pin by pin. Loosen the tolerance, or use the key.";
        else tail = "Picking: " + k + " of " + n + " pins set. Pin " + (b + 1) + " is binding now — it carries the torque; set it and the load passes to the next.";
      } else {
        tail = "Locked at rest: every driver pin crosses the shear line and pins the plug. Insert the key to raise all breaks to the line at once, or pick it to set them in order.";
      }
      sayEl.textContent = head + tail;
    }, 260);
  }

  // ---- keyboard --------------------------------------------------------
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "k" || k === "K") btnKey.click();
    else if (k === "p" || k === "P") btnPick.click();
    else if (k === "n" || k === "N" || k === " ") btnStep.click();
    else if (k === "x" || k === "X") btnRekey.click();
    else if (k === "r" || k === "R") btnReset.click();
    else if (k === "]") { state.pins = clampInt(state.pins + 1, PINS_MIN, PINS_MAX); cutLock(); relock(); update(); }
    else if (k === "[") { state.pins = clampInt(state.pins - 1, PINS_MIN, PINS_MAX); cutLock(); relock(); update(); }
    else if (k === "=" || k === "+") { state.tol = clamp(state.tol + 5, 0, 100); update(); }
    else if (k === "-" || k === "_") { state.tol = clamp(state.tol - 5, 0, 100); update(); }
    else return;
    e.preventDefault();
  });

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }
  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  }

  // ---- go --------------------------------------------------------------
  update();
})();
